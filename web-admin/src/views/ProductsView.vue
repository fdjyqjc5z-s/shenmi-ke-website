<template>
  <section>
    <div class="page-head">
      <div>
        <h1 class="section-title">商品管理</h1>
        <p class="muted">支持新建、编辑、搜索、筛选、分页和上下架。</p>
      </div>
      <button class="action-btn" @click="openCreateForm">新建商品</button>
    </div>

    <div class="glass-card toolbar">
      <input class="form-input" v-model="filters.keyword" placeholder="搜索商品名称" @keyup.enter="fetchProducts(1)" />
      <select class="form-input" v-model="filters.status" @change="fetchProducts(1)">
        <option value="">全部状态</option>
        <option value="on">已上架</option>
        <option value="off">已下架</option>
      </select>
      <select class="form-input" v-model="filters.type" @change="fetchProducts(1)">
        <option value="">全部类型</option>
        <option value="normal">普通商品</option>
        <option value="vip">VIP 商品</option>
        <option value="points">积分商品</option>
      </select>
      <button class="action-btn" @click="fetchProducts(1)">查询</button>
    </div>

    <div v-if="showForm" class="glass-card product-form">
      <h2>{{ editingId ? '编辑商品' : '新建商品' }}</h2>
      <div class="form-grid">
        <input class="form-input" v-model="form.name" placeholder="商品名称" />
        <input class="form-input" v-model="form.coverImage" placeholder="封面图片地址" />
        <input class="form-input" v-model.number="form.price" type="number" min="0" placeholder="价格" />
        <input class="form-input" v-model.number="form.pointsPrice" type="number" min="0" placeholder="积分价格" />
        <input class="form-input" v-model.number="form.stock" type="number" min="0" placeholder="库存" />
        <input class="form-input" v-model.number="form.rewardPoints" type="number" min="0" placeholder="购买奖励积分" />
        <input class="form-input" v-model.number="form.requiredPoints" type="number" min="0" placeholder="购买门槛积分" />
        <input class="form-input" v-model.number="form.requiredInvites" type="number" min="0" placeholder="购买门槛邀请数" />
        <input class="form-input" v-model.number="form.sortOrder" type="number" min="0" placeholder="排序值" />
        <select class="form-input" v-model="form.status">
          <option value="off">下架</option>
          <option value="on">上架</option>
        </select>
      </div>

      <div class="check-row">
        <label><input type="checkbox" v-model="form.vipOnly" /> VIP 专属</label>
        <label><input type="checkbox" v-model="form.isPointsProduct" /> 积分商品</label>
      </div>

      <div class="form-actions">
        <button class="action-btn" @click="submitProduct">保存商品</button>
        <button class="action-btn ghost-btn" @click="closeForm">取消</button>
      </div>
    </div>

    <div v-if="errorMessage" class="glass-card danger-card">{{ errorMessage }}</div>

    <div v-if="loading" class="glass-card">正在读取商品...</div>

    <div v-else>
      <div class="list-card" v-for="item in products" :key="item.id">
        <div class="product-cover">
          <img v-if="item.cover_image" :src="item.cover_image" alt="商品图" />
          <span v-else>商品</span>
        </div>

        <div style="flex:1">
          <div class="badge-row">
            <span class="badge">{{ item.status === 'on' ? '已上架' : '已下架' }}</span>
            <span v-if="item.vip_only" class="badge">VIP</span>
            <span v-if="item.is_points_product" class="badge">积分</span>
          </div>
          <h3>{{ item.name }}</h3>
          <p class="muted">价格: {{ item.price }} 元 | 积分价: {{ item.points_price }} | 库存: {{ item.stock }}</p>
          <p class="muted">销量: {{ item.sales_count }} | 奖励积分: {{ item.reward_points }} | 排序: {{ item.sort_order }}</p>
        </div>

        <div class="row-actions">
          <button class="action-btn ghost-btn" @click="openEditForm(item)">编辑</button>
          <button class="action-btn" @click="toggleStatus(item)">{{ item.status === 'on' ? '下架' : '上架' }}</button>
        </div>
      </div>

      <div class="pagination glass-card">
        <button class="action-btn ghost-btn" :disabled="pagination.page <= 1" @click="fetchProducts(pagination.page - 1)">上一页</button>
        <span>第 {{ pagination.page }} / {{ pagination.totalPages || 1 }} 页，共 {{ pagination.total }} 条</span>
        <button class="action-btn ghost-btn" :disabled="pagination.page >= pagination.totalPages" @click="fetchProducts(pagination.page + 1)">下一页</button>
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
const products = ref([]);

const filters = reactive({
  keyword: '',
  status: '',
  type: '',
  pageSize: 20
});

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 1
});

const emptyForm = () => ({
  name: '',
  coverImage: '',
  price: 0,
  pointsPrice: 0,
  stock: 0,
  rewardPoints: 0,
  requiredPoints: 0,
  requiredInvites: 0,
  sortOrder: 0,
  vipOnly: false,
  isPointsProduct: false,
  status: 'off'
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
    name: item.name || '',
    coverImage: item.cover_image || '',
    price: Number(item.price || 0),
    pointsPrice: Number(item.points_price || 0),
    stock: Number(item.stock || 0),
    rewardPoints: Number(item.reward_points || 0),
    requiredPoints: Number(item.required_points || 0),
    requiredInvites: Number(item.required_invites || 0),
    sortOrder: Number(item.sort_order || 0),
    vipOnly: Boolean(item.vip_only),
    isPointsProduct: Boolean(item.is_points_product),
    status: item.status || 'off'
  });
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  resetForm();
}

async function fetchProducts(page = pagination.page) {
  loading.value = true;
  errorMessage.value = '';
  try {
    const resp = await http.get('/admin/products', {
      params: {
        keyword: filters.keyword,
        status: filters.status,
        type: filters.type,
        page,
        pageSize: filters.pageSize
      }
    });
    const data = resp.data.data || {};
    products.value = data.list || [];
    Object.assign(pagination, data.pagination || { page, pageSize: filters.pageSize, total: 0, totalPages: 1 });
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '商品列表读取失败';
  } finally {
    loading.value = false;
  }
}

async function submitProduct() {
  errorMessage.value = '';
  try {
    const payload = { ...form };
    if (editingId.value) {
      await http.put('/admin/products/' + editingId.value, payload);
    } else {
      await http.post('/admin/products', payload);
    }
    closeForm();
    await fetchProducts(1);
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '商品保存失败';
  }
}

async function toggleStatus(product) {
  errorMessage.value = '';
  try {
    const newStatus = product.status === 'on' ? 'off' : 'on';
    await http.patch('/admin/products/' + product.id + '/status', { status: newStatus });
    await fetchProducts(pagination.page);
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '商品状态更新失败';
  }
}

onMounted(() => fetchProducts(1));
</script>

<style scoped>
.page-head,
.toolbar,
.form-actions,
.pagination,
.badge-row,
.row-actions,
.check-row {
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
  max-width: 220px;
  margin-bottom: 0;
}

.product-form {
  margin-bottom: 14px;
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

.product-cover {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(159,136,255,0.45), rgba(67,232,255,0.32));
  display: grid;
  place-items: center;
  overflow: hidden;
  color: rgba(255,255,255,0.7);
  flex-shrink: 0;
}

.product-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.row-actions {
  flex-direction: column;
  align-items: stretch;
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

button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
