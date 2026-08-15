<script setup lang="ts">
import { ref } from 'vue';
import { usePptGeneratorStore } from '../stores/pptGenerator';
import { useAuthStore } from '../stores/auth';
import {
  Download,
  Mic,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
} from 'lucide-vue-next';

const store = usePptGeneratorStore();
const authStore = useAuthStore();

// 控制每张卡片演讲稿的展开/折叠（默认全展开）
const expandedNotes = ref<Record<number, boolean>>({});

function toggleNote(idx: number) {
  expandedNotes.value[idx] = !isNoteExpanded(idx);
}

function isNoteExpanded(idx: number): boolean {
  return expandedNotes.value[idx] !== false; // 默认展开
}

/**
 * 触发 PPTX 文件下载
 */
async function handleDownload() {
  if (!store.downloadUrl) return;

  const token = authStore.getAccessToken();
  try {
    const res = await fetch(store.downloadUrl, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) throw new Error('下载文件失败');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${store.formData.lessonTitle || '猫猫Agent说课课件'}.pptx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    console.error('下载 PPTX 异常:', err);
    alert('下载文件失败，请稍后重试');
  }
}

// 页面类型中文映射
const typeMap: Record<string, string> = {
  cover: '封面页',
  catalog: '说课提纲',
  material: '教材分析',
  student: '学情分析',
  method: '教法学法',
  process: '教学过程',
  board: '板书设计',
  summary: '总结反思',
};
</script>

<template>
  <div class="preview-container">
    <!-- 顶部操作横栏 -->
    <div class="preview-toolbar">
      <div class="toolbar-left">
        <div class="title-with-badge">
          <h2>幻灯片与逐字稿预览</h2>
          <span class="count-badge">共 {{ store.slides.length }} 页</span>
        </div>
        <p class="toolbar-sub">已完成排版算法计算与质量规则质检，每页均已注入专属演讲台词</p>
      </div>

      <div class="toolbar-actions">
        <button type="button" class="btn-secondary" @click="store.reset">
          <RotateCcw class="btn-icon" />
          <span>重新生成</span>
        </button>

        <button
          type="button"
          class="btn-primary"
          :disabled="!store.downloadUrl"
          @click="handleDownload"
        >
          <Download class="btn-icon" />
          <span>一键下载 PPTX 课件 🐾</span>
        </button>
      </div>
    </div>

    <!-- 幻灯片卡片列表 -->
    <div class="slides-grid">
      <div
        v-for="slide in store.slides"
        :key="slide.pageIndex"
        class="slide-card"
      >
        <!-- 幻灯片头部 -->
        <div class="slide-card-header">
          <div class="header-tag-row">
            <span class="page-badge">第 {{ slide.pageIndex }} 页</span>
            <span class="type-tag">{{ typeMap[slide.type] || slide.type }}</span>
          </div>
          <h3 class="slide-title">{{ slide.title }}</h3>
          <span v-if="slide.subtitle" class="slide-subtitle">{{ slide.subtitle }}</span>
        </div>

        <!-- 幻灯片要点展示区 -->
        <div class="slide-points-body">
          <div v-if="slide.points && slide.points.length > 0" class="points-list">
            <div
              v-for="(pt, pIdx) in slide.points"
              :key="pIdx"
              class="point-chip"
            >
              <span class="point-index">{{ pIdx + 1 }}</span>
              <span class="point-text">{{ pt }}</span>
            </div>
          </div>
          <div v-else-if="slide.type === 'cover'" class="cover-placeholder">
            <Sparkles class="cover-icon" />
            <span>主标题封面排版 · 自动适配宽屏母版</span>
          </div>
        </div>

        <!-- 演讲者逐字稿区域 (Speaker Notes) -->
        <div class="speaker-notes-section">
          <div class="notes-header" @click="toggleNote(slide.pageIndex)">
            <div class="notes-title">
              <Mic class="mic-icon" />
              <span>🎤 演讲者逐字稿 (Speaker Notes)</span>
              <span class="words-count">（{{ slide.speakerNotes?.length || 0 }} 字）</span>
            </div>
            <component
              :is="isNoteExpanded(slide.pageIndex) ? ChevronUp : ChevronDown"
              class="chevron-icon"
            />
          </div>

          <div v-show="isNoteExpanded(slide.pageIndex)" class="notes-content">
            <p>{{ slide.speakerNotes || '暂无逐字稿' }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* 顶部操作栏 */
.preview-toolbar {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 1.25rem 1.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px -2px rgba(0, 0, 0, 0.04);
}

.title-with-badge {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.title-with-badge h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.count-badge {
  padding: 2px 8px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #2563eb;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.toolbar-sub {
  font-size: 0.85rem;
  color: #64748b;
  margin: 0.25rem 0 0 0;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1rem;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-secondary:hover {
  background: #f8fafc;
  color: #0f172a;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 1.25rem;
  background: #7c3aed;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
}

.btn-primary:hover:not(:disabled) {
  background: #6d28d9;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

/* 幻灯片卡片网格 */
.slides-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 1.25rem;
}

.slide-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 2px 8px -2px rgba(0, 0, 0, 0.04);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.slide-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px -4px rgba(0, 0, 0, 0.08);
}

/* 卡片页头 */
.slide-card-header {
  padding: 1rem 1.25rem;
  background: #f8fafc;
  border-bottom: 1px solid #f1f5f9;
}

.header-tag-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}

.page-badge {
  font-size: 0.7rem;
  font-weight: 700;
  color: #7c3aed;
  background: #f5f3ff;
  padding: 1px 6px;
  border-radius: 4px;
}

.type-tag {
  font-size: 0.7rem;
  color: #64748b;
  background: #e2e8f0;
  padding: 1px 6px;
  border-radius: 4px;
}

.slide-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 0.2rem 0;
}

.slide-subtitle {
  font-size: 0.8rem;
  color: #64748b;
}

/* 要点列表区 */
.slide-points-body {
  padding: 1.1rem 1.25rem;
  flex: 1;
  background: #ffffff;
}

.points-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.point-chip {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 6px;
}

.point-index {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ede9fe;
  color: #7c3aed;
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.point-text {
  font-size: 0.875rem;
  color: #1e293b;
}

.cover-placeholder {
  height: 90px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #94a3b8;
  background: #fafafa;
  border-radius: 6px;
}

.cover-icon {
  width: 20px;
  height: 20px;
  color: #a78bfa;
}

/* 演讲者逐字稿抽屉 */
.speaker-notes-section {
  border-top: 1px solid #f1f5f9;
  background: #fcfcfd;
}

.notes-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 1.25rem;
  cursor: pointer;
  background: #fdfefe;
}

.notes-header:hover {
  background: #f8fafc;
}

.notes-title {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #475569;
}

.mic-icon {
  width: 13px;
  height: 13px;
  color: #f59e0b;
}

.words-count {
  font-size: 0.7rem;
  color: #94a3b8;
  font-weight: normal;
}

.chevron-icon {
  width: 14px;
  height: 14px;
  color: #94a3b8;
}

.notes-content {
  padding: 0.75rem 1.25rem 1rem 1.25rem;
  border-top: 1px dashed #e2e8f0;
}

.notes-content p {
  margin: 0;
  font-size: 0.825rem;
  color: #334155;
  line-height: 1.6;
}

@media (max-width: 640px) {
  .preview-toolbar {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  .toolbar-actions {
    width: 100%;
  }
  .btn-primary, .btn-secondary {
    flex: 1;
    justify-content: center;
  }
}
</style>
