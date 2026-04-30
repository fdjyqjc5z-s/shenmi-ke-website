import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import productRoutes from './productRoutes.js';
import adminRoutes from './adminRoutes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'shenmi-ke server is running',
    timestamp: new Date().toISOString()
  });
});

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/shop', productRoutes);
router.use('/admin', adminRoutes);

export default router;
