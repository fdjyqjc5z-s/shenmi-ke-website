<template>
  <div class="app-shell">
    <div class="mystery-orb orb-a"></div>
    <div class="mystery-orb orb-b"></div>

    <main class="page-wrap">
      <router-view />
    </main>

    <nav class="bottom-nav">
      <RouterLink to="/" class="nav-item">首页</RouterLink>
      <RouterLink to="/tasks" class="nav-item">任务</RouterLink>
      <RouterLink to="/shop" class="nav-item">商城</RouterLink>
      <RouterLink to="/mine" class="nav-item">我的</RouterLink>
    </nav>
  </div>
</template>
