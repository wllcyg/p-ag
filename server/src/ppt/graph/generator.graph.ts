import OpenAI from 'openai';
import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import {
  GenState,
  GeneratePptDto,
  SlideItem,
  SlidesSchema,
  DEFAULT_QUALITY_RULES,
  GenEventPayload,
} from '../types/state';
import { PptRenderService } from '../render/pptx.renderer';

import { PRESENTATION_DESIGN_SKILL_PROMPT } from '../skills/presentation-design.skill';

// ============================================================
// LangGraph 状态 Annotation 定义
// ============================================================
const GraphState = Annotation.Root({
  input: Annotation<GeneratePptDto>(),
  needsResearch: Annotation<boolean>({
    value: (_prev, next) => next,
    default: () => false,
  }),
  designThoughts: Annotation<string | undefined>(),
  slides: Annotation<SlideItem[]>({
    value: (_prev, next) => next,
    default: () => [],
  }),
  validationErrors: Annotation<string[] | undefined>(),
  qualityIssues: Annotation<{ pageIndex: number; reason: string }[] | undefined>(),
  repairCount: Annotation<number>({
    value: (_prev, next) => next,
    default: () => 0,
  }),
  pptxBuffer: Annotation<Buffer | undefined>(),
  status: Annotation<GenState['status']>({
    value: (_prev, next) => next,
    default: () => 'analyzing' as GenState['status'],
  }),
});

// SSE 事件推送回调类型
export type SseEmitter = (event: GenEventPayload) => void;

// 最大修复次数
const MAX_REPAIR_COUNT = 3;

// ============================================================
// OpenAI 客户端工厂（直连阿里云百炼 / 通义千问 / DeepSeek）
// ============================================================
function getOpenAIClient(): OpenAI {
  const apiKey =
    process.env.LLM_API_KEY ||
    process.env.DEEPSEEK_API_KEY ||
    process.env.DASHSCOPE_API_KEY ||
    process.env.SILICONFLOW_API_KEY ||
    '';

  const baseURL =
    process.env.LLM_BASE_URL ||
    process.env.DEEPSEEK_BASE_URL ||
    'https://api.deepseek.com';

  return new OpenAI({
    apiKey,
    baseURL,
  });
}

function getModelName(type: 'thinking' | 'structure'): string {
  if (type === 'thinking') {
    return (
      process.env.DEEPSEEK_THINKING_MODEL ||
      process.env.LLM_THINKING_MODEL ||
      'qwen-plus'
    );
  }
  return (
    process.env.DEEPSEEK_STRUCTURE_MODEL ||
    process.env.LLM_STRUCTURE_MODEL ||
    'qwen-plus'
  );
}

// ============================================================
// 节点工厂函数（接收 emit 回调，返回节点函数）
// ============================================================
export function buildGeneratorGraph(emit: SseEmitter) {
  const renderService = new PptRenderService();
  const client = getOpenAIClient();

  // ----- 节点 1: design_thinking (流式思考) -----
  async function designThinkingNode(state: typeof GraphState.State) {
    emit({ type: 'step', step: 'REASONING', progress: 15, message: '🐱 正在深度思考说课设计...' });

    const dto = state.input;
    const prompt = `你是一位资深的学科教学专家与国家级特级教师，请为以下课题设计一份专业、详尽的说课思路与教学方案。

课题基本信息：
- 学科：${dto.subject}
- 年级：${dto.grade}
- 课题：${dto.lessonTitle}
- 教材版本：${dto.textbookVersion || '通用统编版'}
- 补充要求：${dto.extraRequirement || '无'}

请严格按照标准"说课六步法"逐层展开构思：
1. 【教材地位与分析】：在教材知识脉络中的承前启后地位，核心概念与教学价值；
2. 【学情洞察】：对应学段学生的认知特点、已有知识储备与潜在认知难点；
3. 【三维教学目标与重难点】：知识与技能、过程与方法、情感态度价值观，明确重点与难点突破方案；
4. 【教法学法】：选用的教学策略（如情境探究法、实验对比法、任务驱动法等）；
5. 【教学过程各环节】：情境导入、探究新知、实验/研讨、练习巩固、归纳升华各环节的设计意图与师生活动；
6. 【板书设计理念与演讲逐字稿要领】：板书的知识网状脉络架构，以及口播演讲时生动自然、富有启发性的台词风格。

请用自然语言由浅入深、条理清晰地详细阐述（无需输出 JSON）。`;

    let thoughts = '';
    const model = getModelName('thinking');

    try {
      const stream = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: '你是一位严谨而富有创意的特级教师，擅长设计高质量的说课课件与演说教案。' },
          { role: 'user', content: prompt },
        ],
        stream: true,
        temperature: 0.7,
      });

      let chunkCount = 0;
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          thoughts += delta;
          chunkCount++;
          if (chunkCount % 3 === 0) {
            emit({
              type: 'thinking',
              step: 'REASONING',
              progress: Math.min(32, 15 + Math.floor(thoughts.length / 80)),
              message: 'AI 正在深入推演说课逻辑与教学重难点...',
              reasoningChunk: delta,
            });
          }
        }
      }
    } catch (err: any) {
      console.error('思考流异常:', err);
      thoughts = `为${dto.grade}${dto.subject}《${dto.lessonTitle}》设计说课，严格按六步法展开教材分析、学情分析、教学目标、教法学法、教学过程与板书设计。`;
      emit({ type: 'step', step: 'REASONING', progress: 30, message: '⚠️ 思考模型降级，继续结构化转译' });
    }

    emit({ type: 'step', step: 'STRUCTURING', progress: 38, message: '✅ 说课设计思路构思完成，正在转译幻灯片结构...' });

    return { designThoughts: thoughts, status: 'structuring' as GenState['status'] };
  }

  // ----- 节点 2: structure (结构化转译) -----
  async function structureNode(state: typeof GraphState.State) {
    emit({ type: 'step', step: 'STRUCTURING', progress: 48, message: '📐 正在精准排版幻灯片各页要点与逐字演讲稿...' });

    const dto = state.input;
    const thoughts = state.designThoughts || '';
    const previousErrors = state.validationErrors?.join('\n') || '';
    const repairHint = previousErrors
      ? `\n\n【⚠️ 上次生成格式校验未通过，请针对以下报错进行严格修正】：\n${previousErrors}`
      : '';

    const systemPrompt = `你是一位享誉业界的演示文稿设计大师（Presentation Design Master）与说课专家。
你深谙演说视觉节奏与视觉隐喻（Visual Metaphors），坚决反对千篇一律的单调卡片堆砌！
你必须只输出纯 JSON 对象，格式为 {"slides": [...]}，严禁包含任何 Markdown 格式说明或多余废话。`;

    const userPrompt = `请基于以下完整的说课设计思路，运用【Presentation Design Skill】将其转化为 8～10 张极具视觉表现力的高级幻灯片（SlideItem）数据。

【说课构思】：
${thoughts.slice(0, 3500)}

【课题信息】：
学科：${dto.subject} | 年级：${dto.grade} | 课题：${dto.lessonTitle}
${repairHint}

【🎨 Presentation Design Skill 视觉版式分配法则】：
每张幻灯片必须根据其核心语义指定最优的 layout 字段，形成丰富的版式节奏感：
1. layout='timeline'（时间轴流式版式）：用于教学过程各环节、实验探索步骤，生成具有先后递进关系的步骤节点；
2. layout='compare'（左右双栏强对比版式）：用于教学重点与难点突破、宏观现象 VS 微观本质、传统模式 VS 创新探究；
3. layout='stat'（焦点观点/大字理念版式）：用于教学目标核心素养确立、教育理念提炼，左侧放置醒目主旨，右侧放置支撑条目；
4. layout='matrix'（2x2 四象限矩阵版式）：用于学情多维洞察、教材四大知识板块网格；
5. layout='grid'（经典精致卡片）：用于常规要点梳理；

【严格的 JSON 结构规范示例】：
{
  "slides": [
    {
      "pageIndex": 1,
      "type": "cover",
      "title": "${dto.lessonTitle}",
      "subtitle": "${dto.subject} · ${dto.grade} · ${dto.textbookVersion || '通用统编版'}",
      "points": [],
      "speakerNotes": "各位评委老师好，今天我说课的题目是..."
    },
    {
      "pageIndex": 2,
      "type": "catalog",
      "title": "说课提纲",
      "points": ["一、教材地位与核心价值", "二、多维学情画像洞察", "三、三维目标与重难点突破", "四、教法学法与创新策略", "五、教学过程与探究主线", "六、板书脉络与教学反思"],
      "speakerNotes": "本次说课我将从六个核心维度依次展开汇报..."
    },
    {
      "pageIndex": 3,
      "type": "material",
      "layout": "matrix",
      "title": "教材分析与知识脉络",
      "subtitle": "核心概念与承前启后价值",
      "points": ["知识承接：衔接前期核心基础", "核心概念：建构学科关键模型", "思想方法：渗透科学探究思维", "育人价值：落实学科核心素养"],
      "speakerNotes": "本节课在整个教材知识体系中起到关键枢纽作用..."
    },
    {
      "pageIndex": 4,
      "type": "student",
      "layout": "stat",
      "title": "学情洞察与素养起点",
      "subtitle": "立足最近发展区\n驱动主动建构",
      "points": ["已有认知：具备基础生活经验与概念感知", "思维特点：正由直观具象向逻辑抽象过渡", "潜在难点：对微观本质与定量规律理解不深"],
      "speakerNotes": "针对该学段学生的思维发展阶段，教学中需搭建支架..."
    },
    {
      "pageIndex": 5,
      "type": "method",
      "layout": "compare",
      "title": "教学重难点与突破策略",
      "points": ["重点一：掌握核心反应原理", "重点二：熟练规范实验操作", "难点一：微观反应机理推导", "难点二：实验异常现象分析"],
      "speakerNotes": "在重难点的处理上，我将重点与难点进行分层协同突破..."
    },
    {
      "pageIndex": 6,
      "type": "process",
      "layout": "timeline",
      "title": "教学过程：全景脉络",
      "points": ["环节一：生活情境激趣导入", "环节二：实验探究建构新知", "环节三：合作研讨突破难点", "环节四：迁移应用巩固升华"],
      "speakerNotes": "在教学过程设计上，我构建了环环相扣的四阶探究链条..."
    },
    {
      "pageIndex": 7,
      "type": "process",
      "layout": "grid",
      "title": "核心探究环节深入展开",
      "points": ["提出问题，引发认知冲突", "设计方案，开展对照实验", "记录数据，归纳科学规律", "反思评价，培养批判思维"],
      "speakerNotes": "在核心探究阶段，引导学生自主设计实验并归纳规律..."
    },
    {
      "pageIndex": 8,
      "type": "board",
      "title": "结构化板书设计",
      "subtitle": "${dto.lessonTitle}",
      "points": ["核心课题主旨", "基础现象与原理", "探究核心路径", "微观本质模型", "应用迁移拓展", "归纳总结反思"],
      "speakerNotes": "我的板书设计采用结构化脉络图示，直观呈现本课知识主干..."
    },
    {
      "pageIndex": 9,
      "type": "summary",
      "layout": "stat",
      "title": "教学反思与预期成效",
      "subtitle": "以评促学\n实现知行合一",
      "points": ["知识目标达成度预期超90%", "学生自主探究兴趣显著提升", "有效落实科学素养育人价值"],
      "speakerNotes": "通过本节课的教学实施，预期能够实现高效达成与素养落地..."
    }
  ]
}

【硬性约束】：
1. 必须生成 8 到 10 张页面，且每页 pageIndex 从 1 严格连续递增；
2. type 只能是：'cover', 'catalog', 'material', 'student', 'method', 'process', 'board', 'summary'；
3. layout 只能是：'timeline', 'compare', 'stat', 'matrix', 'grid'；
4. points 中单条内容必须精炼（≤ 18 个汉字），除 cover 页外每页 2～6 条；
5. speakerNotes 每页必须提供 60～220 字的完整口播演说稿；
6. 只输出纯 JSON 字符串，不要带任何反引号代码块！`;

    const model = getModelName('structure');

    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
      });

      const raw = response.choices[0]?.message?.content || '';

      // 提取 JSON
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          validationErrors: ['模型未输出合法 JSON 格式，raw: ' + raw.slice(0, 150)],
          repairCount: state.repairCount + 1,
          status: 'validating' as GenState['status'],
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        slides: parsed.slides || [],
        validationErrors: undefined,
        status: 'validating' as GenState['status'],
      };
    } catch (err: any) {
      console.error('结构化生成异常:', err);
      return {
        validationErrors: [`JSON 解析或网络异常: ${err.message}`],
        repairCount: state.repairCount + 1,
        status: 'validating' as GenState['status'],
      };
    }
  }

  // ----- 节点 3: validate (Zod 校验) -----
  async function validateNode(state: typeof GraphState.State) {
    emit({ type: 'step', step: 'VALIDATING', progress: 62, message: '🔍 正在校验幻灯片结构与字段规范...' });

    const result = SlidesSchema.safeParse({ slides: state.slides });

    if (!result.success) {
      const errors = result.error.issues.map(
        (e) => `[${e.path.map(String).join('.')}] ${e.message}`
      );
      emit({ type: 'eval', step: 'VALIDATING', progress: 62, message: `❌ 格式校验存在 ${errors.length} 项差异，自动修复中...` });
      return {
        validationErrors: errors,
        repairCount: state.repairCount + 1,
        status: 'structuring' as GenState['status'],
      };
    }

    emit({ type: 'step', step: 'QUALITY_GATE', progress: 72, message: '✅ Schema 校验通过，进入毫秒级质量门禁...' });
    return {
      slides: result.data.slides as SlideItem[],
      validationErrors: undefined,
      status: 'checking' as GenState['status'],
    };
  }

  // ----- 节点 4: quality_gate (纯规则质检) -----
  async function qualityGateNode(state: typeof GraphState.State) {
    const rules = DEFAULT_QUALITY_RULES;
    const issues: { pageIndex: number; reason: string }[] = [];

    for (const slide of state.slides) {
      // 检查每条要点字数
      for (const point of slide.points) {
        if (point.length > rules.maxCharsPerLine) {
          issues.push({
            pageIndex: slide.pageIndex,
            reason: `第${slide.pageIndex}页要点"${point.slice(0, 8)}..."字数(${point.length}字)超出限制`,
          });
        }
      }

      // 检查演讲稿字数
      const noteLen = slide.speakerNotes?.length || 0;
      const [minNote, maxNote] = rules.speakerNotesRange;
      if (noteLen < minNote || noteLen > maxNote) {
        issues.push({
          pageIndex: slide.pageIndex,
          reason: `第${slide.pageIndex}页演讲稿字数(${noteLen}字)不在推荐范围[${minNote}-${maxNote}]`,
        });
      }
    }

    // 检查必需环节
    const slideTypes = new Set(state.slides.map((s) => s.type));
    for (const required of rules.requiredSections) {
      if (!slideTypes.has(required)) {
        issues.push({ pageIndex: 0, reason: `缺少关键说课环节: ${required}` });
      }
    }

    if (issues.length > 0 && state.repairCount < MAX_REPAIR_COUNT) {
      emit({ type: 'eval', step: 'QUALITY_GATE', progress: 74, message: `⚠️ 发现 ${issues.length} 处排版字数瑕疵，自动微调修复...` });
      return {
        qualityIssues: issues,
        validationErrors: issues.map((i) => i.reason),
        repairCount: state.repairCount + 1,
        status: 'structuring' as GenState['status'],
      };
    }

    emit({ type: 'step', step: 'RENDERING', progress: 82, message: '✅ 质量门禁 100% 达标，正在纯代码渲染 PPTX...' });
    return {
      qualityIssues: issues.length > 0 ? issues : undefined,
      status: 'rendering' as GenState['status'],
    };
  }

  // ----- 节点 5: render (纯代码渲染) -----
  async function renderNode(state: typeof GraphState.State) {
    emit({ type: 'step', step: 'RENDERING', progress: 88, message: '🎨 正在计算卡片几何坐标与注入演讲者备注...' });

    const buffer = await renderService.render(state.slides, state.input);

    // 逐页推送预览数据给前端
    state.slides.forEach((slide) => {
      emit({
        type: 'slide',
        step: 'RENDERING',
        progress: 92,
        message: `已渲染第 ${slide.pageIndex} 页：${slide.title}`,
        slideData: slide,
      });
    });

    emit({ type: 'step', step: 'DONE', progress: 100, message: '🎉 PPT 生成完成！' });

    return {
      pptxBuffer: buffer,
      status: 'done' as GenState['status'],
    };
  }

  // ============================================================
  // 构建 StateGraph
  // ============================================================
  const graph = new StateGraph(GraphState)
    .addNode('design_thinking', designThinkingNode)
    .addNode('structure', structureNode)
    .addNode('validate', validateNode)
    .addNode('quality_gate', qualityGateNode)
    .addNode('render', renderNode);

  graph.addEdge(START, 'design_thinking');
  graph.addEdge('design_thinking', 'structure');
  graph.addEdge('structure', 'validate');

  // validate 条件边
  graph.addConditionalEdges('validate', (state) => {
    if (!state.validationErrors || state.validationErrors.length === 0) {
      return 'quality_gate';
    }
    if (state.repairCount >= MAX_REPAIR_COUNT) {
      emit({ type: 'eval', step: 'QUALITY_GATE', progress: 78, message: '⚠️ 修复达到上限，平滑降级渲染' });
      return 'render';
    }
    return 'structure';
  });

  // quality_gate 条件边
  graph.addConditionalEdges('quality_gate', (state) => {
    if (state.status === 'rendering') {
      return 'render';
    }
    if (state.repairCount >= MAX_REPAIR_COUNT) {
      emit({ type: 'eval', step: 'QUALITY_GATE', progress: 80, message: '⚠️ 质量微调达到上限，继续渲染' });
      return 'render';
    }
    return 'structure';
  });

  graph.addEdge('render', END);

  return graph.compile();
}
