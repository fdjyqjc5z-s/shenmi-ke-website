import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { bindMyInviteCode, getMyAssets, getMyInviteInfo, getMyProfile } from '../controllers/userController.js';
import { createWithdrawOrder, getMyWithdrawOrders } from '../controllers/withdrawController.js';

const router = Router();

router.use(requireAuth);

router.get('/me', getMyProfile);
router.get('/assets', getMyAssets);
router.get('/invite', getMyInviteInfo);
router.post('/bind-invite', bindMyInviteCode);
router.post('/withdraw-orders', createWithdrawOrder);
router.get('/withdraw-orders', getMyWithdrawOrders);

export default router;
