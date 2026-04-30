import jwt from 'jsonwebtoken';

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

export function requireAuth(req, res, next) {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: '请先登录'
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'development_only_secret');
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: '登录状态已失效，请重新登录'
    });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || !['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: '无后台操作权限'
    });
  }
  return next();
}

export function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: '仅超级管理员可操作'
    });
  }
  return next();
}
