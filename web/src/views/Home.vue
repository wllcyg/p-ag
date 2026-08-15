<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import {
  Cat,
  LogOut,
  User,
  Layers,
  Wand2,
  FileCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();

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
          <span class="system-tag">智能工作台 🐾</span>
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
      <!-- 欢迎标语 -->
      <section class="hero-banner">
        <div class="pill-badge">
          <Sparkles class="pill-icon" />
          <span>猫猫智能 Agent · 大纲与演示课件一键生成</span>
        </div>
        <h1 class="hero-heading">猫猫 Agent 智能创作与课件工作台</h1>
        <p class="hero-subtext">
          基于多阶段思考与结构化渲染管线，自动生成严谨逻辑大纲、精美卡片幻灯片与配套逐字演讲稿。
        </p>
      </section>

      <!-- 核心能力卡片 -->
      <section class="card-grid">
        <div class="service-card">
          <div class="icon-avatar blue">
            <Layers class="avatar-icon" />
          </div>
          <h3>多阶段智能生成</h3>
          <p>涵盖结构化分析、内容提炼、版面规划、板书设计与总结反思，规范且可靠。</p>
        </div>

        <div class="service-card">
          <div class="icon-avatar indigo">
            <Wand2 class="avatar-icon" />
          </div>
          <h3>深度思考与格式解耦</h3>
          <p>R1 模型深度构思核心逻辑与论据，V3 快速精准转译为 PPT 结构化对象。</p>
        </div>

        <div class="service-card">
          <div class="icon-avatar teal">
            <FileCheck class="avatar-icon" />
          </div>
          <h3>毫秒级规则质量门禁</h3>
          <p>单行字数防溢出检测、逐字稿时长精准对齐与单页自动打回自修复机制，交付即用。</p>
        </div>
      </section>

      <!-- 服务状态提示 -->
      <section class="connection-status">
        <CheckCircle2 class="status-badge-icon" />
        <div class="status-text">
          <h4>猫猫认证状态正常</h4>
          <p>已成功连接 Supabase 认证服务，当前会话有效，随时可开始生成演示文稿。</p>
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
  z-index: 10;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-badge {
  width: 36px;
  height: 36px;
  background: #2563eb;
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
  background: #eff6ff;
  color: #2563eb;
  border-radius: 999px;
  border: 1px solid #dbeafe;
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
  max-width: 1100px;
  width: 100%;
  margin: 0 auto;
  padding: 3rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.hero-banner {
  text-align: center;
  max-width: 720px;
  margin: 0 auto;
}

.pill-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.85rem;
  background: #eff6ff;
  border: 1px solid #dbeafe;
  border-radius: 999px;
  font-size: 0.8125rem;
  color: #2563eb;
  margin-bottom: 1rem;
}

.pill-icon {
  width: 13px;
  height: 13px;
}

.hero-heading {
  font-size: 2.15rem;
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

/* 卡片栅格 */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.25rem;
}

.service-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.service-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
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

.icon-avatar.blue {
  background: #eff6ff;
  color: #2563eb;
}

.icon-avatar.indigo {
  background: #eef2ff;
  color: #4f46e5;
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

/* 状态提示 */
.connection-status {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  background: #f0fdf4;
  border: 1px solid #dcfce7;
  border-radius: 10px;
  padding: 1.1rem 1.25rem;
}

.status-badge-icon {
  width: 22px;
  height: 22px;
  color: #16a34a;
  flex-shrink: 0;
  margin-top: 2px;
}

.status-text h4 {
  font-size: 0.925rem;
  font-weight: 600;
  color: #15803d;
  margin: 0 0 0.2rem 0;
}

.status-text p {
  font-size: 0.85rem;
  color: #475569;
  margin: 0;
}
</style>
