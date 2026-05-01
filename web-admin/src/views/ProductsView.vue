<template>
  <section>
    <div class="page-head">
      <div>
        <h1 class="section-title">商品管理</h1>
        <p class="muted">支持相册上传图片、自定义分类、新建、编辑、搜索、筛选、分页和上下架。</p>
      </div>
      <div class="head-actions">
        <button class="action-btn ghost-btn" @click="categoryPanelVisible = !categoryPanelVisible">{{ categoryPanelVisible ? '收起分类' : '分类管理' }}</button>
        <button class="action-btn" @click="openCreateForm">新建商品</button>
      </div>
    </div>

    <div v-if="categoryPanelVisible" class="glass-card category-manage-card">
      <div class="panel-head">
        <div>
          <h2>商品分类管理</h2>
          <p class="muted">这里创建的分类，会同步显示到前台商城“分类”展开面板。</p>
        </div>
        <button class="action-btn ghost-btn" @click="resetCategoryForm">新建分类</button>
      </div>

      <div class="category-form-grid">
        <input class="form-input" v-model="categoryForm.label" placeholder="分类名称，例如：热门手串" />
        <input class="form-input" v-model="categoryForm.value" placeholder="分类编码，可不填，系统自动生成" />
        <input class="form-input" v-model.number="categoryForm.sortOrder" type="number" min="0" placeholder="排序值，越大越靠前" />
        <select class="form-input" v-model="categoryForm.status">
          <option value="enabled">启用</option>
          <option value="disabled">停用</option>
        </select>
      </div>

      <div class="form-actions category-actions">
        <button class="action-btn" @click="submitCategory">{{ categoryForm.id ? '保存分类' : '新增分类' }}</button>
        <button v-if="categoryForm.id" class="action-btn ghost-btn" @click="resetCategoryForm">取消编辑</button>
      </div>

      <div v-if="categories.length === 0" class="muted empty-category">暂无分类，请先新增一个分类。</div>
      <div v-else class="category-list">
        <div v-for="item in categories" :key="item.id" class="category-row">
          <div>
            <div class="badge-row">
              <span class="badge">{{ item.status === 'enabled' ? '启用' : '停用' }}</span>
              <span class="badge">排序 {{ item.sort_order || 0 }}</span>
            </div>
            <h3>{{ item.label }}</h3>
            <p class="muted">编码：{{ item.value }}</p>
          </div>
          <div class="row-actions inline-actions">
            <button class="action-btn ghost-btn" @click="editCategory(item)">编辑</button>
            <button class="action-btn" @click="toggleCategoryStatus(item)">{{ item.status === 'enabled' ? '停用' : '启用' }}</button>
          </div>
        </div>
      </div>
    </div>

    <div class="glass-card toolbar">
      <input class="form-input" v-model="filters.keyword" placeholder="搜索商品名称" @keyup.enter="fetchProducts(1)" />
      <select class="form-input" v-model="filters.category" @change="fetchProducts(1)">
        <option value="">全部分类</option>
        <option v-for="item in categories" :key="item.value" :value="item.value">{{ item.label }}</option>
      </select>
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
        <select class="form-input" v-model="form.category">
          <option v-for="item in enabledCategories" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
        <input class="form-input" v-model="form.coverImage" placeholder="封面图片地址，上传后自动填入" />
        <label class="upload-box">
          <input type="file" accept="image/*" @change="uploadProductImage" />
          <span>{{ uploading ? '上传中...' : '从相册选择商品图片' }}</span>
        </label>
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

      <div v-if="form.coverImage" class="cover-preview">
        <img :src="form.coverImage" alt="商品封面预览" />
        <span>封面预览</span>
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
    <div v-if="successMessage" class="glass-card success-card">{{ successMessage }}</div>

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
            <span class="badge">{{ item.category_label || categoryText(item.category) }}</span>
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
import { computed, onMounted, reactive, ref } from 'vue';
import http from '../utils/http.js';

const loading = ref(false);
const uploading = ref(false);
const showForm = ref(false);
const categoryPanelVisible = ref(false);
const editingId = ref(null);
const errorMessage = ref('');
const successMessage = ref('');
const products = ref([]);
const categories = ref([]);

const filters = reactive({
  keyword: '',
  category: '',
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
  category: enabledCategories.value[0]?.value || 'general',
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

const emptyCategoryForm = () => ({
  id: null,
  value: '',
  label: '',
  sortOrder: 0,
  status: 'enabled'
});

const form = reactive(emptyForm());
const categoryForm = reactive(emptyCategoryForm());

const enabledCategories = computed(() => {
  const list = categories.value.filter((item) => item.status === 'enabled');
  return list.length ? list : [{ value: 'general', label: '综合商品', status: 'enabled' }];
});

function categoryText(value) {
  return categories.value.find((item) => item.value === value)?.label || '综合商品';
}

function makeCategoryCode(label) {
  const normalized = String(label || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 32);
  return normalized || `cat-${Date.now().toString(36)}`;
}

function resetForm() {
  Object.assign(form, emptyForm());
  editingId.value = null;
}

function resetCategoryForm() {
  Object.assign(categoryForm, emptyCategoryForm());
}

function editCategory(item) {
  Object.assign(categoryForm, {
    id: item.id,
    value: item.value,
    label: item.label,
    sortOrder: Number(item.sort_order || 0),
    status: item.status || 'enabled'
  });
}

function openCreateForm() {
  resetForm();
  showForm.value = true;
}

function openEditForm(item) {
  editingId.value = item.id;
  Object.assign(form, {
    name: item.name || '',
    category: item.category || enabledCategories.value[0]?.value || 'general',
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

async function uploadProductImage(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  uploading.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const data = new FormData();
    data.append('image', file);
    const resp = await http.post('/admin/upload/image', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    form.coverImage = resp.data.data?.url || '';
    successMessage.value = '图片上传成功，已自动填入封面地址';
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '图片上传失败';
  } finally {
    uploading.value = false;
    event.target.value = '';
  }
}

async function fetchCategories() {
  try {
    const resp = await http.get('/admin/product-categories');
    categories.value = resp.data.data || [];
    if (!form.category || !enabledCategories.value.find((item) => item.value === form.category)) {
      form.category = enabledCategories.value[0]?.value || 'general';
    }
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '分类列表读取失败';
  }
}

async function submitCategory() {
  errorMessage.value = '';
  successMessage.value = '';

  if (!categoryForm.label) {
    errorMessage.value = '请输入分类名称';
    return;
  }

  try {
    const payload = {
      label: categoryForm.label,
      value: categoryForm.value || makeCategoryCode(categoryForm.label),
      sortOrder: categoryForm.sortOrder,
      status: categoryForm.status
    };

    if (categoryForm.id) {
      await http.put('/admin/product-categories/' + categoryForm.id, payload);
    } else {
      await http.post('/admin/product-categories', payload);
    }

    successMessage.value = categoryForm.id ? '分类已更新' : '分类已新增';
    resetCategoryForm();
    await fetchCategories();
    await fetchProducts(1);
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '分类保存失败';
  }
}

async function toggleCategoryStatus(item) {
  errorMessage.value = '';
  successMessage.value = '';
  try {
    const status = item.status === 'enabled' ? 'disabled' : 'enabled';
    await http.patch('/admin/product-categories/' + item.id + '/status', { status });
    successMessage.value = status === 'enabled' ? '分类已启用' : '分类已停用';
    await fetchCategories();
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '分类状态更新失败';
  }
}

async function fetchProducts(page = pagination.page) {
  loading.value = true;
  errorMessage.value = '';
  try {
    const resp = await http.get('/admin/products', {
      params: {
        keyword: filters.keyword,
        category: filters.category,
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
  successMessage.value = '';
  try {
    const payload = { ...form };
    if (editingId.value) {
      await http.put('/admin/products/' + editingId.value, payload);
    } else {
      await http.post('/admin/products', payload);
    }
    closeForm();
    successMessage.value = '商品保存成功';
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

onMounted(async () => {
  await fetchCategories();
  await fetchProducts(1);
});
</script>

<style scoped>
.page-head,
.toolbar,
.form-actions,
.pagination,
.badge-row,
.row-actions,
.check-row,
.head-actions,
.panel-head,
.category-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-head,
.panel-head {
  justify-content: space-between;
  margin-bottom: 14px;
}

.head-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.toolbar {
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.toolbar .form-input {
  max-width: 220px;
  margin-bottom: 0;
}

.category-manage-card,
.product-form {
  margin-bottom: 14px;
}

.category-form-grid,
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.category-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.category-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.055);
}

.empty-category {
  margin-top: 12px;
}

.upload-box {
  min-height: 46px;
  border-radius: 14px;
  border: 1px dashed rgba(255,255,255,0.24);
  background: rgba(255,255,255,0.06);
  color: rgba(245,242,255,0.86);
  display: grid;
  place-items: center;
  font-weight: 800;
  cursor: pointer;
}

.upload-box input {
  display: none;
}

.cover-preview {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(245,242,255,0.72);
}

.cover-preview img {
  width: 96px;
  height: 96px;
  border-radius: 18px;
  object-fit: cover;
  border: 1px solid rgba(255,255,255,0.12);
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

.inline-actions {
  min-width: 112px;
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

@media (max-width: 720px) {
  .page-head,
  .panel-head,
  .category-row {
    align-items: stretch;
    flex-direction: column;
  }

  .category-form-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
