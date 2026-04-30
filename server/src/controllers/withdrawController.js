import { transaction, query } from '../config/db.js';
import { createOrderNo } from '../utils/id.js';
import { isPositiveMoney, sanitizeString } from '../utils/validators.js';

export async function createWithdrawOrder(req, res, next) {
  try {
    const amount = Number(req.body.amount);
    const withdrawMethod = sanitizeString(req.body.withdrawMethod || 'manual', 32);
    const accountName = sanitizeString(req.body.accountName || '', 64);
    const accountNo = sanitizeString(req.body.accountNo || '', 128);

    if (!isPositiveMoney(amount) || amount < 1) {
      return res.status(400).json({ success: false, message: '提现金额最低1元' });
    }

    if (!['alipay', 'wechat', 'manual'].includes(withdrawMethod)) {
      return res.status(400).json({ success: false, message: '提现方式不支持' });
    }

    const result = await transaction(async (connection) => {
      const [[user]] = await connection.execute(
        'SELECT id, withdraw_status FROM users WHERE id = :userId AND status = \'normal\' LIMIT 1',
        { userId: req.user.id }
      );

      if (!user || user.withdraw_status !== 'normal') {
        const error = new Error('当前账号暂不能提现');
        error.statusCode = 403;
        throw error;
      }

      const [[wallet]] = await connection.execute(
        'SELECT available_balance, frozen_balance FROM user_wallets WHERE user_id = :userId FOR UPDATE',
        { userId: req.user.id }
      );

      if (!wallet || Number(wallet.available_balance) < amount) {
        const error = new Error('可提现余额不足');
        error.statusCode = 400;
        throw error;
      }

      const before = Number(wallet.available_balance);
      const after = before - amount;
      const withdrawNo = createOrderNo('WD');

      await connection.execute(
        `UPDATE user_wallets
         SET available_balance = available_balance - :amount,
             frozen_balance = frozen_balance + :amount
         WHERE user_id = :userId`,
        { amount, userId: req.user.id }
      );

      await connection.execute(
        `INSERT INTO withdraw_orders (withdraw_no, user_id, amount, withdraw_method, account_name, account_no)
         VALUES (:withdrawNo, :userId, :amount, :withdrawMethod, :accountName, :accountNo)`,
        { withdrawNo, userId: req.user.id, amount, withdrawMethod, accountName, accountNo }
      );

      await connection.execute(
        `INSERT INTO wallet_logs (user_id, type, amount, balance_before, balance_after, source_type, description)
         VALUES (:userId, 'freeze', :amount, :before, :after, 'withdraw', '提现申请冻结余额')`,
        { userId: req.user.id, amount, before, after }
      );

      return { withdraw_no: withdrawNo, amount, status: 'pending' };
    });

    return res.status(201).json({ success: true, message: '提现申请已提交', data: result });
  } catch (error) {
    return next(error);
  }
}

export async function getMyWithdrawOrders(req, res, next) {
  try {
    const rows = await query(
      `SELECT withdraw_no, amount, status, withdraw_method, reject_reason, created_at, audit_time, paid_time
       FROM withdraw_orders
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
