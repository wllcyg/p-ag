import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const session = ref<Session | null>(null);
  const loading = ref(false);
  const isInitialized = ref(false);

  const isAuthenticated = computed(() => !!user.value);
  const userEmail = computed(() => user.value?.email || '');

  /**
   * 初始化 Auth 状态并监听变更
   */
  async function initAuth() {
    if (isInitialized.value) return;

    try {
      loading.value = true;
      const { data } = await supabase.auth.getSession();
      session.value = data.session;
      user.value = data.session?.user ?? null;

      // 注册状态变化监听
      supabase.auth.onAuthStateChange((_event, currentSession) => {
        session.value = currentSession;
        user.value = currentSession?.user ?? null;
      });
    } catch (err) {
      console.error('初始化 Supabase Auth 失败:', err);
    } finally {
      loading.value = false;
      isInitialized.value = true;
    }
  }

  /**
   * 邮箱密码登录
   */
  async function signIn(email: string, password: string) {
    loading.value = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      session.value = data.session;
      user.value = data.user;
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, message: err.message || '登录失败，请检查账号密码' };
    } finally {
      loading.value = false;
    }
  }

  /**
   * 邮箱密码注册
   */
  async function signUp(email: string, password: string) {
    loading.value = true;
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      session.value = data.session;
      user.value = data.user;
      return {
        success: true,
        user: data.user,
        needsConfirmation: !data.session, // 若开启了邮箱确认
      };
    } catch (err: any) {
      return { success: false, message: err.message || '注册失败，请稍后重试' };
    } finally {
      loading.value = false;
    }
  }

  /**
   * 退出登录
   */
  async function signOut() {
    loading.value = true;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      session.value = null;
      user.value = null;
    } catch (err) {
      console.error('注销登录失败:', err);
    } finally {
      loading.value = false;
    }
  }

  /**
   * 获取当前有效 Token
   */
  function getAccessToken(): string | null {
    return session.value?.access_token || null;
  }

  return {
    user,
    session,
    loading,
    isInitialized,
    isAuthenticated,
    userEmail,
    initAuth,
    signIn,
    signUp,
    signOut,
    getAccessToken,
  };
});
