<template>
  <section>
    <div class="page-head">
      <div>
        <h1 class="section-title">任务管理</h1>
        <p class="muted">发布任务、设置奖励和押金，并管理任务状态。</p>
      </div>
      <button class="action-btn" @click="openCreateForm">发布新任务</button>
    </div>

    <div class="glass-card toolbar">
      <select class="form-input" v-model="filters.status" @change="fetchTasks">
        <option value="">全部状态</option>
        <option value="pending">待发布</option>
        <option value="open">进行中</option>
        <option value="closed">已关闭</option>
        <option value="cancelled">已取消</option>
      </select>
      <button class="action-btn" @click="fetchTasks">查询</button>
    </div>

    <div v-if="showForm" class="glass-card task-form">
      <h2>{{ editingId ? '编辑任务' : '发布任务' }}</h2>
      <div class="form-grid">
        <input class="form-input" v-model="form.title" placeholder="任务标题" />
        <input class="form-input" v-model="form.deadline" type="datetime-local" placeholder="截止时间" />
        <input class="form-input" v-model.number="form.rewardAmount" type="number" min="0" placeholder="余额奖励" />
        <input class="form-input" v-model.number="form.rewardPoints" type="number" min="0" placeholder="积分奖励" />
        <input class="form-input" v-model.number="form.maxAcceptCount" type="number" min="1" placeholder="最大接单人数" />
        <select class="form-input" v-model="form.status">
          <option value="pending">待发布</option>
          <option value="open">开放接单</option>
          <option value="closed">关闭</option>
          <option value="cancelled">取消</option>
        </select>
        <select class="form-input" v-model="form.depositType">
          <option value="none">无押金</option>
          <option value="points">积分押金</option>
          <option value="balance">余额押金</option>
        </select>
        <input class="form-input" v-model.number="form.depositAmount" type="number" min="0" placeholder="押金金额" />
      </div>
      <textarea class="form-input" v-model="form.content" placeholder="任务说明、提交要求、验收标准"></textarea>
      <div class="check-row">
        <label><input type="checkbox" v-model="form.vipOnly" /> VIP 专属任务</label>
        <label><input type="checkbox" v-model="form.depositRequired" /> 需要押金</label>
      </div>
      <div class="form-actions">
        <button class="action-btn" @click="submitTask">保存任务</button>
        <button class="action-btn ghost-btn" @click="closeForm">取消</button>
      </div>
    </div>

    <div v-if="errorMessage" class="glass-card danger-card">{{ errorMessage }}</div>
    <div v-if="loading" class="glass-card">正在读取任务...</div>

    <div v-else>
      <div class="list-card" v-for="task in tasks" :key="task.id">
        <div style="flex: 1; min-width: 0;">
          <div class="badge-row">
            <span class="badge">{{ statusText(task.status) }}</span>
            <span v-if="task.vip_only" class="badge">VIP</span>
            <span v-if="task.deposit_required" class="badge">{{ depositText(task.deposit_type) }}押金</span>
          </div>
          <h3>{{ task.title }}</h3>
          <p class="muted">奖励：{{ task.reward_amount }} 元 + {{ task.reward_points }} 积分</p>
          <p class="muted">接单：{{ task.current_accept_count }} / {{ task.max_accept_count }} | 截止：{{ formatTime(task.deadline) }}</p>
          <p class="muted">押金：{{ task.deposit_required ? task.deposit_amount : 0 }} | 创建：{{ formatTime(task.created_at) }}</p>
        </div>

        <div class="row-actions">
          <button class="action-btn ghost-btn" @click="updateStatus(task, 'pending')">待发布</button>
          <button class="action-btn" @click="updateStatus(task, 'open')">开放</button>
          <button class="action-btn ghost-btn" @click="updateStatus(task, 'closed')">关闭</button>
          <button class="action-btn ghost-btn" @click="updateStatus(task, 'cancelled')">取消</button>
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
const showForm = ref(false);
const editingId = ref(null);
const tasks = ref([]);

const filters = reactive({ status: '' });

const emptyForm = () => ({
  title: '',
  content: '',
  rewardAmount: 0,
  rewardPoints: 0,
  maxAcceptCount: 1,
  deadline: '',
  vipOnly: false,
  depositRequired: false,
  depositType: 'none',
  depositAmount: 0,
  status: 'pending'
});

const form = reactive(emptyForm());

function resetForm() {
  Object.assign(form, emptyForm());
  editingId.value = null;
}

function openCreateForm() {
  resetForm();
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  resetForm();
}

function statusText(status) {
  const map = { pending: '待发布', open: '进行中', closed: '已关闭', cancelled: '已取消' };
  return map[status] || status;
}

function depositText(type) {
  const map = { none: '无', points: '积分', balance: '余额' };
  return map[type] || type;
}

function formatTime(value) {
  if (!value) return '--';
  return String(value).replace('T', ' ').slice(0, 19);
}

async function fetchTasks() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const resp = await http.get('/admin/tasks', { params: { status: filters.status } });
    tasks.value = resp.data.data || [];
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '任务列表读取失败';
  } finally {
    loading.value = false;
  }
}

async function submitTask() {
  errorMessage.value = '';
  try {
    const payload = {
      ...form,
      deadline: form.deadline ? form.deadline.replace('T', ' ') + ':00' : null
    };
    await http.post('/admin/tasks', payload);
    closeForm();
    await fetchTasks();
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '任务保存失败';
  }
}

async function updateStatus(task, status) {
  errorMessage.value = '';
  try {
    await http.patch('/admin/tasks/' + task.id + '/status', { status });
    await fetchTasks();
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '任务状态更新失败';
  }
}

onMounted(fetchTasks);
</script>

<style scoped>
.page-head,
.toolbar,
.badge-row,
.row-actions,
.form-actions,
.check-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-head {
  justify-content: space-between;
  margin-bottom: 14px;
}

.toolbar,
.task-form {
  margin-bottom: 14px;
}

.toolbar .form-input {
  max-width: 220px;
  margin-bottom: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.check-row {
  margin: 10px 0 14px;
  color: rgba(245, 242, 255, 0.72);
}

.row-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  max-width: 280px;
}

.danger-card {
  margin-bottom: 14px;
}
</style>
