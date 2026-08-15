<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { usePptGeneratorStore } from '../stores/pptGenerator';
import {
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  Layers,
  FileCheck2,
  ShieldCheck,
  Palette,
  CheckCircle2,
  Loader2,
  Terminal,
} from 'lucide-vue-next';

const store = usePptGeneratorStore();
const isExpanded = ref(true);
const consoleRef = ref<HTMLElement | null>(null);

// 监听思考文本变化，自动滚动到底部
watch(
  () => store.reasoningText,
  async () => {
    await nextTick();
    if (consoleRef.value) {
      consoleRef.value.scrollTop = consoleRef.value.scrollHeight;
    }
  },
);

const steps = [
  { key: 'REASONING', label: '1. 深度构思', icon: BrainCircuit },
  { key: 'STRUCTURING', label: '2. 结构转译', icon: Layers },
  { key: 'VALIDATING', label: '3. 格式校验', icon: FileCheck2 },
  { key: 'QUALITY_GATE', label: '4. 质量门禁', icon: ShieldCheck },
  { key: 'RENDERING', label: '5. 纯代码渲染', icon: Palette },
];

function isStepActive(key: string) {
  return store.currentStep === key;
}

function isStepCompleted(key: string) {
  const order = ['REASONING', 'STRUCTURING', 'VALIDATING', 'QUALITY_GATE', 'RENDERING', 'DONE'];
  const currentIndex = order.indexOf(store.currentStep || '');
  const stepIndex = order.indexOf(key);
  return currentIndex > stepIndex || store.isDone;
}
</script>

<template>
  <div class="terminal-card">
    <!-- 顶部状态栏 -->
    <div class="terminal-header">
      <div class="header-left">
        <div class="status-indicator">
          <Loader2 v-if="store.isGenerating" class="spin-icon" />
          <CheckCircle2 v-else-if="store.isDone" class="done-icon" />
          <Terminal v-else class="idle-icon" />
        </div>
        <div class="status-texts">
          <h3 class="status-title">{{ store.statusMessage || '等待任务开始...' }}</h3>
          <span class="status-progress-text">进度：{{ store.progress }}%</span>
        </div>
      </div>

      <button
        type="button"
        class="toggle-btn"
        @click="isExpanded = !isExpanded"
        :title="isExpanded ? '折叠思考控制台' : '展开思考控制台'"
      >
        <span class="toggle-text">{{ isExpanded ? '收起思考流' : '展开思考流' }}</span>
        <ChevronUp v-if="isExpanded" class="toggle-icon" />
        <ChevronDown v-else class="toggle-icon" />
      </button>
    </div>

    <!-- 总体进度条 -->
    <div class="progress-bar-bg">
      <div
        class="progress-bar-fill"
        :style="{ width: `${store.progress}%` }"
        :class="{ complete: store.isDone }"
      ></div>
    </div>

    <!-- 流水线阶段步骤条 -->
    <div class="pipeline-steps">
      <div
        v-for="st in steps"
        :key="st.key"
        class="step-item"
        :class="{
          active: isStepActive(st.key),
          completed: isStepCompleted(st.key),
        }"
      >
        <div class="step-icon-box">
          <component :is="st.icon" class="step-icon" />
        </div>
        <span class="step-label">{{ st.label }}</span>
      </div>
    </div>

    <!-- 展开式：DeepSeek-R1 思考流实时终端 -->
    <div v-show="isExpanded" class="terminal-body">
      <div class="console-header">
        <div class="console-badge">
          <BrainCircuit class="badge-icon" />
          <span>DeepSeek-R1 备课思考过程 (CoT 实时推理流)</span>
        </div>
        <span v-if="store.reasoningText" class="token-count">
          已思考 {{ store.reasoningText.length }} 字
        </span>
      </div>

      <div ref="consoleRef" class="console-box">
        <pre v-if="store.reasoningText" class="console-text">{{ store.reasoningText }}</pre>
        <div v-else class="console-empty">
          <span class="empty-dots">正在启动推理大脑，思考内容将在此实时流式呈现...</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.terminal-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.terminal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.status-indicator {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spin-icon {
  width: 20px;
  height: 20px;
  color: #7c3aed;
  animation: spin 1s linear infinite;
}

.done-icon {
  width: 20px;
  height: 20px;
  color: #16a34a;
}

.idle-icon {
  width: 18px;
  height: 18px;
  color: #64748b;
}

.status-texts {
  display: flex;
  flex-direction: column;
}

.status-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.status-progress-text {
  font-size: 0.8rem;
  color: #64748b;
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
}

.toggle-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.toggle-icon {
  width: 14px;
  height: 14px;
}

/* 进度条 */
.progress-bar-bg {
  width: 100%;
  height: 6px;
  background: #f1f5f9;
  border-radius: 999px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: #7c3aed;
  border-radius: 999px;
  transition: width 0.3s ease;
}

.progress-bar-fill.complete {
  background: #16a34a;
}

/* 阶段步骤条 */
.pipeline-steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 0.5rem;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
  transition: all 0.15s ease;
}

.step-icon-box {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-icon {
  width: 14px;
  height: 14px;
  color: #94a3b8;
}

.step-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #64748b;
}

.step-item.active {
  background: #f5f3ff;
  border-color: #ddd6fe;
}

.step-item.active .step-icon-box {
  background: #7c3aed;
  border-color: #7c3aed;
}

.step-item.active .step-icon {
  color: #ffffff;
}

.step-item.active .step-label {
  color: #7c3aed;
}

.step-item.completed {
  background: #f0fdf4;
  border-color: #dcfce7;
}

.step-item.completed .step-icon-box {
  background: #16a34a;
  border-color: #16a34a;
}

.step-item.completed .step-icon {
  color: #ffffff;
}

.step-item.completed .step-label {
  color: #16a34a;
}

/* 控制台主体 */
.terminal-body {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fafafa;
  overflow: hidden;
}

.console-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.85rem;
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
}

.console-badge {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
}

.badge-icon {
  width: 14px;
  height: 14px;
  color: #7c3aed;
}

.token-count {
  font-size: 0.7rem;
  color: #94a3b8;
}

.console-box {
  height: 200px;
  overflow-y: auto;
  padding: 0.85rem 1rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.console-text {
  margin: 0;
  font-size: 0.825rem;
  color: #334155;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

.console-empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.825rem;
  color: #94a3b8;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
