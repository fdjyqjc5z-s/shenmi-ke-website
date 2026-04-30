import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';

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

export default router;
