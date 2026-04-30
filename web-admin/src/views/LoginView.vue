<template>
  <section class="login-page">
    <div class="login-card">
      <h1>神秘客后台</h1>
      <input class="form-input" placeholder="管理员账号" v-model="username" />
      <input class="form-input" type="password" placeholder="密码" v-model="password" />
      <button class="action-btn" @click="login">登录</button>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';

const username = ref('');
const password = ref('');

async function login() {
  try {
    const resp = await axios.post('/api/admin/login', { username: username.value, password: password.value });
    alert('登录成功: ' + resp.data.data.token);
  } catch (err) {
    alert(err.response?.data?.message || '登录失败');
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #080816 0%, #0e0e1c 100%);
}
.login-card {
  padding: 32px;
  border-radius: 16px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.12);
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 320px;
}
.form-input {
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.08);
  color: #fff;
}
.action-btn {
  padding: 10px;
  border-radius: 12px;
  border: none;
  font-weight: 700;
  background: linear-gradient(135deg, #ffffff, #9f88ff, #43e8ff);
  color: #080813;
}
</style>