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
          <div class="unlock-mini">
            <div v-for="row in unlockRows(item)" :key="row.label" class="unlock-row">
              <span>{{ row.label }}</span>
              <strong :class="{ ok: row.ok }">{{ row.text }}</strong>
            </div>
          </div>
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
        <div class="unlock-panel">
          <div v-for="row in unlockRows(activeProduct)" :key="row.label" class="unlock-row detail-row">
            <span>{{ row.label }}</span>
            <strong :class="{ ok: row.ok }">{{ row.text }}</strong>
          </div>
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
        <p v-else class="access-panel">提交订单后会弹出支付提示；后台确认收款后订单会变为已支付。</p>
        <input class="form-input" v-model.number="orderForm.quantity" type="number" min="1" placeholder="购买数量" />
        <input class="form-input" v-model="orderForm.receiverName" placeholder="收货人姓名" />
        <input class="form-input" v-model="orderForm.receiverPhone" placeholder="收货人电话" />
        <input class="form-input" v-model="orderForm.receiverAddress" placeholder="收货地址" />
        <div class="modal-actions">
          <button class="action-btn" :disabled="ordering" @click="submitOrder">{{ ordering ? '提交中...' : activeProduct?.is_points_product ? '确认兑换' : '提交并支付' }}</button>
          <button class="action-btn ghost-btn" @click="closeOrder">取消</button>
        </div>
      </div>
    </div>

    <div v-if="payVisible" class="modal-mask">
      <div class="glass-card modal-card pay-card">
        <div class="badge success-badge">订单已创建</div>
        <h2>请完成支付</h2>
        <div class="pay-amount">¥ {{ currentOrder.total_amount || '0.00' }}</div>
        <div class="pay-info">
          <p><span>订单号</span><strong>{{ currentOrder.order_no }}</strong></p>
          <p><span>订单状态</span><strong>待支付 / 待后台确认</strong></p>
        </div>
        <div class="pay-box">
          <div class="pay-qr">待配置收款码</div>
          <p class="muted">请使用微信或支付宝向商家付款，并备注订单号。付款后等待后台在订单管理里点击“已支付”。</p>
        </div>
        <div class="modal-actions">
          <button class="action-btn" @click="copyOrderNo">复制订单号</button>
          <button class="action-btn ghost-btn" @click="closePayPopup">我知道了</button>
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
const payVisible = ref(false);
const isLogin = computed(() => Boolean(localStorage.getItem('user_token')));
const currentOrder = reactive({ order_no: '', total_amount: '0.00', points_used: 0, status: 'pending' });

const filters = reactive({ type: 'all' });
const orderForm = reactive({ quantity: 1, receiverName: '', receiverPhone: '', receiverAddress: '' });

function changeType(type) { filters.type = type; fetchProducts(); }
function priceText(item) {
  if (!item) return '';
  if (item.is_points_product) return `积分兑换：${item.points_price} 积分 | 现金价：${item.price} 元`;
  return `价格：${item.price} 元 | 积分价：${item.points_price}`;
}
function unlockRows(item) {
  if (!item) return [];
  const details = item.access_details || {};
  const rows = [];
  if (item.vip_only || details.vip_required) rows.push({ label: 'VIP资格', ok: Boolean(details.vip_active), text: details.vip_active ? '已开通' : '未开通' });
  if (Number(item.required_points || details.points_required || 0) > 0) rows.push({ label: '积分门槛', ok: Number(details.points_missing || 0) <= 0, text: `${details.points_balance || 0}/${details.points_required || item.required_points || 0}，还差 ${details.points_missing || 0}` });
  if (Number(item.required_invites || details.invites_required || 0) > 0) rows.push({ label: '邀请门槛', ok: Number(details.invites_missing || 0) <= 0, text: `${details.invite_count || 0}/${details.invites_required || item.required_invites || 0}，还差 ${details.invites_missing || 0}` });
  if (rows.length === 0) rows.push({ label: '解锁条件', ok: Boolean(item.can_purchase), text: item.can_purchase ? '已满足' : '登录后查看' });
  return rows;
}
function canClickBuy(item) { if (!item) return false; return !isLogin.value || item.can_purchase; }
function buyButtonText(item) {
  if (!item) return '下单';
  if (!isLogin.value) return '登录购买';
  if (!item.can_purchase) return '未解锁';
  return item.is_points_product ? '兑换' : '下单';
}
async function fetchProducts() {
  loading.value = true; errorMessage.value = ''; successMessage.value = '';
  try { const resp = await http.get('/shop/products', { params: { type: filters.type } }); products.value = resp.data.data || []; }
  catch (error) { errorMessage.value = error.response?.data?.message || '商品列表读取失败'; }
  finally { loading.value = false; }
}
async function openDetail(item) {
  errorMessage.value = '';
  try { const resp = await http.get('/shop/products/' + item.id); activeProduct.value = resp.data.data || item; detailVisible.value = true; }
  catch (error) { errorMessage.value = error.response?.data?.message || '商品详情读取失败'; }
}
function handleBuyClick(item) {
  if (!item) return;
  if (!isLogin.value) { router.push('/login'); return; }
  if (!item.can_purchase) { errorMessage.value = item.access_message || '暂未达到购买条件'; return; }
  openOrder(item);
}
function openOrder(item) {
  if (!item) return;
  if (!isLogin.value) { router.push('/login'); return; }
  if (!item.can_purchase) { errorMessage.value = item.access_message || '暂未达到购买条件'; return; }
  activeProduct.value = item; orderForm.quantity = 1; orderForm.receiverName = ''; orderForm.receiverPhone = ''; orderForm.receiverAddress = ''; orderVisible.value = true; detailVisible.value = false;
}
function closeOrder() { orderVisible.value = false; activeProduct.value = null; }
async function submitOrder() {
  if (!activeProduct.value) return;
  errorMessage.value = ''; successMessage.value = '';
  if (!orderForm.receiverName || !orderForm.receiverPhone || !orderForm.receiverAddress) { errorMessage.value = '请填写完整收货信息'; return; }
  ordering.value = true;
  try {
    const productSnapshot = { ...activeProduct.value };
    const resp = await http.post('/shop/orders', { productId: productSnapshot.id, quantity: orderForm.quantity, receiverName: orderForm.receiverName, receiverPhone: orderForm.receiverPhone, receiverAddress: orderForm.receiverAddress });
    const order = resp.data?.data || {};
    Object.assign(currentOrder, order);
    orderVisible.value = false;
    activeProduct.value = null;
    await fetchProducts();
    if (productSnapshot.is_points_product) {
      successMessage.value = '兑换订单已创建，积分已扣除';
    } else {
      payVisible.value = true;
      successMessage.value = '';
    }
  } catch (error) { errorMessage.value = error.response?.data?.message || '下单失败'; }
  finally { ordering.value = false; }
}
async function copyOrderNo() {
  try { await navigator.clipboard.writeText(currentOrder.order_no || ''); successMessage.value = '订单号已复制'; }
  catch { successMessage.value = '请手动复制订单号'; }
}
function closePayPopup() { payVisible.value = false; Object.assign(currentOrder, { order_no: '', total_amount: '0.00', points_used: 0, status: 'pending' }); }
onMounted(fetchProducts);
</script>

<style scoped>
.filter-bar,.badge-row,.modal-actions{display:flex;align-items:center;gap:10px}.filter-bar{flex-wrap:wrap;margin-top:14px}.filter-btn{min-height:38px;padding:0 12px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:rgba(255,255,255,.72);font-weight:800}.filter-btn.active{color:#080813;background:linear-gradient(135deg,#fff,#9f88ff 55%,#43e8ff)}.product-card{align-items:flex-start}.product-cover,.detail-cover{display:grid;place-items:center;overflow:hidden;background:linear-gradient(135deg,rgba(141,117,255,.65),rgba(56,223,255,.38));color:rgba(255,255,255,.78)}.product-cover{width:64px;height:64px;border-radius:18px;flex-shrink:0}.detail-cover{width:100%;height:180px;border-radius:22px;margin-top:14px}.product-cover img,.detail-cover img{width:100%;height:100%;object-fit:cover}.action-stack{display:grid;gap:8px;min-width:82px}.unlock-mini,.unlock-panel{display:grid;gap:6px;margin-top:8px}.unlock-row{display:flex;justify-content:space-between;gap:8px;padding:7px 9px;border-radius:12px;background:rgba(255,255,255,.055);color:rgba(245,242,255,.68);font-size:12px}.unlock-row strong{color:#ffcf9f;font-weight:800}.unlock-row strong.ok{color:#b9ffdd}.detail-row{font-size:13px;padding:10px 12px}.access-tip{margin:6px 0 0;color:#ffcf9f;font-size:13px}.access-tip.allowed{color:#b9ffdd}.access-panel{padding:12px;border-radius:14px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);color:#ffcf9f}.access-panel.allowed{color:#b9ffdd}.success-badge{color:#b9ffdd;background:rgba(80,255,174,.14)}.lock-badge{color:#ffcf9f;background:rgba(255,190,120,.14)}.modal-mask{position:fixed;inset:0;z-index:20;display:grid;place-items:center;padding:16px;background:rgba(3,3,12,.72);backdrop-filter:blur(10px)}.modal-card{width:min(100%,460px);max-height:82vh;overflow:auto}.pay-card{text-align:left}.pay-amount{margin:12px 0 14px;font-size:38px;font-weight:900;letter-spacing:1px;background:linear-gradient(135deg,#fff,#9f88ff 55%,#43e8ff);-webkit-background-clip:text;background-clip:text;color:transparent}.pay-info,.pay-box{display:grid;gap:8px;margin-top:12px;padding:12px;border-radius:18px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1)}.pay-info p{display:flex;justify-content:space-between;gap:12px;margin:0;color:rgba(255,255,255,.62)}.pay-info strong{color:#fff;text-align:right;word-break:break-all}.pay-qr{display:grid;place-items:center;min-height:120px;border-radius:16px;border:1px dashed rgba(255,255,255,.22);color:rgba(255,255,255,.7);background:rgba(0,0,0,.16)}.error-text{color:#ffb4c1;margin-top:14px}.success-text{color:#b9ffdd;margin-top:14px}button:disabled{opacity:.55}
</style>
