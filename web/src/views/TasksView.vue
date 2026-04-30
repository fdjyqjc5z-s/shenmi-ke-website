<template>
  <section>
    <div class="hero-card">
      <div class="brand-kicker">TASK HALL</div>
      <h1 class="brand-title"><span>任务大厅</span></h1>
      <p class="muted">只接任务，不发任务。任务由平台统一发布，完成后获得积分或余额奖励。</p>
    </div>

    <h2 class="section-title">推荐任务</h2>
    <div class="list-card" v-for="item in tasks" :key="item.title">
      <div style="flex:1;">
        <div class="badge">{{ item.badge }}</div>
        <h3>{{ item.title }}</h3>
        <p class="muted">{{ item.desc }}</p>
      </div>
      <strong>{{ item.reward }}</strong>
    </div>
  </section>
</template>

<script setup>
const tasks = [
  { badge: '普通任务', title: '新人熟悉任务', desc: '按要求提交截图或文字进度。', reward: '50积分' },
  { badge: '押金任务', title: '限时推广任务', desc: '需要冻结押金，审核通过后退回。', reward: '1元' },
  { badge: 'VIP任务', title: '隐藏高奖励任务', desc: 'VIP身份可见，奖励更高。', reward: '高额' }
];
</script>
