<template>
  <section>
    <div class="page-head">
      <div>
        <h1 class="section-title">提现管理</h1>
        <p class="muted">审核用户提现申请，支持通过、拒绝和标记已打款。</p>
      </div>
      <button class="action-btn" @click="fetchWithdraws(1)">刷新</button>
    </div>

    <div class="glass-card toolbar">
      <input class="form-input" v-model="filters.keyword" placeholder="搜索提现号 / 用户名 / 用户编码" @keyup.enter="fetchWithdraws(1)" />
      <select class="form-input" v-model="filters.status" @change="fetchWithdraws(1)">
        <option value="">全部状态</option>
        <option value="pending">待审核</option>
        <option value="approved">已通过</option>
        <option value="rejected">已拒绝</option>
        <option value="paid">已打款</option>
      </select>
      <button class="action-btn" @click="fetchWithdraws(1)">查询</button>
    </div>

    <div v-if="errorMessage" class="glass-card danger-card">{{ errorMessage }}</div>
    <div v-if="loading" class="glass-card">正在读取提现申请...</div>

    <div v-else>
      <div class="list-card" v-for="item in withdraws" :key="item.id">
        <div style="flex: 1; min-width: 0;">
          <div class="badge-row">
            <span class="badge">{{ statusText(item.status) }}</span>
            <span class="badge">{{ methodText(item.withdraw_method) }}</span>
          </div>
          <h3>{{ item.withdraw_no }}</h3>
          <p class="muted">用户：{{ item.username || '--' }} | 编码：{{ item.user_code || '--' }}</p>
          <p class="muted">金额：{{ item.amount }} 元 | 收款人：{{ item.account_name || '--' }}</p>
          <p class="muted">收款账号：{{ item.account_no || '--' }}</p>
          <p class="muted">申请时间：{{ formatTime(item.created_at) }} | 审核时间：{{ formatTime(item.audit_time) }}</p>
          <p v-if="item.reject_reason" class="muted">拒绝原因：{{ item.reject_reason }}</p>
        </div>

        <div class="row-actions">
          <button class="action-btn ghost-btn" :disabled="item.status !== 'pending'" @click="review(item, 'approved')">通过</button>
          <button class="action-btn ghost-btn" :disabled="!['pending', 'approved'].includes(item.status)" @click="openReject(item)">拒绝</button>
          <button class="action-btn" :disabled="item.status !== 'approved'" @click="review(item, 'paid')">已打款</button>
        </div>
      </div>

      <div class="pagination glass-card">
        <button class="action-btn ghost-btn" :disabled="pagination.page <= 1" @click="fetchWithdraws(pagination.page - 1)">上一页</button>
        <span>第 {{ pagination.page }} / {{ pagination.totalPages || 1 }} 页，共 {{ pagination.total }} 条</span>
        <button class="action-btn ghost-btn" :disabled="pagination.page >= pagination.totalPages" @click="fetchWithdraws(pagination.page + 1)">下一页</button>
      </div>
    </div>

    <div v-if="rejectPanelVisible" class="modal-mask">
      <div class="glass-card modal-card">
        <h2>拒绝提现</h2>
        <p class="muted">提现号：{{ activeWithdraw?.withdraw_no }}</p>
        <textarea class="form-input" v-model="rejectReason" placeholder="请输入拒绝原因，用户可见"></textarea>
        <div class="form-actions">
          <button class="action-btn" @click="submitReject">确认拒绝</button>
          <button class="action-btn ghost-btn" @click="closeReject">取消</button>
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
const withdraws = ref([]);
const rejectPanelVisible = ref(false);
const activeWithdraw = ref(null);
const rejectReason = ref('');

const filters = reactive({
  keyword: '',
  status: '',
  pageSize: 20
});

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 1
});

function statusText(status) {
  const map = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
    paid: '已打款'
  };
  return map[status] || status;
}

function methodText(method) {
  const map = {
    alipay: '支付宝',
    wechat: '微信',
    manual: '人工处理'
  };
  return map[method] || method || '人工处理';
}

function formatTime(value) {
  if (!value) return '--';
  return String(value).replace('T', ' ').slice(0, 19);
}

async function fetchWithdraws(page = pagination.page) {
  loading.value = true;
  errorMessage.value = '';

  try {
    const resp = await http.get('/admin/withdraws', {
      params: {
        keyword: filters.keyword,
        status: filters.status,
        page,
        pageSize: filters.pageSize
      }
    });

    const data = resp.data.data || {};
    withdraws.value = data.list || [];
    Object.assign(pagination, data.pagination || { page, pageSize: filters.pageSize, total: 0, totalPages: 1 });
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '提现列表读取失败';
  } finally {
    loading.value = false;
  }
}

async function review(item, status, rejectReasonValue = '') {
  errorMessage.value = '';
  try {
    await http.patch('/admin/withdraws/' + item.id + '/status', {
      status,
      rejectReason: rejectReasonValue
    });
    await fetchWithdraws(pagination.page);
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '提现状态更新失败';
  }
}

function openReject(item) {
  activeWithdraw.value = item;
  rejectReason.value = '';
  rejectPanelVisible.value = true;
}

function closeReject() {
  rejectPanelVisible.value = false;
  activeWithdraw.value = null;
  rejectReason.value = '';
}

async function submitReject() {
  if (!activeWithdraw.value) return;
  await review(activeWithdraw.value, 'rejected', rejectReason.value || '提现审核未通过');
  closeReject();
}

onMounted(() => fetchWithdraws(1));
</script>

<style scoped>
.page-head,
.toolbar,
.pagination,
.badge-row,
.row-actions,
.form-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-head {
  justify-content: space-between;
  margin-bottom: 14px;
}

.toolbar {
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.toolbar .form-input {
  max-width: 280px;
  margin-bottom: 0;
}

.row-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  max-width: 260px;
}

.pagination {
  justify-content: center;
  margin-top: 16px;
}

.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  background: rgba(3, 3, 12, 0.72);
  backdrop-filter: blur(10px);
}

.modal-card {
  width: min(92vw, 460px);
}

.danger-card {
  margin-bottom: 14px;
}

button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
