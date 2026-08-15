<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import {
  Cat,
  Sparkles,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const isLoginMode = ref(true);
const showPassword = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

const formData = reactive({
  email: '',
  password: '',
  confirmPassword: '',
});

function toggleMode() {
  isLoginMode.value = !isLoginMode.value;
  errorMessage.value = '';
  successMessage.value = '';
}

async function handleSubmit() {
  errorMessage.value = '';
  successMessage.value = '';

  if (!formData.email || !formData.password) {
    errorMessage.value = '请填写完整的邮箱与密码';
    return;
  }

  if (!isLoginMode.value && formData.password !== formData.confirmPassword) {
    errorMessage.value = '两次输入的密码不一致';
    return;
  }

  if (formData.password.length < 6) {
    errorMessage.value = '密码长度不能少于 6 位';
    return;
  }

  if (isLoginMode.value) {
    const res = await authStore.signIn(formData.email, formData.password);
    if (res.success) {
      const redirectPath = (route.query.redirect as string) || '/';
      router.push(redirectPath);
    } else {
      errorMessage.value = res.message || '登录失败，请检查账号或密码';
    }
  } else {
    const res = await authStore.signUp(formData.email, formData.password);
    if (res.success) {
      if (res.needsConfirmation) {
        successMessage.value = '注册成功！激活邮件已发送至邮箱，请查收后登录。';
      } else {
        successMessage.value = '注册成功！正在为您进入猫猫工作台...';
        setTimeout(() => {
          router.push('/');
        }, 800);
      }
    } else {
      errorMessage.value = res.message || '注册失败，请稍后重试';
    }
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="bg-decoration"></div>

    <div class="auth-box">
      <!-- 品牌头部 -->
      <div class="brand-section">
        <div class="logo-wrapper">
          <Cat class="logo-icon" />
          <div class="sparkle-bubble">
            <Sparkles class="sparkle-icon" />
          </div>
        </div>
        <h1 class="brand-title">猫猫 Agent</h1>
        <p class="brand-desc">
          {{ isLoginMode ? '欢迎回来，唤醒您的专属猫猫智能助手 🐾' : '创建猫猫账号，开启全新智能创作体验 🐾' }}
        </p>
      </div>

      <!-- Tab 切换 -->
      <div class="tab-header">
        <button
          type="button"
          class="tab-item"
          :class="{ active: isLoginMode }"
          @click="isLoginMode = true"
        >
          登录
        </button>
        <button
          type="button"
          class="tab-item"
          :class="{ active: !isLoginMode }"
          @click="isLoginMode = false"
        >
          注册
        </button>
      </div>

      <!-- 提示信息 -->
      <div v-if="errorMessage" class="message-banner error">
        <AlertCircle class="banner-icon" />
        <span>{{ errorMessage }}</span>
      </div>

      <div v-if="successMessage" class="message-banner success">
        <CheckCircle2 class="banner-icon" />
        <span>{{ successMessage }}</span>
      </div>

      <!-- 表单主体 -->
      <form class="form-body" @submit.prevent="handleSubmit">
        <div class="form-item">
          <label for="email">账号邮箱</label>
          <div class="input-container">
            <Mail class="input-icon" />
            <input
              id="email"
              v-model.trim="formData.email"
              type="email"
              placeholder="请输入您的邮箱"
              required
              autocomplete="email"
            />
          </div>
        </div>

        <div class="form-item">
          <label for="password">密码</label>
          <div class="input-container">
            <Lock class="input-icon" />
            <input
              id="password"
              v-model="formData.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="请输入密码（不少于 6 位）"
              required
              autocomplete="current-password"
            />
            <button
              type="button"
              class="eye-btn"
              @click="showPassword = !showPassword"
              tabindex="-1"
            >
              <EyeOff v-if="showPassword" class="eye-icon" />
              <Eye v-else class="eye-icon" />
            </button>
          </div>
        </div>

        <div v-if="!isLoginMode" class="form-item">
          <label for="confirmPassword">确认密码</label>
          <div class="input-container">
            <Lock class="input-icon" />
            <input
              id="confirmPassword"
              v-model="formData.confirmPassword"
              :type="showPassword ? 'text' : 'password'"
              placeholder="请再次输入密码"
              required
              autocomplete="new-password"
            />
          </div>
        </div>

        <button
          type="submit"
          class="submit-button"
          :disabled="authStore.loading"
        >
          <span v-if="!authStore.loading">
            {{ isLoginMode ? '进入猫猫工作台' : '立即注册' }}
          </span>
          <span v-else class="loading-label">
            <div class="loading-spinner"></div>
            正在连接...
          </span>
          <ArrowRight v-if="!authStore.loading" class="arrow-icon" />
        </button>
      </form>

      <!-- 底部操作 -->
      <div class="auth-bottom">
        <span>{{ isLoginMode ? '还没有账号？' : '已有账号？' }}</span>
        <button type="button" class="link-button" @click="toggleMode">
          {{ isLoginMode ? '免费注册' : '直接登录' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  position: fixed;
  top: 0;
  left: 0;
  padding: 1rem;
  box-sizing: border-box;
}

.bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 40vh;
  background: linear-gradient(180deg, #eff6ff 0%, rgba(248, 250, 252, 0) 100%);
  pointer-events: none;
}

.auth-box {
  width: 100%;
  max-width: 390px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 1.75rem 1.75rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 10px 15px -3px rgba(0, 0, 0, 0.03);
  position: relative;
  z-index: 1;
}

.brand-section {
  text-align: center;
  margin-bottom: 1.25rem;
}

.logo-wrapper {
  display: inline-flex;
  position: relative;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: #eff6ff;
  border: 1px solid #dbeafe;
  border-radius: 12px;
  margin-bottom: 0.5rem;
}

.logo-icon {
  width: 26px;
  height: 26px;
  color: #2563eb;
}

.sparkle-bubble {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #3b82f6;
  border-radius: 50%;
  padding: 2px;
  border: 2px solid #ffffff;
  display: flex;
}

.sparkle-icon {
  width: 10px;
  height: 10px;
  color: #ffffff;
}

.brand-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 0.25rem 0;
  letter-spacing: -0.01em;
}

.brand-desc {
  font-size: 0.8125rem;
  color: #64748b;
  margin: 0;
}

/* Tab 切换 */
.tab-header {
  display: flex;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 3px;
  margin-bottom: 1.1rem;
}

.tab-item {
  flex: 1;
  padding: 0.45rem 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-item.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* 提示条 */
.message-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  font-size: 0.8125rem;
  margin-bottom: 1rem;
  line-height: 1.35;
}

.message-banner.error {
  background: #fef2f2;
  border: 1px solid #fee2e2;
  color: #dc2626;
}

.message-banner.success {
  background: #f0fdf4;
  border: 1px solid #dcfce7;
  color: #16a34a;
}

.banner-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

/* 表单主体 */
.form-body {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  text-align: left;
}

.form-item label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #334155;
}

.input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 0.85rem;
  width: 16px;
  height: 16px;
  color: #94a3b8;
  pointer-events: none;
}

.input-container input {
  width: 100%;
  padding: 0.65rem 2.4rem 0.65rem 2.45rem;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  color: #0f172a;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;
}

.input-container input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.input-container input::placeholder {
  color: #94a3b8;
}

.eye-btn {
  position: absolute;
  right: 0.65rem;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 4px;
}

.eye-btn:hover {
  color: #475569;
}

.eye-icon {
  width: 16px;
  height: 16px;
}

/* 按钮 */
.submit-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: 100%;
  padding: 0.75rem;
  margin-top: 0.35rem;
  background: #2563eb;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.18);
}

.submit-button:hover:not(:disabled) {
  background: #1d4ed8;
}

.submit-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.arrow-icon {
  width: 15px;
  height: 15px;
}

.loading-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.loading-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 底部操作 */
.auth-bottom {
  margin-top: 1.1rem;
  text-align: center;
  font-size: 0.8125rem;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
}

.link-button {
  background: transparent;
  border: none;
  color: #2563eb;
  font-weight: 600;
  font-size: 0.8125rem;
  cursor: pointer;
  padding: 0;
}

.link-button:hover {
  text-decoration: underline;
}
</style>
