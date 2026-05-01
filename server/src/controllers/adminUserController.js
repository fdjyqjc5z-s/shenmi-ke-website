import { query, transaction } from '../config/db.js';
import { sanitizeString } from '../utils/validators.js';
import { writeAdminLog } from '../services/adminLogService.js';

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
      conditions.push('(u.username LIKE :keyword OR u.nickname LIKE :keyword OR u.user_code LIKE :keyword OR u.invite_code LIKE :keyword OR inviter.username LIKE :keyword OR inviter.user_code LIKE :keyword OR inviter.invite_code LIKE :keyword)');
      params.keyword = `%${keyword}%`;
    }

    if (status) {
      conditions.push('u.status = :status');
      params.status = status;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await query(
      `SELECT u.id, u.user_code, u.username, u.nickname, u.invite_code, u.invited_by_user_id,
              u.vip_level_id, u.vip_expire_at, u.status, u.withdraw_status, u.created_at,
              inviter.user_code AS inviter_user_code,
              inviter.username AS inviter_username,
              inviter.nickname AS inviter_nickname,
              inviter.invite_code AS inviter_invite_code,
              COALESCE(children.child_count, 0) AS level1_child_count
       FROM users u
       LEFT JOIN users inviter ON inviter.id = u.invited_by_user_id
       LEFT JOIN (
         SELECT invited_by_user_id, COUNT(*) AS child_count
         FROM users
         WHERE invited_by_user_id IS NOT NULL
         GROUP BY invited_by_user_id
       ) children ON children.invited_by_user_id = u.id
       ${where}
       ORDER BY u.id DESC
       LIMIT :pageSize OFFSET :offset`,
      params
    );

    const totalRows = await query(
      `SELECT COUNT(*) AS total
       FROM users u
       LEFT JOIN users inviter ON inviter.id = u.invited_by_user_id
       ${where}`,
      params
    );
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

    await transaction(async (connection) => {
      await connection.execute('UPDATE users SET status = :status WHERE id = :userId', { status, userId });
      await writeAdminLog(connection, {
        adminId: req.user.id,
        action: 'user_status_update',
        targetType: 'user',
        targetId: userId,
        description: `更新用户状态：${status}`,
        ip: req.ip
      });
    });

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

    if (vipLevelId && (!Number.isInteger(vipLevelId) || vipLevelId < 1 || vipLevelId > 99)) {
      return res.status(400).json({ success: false, message: 'VIP等级不合法' });
    }

    await transaction(async (connection) => {
      await connection.execute(
        'UPDATE users SET vip_level_id = :vipLevelId, vip_expire_at = :vipExpireAt WHERE id = :userId',
        { vipLevelId, vipExpireAt, userId }
      );

      await writeAdminLog(connection, {
        adminId: req.user.id,
        action: 'user_vip_update',
        targetType: 'user',
        targetId: userId,
        description: `设置用户VIP等级：${vipLevelId || '取消'}，到期：${vipExpireAt || '无'}`,
        ip: req.ip
      });
    });

    return res.json({ success: true, message: 'VIP信息已更新' });
  } catch (error) {
    return next(error);
  }
}
