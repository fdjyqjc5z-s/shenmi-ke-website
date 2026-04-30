const buckets = new Map();

function getClientKey(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
}

export function createRateLimiter({ windowMs = 60_000, maxRequests = 120 } = {}) {
  return function rateLimiter(req, res, next) {
    const now = Date.now();
    const key = getClientKey(req);
    const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    buckets.set(key, bucket);

    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(maxRequests - bucket.count, 0)));

    if (bucket.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message: '请求过于频繁，请稍后再试'
      });
    }

    return next();
  };
}
