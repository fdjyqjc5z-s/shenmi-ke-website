import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import ProductsView from '../views/ProductsView.vue';
import OrdersView from '../views/OrdersView.vue';
import UsersView from '../views/UsersView.vue';
import WithdrawsView from '../views/WithdrawsView.vue';
import AIView from '../views/AIView.vue';
import LoginView from '../views/LoginView.vue';

const routes = [
  { path: '/admin/login', component: LoginView, meta: { title: '神秘客后台登录' } },
  { path: '/admin/dashboard', component: DashboardView, meta: { title: '仪表盘' } },
  { path: '/admin/products', component: ProductsView, meta: { title: '商品管理' } },
  { path: '/admin/orders', component: OrdersView, meta: { title: '订单管理' } },
  { path: '/admin/users', component: UsersView, meta: { title: '用户管理' } },
  { path: '/admin/withdraws', component: WithdrawsView, meta: { title: '提现管理' } },
  { path: '/admin/ai', component: AIView, meta: { title: 'AI 助手' } }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.afterEach((to) => {
  document.title = to.meta.title || '神秘客后台管理';
});

export default router;