<template>
  <section>
    <div class="hero-card">
      <div class="brand-kicker">仪表盘</div>
      <h1 class="brand-title"><span>神秘客后台</span></h1>
      <p class="muted">核心统计信息一览，快速查看订单、用户、商品、任务和提现动态。</p>
    </div>

    <div v-if="loading" class="glass-card" style="margin-top:14px;">
      <p class="muted">正在读取后台数据...</p>
    </div>

    <div v-else class="grid-3" style="margin-top:14px;">
      <div class="stat-card">
        <div class="stat-label">总用户数</div>
        <div class="stat-value">{{ stats.total_users }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">总订单数</div>
        <div class="stat-value">{{ stats.total_orders }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">总商品数</div>
        <div class="stat-value">{{ stats.total_products }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">待审核任务</div>
        <div class="stat-value">{{ stats.pending_tasks }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">待审核提现</div>
        <div class="stat-value">{{ stats.pending_withdraws }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">系统状态</div>
        <div class="stat-value">运行中</div>
      </div>
    </div>

    <div v-if="errorMessage" class="glass-card danger-card" style="margin-top:14px;">
      {{ errorMessage }}
    </div>

    <h2 class="section-title">快捷入口</h2>
    <div class="grid-3" style="margin-top:14px;">
      <RouterLink to="/admin/products" class="action-btn">商品管理</RouterLink>
      <RouterLink to="/admin/orders" class="action-btn">订单管理</RouterLink>
      <RouterLink to="/admin/users" class="action-btn">用户管理</RouterLink>
    </div>

    <h2 class="section-title">AI 助手</h2>
    <div class="glass-card">
      <p class="muted">AI 助手可辅助生成商品、任务、回复用户消息，所有操作需人工确认。</p>
      <RouterLink to="/admin/ai" class="action-btn" style="margin-top:12px;">进入 AI 助手</RouterLink>
    </div>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import axios from 'axios';

const loading = ref(false);
const errorMessage = ref('');

const stats = reactive({
  total_users: 0,
  total_orders: 0,
  total_products: 0,
  pending_tasks: 0,
  pending_withdraws: 0
});

async function fetchStats() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const token = localStorage.getItem('admin_token');
    const resp = await axios.get('/api/admin/dashboard/stats', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    Object.assign(stats, resp.data.data || {});
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '仪表盘数据读取失败，请确认已登录后台';
  } finally {
    loading.value = false;
  }
}

onMounted(fetchStats);
</script>
