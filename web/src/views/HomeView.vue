<template>
  <section>
    <div class="hero-card">
      <div class="brand-kicker">MYSTERY ACCESS</div>
      <h1 class="brand-title">欢迎来到<br /><span>神秘客</span></h1>
      <p class="muted">接任务、积累积分、解锁专属商品。每一个身份编码，都是你在神秘客里的通行证。</p>
      <div style="display:flex; gap:10px; margin-top:18px;">
        <RouterLink class="action-btn" to="/tasks">进入任务</RouterLink>
        <RouterLink class="action-btn ghost-btn" to="/shop">神秘商城</RouterLink>
      </div>
    </div>

    <div class="grid-2" style="margin-top:14px;">
      <div class="stat-card">
        <div class="stat-label">新人奖励</div>
        <div class="stat-value">50 积分</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">最低提现</div>
        <div class="stat-value">1 元</div>
      </div>
    </div>

    <h2 class="section-title">神秘入口</h2>
    <div class="list-card">
      <div>
        <div class="badge">VIP 专属</div>
        <h3>隐藏商品资格</h3>
        <p class="muted">部分商品仅 VIP 或达到积分门槛后可购买。</p>
      </div>
    </div>
    <div class="list-card">
      <div>
        <div class="badge">押金任务</div>
        <h3>接任务更稳</h3>
        <p class="muted">高价值任务可设置积分或余额押金，完成后退还。</p>
      </div>
    </div>
  </section>
</template>
