<template>
  <section>
    <div class="page-head">
      <div>
        <h1 class="section-title">用户管理</h1>
        <p class="muted">查看用户身份编码、账号状态、提现权限、VIP 信息和一级分销关系。</p>
      </div>
      <button class="action-btn" @click="fetchUsers(1)">刷新</button>
    </div>

    <div class="glass-card toolbar">
      <input class="form-input" v-model="filters.keyword" placeholder="搜索用户名 / 昵称 / 用户编码 / 邀请码 / 上级" @keyup.enter="fetchUsers(1)" />
      <select class="form-input" v-model="filters.status" @change="fetchUsers(1)">
        <option value="">全部状态</option>
        <option value="normal">正常</option>
        <option value="frozen">冻结</option>
        <option value="banned">封禁</option>
      </select>
      <button class="action-btn" @click="fetchUsers(1)">查询</button>
    </div>

    <div v-if="errorMessage" class="glass-card danger-card">{{ errorMessage }}</div>
    <div v-if="loading" class="glass-card">正在读取用户...</div>

    <div v-else>
      <div class="list-card" v-for="user in users" :key="user.id">
        <div style="flex: 1; min-width: 0;">
          <div class="badge-row">
            <span class="badge">{{ statusText(user.status) }}</span>
            <span v-if="user.vip_level_id" class="badge">VIP {{ user.vip_level_id }}</span>
            <span v-if="user.withdraw_status !== 'normal'" class="badge">提现受限</span>
            <span class="badge">下级 {{ user.level1_child_count || 0 }} 人</span>
          </div>
          <h3>{{ user.nickname || user.username }}</h3>
          <p class="muted">账号：{{ user.username }} | 编码：{{ user.user_code }}</p>
          <p class="muted">自己的邀请码：{{ user.invite_code }} | 注册时间：{{ formatTime(user.created_at) }}</p>
          <p class="muted">绑定上级：{{ inviterText(user) }}</p>
          <p class="muted">VIP到期：{{ user.vip_expire_at || '未开通' }}</p>
        </div>

        <div class="row-actions">
          <button class="action-btn ghost-btn" @click="setStatus(user, 'normal')">正常</button>
          <button class="action-btn ghost-btn" @click="setStatus(user, 'frozen')">冻结</button>
          <button class="action-btn" @click="setStatus(user, 'banned')">封禁</button>
          <button class="action-btn" @click="openVipForm(user)">VIP</button>
        </div>
      </div>

      <div class="pagination glass-card">
        <button class="action-btn ghost-btn" :disabled="pagination.page <= 1" @click="fetchUsers(pagination.page - 1)">上一页</button>
        <span>第 {{ pagination.page }} / {{ pagination.totalPages || 1 }} 页，共 {{ pagination.total }} 人</span>
        <button class="action-btn ghost-btn" :disabled="pagination.page >= pagination.totalPages" @click="fetchUsers(pagination.page + 1)">下一页</button>
      </div>
    </div>

    <div v-if="vipPanelVisible" class="modal-mask">
      <div class="glass-card modal-card">
        <h2>设置 VIP</h2>
        <p class="muted">用户：{{ activeUser?.username }} / {{ activeUser?.user_code }}</p>
        <input class="form-input" v-model.number="vipForm.vipLevelId" type="number" min="0" placeholder="VIP等级ID，0表示取消" />
        <input class="form-input" v-model="vipForm.vipExpireAt" type="datetime-local" placeholder="VIP到期时间" />
        <div class="form-actions">
          <button class="action-btn" @click="submitVip">保存</button>
          <button class="action-btn ghost-btn" @click="closeVipForm">取消</button>
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
const users = ref([]);
const vipPanelVisible = ref(false);
const activeUser = ref(null);

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

const vipForm = reactive({
  vipLevelId: 1,
  vipExpireAt: ''
});

function statusText(status) {
  const map = { normal: '正常', frozen: '冻结', banned: '封禁' };
  return map[status] || status;
}

function inviterText(user) {
  if (!user.invited_by_user_id) return '未绑定上级';
  return `${user.inviter_nickname || user.inviter_username || '上级用户'}｜编码 ${user.inviter_user_code || '--'}｜邀请码 ${user.inviter_invite_code || '--'}`;
}

function formatTime(value) {
  if (!value) return '--';
  return String(value).replace('T', ' ').slice(0, 19);
}

async function fetchUsers(page = pagination.page) {
  loading.value = true;
  errorMessage.value = '';
  try {
    const resp = await http.get('/admin/users', {
      params: {
        keyword: filters.keyword,
        status: filters.status,
        page,
        pageSize: filters.pageSize
      }
    });
    const data = resp.data.data || {};
    users.value = data.list || [];
    Object.assign(pagination, data.pagination || { page, pageSize: filters.pageSize, total: 0, totalPages: 1 });
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '用户列表读取失败';
  } finally {
    loading.value = false;
  }
}

async function setStatus(user, status) {
  errorMessage.value = '';
  try {
    await http.patch('/admin/users/' + user.id + '/status', { status });
    await fetchUsers(pagination.page);
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '用户状态更新失败';
  }
}

function openVipForm(user) {
  activeUser.value = user;
  vipForm.vipLevelId = Number(user.vip_level_id || 1);
  vipForm.vipExpireAt = user.vip_expire_at ? String(user.vip_expire_at).slice(0, 16) : '';
  vipPanelVisible.value = true;
}

function closeVipForm() {
  vipPanelVisible.value = false;
  activeUser.value = null;
  vipForm.vipLevelId = 1;
  vipForm.vipExpireAt = '';
}

async function submitVip() {
  if (!activeUser.value) return;
  errorMessage.value = '';
  try {
    await http.patch('/admin/users/' + activeUser.value.id + '/vip', {
      vipLevelId: vipForm.vipLevelId,
      vipExpireAt: vipForm.vipExpireAt ? vipForm.vipExpireAt.replace('T', ' ') + ':00' : null
    });
    closeVipForm();
    await fetchUsers(pagination.page);
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'VIP信息更新失败';
  }
}

onMounted(() => fetchUsers(1));
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
  max-width: 320px;
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
  width: min(92vw, 420px);
}

.danger-card {
  margin-bottom: 14px;
}

button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
