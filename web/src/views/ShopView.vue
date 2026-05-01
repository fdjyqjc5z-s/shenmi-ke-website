<template>
  <section>
    <div class="hero-card">
      <div class="brand-kicker">SECRET SHOP</div>
      <h1 class="brand-title"><span>神秘商城</span></h1>
      <p class="muted">普通商品、积分商品、VIP 专属商品，全部由平台统一上架。</p>
    </div>

    <div class="glass-card filter-bar">
      <button class="category-main-btn" @click="categoryPanelVisible = !categoryPanelVisible">
        <span>分类</span>
        <strong>{{ activeCategoryLabel }}</strong>
      </button>
      <button class="filter-btn" :class="{ active: filters.type === 'all' }" @click="changeType('all')">全部</button>
      <button class="filter-btn" :class="{ active: filters.type === 'normal' }" @click="changeType('normal')">普通</button>
      <button class="filter-btn" :class="{ active: filters.type === 'points' }" @click="changeType('points')">积分</button>
      <button class="filter-btn" :class="{ active: filters.type === 'vip' }" @click="changeType('vip')">VIP</button>
    </div>

    <div v-if="categoryPanelVisible" class="glass-card category-panel">
      <button class="category-chip" :class="{ active: !filters.category }" @click="changeCategory('')">
        <span>全部分类</span>
        <em>ALL</em>
      </button>
      <button
        v-for="item in categories"
        :key="item.value"
        class="category-chip"
        :class="{ active: filters.category === item.value }"
        @click="changeCategory(item.value)"
      >
        <span>{{ item.label }}</span>
        <em>{{ item.value }}</em>
      </button>
    </div>

    <div v-if="errorMessage" class="glass-card error-text">{{ errorMessage }}</div>
    <div v-if="successMessage" class="glass-card success-text">{{ successMessage }}</div>
    <div v-if="loading" class="glass-card" style="margin-top:14px;">正在读取商品...</div>

    <template v-else>
      <div class="section-head-row">
        <h2 class="section-title">商品列表</h2>
        <span class="muted">{{ activeCategoryLabel }} · {{ products.length }} 件</span>
      </div>
      <div v-if="products.length === 0" class="glass-card muted">暂无可购买商品</div>

      <div v-else class="product-grid">
        <div class="product-card-grid" v-for="item in products" :key="item.id">
          <div class="product-cover">
            <img v-if="item.cover_image" :src="item.cover_image" alt="商品图" />
            <span v-else>商品</span>
          </div>

          <div class="product-content">
            <div class="badge-row compact-badges">
              <div class="badge">{{ item.category_label || '综合商品' }}</div>
              <div v-if="item.is_points_product" class="badge">积分</div>
              <div v-if="item.vip_only" class="badge">VIP</div>
            </div>
            <h3 class="product-name">{{ item.name }}</h3>
            <p class="price-line">{{ priceText(item) }}</p>
            <p class="muted mini-line">库存 {{ item.stock }} · 销量 {{ item.sales_count || 0 }}</p>
            <p class="access-tip" :class="{ allowed: item.can_purchase }">{{ item.access_message || '登录后可查看购买资格' }}</p>
          </div>

          <div class="card-actions">
            <button class="action-btn ghost-btn small-card-btn" @click="openDetail(item)">详情</button>
            <button class="action-btn small-card-btn" :class="{ 'ghost-btn': !canClickBuy(item) }" @click="handleBuyClick(item)">{{ buyButtonText(item) }}</button>
          </div>
        </div>
      </div>
    </template>

    <div v-if="detailVisible" class="modal-mask">
      <div class="glass-card modal-card">
        <div class="badge-row">
          <div class="badge">商品详情</div>
          <div class="badge">{{ activeProduct?.category_label || '综合商品' }}</div>
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
        <div class="access-panel" :class="{ allowed: activeProduct?.can_purchase }">{{ activeProduct?.access_message || '登录后可查看购买资格' }}</div>
        <div class="unlock-panel">
          <div v-for="row in unlockRows(activeProduct)" :key="row.label" class="unlock-row detail-row">
            <span>{{ row.label }}</span>
            <strong :class="{ ok: row.ok }">{{ row.text }}</strong>
          </div>
        </div>
        <div class="modal-actions">
          <button class="action-btn" :class="{ 'ghost-btn': !canClickBuy(activeProduct) }" @click="handleBuyClick(activeProduct)">{{ buyButtonText(activeProduct) }}</button>
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

        <div class="address-box">
          <div class="address-title">
            <span>收货地址</span>
            <button class="mini-link" @click="loadAddresses">刷新地址</button>
          </div>

          <template v-if="addresses.length">
            <label class="address-option" v-for="addr in addresses" :key="addr.id">
              <input type="radio" name="address" :value="addr.id" v-model.number="orderForm.addressId" />
              <span>
                <strong>{{ addr.receiver_name }} {{ addr.receiver_phone }}</strong>
                <em>{{ addr.receiver_address }}</em>
                <b v-if="addr.is_default">默认</b>
              </span>
            </label>
            <label class="address-option">
              <input type="radio" name="address" :value="0" v-model.number="orderForm.addressId" />
              <span><strong>使用新地址</strong><em>填写后可选择保存到地址簿</em></span>
            </label>
          </template>

          <template v-if="!addresses.length || orderForm.addressId === 0">
            <input class="form-input" v-model="orderForm.receiverName" placeholder="收货人姓名" />
            <input class="form-input" v-model="orderForm.receiverPhone" placeholder="收货人电话" />
            <input class="form-input" v-model="orderForm.receiverAddress" placeholder="收货地址" />
            <label class="save-row"><input type="checkbox" v-model="orderForm.saveAddress" /> 保存到地址簿，下次购买直接选择</label>
          </template>
        </div>

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
const categories = ref([]);
const addresses = ref([]);
const activeProduct = ref(null);
const detailVisible = ref(false);
const orderVisible = ref(false);
const payVisible = ref(false);
const categoryPanelVisible = ref(false);
const isLogin = computed(() => Boolean(localStorage.getItem('user_token')));
const currentOrder = reactive({ order_no: '', total_amount: '0.00', points_used: 0, status: 'pending' });
const filters = reactive({ type: 'all', category: '' });
const orderForm = reactive({ quantity: 1, addressId: 0, receiverName: '', receiverPhone: '', receiverAddress: '', saveAddress: true });

const activeCategoryLabel = computed(() => {
  if (!filters.category) return '全部分类';
  return categories.value.find((item) => item.value === filters.category)?.label || '当前分类';
});

function changeType(type) { filters.type = type; fetchProducts(); }
function changeCategory(category) { filters.category = category; categoryPanelVisible.value = false; fetchProducts(); }
function priceText(item) { if (!item) return ''; return item.is_points_product ? `${item.points_price} 积分` : `¥ ${item.price}`; }
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
function buyButtonText(item) { if (!item) return '下单'; if (!isLogin.value) return '登录购买'; if (!item.can_purchase) return '未解锁'; return item.is_points_product ? '兑换' : '下单'; }
async function fetchCategories() {
  try {
    const resp = await http.get('/shop/categories');
    categories.value = resp.data.data || [];
  } catch {
    categories.value = [];
  }
}
async function fetchProducts() {
  loading.value = true; errorMessage.value = ''; successMessage.value = '';
  try {
    const resp = await http.get('/shop/products', { params: { type: filters.type, category: filters.category } });
    products.value = resp.data.data || [];
  } catch (error) { errorMessage.value = error.response?.data?.message || '商品列表读取失败'; }
  finally { loading.value = false; }
}
async function loadAddresses() {
  if (!isLogin.value) return;
  try {
    const resp = await http.get('/user/addresses');
    addresses.value = resp.data.data || [];
    const defaultAddress = addresses.value.find((item) => Number(item.is_default) === 1) || addresses.value[0];
    if (defaultAddress && !orderForm.addressId) orderForm.addressId = defaultAddress.id;
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '地址读取失败';
  }
}
async function openDetail(item) {
  errorMessage.value = '';
  try { const resp = await http.get('/shop/products/' + item.id); activeProduct.value = resp.data.data || item; detailVisible.value = true; }
  catch (error) { errorMessage.value = error.response?.data?.message || '商品详情读取失败'; }
}
function handleBuyClick(item) { if (!item) return; if (!isLogin.value) { router.push('/login'); return; } if (!item.can_purchase) { errorMessage.value = item.access_message || '暂未达到购买条件'; return; } openOrder(item); }
async function openOrder(item) {
  activeProduct.value = item;
  orderForm.quantity = 1;
  orderForm.addressId = 0;
  orderForm.receiverName = '';
  orderForm.receiverPhone = '';
  orderForm.receiverAddress = '';
  orderForm.saveAddress = true;
  await loadAddresses();
  orderVisible.value = true;
  detailVisible.value = false;
}
function closeOrder() { orderVisible.value = false; activeProduct.value = null; }
async function submitOrder() {
  if (!activeProduct.value) return;
  errorMessage.value = ''; successMessage.value = '';
  if (!orderForm.addressId && (!orderForm.receiverName || !orderForm.receiverPhone || !orderForm.receiverAddress)) { errorMessage.value = '请选择地址或填写完整收货信息'; return; }
  ordering.value = true;
  try {
    const productSnapshot = { ...activeProduct.value };
    const payload = { productId: productSnapshot.id, quantity: orderForm.quantity, addressId: orderForm.addressId, receiverName: orderForm.receiverName, receiverPhone: orderForm.receiverPhone, receiverAddress: orderForm.receiverAddress, saveAddress: orderForm.saveAddress };
    const resp = await http.post('/shop/orders', payload);
    const order = resp.data?.data || {};
    Object.assign(currentOrder, order);
    orderVisible.value = false;
    activeProduct.value = null;
    await fetchProducts();
    if (productSnapshot.is_points_product) successMessage.value = '兑换订单已创建，积分已扣除';
    else { payVisible.value = true; successMessage.value = ''; }
  } catch (error) { errorMessage.value = error.response?.data?.message || '下单失败'; }
  finally { ordering.value = false; }
}
async function copyOrderNo() { try { await navigator.clipboard.writeText(currentOrder.order_no || ''); successMessage.value = '订单号已复制'; } catch { successMessage.value = '请手动复制订单号'; } }
function closePayPopup() { payVisible.value = false; Object.assign(currentOrder, { order_no: '', total_amount: '0.00', points_used: 0, status: 'pending' }); }
onMounted(async () => { await fetchCategories(); await fetchProducts(); });
</script>

<style scoped>
.filter-bar,.badge-row,.modal-actions{display:flex;align-items:center;gap:10px}.filter-bar{flex-wrap:wrap;margin-top:14px}.category-main-btn,.filter-btn{min-height:38px;padding:0 12px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:rgba(255,255,255,.72);font-weight:800}.category-main-btn{display:flex;align-items:center;gap:8px;color:#080813;background:linear-gradient(135deg,#fff,#9f88ff 55%,#43e8ff)}.category-main-btn strong{font-size:12px}.filter-btn.active{color:#080813;background:linear-gradient(135deg,#fff,#9f88ff 55%,#43e8ff)}.category-panel{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.category-chip{min-height:62px;padding:10px;border-radius:18px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.07);color:#fff;text-align:left;display:grid;gap:4px}.category-chip span{font-weight:900}.category-chip em{font-style:normal;font-size:11px;color:rgba(255,255,255,.48);text-transform:uppercase}.category-chip.active{background:linear-gradient(135deg,rgba(159,136,255,.72),rgba(67,232,255,.36));border-color:rgba(255,255,255,.22)}.section-head-row{display:flex;align-items:center;justify-content:space-between;margin-top:18px}.section-head-row .section-title{margin:0}.product-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.product-card-grid{min-width:0;overflow:hidden;border-radius:22px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.07);backdrop-filter:blur(16px);box-shadow:0 16px 40px rgba(0,0,0,.18)}.product-cover,.detail-cover{display:grid;place-items:center;overflow:hidden;background:linear-gradient(135deg,rgba(141,117,255,.65),rgba(56,223,255,.38));color:rgba(255,255,255,.78)}.product-cover{width:100%;aspect-ratio:1/1;border-radius:22px 22px 0 0}.detail-cover{width:100%;height:180px;border-radius:22px;margin-top:14px}.product-cover img,.detail-cover img{width:100%;height:100%;object-fit:cover}.product-content{padding:10px}.compact-badges{gap:5px;flex-wrap:wrap}.compact-badges .badge{font-size:10px;padding:2px 6px}.product-name{min-height:42px;margin:8px 0 4px;font-size:15px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.price-line{margin:0;font-size:18px;font-weight:900;background:linear-gradient(135deg,#fff,#9f88ff 55%,#43e8ff);-webkit-background-clip:text;background-clip:text;color:transparent}.mini-line{font-size:12px;margin:4px 0}.card-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 10px 10px}.small-card-btn{min-height:34px;padding:0 8px;font-size:12px}.unlock-mini,.unlock-panel{display:grid;gap:6px;margin-top:8px}.unlock-row{display:flex;justify-content:space-between;gap:8px;padding:7px 9px;border-radius:12px;background:rgba(255,255,255,.055);color:rgba(245,242,255,.68);font-size:12px}.unlock-row strong{color:#ffcf9f;font-weight:800}.unlock-row strong.ok{color:#b9ffdd}.detail-row{font-size:13px;padding:10px 12px}.access-tip{margin:6px 0 0;color:#ffcf9f;font-size:12px;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}.access-tip.allowed{color:#b9ffdd}.access-panel{padding:12px;border-radius:14px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);color:#ffcf9f}.access-panel.allowed{color:#b9ffdd}.success-badge{color:#b9ffdd;background:rgba(80,255,174,.14)}.lock-badge{color:#ffcf9f;background:rgba(255,190,120,.14)}.modal-mask{position:fixed;inset:0;z-index:20;display:grid;place-items:center;padding:16px;background:rgba(3,3,12,.72);backdrop-filter:blur(10px)}.modal-card{width:min(100%,460px);max-height:82vh;overflow:auto}.address-box{display:grid;gap:10px;margin-top:12px}.address-title{display:flex;align-items:center;justify-content:space-between;color:#fff}.mini-link{border:0;background:transparent;color:#b9ffdd;font-weight:800}.address-option{display:flex;gap:10px;padding:10px;border-radius:16px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1)}.address-option span{display:grid;gap:4px}.address-option em{font-style:normal;color:rgba(255,255,255,.6);line-height:1.5}.address-option b{width:max-content;padding:2px 8px;border-radius:999px;background:rgba(80,255,174,.14);color:#b9ffdd}.save-row{display:flex;align-items:center;gap:8px;color:rgba(255,255,255,.72);font-size:13px}.pay-card{text-align:left}.pay-amount{margin:12px 0 14px;font-size:38px;font-weight:900;letter-spacing:1px;background:linear-gradient(135deg,#fff,#9f88ff 55%,#43e8ff);-webkit-background-clip:text;background-clip:text;color:transparent}.pay-info,.pay-box{display:grid;gap:8px;margin-top:12px;padding:12px;border-radius:18px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1)}.pay-info p{display:flex;justify-content:space-between;gap:12px;margin:0;color:rgba(255,255,255,.62)}.pay-info strong{color:#fff;text-align:right;word-break:break-all}.pay-qr{display:grid;place-items:center;min-height:120px;border-radius:16px;border:1px dashed rgba(255,255,255,.22);color:rgba(255,255,255,.7);background:rgba(0,0,0,.16)}.error-text{color:#ffb4c1;margin-top:14px}.success-text{color:#b9ffdd;margin-top:14px}button:disabled{opacity:.55}@media (max-width:360px){.product-grid{gap:9px}.product-content{padding:8px}.product-name{font-size:13px}.price-line{font-size:16px}.small-card-btn{font-size:11px;padding:0 5px}}
</style>
