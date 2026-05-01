import { dbPool, query, transaction } from '../config/db.js';
import { createOrderNo } from '../utils/id.js';
import { checkProductAccess } from '../services/productAccessService.js';

function emptyAccessDetails(item) {
  return {
    vip_required: Boolean(item?.vip_only),
    vip_active: false,
    points_required: Number(item?.required_points || 0),
    points_balance: 0,
    points_missing: Number(item?.required_points || 0),
    invites_required: Number(item?.required_invites || 0),
    invite_count: 0,
    invites_missing: Number(item?.required_invites || 0)
  };
}

function clean(value, max = 255) {
  return String(value || '').trim().slice(0, max);
}

function makeHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function attachProductAccess(products, user) {
  const list = Array.isArray(products) ? products : [products];

  if (!user?.id) {
    return list.map((item) => ({
      ...item,
      can_purchase: false,
      access_message: '登录后可购买或兑换',
      access_required: 'login',
      access_details: emptyAccessDetails(item)
    }));
  }

  const result = [];
  for (const item of list) {
    const access = await checkProductAccess(dbPool, user.id, item);
    result.push({
      ...item,
      can_purchase: access.allowed,
      access_message: access.message,
      access_required: access.allowed ? 'none' : 'condition',
      access_details: access.details || emptyAccessDetails(item)
    });
  }

  return result;
}

export async function listProductCategories(req, res, next) {
  try {
    const rows = await query(
      `SELECT value, label, sort_order
       FROM product_categories
       WHERE status = 'enabled'
       ORDER BY sort_order DESC, id ASC`
    );

    return res.json({ success: true, data: rows });
  } catch (error) {
    return next(error);
  }
}

export async function listProducts(req, res, next) {
  try {
    const type = req.query.type || 'all';
    const category = clean(req.query.category, 64);
    const params = {};
    let where = "WHERE p.status = 'on'";

    if (type === 'vip') where += ' AND p.vip_only = 1';
    if (type === 'points') where += ' AND p.is_points_product = 1';
    if (type === 'normal') where += ' AND p.vip_only = 0 AND p.is_points_product = 0';
    if (category) {
      where += ' AND p.category = :category';
      params.category = category;
    }

    const rows = await query(
      `SELECT p.id, p.name, p.category, COALESCE(pc.label, p.category, '综合商品') AS category_label,
              p.cover_image, p.price, p.points_price, p.stock, p.sales_count, p.reward_points,
              p.vip_only, p.required_points, p.required_invites, p.is_points_product, p.sort_order, p.created_at
       FROM products p
       LEFT JOIN product_categories pc ON pc.value = p.category
       ${where}
       ORDER BY p.sort_order DESC, p.id DESC
       LIMIT 100`,
      params
    );

    const data = await attachProductAccess(rows, req.user);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

export async function getProductDetail(req, res, next) {
  try {
    const productId = Number(req.params.id);
    const [product] = await query(
      `SELECT p.id, p.name, p.category, COALESCE(pc.label, p.category, '综合商品') AS category_label,
              p.cover_image, p.images, p.price, p.points_price, p.stock, p.sales_count, p.reward_points,
              p.vip_only, p.required_points, p.required_invites, p.is_points_product, p.status, p.created_at
       FROM products p
       LEFT JOIN product_categories pc ON pc.value = p.category
       WHERE p.id = :productId AND p.status = 'on'
       LIMIT 1`,
      { productId }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: '商品不存在或已下架' });
    }

    const [data] = await attachProductAccess(product, req.user);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

export async function createOrder(req, res, next) {
  try {
    const productId = Number(req.body.productId);
    const quantity = Math.max(Number(req.body.quantity || 1), 1);
    const addressId = Number(req.body.addressId || req.body.address_id || 0);
    const saveAddress = Boolean(req.body.saveAddress || req.body.save_address);
    let receiverName = clean(req.body.receiverName || req.body.receiver_name, 64);
    let receiverPhone = clean(req.body.receiverPhone || req.body.receiver_phone, 32);
    let receiverAddress = clean(req.body.receiverAddress || req.body.receiver_address, 255);

    const result = await transaction(async (connection) => {
      if (addressId > 0) {
        const [[address]] = await connection.execute(
          `SELECT receiver_name, receiver_phone, receiver_address
           FROM user_addresses
           WHERE id = :addressId AND user_id = :userId
           LIMIT 1`,
          { addressId, userId: req.user.id }
        );

        if (!address) {
          throw makeHttpError('选择的收货地址不存在', 404);
        }

        receiverName = address.receiver_name;
        receiverPhone = address.receiver_phone;
        receiverAddress = address.receiver_address;
      }

      if (!receiverName || !receiverPhone || !receiverAddress) {
        throw makeHttpError('请填写完整收货信息', 400);
      }

      if (saveAddress && addressId <= 0) {
        const [[countRow]] = await connection.execute(
          'SELECT COUNT(*) AS total FROM user_addresses WHERE user_id = :userId',
          { userId: req.user.id }
        );
        const shouldDefault = Number(countRow?.total || 0) === 0;
        await connection.execute(
          `INSERT INTO user_addresses (user_id, receiver_name, receiver_phone, receiver_address, is_default)
           VALUES (:userId, :receiverName, :receiverPhone, :receiverAddress, :isDefault)`,
          {
            userId: req.user.id,
            receiverName,
            receiverPhone,
            receiverAddress,
            isDefault: shouldDefault ? 1 : 0
          }
        );
      }

      const [[product]] = await connection.execute(
        `SELECT * FROM products
         WHERE id = :productId AND status = 'on'
         FOR UPDATE`,
        { productId }
      );

      if (!product) {
        throw makeHttpError('商品不存在或已下架', 404);
      }

      if (Number(product.stock) < quantity) {
        throw makeHttpError('库存不足', 400);
      }

      const access = await checkProductAccess(connection, req.user.id, product);
      if (!access.allowed) {
        throw makeHttpError(access.message, 403);
      }

      const totalAmount = Number(product.price) * quantity;
      const pointsUsed = product.is_points_product ? Number(product.points_price) * quantity : 0;
      const pointsReward = Number(product.reward_points || 0) * quantity;

      if (pointsUsed > 0) {
        const [[points]] = await connection.execute(
          'SELECT points_balance FROM points_accounts WHERE user_id = :userId FOR UPDATE',
          { userId: req.user.id }
        );

        if (!points || Number(points.points_balance) < pointsUsed) {
          throw makeHttpError('积分不足，无法兑换', 400);
        }

        await connection.execute(
          `UPDATE points_accounts
           SET points_balance = points_balance - :pointsUsed,
               total_used = total_used + :pointsUsed
           WHERE user_id = :userId`,
          { pointsUsed, userId: req.user.id }
        );

        await connection.execute(
          `INSERT INTO points_logs (user_id, type, points, source_type, source_id, description)
           VALUES (:userId, 'use', :pointsUsed, 'order', :productId, '积分兑换商品')`,
          { userId: req.user.id, pointsUsed, productId }
        );
      }

      const orderNo = createOrderNo('OD');
      const [orderResult] = await connection.execute(
        `INSERT INTO orders (order_no, user_id, total_amount, points_used, points_reward, status, pay_status,
                             receiver_name, receiver_phone, receiver_address)
         VALUES (:orderNo, :userId, :totalAmount, :pointsUsed, :pointsReward, 'pending', 'unpaid',
                 :receiverName, :receiverPhone, :receiverAddress)`,
        {
          orderNo,
          userId: req.user.id,
          totalAmount,
          pointsUsed,
          pointsReward,
          receiverName,
          receiverPhone,
          receiverAddress
        }
      );

      await connection.execute(
        `INSERT INTO order_items (order_id, product_id, product_name, product_image, price, quantity, subtotal)
         VALUES (:orderId, :productId, :productName, :productImage, :price, :quantity, :subtotal)`,
        {
          orderId: orderResult.insertId,
          productId,
          productName: product.name,
          productImage: product.cover_image,
          price: product.price,
          quantity,
          subtotal: totalAmount
        }
      );

      await connection.execute(
        `UPDATE products
         SET stock = stock - :quantity,
             sales_count = sales_count + :quantity
         WHERE id = :productId`,
        { quantity, productId }
      );

      return {
        id: orderResult.insertId,
        order_no: orderNo,
        total_amount: totalAmount,
        points_used: pointsUsed,
        points_reward: pointsReward,
        status: 'pending',
        pay_status: 'unpaid',
        receiver_name: receiverName,
        receiver_phone: receiverPhone,
        receiver_address: receiverAddress
      };
    });

    return res.status(201).json({ success: true, message: '订单已创建', data: result });
  } catch (error) {
    return next(error);
  }
}

export async function getMyOrders(req, res, next) {
  try {
    const rows = await query(
      `SELECT o.id, o.order_no, o.total_amount, o.points_used, o.points_reward,
              o.status, o.pay_status, o.receiver_name, o.receiver_phone, o.receiver_address, o.created_at,
              oi.product_id, oi.product_name, oi.product_image, oi.price, oi.quantity, oi.subtotal
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = :userId
       ORDER BY o.id DESC
       LIMIT 100`,
      { userId: req.user.id }
    );

    return res.json({ success: true, data: rows });
  } catch (error) {
    return next(error);
  }
}
