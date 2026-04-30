<template>
  <router-view v-if="isPublicPage" />

  <div v-else class="admin-shell">
    <aside class="sidebar">
      <div class="brand-block">
        <div class="brand">神秘客</div>
        <div class="brand-sub">后台控制台</div>
      </div>

      <nav class="side-nav">
        <RouterLink to="/admin/dashboard" class="nav-item">仪表盘</RouterLink>
        <RouterLink to="/admin/products" class="nav-item">商品管理</RouterLink>
        <RouterLink to="/admin/orders" class="nav-item">订单管理</RouterLink>
        <RouterLink to="/admin/tasks" class="nav-item">任务管理</RouterLink>
        <RouterLink to="/admin/users" class="nav-item">用户管理</RouterLink>
        <RouterLink to="/admin/withdraws" class="nav-item">提现管理</RouterLink>
        <RouterLink to="/admin/announcements" class="nav-item">公告管理</RouterLink>
        <RouterLink to="/admin/ai" class="nav-item">AI 助手</RouterLink>
      </nav>

      <button class="logout-btn" @click="logout">退出后台</button>
    </aside>

    <main class="admin-main">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const isPublicPage = computed(() => Boolean(route.meta.public));

function logout() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
  router.replace('/admin/login');
}
</script>

<style scoped>
.logout-btn {
  margin-top: auto;
  width: 100%;
  min-height: 40px;
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 14px;
  background: rgba(255,255,255,0.08);
  color: #fff;
  font-weight: 800;
  cursor: pointer;
}
</style>
