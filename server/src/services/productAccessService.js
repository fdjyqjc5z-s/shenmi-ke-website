export function isVipActive(user) {
  if (!user || !user.vip_expire_at) return false;
  return new Date(user.vip_expire_at).getTime() > Date.now();
}

export async function getUserInviteCount(connection, userId) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS invite_count
     FROM invite_relations
     WHERE inviter_user_id = :userId`,
    { userId }
  );

  return Number(rows[0]?.invite_count || 0);
}

export async function checkProductAccess(connection, userId, product) {
  const [[user]] = await connection.execute(
    `SELECT id, vip_level_id, vip_expire_at
     FROM users
     WHERE id = :userId AND status = 'normal'
     LIMIT 1`,
    { userId }
  );

  if (!user) {
    return { allowed: false, message: '用户不存在或已被限制' };
  }

  if (product.vip_only && !isVipActive(user)) {
    return { allowed: false, message: '该商品仅 VIP 可购买' };
  }

  if (product.required_points && Number(product.required_points) > 0) {
    const [[points]] = await connection.execute(
      `SELECT points_balance
       FROM points_accounts
       WHERE user_id = :userId
       LIMIT 1`,
      { userId }
    );

    if (!points || Number(points.points_balance) < Number(product.required_points)) {
      return { allowed: false, message: '积分未达到购买资格' };
    }
  }

  if (product.required_invites && Number(product.required_invites) > 0) {
    const inviteCount = await getUserInviteCount(connection, userId);

    if (inviteCount < Number(product.required_invites)) {
      return { allowed: false, message: '邀请人数未达到购买资格' };
    }
  }

  return { allowed: true, message: '允许购买' };
}
