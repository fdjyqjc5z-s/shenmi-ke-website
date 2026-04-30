import { query } from '../config/db.js';
import { isPositiveInteger, isPositiveMoney, sanitizeString } from '../utils/validators.js';

function normalizeProductPayload(body) {
  return {
    name: sanitizeString(body.name || '', 128),
    coverImage: sanitizeString(body.coverImage || body.cover_image || '', 255),
    price: Number(body.price || 0),
    pointsPrice: Number(body.pointsPrice || body.points_price || 0),
    stock: Number(body.stock || 0),
    rewardPoints: Number(body.rewardPoints || body.reward_points || 0),
    vipOnly: body.vipOnly || body.vip_only ? 1 : 0,
    requiredPoints: Number(body.requiredPoints || body.required_points || 0),
    requiredInvites: Number(body.requiredInvites || body.required_invites || 0),
    isPointsProduct: body.isPointsProduct || body.is_points_product ? 1 : 0,
    status: body.status === 'on' ? 'on' : 'off',
    sortOrder: Number(body.sortOrder || body.sort_order || 0)
  };
}

function validateProductPayload(data) {
  if (!data.name) return '商品名称不能为空';
  if (!isPositiveMoney(data.price)) return '商品价格不合法';
  if (!isPositiveInteger(data.pointsPrice)) return '积分价格不合法';
  if (!isPositiveInteger(data.stock)) return '库存不合法';
  if (!isPositiveInteger(data.rewardPoints)) return '奖励积分不合法';
  if (!isPositiveInteger(data.requiredPoints)) return '购买门槛积分不合法';
  if (!isPositiveInteger(data.requiredInvites)) return '购买门槛邀请数不合法';
  if (!isPositiveInteger(data.sortOrder)) return '排序值不合法';
  return null;
}

export async function adminListProducts(req, res, next) {
  try {
    const keyword = sanitizeString(req.query.keyword || '', 64);
    const status = ['on', 'off'].includes(req.query.status) ? req.query.status : '';
    const type = ['normal', 'vip', 'points'].includes(req.query.type) ? req.query.type : '';
    const page = Math.max(Number(req.query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize || 20), 1), 100);
    const offset = (page - 1) * pageSize;

    const conditions = [];
    const params = { pageSize, offset };

    if (keyword) {
      conditions.push('name LIKE :keyword');
      params.keyword = `%${keyword}%`;
    }

    if (status) {
      conditions.push('status = :status');
      params.status = status;
    }

    if (type === 'vip') conditions.push('vip_only = 1');
    if (type === 'points') conditions.push('is_points_product = 1');
    if (type === 'normal') conditions.push('vip_only = 0 AND is_points_product = 0');

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await query(
      `SELECT id, name, cover_image, price, points_price, stock, sales_count, reward_points,
              vip_only, required_points, required_invites, is_points_product, status, sort_order, created_at
       FROM products
       ${where}
       ORDER BY sort_order DESC, id DESC
       LIMIT :pageSize OFFSET :offset`,
      params
    );

    const totalRows = await query(`SELECT COUNT(*) AS total FROM products ${where}`, params);
    const total = totalRows[0]?.total || 0;

    return res.json({
      success: true,
      data: {
        list: rows,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function adminCreateProduct(req, res, next) {
  try {
    const data = normalizeProductPayload(req.body);
    const errorMessage = validateProductPayload(data);
    if (errorMessage) return res.status(400).json({ success: false, message: errorMessage });

    const result = await query(
      `INSERT INTO products (admin_id, name, cover_image, price, points_price, stock, reward_points,
                             vip_only, required_points, required_invites, is_points_product, status, sort_order)
       VALUES (:adminId, :name, :coverImage, :price, :pointsPrice, :stock, :rewardPoints,
               :vipOnly, :requiredPoints, :requiredInvites, :isPointsProduct, :status, :sortOrder)`,
      { adminId: req.user.id, ...data }
    );

    return res.status(201).json({ success: true, message: '商品已创建', data: { id: result.insertId } });
  } catch (error) {
    return next(error);
  }
}

export async function adminUpdateProduct(req, res, next) {
  try {
    const productId = Number(req.params.id);
    const data = normalizeProductPayload(req.body);
    const errorMessage = validateProductPayload(data);
    if (errorMessage) return res.status(400).json({ success: false, message: errorMessage });

    await query(
      `UPDATE products
       SET name = :name,
           cover_image = :coverImage,
           price = :price,
           points_price = :pointsPrice,
           stock = :stock,
           reward_points = :rewardPoints,
           vip_only = :vipOnly,
           required_points = :requiredPoints,
           required_invites = :requiredInvites,
           is_points_product = :isPointsProduct,
           status = :status,
           sort_order = :sortOrder
       WHERE id = :productId`,
      { productId, ...data }
    );

    return res.json({ success: true, message: '商品已更新' });
  } catch (error) {
    return next(error);
  }
}

export async function adminUpdateProductStatus(req, res, next) {
  try {
    const productId = Number(req.params.id);
    const status = req.body.status === 'on' ? 'on' : 'off';

    await query('UPDATE products SET status = :status WHERE id = :productId', { status, productId });

    return res.json({ success: true, message: '商品状态已更新' });
  } catch (error) {
    return next(error);
  }
}
