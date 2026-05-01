<template>
  <section>
    <div class="page-head">
      <div>
        <h1 class="section-title">订单管理</h1>
        <p class="muted">查看订单、筛选状态、更新订单流转状态，并手动触发分销返利。</p>
      </div>
      <button class="action-btn" @click="fetchOrders">刷新</button>
    </div>

    <div class="glass-card toolbar">
      <select class="form-input" v-model="filters.status" @change="fetchOrders">
        <option value="">全部状态</option>
        <option value="pending">待处理</option>
        <option value="paid">已支付</option>
        <option value="shipped">已发货</option>
        <option value="completed">已完成</option>
        <option value="cancelled">已取消</option>
      </select>
      <button class="action-btn" @click="fetchOrders">查询</button>
    </div>

    <div v-if="errorMessage" class="glass-card danger-card">{{ errorMessage }}</div>
    <div v-if="successMessage" class="glass-card success-card">{{ successMessage }}</div>
    <div v-if="loading" class="glass-card">正在读取订单...</div>

    <div v-else>
      <div class="list-card" v-for="item in orders" :key="item.id">
        <div style="flex: 1; min-width: 0;">
          <div class="badge-row">
            <span class="badge">{{ statusText(item.status) }}</span>
            <span class="badge">{{ payText(item.pay_status) }}</span>
            <span class="badge">返利 {{ item.distribution_reward_total || 0 }} 元 / {{ item.distribution_reward_count || 0 }} 笔</span>
          </div>
          <h3>{{ item.order_no }}</h3>
          <p class="muted">用户：{{ item.username || '--' }} | 编码：{{ item.user_code || '--' }}</p>
          <p class="muted">绑定上级：{{ inviterText(item) }}</p>
          <p class="muted">金额：{{ item.total_amount }} 元 | 使用积分：{{ item.points_used }} | 奖励积分：{{ item.points_reward }}</p>
          <p class="muted">收货人：{{ item.receiver_name || '--' }} | 电话：{{ item.receiver_phone || '--' }}</p>
          <p class="muted">地址：{{ item.receiver_address || '--' }}</p>
        </div>

        <div class="row-actions">
          <button class="action-btn ghost-btn" @click="updateStatus(item, 'paid')">已支付</button>
          <button class="action-btn ghost-btn" @click="updateStatus(item, 'shipped')">已发货</button>
          <button class="action-btn" @click="updateStatus(item, 'completed')">完成</button>
          <button class="action-btn ghost-btn" @click="applyDistribution(item)">发放返利</button>
          <button class="action-btn ghost-btn" @click="updateStatus(item, 'cancelled')">取消</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import http from '../utils/http.js';

const loading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const orders = ref([]);
const filters = reactive({ status: '' });

function statusText(status) {
  const map = { pending: '待处理', paid: '已支付', shipped: '已发货', completed: '已完成', cancelled: '已取消' };
  return map[status] || status;
}

function payText(status) {
  const map = { unpaid: '未支付', paid: '已支付', refunded: '已退款' };
  return map[status] || status;
}

function inviterText(item) {
  if (!item.inviter_user_code) return '未绑定上级';
  return `${item.inviter_nickname || item.inviter_username || '上级用户'}｜编码 ${item.inviter_user_code || '--'}｜邀请码 ${item.inviter_invite_code || '--'}`;
}

async function fetchOrders() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const resp = await http.get('/admin/orders', { params: { status: filters.status } });
    orders.value = resp.data.data || [];
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '订单列表读取失败';
  } finally {
    loading.value = false;
  }
}

async function updateStatus(order, status) {
  errorMessage.value = '';
  successMessage.value = '';
  try {
    const resp = await http.patch('/admin/orders/' + order.id + '/status', { status });
    successMessage.value = resp.data?.message || '订单状态已更新';
    await fetchOrders();
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '订单状态更新失败';
  }
}

async function applyDistribution(order) {
  errorMessage.value = '';
  successMessage.value = '';
  try {
    const resp = await http.post('/admin/orders/' + order.id + '/distribution/apply');
    successMessage.value = resp.data?.message || '返利处理完成';
    await fetchOrders();
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '返利发放失败';
  }
}

onMounted(fetchOrders);
</script>

<style scoped>
.page-head, .toolbar, .badge-row, .row-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.page-head { justify-content: space-between; margin-bottom: 14px; }
.toolbar { margin-bottom: 14px; flex-wrap: wrap; }
.toolbar .form-input { max-width: 220px; margin-bottom: 0; }
.row-actions { flex-wrap: wrap; justify-content: flex-end; max-width: 300px; }
.danger-card { color: #ffb4c1; border-color: rgba(255, 80, 120, 0.35); margin-bottom: 14px; }
.success-card { color: #b9ffdd; border-color: rgba(80, 255, 174, 0.35); margin-bottom: 14px; }
</style>
