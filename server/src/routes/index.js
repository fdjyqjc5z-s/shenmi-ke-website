import { Router } from 'express';
import authRoutes from './authRoutes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'shenmi-ke server is running',
    timestamp: new Date().toISOString()
  });
});

router.use('/auth', authRoutes);

export default router;
