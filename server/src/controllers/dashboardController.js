import { query } from '../config/db.js';

export async function getDashboardStats(req, res, next) {
  try {
    const [userRows] = await query('SELECT COUNT(*) AS total_users FROM users');
    const [orderRows] = await query('SELECT COUNT(*) AS total_orders FROM orders');
    const [productRows] = await query('SELECT COUNT(*) AS total_products FROM products');
    const [taskRows] = await query("SELECT COUNT(*) AS pending_tasks FROM tasks WHERE status = 'pending'");
    const [withdrawRows] = await query("SELECT COUNT(*) AS pending_withdraws FROM withdraw_orders WHERE status = 'pending'");

    return res.json({
      success: true,
      data: {
        total_users: userRows?.total_users || 0,
        total_orders: orderRows?.total_orders || 0,
        total_products: productRows?.total_products || 0,
        pending_tasks: taskRows?.pending_tasks || 0,
        pending_withdraws: withdrawRows?.pending_withdraws || 0
      }
    });
  } catch (error) {
    return next(error);
  }
}
