<template>
  <section>
    <div class="page-head">
      <div>
        <h1 class="section-title">公告管理</h1>
        <p class="muted">发布平台公告。状态为「已发布」的公告会展示在用户首页。</p>
      </div>
      <button class="action-btn" @click="openCreateForm">发布公告</button>
    </div>

    <div class="glass-card toolbar">
      <input class="form-input" v-model="filters.keyword" placeholder="搜索公告标题/内容" @keyup.enter="fetchAnnouncements(1)" />
      <select class="form-input" v-model="filters.status" @change="fetchAnnouncements(1)">
        <option value="">全部状态</option>
        <option value="draft">草稿</option>
        <option value="published">已发布</option>
        <option value="hidden">已隐藏</option>
      </select>
      <button class="action-btn" @click="fetchAnnouncements(1)">查询</button>
    </div>

    <div v-if="showForm" class="glass-card announcement-form">
      <h2>{{ editingId ? '编辑公告' : '发布公告' }}</h2>
      <input class="form-input" v-model="form.title" placeholder="公告标题" />
      <textarea class="form-input content-input" v-model="form.content" placeholder="公告内容，会展示在用户首页"></textarea>
      <select class="form-input" v-model="form.status">
        <option value="draft">保存为草稿</option>
        <option value="published">立即发布</option>
        <option value="hidden">隐藏</option>
      </select>
      <div class="form-actions">
        <button class="action-btn" @click="submitAnnouncement">保存公告</button>
        <button class="action-btn ghost-btn" @click="closeForm">取消</button>
      </div>
    </div>

    <div v-if="errorMessage" class="glass-card danger-card">{{ errorMessage }}</div>
    <div v-if="successMessage" class="glass-card success-card">{{ successMessage }}</div>
    <div v-if="loading" class="glass-card">正在读取公告...</div>

    <div v-else>
      <div v-if="announcements.length === 0" class="glass-card muted">暂无公告</div>

      <div class="list-card announcement-card" v-for="item in announcements" :key="item.id">
        <div style="flex:1; min-width:0;">
          <div class="badge-row">
            <span class="badge">{{ statusText(item.status) }}</span>
            <span class="badge">{{ formatTime(item.created_at) }}</span>
          </div>
          <h3>{{ item.title }}</h3>
          <p class="muted content-preview">{{ item.content }}</p>
        </div>

        <div class="row-actions">
          <button class="action-btn ghost-btn" @click="openEditForm(item)">编辑</button>
          <button class="action-btn" @click="updateStatus(item, 'published')">发布</button>
          <button class="action-btn ghost-btn" @click="updateStatus(item, 'hidden')">隐藏</button>
          <button class="action-btn ghost-btn" @click="removeAnnouncement(item)">删除</button>
        </div>
      </div>

      <div class="pagination glass-card">
        <button class="action-btn ghost-btn" :disabled="pagination.page <= 1" @click="fetchAnnouncements(pagination.page - 1)">上一页</button>
        <span>第 {{ pagination.page }} / {{ pagination.totalPages || 1 }} 页，共 {{ pagination.total }} 条</span>
        <button class="action-btn ghost-btn" :disabled="pagination.page >= pagination.totalPages" @click="fetchAnnouncements(pagination.page + 1)">下一页</button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import http from '../utils/http.js';

const loading = ref(false);
const showForm = ref(false);
const editingId = ref(null);
const errorMessage = ref('');
const successMessage = ref('');
const announcements = ref([]);

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

const emptyForm = () => ({
  title: '',
  content: '',
  status: 'published'
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

function openEditForm(item) {
  editingId.value = item.id;
  Object.assign(form, {
    title: item.title || '',
    content: item.content || '',
    status: item.status || 'draft'
  });
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  resetForm();
}

function statusText(status) {
  const map = { draft: '草稿', published: '已发布', hidden: '已隐藏' };
  return map[status] || status;
}

function formatTime(value) {
  if (!value) return '--';
  return String(value).replace('T', ' ').slice(0, 19);
}

async function fetchAnnouncements(page = pagination.page) {
  loading.value = true;
  errorMessage.value = '';
  try {
    const resp = await http.get('/admin/announcements', {
      params: {
        keyword: filters.keyword,
        status: filters.status,
        page,
        pageSize: filters.pageSize
      }
    });
    const data = resp.data.data || {};
    announcements.value = data.list || [];
    Object.assign(pagination, data.pagination || { page, pageSize: filters.pageSize, total: 0, totalPages: 1 });
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '公告列表读取失败';
  } finally {
    loading.value = false;
  }
}

async function submitAnnouncement() {
  errorMessage.value = '';
  successMessage.value = '';
  try {
    const payload = { ...form };
    if (editingId.value) {
      await http.put('/admin/announcements/' + editingId.value, payload);
    } else {
      await http.post('/admin/announcements', payload);
    }
    closeForm();
    successMessage.value = '公告保存成功';
    await fetchAnnouncements(1);
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '公告保存失败';
  }
}

async function updateStatus(item, status) {
  errorMessage.value = '';
  successMessage.value = '';
  try {
    await http.patch('/admin/announcements/' + item.id + '/status', { status });
    successMessage.value = status === 'published' ? '公告已发布' : '公告已隐藏';
    await fetchAnnouncements(pagination.page);
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '公告状态更新失败';
  }
}

async function removeAnnouncement(item) {
  errorMessage.value = '';
  successMessage.value = '';
  try {
    await http.delete('/admin/announcements/' + item.id);
    successMessage.value = '公告已删除';
    await fetchAnnouncements(1);
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '公告删除失败';
  }
}

onMounted(() => fetchAnnouncements(1));
</script>

<style scoped>
.page-head,
.toolbar,
.form-actions,
.pagination,
.badge-row,
.row-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-head {
  justify-content: space-between;
  margin-bottom: 14px;
}

.toolbar,
.announcement-form {
  margin-bottom: 14px;
}

.toolbar {
  flex-wrap: wrap;
}

.toolbar .form-input {
  max-width: 240px;
  margin-bottom: 0;
}

.content-input {
  min-height: 140px;
}

.announcement-card {
  align-items: flex-start;
}

.content-preview {
  white-space: pre-wrap;
  word-break: break-word;
}

.row-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  max-width: 280px;
}

.pagination {
  justify-content: center;
  margin-top: 16px;
}

.danger-card {
  color: #ffb4c1;
  border-color: rgba(255, 80, 120, 0.35);
  margin-bottom: 14px;
}

.success-card {
  color: #b9ffdd;
  border-color: rgba(80, 255, 174, 0.35);
  margin-bottom: 14px;
}

button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
