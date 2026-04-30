<template>
  <section>
    <div class="hero-card">
      <div class="brand-kicker">TASK HALL</div>
      <h1 class="brand-title"><span>任务大厅</span></h1>
      <p class="muted">只接任务，不发任务。任务由平台统一发布，完成后获得积分或余额奖励。</p>
    </div>

    <div class="glass-card filter-bar">
      <button class="filter-btn" :class="{ active: filters.type === 'all' }" @click="changeType('all')">全部</button>
      <button class="filter-btn" :class="{ active: filters.type === 'normal' }" @click="changeType('normal')">普通</button>
      <button class="filter-btn" :class="{ active: filters.type === 'deposit' }" @click="changeType('deposit')">押金</button>
      <button class="filter-btn" :class="{ active: filters.type === 'vip' }" @click="changeType('vip')">VIP</button>
    </div>

    <div v-if="errorMessage" class="glass-card error-text">{{ errorMessage }}</div>
    <div v-if="successMessage" class="glass-card success-text">{{ successMessage }}</div>
    <div v-if="loading" class="glass-card">正在读取任务...</div>

    <template v-else>
      <h2 class="section-title">可接任务</h2>
      <div v-if="tasks.length === 0" class="glass-card muted">暂无开放任务</div>

      <div class="list-card task-card" v-for="task in tasks" :key="task.id">
        <div style="flex:1; min-width:0;">
          <div class="badge-row">
            <div class="badge">{{ task.vip_only ? 'VIP任务' : '普通任务' }}</div>
            <div v-if="task.deposit_required" class="badge">{{ depositText(task.deposit_type) }}押金</div>
          </div>
          <h3>{{ task.title }}</h3>
          <p class="muted clamp-text">{{ task.content || '暂无任务说明' }}</p>
          <p class="muted">奖励：{{ task.reward_amount }} 元 + {{ task.reward_points }} 积分</p>
          <p class="muted">名额：{{ task.current_accept_count }} / {{ task.max_accept_count }} | 截止：{{ formatTime(task.deadline) }}</p>
          <p v-if="task.deposit_required" class="muted">押金：{{ task.deposit_amount }} {{ task.deposit_type === 'points' ? '积分' : '元' }}</p>
        </div>
        <div class="action-stack">
          <button class="action-btn ghost-btn" @click="openDetail(task)">详情</button>
          <button class="action-btn" @click="acceptTask(task)">接任务</button>
        </div>
      </div>

      <div class="glass-card pager">
        <button class="action-btn ghost-btn" :disabled="pagination.page <= 1" @click="fetchTasks(pagination.page - 1)">上一页</button>
        <span>第 {{ pagination.page }} / {{ pagination.totalPages || 1 }} 页</span>
        <button class="action-btn ghost-btn" :disabled="pagination.page >= pagination.totalPages" @click="fetchTasks(pagination.page + 1)">下一页</button>
      </div>

      <h2 class="section-title">我已接的任务</h2>
      <div v-if="!isLogin" class="glass-card muted">
        登录后可查看已接任务。
        <RouterLink to="/login" class="action-btn" style="width:100%; margin-top:12px;">去登录</RouterLink>
      </div>
      <div v-else-if="myAccepts.length === 0" class="glass-card muted">你还没有接取任务</div>
      <div v-else class="list-card" v-for="item in myAccepts" :key="item.id">
        <div style="flex:1;">
          <div class="badge">{{ acceptStatusText(item.status) }}</div>
          <h3>{{ item.title }}</h3>
          <p class="muted">奖励：{{ item.reward_amount }} 元 + {{ item.reward_points }} 积分</p>
          <p class="muted">押金：{{ item.deposit_status }} | 截止：{{ formatTime(item.deadline) }}</p>
        </div>
      </div>
    </template>

    <div v-if="detailVisible" class="modal-mask">
      <div class="glass-card modal-card">
        <div class="badge-row">
          <div class="badge">任务详情</div>
          <div v-if="activeTask?.vip_only" class="badge">VIP</div>
          <div v-if="activeTask?.deposit_required" class="badge">押金</div>
        </div>
        <h2>{{ activeTask?.title }}</h2>
        <p class="muted pre-text">{{ activeTask?.content || '暂无详细说明' }}</p>
        <p class="muted">奖励：{{ activeTask?.reward_amount }} 元 + {{ activeTask?.reward_points }} 积分</p>
        <p class="muted">接单名额：{{ activeTask?.current_accept_count }} / {{ activeTask?.max_accept_count }}</p>
        <p class="muted">截止时间：{{ formatTime(activeTask?.deadline) }}</p>
        <p v-if="activeTask?.deposit_required" class="muted">押金要求：{{ activeTask?.deposit_amount }} {{ activeTask?.deposit_type === 'points' ? '积分' : '元' }}</p>
        <div class="modal-actions">
          <button class="action-btn" @click="acceptTask(activeTask)">接取任务</button>
          <button class="action-btn ghost-btn" @click="detailVisible = false">关闭</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import http from '../utils/http.js';

const router = useRouter();
const loading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const tasks = ref([]);
const myAccepts = ref([]);
const detailVisible = ref(false);
const activeTask = ref(null);
const isLogin = computed(() => Boolean(localStorage.getItem('user_token')));

const filters = reactive({
  type: 'all',
  pageSize: 20
});

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 1
});

function depositText(type) {
  const map = { none: '无', points: '积分', balance: '余额' };
  return map[type] || type;
}

function acceptStatusText(status) {
  const map = {
    accepted: '已接取',
    in_progress: '进行中',
    submitted: '已提交',
    approved: '已通过',
    rejected: '已拒绝',
    timeout: '已超时',
    cancelled: '已取消'
  };
  return map[status] || status;
}

function formatTime(value) {
  if (!value) return '--';
  return String(value).replace('T', ' ').slice(0, 19);
}

function changeType(type) {
  filters.type = type;
  fetchTasks(1);
}

function openDetail(task) {
  activeTask.value = task;
  detailVisible.value = true;
}

async function fetchTasks(page = pagination.page) {
  loading.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const resp = await http.get('/task/tasks', {
      params: {
        type: filters.type,
        page,
        pageSize: filters.pageSize
      }
    });

    const data = resp.data.data || {};
    tasks.value = data.list || [];
    Object.assign(pagination, data.pagination || { page, pageSize: filters.pageSize, total: 0, totalPages: 1 });
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '任务列表读取失败';
  } finally {
    loading.value = false;
  }
}

async function fetchMyAccepts() {
  if (!isLogin.value) return;

  try {
    const resp = await http.get('/task/my/accepts');
    myAccepts.value = resp.data.data || [];
  } catch {
    myAccepts.value = [];
  }
}

async function acceptTask(task) {
  if (!task) return;
  errorMessage.value = '';
  successMessage.value = '';

  if (!isLogin.value) {
    router.push('/login');
    return;
  }

  try {
    const resp = await http.post('/task/tasks/' + task.id + '/accept');
    successMessage.value = resp.data?.message || '接任务成功';
    detailVisible.value = false;
    await Promise.all([fetchTasks(pagination.page), fetchMyAccepts()]);
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '接任务失败';
  }
}

onMounted(async () => {
  await fetchTasks(1);
  await fetchMyAccepts();
});
</script>

<style scoped>
.filter-bar,
.badge-row,
.pager,
.modal-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-bar {
  flex-wrap: wrap;
  margin-top: 14px;
}

.filter-btn {
  min-height: 38px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.72);
  font-weight: 800;
}

.filter-btn.active {
  color: #080813;
  background: linear-gradient(135deg, #ffffff, #9f88ff 55%, #43e8ff);
}

.task-card {
  align-items: flex-start;
}

.action-stack {
  display: grid;
  gap: 8px;
  min-width: 82px;
}

.clamp-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pager {
  justify-content: center;
  margin-top: 14px;
}

.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(3, 3, 12, 0.72);
  backdrop-filter: blur(10px);
}

.modal-card {
  width: min(100%, 460px);
  max-height: 82vh;
  overflow: auto;
}

.pre-text {
  white-space: pre-wrap;
}

.error-text {
  color: #ffb4c1;
  margin-top: 14px;
}

.success-text {
  color: #b9ffdd;
  margin-top: 14px;
}

button:disabled {
  opacity: 0.5;
}
</style>
