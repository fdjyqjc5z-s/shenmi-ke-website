import { query } from '../config/db.js';
import { sanitizeString } from '../utils/validators.js';

export async function adminListUsers(req, res, next) {
  try {
    const keyword = sanitizeString(req.query.keyword || '', 64);
    const status = ['normal', 'frozen', 'banned'].includes(req.query.status) ? req.query.status : '';
    const page = Math.max(Number(req.query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize || 20), 1), 100);
    const offset = (page - 1) * pageSize;

    const conditions = [];
    const params = { pageSize, offset };

    if (keyword) {
      conditions.push('(username LIKE :keyword OR nickname LIKE :keyword OR user_code LIKE :keyword)');
      params.keyword = `%${keyword}%`;
    }

    if (status) {
      conditions.push('status = :status');
      params.status = status;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await query(
      `SELECT id, user_code, username, nickname, invite_code, invited_by_user_id,
              vip_level_id, vip_expire_at, status, withdraw_status, created_at
       FROM users
       ${where}
       ORDER BY id DESC
       LIMIT :pageSize OFFSET :offset`,
      params
    );

    const totalRows = await query(`SELECT COUNT(*) AS total FROM users ${where}`, params);
    const total = totalRows[0]?.total || 0;

    return res.json({
      success: true,
      data: {
        list: rows,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function adminUpdateUserStatus(req, res, next) {
  try {
    const userId = Number(req.params.id);
    const status = sanitizeString(req.body.status || '', 32);
    const allowed = ['normal', 'frozen', 'banned'];

    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: '用户状态不合法' });
    }

    await query('UPDATE users SET status = :status WHERE id = :userId', { status, userId });
    return res.json({ success: true, message: '用户状态已更新' });
  } catch (error) {
    return next(error);
  }
}

export async function adminUpdateUserVip(req, res, next) {
  try {
    const userId = Number(req.params.id);
    const vipLevelId = Number(req.body.vipLevelId || req.body.vip_level_id || 0) || null;
    const vipExpireAt = req.body.vipExpireAt || req.body.vip_expire_at || null;

    await query(
      'UPDATE users SET vip_level_id = :vipLevelId, vip_expire_at = :vipExpireAt WHERE id = :userId',
      { vipLevelId, vipExpireAt, userId }
    );

    return res.json({ success: true, message: 'VIP信息已更新' });
  } catch (error) {
    return next(error);
  }
}
