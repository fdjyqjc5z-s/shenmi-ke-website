<template>
  <div class="admin-shell">
    <aside class="sidebar">
      <div class="brand-block">
        <div class="brand">神秘客</div>
        <div class="brand-sub">后台控制台</div>
      </div>

      <nav class="side-nav">
        <RouterLink to="/admin/dashboard" class="nav-item">仪表盘</RouterLink>
        <RouterLink to="/admin/products" class="nav-item">商品管理</RouterLink>
        <RouterLink to="/admin/orders" class="nav-item">订单管理</RouterLink>
        <RouterLink to="/admin/tasks" class="nav-item">任务管理</RouterLink>
        <RouterLink to="/admin/users" class="nav-item">用户管理</RouterLink>
        <RouterLink to="/admin/withdraws" class="nav-item">提现管理</RouterLink>
        <RouterLink to="/admin/ai" class="nav-item">AI 助手</RouterLink>
      </nav>
    </aside>

    <main class="admin-main">
      <router-view />
    </main>
  </div>
</template>
