import { dbPool, query, transaction } from '../config/db.js';
import { createOrderNo } from '../utils/id.js';
import { checkProductAccess } from '../services/productAccessService.js';

async function attachProductAccess(products, user) {
  const list = Array.isArray(products) ? products : [products];

  if (!user?.id) {
    return list.map((item) => ({
      ...item,
      can_purchase: false,
      access_message: '登录后可购买或兑换',
      access_required: 'login'
    }));
  }

  const result = [];
  for (const item of list) {
    const access = await checkProductAccess(dbPool, user.id, item);
    result.push({
      ...item,
      can_purchase: access.allowed,
      access_message: access.message,
      access_required: access.allowed ? 'none' : 'condition'
    });
  }

  return result;
}

export async function listProducts(req, res, next) {
  try {
    const type = req.query.type || 'all';
    const params = {};
    let where = "WHERE status = 'on'";

    if (type === 'vip') where += ' AND vip_only = 1';
    if (type === 'points') where += ' AND is_points_product = 1';
    if (type === 'normal') where += ' AND vip_only = 0 AND is_points_product = 0';

    const rows = await query(
      `SELECT id, name, cover_image, price, points_price, stock, sales_count, reward_points,
              vip_only, required_points, required_invites, is_points_product, sort_order, created_at
       FROM products
       ${where}
       ORDER BY sort_order DESC, id DESC
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
      `SELECT id, name, cover_image, images, price, points_price, stock, sales_count, reward_points,
              vip_only, required_points, required_invites, is_points_product, status, created_at
       FROM products
       WHERE id = :productId AND status = 'on'
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
    const receiverName = String(req.body.receiverName || '').trim().slice(0, 64);
    const receiverPhone = String(req.body.receiverPhone || '').trim().slice(0, 32);
    const receiverAddress = String(req.body.receiverAddress || '').trim().slice(0, 255);

    const result = await transaction(async (connection) => {
      const [[product]] = await connection.execute(
        `SELECT * FROM products
         WHERE id = :productId AND status = 'on'
         FOR UPDATE`,
        { productId }
      );

      if (!product) {
        const error = new Error('商品不存在或已下架');
        error.statusCode = 404;
        throw error;
      }

      if (Number(product.stock) < quantity) {
        const error = new Error('库存不足');
        error.statusCode = 400;
        throw error;
      }

      const access = await checkProductAccess(connection, req.user.id, product);
      if (!access.allowed) {
        const error = new Error(access.message);
        error.statusCode = 403;
        throw error;
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
          const error = new Error('积分不足，无法兑换');
          error.statusCode = 400;
          throw error;
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
        order_no: orderNo,
        total_amount: totalAmount,
        points_used: pointsUsed,
        status: 'pending'
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
      `SELECT order_no, total_amount, points_used, points_reward, status, pay_status, created_at
       FROM orders
       WHERE user_id = :userId
       ORDER BY id DESC
       LIMIT 50`,
      { userId: req.user.id }
    );

    return res.json({ success: true, data: rows });
  } catch (error) {
    return next(error);
  }
}
