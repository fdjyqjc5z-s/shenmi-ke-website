import { query } from '../config/db.js';

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
      'SELECT id, invite_code FROM users WHERE id = :userId LIMIT 1',
      { userId: req.user.id }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
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

    return res.json({
      success: true,
      data: {
        invite_code: user.invite_code,
        invite_url: `/register?inviteCode=${user.invite_code}`,
        invite_count: relations.length,
        relations
      }
    });
  } catch (error) {
    return next(error);
  }
}
