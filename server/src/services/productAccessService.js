export function isVipActive(user) {
  if (!user || !user.vip_expire_at) return false;
  return new Date(user.vip_expire_at).getTime() > Date.now();
}

export async function getUserInviteCount(connection, userId) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS invite_count
     FROM invite_relations
     WHERE inviter_user_id = :userId AND status = 'effective'`,
    { userId }
  );

  return Number(rows[0]?.invite_count || 0);
}

export async function checkProductAccess(connection, userId, product) {
  const details = {
    vip_required: Boolean(product.vip_only),
    vip_active: false,
    points_required: Number(product.required_points || 0),
    points_balance: 0,
    points_missing: 0,
    invites_required: Number(product.required_invites || 0),
    invite_count: 0,
    invites_missing: 0
  };

  const [[user]] = await connection.execute(
    `SELECT id, vip_level_id, vip_expire_at
     FROM users
     WHERE id = :userId AND status = 'normal'
     LIMIT 1`,
    { userId }
  );

  if (!user) {
    return { allowed: false, message: '用户不存在或已被限制', details };
  }

  details.vip_active = isVipActive(user);

  const [[points]] = await connection.execute(
    `SELECT points_balance
     FROM points_accounts
     WHERE user_id = :userId
     LIMIT 1`,
    { userId }
  );
  details.points_balance = Number(points?.points_balance || 0);
  details.points_missing = Math.max(details.points_required - details.points_balance, 0);

  details.invite_count = await getUserInviteCount(connection, userId);
  details.invites_missing = Math.max(details.invites_required - details.invite_count, 0);

  if (details.vip_required && !details.vip_active) {
    return { allowed: false, message: '该商品仅 VIP 可购买', details };
  }

  if (details.points_missing > 0) {
    return { allowed: false, message: `积分未达到购买资格，还差 ${details.points_missing} 积分`, details };
  }

  if (details.invites_missing > 0) {
    return { allowed: false, message: `邀请人数未达到购买资格，还差 ${details.invites_missing} 人`, details };
  }

  return { allowed: true, message: '允许购买', details };
}
