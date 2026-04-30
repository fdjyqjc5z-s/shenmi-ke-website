import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { securityConfig } from '../config/security.js';
import { sanitizeString } from '../utils/validators.js';

function signAdminToken(admin) {
  return jwt.sign(
    {
      id: admin.id,
      username: admin.username,
      role: admin.role || 'admin'
    },
    process.env.JWT_SECRET || 'development_only_secret',
    { expiresIn: securityConfig.jwt.expiresIn }
  );
}

export async function adminLogin(req, res, next) {
  try {
    const username = sanitizeString(req.body.username, 64);
    const password = req.body.password || '';

    const [admin] = await query(
      `SELECT id, username, password_hash, role, status
       FROM admin_users
       WHERE username = :username
       LIMIT 1`,
      { username }
    );

    if (!admin || admin.status !== 'normal') {
      return res.status(401).json({ success: false, message: '后台账号不存在或已禁用' });
    }

    const matched = await bcrypt.compare(password, admin.password_hash);
    if (!matched) {
      return res.status(401).json({ success: false, message: '后台账号或密码错误' });
    }

    await query(
      'UPDATE admin_users SET last_login_ip = :ip, last_login_at = NOW() WHERE id = :id',
      { ip: req.ip, id: admin.id }
    );

    return res.json({
      success: true,
      message: '登录成功',
      data: {
        token: signAdminToken(admin),
        admin: {
          id: admin.id,
          username: admin.username,
          role: admin.role
        }
      }
    });
  } catch (error) {
    return next(error);
  }
}
