<template>
  <section>
    <div class="hero-card">
      <div class="brand-kicker">IDENTITY CARD</div>
      <h1 class="brand-title"><span>我的身份</span></h1>
      <p class="muted">身份编码、钱包、积分、地址管理、购买记录、分销返利和提现申请集中展示。</p>
    </div>

    <div v-if="!isLogin" class="glass-card" style="margin-top:14px;">
      <p class="muted">请先登录或注册，系统会自动生成你的身份编码和邀请码。</p>
      <RouterLink class="action-btn" to="/login" style="margin-top:12px; width:100%;">进入 / 注册</RouterLink>
    </div>

    <template v-else>
      <div class="grid-2" style="margin-top:14px;">
        <div class="stat-card"><div class="stat-label">钱包余额</div><div class="stat-value">{{ assets.wallet.available_balance }} 元</div></div>
        <div class="stat-card"><div class="stat-label">可用积分</div><div class="stat-value">{{ assets.points.points_balance }}</div></div>
        <div class="stat-card"><div class="stat-label">分销返利</div><div class="stat-value">{{ inviteInfo.total_distribution_rebate || 0 }} 元</div></div>
        <button class="stat-card stat-button" type="button" @click="ordersExpanded = !ordersExpanded">
          <div class="stat-label">购买记录</div>
          <div class="stat-value">{{ myOrders.length }} 单</div>
        </button>
      </div>

      <h2 class="section-title">我的通行证</h2>
      <div class="glass-card">
        <div class="badge">{{ profile.vip_level_id ? 'VIP 用户' : '普通用户' }}</div>
        <p class="muted">身份编码</p>
        <h2>{{ profile.user_code }}</h2>
        <p class="muted">账号：{{ profile.username }} | 昵称：{{ profile.nickname || '--' }}</p>
        <p class="muted">我的邀请码：{{ profile.invite_code }}</p>
        <p class="muted">绑定上级：{{ boundInviterText }}</p>
        <button class="action-btn ghost-btn" style="width:100%; margin-top:10px;" @click="logout">退出登录</button>
      </div>

      <h2 class="section-title">收货地址管理</h2>
      <div class="glass-card">
        <div class="address-form">
          <input class="form-input" v-model="addressForm.receiverName" placeholder="收货人姓名" />
          <input class="form-input" v-model="addressForm.receiverPhone" placeholder="收货人电话" />
          <input class="form-input" v-model="addressForm.receiverAddress" placeholder="详细收货地址" />
          <label class="check-row"><input type="checkbox" v-model="addressForm.isDefault" /> 设为默认地址</label>
          <div class="form-actions">
            <button class="action-btn" :disabled="loading" @click="submitAddress">{{ addressForm.id ? '保存修改' : '新增地址' }}</button>
            <button v-if="addressForm.id" class="action-btn ghost-btn" @click="resetAddressForm">取消编辑</button>
          </div>
        </div>
      </div>
      <div v-if="addresses.length === 0" class="glass-card muted">暂无收货地址。添加后下单时可以直接选择。</div>
      <div v-else class="list-card" v-for="addr in addresses" :key="addr.id">
        <div style="flex:1; min-width:0;">
          <div class="badge-row">
            <span class="badge">地址</span>
            <span v-if="addr.is_default" class="badge success-badge">默认</span>
          </div>
          <h3>{{ addr.receiver_name }} {{ addr.receiver_phone }}</h3>
          <p class="muted address-line">{{ addr.receiver_address }}</p>
        </div>
        <div class="row-actions">
          <button class="action-btn ghost-btn" @click="editAddress(addr)">编辑</button>
          <button class="action-btn ghost-btn" @click="deleteAddress(addr)">删除</button>
        </div>
      </div>

      <div class="section-toggle">
        <div>
          <h2 class="section-title compact-title">购买商品管理</h2>
          <p class="muted order-tip">默认折叠，点击展开查看历史订单。</p>
        </div>
        <button class="action-btn ghost-btn small-toggle" @click="ordersExpanded = !ordersExpanded">
          {{ ordersExpanded ? '收起' : `展开 ${myOrders.length} 单` }}
        </button>
      </div>
      <template v-if="ordersExpanded">
        <div v-if="myOrders.length === 0" class="glass-card muted">暂无购买记录。下单成功后会显示在这里。</div>
        <div v-else class="list-card order-card" v-for="order in myOrders" :key="order.order_no + '-' + order.product_id">
          <div class="order-cover">
            <img v-if="order.product_image" :src="order.product_image" alt="商品图" />
            <span v-else>商品</span>
          </div>
          <div style="flex:1; min-width:0;">
            <div class="badge-row">
              <span class="badge">{{ orderStatusText(order.status) }}</span>
              <span class="badge">{{ payStatusText(order.pay_status) }}</span>
            </div>
            <h3>{{ order.product_name || order.order_no }}</h3>
            <p class="muted">订单号：{{ order.order_no }}</p>
            <p class="muted">数量：{{ order.quantity || 1 }} | 金额：{{ order.total_amount }} 元 | 积分：{{ order.points_used }}</p>
            <p class="muted">收货：{{ order.receiver_name || '--' }} / {{ order.receiver_phone || '--' }}</p>
            <p class="muted address-line">{{ order.receiver_address || '--' }}</p>
            <p class="muted">下单时间：{{ formatTime(order.created_at) }}</p>
          </div>
        </div>
      </template>

      <h2 class="section-title">绑定分销码</h2>
      <div class="glass-card">
        <template v-if="inviteInfo.is_bound_distribution">
          <div class="badge">已绑定</div>
          <h3>{{ boundInviterText }}</h3>
          <p class="muted">谁的邀请码被绑定，谁就是你的一级上级。绑定后不能重复更换。</p>
        </template>
        <template v-else>
          <p class="muted">输入平台提供的分销码，绑定后你的购买返利和上级返现会按后台规则计算。</p>
          <input class="form-input" v-model="bindForm.inviteCode" placeholder="请输入分销码 / 邀请码" />
          <button class="action-btn" style="width:100%;" :disabled="loading" @click="submitBindInviteCode">确认绑定</button>
        </template>
      </div>

      <h2 class="section-title">分销返利</h2>
      <div class="glass-card">
        <div class="invite-summary">
          <div><div class="stat-label">总返利</div><div class="stat-value">{{ inviteInfo.total_distribution_rebate || 0 }} 元</div></div>
          <div><div class="stat-label">客户返利</div><div class="stat-value">{{ inviteInfo.total_buyer_rebate || 0 }} 元</div></div>
          <div><div class="stat-label">上级返现</div><div class="stat-value">{{ inviteInfo.total_owner_rebate || 0 }} 元</div></div>
        </div>
        <p class="muted reward-rule">{{ inviteInfo.reward_rules?.effective_condition || '绑定分销码后按后台设置发放返利。' }}</p>
      </div>

      <h2 class="section-title">返利记录</h2>
      <div v-if="inviteInfo.rebate_logs.length === 0" class="glass-card muted">暂无返利记录。订单完成并触发返利后会显示在这里。</div>
      <div v-else class="list-card" v-for="log in inviteInfo.rebate_logs" :key="log.id">
        <div style="flex:1; min-width:0;">
          <div class="badge-row"><span class="badge">{{ rewardTypeText(log.reward_type) }}</span><span class="badge">{{ log.status }}</span></div>
          <h3>{{ log.order_no }}</h3>
          <p class="muted">购买用户：{{ log.buyer_nickname || log.buyer_username || '--' }} / {{ log.buyer_user_code || '--' }}</p>
          <p class="muted">返利金额：{{ log.reward_amount }} 元 | 规则：{{ ruleText(log.reward_rule_type, log.reward_rule_value) }}</p>
          <p class="muted">发放时间：{{ formatTime(log.paid_at || log.created_at) }}</p>
        </div>
      </div>

      <h2 class="section-title">邀请好友</h2>
      <div class="glass-card">
        <div class="invite-summary">
          <div><div class="stat-label">邀请总数</div><div class="stat-value">{{ inviteInfo.invite_count || 0 }}</div></div>
          <div><div class="stat-label">已生效</div><div class="stat-value">{{ inviteInfo.effective_invite_count || 0 }}</div></div>
          <div><div class="stat-label">积分奖励</div><div class="stat-value">{{ inviteInfo.total_invite_points || 0 }}</div></div>
        </div>
        <p class="muted">邀请链接</p>
        <div class="invite-box">{{ inviteFullUrl }}</div>
        <p class="muted reward-rule">新人注册奖励 {{ inviteInfo.reward_rules?.newcomer_points || 50 }} 积分；邀请好友注册奖励 {{ inviteInfo.reward_rules?.inviter_points || 20 }} 积分。</p>
        <button class="action-btn" style="width:100%; margin-top:10px;" @click="copyInviteUrl">复制邀请链接</button>
      </div>

      <h2 class="section-title">邀请明细</h2>
      <div v-if="inviteInfo.relations.length === 0" class="glass-card muted">暂无邀请记录，复制邀请链接发给好友即可。</div>
      <div v-else class="list-card" v-for="item in inviteInfo.relations" :key="item.id">
        <div style="flex:1; min-width:0;">
          <div class="badge-row"><span class="badge">{{ inviteStatusText(item.status) }}</span><span class="badge">{{ item.effective_type || 'register' }}</span></div>
          <h3>{{ item.nickname || item.username || '神秘客用户' }}</h3>
          <p class="muted">用户编码：{{ item.user_code || '--' }}</p>
          <p class="muted">注册时间：{{ formatTime(item.created_at) }} | 生效时间：{{ formatTime(item.effective_at) }}</p>
        </div>
      </div>

      <h2 class="section-title">平台公告</h2>
      <div v-if="announcements.length === 0" class="glass-card muted">暂无公告</div>
      <div v-else class="list-card" v-for="item in announcements" :key="item.id">
        <div style="flex:1; min-width:0;"><div class="badge">公告</div><h3>{{ item.title }}</h3><p class="muted announcement-content">{{ item.content }}</p><p class="muted">发布时间：{{ formatTime(item.created_at) }}</p></div>
      </div>

      <h2 class="section-title">申请提现</h2>
      <div class="glass-card">
        <input class="form-input" v-model.number="withdrawForm.amount" type="number" min="1" placeholder="提现金额，最低1元" />
        <select class="form-input" v-model="withdrawForm.withdrawMethod"><option value="manual">人工处理</option><option value="alipay">支付宝</option><option value="wechat">微信</option></select>
        <input class="form-input" v-model="withdrawForm.accountName" placeholder="收款人姓名" />
        <input class="form-input" v-model="withdrawForm.accountNo" placeholder="收款账号" />
        <div v-if="errorMessage" class="error-text">{{ errorMessage }}</div>
        <div v-if="successMessage" class="success-text">{{ successMessage }}</div>
        <button class="action-btn" style="width:100%;" :disabled="loading" @click="submitWithdraw">提交提现申请</button>
      </div>

      <h2 class="section-title">提现记录</h2>
      <div v-if="withdrawOrders.length === 0" class="glass-card muted">暂无提现记录</div>
      <div class="list-card" v-for="item in withdrawOrders" :key="item.withdraw_no">
        <div style="flex:1;"><div class="badge">{{ withdrawStatusText(item.status) }}</div><h3>{{ item.withdraw_no }}</h3><p class="muted">金额：{{ item.amount }} 元 | 方式：{{ methodText(item.withdraw_method) }}</p><p class="muted">申请时间：{{ formatTime(item.created_at) }}</p><p v-if="item.reject_reason" class="muted">原因：{{ item.reject_reason }}</p></div>
      </div>
    </template>
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
const isLogin = computed(() => Boolean(localStorage.getItem('user_token')));
const ordersExpanded = ref(false);
const profile = reactive({ user_code: '', username: '', nickname: '', invite_code: '', vip_level_id: null });
const assets = reactive({ wallet: { available_balance: '0.00', frozen_balance: '0.00', deposit_frozen_balance: '0.00', total_income: '0.00', total_withdraw: '0.00' }, points: { points_balance: 0, frozen_points: 0, total_earned: 0, total_used: 0 } });
const inviteInfo = reactive({ invite_code: '', invite_url: '', bound_inviter: null, is_bound_distribution: false, invite_count: 0, effective_invite_count: 0, pending_invite_count: 0, total_invite_points: 0, total_buyer_rebate: 0, total_owner_rebate: 0, total_distribution_rebate: 0, rebate_logs: [], reward_rules: { newcomer_points: 50, inviter_points: 20, bind_points: 20, effective_condition: '绑定分销码后按后台设置发放返利。' }, relations: [] });
const bindForm = reactive({ inviteCode: '' });
const withdrawForm = reactive({ amount: 1, withdrawMethod: 'manual', accountName: '', accountNo: '' });
const addressForm = reactive({ id: null, receiverName: '', receiverPhone: '', receiverAddress: '', isDefault: false });
const withdrawOrders = ref([]);
const announcements = ref([]);
const addresses = ref([]);
const myOrders = ref([]);
const inviteFullUrl = computed(() => `${window.location.origin}${inviteInfo.invite_url || `/login?inviteCode=${profile.invite_code}`}`);
const boundInviterText = computed(() => { const inviter = inviteInfo.bound_inviter; if (!inviter) return '未绑定上级'; return `${inviter.nickname || inviter.username || '上级用户'}｜编码 ${inviter.user_code || '--'}｜邀请码 ${inviter.invite_code || '--'}`; });
function withdrawStatusText(status) { return ({ pending: '待审核', approved: '已通过', rejected: '已拒绝', paid: '已打款' })[status] || status; }
function orderStatusText(status) { return ({ pending: '待处理', paid: '已支付', shipped: '已发货', completed: '已完成', cancelled: '已取消' })[status] || status; }
function payStatusText(status) { return ({ unpaid: '未支付', paid: '已支付', refunded: '已退款' })[status] || status; }
function inviteStatusText(status) { return ({ pending: '待生效', effective: '已生效', invalid: '无效' })[status] || status; }
function rewardTypeText(type) { return ({ buyer_rebate: '客户返利', owner_rebate: '上级返现' })[type] || type; }
function ruleText(type, value) { const number = Number(value || 0); if (!number) return '未设置'; return type === 'percent' ? `${number}%` : `${number} 元`; }
function methodText(method) { return ({ manual: '人工处理', alipay: '支付宝', wechat: '微信' })[method] || method; }
function formatTime(value) { if (!value) return '--'; return String(value).replace('T', ' ').slice(0, 19); }
async function loadMine() {
  if (!isLogin.value) return;
  loading.value = true; errorMessage.value = '';
  try {
    const [profileResp, assetsResp, inviteResp, withdrawResp, homeResp, addressResp, orderResp] = await Promise.all([http.get('/user/me'), http.get('/user/assets'), http.get('/user/invite'), http.get('/user/withdraw-orders'), http.get('/home/summary'), http.get('/user/addresses'), http.get('/shop/orders')]);
    Object.assign(profile, profileResp.data.data || {});
    Object.assign(assets.wallet, assetsResp.data.data?.wallet || {});
    Object.assign(assets.points, assetsResp.data.data?.points || {});
    Object.assign(inviteInfo, inviteResp.data.data || {});
    withdrawOrders.value = withdrawResp.data.data || [];
    announcements.value = homeResp.data.data?.announcements || [];
    addresses.value = addressResp.data.data || [];
    myOrders.value = orderResp.data.data || [];
  } catch (error) { errorMessage.value = error.response?.data?.message || '我的信息读取失败，请重新登录'; }
  finally { loading.value = false; }
}
function resetAddressForm() { Object.assign(addressForm, { id: null, receiverName: '', receiverPhone: '', receiverAddress: '', isDefault: false }); }
function editAddress(addr) { Object.assign(addressForm, { id: addr.id, receiverName: addr.receiver_name, receiverPhone: addr.receiver_phone, receiverAddress: addr.receiver_address, isDefault: Boolean(addr.is_default) }); }
async function submitAddress() {
  errorMessage.value = ''; successMessage.value = '';
  if (!addressForm.receiverName || !addressForm.receiverPhone || !addressForm.receiverAddress) { errorMessage.value = '请填写完整收货地址'; return; }
  try {
    const payload = { receiverName: addressForm.receiverName, receiverPhone: addressForm.receiverPhone, receiverAddress: addressForm.receiverAddress, isDefault: addressForm.isDefault };
    if (addressForm.id) await http.put('/user/addresses/' + addressForm.id, payload); else await http.post('/user/addresses', payload);
    successMessage.value = addressForm.id ? '地址已更新' : '地址已新增';
    resetAddressForm(); await loadMine();
  } catch (error) { errorMessage.value = error.response?.data?.message || '地址保存失败'; }
}
async function deleteAddress(addr) {
  errorMessage.value = ''; successMessage.value = '';
  try { await http.delete('/user/addresses/' + addr.id); successMessage.value = '地址已删除'; await loadMine(); }
  catch (error) { errorMessage.value = error.response?.data?.message || '地址删除失败'; }
}
async function submitBindInviteCode() {
  errorMessage.value = ''; successMessage.value = '';
  if (!bindForm.inviteCode) { errorMessage.value = '请输入分销码'; return; }
  try { await http.post('/user/bind-invite', { inviteCode: bindForm.inviteCode }); bindForm.inviteCode = ''; successMessage.value = '分销码绑定成功'; await loadMine(); }
  catch (error) { errorMessage.value = error.response?.data?.message || '分销码绑定失败'; }
}
async function submitWithdraw() {
  errorMessage.value = ''; successMessage.value = '';
  try { await http.post('/user/withdraw-orders', { ...withdrawForm }); successMessage.value = '提现申请已提交，等待后台审核'; withdrawForm.amount = 1; withdrawForm.accountName = ''; withdrawForm.accountNo = ''; await loadMine(); }
  catch (error) { errorMessage.value = error.response?.data?.message || '提现申请失败'; }
}
async function copyInviteUrl() { try { await navigator.clipboard.writeText(inviteFullUrl.value); successMessage.value = '邀请链接已复制'; } catch { successMessage.value = '请手动复制邀请链接'; } }
function logout() { localStorage.removeItem('user_token'); localStorage.removeItem('user_info'); router.replace('/login'); }
onMounted(loadMine);
</script>

<style scoped>
.badge-row,.invite-summary,.form-actions,.row-actions,.section-toggle{display:flex;align-items:center;gap:10px}.invite-summary{justify-content:space-between;margin-bottom:14px;padding:12px;border-radius:18px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.08)}.invite-box{padding:12px;border-radius:14px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.08);word-break:break-all;color:#e6ddff}.reward-rule{margin-bottom:0;font-size:13px}.announcement-content,.address-line{white-space:pre-wrap}.address-form{display:grid;gap:10px}.check-row{display:flex;align-items:center;gap:8px;color:rgba(255,255,255,.72);font-size:13px}.form-actions{flex-wrap:wrap}.row-actions{flex-wrap:wrap;justify-content:flex-end;max-width:160px}.success-badge{color:#b9ffdd;background:rgba(80,255,174,.14)}.section-toggle{justify-content:space-between;margin-top:22px}.compact-title{margin:0}.order-tip{margin:6px 0 0;font-size:13px}.small-toggle{min-height:38px;padding:0 12px;white-space:nowrap}.stat-button{text-align:left;border:1px solid rgba(255,255,255,.1);cursor:pointer;color:inherit}.order-card{align-items:flex-start}.order-cover{width:62px;height:62px;flex-shrink:0;display:grid;place-items:center;overflow:hidden;border-radius:18px;background:linear-gradient(135deg,rgba(141,117,255,.65),rgba(56,223,255,.38));color:rgba(255,255,255,.78)}.order-cover img{width:100%;height:100%;object-fit:cover}.error-text{color:#ffb4c1;font-size:14px;margin-bottom:10px}.success-text{color:#b9ffdd;font-size:14px;margin-bottom:10px}button:disabled{opacity:.55}
</style>
