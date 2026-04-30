<template>
  <section>
    <div class="page-head">
      <div>
        <h1 class="section-title">AI 助手</h1>
        <p class="muted">当前为占位助手，不接入真实 AI。用于生成商品、任务、客服回复草稿，后续可替换为真实 AI 接口。</p>
      </div>
      <button class="action-btn" @click="fetchDrafts(1)">刷新</button>
    </div>

    <div class="glass-card creator-card">
      <h2>生成占位草稿</h2>
      <div class="form-row">
        <select class="form-input" v-model="form.draftType">
          <option value="product">商品文案</option>
          <option value="task">任务文案</option>
          <option value="reply">客服回复</option>
        </select>
      </div>
      <textarea class="form-input" v-model="form.inputText" placeholder="输入基础信息，例如商品特点、任务要求、用户问题"></textarea>
      <div class="form-actions">
        <button class="action-btn" @click="createDraft">生成草稿</button>
        <button class="action-btn ghost-btn" @click="clearForm">清空</button>
      </div>
    </div>

    <div class="glass-card toolbar">
      <select class="form-input" v-model="filters.draftType" @change="fetchDrafts(1)">
        <option value="">全部类型</option>
        <option value="product">商品文案</option>
        <option value="task">任务文案</option>
        <option value="reply">客服回复</option>
      </select>
      <select class="form-input" v-model="filters.status" @change="fetchDrafts(1)">
        <option value="">全部状态</option>
        <option value="draft">草稿</option>
        <option value="used">已使用</option>
        <option value="discarded">已废弃</option>
      </select>
      <button class="action-btn" @click="fetchDrafts(1)">查询</button>
    </div>

    <div v-if="errorMessage" class="glass-card danger-card">{{ errorMessage }}</div>
    <div v-if="loading" class="glass-card">正在读取草稿...</div>

    <div v-else>
      <div class="list-card draft-card" v-for="item in drafts" :key="item.id">
        <div style="flex: 1; min-width: 0;">
          <div class="badge-row">
            <span class="badge">{{ typeText(item.draft_type) }}</span>
            <span class="badge">{{ statusText(item.status) }}</span>
            <span class="badge">{{ formatTime(item.created_at) }}</span>
          </div>
          <h3>草稿 #{{ item.id }}</h3>
          <p class="muted">输入信息</p>
          <pre class="draft-text">{{ item.input_text || '--' }}</pre>
          <p class="muted">生成结果</p>
          <pre class="draft-text output-text">{{ item.output_text }}</pre>
        </div>

        <div class="row-actions">
          <button class="action-btn ghost-btn" :disabled="item.status === 'used'" @click="updateStatus(item, 'used')">标记使用</button>
          <button class="action-btn" :disabled="item.status === 'discarded'" @click="updateStatus(item, 'discarded')">废弃</button>
          <button class="action-btn ghost-btn" :disabled="item.status === 'draft'" @click="updateStatus(item, 'draft')">恢复草稿</button>
        </div>
      </div>

      <div class="pagination glass-card">
        <button class="action-btn ghost-btn" :disabled="pagination.page <= 1" @click="fetchDrafts(pagination.page - 1)">上一页</button>
        <span>第 {{ pagination.page }} / {{ pagination.totalPages || 1 }} 页，共 {{ pagination.total }} 条</span>
        <button class="action-btn ghost-btn" :disabled="pagination.page >= pagination.totalPages" @click="fetchDrafts(pagination.page + 1)">下一页</button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import http from '../utils/http.js';

const loading = ref(false);
const errorMessage = ref('');
const drafts = ref([]);

const form = reactive({
  draftType: 'product',
  inputText: ''
});

const filters = reactive({
  draftType: '',
  status: '',
  pageSize: 20
});

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 1
});

function typeText(type) {
  const map = { product: '商品文案', task: '任务文案', reply: '客服回复' };
  return map[type] || type;
}

function statusText(status) {
  const map = { draft: '草稿', used: '已使用', discarded: '已废弃' };
  return map[status] || status;
}

function formatTime(value) {
  if (!value) return '--';
  return String(value).replace('T', ' ').slice(0, 19);
}

function clearForm() {
  form.draftType = 'product';
  form.inputText = '';
}

async function fetchDrafts(page = pagination.page) {
  loading.value = true;
  errorMessage.value = '';

  try {
    const resp = await http.get('/admin/ai/drafts', {
      params: {
        draftType: filters.draftType,
        status: filters.status,
        page,
        pageSize: filters.pageSize
      }
    });

    const data = resp.data.data || {};
    drafts.value = data.list || [];
    Object.assign(pagination, data.pagination || { page, pageSize: filters.pageSize, total: 0, totalPages: 1 });
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'AI草稿列表读取失败';
  } finally {
    loading.value = false;
  }
}

async function createDraft() {
  errorMessage.value = '';
  try {
    await http.post('/admin/ai/drafts', {
      draftType: form.draftType,
      inputText: form.inputText
    });
    clearForm();
    await fetchDrafts(1);
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'AI草稿生成失败';
  }
}

async function updateStatus(item, status) {
  errorMessage.value = '';
  try {
    await http.patch('/admin/ai/drafts/' + item.id + '/status', { status });
    await fetchDrafts(pagination.page);
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'AI草稿状态更新失败';
  }
}

onMounted(() => fetchDrafts(1));
</script>

<style scoped>
.page-head,
.toolbar,
.pagination,
.badge-row,
.row-actions,
.form-actions,
.form-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-head {
  justify-content: space-between;
  margin-bottom: 14px;
}

.creator-card,
.toolbar {
  margin-bottom: 14px;
}

.toolbar {
  flex-wrap: wrap;
}

.toolbar .form-input,
.form-row .form-input {
  max-width: 260px;
  margin-bottom: 0;
}

.draft-card {
  align-items: flex-start;
}

.draft-text {
  white-space: pre-wrap;
  word-break: break-word;
  margin: 8px 0 12px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(245, 242, 255, 0.78);
}

.output-text {
  color: #e6ddff;
}

.row-actions {
  flex-direction: column;
  align-items: stretch;
  min-width: 120px;
}

.pagination {
  justify-content: center;
  margin-top: 16px;
}

.danger-card {
  margin-bottom: 14px;
}

button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
