<template>
  <section class="login-page">
    <div class="login-card">
      <div class="brand-kicker">ADMIN ACCESS</div>
      <h1>神秘客后台</h1>
      <p class="muted">请输入管理员账号和密码进入控制台。</p>

      <input class="form-input" placeholder="管理员账号" v-model="username" @keyup.enter="login" />
      <input class="form-input" type="password" placeholder="密码" v-model="password" @keyup.enter="login" />

      <div v-if="errorMessage" class="error-text">{{ errorMessage }}</div>
      <button class="action-btn" :disabled="loading" @click="login">
        {{ loading ? '登录中...' : '登录' }}
      </button>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const router = useRouter();
const username = ref('');
const password = ref('');
const loading = ref(false);
const errorMessage = ref('');

async function login() {
  errorMessage.value = '';

  if (!username.value || !password.value) {
    errorMessage.value = '请输入管理员账号和密码';
    return;
  }

  loading.value = true;
  try {
    const resp = await axios.post('/api/admin/login', {
      username: username.value,
      password: password.value
    });

    const token = resp.data?.data?.token;
    const admin = resp.data?.data?.admin;

    if (!token) {
      throw new Error('登录接口未返回令牌');
    }

    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_user', JSON.stringify(admin || {}));
    router.replace('/admin/dashboard');
  } catch (err) {
    errorMessage.value = err.response?.data?.message || err.message || '登录失败';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 20% 10%, rgba(128,92,255,0.28), transparent 30%), linear-gradient(180deg, #080816 0%, #0e0e1c 100%);
}
.login-card {
  padding: 32px;
  border-radius: 24px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(92vw, 360px);
  box-shadow: 0 20px 80px rgba(0,0,0,0.35);
}
.login-card h1 {
  margin: 0;
  font-size: 30px;
  font-weight: 900;
  background: linear-gradient(90deg, #ffffff, #b49cff, #42e8ff);
  -webkit-background-clip: text;
  color: transparent;
}
.form-input {
  padding: 10px 14px;
  min-height: 44px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.08);
  color: #fff;
  outline: none;
}
.action-btn {
  padding: 10px;
  min-height: 44px;
  border-radius: 12px;
  border: none;
  font-weight: 800;
  background: linear-gradient(135deg, #ffffff, #9f88ff, #43e8ff);
  color: #080813;
  cursor: pointer;
}
.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.error-text {
  color: #ffb4c1;
  font-size: 14px;
}
</style>
