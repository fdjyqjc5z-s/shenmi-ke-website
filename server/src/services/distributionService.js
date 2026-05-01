function money(value) {
  return Math.max(Math.round(Number(value || 0) * 100) / 100, 0);
}

export function calcRebate(orderAmount, type, value) {
  const amount = Number(orderAmount || 0);
  const val = Number(value || 0);
  if (amount <= 0 || val <= 0) return 0;
  if (type === 'percent') return money(amount * val / 100);
  return money(val);
}

async function readSettings(connection) {
  const [[row]] = await connection.execute(
    `SELECT id, platform_code, default_buyer_rebate_type, default_buyer_rebate_value,
            default_owner_rebate_type, default_owner_rebate_value, status
     FROM distribution_settings WHERE id = 1 LIMIT 1`
  );
  return row || {
    platform_code: '',
    default_buyer_rebate_type: 'fixed',
    default_buyer_rebate_value: 0,
    default_owner_rebate_type: 'fixed',
    default_owner_rebate_value: 0,
    status: 'disabled'
  };
}

async function readRule(connection, buyerUserId, ownerUserId, settings) {
  const [[rule]] = await connection.execute(
    `SELECT * FROM distribution_user_rules WHERE buyer_user_id = :buyerUserId LIMIT 1`,
    { buyerUserId }
  );
  if (rule && rule.status === 'enabled') return rule;
  return {
    buyer_user_id: buyerUserId,
    owner_user_id: ownerUserId,
    buyer_rebate_type: settings.default_buyer_rebate_type || 'fixed',
    buyer_rebate_value: Number(settings.default_buyer_rebate_value || 0),
    owner_rebate_type: settings.default_owner_rebate_type || 'fixed',
    owner_rebate_value: Number(settings.default_owner_rebate_value || 0),
    status: 'enabled'
  };
}

async function addBalance(connection, { userId, amount, orderId, orderNo, type, description }) {
  const cash = money(amount);
  if (cash <= 0) return null;

  const [[exists]] = await connection.execute(
    `SELECT id FROM distribution_reward_logs
     WHERE order_id = :orderId AND receiver_user_id = :userId AND reward_type = :type
     LIMIT 1 FOR UPDATE`,
    { orderId, userId, type }
  );
  if (exists) return null;

  const [[wallet]] = await connection.execute(
    `SELECT available_balance FROM user_wallets WHERE user_id = :userId FOR UPDATE`,
    { userId }
  );
  if (!wallet) {
    await connection.execute(
      `INSERT INTO user_wallets (user_id, available_balance, total_income) VALUES (:userId, 0, 0)`,
      { userId }
    );
  }

  const before = Number(wallet?.available_balance || 0);
  const after = money(before + cash);

  await connection.execute(
    `UPDATE user_wallets
     SET available_balance = available_balance + :cash,
         total_income = total_income + :cash
     WHERE user_id = :userId`,
    { cash, userId }
  );

  await connection.execute(
    `INSERT INTO wallet_logs (user_id, type, amount, balance_before, balance_after, source_type, source_id, description)
     VALUES (:userId, 'earn', :cash, :before, :after, 'distribution', :orderId, :description)`,
    { userId, cash, before, after, orderId, description }
  );

  return { amount: cash, before, after, order_no: orderNo };
}

export async function applyDistributionRebatesForOrder(connection, orderId, adminId = null) {
  const [[order]] = await connection.execute(
    `SELECT id, order_no, user_id, total_amount, status, pay_status
     FROM orders WHERE id = :orderId LIMIT 1 FOR UPDATE`,
    { orderId }
  );
  if (!order) return { applied: false, reason: '订单不存在' };
  if (!['paid', 'completed'].includes(order.status) && order.pay_status !== 'paid') {
    return { applied: false, reason: '订单未付款或未完成' };
  }

  const [[buyer]] = await connection.execute(
    `SELECT id, username, user_code, invited_by_user_id FROM users WHERE id = :userId LIMIT 1`,
    { userId: order.user_id }
  );
  if (!buyer?.invited_by_user_id) return { applied: false, reason: '用户未绑定分销码' };

  const settings = await readSettings(connection);
  if (settings.status !== 'enabled') return { applied: false, reason: '分销功能未启用' };

  const ownerUserId = Number(buyer.invited_by_user_id);
  const rule = await readRule(connection, buyer.id, ownerUserId, settings);
  if (rule.status !== 'enabled') return { applied: false, reason: '该用户返利规则未启用' };

  const total = Number(order.total_amount || 0);
  const buyerAmount = calcRebate(total, rule.buyer_rebate_type, rule.buyer_rebate_value);
  const ownerAmount = calcRebate(total, rule.owner_rebate_type, rule.owner_rebate_value);
  const rewards = [];

  if (buyerAmount > 0) {
    const paid = await addBalance(connection, {
      userId: buyer.id,
      amount: buyerAmount,
      orderId: order.id,
      orderNo: order.order_no,
      type: 'buyer_rebate',
      description: `订单 ${order.order_no} 购买返利`
    });
    if (paid) {
      await connection.execute(
        `INSERT INTO distribution_reward_logs
         (order_id, order_no, buyer_user_id, receiver_user_id, owner_user_id, reward_type, reward_rule_type, reward_rule_value, reward_amount, status, admin_id, paid_at)
         VALUES (:orderId, :orderNo, :buyerUserId, :receiverUserId, :ownerUserId, 'buyer_rebate', :ruleType, :ruleValue, :amount, 'paid', :adminId, NOW())`,
        { orderId: order.id, orderNo: order.order_no, buyerUserId: buyer.id, receiverUserId: buyer.id, ownerUserId, ruleType: rule.buyer_rebate_type, ruleValue: Number(rule.buyer_rebate_value || 0), amount: buyerAmount, adminId }
      );
      rewards.push({ type: 'buyer_rebate', user_id: buyer.id, amount: buyerAmount });
    }
  }

  if (ownerAmount > 0) {
    const paid = await addBalance(connection, {
      userId: ownerUserId,
      amount: ownerAmount,
      orderId: order.id,
      orderNo: order.order_no,
      type: 'owner_rebate',
      description: `订单 ${order.order_no} 下级购买返现`
    });
    if (paid) {
      await connection.execute(
        `INSERT INTO distribution_reward_logs
         (order_id, order_no, buyer_user_id, receiver_user_id, owner_user_id, reward_type, reward_rule_type, reward_rule_value, reward_amount, status, admin_id, paid_at)
         VALUES (:orderId, :orderNo, :buyerUserId, :receiverUserId, :ownerUserId, 'owner_rebate', :ruleType, :ruleValue, :amount, 'paid', :adminId, NOW())`,
        { orderId: order.id, orderNo: order.order_no, buyerUserId: buyer.id, receiverUserId: ownerUserId, ownerUserId, ruleType: rule.owner_rebate_type, ruleValue: Number(rule.owner_rebate_value || 0), amount: ownerAmount, adminId }
      );
      rewards.push({ type: 'owner_rebate', user_id: ownerUserId, amount: ownerAmount });
    }
  }

  return { applied: rewards.length > 0, rewards };
}
