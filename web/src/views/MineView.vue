<template>
  <section>
    <div class="hero-card">
      <div class="brand-kicker">IDENTITY CARD</div>
      <h1 class="brand-title"><span>我的身份</span></h1>
      <p class="muted">每个用户都会生成唯一编码，方便后续绑定邀请、任务、积分和提现。</p>
    </div>

    <div class="grid-2" style="margin-top:14px;">
      <div class="stat-card">
        <div class="stat-label">钱包余额</div>
        <div class="stat-value">-- 元</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">可用积分</div>
        <div class="stat-value">--</div>
      </div>
    </div>

    <h2 class="section-title">我的通行证</h2>
    <div class="glass-card">
      <p class="muted">身份编码</p>
      <h2>登录后显示</h2>
      <p class="muted">邀请码、二维码、团队关系、提现记录都会在这里展示。</p>
      <RouterLink class="action-btn" to="/login" style="margin-top:12px;">进入 / 注册</RouterLink>
    </div>
  </section>
</template>
