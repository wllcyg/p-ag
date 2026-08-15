import { ChatOpenAI } from '@langchain/openai';
import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { AIMessageChunk } from '@langchain/core/messages';
import {
  GenState,
  GeneratePptDto,
  SlideItem,
  SlidesSchema,
  DEFAULT_QUALITY_RULES,
  GenEventPayload,
} from '../types/state';
import { PptRenderService } from '../render/pptx.renderer';

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
// LLM 工厂（复用 OpenAI 兼容接口，指向硅基流动/DeepSeek）
// ============================================================
function createThinkingModel() {
  return new ChatOpenAI({
    modelName: process.env.DEEPSEEK_THINKING_MODEL || 'deepseek-r1',
    openAIApiKey: process.env.DEEPSEEK_API_KEY || process.env.SILICONFLOW_API_KEY,
    configuration: {
      baseURL: process.env.LLM_BASE_URL || 'https://api.siliconflow.cn/v1',
    },
    temperature: 0.7,
    streaming: true,
  });
}

function createStructureModel() {
  return new ChatOpenAI({
    modelName: process.env.DEEPSEEK_STRUCTURE_MODEL || 'deepseek-v3',
    openAIApiKey: process.env.DEEPSEEK_API_KEY || process.env.SILICONFLOW_API_KEY,
    configuration: {
      baseURL: process.env.LLM_BASE_URL || 'https://api.siliconflow.cn/v1',
    },
    temperature: 0.3,
    streaming: false,
  });
}

// ============================================================
// 节点工厂函数（接收 emit 回调，返回节点函数）
// ============================================================
export function buildGeneratorGraph(emit: SseEmitter) {
  const renderService = new PptRenderService();

  // ----- 节点 1: design_thinking -----
  async function designThinkingNode(state: typeof GraphState.State) {
    emit({ type: 'step', step: 'REASONING', progress: 15, message: '🐱 正在深度思考说课设计...' });

    const dto = state.input;
    const prompt = `你是一位资深的教育专家，请为以下课题设计一份完整的说课思路。

课题信息：
- 学科：${dto.subject}
- 年级：${dto.grade}  
- 课题：${dto.lessonTitle}
- 教材版本：${dto.textbookVersion || '不限'}
- 补充要求：${dto.extraRequirement || '无'}

请按照"说课六步法"（教材分析 → 学情分析 → 教学目标与重难点 → 教法学法 → 教学过程 → 板书设计）
逐步展开设计思路，重点说明：
1. 本课在教材中的地位与价值
2. 教学目标（知识目标、能力目标、情感目标）  
3. 重难点及突破策略
4. 教学过程各环节的设计意图（含时间分配）
5. 演讲逐字稿的口语化风格要求

请用自然语言详细阐述，无需输出 JSON 格式。`;

    const model = createThinkingModel();
    let thoughts = '';

    try {
      const stream = await model.stream(prompt);
      let chunkCount = 0;
      for await (const chunk of stream) {
        const content = (chunk as AIMessageChunk).content;
        if (typeof content === 'string' && content) {
          thoughts += content;
          chunkCount++;
          // 每5个chunk推送一次，避免过于频繁
          if (chunkCount % 5 === 0) {
            emit({ type: 'thinking', step: 'REASONING', progress: 25, message: '思考中...', reasoningChunk: content });
          }
        }
      }
    } catch (err: any) {
      // 思考节点失败不阻断流程，用简化思路继续
      thoughts = `为${dto.grade}${dto.subject}《${dto.lessonTitle}》设计说课，按六步法展开。`;
      emit({ type: 'step', step: 'REASONING', progress: 25, message: `⚠️ 思考模型异常，使用降级方案继续` });
    }

    emit({ type: 'step', step: 'STRUCTURING', progress: 35, message: '✅ 设计思路完成，正在结构化...' });

    return { designThoughts: thoughts, status: 'structuring' as GenState['status'] };
  }

  // ----- 节点 2: structure -----
  async function structureNode(state: typeof GraphState.State) {
    emit({ type: 'step', step: 'STRUCTURING', progress: 45, message: '📐 正在生成幻灯片结构...' });

    const dto = state.input;
    const thoughts = state.designThoughts || '';
    const previousErrors = state.validationErrors?.join('\n') || '';
    const repairHint = previousErrors
      ? `\n\n⚠️ 上次生成存在以下问题，请严格修复：\n${previousErrors}`
      : '';

    const prompt = `基于以下说课设计思路，生成完整的幻灯片结构化数据。

设计思路：
${thoughts.slice(0, 3000)}

课题信息：
- 学科：${dto.subject}，年级：${dto.grade}，课题：${dto.lessonTitle}
${repairHint}

请严格按照以下 JSON 格式输出，不要输出任何其他内容：

{
  "slides": [
    {
      "pageIndex": 1,
      "type": "cover",
      "title": "课题标题（简洁，≤20字）",
      "subtitle": "学科 · 年级 · 教材版本",
      "points": [],
      "speakerNotes": "开场白逐字稿（60-200字，口语化）"
    },
    {
      "pageIndex": 2,
      "type": "catalog",
      "title": "说课提纲",
      "points": ["一、教材分析", "二、学情分析", "三、教学目标", "四、教法学法", "五、教学过程", "六、板书设计"],
      "speakerNotes": "目录说明（60-150字）"
    }
    // ... 其余页面
  ]
}

要求：
1. 共生成 7～10 张幻灯片
2. 必须包含以下 type：cover、catalog、material、student、method、至少2个process、board、summary
3. points 每条 ≤ 18 个字符，每页 2～6 条
4. speakerNotes 60～200 字，口语化，符合说课现场演讲风格
5. 只输出合法 JSON，不要 markdown 代码块包裹`;

    const model = createStructureModel();

    try {
      const response = await model.invoke(prompt);
      const raw = typeof response.content === 'string' ? response.content : '';

      // 提取 JSON（兼容模型可能输出 ```json 包裹）
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          validationErrors: ['模型未输出合法JSON，raw: ' + raw.slice(0, 200)],
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
      return {
        validationErrors: [`JSON 解析失败: ${err.message}`],
        repairCount: state.repairCount + 1,
        status: 'validating' as GenState['status'],
      };
    }
  }

  // ----- 节点 3: validate -----
  async function validateNode(state: typeof GraphState.State) {
    emit({ type: 'step', step: 'VALIDATING', progress: 60, message: '🔍 正在校验数据格式...' });

    const result = SlidesSchema.safeParse({ slides: state.slides });

    if (!result.success) {
      const errors = result.error.issues.map(
        (e) => `[${e.path.map(String).join('.')}] ${e.message}`
      );
      emit({ type: 'eval', step: 'VALIDATING', progress: 60, message: `❌ 校验失败(${errors.length}项)，自动修复中...` });
      return {
        validationErrors: errors,
        repairCount: state.repairCount + 1,
        status: 'structuring' as GenState['status'],
      };
    }

    emit({ type: 'step', step: 'QUALITY_GATE', progress: 68, message: '✅ 格式校验通过，进入质量检查...' });
    return {
      slides: result.data.slides as SlideItem[],
      validationErrors: undefined,
      status: 'checking' as GenState['status'],
    };
  }

  // ----- 节点 4: quality_gate (纯规则，零LLM) -----
  async function qualityGateNode(state: typeof GraphState.State) {
    const rules = DEFAULT_QUALITY_RULES;
    const issues: { pageIndex: number; reason: string }[] = [];

    for (const slide of state.slides) {
      // 检查每条要点字数
      for (const point of slide.points) {
        if (point.length > rules.maxCharsPerLine) {
          issues.push({
            pageIndex: slide.pageIndex,
            reason: `要点"${point.slice(0, 10)}..."超过${rules.maxCharsPerLine}字限制（${point.length}字）`,
          });
        }
      }

      // 检查演讲稿字数
      const noteLen = slide.speakerNotes?.length || 0;
      const [minNote, maxNote] = rules.speakerNotesRange;
      if (noteLen < minNote || noteLen > maxNote) {
        issues.push({
          pageIndex: slide.pageIndex,
          reason: `演讲稿字数${noteLen}字，不在要求范围[${minNote}-${maxNote}]内`,
        });
      }
    }

    // 检查必需环节
    const slideTypes = new Set(state.slides.map(s => s.type));
    for (const required of rules.requiredSections) {
      if (!slideTypes.has(required)) {
        issues.push({ pageIndex: 0, reason: `缺少必需环节类型: ${required}` });
      }
    }

    if (issues.length > 0 && state.repairCount < MAX_REPAIR_COUNT) {
      emit({ type: 'eval', step: 'QUALITY_GATE', progress: 70, message: `⚠️ 质量检查发现${issues.length}个问题，修复中...` });
      return {
        qualityIssues: issues,
        validationErrors: issues.map(i => `第${i.pageIndex}页: ${i.reason}`),
        repairCount: state.repairCount + 1,
        status: 'structuring' as GenState['status'],
      };
    }

    emit({ type: 'step', step: 'RENDERING', progress: 80, message: '✅ 质量检查通过，正在渲染 PPT...' });
    return {
      qualityIssues: issues.length > 0 ? issues : undefined,
      status: 'rendering' as GenState['status'],
    };
  }

  // ----- 节点 5: render -----
  async function renderNode(state: typeof GraphState.State) {
    emit({ type: 'step', step: 'RENDERING', progress: 88, message: '🎨 正在渲染幻灯片...' });

    const buffer = await renderService.render(state.slides, state.input);

    // 逐页通知前端（用于卡片预览展示）
    state.slides.forEach(slide => {
      emit({ type: 'slide', step: 'RENDERING', progress: 90, message: `渲染第${slide.pageIndex}页`, slideData: slide });
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

  // 边定义
  graph.addEdge(START, 'design_thinking');
  graph.addEdge('design_thinking', 'structure');
  graph.addEdge('structure', 'validate');

  // validate 后：通过 → quality_gate，失败且未超限 → structure 重试，超限 → render
  graph.addConditionalEdges('validate', (state) => {
    if (!state.validationErrors || state.validationErrors.length === 0) {
      return 'quality_gate';
    }
    if (state.repairCount >= MAX_REPAIR_COUNT) {
      emit({ type: 'eval', step: 'QUALITY_GATE', progress: 78, message: `⚠️ 修复次数已达上限，使用当前结果降级渲染` });
      return 'render';
    }
    return 'structure';
  });

  // quality_gate 后：通过 → render，失败且未超限 → structure 局部修复
  graph.addConditionalEdges('quality_gate', (state) => {
    if (state.status === 'rendering') {
      return 'render';
    }
    if (state.repairCount >= MAX_REPAIR_COUNT) {
      emit({ type: 'eval', step: 'QUALITY_GATE', progress: 82, message: `⚠️ 质量修复次数达上限，降级渲染` });
      return 'render';
    }
    return 'structure';
  });

  graph.addEdge('render', END);

  return graph.compile();
}
