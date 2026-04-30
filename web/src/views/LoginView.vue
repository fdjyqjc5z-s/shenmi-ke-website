<template>
  <section>
    <div class="hero-card">
      <div class="brand-kicker">ACCESS GATE</div>
      <h1 class="brand-title">进入<br /><span>神秘客</span></h1>
      <p class="muted">注册后自动生成身份编码、邀请码、钱包和积分账户。邀请码会自动绑定上级。</p>
    </div>

    <div class="glass-card" style="margin-top:14px;">
      <div class="tab-row">
        <button class="tab-btn" :class="{ active: mode === 'login' }" @click="mode = 'login'">登录</button>
        <button class="tab-btn" :class="{ active: mode === 'register' }" @click="mode = 'register'">注册</button>
      </div>

      <input class="form-input" v-model="form.username" placeholder="用户名，至少3位" />
      <input class="form-input" v-model="form.password" placeholder="密码，至少8位且包含字母和数字" type="password" @keyup.enter="submit" />
      <input v-if="mode === 'register'" class="form-input" v-model="form.nickname" placeholder="昵称，可选" />
      <input v-if="mode === 'register'" class="form-input" v-model="form.inviteCode" placeholder="邀请码，可选" />

      <div v-if="errorMessage" class="error-text">{{ errorMessage }}</div>
      <button class="action-btn" style="width:100%;" :disabled="loading" @click="submit">
        {{ loading ? '处理中...' : mode === 'login' ? '登录' : '注册并进入' }}
      </button>

      <p class="muted" style="font-size:13px; margin-bottom:0;">
        新用户注册奖励 50 积分；通过邀请码注册会自动绑定邀请关系。
      </p>
    </div>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import http from '../utils/http.js';

const route = useRoute();
const router = useRouter();
const mode = ref('login');
const loading = ref(false);
const errorMessage = ref('');

const form = reactive({
  username: '',
  password: '',
  nickname: '',
  inviteCode: ''
});

onMounted(() => {
  const code = route.query.inviteCode || route.query.invite || '';
  if (code) {
    form.inviteCode = String(code);
    mode.value = 'register';
  }
});

async function submit() {
  errorMessage.value = '';

  if (!form.username || !form.password) {
    errorMessage.value = '请输入用户名和密码';
    return;
  }

  loading.value = true;
  try {
    const url = mode.value === 'login' ? '/auth/login' : '/auth/register';
    const payload = mode.value === 'login'
      ? { username: form.username, password: form.password }
      : { username: form.username, password: form.password, nickname: form.nickname || form.username, inviteCode: form.inviteCode };

    const resp = await http.post(url, payload);
    const token = resp.data?.data?.token;
    const user = resp.data?.data?.user;

    if (!token) throw new Error('接口未返回登录凭证');

    localStorage.setItem('user_token', token);
    localStorage.setItem('user_info', JSON.stringify(user || {}));
    router.replace('/mine');
  } catch (error) {
    errorMessage.value = error.response?.data?.message || error.message || '操作失败';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.tab-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
}

.tab-btn {
  min-height: 42px;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 14px;
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.68);
  font-weight: 800;
}

.tab-btn.active {
  color: #080813;
  background: linear-gradient(135deg, #ffffff, #9f88ff 55%, #43e8ff);
}

.error-text {
  color: #ffb4c1;
  font-size: 14px;
  margin-bottom: 12px;
}

button:disabled {
  opacity: 0.55;
}
</style>
