<script setup lang="ts">
import { usePptGeneratorStore } from '../stores/pptGenerator';
import type { ThemeType } from '../types/ppt';
import {
  Sparkles,
  BookOpen,
  GraduationCap,
  FileText,
  Palette,
  Check,
  Flame,
  Wand2,
} from 'lucide-vue-next';

const store = usePptGeneratorStore();

// 快速示例课题
const quickSamples = [
  { subject: '语文', grade: '初中八年级', title: '朱自清《背影》说课稿', version: '人教版' },
  { subject: '数学', grade: '高中一年级', title: '《函数的单调性》概念与应用', version: '人教A版' },
  { subject: '物理', grade: '高中二年级', title: '《牛顿第二定律》探究与推导', version: '苏教版' },
  { subject: '英语', grade: '初中七年级', title: 'Unit 5 Why do you like pandas?', version: '人教新目标' },
];

function applySample(sample: typeof quickSamples[0]) {
  store.formData.subject = sample.subject;
  store.formData.grade = sample.grade;
  store.formData.lessonTitle = sample.title;
  store.formData.textbookVersion = sample.version;
}

const themeOptions: { key: ThemeType; name: string; primary: string; desc: string }[] = [
  {
    key: 'cat-purple',
    name: '灵动猫猫紫',
    primary: '#7c3aed',
    desc: '文科 / 创意 / 教学比赛',
  },
  {
    key: 'tech-blue',
    name: '极简科技蓝',
    primary: '#2563eb',
    desc: '理科 / 商务 / 通用公开课',
  },
  {
    key: 'fresh-mint',
    name: '清爽自然绿',
    primary: '#059669',
    desc: '生物 / 地理 / 自然科学',
  },
  {
    key: 'academic-red',
    name: '典雅学术红',
    primary: '#dc2626',
    desc: '思政 / 历史 / 正式答辩',
  },
];

const subjectList = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '道德与法治', '通用技术'];
const gradeList = ['小学低年级', '小学高年级', '初中七年级', '初中八年级', '初中九年级', '高中一年级', '高中二年级', '高中三年级', '大学/高职'];
</script>

<template>
  <div class="form-container">
    <div class="form-header">
      <div class="header-badge">
        <Sparkles class="icon-sparkle" />
        <span>智能课件生成器</span>
      </div>
      <h2>输入课题信息，一键生成完整课件与逐字稿</h2>
      <p class="subtitle">AI 将自动编排教学目标、学情分析、教学环节、板书图示及每一页演讲台词</p>
    </div>

    <!-- 快速预设标签 -->
    <div class="quick-samples">
      <div class="sample-label">
        <Flame class="icon-flame" />
        <span>热门示例：</span>
      </div>
      <div class="sample-chips">
        <button
          v-for="(sample, idx) in quickSamples"
          :key="idx"
          type="button"
          class="sample-chip"
          @click="applySample(sample)"
        >
          {{ sample.title }}
        </button>
      </div>
    </div>

    <form @submit.prevent="store.startGeneration" class="main-form">
      <!-- 第一行：课题标题 -->
      <div class="form-group full-width">
        <label for="lessonTitle" class="form-label required">
          <BookOpen class="label-icon" />
          <span>课题名称 / 教学篇目</span>
        </label>
        <input
          id="lessonTitle"
          v-model="store.formData.lessonTitle"
          type="text"
          class="form-input text-lg"
          placeholder="例如：朱自清《背影》说课稿、高中数学《双曲线的标准方程》..."
          required
        />
      </div>

      <!-- 第二行：学科与年级 -->
      <div class="form-row">
        <div class="form-group half-width">
          <label for="subject" class="form-label required">
            <GraduationCap class="label-icon" />
            <span>教学学科</span>
          </label>
          <select id="subject" v-model="store.formData.subject" class="form-select">
            <option v-for="sub in subjectList" :key="sub" :value="sub">{{ sub }}</option>
          </select>
        </div>

        <div class="form-group half-width">
          <label for="grade" class="form-label required">
            <GraduationCap class="label-icon" />
            <span>适用年级 / 学段</span>
          </label>
          <select id="grade" v-model="store.formData.grade" class="form-select">
            <option v-for="g in gradeList" :key="g" :value="g">{{ g }}</option>
          </select>
        </div>
      </div>

      <!-- 第三行：教材版本与补充要求 -->
      <div class="form-row">
        <div class="form-group half-width">
          <label for="version" class="form-label">
            <FileText class="label-icon" />
            <span>教材版本（选填）</span>
          </label>
          <input
            id="version"
            v-model="store.formData.textbookVersion"
            type="text"
            class="form-input"
            placeholder="例如：人教版、北师大版、苏教版..."
          />
        </div>

        <div class="form-group half-width">
          <label for="extraReq" class="form-label">
            <FileText class="label-icon" />
            <span>补充与场景要求（选填）</span>
          </label>
          <input
            id="extraReq"
            v-model="store.formData.extraRequirement"
            type="text"
            class="form-input"
            placeholder="例如：教资面试试讲（10分钟）、教学大奖赛公开课..."
          />
        </div>
      </div>

      <!-- 第四行：PPT 视觉主题选择器 -->
      <div class="form-group full-width theme-section">
        <label class="form-label">
          <Palette class="label-icon" />
          <span>PPT 视觉配色主题</span>
        </label>
        <div class="theme-grid">
          <div
            v-for="t in themeOptions"
            :key="t.key"
            class="theme-card"
            :class="{ active: store.formData.theme === t.key }"
            @click="store.formData.theme = t.key"
          >
            <div class="theme-color-bar" :style="{ background: t.primary }"></div>
            <div class="theme-info">
              <div class="theme-name-row">
                <span class="theme-name">{{ t.name }}</span>
                <Check v-if="store.formData.theme === t.key" class="check-icon" />
              </div>
              <span class="theme-desc">{{ t.desc }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 错误反馈提示 -->
      <div v-if="store.errorMessage" class="error-alert">
        {{ store.errorMessage }}
      </div>

      <!-- 提交生成按钮 -->
      <div class="form-submit">
        <button
          type="submit"
          class="submit-button"
          :disabled="store.isGenerating"
        >
          <Wand2 class="btn-icon" :class="{ spin: store.isGenerating }" />
          <span>{{ store.isGenerating ? 'AI 正在全力思考与生成中...' : '开始一键生成说课课件 🐾' }}</span>
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.form-container {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 2rem 2.5rem;
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
}

.form-header {
  margin-bottom: 1.5rem;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.75rem;
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #7c3aed;
  margin-bottom: 0.75rem;
}

.icon-sparkle {
  width: 14px;
  height: 14px;
}

.form-header h2 {
  font-size: 1.45rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 0.4rem 0;
}

.subtitle {
  font-size: 0.9rem;
  color: #64748b;
  margin: 0;
}

/* 预设示例 */
.quick-samples {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.85rem 1rem;
  background: #f8fafc;
  border-radius: 10px;
  margin-bottom: 1.75rem;
  border: 1px dashed #cbd5e1;
}

.sample-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.825rem;
  font-weight: 600;
  color: #f97316;
}

.icon-flame {
  width: 14px;
  height: 14px;
}

.sample-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.sample-chip {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 0.25rem 0.65rem;
  font-size: 0.8rem;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s ease;
}

.sample-chip:hover {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #2563eb;
}

/* 表单主体 */
.main-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-row {
  display: flex;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.full-width {
  width: 100%;
}

.half-width {
  flex: 1;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #334155;
}

.form-label.required::after {
  content: '*';
  color: #ef4444;
  margin-left: 2px;
}

.label-icon {
  width: 15px;
  height: 15px;
  color: #64748b;
}

.form-input,
.form-select {
  height: 44px;
  padding: 0 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.925rem;
  color: #0f172a;
  background: #ffffff;
  outline: none;
  transition: all 0.15s ease;
}

.form-input:focus,
.form-select:focus {
  border-color: #7c3aed;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
}

.form-input.text-lg {
  height: 48px;
  font-size: 1rem;
  font-weight: 500;
}

/* 主题配色栅格 */
.theme-section {
  margin-top: 0.5rem;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-top: 0.25rem;
}

.theme-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.85rem;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.15s ease;
}

.theme-card:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.theme-card.active {
  border-color: #7c3aed;
  background: #f5f3ff;
  box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.15);
}

.theme-color-bar {
  width: 14px;
  height: 38px;
  border-radius: 4px;
  flex-shrink: 0;
}

.theme-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.theme-name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.theme-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #1e293b;
}

.check-icon {
  width: 14px;
  height: 14px;
  color: #7c3aed;
}

.theme-desc {
  font-size: 0.75rem;
  color: #64748b;
}

/* 错误提示 */
.error-alert {
  padding: 0.75rem 1rem;
  background: #fef2f2;
  border: 1px solid #fee2e2;
  border-radius: 8px;
  color: #dc2626;
  font-size: 0.875rem;
}

/* 提交按钮 */
.form-submit {
  margin-top: 1rem;
}

.submit-button {
  width: 100%;
  height: 50px;
  background: #7c3aed;
  border: none;
  border-radius: 10px;
  color: #ffffff;
  font-size: 1.05rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);
}

.submit-button:hover:not(:disabled) {
  background: #6d28d9;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(124, 58, 237, 0.35);
}

.submit-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-icon {
  width: 18px;
  height: 18px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 640px) {
  .form-container {
    padding: 1.5rem;
  }
  .form-row {
    flex-direction: column;
    gap: 1.25rem;
  }
  .theme-grid {
    grid-template-columns: 1fr;
  }
}
</style>
