import { Router } from 'express';
import { adminLogin } from '../controllers/adminAuthController.js';
import { adminCreateProduct, adminListProducts, adminUpdateProduct, adminUpdateProductStatus } from '../controllers/adminProductController.js';
import { adminListOrders, adminUpdateOrderStatus } from '../controllers/adminOrderController.js';
import { adminCreateTask, adminListTasks, adminUpdateTaskStatus } from '../controllers/adminTaskController.js';
import { adminListUsers, adminUpdateUserStatus, adminUpdateUserVip } from '../controllers/adminUserController.js';
import { adminListWithdrawOrders, adminUpdateWithdrawStatus } from '../controllers/adminWithdrawController.js';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import { securityConfig } from '../config/security.js';

const router = Router();
const authLimiter = createRateLimiter({
  windowMs: securityConfig.rateLimit.windowMs,
  maxRequests: securityConfig.rateLimit.authMaxRequests
});

router.post('/login', authLimiter, adminLogin);

router.use(requireAuth, requireAdmin);

router.get('/dashboard/stats', getDashboardStats);

router.get('/products', adminListProducts);
router.post('/products', adminCreateProduct);
router.put('/products/:id', adminUpdateProduct);
router.patch('/products/:id/status', adminUpdateProductStatus);

router.get('/orders', adminListOrders);
router.patch('/orders/:id/status', adminUpdateOrderStatus);

router.get('/tasks', adminListTasks);
router.post('/tasks', adminCreateTask);
router.patch('/tasks/:id/status', adminUpdateTaskStatus);

router.get('/users', adminListUsers);
router.patch('/users/:id/status', adminUpdateUserStatus);
router.patch('/users/:id/vip', adminUpdateUserVip);

router.get('/withdraws', adminListWithdrawOrders);
router.patch('/withdraws/:id/status', adminUpdateWithdrawStatus);

export default router;
