import { Router } from 'express';
import { register, login } from '../controllers/authController.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import { securityConfig } from '../config/security.js';

const router = Router();
const authLimiter = createRateLimiter({
  windowMs: securityConfig.rateLimit.windowMs,
  maxRequests: securityConfig.rateLimit.authMaxRequests
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

export default router;
