import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'shenmi-ke server is running',
    timestamp: new Date().toISOString()
  });
});

export default router;
