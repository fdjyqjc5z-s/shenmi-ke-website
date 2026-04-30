<template>
  <section>
    <div class="hero-card">
      <div class="brand-kicker">IDENTITY CARD</div>
      <h1 class="brand-title"><span>我的身份</span></h1>
      <p class="muted">身份编码、钱包、积分、邀请关系和提现申请集中展示。</p>
    </div>

    <div v-if="!isLogin" class="glass-card" style="margin-top:14px;">
      <p class="muted">请先登录或注册，系统会自动生成你的身份编码和邀请码。</p>
      <RouterLink class="action-btn" to="/login" style="margin-top:12px; width:100%;">进入 / 注册</RouterLink>
    </div>

    <template v-else>
      <div class="grid-2" style="margin-top:14px;">
        <div class="stat-card">
          <div class="stat-label">钱包余额</div>
          <div class="stat-value">{{ assets.wallet.available_balance }} 元</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">可用积分</div>
          <div class="stat-value">{{ assets.points.points_balance }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">冻结余额</div>
          <div class="stat-value">{{ assets.wallet.frozen_balance }} 元</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">累计提现</div>
          <div class="stat-value">{{ assets.wallet.total_withdraw }} 元</div>
        </div>
      </div>

      <h2 class="section-title">我的通行证</h2>
      <div class="glass-card">
        <div class="badge">{{ profile.vip_level_id ? 'VIP 用户' : '普通用户' }}</div>
        <p class="muted">身份编码</p>
        <h2>{{ profile.user_code }}</h2>
        <p class="muted">账号：{{ profile.username }} | 昵称：{{ profile.nickname || '--' }}</p>
        <p class="muted">邀请码：{{ profile.invite_code }}</p>
        <button class="action-btn ghost-btn" style="width:100%; margin-top:10px;" @click="logout">退出登录</button>
      </div>

      <h2 class="section-title">邀请好友</h2>
      <div class="glass-card">
        <div class="invite-summary">
          <div>
            <div class="stat-label">邀请总数</div>
            <div class="stat-value">{{ inviteInfo.invite_count || 0 }}</div>
          </div>
          <div>
            <div class="stat-label">已生效</div>
            <div class="stat-value">{{ inviteInfo.effective_invite_count || 0 }}</div>
          </div>
          <div>
            <div class="stat-label">邀请奖励</div>
            <div class="stat-value">{{ inviteInfo.total_invite_points || 0 }}</div>
          </div>
        </div>

        <p class="muted">邀请链接</p>
        <div class="invite-box">{{ inviteFullUrl }}</div>
        <p class="muted reward-rule">
          新人注册奖励 {{ inviteInfo.reward_rules?.newcomer_points || 50 }} 积分；邀请好友注册奖励 {{ inviteInfo.reward_rules?.inviter_points || 20 }} 积分。
        </p>
        <button class="action-btn" style="width:100%; margin-top:10px;" @click="copyInviteUrl">复制邀请链接</button>
      </div>

      <h2 class="section-title">邀请明细</h2>
      <div v-if="inviteInfo.relations.length === 0" class="glass-card muted">暂无邀请记录，复制邀请链接发给好友即可。</div>
      <div v-else class="list-card" v-for="item in inviteInfo.relations" :key="item.id">
        <div style="flex:1; min-width:0;">
          <div class="badge-row">
            <span class="badge">{{ inviteStatusText(item.status) }}</span>
            <span class="badge">{{ item.effective_type || 'register' }}</span>
          </div>
          <h3>{{ item.nickname || item.username || '神秘客用户' }}</h3>
          <p class="muted">用户编码：{{ item.user_code || '--' }}</p>
          <p class="muted">注册时间：{{ formatTime(item.created_at) }} | 生效时间：{{ formatTime(item.effective_at) }}</p>
        </div>
      </div>

      <h2 class="section-title">申请提现</h2>
      <div class="glass-card">
        <input class="form-input" v-model.number="withdrawForm.amount" type="number" min="1" placeholder="提现金额，最低1元" />
        <select class="form-input" v-model="withdrawForm.withdrawMethod">
          <option value="manual">人工处理</option>
          <option value="alipay">支付宝</option>
          <option value="wechat">微信</option>
        </select>
        <input class="form-input" v-model="withdrawForm.accountName" placeholder="收款人姓名" />
        <input class="form-input" v-model="withdrawForm.accountNo" placeholder="收款账号" />
        <div v-if="errorMessage" class="error-text">{{ errorMessage }}</div>
        <div v-if="successMessage" class="success-text">{{ successMessage }}</div>
        <button class="action-btn" style="width:100%;" :disabled="loading" @click="submitWithdraw">提交提现申请</button>
      </div>

      <h2 class="section-title">提现记录</h2>
      <div v-if="withdrawOrders.length === 0" class="glass-card muted">暂无提现记录</div>
      <div class="list-card" v-for="item in withdrawOrders" :key="item.withdraw_no">
        <div style="flex:1;">
          <div class="badge">{{ withdrawStatusText(item.status) }}</div>
          <h3>{{ item.withdraw_no }}</h3>
          <p class="muted">金额：{{ item.amount }} 元 | 方式：{{ methodText(item.withdraw_method) }}</p>
          <p class="muted">申请时间：{{ formatTime(item.created_at) }}</p>
          <p v-if="item.reject_reason" class="muted">原因：{{ item.reject_reason }}</p>
        </div>
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

const profile = reactive({
  user_code: '',
  username: '',
  nickname: '',
  invite_code: '',
  vip_level_id: null
});

const assets = reactive({
  wallet: {
    available_balance: '0.00',
    frozen_balance: '0.00',
    deposit_frozen_balance: '0.00',
    total_income: '0.00',
    total_withdraw: '0.00'
  },
  points: {
    points_balance: 0,
    frozen_points: 0,
    total_earned: 0,
    total_used: 0
  }
});

const inviteInfo = reactive({
  invite_code: '',
  invite_url: '',
  invite_count: 0,
  effective_invite_count: 0,
  pending_invite_count: 0,
  total_invite_points: 0,
  reward_rules: {
    newcomer_points: 50,
    inviter_points: 20,
    effective_condition: '好友通过你的邀请链接注册后立即生效'
  },
  relations: []
});

const withdrawForm = reactive({
  amount: 1,
  withdrawMethod: 'manual',
  accountName: '',
  accountNo: ''
});

const withdrawOrders = ref([]);

const inviteFullUrl = computed(() => {
  const path = inviteInfo.invite_url || `/login?inviteCode=${profile.invite_code}`;
  return `${window.location.origin}${path}`;
});

function withdrawStatusText(status) {
  const map = { pending: '待审核', approved: '已通过', rejected: '已拒绝', paid: '已打款' };
  return map[status] || status;
}

function inviteStatusText(status) {
  const map = { pending: '待生效', effective: '已生效', invalid: '无效' };
  return map[status] || status;
}

function methodText(method) {
  const map = { manual: '人工处理', alipay: '支付宝', wechat: '微信' };
  return map[method] || method;
}

function formatTime(value) {
  if (!value) return '--';
  return String(value).replace('T', ' ').slice(0, 19);
}

async function loadMine() {
  if (!isLogin.value) return;
  loading.value = true;
  errorMessage.value = '';

  try {
    const [profileResp, assetsResp, inviteResp, withdrawResp] = await Promise.all([
      http.get('/user/me'),
      http.get('/user/assets'),
      http.get('/user/invite'),
      http.get('/user/withdraw-orders')
    ]);

    Object.assign(profile, profileResp.data.data || {});
    Object.assign(assets.wallet, assetsResp.data.data?.wallet || {});
    Object.assign(assets.points, assetsResp.data.data?.points || {});
    Object.assign(inviteInfo, inviteResp.data.data || {});
    withdrawOrders.value = withdrawResp.data.data || [];
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '我的信息读取失败，请重新登录';
  } finally {
    loading.value = false;
  }
}

async function submitWithdraw() {
  errorMessage.value = '';
  successMessage.value = '';

  try {
    await http.post('/user/withdraw-orders', { ...withdrawForm });
    successMessage.value = '提现申请已提交，等待后台审核';
    withdrawForm.amount = 1;
    withdrawForm.accountName = '';
    withdrawForm.accountNo = '';
    await loadMine();
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '提现申请失败';
  }
}

async function copyInviteUrl() {
  try {
    await navigator.clipboard.writeText(inviteFullUrl.value);
    successMessage.value = '邀请链接已复制';
  } catch {
    successMessage.value = '请手动复制邀请链接';
  }
}

function logout() {
  localStorage.removeItem('user_token');
  localStorage.removeItem('user_info');
  router.replace('/login');
}

onMounted(loadMine);
</script>

<style scoped>
.badge-row,
.invite-summary {
  display: flex;
  align-items: center;
  gap: 10px;
}

.invite-summary {
  justify-content: space-between;
  margin-bottom: 14px;
  padding: 12px;
  border-radius: 18px;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.08);
}

.invite-box {
  padding: 12px;
  border-radius: 14px;
  background: rgba(0,0,0,0.24);
  border: 1px solid rgba(255,255,255,0.08);
  word-break: break-all;
  color: #e6ddff;
}

.reward-rule {
  margin-bottom: 0;
  font-size: 13px;
}

.error-text {
  color: #ffb4c1;
  font-size: 14px;
  margin-bottom: 10px;
}

.success-text {
  color: #b9ffdd;
  font-size: 14px;
  margin-bottom: 10px;
}

button:disabled {
  opacity: 0.55;
}
</style>
