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
            <div v-if="item.vip_only" class="badge">VIP专属</div>
            <div v-if="item.can_purchase" class="badge success-badge">可购买</div>
            <div v-else class="badge lock-badge">未解锁</div>
          </div>
          <h3>{{ item.name }}</h3>
          <p class="muted">{{ priceText(item) }}</p>
          <p class="muted">库存：{{ item.stock }} | 销量：{{ item.sales_count || 0 }} | 奖励积分：{{ item.reward_points }}</p>
          <p v-if="item.required_points || item.required_invites" class="muted">门槛：{{ item.required_points }} 积分 / {{ item.required_invites }} 邀请</p>
          <p class="access-tip" :class="{ allowed: item.can_purchase }">{{ item.access_message || '登录后可查看购买资格' }}</p>
        </div>

        <div class="action-stack">
          <button class="action-btn ghost-btn" @click="openDetail(item)">详情</button>
          <button class="action-btn" :class="{ 'ghost-btn': !canClickBuy(item) }" @click="handleBuyClick(item)">
            {{ buyButtonText(item) }}
          </button>
        </div>
      </div>
    </template>

    <div v-if="detailVisible" class="modal-mask">
      <div class="glass-card modal-card">
        <div class="badge-row">
          <div class="badge">商品详情</div>
          <div v-if="activeProduct?.is_points_product" class="badge">积分兑换</div>
          <div v-if="activeProduct?.vip_only" class="badge">VIP专属</div>
          <div v-if="activeProduct?.can_purchase" class="badge success-badge">可购买</div>
          <div v-else class="badge lock-badge">未解锁</div>
        </div>
        <div class="detail-cover">
          <img v-if="activeProduct?.cover_image" :src="activeProduct.cover_image" alt="商品图" />
          <span v-else>神秘客商品</span>
        </div>
        <h2>{{ activeProduct?.name }}</h2>
        <p class="muted">{{ priceText(activeProduct) }}</p>
        <p class="muted">库存：{{ activeProduct?.stock }} | 奖励积分：{{ activeProduct?.reward_points }}</p>
        <p v-if="activeProduct?.required_points || activeProduct?.required_invites" class="muted">
          解锁门槛：{{ activeProduct?.required_points }} 积分 / {{ activeProduct?.required_invites }} 邀请
        </p>
        <div class="access-panel" :class="{ allowed: activeProduct?.can_purchase }">
          {{ activeProduct?.access_message || '登录后可查看购买资格' }}
        </div>
        <div class="modal-actions">
          <button class="action-btn" :class="{ 'ghost-btn': !canClickBuy(activeProduct) }" @click="handleBuyClick(activeProduct)">
            {{ buyButtonText(activeProduct) }}
          </button>
          <button class="action-btn ghost-btn" @click="detailVisible = false">关闭</button>
        </div>
      </div>
    </div>

    <div v-if="orderVisible" class="modal-mask">
      <div class="glass-card modal-card">
        <div class="badge">{{ activeProduct?.is_points_product ? '确认兑换' : '确认下单' }}</div>
        <h2>{{ activeProduct?.name }}</h2>
        <p class="muted">{{ priceText(activeProduct) }}</p>
        <p v-if="activeProduct?.is_points_product" class="access-panel">积分商品会在下单时自动扣除积分。</p>
        <input class="form-input" v-model.number="orderForm.quantity" type="number" min="1" placeholder="购买数量" />
        <input class="form-input" v-model="orderForm.receiverName" placeholder="收货人姓名" />
        <input class="form-input" v-model="orderForm.receiverPhone" placeholder="收货人电话" />
        <input class="form-input" v-model="orderForm.receiverAddress" placeholder="收货地址" />
        <p class="muted">真实支付接口后续再接入；积分商品目前会直接扣积分并生成订单。</p>
        <div class="modal-actions">
          <button class="action-btn" :disabled="ordering" @click="submitOrder">{{ ordering ? '提交中...' : activeProduct?.is_points_product ? '确认兑换' : '提交订单' }}</button>
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

function priceText(item) {
  if (!item) return '';
  if (item.is_points_product) {
    return `积分兑换：${item.points_price} 积分 | 现金价：${item.price} 元`;
  }
  return `价格：${item.price} 元 | 积分价：${item.points_price}`;
}

function canClickBuy(item) {
  if (!item) return false;
  return !isLogin.value || item.can_purchase;
}

function buyButtonText(item) {
  if (!item) return '下单';
  if (!isLogin.value) return '登录购买';
  if (!item.can_purchase) return '未解锁';
  return item.is_points_product ? '兑换' : '下单';
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

function handleBuyClick(item) {
  if (!item) return;

  if (!isLogin.value) {
    router.push('/login');
    return;
  }

  if (!item.can_purchase) {
    errorMessage.value = item.access_message || '暂未达到购买条件';
    return;
  }

  openOrder(item);
}

function openOrder(item) {
  if (!item) return;
  if (!isLogin.value) {
    router.push('/login');
    return;
  }

  if (!item.can_purchase) {
    errorMessage.value = item.access_message || '暂未达到购买条件';
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

    successMessage.value = activeProduct.value.is_points_product ? '兑换订单已创建，积分已扣除' : (resp.data?.message || '订单已创建');
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

.access-tip {
  margin: 6px 0 0;
  color: #ffcf9f;
  font-size: 13px;
}

.access-tip.allowed {
  color: #b9ffdd;
}

.access-panel {
  padding: 12px;
  border-radius: 14px;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.1);
  color: #ffcf9f;
}

.access-panel.allowed {
  color: #b9ffdd;
}

.success-badge {
  color: #b9ffdd;
  background: rgba(80, 255, 174, 0.14);
}

.lock-badge {
  color: #ffcf9f;
  background: rgba(255, 190, 120, 0.14);
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
