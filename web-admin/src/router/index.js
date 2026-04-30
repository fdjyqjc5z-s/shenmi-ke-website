import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import ProductsView from '../views/ProductsView.vue';
import OrdersView from '../views/OrdersView.vue';
import TasksAdminView from '../views/TasksAdminView.vue';
import UsersView from '../views/UsersView.vue';
import WithdrawsView from '../views/WithdrawsView.vue';
import AnnouncementsView from '../views/AnnouncementsView.vue';
import AIView from '../views/AIView.vue';
import LoginView from '../views/LoginView.vue';

const routes = [
  { path: '/', redirect: '/admin/dashboard' },
  { path: '/admin', redirect: '/admin/dashboard' },
  { path: '/admin/login', component: LoginView, meta: { title: '神秘客后台登录', public: true } },
  { path: '/admin/dashboard', component: DashboardView, meta: { title: '仪表盘' } },
  { path: '/admin/products', component: ProductsView, meta: { title: '商品管理' } },
  { path: '/admin/orders', component: OrdersView, meta: { title: '订单管理' } },
  { path: '/admin/tasks', component: TasksAdminView, meta: { title: '任务管理' } },
  { path: '/admin/users', component: UsersView, meta: { title: '用户管理' } },
  { path: '/admin/withdraws', component: WithdrawsView, meta: { title: '提现管理' } },
  { path: '/admin/announcements', component: AnnouncementsView, meta: { title: '公告管理' } },
  { path: '/admin/ai', component: AIView, meta: { title: 'AI 助手' } },
  { path: '/:pathMatch(.*)*', redirect: '/admin/dashboard' }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to) => {
  const token = localStorage.getItem('admin_token');

  if (!to.meta.public && !token) {
    return '/admin/login';
  }

  if (to.path === '/admin/login' && token) {
    return '/admin/dashboard';
  }

  return true;
});

router.afterEach((to) => {
  document.title = to.meta.title || '神秘客后台管理';
});

export default router;
