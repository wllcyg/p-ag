/**
 * 快速渲染测试脚本（独立运行，无需启动 NestJS）
 * 运行方式：node --loader ts-node/esm test-render.ts
 * 或：pnpm ts-node src/ppt/render/test-render.ts
 */
import { PptRenderService } from './pptx.renderer';
import { SlideItem, GeneratePptDto } from '../types/state';
import * as fs from 'fs';
import * as path from 'path';

const dto: GeneratePptDto = {
  subject: '语文',
  grade: '初中八年级',
  lessonTitle: '《背影》说课稿',
  textbookVersion: '人教版',
  theme: 'cat-purple',
};

const slides: SlideItem[] = [
  {
    pageIndex: 1,
    type: 'cover',
    title: '《背影》说课稿',
    subtitle: '朱自清 · 人教版语文 八年级上册',
    points: [],
    speakerNotes: '各位评委老师好，我说课的题目是朱自清的《背影》，这是人教版八年级上册第四单元的一篇经典散文，下面我将从以下几个方面展开说课。',
  },
  {
    pageIndex: 2,
    type: 'catalog',
    title: '说课提纲',
    points: [
      '一、教材分析',
      '二、学情分析',
      '三、教学目标与重难点',
      '四、教法与学法',
      '五、教学过程',
      '六、板书设计',
    ],
    speakerNotes: '本次说课共分六个部分：教材分析、学情分析、教学目标与重难点、教法学法、教学过程以及板书设计，下面依次展开。',
  },
  {
    pageIndex: 3,
    type: 'material',
    title: '教材分析',
    subtitle: '课文地位与教学价值',
    points: [
      '散文名篇，情真意切',
      '以小见大，父子深情',
      '语言朴素，感染力强',
      '承接记叙，过渡抒情',
    ],
    speakerNotes: '《背影》是朱自清创作于1925年的散文名篇，以朴实无华的语言记叙了父亲送行时的感人场景，是体会"以小见大"写作手法的典型范例，在本单元处于核心地位。',
  },
  {
    pageIndex: 4,
    type: 'process',
    title: '教学过程：整体感知',
    subtitle: '第一环节（约8分钟）',
    points: [
      '创设情境，导入新课',
      '初读课文，整体把握',
      '梳理结构，理清脉络',
    ],
    speakerNotes: '在整体感知环节，我将播放一段轻音乐，请学生有感情地朗读课文，在朗读中初步感受父子之情，并引导学生梳理文章的行文脉络，明确文章以"背影"为线索串联全文。',
  },
  {
    pageIndex: 5,
    type: 'board',
    title: '板书设计',
    subtitle: '《背影》',
    points: [
      '父爱如山',
      '背影（线索）',
      '车站送别',
      '买橘场景',
      '父子深情',
      '朴素语言',
    ],
    speakerNotes: '我的板书设计以"背影"为核心，向外辐射出文章的主要意象与情感脉络，简洁直观，便于学生理解文章的整体结构与情感主旨。',
  },
  {
    pageIndex: 6,
    type: 'summary',
    title: '教学反思与预期收益',
    points: [
      '感受散文朴素之美',
      '体悟父子真挚情感',
      '习得以小见大手法',
      '提升朗读与鉴赏力',
    ],
    speakerNotes: '通过本课学习，学生能感受朱自清朴素细腻的语言风格，体悟父子之间真挚深沉的情感，并学习以日常细节表现深刻情感的写作技巧，以上就是我的说课，请各位评委批评指正。',
  },
];

async function main() {
  const service = new PptRenderService();
  console.log('🐾 开始渲染测试 PPT...');

  const buffer = await service.render(slides, dto);

  const outPath = path.join(__dirname, 'test-output.pptx');
  fs.writeFileSync(outPath, buffer);

  console.log(`✅ 渲染成功！文件已保存至：${outPath}`);
  console.log(`   文件大小：${(buffer.length / 1024).toFixed(1)} KB`);
}

main().catch(console.error);
