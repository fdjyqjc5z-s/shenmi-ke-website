import { query } from '../config/db.js';
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
              o.receiver_name, o.receiver_phone, o.receiver_address, o.created_at
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
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

    await query(
      'UPDATE orders SET status = :status WHERE id = :orderId',
      { status, orderId }
    );

    return res.json({ success: true, message: '订单状态已更新' });
  } catch (error) {
    return next(error);
  }
}
