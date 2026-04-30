import { query, transaction } from '../config/db.js';
import { sanitizeString } from '../utils/validators.js';

export async function adminListWithdrawOrders(req, res, next) {
  try {
    const keyword = sanitizeString(req.query.keyword || '', 64);
    const status = ['pending', 'approved', 'rejected', 'paid'].includes(req.query.status) ? req.query.status : '';
    const page = Math.max(Number(req.query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize || 20), 1), 100);
    const offset = (page - 1) * pageSize;

    const conditions = [];
    const params = { pageSize, offset };

    if (keyword) {
      conditions.push('(wo.withdraw_no LIKE :keyword OR u.username LIKE :keyword OR u.user_code LIKE :keyword)');
      params.keyword = `%${keyword}%`;
    }

    if (status) {
      conditions.push('wo.status = :status');
      params.status = status;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await query(
      `SELECT wo.id, wo.withdraw_no, wo.user_id, u.username, u.user_code,
              wo.amount, wo.status, wo.withdraw_method, wo.account_name, wo.account_no,
              wo.reject_reason, wo.created_at, wo.audit_time, wo.paid_time
       FROM withdraw_orders wo
       LEFT JOIN users u ON u.id = wo.user_id
       ${where}
       ORDER BY wo.id DESC
       LIMIT :pageSize OFFSET :offset`,
      params
    );

    const totalRows = await query(
      `SELECT COUNT(*) AS total
       FROM withdraw_orders wo
       LEFT JOIN users u ON u.id = wo.user_id
       ${where}`,
      params
    );

    return res.json({
      success: true,
      data: {
        list: rows,
        pagination: {
          page,
          pageSize,
          total: totalRows[0]?.total || 0,
          totalPages: Math.ceil((totalRows[0]?.total || 0) / pageSize)
        }
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function adminUpdateWithdrawStatus(req, res, next) {
  try {
    const withdrawId = Number(req.params.id);
    const nextStatus = sanitizeString(req.body.status || '', 32);
    const rejectReason = sanitizeString(req.body.rejectReason || req.body.reject_reason || '', 255);

    if (!['approved', 'rejected', 'paid'].includes(nextStatus)) {
      return res.status(400).json({ success: false, message: '提现状态不合法' });
    }

    const result = await transaction(async (connection) => {
      const [orders] = await connection.execute(
        'SELECT id, user_id, amount, status FROM withdraw_orders WHERE id = :withdrawId FOR UPDATE',
        { withdrawId }
      );
      const order = orders[0];

      if (!order) {
        const error = new Error('提现申请不存在');
        error.statusCode = 404;
        throw error;
      }

      if (order.status === 'paid') {
        const error = new Error('已打款提现不能重复处理');
        error.statusCode = 400;
        throw error;
      }

      const amount = Number(order.amount);

      if (nextStatus === 'approved') {
        if (order.status !== 'pending') {
          const error = new Error('只有待审核提现可以通过审核');
          error.statusCode = 400;
          throw error;
        }

        await connection.execute(
          `UPDATE withdraw_orders
           SET status = 'approved', audit_admin_id = :adminId, audit_time = NOW(), reject_reason = NULL
           WHERE id = :withdrawId`,
          { adminId: req.user.id, withdrawId }
        );
      }

      if (nextStatus === 'rejected') {
        if (!['pending', 'approved'].includes(order.status)) {
          const error = new Error('当前提现状态不能拒绝');
          error.statusCode = 400;
          throw error;
        }

        await connection.execute(
          `UPDATE user_wallets
           SET frozen_balance = frozen_balance - :amount,
               available_balance = available_balance + :amount
           WHERE user_id = :userId`,
          { amount, userId: order.user_id }
        );

        await connection.execute(
          `INSERT INTO wallet_logs (user_id, type, amount, source_type, source_id, description)
           VALUES (:userId, 'unfreeze', :amount, 'withdraw', :withdrawId, '提现拒绝退回余额')`,
          { userId: order.user_id, amount, withdrawId }
        );

        await connection.execute(
          `UPDATE withdraw_orders
           SET status = 'rejected', audit_admin_id = :adminId, audit_time = NOW(), reject_reason = :rejectReason
           WHERE id = :withdrawId`,
          { adminId: req.user.id, rejectReason, withdrawId }
        );
      }

      if (nextStatus === 'paid') {
        if (order.status !== 'approved') {
          const error = new Error('只有已通过审核的提现可以标记打款');
          error.statusCode = 400;
          throw error;
        }

        await connection.execute(
          `UPDATE user_wallets
           SET frozen_balance = frozen_balance - :amount,
               total_withdraw = total_withdraw + :amount
           WHERE user_id = :userId`,
          { amount, userId: order.user_id }
        );

        await connection.execute(
          `INSERT INTO wallet_logs (user_id, type, amount, source_type, source_id, description)
           VALUES (:userId, 'withdraw', :amount, 'withdraw', :withdrawId, '提现已打款')`,
          { userId: order.user_id, amount, withdrawId }
        );

        await connection.execute(
          `UPDATE withdraw_orders
           SET status = 'paid', paid_time = NOW()
           WHERE id = :withdrawId`,
          { withdrawId }
        );
      }

      return { id: withdrawId, status: nextStatus };
    });

    return res.json({ success: true, message: '提现状态已更新', data: result });
  } catch (error) {
    return next(error);
  }
}
