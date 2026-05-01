import { query } from '../config/db.js';
import { isPositiveInteger, isPositiveMoney, sanitizeString } from '../utils/validators.js';

function cleanCategoryValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 64);
}

function normalizeCategoryPayload(body = {}) {
  const label = sanitizeString(body.label || body.name || '', 64);
  return {
    value: cleanCategoryValue(body.value || label),
    label,
    sortOrder: Number(body.sortOrder || body.sort_order || 0),
    status: body.status === 'disabled' ? 'disabled' : 'enabled'
  };
}

function normalizeProductPayload(body) {
  return {
    name: sanitizeString(body.name || '', 128),
    category: cleanCategoryValue(body.category || 'general') || 'general',
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
  if (!data.category) return '商品分类不能为空';
  if (!isPositiveMoney(data.price)) return '商品价格不合法';
  if (!isPositiveInteger(data.pointsPrice)) return '积分价格不合法';
  if (!isPositiveInteger(data.stock)) return '库存不合法';
  if (!isPositiveInteger(data.rewardPoints)) return '奖励积分不合法';
  if (!isPositiveInteger(data.requiredPoints)) return '购买门槛积分不合法';
  if (!isPositiveInteger(data.requiredInvites)) return '购买门槛邀请数不合法';
  if (!isPositiveInteger(data.sortOrder)) return '排序值不合法';
  return null;
}

async function ensureCategoryExists(category) {
  const rows = await query(
    'SELECT value FROM product_categories WHERE value = :category AND status = \'enabled\' LIMIT 1',
    { category }
  );
  return Boolean(rows[0]);
}

export async function adminListProductCategories(req, res, next) {
  try {
    const rows = await query(
      `SELECT id, value, label, sort_order, status, created_at, updated_at
       FROM product_categories
       ORDER BY sort_order DESC, id ASC`
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    return next(error);
  }
}

export async function adminCreateProductCategory(req, res, next) {
  try {
    const data = normalizeCategoryPayload(req.body);
    if (!data.label) return res.status(400).json({ success: false, message: '分类名称不能为空' });
    if (!data.value) return res.status(400).json({ success: false, message: '分类编码不能为空，仅支持英文、数字、横线、下划线' });
    if (!isPositiveInteger(data.sortOrder)) return res.status(400).json({ success: false, message: '排序值不合法' });

    const result = await query(
      `INSERT INTO product_categories (value, label, sort_order, status)
       VALUES (:value, :label, :sortOrder, :status)`,
      data
    );

    return res.status(201).json({ success: true, message: '商品分类已创建', data: { id: result.insertId } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: '分类编码已存在，请换一个' });
    }
    return next(error);
  }
}

export async function adminUpdateProductCategory(req, res, next) {
  try {
    const categoryId = Number(req.params.id);
    const data = normalizeCategoryPayload(req.body);
    if (!data.label) return res.status(400).json({ success: false, message: '分类名称不能为空' });
    if (!data.value) return res.status(400).json({ success: false, message: '分类编码不能为空，仅支持英文、数字、横线、下划线' });
    if (!isPositiveInteger(data.sortOrder)) return res.status(400).json({ success: false, message: '排序值不合法' });

    const oldRows = await query('SELECT value FROM product_categories WHERE id = :categoryId LIMIT 1', { categoryId });
    if (!oldRows[0]) return res.status(404).json({ success: false, message: '商品分类不存在' });

    await query(
      `UPDATE product_categories
       SET value = :value, label = :label, sort_order = :sortOrder, status = :status
       WHERE id = :categoryId`,
      { ...data, categoryId }
    );

    if (oldRows[0].value !== data.value) {
      await query('UPDATE products SET category = :newValue WHERE category = :oldValue', {
        newValue: data.value,
        oldValue: oldRows[0].value
      });
    }

    return res.json({ success: true, message: '商品分类已更新' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: '分类编码已存在，请换一个' });
    }
    return next(error);
  }
}

export async function adminUpdateProductCategoryStatus(req, res, next) {
  try {
    const categoryId = Number(req.params.id);
    const status = req.body.status === 'disabled' ? 'disabled' : 'enabled';
    await query('UPDATE product_categories SET status = :status WHERE id = :categoryId', { status, categoryId });
    return res.json({ success: true, message: status === 'enabled' ? '分类已启用' : '分类已停用' });
  } catch (error) {
    return next(error);
  }
}

export async function adminListProducts(req, res, next) {
  try {
    const keyword = sanitizeString(req.query.keyword || '', 64);
    const status = ['on', 'off'].includes(req.query.status) ? req.query.status : '';
    const type = ['normal', 'vip', 'points'].includes(req.query.type) ? req.query.type : '';
    const category = cleanCategoryValue(req.query.category || '');
    const page = Math.max(Number(req.query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize || 20), 1), 100);
    const offset = (page - 1) * pageSize;

    const conditions = [];
    const params = { pageSize, offset };

    if (keyword) {
      conditions.push('p.name LIKE :keyword');
      params.keyword = `%${keyword}%`;
    }

    if (status) {
      conditions.push('p.status = :status');
      params.status = status;
    }

    if (category) {
      conditions.push('p.category = :category');
      params.category = category;
    }

    if (type === 'vip') conditions.push('p.vip_only = 1');
    if (type === 'points') conditions.push('p.is_points_product = 1');
    if (type === 'normal') conditions.push('p.vip_only = 0 AND p.is_points_product = 0');

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await query(
      `SELECT p.id, p.name, p.category, COALESCE(pc.label, p.category, '综合商品') AS category_label,
              p.cover_image, p.price, p.points_price, p.stock, p.sales_count, p.reward_points,
              p.vip_only, p.required_points, p.required_invites, p.is_points_product, p.status, p.sort_order, p.created_at
       FROM products p
       LEFT JOIN product_categories pc ON pc.value = p.category
       ${where}
       ORDER BY p.sort_order DESC, p.id DESC
       LIMIT :pageSize OFFSET :offset`,
      params
    );

    const totalRows = await query(
      `SELECT COUNT(*) AS total FROM products p LEFT JOIN product_categories pc ON pc.value = p.category ${where}`,
      params
    );
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
    if (!(await ensureCategoryExists(data.category))) return res.status(400).json({ success: false, message: '请选择有效的商品分类' });

    const result = await query(
      `INSERT INTO products (admin_id, name, category, cover_image, price, points_price, stock, reward_points,
                             vip_only, required_points, required_invites, is_points_product, status, sort_order)
       VALUES (:adminId, :name, :category, :coverImage, :price, :pointsPrice, :stock, :rewardPoints,
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
    if (!(await ensureCategoryExists(data.category))) return res.status(400).json({ success: false, message: '请选择有效的商品分类' });

    await query(
      `UPDATE products
       SET name = :name,
           category = :category,
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
