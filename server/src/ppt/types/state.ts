import { z } from 'zod';

// ============================================================
// 1. 请求入参 DTO
// ============================================================
export class GeneratePptDto {
  /** 学科：语文 / 数学 / 物理 / 化学 / 英语 ... */
  subject: string;
  /** 学段/年级：小学三年级 / 初中七年级 / 高中一年级 ... */
  grade: string;
  /** 课题标题 */
  lessonTitle: string;
  /** 教材版本（可选）：人教版 / 北师大版 / 苏教版 ... */
  textbookVersion?: string;
  /** 额外要求（可选）：比赛、公开课、教资面试等补充说明 */
  extraRequirement?: string;
  /**
   * PPT 视觉主题（可选）
   * - cat-purple：灵动猫猫紫（默认，适合文科/创意）
   * - tech-blue：极简科技蓝（适合理工科/商务汇报）
   * - fresh-mint：清爽自然绿（适合自然科学/生物）
   * - academic-red：典雅学术红（适合正式比赛/公开说课）
   */
  theme?: 'cat-purple' | 'tech-blue' | 'fresh-mint' | 'academic-red';
}

// ============================================================
// 2. 单页数据模型
// ============================================================
export interface SlideItem {
  /** 页面索引（从 1 开始） */
  pageIndex: number;
  /**
   * 页面类型：
   * - cover: 封面页（课题、学科、年级、教师信息）
   * - catalog: 目录/说课提纲页
   * - material: 教材分析页（教材地位、知识结构）
   * - student: 学情分析页（认知基础、学习特点）
   * - method: 教法学法页（教学理念、策略选择）
   * - process: 教学过程页（核心环节展开，可有多页）
   * - board: 板书设计页（知识框架可视化）
   * - summary: 总结反思页（期望收益、评价方式）
   */
  type: 'cover' | 'catalog' | 'material' | 'student' | 'method'
      | 'process' | 'board' | 'summary';
  /** 页面标题（≤ 16 个汉字） */
  title: string;
  /** 副标题（可选，封面页/目录页常用） */
  subtitle?: string;
  /**
   * 内容条目列表（单条 ≤ 15 个字符，建议 3～5 条）
   * 渲染引擎根据条目数量自动计算最优布局
   */
  points: string[];
  /**
   * 演讲者逐字稿（80～150 字）
   * 精准注入到 PowerPoint 演讲者备注栏（Speaker Notes）
   */
  speakerNotes: string;
  /** 预计演讲时长（秒），由质量门禁计算注入 */
  durationSeconds?: number;
  /** 引用的外部资料（可选，检索增强时生效） */
  references?: { title: string; url: string }[];
  /** 内容来源置信度标注 */
  sourceConfidence?: 'verified' | 'web_searched' | 'model_knowledge';
}

// ============================================================
// 3. Zod 校验 Schema
// ============================================================
export const SlideItemSchema = z.object({
  pageIndex: z.number().int().min(1),
  type: z.enum(['cover', 'catalog', 'material', 'student', 'method',
                 'process', 'board', 'summary']),
  title: z.string().min(1).max(40),
  subtitle: z.string().max(60).optional(),
  points: z
    .array(z.string().min(1).max(30))
    .max(10),
  speakerNotes: z.string().min(10).max(400),
  durationSeconds: z.number().int().positive().optional(),
  references: z
    .array(z.object({ title: z.string(), url: z.string().url() }))
    .optional(),
  sourceConfidence: z
    .enum(['verified', 'web_searched', 'model_knowledge'])
    .optional(),
});

export const SlidesSchema = z.object({
  slides: z.array(SlideItemSchema).min(6).max(16),
});

export type SlidesOutput = z.infer<typeof SlidesSchema>;

// ============================================================
// 4. LangGraph 状态接口
// ============================================================
export interface GenState {
  input: GeneratePptDto;
  needsResearch: boolean;
  researchResults?: {
    query: string;
    summary: string;
    sources: { title: string; url: string }[];
  }[];
  designThoughts?: string;
  slides: SlideItem[];
  validationErrors?: string[];
  qualityIssues?: { pageIndex: number; reason: string }[];
  repairCount: number;
  pptxBuffer?: Buffer;
  status:
    | 'analyzing'
    | 'researching'
    | 'thinking'
    | 'structuring'
    | 'validating'
    | 'checking'
    | 'rendering'
    | 'done'
    | 'failed';
}

// ============================================================
// 5. SSE 事件协议
// ============================================================
export type GenEventType = 'thinking' | 'step' | 'slide' | 'eval' | 'done' | 'error';

export interface GenEventPayload {
  type: GenEventType;
  step?:
    | 'ANALYZING'
    | 'RESEARCHING'
    | 'REASONING'
    | 'STRUCTURING'
    | 'VALIDATING'
    | 'QUALITY_GATE'
    | 'RENDERING'
    | 'DONE';
  progress: number; // 0~100
  message: string;
  /** 流式思考增量片段（type === 'thinking' 时携带） */
  reasoningChunk?: string;
  searchResults?: { query: string; sourcesFound: number }[];
  slideData?: SlideItem;
  /** 生成完成后的下载地址（type === 'done' 时携带） */
  downloadUrl?: string;
}

// ============================================================
// 6. 质量门禁规则配置接口
// ============================================================
export interface QualityRules {
  /** 单条要点最大字数（默认 15） */
  maxCharsPerLine: number;
  /** 演讲逐字稿字数范围 [最小, 最大]（默认 [80, 200]） */
  speakerNotesRange: [number, number];
  /** 必需的说课环节 type 列表 */
  requiredSections: SlideItem['type'][];
  /** 总演讲时长范围（秒） */
  totalDurationRange: [number, number];
}

/** 各学科默认质量门禁配置 */
export const DEFAULT_QUALITY_RULES: QualityRules = {
  maxCharsPerLine: 18,
  speakerNotesRange: [60, 250],
  requiredSections: ['cover', 'catalog', 'process', 'summary'],
  totalDurationRange: [600, 1200], // 10 ~ 20 分钟
};
