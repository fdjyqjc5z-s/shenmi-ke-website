export const securityConfig = {
  password: {
    minLength: 8,
    bcryptSaltRounds: 10
  },
  jwt: {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  rateLimit: {
    windowMs: 60 * 1000,
    maxRequests: 120,
    authMaxRequests: 20
  },
  upload: {
    maxFileSize: 5 * 1024 * 1024,
    allowedImageMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedFileMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  },
  cors: {
    allowOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
};
