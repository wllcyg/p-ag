// ============================================================
// 前端 PPT 数据契约与状态类型
// ============================================================

export type SlideType =
  | 'cover'
  | 'catalog'
  | 'material'
  | 'student'
  | 'method'
  | 'process'
  | 'board'
  | 'summary';

export type ThemeType = 'cat-purple' | 'tech-blue' | 'fresh-mint' | 'academic-red';

export interface GeneratePptDto {
  subject: string;
  grade: string;
  lessonTitle: string;
  textbookVersion?: string;
  extraRequirement?: string;
  theme?: ThemeType;
}

export type SlideLayout = 'timeline' | 'compare' | 'stat' | 'matrix' | 'grid';

export interface SlideItem {
  pageIndex: number;
  type: SlideType;
  layout?: SlideLayout;
  title: string;
  subtitle?: string;
  points: string[];
  speakerNotes: string;
  durationSeconds?: number;
  references?: { title: string; url: string }[];
  sourceConfidence?: 'verified' | 'web_searched' | 'model_knowledge';
}

export type GenStep =
  | 'ANALYZING'
  | 'RESEARCHING'
  | 'REASONING'
  | 'STRUCTURING'
  | 'VALIDATING'
  | 'QUALITY_GATE'
  | 'RENDERING'
  | 'DONE';

export interface GenEventPayload {
  type: 'thinking' | 'step' | 'slide' | 'eval' | 'done' | 'error';
  step?: GenStep;
  progress: number;
  message: string;
  reasoningChunk?: string;
  searchResults?: { query: string; sourcesFound: number }[];
  slideData?: SlideItem;
  downloadUrl?: string;
}
