import PptxGenJS from 'pptxgenjs';
import { SlideItem, GeneratePptDto } from '../types/state';

// ============================================================
// 主题配色方案（带丰富层次辅助色）
// ============================================================
export interface ThemePalette {
  name: string;
  primary: string;
  accent: string;
  background: string;
  cardBg: string;
  cardBgAlt: string;
  textDark: string;
  textMuted: string;
  borderColor: string;
  highlight: string;
}

export const THEME_PALETTES: Record<string, ThemePalette> = {
  'cat-purple': {
    name: '灵动猫猫紫',
    primary: '7C3AED',
    accent: 'A78BFA',
    background: 'FAFAFA',
    cardBg: 'F5F3FF',
    cardBgAlt: 'EDE9FE',
    textDark: '1F1635',
    textMuted: '6B7280',
    borderColor: 'DDD6FE',
    highlight: 'F59E0B',
  },
  'tech-blue': {
    name: '极简科技蓝',
    primary: '2563EB',
    accent: '60A5FA',
    background: 'F8FAFF',
    cardBg: 'EFF6FF',
    cardBgAlt: 'DBEAFE',
    textDark: '1E3A5F',
    textMuted: '64748B',
    borderColor: 'BFDBFE',
    highlight: '0EA5E9',
  },
  'fresh-mint': {
    name: '清爽自然绿',
    primary: '059669',
    accent: '34D399',
    background: 'F8FFFC',
    cardBg: 'ECFDF5',
    cardBgAlt: 'D1FAE5',
    textDark: '064E3B',
    textMuted: '6B7280',
    borderColor: 'A7F3D0',
    highlight: '10B981',
  },
  'academic-red': {
    name: '典雅学术红',
    primary: 'DC2626',
    accent: 'F87171',
    background: 'FFFAFA',
    cardBg: 'FEF2F2',
    cardBgAlt: 'FEE2E2',
    textDark: '450A0A',
    textMuted: '6B7280',
    borderColor: 'FECACA',
    highlight: 'E11D48',
  },
};

const DEFAULT_THEME = 'cat-purple';

// 跨平台字体
const FONT_FACE = 'Microsoft YaHei';
const FONT_FACE_FALLBACK = 'PingFang SC';

function resolveFontFace(): string {
  try {
    if (typeof process !== 'undefined' && process.platform && process.platform !== 'win32') {
      return FONT_FACE_FALLBACK;
    }
  } catch {
    // 忽略
  }
  return FONT_FACE;
}

// 严格穷尽式分页容量
const MAX_PER_PAGE: Record<SlideItem['type'], number> = {
  cover: 0,
  catalog: 7,
  board: 8,
  material: 8,
  student: 8,
  method: 8,
  process: 8,
  summary: 8,
};

function paginateSlide(item: SlideItem): SlideItem[] {
  if (item.type === 'cover') return [item];

  const max = MAX_PER_PAGE[item.type];
  const points = item.points ?? [];
  if (points.length <= max) return [item];

  const chunks: string[][] = [];
  for (let i = 0; i < points.length; i += max) {
    chunks.push(points.slice(i, i + max));
  }

  return chunks.map((chunk, idx) => ({
    ...item,
    title: idx === 0 ? item.title : `${item.title}（续 ${idx + 1}）`,
    subtitle: idx === 0 ? item.subtitle : undefined,
    speakerNotes: idx === 0 ? item.speakerNotes : '',
    points: chunk,
  }));
}

function paginateSlides(slides: SlideItem[]): SlideItem[] {
  return slides.flatMap((item) => paginateSlide(item));
}

// ============================================================
// 主渲染服务
// ============================================================
export class PptRenderService {
  private getTheme(themeKey?: string): ThemePalette {
    return THEME_PALETTES[themeKey ?? DEFAULT_THEME] ?? THEME_PALETTES[DEFAULT_THEME];
  }

  /**
   * 生成标准 16:9 PPTX，返回 Buffer
   */
  async render(slides: SlideItem[], dto: GeneratePptDto): Promise<Buffer> {
    if (!slides || slides.length === 0) {
      throw new Error('PptRenderService.render: slides 不能为空');
    }

    const pptx = new PptxGenJS();
    const theme = this.getTheme(dto.theme);
    const fontFace = resolveFontFace();

    pptx.layout = 'LAYOUT_WIDE'; // 13.33" x 7.5"
    pptx.author = '猫猫 Agent 🐾';
    pptx.title = dto.lessonTitle ?? '未命名课件';
    pptx.subject = `${dto.subject ?? ''} ${dto.grade ?? ''}`.trim();

    const paginatedSlides = paginateSlides(slides);

    for (const item of paginatedSlides) {
      const slide = pptx.addSlide();

      // 注入演讲者逐字稿
      if (item.speakerNotes && typeof item.speakerNotes === 'string') {
        slide.addNotes(item.speakerNotes.trim());
      }

      // 根据页面类型及 layout 分发到专属渲染函数
      if (item.type === 'cover') {
        this.renderCover(slide, item, theme, dto, fontFace);
      } else if (item.type === 'catalog') {
        this.renderCatalog(slide, item, theme, fontFace);
      } else if (item.type === 'board') {
        this.renderBoard(slide, item, theme, fontFace);
      } else {
        // 根据高级视觉版式智能分发
        const layout = item.layout || this.inferLayout(item);
        switch (layout) {
          case 'timeline':
            this.renderTimeline(slide, item, theme, fontFace);
            break;
          case 'compare':
            this.renderCompare(slide, item, theme, fontFace);
            break;
          case 'stat':
            this.renderStat(slide, item, theme, fontFace);
            break;
          case 'matrix':
            this.renderMatrix(slide, item, theme, fontFace);
            break;
          default:
            this.renderGrid(slide, item, theme, fontFace);
            break;
        }
      }
    }

    const arrayBuffer = (await pptx.write({ outputType: 'arraybuffer' })) as ArrayBuffer;
    return Buffer.from(arrayBuffer);
  }

  /**
   * 自动根据页面语义兜底推断最佳版式
   */
  private inferLayout(item: SlideItem): 'timeline' | 'compare' | 'stat' | 'matrix' | 'grid' {
    if (item.type === 'process') return 'timeline';
    if (item.title.includes('重点') || item.title.includes('难点') || item.title.includes('对比')) return 'compare';
    if (item.type === 'student' || item.type === 'material') return 'matrix';
    if (item.type === 'method') return 'stat';
    return 'grid';
  }

  // ----------------------------------------------------------
  // 1. 封面页
  // ----------------------------------------------------------
  private renderCover(
    slide: PptxGenJS.Slide,
    item: SlideItem,
    theme: ThemePalette,
    dto: GeneratePptDto,
    fontFace: string,
  ) {
    // 左侧装饰条
    slide.addShape('rect' as PptxGenJS.ShapeType, {
      x: 0, y: 0, w: 0.55, h: 7.5,
      fill: { color: theme.primary },
      line: { type: 'none' },
    });
    slide.addShape('rect' as PptxGenJS.ShapeType, {
      x: 0.55, y: 0, w: 0.12, h: 7.5,
      fill: { color: theme.accent },
      line: { type: 'none' },
    });

    // 课题类型胶囊 Tag
    slide.addShape('roundRect' as PptxGenJS.ShapeType, {
      x: 1.1, y: 1.4, w: 2.2, h: 0.45,
      fill: { color: theme.cardBgAlt },
      line: { color: theme.borderColor, width: 0.8 },
      rectRadius: 0.08,
    });
    slide.addText(`🐾 优质说课示范`, {
      x: 1.1, y: 1.4, w: 2.2, h: 0.45,
      fontSize: 13, bold: true, color: theme.primary,
      fontFace, align: 'center', valign: 'middle',
    });

    // 主标题
    slide.addText(item.title || dto.lessonTitle || '', {
      x: 1.1, y: 2.05, w: 11.2, h: 1.5,
      fontSize: 42, bold: true,
      color: theme.textDark,
      fontFace, align: 'left', wrap: true, shrinkText: true,
    });

    // 副标题
    const subTitle = item.subtitle || `${dto.subject ?? ''} · ${dto.grade ?? ''} · ${dto.textbookVersion || '统编教材'}`;
    slide.addText(subTitle, {
      x: 1.1, y: 3.75, w: 11.2, h: 0.55,
      fontSize: 20, color: theme.primary,
      fontFace, align: 'left', shrinkText: true,
    });

    // 分割线（使用安全小色块）
    slide.addShape('rect' as PptxGenJS.ShapeType, {
      x: 1.1, y: 4.45, w: 10.5, h: 0.025,
      fill: { color: theme.borderColor },
      line: { type: 'none' },
    });

    // 演讲场景与元数据
    const meta = [dto.textbookVersion, dto.extraRequirement].filter(Boolean).join('   |   ');
    if (meta) {
      slide.addText(`设计规范：${meta}`, {
        x: 1.1, y: 4.75, w: 11.2, h: 0.5,
        fontSize: 14, color: theme.textMuted,
        fontFace, align: 'left', shrinkText: true,
      });
    }

    // 品牌水印
    slide.addText('🐾 猫猫 Agent 智能课件引擎生成', {
      x: 8.5, y: 7.0, w: 4.5, h: 0.35,
      fontSize: 10, color: theme.textMuted,
      fontFace, align: 'right',
    });
  }

  // ----------------------------------------------------------
  // 2. 目录页（双列现代阶梯卡片）
  // ----------------------------------------------------------
  private renderCatalog(
    slide: PptxGenJS.Slide,
    item: SlideItem,
    theme: ThemePalette,
    fontFace: string,
  ) {
    this.renderPageHeader(slide, item.title, '说课提纲', theme, fontFace);

    const points = item.points ?? [];
    if (points.length === 0) return;

    const count = points.length;
    const isDoubleCol = count >= 5;
    const cols = isDoubleCol ? 2 : 1;
    const rows = Math.ceil(count / cols);

    const startX = 0.8;
    const startY = 1.6;
    const cardW = isDoubleCol ? 5.65 : 11.5;
    const cardH = 0.72;
    const gapX = 0.45;
    const gapY = 0.16;

    points.forEach((point, i) => {
      const col = isDoubleCol ? Math.floor(i / rows) : 0;
      const row = isDoubleCol ? (i % rows) : i;
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);

      // 背景卡片
      slide.addShape('roundRect' as PptxGenJS.ShapeType, {
        x, y, w: cardW, h: cardH,
        fill: { color: theme.cardBg },
        line: { color: theme.borderColor, width: 0.8 },
        rectRadius: 0.08,
      });

      // 序号大圆标
      slide.addShape('ellipse' as PptxGenJS.ShapeType, {
        x: x + 0.15, y: y + 0.12, w: 0.48, h: 0.48,
        fill: { color: theme.primary },
        line: { type: 'none' },
      });
      slide.addText(`0${i + 1}`, {
        x: x + 0.15, y: y + 0.12, w: 0.48, h: 0.48,
        fontSize: 14, bold: true, color: 'FFFFFF',
        fontFace, align: 'center', valign: 'middle',
      });

      // 目录条目文本
      slide.addText(point, {
        x: x + 0.75, y, w: cardW - 0.9, h: cardH,
        fontSize: 18, bold: true, color: theme.textDark,
        fontFace, align: 'left', valign: 'middle', shrinkText: true,
      });
    });
  }

  // ----------------------------------------------------------
  // 3. 【高级版式】时间轴 / 步骤流版式 (Timeline)
  // ----------------------------------------------------------
  private renderTimeline(
    slide: PptxGenJS.Slide,
    item: SlideItem,
    theme: ThemePalette,
    fontFace: string,
  ) {
    this.renderPageHeader(slide, item.title, '教学环节流', theme, fontFace);

    const points = item.points ?? [];
    if (points.length === 0) return;

    const count = points.length;
    const startX = 0.7;
    const totalW = 11.93;
    const stepW = totalW / count;
    const axisY = 2.4; // 时间轴横线高度

    // 横向贯穿主轴线
    slide.addShape('rect' as PptxGenJS.ShapeType, {
      x: startX + 0.3, y: axisY, w: totalW - 0.6, h: 0.04,
      fill: { color: theme.accent },
      line: { type: 'none' },
    });

    points.forEach((point, i) => {
      const cx = startX + i * stepW + stepW / 2;

      // 步骤节点外光圈
      slide.addShape('ellipse' as PptxGenJS.ShapeType, {
        x: cx - 0.38, y: axisY - 0.36, w: 0.76, h: 0.76,
        fill: { color: theme.cardBgAlt },
        line: { color: theme.primary, width: 1.5 },
      });
      // 步骤节点中心实心球
      slide.addShape('ellipse' as PptxGenJS.ShapeType, {
        x: cx - 0.28, y: axisY - 0.26, w: 0.56, h: 0.56,
        fill: { color: theme.primary },
        line: { type: 'none' },
      });
      slide.addText(`${i + 1}`, {
        x: cx - 0.28, y: axisY - 0.26, w: 0.56, h: 0.56,
        fontSize: 16, bold: true, color: 'FFFFFF',
        fontFace, align: 'center', valign: 'middle',
      });

      // 步骤序号小标题
      slide.addText(`步骤 0${i + 1}`, {
        x: cx - 1.0, y: 1.55, w: 2.0, h: 0.4,
        fontSize: 13, bold: true, color: theme.primary,
        fontFace, align: 'center',
      });

      // 下方内容卡片
      const cardW = Math.min(stepW - 0.25, 3.2);
      const cardH = 3.6;
      const cardX = cx - cardW / 2;
      const cardY = 3.0;

      slide.addShape('roundRect' as PptxGenJS.ShapeType, {
        x: cardX, y: cardY, w: cardW, h: cardH,
        fill: { color: theme.cardBg },
        line: { color: theme.borderColor, width: 1.0 },
        rectRadius: 0.08,
      });

      // 顶部小强调条
      slide.addShape('rect' as PptxGenJS.ShapeType, {
        x: cardX, y: cardY, w: cardW, h: 0.08,
        fill: { color: theme.primary },
        line: { type: 'none' },
      });

      // 步骤内容文本
      slide.addText(point, {
        x: cardX + 0.15, y: cardY + 0.2, w: cardW - 0.3, h: cardH - 0.4,
        fontSize: 16, color: theme.textDark,
        fontFace, align: 'center', valign: 'middle',
        wrap: true, shrinkText: true,
      });
    });
  }

  // ----------------------------------------------------------
  // 4. 【高级版式】左右双栏强对比版式 (Compare)
  // ----------------------------------------------------------
  private renderCompare(
    slide: PptxGenJS.Slide,
    item: SlideItem,
    theme: ThemePalette,
    fontFace: string,
  ) {
    this.renderPageHeader(slide, item.title, '重点难点突破', theme, fontFace);

    const points = item.points ?? [];
    const mid = Math.ceil(points.length / 2);
    const leftPoints = points.slice(0, mid);
    const rightPoints = points.slice(mid);

    const colW = 5.5;
    const colH = 5.2;
    const startY = 1.55;
    const leftX = 0.8;
    const rightX = 7.03;

    // 左侧卡片（主色调：教学重点）
    slide.addShape('roundRect' as PptxGenJS.ShapeType, {
      x: leftX, y: startY, w: colW, h: colH,
      fill: { color: theme.cardBg },
      line: { color: theme.primary, width: 1.5 },
      rectRadius: 0.1,
    });
    // 左栏标头
    slide.addShape('roundRect' as PptxGenJS.ShapeType, {
      x: leftX, y: startY, w: colW, h: 0.75,
      fill: { color: theme.primary },
      line: { type: 'none' },
      rectRadius: 0.1,
    });
    slide.addText('🌟 核心重点与基础认知', {
      x: leftX, y: startY, w: colW, h: 0.75,
      fontSize: 18, bold: true, color: 'FFFFFF',
      fontFace, align: 'center', valign: 'middle',
    });

    leftPoints.forEach((p, idx) => {
      const itemY = startY + 0.95 + idx * 0.95;
      slide.addShape('ellipse' as PptxGenJS.ShapeType, {
        x: leftX + 0.3, y: itemY + 0.1, w: 0.28, h: 0.28,
        fill: { color: theme.primary },
        line: { type: 'none' },
      });
      slide.addText(p, {
        x: leftX + 0.7, y: itemY, w: colW - 0.9, h: 0.8,
        fontSize: 16, color: theme.textDark,
        fontFace, align: 'left', valign: 'middle', wrap: true, shrinkText: true,
      });
    });

    // 右侧卡片（强调色调：突破难点）
    slide.addShape('roundRect' as PptxGenJS.ShapeType, {
      x: rightX, y: startY, w: colW, h: colH,
      fill: { color: theme.cardBgAlt },
      line: { color: theme.accent, width: 1.5 },
      rectRadius: 0.1,
    });
    // 右栏标头
    slide.addShape('roundRect' as PptxGenJS.ShapeType, {
      x: rightX, y: startY, w: colW, h: 0.75,
      fill: { color: theme.accent },
      line: { type: 'none' },
      rectRadius: 0.1,
    });
    slide.addText('🔥 难点剖析与突破策略', {
      x: rightX, y: startY, w: colW, h: 0.75,
      fontSize: 18, bold: true, color: 'FFFFFF',
      fontFace, align: 'center', valign: 'middle',
    });

    rightPoints.forEach((p, idx) => {
      const itemY = startY + 0.95 + idx * 0.95;
      slide.addShape('ellipse' as PptxGenJS.ShapeType, {
        x: rightX + 0.3, y: itemY + 0.1, w: 0.28, h: 0.28,
        fill: { color: theme.accent },
        line: { type: 'none' },
      });
      slide.addText(p, {
        x: rightX + 0.7, y: itemY, w: colW - 0.9, h: 0.8,
        fontSize: 16, color: theme.textDark,
        fontFace, align: 'left', valign: 'middle', wrap: true, shrinkText: true,
      });
    });

    // 正中央悬浮 VS / 协同徽章
    const vsX = (13.33 - 0.8) / 2;
    const vsY = startY + colH / 2 - 0.4;
    slide.addShape('ellipse' as PptxGenJS.ShapeType, {
      x: vsX, y: vsY, w: 0.8, h: 0.8,
      fill: { color: theme.primary },
      line: { color: 'FFFFFF', width: 2.0 },
    });
    slide.addText('VS', {
      x: vsX, y: vsY, w: 0.8, h: 0.8,
      fontSize: 14, bold: true, color: 'FFFFFF',
      fontFace, align: 'center', valign: 'middle',
    });
  }

  // ----------------------------------------------------------
  // 5. 【高级版式】观点大字 / 焦点高亮版式 (Stat Highlight)
  // ----------------------------------------------------------
  private renderStat(
    slide: PptxGenJS.Slide,
    item: SlideItem,
    theme: ThemePalette,
    fontFace: string,
  ) {
    this.renderPageHeader(slide, item.title, '核心理念与目标', theme, fontFace);

    const points = item.points ?? [];
    const leftW = 4.2;
    const rightW = 7.1;
    const height = 5.2;
    const startY = 1.55;

    // 左侧大字焦点卡片（深色主色背景）
    slide.addShape('roundRect' as PptxGenJS.ShapeType, {
      x: 0.8, y: startY, w: leftW, h: height,
      fill: { color: theme.primary },
      line: { type: 'none' },
      rectRadius: 0.12,
    });
    // 左侧装饰小胶囊
    slide.addShape('roundRect' as PptxGenJS.ShapeType, {
      x: 1.1, y: startY + 0.4, w: 1.6, h: 0.4,
      fill: { color: theme.accent },
      line: { type: 'none' },
      rectRadius: 0.06,
    });
    slide.addText('CORE VALUE', {
      x: 1.1, y: startY + 0.4, w: 1.6, h: 0.4,
      fontSize: 10, bold: true, color: 'FFFFFF',
      fontFace, align: 'center', valign: 'middle',
    });
    // 左侧主观点大字
    slide.addText(item.subtitle || '落实核心素养\n深化探究学习', {
      x: 1.1, y: startY + 1.2, w: leftW - 0.6, h: 3.2,
      fontSize: 26, bold: true, color: 'FFFFFF',
      fontFace, align: 'left', valign: 'middle', wrap: true, shrinkText: true,
    });

    // 右侧要点列表小卡片
    const count = points.length;
    const cardH = (height - (count - 1) * 0.2) / count;

    points.forEach((point, i) => {
      const y = startY + i * (cardH + 0.2);
      slide.addShape('roundRect' as PptxGenJS.ShapeType, {
        x: 5.3, y, w: rightW, h: cardH,
        fill: { color: theme.cardBg },
        line: { color: theme.borderColor, width: 1.0 },
        rectRadius: 0.08,
      });
      // 左侧指示条
      slide.addShape('rect' as PptxGenJS.ShapeType, {
        x: 5.3, y: y + cardH * 0.2, w: 0.06, h: cardH * 0.6,
        fill: { color: theme.primary },
        line: { type: 'none' },
      });
      // 序号与内容
      slide.addText(`0${i + 1}.  ${point}`, {
        x: 5.6, y, w: rightW - 0.5, h: cardH,
        fontSize: 18, bold: true, color: theme.textDark,
        fontFace, align: 'left', valign: 'middle', wrap: true, shrinkText: true,
      });
    });
  }

  // ----------------------------------------------------------
  // 6. 【高级版式】2x2 四象限矩阵版式 (Matrix)
  // ----------------------------------------------------------
  private renderMatrix(
    slide: PptxGenJS.Slide,
    item: SlideItem,
    theme: ThemePalette,
    fontFace: string,
  ) {
    this.renderPageHeader(slide, item.title, '多维分析矩阵', theme, fontFace);

    const points = item.points ?? [];
    if (points.length === 0) return;

    const startX = 0.8;
    const startY = 1.55;
    const cardW = 5.65;
    const cardH = 2.45;
    const gapX = 0.43;
    const gapY = 0.25;

    const quadrantLabels = ['【维度 A · 认知维度】', '【维度 B · 能力进阶】', '【维度 C · 情感渗透】', '【维度 D · 评价反馈】'];

    points.slice(0, 4).forEach((point, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);

      // 矩阵卡片
      slide.addShape('roundRect' as PptxGenJS.ShapeType, {
        x, y, w: cardW, h: cardH,
        fill: { color: i % 2 === 0 ? theme.cardBg : theme.cardBgAlt },
        line: { color: theme.borderColor, width: 1.0 },
        rectRadius: 0.08,
      });

      // 顶部分类色条
      slide.addShape('rect' as PptxGenJS.ShapeType, {
        x, y, w: cardW, h: 0.45,
        fill: { color: i % 2 === 0 ? theme.primary : theme.accent },
        line: { type: 'none' },
      });
      slide.addText(quadrantLabels[i] || `象限 0${i + 1}`, {
        x: x + 0.2, y, w: cardW - 0.4, h: 0.45,
        fontSize: 13, bold: true, color: 'FFFFFF',
        fontFace, align: 'left', valign: 'middle',
      });

      // 核心内容
      slide.addText(point, {
        x: x + 0.25, y: y + 0.55, w: cardW - 0.5, h: cardH - 0.65,
        fontSize: 16, bold: true, color: theme.textDark,
        fontFace, align: 'left', valign: 'middle', wrap: true, shrinkText: true,
      });
    });
  }

  // ----------------------------------------------------------
  // 7. 经典多列网格版式 (Grid)
  // ----------------------------------------------------------
  private renderGrid(
    slide: PptxGenJS.Slide,
    item: SlideItem,
    theme: ThemePalette,
    fontFace: string,
  ) {
    this.renderPageHeader(slide, item.title, '要点分析', theme, fontFace);

    const points = item.points ?? [];
    if (points.length === 0) return;

    const count = points.length;
    let cols = 3;
    if (count <= 2) cols = 2;
    else if (count === 4) cols = 2;
    else if (count <= 6) cols = 3;
    else cols = 4;

    const rows = Math.ceil(count / cols);
    const startX = 0.8;
    const startY = 1.55;
    const totalW = 11.73;
    const totalH = 5.2;
    const gapX = 0.3;
    const gapY = 0.25;
    const cardW = (totalW - (cols - 1) * gapX) / cols;
    const cardH = (totalH - (rows - 1) * gapY) / rows;

    points.forEach((point, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);

      slide.addShape('roundRect' as PptxGenJS.ShapeType, {
        x, y, w: cardW, h: cardH,
        fill: { color: theme.cardBg },
        line: { color: theme.borderColor, width: 1.0 },
        rectRadius: 0.08,
      });

      slide.addShape('rect' as PptxGenJS.ShapeType, {
        x: x + 0.01, y: y + cardH * 0.18, w: 0.05, h: cardH * 0.64,
        fill: { color: theme.primary },
        line: { type: 'none' },
      });

      slide.addText(point, {
        x: x + 0.15, y, w: cardW - 0.25, h: cardH,
        fontSize: count <= 4 ? 18 : 15,
        color: theme.textDark,
        fontFace, align: 'left', valign: 'middle', wrap: true, shrinkText: true,
      });
    });
  }

  // ----------------------------------------------------------
  // 8. 板书设计页
  // ----------------------------------------------------------
  private renderBoard(
    slide: PptxGenJS.Slide,
    item: SlideItem,
    theme: ThemePalette,
    fontFace: string,
  ) {
    this.renderPageHeader(slide, item.title, '结构化板书脉络', theme, fontFace);

    const bannerW = 7.5;
    const bannerH = 0.85;
    const bannerX = (13.33 - bannerW) / 2;
    const bannerY = 1.45;

    // 核心主旨横幅
    slide.addShape('roundRect' as PptxGenJS.ShapeType, {
      x: bannerX, y: bannerY, w: bannerW, h: bannerH,
      fill: { color: theme.primary },
      line: { type: 'none' },
      rectRadius: 0.08,
    });
    slide.addText(`核心板书提纲：${item.subtitle || item.title}`, {
      x: bannerX, y: bannerY, w: bannerW, h: bannerH,
      fontSize: 20, bold: true, color: 'FFFFFF',
      fontFace, align: 'center', valign: 'middle', shrinkText: true,
    });

    const points = item.points ?? [];
    if (points.length === 0) return;

    const count = points.length;
    let cols = 3;
    if (count <= 2) cols = 2;
    else if (count === 4) cols = 2;
    else if (count <= 6) cols = 3;
    else cols = 4;

    const startX = 0.7;
    const startY = 2.65;
    const totalW = 11.93;
    const gapX = 0.25;
    const gapY = 0.22;
    const cardW = (totalW - (cols - 1) * gapX) / cols;
    const cardH = count <= 4 ? 2.0 : 1.8;

    points.forEach((point, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);

      slide.addShape('roundRect' as PptxGenJS.ShapeType, {
        x, y, w: cardW, h: cardH,
        fill: { color: theme.cardBg },
        line: { color: theme.borderColor, width: 1.0 },
        rectRadius: 0.08,
      });

      slide.addShape('rect' as PptxGenJS.ShapeType, {
        x, y, w: cardW, h: 0.38,
        fill: { color: theme.accent },
        line: { type: 'none' },
      });
      slide.addText(`板块 0${i + 1}`, {
        x, y, w: cardW, h: 0.38,
        fontSize: 12, bold: true, color: 'FFFFFF',
        fontFace, align: 'center', valign: 'middle',
      });

      slide.addText(point, {
        x: x + 0.15, y: y + 0.45, w: cardW - 0.3, h: cardH - 0.55,
        fontSize: 16, bold: true, color: theme.textDark,
        fontFace, align: 'center', valign: 'middle', wrap: true, shrinkText: true,
      });
    });
  }

  // ----------------------------------------------------------
  // 公共页头（浮动现代导航栏风格 + 标签）
  // ----------------------------------------------------------
  private renderPageHeader(
    slide: PptxGenJS.Slide,
    title: string,
    categoryTag: string,
    theme: ThemePalette,
    fontFace: string,
  ) {
    // 顶部全宽主色导航底栏
    slide.addShape('rect' as PptxGenJS.ShapeType, {
      x: 0, y: 0, w: 13.33, h: 1.25,
      fill: { color: theme.primary },
      line: { type: 'none' },
    });
    // 底部细金/装饰线条
    slide.addShape('rect' as PptxGenJS.ShapeType, {
      x: 0, y: 1.25, w: 13.33, h: 0.04,
      fill: { color: theme.accent },
      line: { type: 'none' },
    });

    // 环节小徽章
    slide.addShape('roundRect' as PptxGenJS.ShapeType, {
      x: 0.5, y: 0.38, w: 1.8, h: 0.5,
      fill: { color: 'FFFFFF' },
      line: { type: 'none' },
      rectRadius: 0.06,
    });
    slide.addText(categoryTag, {
      x: 0.5, y: 0.38, w: 1.8, h: 0.5,
      fontSize: 12, bold: true, color: theme.primary,
      fontFace, align: 'center', valign: 'middle',
    });

    // 页面大标题
    slide.addText(title || '', {
      x: 2.5, y: 0, w: 10.3, h: 1.25,
      fontSize: 26, bold: true, color: 'FFFFFF',
      fontFace, align: 'left', valign: 'middle', shrinkText: true,
    });
  }
}
