<template>
  <section>
    <div class="hero-card">
      <div class="brand-kicker">仪表盘</div>
      <h1 class="brand-title"><span>神秘客后台</span></h1>
      <p class="muted">核心统计信息一览，快速查看订单、用户和商品动态。</p>
    </div>

    <div class="grid-3" style="margin-top:14px;">
      <div class="stat-card">
        <div class="stat-label">总用户数</div>
        <div class="stat-value">--</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">总订单数</div>
        <div class="stat-value">--</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">总商品数</div>
        <div class="stat-value">--</div>
      </div>
    </div>

    <h2 class="section-title">快捷入口</h2>
    <div class="grid-3" style="margin-top:14px;">
      <RouterLink to="/admin/products" class="action-btn">商品管理</RouterLink>
      <RouterLink to="/admin/orders" class="action-btn">订单管理</RouterLink>
      <RouterLink to="/admin/users" class="action-btn">用户管理</RouterLink>
    </div>

    <h2 class="section-title">AI 助手</h2>
    <div class="glass-card">
      <p class="muted">AI 助手可辅助生成商品、任务、回复用户消息，所有操作需人工确认。</p>
      <RouterLink to="/admin/ai" class="action-btn" style="margin-top:12px;">进入 AI 助手</RouterLink>
    </div>
  </section>
</template>
