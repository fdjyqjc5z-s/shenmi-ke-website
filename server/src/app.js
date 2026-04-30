import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { securityConfig } from './config/security.js';
import { securityHeaders } from './middleware/securityHeaders.js';
import { createRateLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();
const port = Number(process.env.PORT || 3000);
const apiPrefix = process.env.API_PREFIX || '/api';

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(securityHeaders);
app.use(createRateLimiter({
  windowMs: securityConfig.rateLimit.windowMs,
  maxRequests: securityConfig.rateLimit.maxRequests
}));

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (securityConfig.cors.allowOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS origin not allowed'));
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(process.env.UPLOAD_PUBLIC_PATH || '/uploads', express.static(process.env.UPLOAD_DIR || 'uploads'));

app.use(apiPrefix, routes);
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Shenmi Ke server running on port ${port}`);
});
