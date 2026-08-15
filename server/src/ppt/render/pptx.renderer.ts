import PptxGenJS from 'pptxgenjs';
import { SlideItem, GeneratePptDto } from '../types/state';

// ============================================================
// 主题配色方案
// ============================================================
export interface ThemePalette {
  name: string;
  primary: string;
  accent: string;
  background: string;
  cardBg: string;
  textDark: string;
  textMuted: string;
  borderColor: string;
}

export const THEME_PALETTES: Record<string, ThemePalette> = {
  'cat-purple': {
    name: '灵动猫猫紫',
    primary: '7C3AED',
    accent: 'A78BFA',
    background: 'FAFAFA',
    cardBg: 'F5F3FF',
    textDark: '1F1635',
    textMuted: '6B7280',
    borderColor: 'DDD6FE',
  },
  'tech-blue': {
    name: '极简科技蓝',
    primary: '2563EB',
    accent: '60A5FA',
    background: 'F8FAFF',
    cardBg: 'EFF6FF',
    textDark: '1E3A5F',
    textMuted: '64748B',
    borderColor: 'BFDBFE',
  },
  'fresh-mint': {
    name: '清爽自然绿',
    primary: '059669',
    accent: '34D399',
    background: 'F8FFFC',
    cardBg: 'ECFDF5',
    textDark: '064E3B',
    textMuted: '6B7280',
    borderColor: 'A7F3D0',
  },
  'academic-red': {
    name: '典雅学术红',
    primary: 'DC2626',
    accent: 'F87171',
    background: 'FFFAFA',
    cardBg: 'FEF2F2',
    textDark: '450A0A',
    textMuted: '6B7280',
    borderColor: 'FECACA',
  },
};

const DEFAULT_THEME = 'cat-purple';

// 字体优先使用中易黑体，跨平台安全回退
const FONT_FACE = 'Microsoft YaHei';
const FONT_FACE_FALLBACK = 'PingFang SC';

function resolveFontFace(): string {
  try {
    if (typeof process !== 'undefined' && process.platform && process.platform !== 'win32') {
      return FONT_FACE_FALLBACK;
    }
  } catch {
    // 非 Node 环境
  }
  return FONT_FACE;
}

// ============================================================
// 分页策略：每种版式单页可容纳的最大要点数（严格穷尽式类型定义）
// ============================================================
const MAX_PER_PAGE: Record<SlideItem['type'], number> = {
  cover: 0,     // 封面：永不分页
  catalog: 7,   // 目录：固定 0.75" 行高
  board: 8,     // 板书：最多 8 个结构卡片
  material: 8,  // 教材分析：4x2 卡片上限
  student: 8,   // 学情分析：4x2 卡片上限
  method: 8,    // 教法学法：4x2 卡片上限
  process: 8,   // 教学过程：4x2 卡片上限
  summary: 8,   // 总结反思：4x2 卡片上限
};

/**
 * 把单个 SlideItem 按容量上限拆分成多个 SlideItem（避免溢出）
 */
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
// 卡片网格布局算法
// ============================================================
interface CardLayout {
  cols: number;
  rows: number;
  cardW: number;
  cardH: number;
  startX: number;
  startY: number;
  gapX: number;
  gapY: number;
}

function computeCardLayout(count: number): CardLayout {
  const areaW = 12.6;
  const areaH = 5.4;
  const startY = 1.45;
  const startX = 0.35;
  const gapX = 0.18;
  const gapY = 0.18;

  let cols: number;
  let rows: number;

  if (count <= 1) { cols = 1; rows = 1; }
  else if (count === 2) { cols = 2; rows = 1; }
  else if (count === 3) { cols = 3; rows = 1; }
  else if (count === 4) { cols = 2; rows = 2; }
  else if (count <= 6) { cols = 3; rows = 2; }
  else { cols = 4; rows = 2; }

  const cardW = (areaW - (cols - 1) * gapX) / cols;
  const cardH = (areaH - (rows - 1) * gapY) / rows;

  return { cols, rows, cardW, cardH, startX, startY, gapX, gapY };
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

    pptx.layout = 'LAYOUT_WIDE'; // 13.33" x 7.5"（宽屏16:9）
    pptx.author = '猫猫 Agent 🐾';
    pptx.title = dto.lessonTitle ?? '未命名课件';
    pptx.subject = `${dto.subject ?? ''} ${dto.grade ?? ''}`.trim();

    // 分页展开
    const paginatedSlides = paginateSlides(slides);

    for (const item of paginatedSlides) {
      const slide = pptx.addSlide();

      // 注入演讲者逐字稿（确保为 string 且去除多余空白）
      if (item.speakerNotes && typeof item.speakerNotes === 'string') {
        slide.addNotes(item.speakerNotes.trim());
      }

      switch (item.type) {
        case 'cover':
          this.renderCover(slide, item, theme, dto, fontFace);
          break;
        case 'catalog':
          this.renderCatalog(slide, item, theme, fontFace);
          break;
        case 'board':
          this.renderBoard(slide, item, theme, fontFace);
          break;
        default:
          this.renderContent(slide, item, theme, fontFace);
      }
    }

    const arrayBuffer = (await pptx.write({ outputType: 'arraybuffer' })) as ArrayBuffer;
    return Buffer.from(arrayBuffer);
  }

  // ----------------------------------------------------------
  // 封面页（100% 遵守 OpenXML 规范，杜绝 h:0 的 line 形状）
  // ----------------------------------------------------------
  private renderCover(
    slide: PptxGenJS.Slide,
    item: SlideItem,
    theme: ThemePalette,
    dto: GeneratePptDto,
    fontFace: string,
  ) {
    // 左侧主色竖条
    slide.addShape('rect' as PptxGenJS.ShapeType, {
      x: 0, y: 0, w: 0.55, h: 7.5,
      fill: { color: theme.primary },
      line: { type: 'none' },
    });
    // 细装饰条
    slide.addShape('rect' as PptxGenJS.ShapeType, {
      x: 0.55, y: 0, w: 0.1, h: 7.5,
      fill: { color: theme.accent },
      line: { type: 'none' },
    });

    // 主标题
    slide.addText(item.title || dto.lessonTitle || '', {
      x: 1.0, y: 1.8, w: 11.5, h: 1.5,
      fontSize: 44, bold: true,
      color: theme.textDark,
      fontFace,
      align: 'left',
      wrap: true,
      shrinkText: true,
    });

    // 副标题（学科 + 年级）
    const subTitle = item.subtitle || `${dto.subject ?? ''}  ·  ${dto.grade ?? ''}`;
    slide.addText(subTitle, {
      x: 1.0, y: 3.55, w: 11.5, h: 0.6,
      fontSize: 22, color: theme.primary,
      fontFace, align: 'left',
      shrinkText: true,
    });

    // 分割线（使用细长矩形代替 h:0 的 line，彻底解决 Office 报错）
    slide.addShape('rect' as PptxGenJS.ShapeType, {
      x: 1.0, y: 4.3, w: 10.5, h: 0.025,
      fill: { color: theme.borderColor },
      line: { type: 'none' },
    });

    // 元信息
    const meta = [dto.textbookVersion, dto.extraRequirement].filter(Boolean).join('  |  ');
    if (meta) {
      slide.addText(meta, {
        x: 1.0, y: 4.6, w: 11.5, h: 0.5,
        fontSize: 14, color: theme.textMuted,
        fontFace, align: 'left',
        shrinkText: true,
      });
    }

    // 品牌水印
    slide.addText('🐾 猫猫 Agent 生成', {
      x: 9.0, y: 7.0, w: 4.0, h: 0.35,
      fontSize: 10, color: theme.textMuted,
      fontFace, align: 'right',
    });
  }

  // ----------------------------------------------------------
  // 目录页
  // ----------------------------------------------------------
  private renderCatalog(
    slide: PptxGenJS.Slide,
    item: SlideItem,
    theme: ThemePalette,
    fontFace: string,
  ) {
    this.renderPageHeader(slide, item.title, theme, fontFace);

    const points = item.points ?? [];
    if (points.length === 0) return;

    const startX = 0.6;
    const startY = 1.55;
    const itemH = 0.75;
    const gap = 0.1;

    points.forEach((point, i) => {
      const y = startY + i * (itemH + gap);

      // 序号圆形气泡
      slide.addShape('ellipse' as PptxGenJS.ShapeType, {
        x: startX, y: y + 0.1, w: 0.5, h: 0.5,
        fill: { color: theme.primary },
        line: { type: 'none' },
      });
      slide.addText(`${i + 1}`, {
        x: startX, y: y + 0.1, w: 0.5, h: 0.5,
        fontSize: 16, bold: true, color: 'FFFFFF',
        fontFace, align: 'center', valign: 'middle',
      });

      // 条目文字
      slide.addText(point, {
        x: startX + 0.7, y, w: 11.5, h: itemH,
        fontSize: 20, color: theme.textDark,
        fontFace, align: 'left', valign: 'middle',
        wrap: true, shrinkText: true,
      });
    });
  }

  // ----------------------------------------------------------
  // 正文内容页
  // ----------------------------------------------------------
  private renderContent(
    slide: PptxGenJS.Slide,
    item: SlideItem,
    theme: ThemePalette,
    fontFace: string,
  ) {
    this.renderPageHeader(slide, item.title, theme, fontFace);

    if (item.subtitle) {
      slide.addText(item.subtitle, {
        x: 0.4, y: 1.15, w: 12.5, h: 0.35,
        fontSize: 14, color: theme.textMuted,
        fontFace, align: 'left',
        shrinkText: true,
      });
    }

    const points = item.points ?? [];
    if (points.length === 0) return;

    const { cols, cardW, cardH, startX, startY, gapX, gapY } = computeCardLayout(points.length);

    points.forEach((point, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);

      // 卡片背景
      slide.addShape('roundRect' as PptxGenJS.ShapeType, {
        x, y, w: cardW, h: cardH,
        fill: { color: theme.cardBg },
        line: { color: theme.borderColor, width: 0.8 },
        rectRadius: 0.06,
      });

      // 左侧强调竖条
      slide.addShape('rect' as PptxGenJS.ShapeType, {
        x: x + 0.01, y: y + cardH * 0.18, w: 0.04, h: cardH * 0.64,
        fill: { color: theme.primary },
        line: { type: 'none' },
      });

      // 卡片文字
      const fontSize = points.length <= 3 ? 20 : points.length <= 6 ? 16 : 14;
      slide.addText(point, {
        x: x + 0.12, y, w: cardW - 0.18, h: cardH,
        fontSize,
        color: theme.textDark,
        fontFace,
        align: 'left', valign: 'middle',
        wrap: true, shrinkText: true,
      });
    });
  }

  // ----------------------------------------------------------
  // 板书设计页（现代化层级脉络结构卡片，彻底避免任何负坐标）
  // ----------------------------------------------------------
  private renderBoard(
    slide: PptxGenJS.Slide,
    item: SlideItem,
    theme: ThemePalette,
    fontFace: string,
  ) {
    this.renderPageHeader(slide, item.title, theme, fontFace);

    // 顶部板书核心主题横幅
    const bannerW = 6.8;
    const bannerH = 0.85;
    const bannerX = (13.33 - bannerW) / 2;
    const bannerY = 1.45;

    slide.addShape('roundRect' as PptxGenJS.ShapeType, {
      x: bannerX, y: bannerY, w: bannerW, h: bannerH,
      fill: { color: theme.primary },
      line: { type: 'none' },
      rectRadius: 0.08,
    });
    slide.addText(`核心板书：${item.subtitle || item.title}`, {
      x: bannerX, y: bannerY, w: bannerW, h: bannerH,
      fontSize: 20, bold: true, color: 'FFFFFF',
      fontFace, align: 'center', valign: 'middle',
      shrinkText: true,
    });

    const points = item.points ?? [];
    if (points.length === 0) return;

    // 下方结构化网格卡片（2~3 列对称排布）
    const count = points.length;
    let cols = 3;
    if (count <= 2) cols = 2;
    else if (count === 4) cols = 2;
    else if (count <= 6) cols = 3;
    else cols = 4;

    const startX = 0.65;
    const startY = 2.65;
    const totalW = 12.03;
    const gapX = 0.22;
    const gapY = 0.22;
    const cardW = (totalW - (cols - 1) * gapX) / cols;
    const cardH = count <= 4 ? 2.0 : 1.8;

    points.forEach((point, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);

      // 板书知识节点卡片
      slide.addShape('roundRect' as PptxGenJS.ShapeType, {
        x, y, w: cardW, h: cardH,
        fill: { color: theme.cardBg },
        line: { color: theme.borderColor, width: 1.0 },
        rectRadius: 0.08,
      });

      // 顶部节点序号条
      slide.addShape('rect' as PptxGenJS.ShapeType, {
        x, y, w: cardW, h: 0.38,
        fill: { color: theme.accent },
        line: { type: 'none' },
      });
      slide.addText(`板块 ${i + 1}`, {
        x, y, w: cardW, h: 0.38,
        fontSize: 12, bold: true, color: 'FFFFFF',
        fontFace, align: 'center', valign: 'middle',
      });

      // 板书要点内容
      slide.addText(point, {
        x: x + 0.15, y: y + 0.45, w: cardW - 0.3, h: cardH - 0.55,
        fontSize: 16, bold: true,
        color: theme.textDark,
        fontFace, align: 'center', valign: 'middle',
        wrap: true, shrinkText: true,
      });
    });
  }

  // ----------------------------------------------------------
  // 公共页头
  // ----------------------------------------------------------
  private renderPageHeader(
    slide: PptxGenJS.Slide,
    title: string,
    theme: ThemePalette,
    fontFace: string,
  ) {
    // 顶部主色标题栏
    slide.addShape('rect' as PptxGenJS.ShapeType, {
      x: 0, y: 0, w: 13.33, h: 1.2,
      fill: { color: theme.primary },
      line: { type: 'none' },
    });
    // 装饰细线
    slide.addShape('rect' as PptxGenJS.ShapeType, {
      x: 0, y: 1.2, w: 13.33, h: 0.05,
      fill: { color: theme.accent },
      line: { type: 'none' },
    });
    slide.addText(title || '', {
      x: 0.45, y: 0, w: 12.5, h: 1.2,
      fontSize: 28, bold: true, color: 'FFFFFF',
      fontFace, align: 'left', valign: 'middle',
      shrinkText: true,
    });
  }
}
