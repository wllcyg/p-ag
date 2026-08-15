# 教师说课 PPT 智能生成系统 - 开发方案

> 基于 NestJS + LangGraph.js + pptxgenjs + Vue3 构建，核心是一条带自修复循环、
> 质量门禁分支、可选检索增强的多阶段生成 pipeline。

---

## 一、设计原则

1. **确定的地方用代码，不确定的地方才用 LLM**。大纲结构、渲染规则、字数限制是
   规则问题，不该每次都让模型重新"决定"；只有内容生成（说课思路、逐字稿措辞）
   才需要 LLM。
2. **推理和结构化输出分离**。"想清楚怎么讲"和"存成什么格式"是两件事，分两步
   做，不指望一次模型调用两件事都干好。
3. **失败是常态，不是异常**。JSON 解析失败、字数超标、模型跑题每天都会发生，
   系统要把"修复"设计成主路径，而不是靠 try-catch 兜底。
4. **用户体感优先于总时长**。全程有实时反馈的 30 秒，比黑屏等待的 15 秒体验更好。
5. **不追求覆盖率 100%，追求诚实的置信度标注**。内容来源分级公开给用户，而不是
   假装每一页都权威可靠。

---

## 二、整体架构

```
Vue3 前端（表单 + SSE 实时流 + 卡片预览）
        ↓ HTTP + SSE
NestJS 服务（鉴权、限流、任务编排入口、文件下发）
        ↓
LangGraph.js StateGraph（生成核心，内嵌重试/修复/质检/检索循环）
        ↓
pptxgenjs 渲染层（纯函数，无 LLM 介入）
```

**技术选型说明**：
- 不采用 DeepSeek Harness（dsh）：dsh 定位是"开放式、模型自主决策下一步做什么"
  的编码 agent 壳子，developer preview 阶段 API 还在剧烈变化，跟本项目"每一步
  做什么由代码决定、模型只负责节点内产出内容"的确定性流程诉求不匹配。
- 采用 LangGraph.js：本项目有两处天然的循环（Schema 自修复、质量门禁打回），
  用 StateGraph 的条件边显式建模，比手写一堆 if-else + while 更清晰、更好调试，
  也是可以在简历/面试中讲清楚、可验证的技术点。

---

## 三、生成核心：StateGraph 设计

### State 结构

```typescript
interface GenState {
  input: GeneratePptDto;
  needsResearch: boolean;
  researchResults?: {
    query: string;
    summary: string;
    sources: { title: string; url: string }[];
  }[];
  designThoughts?: string;        // 自然语言说课设计思路（流式）
  slides: SlideItem[];
  validationErrors?: string[];
  qualityIssues?: { pageIndex: number; reason: string }[];
  repairCount: number;
  status: 'analyzing' | 'researching' | 'thinking' | 'structuring'
        | 'validating' | 'checking' | 'rendering' | 'done' | 'failed';
}
```

### 图结构

```
input_analysis（规则/轻量LLM：是否需要检索、生成检索query）
   │
   ├─需要 → research（多query搜索 + 摘要 + 来源分级，硬超时5s，失败降级跳过）
   │           ↓
   └─不需要 ──┤
              ↓
design_thinking（R1/V3，自然语言，SSE 流式推送）
   ↓
structure（V3 + JSON mode，转 SlideItem[] 结构化数据）
   ↓
validate（Zod schema）
   │
   ├─失败且 repairCount<3 → repair（错误信息拼入prompt，回 structure）
   │
   └─通过 ↓
quality_gate（纯规则：字数/时长/必需字段，不用 LLM-as-judge，保证毫秒级）
   │
   ├─局部页面不过且 repairCount<3 → targeted_fix（只重生成对应页，回 structure）
   │
   └─通过 ↓
render（pptxgenjs，纯函数，零 LLM）
   ↓
done / failed（repairCount 耗尽时返回部分结果 + 明确标注需人工检查的页）
```

**关键约束**：
- `repairCount` 是全局熔断，超过上限直接进入降级分支，绝不无限重试烧 token。
- `quality_gate` 只做规则判断，不接 LLM，避免拖慢实时生成的时延。
- `targeted_fix` 只重跑不合格的那几页，不整批重来。

---

## 四、模型分工

| 阶段 | 模型 | 输出形式 | 说明 |
|---|---|---|---|
| design_thinking | R1（或 V3 高精度） | 自然语言 | 想清楚教学目标/环节安排/重难点，流式推送给前端展示"AI备课过程" |
| structure | V3 + JSON mode/function calling | 结构化 SlideItem[] | 只做格式转换，不需要同时"思考"，失败率更低 |
| repair | V3 | 结构化（局部修复） | prompt 携带具体 Zod 报错信息，针对性修复而非整体重来 |

R1 目前不支持严格 JSON 模式，`reasoning_content` 与 `content` 分离返回，不要指望
它直接产出可校验的结构化数据。

---

## 五、检索增强（可选，按需触发）

### 5.1 触发判断

不做全量检索，`input_analysis` 节点用规则 + 轻量 LLM 判断：
- 是否为需要精确对齐课标/教材版本的场景（如教资面试）
- 学科/课题是否涉及时效性内容（如英语课讲时事热点）

不满足以上条件的课题，直接跳过检索，用模型通用知识生成——大多数常见教材篇目
的教学目标、重难点属于全网广泛存在的通用共识，模型本身覆盖率并不低。

### 5.2 research 节点内部设计

1. 多 query 并发搜索，不用一个大而全的 query。
2. 来源分级：教育部/课程标准官网、教材出版社 > 权威教育媒体 > 一般论坛/自媒体。
3. 抓取后必须摘要压缩（2~3句/来源），不整页塞入 prompt。
4. 输出带引用结构：`{ summary, sources: {title, url}[] }[]`。
5. 硬超时（建议5秒），超时直接放弃搜索结果，走无检索路径，不阻塞主流程。
6. **时效性问题重点处理**：query 显式加时间限定词（如"仅2026年内发布"），
   要求结果标注发布时间，避免检索引擎默认排序导致老旧资料排名靠前、
   或模型脑补训练数据里的过时内容而非真正基于检索结果作答。

### 5.3 分层降级架构（推荐的最终形态）

```
1. 查自建知识库（优先覆盖高频教材/篇目，仅需教学目标/重难点/教法等元数据，
   不需要课文原文）
        ├─命中 → 使用（sourceConfidence: 'verified'）
        └─未命中 ↓
2. 判断是否需要精确对齐
        ├─需要 → 触发实时搜索兜底（sourceConfidence: 'web_searched'）
        └─不需要 ↓
3. 直接用模型通用知识生成（sourceConfidence: 'model_knowledge'）
```

自建知识库的数据来源可考虑 ChinaTextbook 等开源教材整理项目做离线预处理
（提取教学目标/重难点等元数据，而非直接分发课文原文，注意版权边界，
不对外展示课文原文本身）。PDF 解析可复用 MinerU 处理复杂版面、多模态
视觉路由处理扫描页的既有经验。

### 5.4 成本控制

- Redis 语义缓存：按"学科+课题+教材版本"做语义相似度缓存，命中率预期不低。
- 前端表单填写间隙可做异步预取。

### 5.5 HuggingFace 生态可用资源

**数据集（补充教学法通用语料，不作为权威教材元数据来源）**
- `opencsg/chinese-fineweb-edu-v2`：教育类中文预训练语料，适合补充模型对说课
  规范、教学法的通用理解。
- Chinese Cosmopedia：合成语料，明确区分"学术型/教学型/启蒙型"等风格分级，
  教学型对标中学教科书、做过 Flesch 易读度控制（>60），可参考其分级标准设计
  本项目的质量门禁阈值。
- 定位：这两类是清洗过的合成/通用语料，版本与课标对齐精度不足，**不能**直接
  当作"某版本教材某一课的权威重难点"来源，仅用于补充模型的教学法背景知识，
  权威性要求高的部分仍走自建知识库/实时检索。

**Embedding / Reranker 模型（直接用于检索层）**
- `BAAI/bge-large-zh-v1.5` 或 `bge-m3`：中文 RAG 场景常用 embedding，bge-m3 支持
  稠密+稀疏+多向量混合检索，可与 ES（稀疏/关键词）+ Milvus（稠密/向量）双写
  架构直接配合。
- `BAAI/bge-reranker-large`：检索结果二次重排，可结合"是否权威源"作为重排特征，
  比纯手写规则权重更灵活，直接支撑第五节的来源分级逻辑。
- 均可本地跑（Mac mini M4 + OrbStack，或 sentence-transformers 库调用），不依赖
  付费 API，与现有本地化基础设施契合。

**Spaces（面试展示用，与正式产品分离部署）**
- 用 Gradio/Streamlit 搭一个简化版 demo（输入课题 → 查看生成过程 → 下载 PPT），
  给面试官一个免部署即可体验的链接，与正式 Vue3 前端分开维护。

**使用注意事项**
- 仅下载数据集/模型做本地推理不需要 API Key，无泄露风险。
- 若使用 Inference API 或上传代码到 Spaces，密钥必须放 Spaces Secrets，不得硬编码。
- 商用前检查各数据集 License（部分仅限研究用途）。

---

## 六、质量门禁：配置化而非硬编码

```typescript
interface QualityRules {
  maxCharsPerLine: number;              // 默认15，按学科可覆盖（如数学公式类放宽）
  speakerNotesRange: [number, number];  // 默认[80, 150]
  requiredSections: string[];           // 说课六步法各环节
  totalDurationRange: [number, number]; // 秒
}
```

按学科、学段做配置覆盖，不用一套数字打天下。

---

## 七、数据契约

### GeneratePptDto（请求入参）
```typescript
export class GeneratePptDto {
  subject: string;
  grade: string;
  lessonTitle: string;
  textbookVersion?: string;
  extraRequirement?: string;
}
```

### SlideItem（单页数据模型）
```typescript
export interface SlideItem {
  pageIndex: number;
  type: 'cover' | 'catalog' | 'material' | 'student' | 'method'
      | 'process' | 'board' | 'summary';
  title: string;
  subtitle?: string;
  points: string[];             // 单条 ≤ maxCharsPerLine
  speakerNotes: string;
  durationSeconds?: number;
  references?: { title: string; url: string }[];  // 引用的外部资料
  sourceConfidence?: 'verified' | 'web_searched' | 'model_knowledge';
}
```

### SSE 事件协议
```typescript
export type GenEventType = 'thinking' | 'step' | 'slide' | 'eval' | 'done' | 'error';

export interface GenEventPayload {
  type: GenEventType;
  step?: 'ANALYZING' | 'RESEARCHING' | 'REASONING' | 'STRUCTURING'
       | 'VALIDATING' | 'QUALITY_GATE' | 'RENDERING' | 'DONE';
  progress: number;             // 0~100
  message: string;
  reasoningChunk?: string;      // 思考流增量
  searchResults?: { query: string; sourcesFound: number }[];
  slideData?: SlideItem;
  downloadUrl?: string;
}
```

---

## 八、开发路线图

### 阶段一：生成核心（server/）
- [ ] 依赖安装：`pptxgenjs`、`@langchain/langgraph`、`openai`（或 DeepSeek SDK）、
      `zod`、`class-validator`
- [ ] 用 LangGraph.js 搭建 StateGraph：`input_analysis` → `research`(可选) →
      `design_thinking` → `structure` → `validate`/`repair` → `quality_gate`/
      `targeted_fix` → `render`
- [ ] pptxgenjs 渲染层：16:9 母版、色块排版、多学科视觉主题、Speaker Notes 注入
      （与生成逻辑完全解耦，只吃 `SlideItem[]`，可独立写单元测试）
- [ ] NestJS SSE 控制器：`POST /api/ppt/generate-stream`，将 LangGraph 的
      `streamEvents` 转换为 `GenEventPayload` 推送给前端

### 阶段二：前端交互（web/）
- [ ] Pinia 状态管理（`stores/pptGenerator.ts`）
- [ ] 教师输入表单（`views/Home.vue`）：学科/学段/课题/教材版本/补充要求
- [ ] 生成状态可视化（`components/GenerationTerminal.vue`）：思考流、检索状态、
      当前阶段
- [ ] 幻灯片预览（`components/SlidePreview.vue`）：卡片列表 + 逐字稿分栏 +
      来源置信度标注 + 下载按钮

### 阶段三：学科定制
- [ ] 多学科配色策略（文科/理科/综合类）
- [ ] 板书结构化图示（提纲式/图解式/脉络式布局映射为 pptxgenjs 图形）

### 阶段四：检索增强（可选，视时间安排）
- [ ] 自建知识库离线预处理（高频教材元数据提取）
- [ ] 接入 `bge-m3`/`bge-large-zh-v1.5` 作为检索层 embedding（本地部署）
- [ ] 接入 `bge-reranker-large` 做检索结果二次重排（结合来源权威度特征）
- [ ] 实时搜索兜底 + Redis 语义缓存
- [ ] 分层降级逻辑接入 `input_analysis`/`research` 节点
- [ ] （可选）拉取 `opencsg/chinese-fineweb-edu-v2` 等教育语料补充教学法背景知识

### 阶段五：全链路联调与部署
- [ ] 端到端测试（典型学科课题，验证 Office/WPS/Keynote 兼容性）
- [ ] 鉴权 + 限流（公网暴露前必须完成，不留到最后）
- [ ] 降级策略：模型 API 不可用时的纯模板兜底
- [ ] pm2 部署 + Cloudflare Tunnel

---

## 九、验收标准（留有余地的版本）

1. **可靠性**：借助校验+自修复能力，repairCount 熔断内目标成功率达标；超限时
   返回部分结果并明确标注需人工检查的页面，而非整体失败。
2. **时效性分级**：
   - P50（无需修复）：25~40 秒
   - P90（含一次自修复或局部重生成）：60~90 秒
   - 超过 120 秒或熔断：走降级分支
3. **专业度**：教学大纲符合说课六步法规范；画面简洁（大字+卡片化）；逐字稿
   精准嵌入备注栏；引用来源诚实标注置信度。

---

## 十、其他工程细节清单

- [ ] 任务日志持久化：每次生成的中间状态（design_thoughts、slides、耗时、
      repairCount）存档，作为后续 badcase 分析和三层评估框架的原始数据
- [ ] LLM-as-judge 仅用于离线 badcase 分析，不进实时生成链路
- [ ] 版权边界：教材相关数据仅用于教学目标/重难点等元数据提取，不直接对外
      展示课文原文