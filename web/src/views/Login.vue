<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import {
  GraduationCap,
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

  // 基础表单验证
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
    // 执行登录
    const res = await authStore.signIn(formData.email, formData.password);
    if (res.success) {
      const redirectPath = (route.query.redirect as string) || '/';
      router.push(redirectPath);
    } else {
      errorMessage.value = res.message || '登录失败，请检查账号密码';
    }
  } else {
    // 执行注册
    const res = await authStore.signUp(formData.email, formData.password);
    if (res.success) {
      if (res.needsConfirmation) {
        successMessage.value = '注册成功！验证邮件已发送至您的邮箱，请前往查收并激活。';
      } else {
        successMessage.value = '注册成功！正在为您自动登录...';
        setTimeout(() => {
          router.push('/');
        }, 1000);
      }
    } else {
      errorMessage.value = res.message || '注册失败，请稍后重试';
    }
  }
}
</script>

<template>
  <div class="auth-container">
    <!-- 动态微光背景球 -->
    <div class="glow-orb orb-1"></div>
    <div class="glow-orb orb-2"></div>
    <div class="glow-orb orb-3"></div>

    <div class="auth-card">
      <!-- 品牌 Header -->
      <div class="brand-header">
        <div class="brand-logo">
          <GraduationCap class="logo-icon" />
          <div class="badge-sparkle">
            <Sparkles class="sparkle-icon" />
          </div>
        </div>
        <h1 class="brand-title">教师说课 PPT 智能生成系统</h1>
        <p class="brand-desc">
          {{ isLoginMode ? '欢迎回来，开启 AI 智能备课与说课课件生成' : '加入我们，赋能教师高效制作专业说课演示' }}
        </p>
      </div>

      <!-- Tab 切换 -->
      <div class="tab-switch">
        <button
          type="button"
          class="tab-btn"
          :class="{ active: isLoginMode }"
          @click="isLoginMode = true"
        >
          账号登录
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ active: !isLoginMode }"
          @click="isLoginMode = false"
        >
          教师注册
        </button>
      </div>

      <!-- 提示消息反馈 -->
      <div v-if="errorMessage" class="alert-box error">
        <AlertCircle class="alert-icon" />
        <span>{{ errorMessage }}</span>
      </div>

      <div v-if="successMessage" class="alert-box success">
        <CheckCircle2 class="alert-icon" />
        <span>{{ successMessage }}</span>
      </div>

      <!-- 表单主体 -->
      <form class="auth-form" @submit.prevent="handleSubmit">
        <div class="input-group">
          <label for="email">教师工作邮箱</label>
          <div class="input-wrapper">
            <Mail class="field-icon" />
            <input
              id="email"
              v-model.trim="formData.email"
              type="email"
              placeholder="name@school.edu.cn"
              required
              autocomplete="email"
            />
          </div>
        </div>

        <div class="input-group">
          <label for="password">密码</label>
          <div class="input-wrapper">
            <Lock class="field-icon" />
            <input
              id="password"
              v-model="formData.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="请输入 6 位及以上密码"
              required
              autocomplete="current-password"
            />
            <button
              type="button"
              class="toggle-eye"
              @click="showPassword = !showPassword"
              tabindex="-1"
            >
              <EyeOff v-if="showPassword" class="eye-icon" />
              <Eye v-else class="eye-icon" />
            </button>
          </div>
        </div>

        <div v-if="!isLoginMode" class="input-group">
          <label for="confirmPassword">确认密码</label>
          <div class="input-wrapper">
            <Lock class="field-icon" />
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

        <!-- 提交按钮 -->
        <button
          type="submit"
          class="submit-btn"
          :disabled="authStore.loading"
        >
          <span v-if="!authStore.loading">
            {{ isLoginMode ? '进入工作台' : '立即注册账号' }}
          </span>
          <span v-else class="loading-state">
            <div class="spinner"></div>
            正在处理...
          </span>
          <ArrowRight v-if="!authStore.loading" class="btn-arrow" />
        </button>
      </form>

      <!-- 底部辅助说明 -->
      <div class="auth-footer">
        <span>{{ isLoginMode ? '还没有教师账号？' : '已有账号？' }}</span>
        <a href="javascript:void(0)" class="switch-link" @click="toggleMode">
          {{ isLoginMode ? '免费注册' : '直接登录' }}
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background-color: #0c0e14;
  position: relative;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

/* 渐变微光球 */
.glow-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
  opacity: 0.45;
  animation: floatOrb 12s ease-in-out infinite alternate;
}

.orb-1 {
  width: 420px;
  height: 420px;
  background: radial-gradient(circle, #6366f1, #4338ca);
  top: -100px;
  left: -80px;
}

.orb-2 {
  width: 380px;
  height: 380px;
  background: radial-gradient(circle, #8b5cf6, #3b82f6);
  bottom: -80px;
  right: -60px;
  animation-duration: 16s;
}

.orb-3 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, #06b6d4, #3b82f6);
  top: 40%;
  right: 20%;
  opacity: 0.2;
}

@keyframes floatOrb {
  0% {
    transform: translate(0, 0) scale(1);
  }
  100% {
    transform: translate(40px, 30px) scale(1.1);
  }
}

/* 毛玻璃卡片 */
.auth-card {
  width: 100%;
  max-width: 440px;
  background: rgba(19, 23, 34, 0.75);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 2.5rem 2.25rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
  z-index: 1;
}

/* 品牌头部 */
.brand-header {
  text-align: center;
  margin-bottom: 1.75rem;
}

.brand-logo {
  display: inline-flex;
  position: relative;
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 58px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  border-radius: 16px;
  box-shadow: 0 10px 20px -5px rgba(79, 70, 229, 0.5);
  margin-bottom: 1rem;
}

.logo-icon {
  width: 30px;
  height: 30px;
  color: #ffffff;
}

.badge-sparkle {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #06b6d4;
  border-radius: 50%;
  padding: 3px;
  border: 2px solid #0c0e14;
}

.sparkle-icon {
  width: 12px;
  height: 12px;
  color: #ffffff;
  display: block;
}

.brand-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: #f8fafc;
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.02em;
}

.brand-desc {
  font-size: 0.875rem;
  color: #94a3b8;
  margin: 0;
  line-height: 1.5;
}

/* Tab 切换 */
.tab-switch {
  display: flex;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.tab-btn {
  flex: 1;
  padding: 0.6rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #94a3b8;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn.active {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* 提示框 */
.alert-box {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-size: 0.85rem;
  margin-bottom: 1.25rem;
}

.alert-box.error {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #fca5a5;
}

.alert-box.success {
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.25);
  color: #86efac;
}

.alert-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* 表单与输入框 */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  text-align: left;
}

.input-group label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #cbd5e1;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.field-icon {
  position: absolute;
  left: 1rem;
  width: 18px;
  height: 18px;
  color: #64748b;
  pointer-events: none;
}

.input-wrapper input {
  width: 100%;
  padding: 0.75rem 2.6rem 0.75rem 2.75rem;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #f8fafc;
  font-size: 0.9rem;
  outline: none;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.input-wrapper input:focus {
  border-color: #6366f1;
  background: rgba(15, 23, 42, 0.9);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.input-wrapper input::placeholder {
  color: #475569;
}

.toggle-eye {
  position: absolute;
  right: 0.75rem;
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 4px;
}

.toggle-eye:hover {
  color: #cbd5e1;
}

.eye-icon {
  width: 18px;
  height: 18px;
}

/* 提交按钮 */
.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.85rem;
  margin-top: 0.5rem;
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.35);
}

.submit-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%);
  box-shadow: 0 12px 20px -3px rgba(79, 70, 229, 0.45);
  transform: translateY(-1px);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-arrow {
  width: 18px;
  height: 18px;
  transition: transform 0.2s ease;
}

.submit-btn:hover:not(:disabled) .btn-arrow {
  transform: translateX(3px);
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 底部辅助链接 */
.auth-footer {
  margin-top: 1.5rem;
  text-align: center;
  font-size: 0.85rem;
  color: #64748b;
}

.switch-link {
  color: #818cf8;
  text-decoration: none;
  font-weight: 600;
  margin-left: 0.4rem;
  transition: color 0.2s ease;
}

.switch-link:hover {
  color: #a5b4fc;
  text-decoration: underline;
}
</style>
