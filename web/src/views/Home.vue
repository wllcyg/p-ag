<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import {
  GraduationCap,
  Sparkles,
  LogOut,
  User,
  Layers,
  Wand2,
  FileCheck,
  CheckCircle2,
} from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();

async function handleLogout() {
  await authStore.signOut();
  router.push('/login');
}
</script>

<template>
  <div class="home-layout">
    <!-- 顶部导航栏 -->
    <header class="navbar">
      <div class="nav-left">
        <div class="logo-box">
          <GraduationCap class="logo-icon" />
        </div>
        <div class="title-group">
          <span class="system-title">教师说课 PPT 智能生成系统</span>
          <span class="version-tag">AI Powered</span>
        </div>
      </div>

      <div class="nav-right">
        <div class="user-badge">
          <User class="user-icon" />
          <span class="user-email">{{ authStore.userEmail }}</span>
        </div>
        <button class="logout-btn" @click="handleLogout" title="退出登录">
          <LogOut class="logout-icon" />
          <span>退出</span>
        </button>
      </div>
    </header>

    <!-- 主工作区内容 -->
    <main class="main-content">
      <div class="welcome-hero">
        <div class="hero-tag">
          <Sparkles class="hero-sparkle" />
          <span>基于 LangGraph.js + R1/V3 + pptxgenjs 构建</span>
        </div>
        <h1 class="hero-title">
          让每一次说课备课，都<span class="text-gradient">专业、从容、高效</span>
        </h1>
        <p class="hero-subtitle">
          严格遵循说课六步法规范，自动生成教学大纲、卡片化幻灯片排版与逐字演讲稿
        </p>
      </div>

      <!-- 核心特性卡片一览 -->
      <div class="feature-grid">
        <div class="feature-card">
          <div class="card-icon-wrapper purple">
            <Layers class="card-icon" />
          </div>
          <h3>说课六步法闭环</h3>
          <p>说教材、说学情、说教法、说教学过程、说板书设计、说反思总结全覆盖。</p>
        </div>

        <div class="feature-card">
          <div class="card-icon-wrapper indigo">
            <Wand2 class="card-icon" />
          </div>
          <h3>思考与结构化分离</h3>
          <p>R1 深度构思教学逻辑，V3 精准转译为 PPT 结构化对象，告别模型幻觉。</p>
        </div>

        <div class="feature-card">
          <div class="card-icon-wrapper cyan">
            <FileCheck class="card-icon" />
          </div>
          <h3>毫秒级质量门禁</h3>
          <p>内置排版防溢出字数校验、逐字稿时长检测与自动修复分支，确保交付可用。</p>
        </div>
      </div>

      <!-- 快捷状态指示 -->
      <div class="status-banner">
        <div class="status-left">
          <CheckCircle2 class="status-icon" />
          <div>
            <strong>认证环境已连通</strong>
            <p>Supabase 用户认证服务运行正常，当前用户已通过 Bearer Token 鉴权。</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.home-layout {
  min-height: 100vh;
  background-color: #0b0f19;
  color: #f1f5f9;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

/* 顶部导航 */
.navbar {
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  position: sticky;
  top: 0;
  z-index: 10;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.logo-box {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
}

.logo-icon {
  width: 22px;
  height: 22px;
  color: #ffffff;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.system-title {
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #f8fafc;
}

.version-tag {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 8px;
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
  border-radius: 999px;
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.user-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.8rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  font-size: 0.85rem;
  color: #cbd5e1;
}

.user-icon {
  width: 15px;
  height: 15px;
  color: #818cf8;
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.9rem;
  background: transparent;
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.logout-btn:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.5);
}

.logout-icon {
  width: 14px;
  height: 14px;
}

/* 主内容 */
.main-content {
  flex: 1;
  max-width: 1120px;
  width: 100%;
  margin: 0 auto;
  padding: 3.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.welcome-hero {
  text-align: center;
  max-width: 780px;
  margin: 0 auto;
}

.hero-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.9rem;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.25);
  border-radius: 999px;
  font-size: 0.825rem;
  color: #a5b4fc;
  margin-bottom: 1.25rem;
}

.hero-sparkle {
  width: 14px;
  height: 14px;
}

.hero-title {
  font-size: 2.5rem;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.03em;
  margin: 0 0 1rem 0;
}

.text-gradient {
  background: linear-gradient(135deg, #818cf8 0%, #c084fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: 1.1rem;
  color: #94a3b8;
  margin: 0;
  line-height: 1.6;
}

/* 卡片网格 */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.feature-card {
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 1.75rem;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.feature-card:hover {
  transform: translateY(-3px);
  border-color: rgba(99, 102, 241, 0.3);
}

.card-icon-wrapper {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.25rem;
}

.card-icon-wrapper.purple {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
}

.card-icon-wrapper.indigo {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
}

.card-icon-wrapper.cyan {
  background: rgba(6, 182, 212, 0.15);
  color: #22d3ee;
}

.card-icon {
  width: 24px;
  height: 24px;
}

.feature-card h3 {
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: #f8fafc;
}

.feature-card p {
  font-size: 0.9rem;
  color: #94a3b8;
  margin: 0;
  line-height: 1.5;
}

/* 状态横幅 */
.status-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.2);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.status-icon {
  width: 28px;
  height: 28px;
  color: #4ade80;
  flex-shrink: 0;
}

.status-left strong {
  display: block;
  font-size: 0.95rem;
  color: #86efac;
  margin-bottom: 0.2rem;
}

.status-left p {
  font-size: 0.85rem;
  color: #cbd5e1;
  margin: 0;
}
</style>
