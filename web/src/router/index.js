import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import TasksView from '../views/TasksView.vue';
import ShopView from '../views/ShopView.vue';
import MineView from '../views/MineView.vue';
import LoginView from '../views/LoginView.vue';

const routes = [
  { path: '/', component: HomeView, meta: { title: '神秘客' } },
  { path: '/tasks', component: TasksView, meta: { title: '任务大厅' } },
  { path: '/shop', component: ShopView, meta: { title: '神秘商城' } },
  { path: '/mine', component: MineView, meta: { title: '我的身份' } },
  { path: '/login', component: LoginView, meta: { title: '进入神秘客' } }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.afterEach((to) => {
  document.title = to.meta.title || '神秘客';
});

export default router;
