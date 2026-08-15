import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import LoginView from '../views/Login.vue';
import HomeView from '../views/Home.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { requiresGuest: true },
  },
  {
    path: '/',
    name: 'Home',
    component: HomeView,
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 全局路由守卫
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  // 确保 Auth 状态已经初始化
  if (!authStore.isInitialized) {
    await authStore.initAuth();
  }

  // 需要登录但未登录 -> 重定向到登录页
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } });
    return;
  }

  // 访客页面（如登录页）已登录 -> 重定向到首页
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next({ name: 'Home' });
    return;
  }

  next();
});
