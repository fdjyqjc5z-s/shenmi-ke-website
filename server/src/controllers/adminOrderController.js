import { query, transaction } from '../config/db.js';
import { applyDistributionRebatesForOrder } from '../services/distributionService.js';
import { sanitizeString } from '../utils/validators.js';

export async function adminListOrders(req, res, next) {
  try {
    const status = sanitizeString(req.query.status || '', 32);
    let where = 'WHERE 1=1';
    const params = {};

    if (status) {
      where += ' AND o.status = :status';
      params.status = status;
    }

    const rows = await query(
      `SELECT o.id, o.order_no, o.user_id, u.username, u.user_code,
              o.total_amount, o.points_used, o.points_reward, o.status, o.pay_status,
              o.receiver_name, o.receiver_phone, o.receiver_address, o.created_at,
              inviter.username AS inviter_username,
              inviter.nickname AS inviter_nickname,
              inviter.user_code AS inviter_user_code,
              inviter.invite_code AS inviter_invite_code,
              COALESCE(dr.reward_total, 0) AS distribution_reward_total,
              COALESCE(dr.reward_count, 0) AS distribution_reward_count
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN users inviter ON inviter.id = u.invited_by_user_id
       LEFT JOIN (
         SELECT order_id, SUM(reward_amount) AS reward_total, COUNT(*) AS reward_count
         FROM distribution_reward_logs
         GROUP BY order_id
       ) dr ON dr.order_id = o.id
       ${where}
       ORDER BY o.id DESC
       LIMIT 200`,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (error) {
    return next(error);
  }
}

export async function adminUpdateOrderStatus(req, res, next) {
  try {
    const orderId = Number(req.params.id);
    const status = sanitizeString(req.body.status || '', 32);
    const allowed = ['pending', 'paid', 'shipped', 'completed', 'cancelled'];

    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: '订单状态不合法' });
    }

    const result = await transaction(async (connection) => {
      await connection.execute(
        `UPDATE orders
         SET status = :status,
             pay_status = CASE
               WHEN :status IN ('paid', 'shipped', 'completed') THEN 'paid'
               WHEN :status = 'cancelled' AND pay_status = 'unpaid' THEN 'unpaid'
               ELSE pay_status
             END
         WHERE id = :orderId`,
        { status, orderId }
      );

      if (['paid', 'completed'].includes(status)) {
        return applyDistributionRebatesForOrder(connection, orderId, req.user.id);
      }

      return { applied: false, reason: '当前状态不触发返利' };
    });

    return res.json({
      success: true,
      message: result.applied ? '订单状态已更新，分销返利已发放' : '订单状态已更新',
      data: { distribution: result }
    });
  } catch (error) {
    return next(error);
  }
}
