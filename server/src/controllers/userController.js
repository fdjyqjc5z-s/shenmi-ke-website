import { query, transaction } from '../config/db.js';
import { rewardUserPoints } from '../services/accountService.js';
import { bindInviteRelation, findInviterByCode } from '../services/inviteService.js';

const BIND_INVITE_REWARD_POINTS = 20;

function normalizeInviteCode(value) {
  return String(value || '').trim().replace(/\s+/g, '').slice(0, 32);
}

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export async function getMyProfile(req, res, next) {
  try {
    const [user] = await query(
      `SELECT id, user_code, username, nickname, avatar, invite_code, invited_by_user_id,
              vip_level_id, vip_expire_at, status, withdraw_status, created_at
       FROM users
       WHERE id = :userId
       LIMIT 1`,
      { userId: req.user.id }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    return res.json({ success: true, data: user });
  } catch (error) {
    return next(error);
  }
}

export async function getMyAssets(req, res, next) {
  try {
    const [wallet] = await query(
      `SELECT available_balance, frozen_balance, deposit_frozen_balance, total_income, total_withdraw
       FROM user_wallets
       WHERE user_id = :userId
       LIMIT 1`,
      { userId: req.user.id }
    );

    const [points] = await query(
      `SELECT points_balance, frozen_points, total_earned, total_used
       FROM points_accounts
       WHERE user_id = :userId
       LIMIT 1`,
      { userId: req.user.id }
    );

    return res.json({
      success: true,
      data: {
        wallet: wallet || {
          available_balance: 0,
          frozen_balance: 0,
          deposit_frozen_balance: 0,
          total_income: 0,
          total_withdraw: 0
        },
        points: points || {
          points_balance: 0,
          frozen_points: 0,
          total_earned: 0,
          total_used: 0
        }
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function getMyInviteInfo(req, res, next) {
  try {
    const [user] = await query(
      'SELECT id, invite_code, invited_by_user_id FROM users WHERE id = :userId LIMIT 1',
      { userId: req.user.id }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    let boundInviter = null;
    if (user.invited_by_user_id) {
      const [inviter] = await query(
        `SELECT id, user_code, username, nickname, invite_code
         FROM users
         WHERE id = :inviterId
         LIMIT 1`,
        { inviterId: user.invited_by_user_id }
      );
      boundInviter = inviter || null;
    }

    const relations = await query(
      `SELECT ir.id, ir.invitee_user_id, ir.status, ir.effective_type, ir.effective_at, ir.created_at,
              u.username, u.nickname, u.user_code
       FROM invite_relations ir
       LEFT JOIN users u ON u.id = ir.invitee_user_id
       WHERE ir.inviter_user_id = :userId
       ORDER BY ir.id DESC
       LIMIT 50`,
      { userId: req.user.id }
    );

    const rewardRows = await query(
      `SELECT COALESCE(SUM(points), 0) AS total_invite_points
       FROM points_logs
       WHERE user_id = :userId AND source_type = 'invite' AND type = 'earn'`,
      { userId: req.user.id }
    );

    const effectiveCount = relations.filter((item) => item.status === 'effective').length;

    return res.json({
      success: true,
      data: {
        invite_code: user.invite_code,
        invite_url: `/login?inviteCode=${user.invite_code}`,
        bound_inviter: boundInviter,
        invite_count: relations.length,
        effective_invite_count: effectiveCount,
        pending_invite_count: relations.filter((item) => item.status === 'pending').length,
        total_invite_points: Number(rewardRows[0]?.total_invite_points || 0),
        reward_rules: {
          newcomer_points: 50,
          inviter_points: 20,
          bind_points: BIND_INVITE_REWARD_POINTS,
          effective_condition: '好友通过你的邀请链接注册，或登录后绑定你的分销码后立即生效'
        },
        relations
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function bindMyInviteCode(req, res, next) {
  try {
    const inviteCode = normalizeInviteCode(req.body.inviteCode || req.body.invite_code || req.body.code);

    if (!inviteCode) {
      return res.status(400).json({ success: false, message: '请输入分销码' });
    }

    const result = await transaction(async (connection) => {
      const [[user]] = await connection.execute(
        'SELECT id, invite_code, invited_by_user_id FROM users WHERE id = :userId LIMIT 1',
        { userId: req.user.id }
      );

      if (!user) {
        throw createHttpError('用户不存在', 404);
      }

      if (user.invited_by_user_id) {
        throw createHttpError('你已经绑定过分销码，不能重复绑定', 409);
      }

      const inviter = await findInviterByCode(connection, inviteCode);
      if (!inviter) {
        throw createHttpError('分销码不存在或不可用', 404);
      }

      if (Number(inviter.id) === Number(user.id)) {
        throw createHttpError('不能绑定自己的分销码', 400);
      }

      await connection.execute(
        `UPDATE users
         SET invited_by_user_id = :inviterUserId
         WHERE id = :userId AND invited_by_user_id IS NULL`,
        { inviterUserId: inviter.id, userId: user.id }
      );

      await bindInviteRelation(connection, inviter.id, user.id, inviteCode);
      await rewardUserPoints(connection, inviter.id, BIND_INVITE_REWARD_POINTS, '绑定分销码奖励', 'invite', user.id);

      const [[boundInviter]] = await connection.execute(
        `SELECT id, user_code, username, nickname, invite_code
         FROM users
         WHERE id = :inviterUserId
         LIMIT 1`,
        { inviterUserId: inviter.id }
      );

      return boundInviter;
    });

    return res.json({
      success: true,
      message: '分销码绑定成功',
      data: {
        bound_inviter: result
      }
    });
  } catch (error) {
    return next(error);
  }
}
