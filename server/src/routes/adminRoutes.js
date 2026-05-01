import { Router } from 'express';
import { adminLogin } from '../controllers/adminAuthController.js';
import { adminCreateProduct, adminListProducts, adminUpdateProduct, adminUpdateProductStatus } from '../controllers/adminProductController.js';
import { adminListOrders, adminUpdateOrderStatus } from '../controllers/adminOrderController.js';
import { adminCreateTask, adminListTasks, adminUpdateTaskStatus, adminListTaskSubmissions, adminReviewTaskSubmission } from '../controllers/adminTaskController.js';
import { adminListUsers, adminUpdateUserStatus, adminUpdateUserVip } from '../controllers/adminUserController.js';
import { adminListWithdrawOrders, adminUpdateWithdrawStatus } from '../controllers/adminWithdrawController.js';
import { adminCreateAiDraft, adminListAiDrafts, adminUpdateAiDraftStatus } from '../controllers/adminAiController.js';
import { adminCreateAnnouncement, adminDeleteAnnouncement, adminListAnnouncements, adminUpdateAnnouncement, adminUpdateAnnouncementStatus } from '../controllers/adminAnnouncementController.js';
import { adminApplyDistributionForOrder, adminGetDistributionOverview, adminUpdateDistributionSettings, adminUpdateDistributionUserRule } from '../controllers/adminDistributionController.js';
import { uploadImageMiddleware, handleImageUpload } from '../controllers/adminUploadController.js';
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

router.post('/upload/image', uploadImageMiddleware, handleImageUpload);

router.get('/announcements', adminListAnnouncements);
router.post('/announcements', adminCreateAnnouncement);
router.put('/announcements/:id', adminUpdateAnnouncement);
router.patch('/announcements/:id/status', adminUpdateAnnouncementStatus);
router.delete('/announcements/:id', adminDeleteAnnouncement);

router.get('/distribution/overview', adminGetDistributionOverview);
router.put('/distribution/settings', adminUpdateDistributionSettings);
router.put('/distribution/users/:userId/rule', adminUpdateDistributionUserRule);
router.post('/distribution/orders/:orderId/apply', adminApplyDistributionForOrder);

router.get('/products', adminListProducts);
router.post('/products', adminCreateProduct);
router.put('/products/:id', adminUpdateProduct);
router.patch('/products/:id/status', adminUpdateProductStatus);

router.get('/orders', adminListOrders);
router.patch('/orders/:id/status', adminUpdateOrderStatus);
router.post('/orders/:orderId/distribution/apply', adminApplyDistributionForOrder);

router.get('/tasks', adminListTasks);
router.post('/tasks', adminCreateTask);
router.patch('/tasks/:id/status', adminUpdateTaskStatus);
router.get('/task-submissions', adminListTaskSubmissions);
router.patch('/task-submissions/:progressId/review', adminReviewTaskSubmission);

router.get('/users', adminListUsers);
router.patch('/users/:id/status', adminUpdateUserStatus);
router.patch('/users/:id/vip', adminUpdateUserVip);

router.get('/withdraws', adminListWithdrawOrders);
router.patch('/withdraws/:id/status', adminUpdateWithdrawStatus);

router.get('/ai/drafts', adminListAiDrafts);
router.post('/ai/drafts', adminCreateAiDraft);
router.patch('/ai/drafts/:id/status', adminUpdateAiDraftStatus);

export default router;
