import { query, transaction } from '../config/db.js';
import { sanitizeString } from '../utils/validators.js';
import { applyDistributionRebatesForOrder } from '../services/distributionService.js';

function normalizeRuleType(value) {
  return value === 'percent' ? 'percent' : 'fixed';
}

function normalizeMoney(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : 0;
}

function normalizeStatus(value, fallback = 'enabled') {
  return ['enabled', 'disabled'].includes(value) ? value : fallback;
}

export async function adminGetDistributionOverview(req, res, next) {
  try {
    const keyword = sanitizeString(req.query.keyword || '', 64);
    const params = {};
    const userConditions = ['u.invited_by_user_id IS NOT NULL'];

    if (keyword) {
      userConditions.push('(u.username LIKE :keyword OR u.nickname LIKE :keyword OR u.user_code LIKE :keyword OR inviter.invite_code LIKE :keyword)');
      params.keyword = `%${keyword}%`;
    }

    const where = `WHERE ${userConditions.join(' AND ')}`;

    const [settings] = await query(
      `SELECT id, platform_code, default_buyer_rebate_type, default_buyer_rebate_value,
              default_owner_rebate_type, default_owner_rebate_value, status, updated_at
       FROM distribution_settings
       WHERE id = 1
       LIMIT 1`
    );

    const users = await query(
      `SELECT u.id, u.user_code, u.username, u.nickname, u.invite_code, u.invited_by_user_id, u.created_at,
              inviter.user_code AS inviter_user_code,
              inviter.username AS inviter_username,
              inviter.nickname AS inviter_nickname,
              inviter.invite_code AS inviter_invite_code,
              r.buyer_rebate_type, r.buyer_rebate_value, r.owner_rebate_type, r.owner_rebate_value, r.status AS rule_status,
              COALESCE(SUM(CASE WHEN l.reward_type = 'buyer_rebate' THEN l.reward_amount ELSE 0 END), 0) AS buyer_rebate_total,
              COALESCE(SUM(CASE WHEN l.reward_type = 'owner_rebate' THEN l.reward_amount ELSE 0 END), 0) AS owner_rebate_total
       FROM users u
       LEFT JOIN users inviter ON inviter.id = u.invited_by_user_id
       LEFT JOIN distribution_user_rules r ON r.buyer_user_id = u.id
       LEFT JOIN distribution_reward_logs l ON l.buyer_user_id = u.id
       ${where}
       GROUP BY u.id, inviter.id, r.id
       ORDER BY u.id DESC
       LIMIT 200`,
      params
    );

    const logs = await query(
      `SELECT l.id, l.order_no, l.buyer_user_id, l.receiver_user_id, l.owner_user_id,
              l.reward_type, l.reward_rule_type, l.reward_rule_value, l.reward_amount,
              l.status, l.paid_at, l.created_at,
              buyer.username AS buyer_username, buyer.user_code AS buyer_user_code,
              receiver.username AS receiver_username, receiver.user_code AS receiver_user_code
       FROM distribution_reward_logs l
       LEFT JOIN users buyer ON buyer.id = l.buyer_user_id
       LEFT JOIN users receiver ON receiver.id = l.receiver_user_id
       ORDER BY l.id DESC
       LIMIT 100`
    );

    return res.json({
      success: true,
      data: {
        settings: settings || {
          id: 1,
          platform_code: '',
          default_buyer_rebate_type: 'fixed',
          default_buyer_rebate_value: 0,
          default_owner_rebate_type: 'fixed',
          default_owner_rebate_value: 0,
          status: 'disabled'
        },
        users,
        logs
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function adminUpdateDistributionSettings(req, res, next) {
  try {
    const payload = {
      platformCode: sanitizeString(req.body.platformCode || req.body.platform_code || '', 32),
      defaultBuyerRebateType: normalizeRuleType(req.body.defaultBuyerRebateType || req.body.default_buyer_rebate_type),
      defaultBuyerRebateValue: normalizeMoney(req.body.defaultBuyerRebateValue || req.body.default_buyer_rebate_value),
      defaultOwnerRebateType: normalizeRuleType(req.body.defaultOwnerRebateType || req.body.default_owner_rebate_type),
      defaultOwnerRebateValue: normalizeMoney(req.body.defaultOwnerRebateValue || req.body.default_owner_rebate_value),
      status: normalizeStatus(req.body.status)
    };

    await query(
      `INSERT INTO distribution_settings
       (id, platform_code, default_buyer_rebate_type, default_buyer_rebate_value,
        default_owner_rebate_type, default_owner_rebate_value, status)
       VALUES (1, :platformCode, :defaultBuyerRebateType, :defaultBuyerRebateValue,
               :defaultOwnerRebateType, :defaultOwnerRebateValue, :status)
       ON DUPLICATE KEY UPDATE
         platform_code = VALUES(platform_code),
         default_buyer_rebate_type = VALUES(default_buyer_rebate_type),
         default_buyer_rebate_value = VALUES(default_buyer_rebate_value),
         default_owner_rebate_type = VALUES(default_owner_rebate_type),
         default_owner_rebate_value = VALUES(default_owner_rebate_value),
         status = VALUES(status)`,
      payload
    );

    return res.json({ success: true, message: '分销设置已保存' });
  } catch (error) {
    return next(error);
  }
}

export async function adminUpdateDistributionUserRule(req, res, next) {
  try {
    const buyerUserId = Number(req.params.userId || req.body.buyerUserId || req.body.buyer_user_id);
    if (!buyerUserId) return res.status(400).json({ success: false, message: '用户ID不能为空' });

    const payload = {
      buyerUserId,
      buyerRebateType: normalizeRuleType(req.body.buyerRebateType || req.body.buyer_rebate_type),
      buyerRebateValue: normalizeMoney(req.body.buyerRebateValue || req.body.buyer_rebate_value),
      ownerRebateType: normalizeRuleType(req.body.ownerRebateType || req.body.owner_rebate_type),
      ownerRebateValue: normalizeMoney(req.body.ownerRebateValue || req.body.owner_rebate_value),
      status: normalizeStatus(req.body.status)
    };

    const [user] = await query('SELECT id, invited_by_user_id FROM users WHERE id = :buyerUserId LIMIT 1', { buyerUserId });
    if (!user) return res.status(404).json({ success: false, message: '用户不存在' });
    if (!user.invited_by_user_id) return res.status(400).json({ success: false, message: '该用户还没有绑定上级分销码' });

    await query(
      `INSERT INTO distribution_user_rules
       (buyer_user_id, owner_user_id, buyer_rebate_type, buyer_rebate_value, owner_rebate_type, owner_rebate_value, status)
       VALUES (:buyerUserId, :ownerUserId, :buyerRebateType, :buyerRebateValue, :ownerRebateType, :ownerRebateValue, :status)
       ON DUPLICATE KEY UPDATE
         owner_user_id = VALUES(owner_user_id),
         buyer_rebate_type = VALUES(buyer_rebate_type),
         buyer_rebate_value = VALUES(buyer_rebate_value),
         owner_rebate_type = VALUES(owner_rebate_type),
         owner_rebate_value = VALUES(owner_rebate_value),
         status = VALUES(status)`,
      { ...payload, ownerUserId: user.invited_by_user_id }
    );

    return res.json({ success: true, message: '用户返利规则已保存' });
  } catch (error) {
    return next(error);
  }
}

export async function adminApplyDistributionForOrder(req, res, next) {
  try {
    const orderId = Number(req.params.orderId || req.body.orderId || req.body.order_id);
    if (!orderId) return res.status(400).json({ success: false, message: '订单ID不能为空' });

    const result = await transaction(async (connection) => applyDistributionRebatesForOrder(connection, orderId, req.user.id));
    return res.json({ success: true, message: result.applied ? '返利已发放' : result.reason || '没有可发放返利', data: result });
  } catch (error) {
    return next(error);
  }
}
