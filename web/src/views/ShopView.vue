<template>
  <section>
    <div class="hero-card">
      <div class="brand-kicker">SECRET SHOP</div>
      <h1 class="brand-title"><span>神秘商城</span></h1>
      <p class="muted">普通商品、积分商品、VIP 专属商品，全部由平台统一上架。</p>
    </div>

    <div class="glass-card filter-bar">
      <button class="filter-btn" :class="{ active: filters.type === 'all' }" @click="changeType('all')">全部</button>
      <button class="filter-btn" :class="{ active: filters.type === 'normal' }" @click="changeType('normal')">普通</button>
      <button class="filter-btn" :class="{ active: filters.type === 'points' }" @click="changeType('points')">积分</button>
      <button class="filter-btn" :class="{ active: filters.type === 'vip' }" @click="changeType('vip')">VIP</button>
    </div>

    <div v-if="errorMessage" class="glass-card error-text">{{ errorMessage }}</div>
    <div v-if="successMessage" class="glass-card success-text">{{ successMessage }}</div>
    <div v-if="loading" class="glass-card" style="margin-top:14px;">正在读取商品...</div>

    <template v-else>
      <h2 class="section-title">商品列表</h2>
      <div v-if="products.length === 0" class="glass-card muted">暂无可购买商品</div>

      <div class="list-card product-card" v-for="item in products" :key="item.id">
        <div class="product-cover">
          <img v-if="item.cover_image" :src="item.cover_image" alt="商品图" />
          <span v-else>商品</span>
        </div>

        <div style="flex:1; min-width:0;">
          <div class="badge-row">
            <div v-if="item.is_points_product" class="badge">积分兑换</div>
            <div v-else class="badge">普通商品</div>
            <div v-if="item.vip_only" class="badge">VIP</div>
          </div>
          <h3>{{ item.name }}</h3>
          <p class="muted">价格：{{ item.price }} 元 | 积分价：{{ item.points_price }}</p>
          <p class="muted">库存：{{ item.stock }} | 销量：{{ item.sales_count || 0 }} | 奖励积分：{{ item.reward_points }}</p>
          <p v-if="item.required_points || item.required_invites" class="muted">门槛：{{ item.required_points }} 积分 / {{ item.required_invites }} 邀请</p>
        </div>

        <div class="action-stack">
          <button class="action-btn ghost-btn" @click="openDetail(item)">详情</button>
          <button class="action-btn" @click="openOrder(item)">下单</button>
        </div>
      </div>
    </template>

    <div v-if="detailVisible" class="modal-mask">
      <div class="glass-card modal-card">
        <div class="badge-row">
          <div class="badge">商品详情</div>
          <div v-if="activeProduct?.is_points_product" class="badge">积分</div>
          <div v-if="activeProduct?.vip_only" class="badge">VIP</div>
        </div>
        <div class="detail-cover">
          <img v-if="activeProduct?.cover_image" :src="activeProduct.cover_image" alt="商品图" />
          <span v-else>神秘客商品</span>
        </div>
        <h2>{{ activeProduct?.name }}</h2>
        <p class="muted">价格：{{ activeProduct?.price }} 元</p>
        <p class="muted">积分价：{{ activeProduct?.points_price }}</p>
        <p class="muted">库存：{{ activeProduct?.stock }} | 奖励积分：{{ activeProduct?.reward_points }}</p>
        <p v-if="activeProduct?.required_points || activeProduct?.required_invites" class="muted">
          解锁门槛：{{ activeProduct?.required_points }} 积分 / {{ activeProduct?.required_invites }} 邀请
        </p>
        <div class="modal-actions">
          <button class="action-btn" @click="openOrder(activeProduct)">立即下单</button>
          <button class="action-btn ghost-btn" @click="detailVisible = false">关闭</button>
        </div>
      </div>
    </div>

    <div v-if="orderVisible" class="modal-mask">
      <div class="glass-card modal-card">
        <div class="badge">确认下单</div>
        <h2>{{ activeProduct?.name }}</h2>
        <p class="muted">单价：{{ activeProduct?.price }} 元 | 积分价：{{ activeProduct?.points_price }}</p>
        <input class="form-input" v-model.number="orderForm.quantity" type="number" min="1" placeholder="购买数量" />
        <input class="form-input" v-model="orderForm.receiverName" placeholder="收货人姓名" />
        <input class="form-input" v-model="orderForm.receiverPhone" placeholder="收货人电话" />
        <input class="form-input" v-model="orderForm.receiverAddress" placeholder="收货地址" />
        <p class="muted">下单后后台可处理订单状态。真实支付接口后续再接入。</p>
        <div class="modal-actions">
          <button class="action-btn" :disabled="ordering" @click="submitOrder">{{ ordering ? '提交中...' : '提交订单' }}</button>
          <button class="action-btn ghost-btn" @click="closeOrder">取消</button>
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
const ordering = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const products = ref([]);
const activeProduct = ref(null);
const detailVisible = ref(false);
const orderVisible = ref(false);
const isLogin = computed(() => Boolean(localStorage.getItem('user_token')));

const filters = reactive({
  type: 'all'
});

const orderForm = reactive({
  quantity: 1,
  receiverName: '',
  receiverPhone: '',
  receiverAddress: ''
});

function changeType(type) {
  filters.type = type;
  fetchProducts();
}

async function fetchProducts() {
  loading.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const resp = await http.get('/shop/products', { params: { type: filters.type } });
    products.value = resp.data.data || [];
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '商品列表读取失败';
  } finally {
    loading.value = false;
  }
}

async function openDetail(item) {
  errorMessage.value = '';
  try {
    const resp = await http.get('/shop/products/' + item.id);
    activeProduct.value = resp.data.data || item;
    detailVisible.value = true;
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '商品详情读取失败';
  }
}

function openOrder(item) {
  if (!item) return;
  if (!isLogin.value) {
    router.push('/login');
    return;
  }

  activeProduct.value = item;
  orderForm.quantity = 1;
  orderForm.receiverName = '';
  orderForm.receiverPhone = '';
  orderForm.receiverAddress = '';
  orderVisible.value = true;
  detailVisible.value = false;
}

function closeOrder() {
  orderVisible.value = false;
  activeProduct.value = null;
}

async function submitOrder() {
  if (!activeProduct.value) return;
  errorMessage.value = '';
  successMessage.value = '';

  if (!orderForm.receiverName || !orderForm.receiverPhone || !orderForm.receiverAddress) {
    errorMessage.value = '请填写完整收货信息';
    return;
  }

  ordering.value = true;
  try {
    const resp = await http.post('/shop/orders', {
      productId: activeProduct.value.id,
      quantity: orderForm.quantity,
      receiverName: orderForm.receiverName,
      receiverPhone: orderForm.receiverPhone,
      receiverAddress: orderForm.receiverAddress
    });

    successMessage.value = resp.data?.message || '订单已创建';
    closeOrder();
    await fetchProducts();
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '下单失败';
  } finally {
    ordering.value = false;
  }
}

onMounted(fetchProducts);
</script>

<style scoped>
.filter-bar,
.badge-row,
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

.product-card {
  align-items: flex-start;
}

.product-cover,
.detail-cover {
  display: grid;
  place-items: center;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(141,117,255,0.65), rgba(56,223,255,0.38));
  color: rgba(255,255,255,0.78);
}

.product-cover {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  flex-shrink: 0;
}

.detail-cover {
  width: 100%;
  height: 180px;
  border-radius: 22px;
  margin-top: 14px;
}

.product-cover img,
.detail-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.action-stack {
  display: grid;
  gap: 8px;
  min-width: 82px;
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

.error-text {
  color: #ffb4c1;
  margin-top: 14px;
}

.success-text {
  color: #b9ffdd;
  margin-top: 14px;
}

button:disabled {
  opacity: 0.55;
}
</style>
