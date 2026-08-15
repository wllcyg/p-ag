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

// 字体优先使用中易黑体，找不到时由系统回退（pptx 本身不支持 CSS 式多字体
// 兜底列表，这里给一个"次优选项"，避免在缺少雅黑的环境上完全无字可用）
const FONT_FACE = 'Microsoft YaHei';
const FONT_FACE_FALLBACK = 'PingFang SC';

/** 判断当前渲染环境更可能是 mac/linux 服务器还是 windows，用于选择字体。
 *  没有可靠的运行时判定方式时，默认仍使用 Microsoft YaHei。
 */
function resolveFontFace(): string {
  try {
    if (typeof process !== 'undefined' && process.platform && process.platform !== 'win32') {
      return FONT_FACE_FALLBACK;
    }
  } catch {
    // ignore：非 Node 环境
  }
  return FONT_FACE;
}

// ============================================================
// 分页策略：每种版式单页可容纳的最大要点数（严格穷尽式类型定义）
// 超出的部分不再截断丢弃，而是在渲染前拆成"续页"
// ============================================================
const MAX_PER_PAGE: Record<SlideItem['type'], number> = {
  cover: 0,     // 封面：永不分页
  catalog: 7,   // 目录：固定 0.75" 行高，超过 7 条会挤出页面
  board: 8,     // 板书：辐射节点超过 8 个视觉上会互相压盖，拆成第二张辐射图
  material: 8,  // 教材分析：4x2 卡片上限，超过拆成续页
  student: 8,   // 学情分析：4x2 卡片上限
  method: 8,    // 教法学法：4x2 卡片上限
  process: 8,   // 教学过程：4x2 卡片上限
  summary: 8,   // 总结反思：4x2 卡片上限
};

/**
 * 把单个 SlideItem 按其类型的容量上限拆分成多个 SlideItem。
 * - cover 永远只有一页，不参与分页
 * - 第 2 页起标题自动加"（续 N）"后缀，副标题与演讲稿只保留在第一页，
 *   避免续页出现重复的副标题/逐字稿
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

/** 对整份幻灯片数组做分页展开，渲染循环只需要消费展开后的结果 */
function paginateSlides(slides: SlideItem[]): SlideItem[] {
  return slides.flatMap((item) => paginateSlide(item));
}

// ============================================================
// 卡片网格布局算法（单页最多 8 条要点，超出部分已在分页阶段拆走）
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
  // 内容区：宽 12.6"，高 5.4"（去掉顶部标题栏后）
  const areaW = 12.6;
  const areaH = 5.4;
  const startY = 1.42;
  const startX = 0.35;
  const gapX = 0.16;
  const gapY = 0.16;

  let cols: number;
  let rows: number;

  if (count <= 1) { cols = 1; rows = 1; }
  else if (count === 2) { cols = 2; rows = 1; }
  else if (count === 3) { cols = 3; rows = 1; }
  else if (count === 4) { cols = 2; rows = 2; }
  else if (count <= 6) { cols = 3; rows = 2; }
  else { cols = 4; rows = 2; } // 最多 8 张（超出的在分页阶段已拆成续页）

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

    // 分页：任何一页要点数超过该版式容量上限时，拆成多张"续"页，
    // 而不是让下面的渲染逻辑去处理"数量不可控"的溢出情况
    const paginatedSlides = paginateSlides(slides);

    for (const item of paginatedSlides) {
      const slide = pptx.addSlide();

      // 注入演讲者逐字稿
      if (item.speakerNotes) {
        slide.addNotes(item.speakerNotes);
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
  // 封面页
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

    // 主标题（标题过长时自动缩字，避免溢出到右边界之外）
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

    // 分割线
    slide.addShape('line' as PptxGenJS.ShapeType, {
      x: 1.0, y: 4.3, w: 10.5, h: 0,
      line: { color: theme.borderColor, width: 1.2 },
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

    // 品牌水印（右下角）
    slide.addText('🐾 猫猫 Agent 生成', {
      x: 9.0, y: 7.0, w: 4.0, h: 0.35,
      fontSize: 10, color: theme.textMuted,
      fontFace, align: 'right',
    });
  }

  // ----------------------------------------------------------
  // 目录页（容量上限已由分页阶段保证，这里只负责固定布局渲染）
  // ----------------------------------------------------------
  private renderCatalog(
    slide: PptxGenJS.Slide,
    item: SlideItem,
    theme: ThemePalette,
    fontFace: string,
  ) {
    this.renderPageHeader(slide, item.title, theme, fontFace);

    // 分页阶段已保证 points.length <= MAX_PER_PAGE.catalog（7 条），
    // 这里用固定行高即可，不需要再动态压缩字号
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
  // 正文内容页（material / student / method / process / summary）
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

    // 分页阶段已保证 points.length <= MAX_PER_PAGE.content（8 条）
    const points = item.points ?? [];
    if (points.length === 0) return;

    const { cols, cardW, cardH, startX, startY, gapX, gapY } = computeCardLayout(points.length);

    points.forEach((point, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);

      // 卡片背景（圆角矩形）
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

      // 卡片文字（要点越多，字号越小，避免文字被截断或溢出卡片；
      // 分页阶段已保证 points.length <= 8）
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
  // 板书设计页（辐射结构图）
  // ----------------------------------------------------------
  private renderBoard(
    slide: PptxGenJS.Slide,
    item: SlideItem,
    theme: ThemePalette,
    fontFace: string,
  ) {
    this.renderPageHeader(slide, item.title, theme, fontFace);

    // 16:9 WIDE 布局中心点
    const cx = 6.67;
    const cy = 4.5;

    // 中心主题框
    slide.addShape('roundRect' as PptxGenJS.ShapeType, {
      x: cx - 1.4, y: cy - 0.45, w: 2.8, h: 0.9,
      fill: { color: theme.primary },
      line: { type: 'none' },
      rectRadius: 0.1,
    });
    slide.addText(item.subtitle || item.title, {
      x: cx - 1.4, y: cy - 0.45, w: 2.8, h: 0.9,
      fontSize: 18, bold: true, color: 'FFFFFF',
      fontFace, align: 'center', valign: 'middle',
      shrinkText: true,
    });

    // 分页阶段已保证 points.length <= MAX_PER_PAGE.board（8 条）
    const points = item.points ?? [];
    const n = points.length;

    // 没有分支要点时，仅展示中心主题框，不再继续计算角度（避免除零）
    if (n === 0) return;

    // 要点越多，半径适当加大、节点适当缩小，避免节点互相重叠
    const radius = n <= 6 ? 2.5 : 2.9;
    const nodeW = n <= 6 ? 2.2 : 1.9;
    const nodeH = n <= 6 ? 0.64 : 0.56;
    const fontSize = n <= 6 ? 15 : 12;

    points.forEach((point, i) => {
      const angle = ((2 * Math.PI) / n) * i - Math.PI / 2;
      const nx = cx + radius * Math.cos(angle);
      const ny = cy + radius * Math.sin(angle);

      // 连线（用 line 形状代替 connector）
      slide.addShape('line' as PptxGenJS.ShapeType, {
        x: cx, y: cy, w: nx - cx, h: ny - cy,
        line: { color: theme.accent, width: 1.0 },
      });

      // 分支节点
      slide.addShape('roundRect' as PptxGenJS.ShapeType, {
        x: nx - nodeW / 2, y: ny - nodeH / 2, w: nodeW, h: nodeH,
        fill: { color: theme.cardBg },
        line: { color: theme.borderColor, width: 0.8 },
        rectRadius: 0.06,
      });
      slide.addText(point, {
        x: nx - nodeW / 2, y: ny - nodeH / 2, w: nodeW, h: nodeH,
        fontSize, color: theme.textDark,
        fontFace, align: 'center', valign: 'middle',
        wrap: true, shrinkText: true,
      });
    });
  }

  // ----------------------------------------------------------
  // 公共页头（主色顶栏 + 标题）
  // ----------------------------------------------------------
  private renderPageHeader(
    slide: PptxGenJS.Slide,
    title: string,
    theme: ThemePalette,
    fontFace: string,
  ) {
    // 顶部主色标题栏（全宽 13.33"）
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
