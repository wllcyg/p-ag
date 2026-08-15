<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { usePptGeneratorStore } from '../stores/pptGenerator';
import PptInputForm from '../components/PptInputForm.vue';
import GenerationTerminal from '../components/GenerationTerminal.vue';
import SlidePreview from '../components/SlidePreview.vue';
import {
  Cat,
  LogOut,
  User,
  Sparkles,
  Layers,
  Wand2,
  FileCheck,
} from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();
const pptStore = usePptGeneratorStore();

async function handleLogout() {
  await authStore.signOut();
  router.push('/login');
}
</script>

<template>
  <div class="home-page">
    <!-- 顶部导航栏 -->
    <header class="top-nav">
      <div class="nav-brand">
        <div class="brand-badge">
          <Cat class="badge-icon" />
        </div>
        <div class="brand-info">
          <span class="system-name">猫猫 Agent</span>
          <span class="system-tag">智能说课工作台 🐾</span>
        </div>
      </div>

      <div class="nav-user">
        <div class="user-chip">
          <User class="user-icon" />
          <span class="user-text">{{ authStore.userEmail }}</span>
        </div>
        <button class="logout-button" @click="handleLogout" title="安全退出">
          <LogOut class="logout-icon" />
          <span>退出登录</span>
        </button>
      </div>
    </header>

    <!-- 工作台主区域 -->
    <main class="workbench-main">
      <!-- 初始未开始生成时：展示 Hero 标语 -->
      <section v-if="pptStore.status === 'idle'" class="hero-banner">
        <div class="pill-badge">
          <Sparkles class="pill-icon" />
          <span>多阶段 Agent 驱动 · 毫秒级规则质量门禁 · 演讲台词全注入</span>
        </div>
        <h1 class="hero-heading">猫猫 Agent 智能课件与说课工作台</h1>
        <p class="hero-subtext">
          告别排版错乱与模板千篇一律，AI 深度构思教学环节，纯代码高保真生成标准 16:9 演示文稿。
        </p>
      </section>

      <!-- 核心输入表单（未生成或报错时展示） -->
      <section v-if="pptStore.status === 'idle'" class="form-section">
        <PptInputForm />
      </section>

      <!-- 生成中或生成完成：展示思考控制台与进度 -->
      <section v-if="pptStore.status !== 'idle'" class="terminal-section">
        <GenerationTerminal />
      </section>

      <!-- 有幻灯片数据时：展示幻灯片与逐字稿预览 -->
      <section v-if="pptStore.hasSlides" class="preview-section">
        <SlidePreview />
      </section>

      <!-- 底部特性介绍（仅在 idle 时显示） -->
      <section v-if="pptStore.status === 'idle'" class="card-grid">
        <div class="service-card">
          <div class="icon-avatar purple">
            <Layers class="avatar-icon" />
          </div>
          <h3>多阶段 StateGraph 编排</h3>
          <p>涵盖教材分析、学情判断、教学过程展开、辐射板书图示与总结反思六大标准环节。</p>
        </div>

        <div class="service-card">
          <div class="icon-avatar blue">
            <Wand2 class="avatar-icon" />
          </div>
          <h3>思考与排版彻底解耦</h3>
          <p>DeepSeek-R1 构思说课精髓，pptxgenjs 纯数学排版引擎精准计算卡片坐标与字号。</p>
        </div>

        <div class="service-card">
          <div class="icon-avatar teal">
            <FileCheck class="avatar-icon" />
          </div>
          <h3>演讲者逐字稿精准注入</h3>
          <p>每页配套 80~150 字高质口播台词，直接写入 PowerPoint 底层演讲者备注栏。</p>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  background: #f8fafc;
  color: #0f172a;
  display: flex;
  flex-direction: column;
}

/* 顶部导航 */
.top-nav {
  height: 64px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  position: sticky;
  top: 0;
  z-index: 20;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-badge {
  width: 36px;
  height: 36px;
  background: #7c3aed;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge-icon {
  width: 20px;
  height: 20px;
  color: #ffffff;
}

.brand-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.system-name {
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
}

.system-tag {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 7px;
  background: #f5f3ff;
  color: #7c3aed;
  border-radius: 999px;
  border: 1px solid #ddd6fe;
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  background: #f1f5f9;
  border-radius: 6px;
  font-size: 0.85rem;
  color: #475569;
}

.user-icon {
  width: 15px;
  height: 15px;
  color: #64748b;
}

.logout-button {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.8rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #64748b;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.logout-button:hover {
  background: #fef2f2;
  border-color: #fee2e2;
  color: #dc2626;
}

.logout-icon {
  width: 14px;
  height: 14px;
}

/* 主内容容器 */
.workbench-main {
  flex: 1;
  max-width: 1160px;
  width: 100%;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 4rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.hero-banner {
  text-align: center;
  max-width: 760px;
  margin: 0 auto;
}

.pill-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.85rem;
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
  border-radius: 999px;
  font-size: 0.8125rem;
  color: #7c3aed;
  margin-bottom: 1rem;
}

.pill-icon {
  width: 13px;
  height: 13px;
}

.hero-heading {
  font-size: 2.25rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 0.85rem 0;
  letter-spacing: -0.02em;
}

.hero-subtext {
  font-size: 1.05rem;
  color: #64748b;
  margin: 0;
  line-height: 1.6;
}

/* 各分块区域 */
.form-section,
.terminal-section,
.preview-section {
  width: 100%;
}

/* 卡片栅格 */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.25rem;
  margin-top: 1rem;
}

.service-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.icon-avatar {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.icon-avatar.purple {
  background: #f5f3ff;
  color: #7c3aed;
}

.icon-avatar.blue {
  background: #eff6ff;
  color: #2563eb;
}

.icon-avatar.teal {
  background: #f0fdfa;
  color: #0d9488;
}

.avatar-icon {
  width: 22px;
  height: 22px;
}

.service-card h3 {
  font-size: 1.05rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 0.4rem 0;
}

.service-card p {
  font-size: 0.875rem;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
}
</style>
