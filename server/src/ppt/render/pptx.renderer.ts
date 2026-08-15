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

// ============================================================
// 自适应卡片网格布局算法
// ============================================================
function computeCardLayout(count: number): {
  cols: number;
  rows: number;
  cardW: number;
  cardH: number;
  startX: number;
  startY: number;
  gapX: number;
  gapY: number;
} {
  // 内容区：宽 9.3"，高 4.1"（去掉顶部标题栏后）
  const areaW = 9.3;
  const areaH = 4.1;
  const startY = 1.42;
  const startX = 0.35;
  const gapX = 0.16;
  const gapY = 0.16;

  let cols = 1;
  let rows = 1;
  if (count <= 2) { cols = 2; rows = 1; }
  else if (count <= 3) { cols = 3; rows = 1; }
  else if (count <= 4) { cols = 2; rows = 2; }
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
    const pptx = new PptxGenJS();
    const theme = this.getTheme(dto.theme);

    pptx.layout = 'LAYOUT_WIDE'; // 13.33" x 7.5"（宽屏16:9）
    pptx.author = '猫猫 Agent 🐾';
    pptx.title = dto.lessonTitle;
    pptx.subject = `${dto.subject} ${dto.grade}`;

    for (const item of slides) {
      const slide = pptx.addSlide();

      // 注入演讲者逐字稿
      if (item.speakerNotes) {
        slide.addNotes(item.speakerNotes);
      }

      switch (item.type) {
        case 'cover':
          this.renderCover(slide, item, theme, dto);
          break;
        case 'catalog':
          this.renderCatalog(slide, item, theme);
          break;
        case 'board':
          this.renderBoard(slide, item, theme);
          break;
        default:
          this.renderContent(slide, item, theme);
      }
    }

    const arrayBuffer = await pptx.write({ outputType: 'arraybuffer' }) as ArrayBuffer;
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
    slide.addText(item.title, {
      x: 1.0, y: 1.8, w: 11.5, h: 1.5,
      fontSize: 44, bold: true,
      color: theme.textDark,
      fontFace: 'Microsoft YaHei',
      align: 'left',
      wrap: true,
    });

    // 副标题（学科 + 年级）
    const subTitle = item.subtitle || `${dto.subject}  ·  ${dto.grade}`;
    slide.addText(subTitle, {
      x: 1.0, y: 3.55, w: 11.5, h: 0.6,
      fontSize: 22, color: theme.primary,
      fontFace: 'Microsoft YaHei', align: 'left',
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
        fontFace: 'Microsoft YaHei', align: 'left',
      });
    }

    // 品牌水印（右下角）
    slide.addText('🐾 猫猫 Agent 生成', {
      x: 9.0, y: 7.0, w: 4.0, h: 0.35,
      fontSize: 10, color: theme.textMuted,
      fontFace: 'Microsoft YaHei', align: 'right',
    });
  }

  // ----------------------------------------------------------
  // 目录页
  // ----------------------------------------------------------
  private renderCatalog(
    slide: PptxGenJS.Slide,
    item: SlideItem,
    theme: ThemePalette,
  ) {
    this.renderPageHeader(slide, item.title, theme);

    const startX = 0.6;
    const startY = 1.55;
    const itemH = 0.75;
    const gap = 0.1;

    item.points.forEach((point, i) => {
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
        fontFace: 'Microsoft YaHei', align: 'center', valign: 'middle',
      });

      // 条目文字
      slide.addText(point, {
        x: startX + 0.7, y, w: 11.5, h: itemH,
        fontSize: 20, color: theme.textDark,
        fontFace: 'Microsoft YaHei', align: 'left', valign: 'middle',
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
  ) {
    this.renderPageHeader(slide, item.title, theme);

    if (item.subtitle) {
      slide.addText(item.subtitle, {
        x: 0.4, y: 1.15, w: 12.5, h: 0.35,
        fontSize: 14, color: theme.textMuted,
        fontFace: 'Microsoft YaHei', align: 'left',
      });
    }

    const { cols, cardW, cardH, startX, startY, gapX, gapY } =
      computeCardLayout(item.points.length);

    item.points.forEach((point, i) => {
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

      // 卡片文字
      slide.addText(point, {
        x: x + 0.12, y, w: cardW - 0.18, h: cardH,
        fontSize: item.points.length <= 3 ? 20 : 16,
        color: theme.textDark,
        fontFace: 'Microsoft YaHei',
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
  ) {
    this.renderPageHeader(slide, item.title, theme);

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
      fontFace: 'Microsoft YaHei', align: 'center', valign: 'middle',
    });

    // 辐射分支
    const n = item.points.length;
    const radius = 2.5;

    item.points.forEach((point, i) => {
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
        x: nx - 1.1, y: ny - 0.32, w: 2.2, h: 0.64,
        fill: { color: theme.cardBg },
        line: { color: theme.borderColor, width: 0.8 },
        rectRadius: 0.06,
      });
      slide.addText(point, {
        x: nx - 1.1, y: ny - 0.32, w: 2.2, h: 0.64,
        fontSize: 15, color: theme.textDark,
        fontFace: 'Microsoft YaHei', align: 'center', valign: 'middle', wrap: true,
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
    slide.addText(title, {
      x: 0.45, y: 0, w: 12.5, h: 1.2,
      fontSize: 28, bold: true, color: 'FFFFFF',
      fontFace: 'Microsoft YaHei', align: 'left', valign: 'middle',
    });
  }
}
