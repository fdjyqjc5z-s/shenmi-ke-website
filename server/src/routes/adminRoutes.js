import { Router } from 'express';
import { adminLogin } from '../controllers/adminAuthController.js';
import { adminCreateProduct, adminListProducts, adminUpdateProductStatus } from '../controllers/adminProductController.js';
import { adminListOrders, adminUpdateOrderStatus } from '../controllers/adminOrderController.js';
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
router.patch('/products/:id/status', adminUpdateProductStatus);

router.get('/orders', adminListOrders);
router.patch('/orders/:id/status', adminUpdateOrderStatus);

export default router;
