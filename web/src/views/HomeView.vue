<template>
  <section>
    <div class="hero-card">
      <div class="brand-kicker">MYSTERY ACCESS</div>
      <h1 class="brand-title">欢迎来到<br /><span>神秘客</span></h1>
      <p class="muted">接任务、积累积分、解锁专属商品。每一个身份编码，都是你在神秘客里的通行证。</p>
      <div class="hero-actions">
        <RouterLink class="action-btn" to="/tasks">进入任务</RouterLink>
        <RouterLink class="action-btn ghost-btn" to="/shop">神秘商城</RouterLink>
      </div>
    </div>

    <div v-if="loading" class="glass-card" style="margin-top:14px;">正在读取神秘客首页...</div>
    <div v-if="errorMessage" class="glass-card error-text">{{ errorMessage }}</div>

    <div v-if="isLogin" class="glass-card user-card">
      <div>
        <div class="brand-kicker">MY ACCESS</div>
        <h2>{{ profile.nickname || profile.username || '神秘客用户' }}</h2>
        <p class="muted">身份编码：{{ profile.user_code || '--' }}</p>
        <p class="muted">邀请码：{{ inviteInfo.invite_code || profile.invite_code || '--' }}</p>
      </div>
      <RouterLink class="action-btn ghost-btn small-btn" to="/mine">查看资产</RouterLink>
    </div>

    <div class="grid-2" style="margin-top:14px;">
      <div class="stat-card">
        <div class="stat-label">{{ isLogin ? '钱包余额' : '新人奖励' }}</div>
        <div class="stat-value">{{ isLogin ? assets.wallet.available_balance + ' 元' : summary.stats.newcomer_points + ' 积分' }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">{{ isLogin ? '可用积分' : '最低提现' }}</div>
        <div class="stat-value">{{ isLogin ? assets.points.points_balance : summary.stats.min_withdraw_amount + ' 元' }}</div>
      </div>
      <div v-if="isLogin" class="stat-card">
        <div class="stat-label">已邀请</div>
        <div class="stat-value">{{ inviteInfo.invite_count || 0 }} 人</div>
      </div>
      <div v-if="isLogin" class="stat-card">
        <div class="stat-label">冻结余额</div>
        <div class="stat-value">{{ assets.wallet.frozen_balance }} 元</div>
      </div>
    </div>

    <div v-if="isLogin" class="glass-card invite-card">
      <p class="muted">我的邀请链接</p>
      <div class="invite-url">{{ inviteFullUrl }}</div>
      <button class="action-btn" style="width:100%; margin-top:10px;" @click="copyInviteUrl">复制邀请链接</button>
    </div>

    <template v-if="!loading">
      <h2 v-if="summary.banners.length" class="section-title">神秘推荐</h2>
      <div v-if="summary.banners.length" class="banner-list">
        <a
          v-for="banner in summary.banners"
          :key="banner.id"
          class="banner-card"
          :href="banner.link_url || 'javascript:void(0)'"
        >
          <img v-if="banner.image_url" :src="banner.image_url" alt="banner" />
          <div class="banner-mask">
            <div class="badge">推荐</div>
            <h3>{{ banner.title || '神秘客推荐' }}</h3>
          </div>
        </a>
      </div>

      <h2 v-if="summary.announcements.length" class="section-title">平台公告</h2>
      <div v-if="summary.announcements.length" class="list-card" v-for="item in summary.announcements" :key="item.id">
        <div>
          <div class="badge">公告</div>
          <h3>{{ item.title }}</h3>
          <p class="muted clamp-text">{{ item.content }}</p>
        </div>
      </div>

      <h2 class="section-title">推荐任务</h2>
      <div v-if="summary.tasks.length === 0" class="glass-card muted">暂无推荐任务</div>
      <div v-else class="list-card" v-for="task in summary.tasks" :key="task.id">
        <div style="flex:1; min-width:0;">
          <div class="badge-row">
            <div class="badge">{{ task.vip_only ? 'VIP任务' : '推荐任务' }}</div>
            <div v-if="task.deposit_required" class="badge">押金</div>
          </div>
          <h3>{{ task.title }}</h3>
          <p class="muted clamp-text">{{ task.content || '按要求完成任务，提交后等待审核。' }}</p>
          <p class="muted">奖励：{{ task.reward_amount }} 元 + {{ task.reward_points }} 积分</p>
        </div>
        <RouterLink class="action-btn ghost-btn small-btn" to="/tasks">去接</RouterLink>
      </div>

      <h2 class="section-title">推荐商品</h2>
      <div v-if="summary.products.length === 0" class="glass-card muted">暂无推荐商品</div>
      <div v-else class="list-card product-card" v-for="product in summary.products" :key="product.id">
        <div class="product-cover">
          <img v-if="product.cover_image" :src="product.cover_image" alt="商品图" />
          <span v-else>商品</span>
        </div>
        <div style="flex:1; min-width:0;">
          <div class="badge-row">
            <div class="badge">{{ product.is_points_product ? '积分商品' : '精选商品' }}</div>
            <div v-if="product.vip_only" class="badge">VIP</div>
          </div>
          <h3>{{ product.name }}</h3>
          <p class="muted">价格：{{ product.price }} 元 | 积分价：{{ product.points_price }}</p>
          <p class="muted">库存：{{ product.stock }} | 已售：{{ product.sales_count || 0 }}</p>
        </div>
        <RouterLink class="action-btn ghost-btn small-btn" to="/shop">查看</RouterLink>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import http from '../utils/http.js';

const loading = ref(false);
const errorMessage = ref('');
const isLogin = computed(() => Boolean(localStorage.getItem('user_token')));

const summary = reactive({
  banners: [],
  announcements: [],
  products: [],
  tasks: [],
  stats: {
    newcomer_points: 50,
    min_withdraw_amount: 1
  }
});

const profile = reactive({
  username: '',
  nickname: '',
  user_code: '',
  invite_code: ''
});

const assets = reactive({
  wallet: {
    available_balance: '0.00',
    frozen_balance: '0.00'
  },
  points: {
    points_balance: 0
  }
});

const inviteInfo = reactive({
  invite_code: '',
  invite_url: '',
  invite_count: 0
});

const inviteFullUrl = computed(() => {
  const code = inviteInfo.invite_code || profile.invite_code || '';
  const path = inviteInfo.invite_url || `/login?inviteCode=${code}`;
  return `${window.location.origin}${path}`;
});

async function fetchHome() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const resp = await http.get('/home/summary');
    const data = resp.data.data || {};
    summary.banners = data.banners || [];
    summary.announcements = data.announcements || [];
    summary.products = data.products || [];
    summary.tasks = data.tasks || [];
    Object.assign(summary.stats, data.stats || {});
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '首页数据读取失败';
  } finally {
    loading.value = false;
  }
}

async function fetchUserSnapshot() {
  if (!isLogin.value) return;

  try {
    const [profileResp, assetsResp, inviteResp] = await Promise.all([
      http.get('/user/me'),
      http.get('/user/assets'),
      http.get('/user/invite')
    ]);

    Object.assign(profile, profileResp.data.data || {});
    Object.assign(assets.wallet, assetsResp.data.data?.wallet || {});
    Object.assign(assets.points, assetsResp.data.data?.points || {});
    Object.assign(inviteInfo, inviteResp.data.data || {});
  } catch {
    // 首页动态资产读取失败不阻断推荐内容展示
  }
}

async function copyInviteUrl() {
  try {
    await navigator.clipboard.writeText(inviteFullUrl.value);
  } catch {
    // 复制失败时保持页面可手动复制
  }
}

onMounted(async () => {
  await Promise.all([fetchHome(), fetchUserSnapshot()]);
});
</script>

<style scoped>
.hero-actions,
.badge-row,
.user-card {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hero-actions {
  margin-top: 18px;
  flex-wrap: wrap;
}

.user-card {
  justify-content: space-between;
  margin-top: 14px;
}

.invite-card {
  margin-top: 14px;
}

.invite-url {
  padding: 12px;
  border-radius: 14px;
  background: rgba(0,0,0,0.24);
  border: 1px solid rgba(255,255,255,0.08);
  word-break: break-all;
  color: #e6ddff;
}

.banner-list {
  display: grid;
  gap: 12px;
}

.banner-card {
  position: relative;
  display: block;
  min-height: 136px;
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid rgba(255,255,255,0.12);
  background: linear-gradient(135deg, rgba(141,117,255,0.45), rgba(56,223,255,0.25));
}

.banner-card img {
  width: 100%;
  height: 160px;
  object-fit: cover;
  display: block;
}

.banner-mask {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 16px;
  background: linear-gradient(180deg, transparent, rgba(0,0,0,0.68));
}

.product-card {
  align-items: flex-start;
}

.product-cover {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(141,117,255,0.65), rgba(56,223,255,0.38));
  color: rgba(255,255,255,0.78);
}

.product-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.small-btn {
  min-height: 38px;
  padding: 0 12px;
  flex-shrink: 0;
}

.clamp-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.error-text {
  color: #ffb4c1;
  margin-top: 14px;
}
</style>
