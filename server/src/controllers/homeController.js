import { query } from '../config/db.js';

export async function getHomeSummary(req, res, next) {
  try {
    const banners = await query(
      `SELECT id, title, image_url, link_url
       FROM banners
       WHERE status = 'enabled'
       ORDER BY sort_order DESC, id DESC
       LIMIT 5`
    );

    const announcements = await query(
      `SELECT id, title, content, created_at
       FROM announcements
       WHERE status = 'published'
       ORDER BY id DESC
       LIMIT 3`
    );

    const products = await query(
      `SELECT id, name, cover_image, price, points_price, stock, sales_count, reward_points,
              vip_only, required_points, required_invites, is_points_product, sort_order
       FROM products
       WHERE status = 'on'
       ORDER BY sort_order DESC, id DESC
       LIMIT 6`
    );

    const tasks = await query(
      `SELECT id, title, content, reward_amount, reward_points, deadline, max_accept_count,
              current_accept_count, vip_only, deposit_required, deposit_type, deposit_amount
       FROM tasks
       WHERE status = 'open'
       ORDER BY reward_amount DESC, reward_points DESC, id DESC
       LIMIT 6`
    );

    return res.json({
      success: true,
      data: {
        banners,
        announcements,
        products,
        tasks,
        stats: {
          newcomer_points: 50,
          min_withdraw_amount: 1
        }
      }
    });
  } catch (error) {
    return next(error);
  }
}
