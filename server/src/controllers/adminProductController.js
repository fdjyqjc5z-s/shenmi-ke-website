import { query } from '../config/db.js';
import { isPositiveInteger, isPositiveMoney, sanitizeString } from '../utils/validators.js';

export async function adminListProducts(req, res, next) {
  try {
    const rows = await query(
      `SELECT id, name, cover_image, price, points_price, stock, sales_count, reward_points,
              vip_only, required_points, required_invites, is_points_product, status, sort_order, created_at
       FROM products
       ORDER BY id DESC
       LIMIT 200`
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    return next(error);
  }
}

export async function adminCreateProduct(req, res, next) {
  try {
    const name = sanitizeString(req.body.name, 128);
    const coverImage = sanitizeString(req.body.coverImage || '', 255);
    const price = Number(req.body.price || 0);
    const pointsPrice = Number(req.body.pointsPrice || 0);
    const stock = Number(req.body.stock || 0);
    const rewardPoints = Number(req.body.rewardPoints || 0);
    const vipOnly = req.body.vipOnly ? 1 : 0;
    const isPointsProduct = req.body.isPointsProduct ? 1 : 0;
    const status = req.body.status === 'on' ? 'on' : 'off';

    if (!name) return res.status(400).json({ success: false, message: '商品名称不能为空' });
    if (!isPositiveMoney(price)) return res.status(400).json({ success: false, message: '商品价格不合法' });
    if (!isPositiveInteger(stock)) return res.status(400).json({ success: false, message: '库存不合法' });

    const result = await query(
      `INSERT INTO products (admin_id, name, cover_image, price, points_price, stock, reward_points,
                             vip_only, is_points_product, status)
       VALUES (:adminId, :name, :coverImage, :price, :pointsPrice, :stock, :rewardPoints,
               :vipOnly, :isPointsProduct, :status)`,
      {
        adminId: req.user.id,
        name,
        coverImage,
        price,
        pointsPrice,
        stock,
        rewardPoints,
        vipOnly,
        isPointsProduct,
        status
      }
    );

    return res.status(201).json({ success: true, message: '商品已创建', data: { id: result.insertId } });
  } catch (error) {
    return next(error);
  }
}

export async function adminUpdateProductStatus(req, res, next) {
  try {
    const productId = Number(req.params.id);
    const status = req.body.status === 'on' ? 'on' : 'off';

    await query(
      'UPDATE products SET status = :status WHERE id = :productId',
      { status, productId }
    );

    return res.json({ success: true, message: '商品状态已更新' });
  } catch (error) {
    return next(error);
  }
}
