<template>
  <section>
    <div class="hero-card">
      <div class="brand-kicker">SECRET SHOP</div>
      <h1 class="brand-title"><span>神秘商城</span></h1>
      <p class="muted">普通商品、积分商品、VIP专属商品，全部由平台统一上架。</p>
    </div>

    <h2 class="section-title">商品入口</h2>
    <div class="grid-2">
      <div class="stat-card">
        <div class="stat-label">普通商品</div>
        <div class="stat-value">可购买</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">积分兑换</div>
        <div class="stat-value">可兑换</div>
      </div>
    </div>

    <div style="margin-top:14px;" class="list-card" v-for="item in goods" :key="item.title">
      <div style="width:54px;height:54px;border-radius:18px;background:linear-gradient(135deg,#8d75ff,#38dfff);"></div>
      <div style="flex:1;">
        <div class="badge">{{ item.badge }}</div>
        <h3>{{ item.title }}</h3>
        <p class="muted">{{ item.desc }}</p>
      </div>
    </div>
  </section>
</template>

<script setup>
const goods = [
  { badge: '普通', title: '平台精选商品', desc: '公开可见，可直接下单。' },
  { badge: '积分', title: '积分兑换专区', desc: '使用积分兑换隐藏好物。' },
  { badge: 'VIP', title: '专属购买资格', desc: '仅VIP用户或满足条件后解锁。' }
];
</script>
