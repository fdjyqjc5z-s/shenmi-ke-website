<template>
  <section>
    <div class="page-head">
      <div>
        <h1 class="section-title">任务管理</h1>
        <p class="muted">发布任务、设置奖励和押金，并审核用户提交的任务进度。</p>
      </div>
      <button class="action-btn" @click="openCreateForm">发布新任务</button>
    </div>

    <div class="tab-card glass-card">
      <button class="tab-btn" :class="{ active: activeTab === 'tasks' }" @click="activeTab = 'tasks'">任务列表</button>
      <button class="tab-btn" :class="{ active: activeTab === 'submissions' }" @click="activeTab = 'submissions'">提交审核</button>
    </div>

    <template v-if="activeTab === 'tasks'">
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
    </template>

    <template v-else>
      <div class="glass-card toolbar">
        <select class="form-input" v-model="submissionFilters.status" @change="fetchSubmissions(1)">
          <option value="">全部提交</option>
          <option value="submitted">待审核</option>
          <option value="approved">已通过</option>
          <option value="rejected">已拒绝</option>
        </select>
        <button class="action-btn" @click="fetchSubmissions(1)">刷新提交</button>
      </div>

      <div v-if="errorMessage" class="glass-card danger-card">{{ errorMessage }}</div>
      <div v-if="submissionLoading" class="glass-card">正在读取任务提交...</div>

      <div v-else>
        <div v-if="submissions.length === 0" class="glass-card muted">暂无任务提交记录</div>

        <div class="list-card submission-card" v-for="item in submissions" :key="item.id">
          <div style="flex: 1; min-width: 0;">
            <div class="badge-row">
              <span class="badge">{{ submissionStatusText(item.status) }}</span>
              <span class="badge">进度 {{ item.progress_percent }}%</span>
              <span v-if="item.deposit_status === 'frozen'" class="badge">押金冻结中</span>
            </div>
            <h3>{{ item.title }}</h3>
            <p class="muted">用户：{{ item.nickname || item.username || '--' }} | 编码：{{ item.user_code || '--' }}</p>
            <p class="muted">奖励：{{ item.reward_amount }} 元 + {{ item.reward_points }} 积分</p>
            <p class="muted">押金：{{ item.deposit_amount || 0 }} {{ item.deposit_type === 'points' ? '积分' : '元' }} | 状态：{{ item.deposit_status || '--' }}</p>
            <p class="muted">提交时间：{{ formatTime(item.created_at) }}</p>
            <pre class="submission-content">{{ item.content || '无文字说明' }}</pre>
            <p v-if="item.review_comment" class="muted">审核备注：{{ item.review_comment }}</p>
          </div>

          <div class="row-actions">
            <button class="action-btn" :disabled="item.status !== 'submitted'" @click="openReview(item, 'approved')">通过并发奖</button>
            <button class="action-btn ghost-btn" :disabled="item.status !== 'submitted'" @click="openReview(item, 'rejected')">拒绝</button>
          </div>
        </div>

        <div class="pagination glass-card">
          <button class="action-btn ghost-btn" :disabled="submissionPagination.page <= 1" @click="fetchSubmissions(submissionPagination.page - 1)">上一页</button>
          <span>第 {{ submissionPagination.page }} / {{ submissionPagination.totalPages || 1 }} 页，共 {{ submissionPagination.total }} 条</span>
          <button class="action-btn ghost-btn" :disabled="submissionPagination.page >= submissionPagination.totalPages" @click="fetchSubmissions(submissionPagination.page + 1)">下一页</button>
        </div>
      </div>
    </template>

    <div v-if="reviewPanelVisible" class="modal-mask">
      <div class="glass-card modal-card">
        <h2>{{ reviewForm.action === 'approved' ? '通过任务提交' : '拒绝任务提交' }}</h2>
        <p class="muted">任务：{{ activeSubmission?.title }}</p>
        <p class="muted">用户：{{ activeSubmission?.nickname || activeSubmission?.username || '--' }}</p>
        <textarea class="form-input" v-model="reviewForm.reviewComment" placeholder="审核备注，用户可见"></textarea>
        <div class="form-actions">
          <button class="action-btn" @click="submitReview">
            {{ reviewForm.action === 'approved' ? '确认通过并发放奖励' : '确认拒绝' }}
          </button>
          <button class="action-btn ghost-btn" @click="closeReview">取消</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue';
import http from '../utils/http.js';

const activeTab = ref('tasks');
const loading = ref(false);
const submissionLoading = ref(false);
const errorMessage = ref('');
const showForm = ref(false);
const editingId = ref(null);
const tasks = ref([]);
const submissions = ref([]);
const reviewPanelVisible = ref(false);
const activeSubmission = ref(null);

const filters = reactive({ status: '' });
const submissionFilters = reactive({ status: 'submitted', pageSize: 20 });
const submissionPagination = reactive({ page: 1, pageSize: 20, total: 0, totalPages: 1 });

const reviewForm = reactive({
  action: 'approved',
  reviewComment: ''
});

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

function submissionStatusText(status) {
  const map = { submitted: '待审核', approved: '已通过', rejected: '已拒绝' };
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

async function fetchSubmissions(page = submissionPagination.page) {
  submissionLoading.value = true;
  errorMessage.value = '';
  try {
    const resp = await http.get('/admin/task-submissions', {
      params: {
        status: submissionFilters.status,
        page,
        pageSize: submissionFilters.pageSize
      }
    });
    const data = resp.data.data || {};
    submissions.value = data.list || [];
    Object.assign(submissionPagination, data.pagination || { page, pageSize: submissionFilters.pageSize, total: 0, totalPages: 1 });
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '任务提交读取失败';
  } finally {
    submissionLoading.value = false;
  }
}

function openReview(item, action) {
  activeSubmission.value = item;
  reviewForm.action = action;
  reviewForm.reviewComment = action === 'approved' ? '任务完成合格，奖励已发放' : '任务提交未达标，请按要求重新完成';
  reviewPanelVisible.value = true;
}

function closeReview() {
  activeSubmission.value = null;
  reviewPanelVisible.value = false;
  reviewForm.action = 'approved';
  reviewForm.reviewComment = '';
}

async function submitReview() {
  if (!activeSubmission.value) return;
  errorMessage.value = '';
  try {
    await http.patch('/admin/task-submissions/' + activeSubmission.value.id + '/review', {
      action: reviewForm.action,
      reviewComment: reviewForm.reviewComment
    });
    closeReview();
    await fetchSubmissions(submissionPagination.page);
    await fetchTasks();
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '任务审核失败';
  }
}

watch(activeTab, (tab) => {
  if (tab === 'submissions') fetchSubmissions(1);
});

onMounted(async () => {
  await fetchTasks();
});
</script>

<style scoped>
.page-head,
.toolbar,
.badge-row,
.row-actions,
.form-actions,
.check-row,
.pagination,
.tab-card {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-head {
  justify-content: space-between;
  margin-bottom: 14px;
}

.tab-card,
.toolbar,
.task-form {
  margin-bottom: 14px;
}

.tab-btn {
  min-height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.68);
  font-weight: 800;
  cursor: pointer;
}

.tab-btn.active {
  color: #080813;
  background: linear-gradient(135deg, #ffffff, #9f88ff 55%, #43e8ff);
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

.submission-card {
  align-items: flex-start;
}

.submission-content {
  white-space: pre-wrap;
  word-break: break-word;
  margin: 8px 0 12px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(0,0,0,0.22);
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(245,242,255,0.82);
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
  width: min(92vw, 480px);
}

.danger-card {
  margin-bottom: 14px;
}

button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
