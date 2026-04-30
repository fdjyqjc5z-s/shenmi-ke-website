import { query } from '../config/db.js';
import { isPositiveInteger, isPositiveMoney, sanitizeString } from '../utils/validators.js';

export async function adminListTasks(req, res, next) {
  try {
    const status = sanitizeString(req.query.status || '', 32);
    const params = {};
    let where = 'WHERE 1=1';

    if (status) {
      where += ' AND status = :status';
      params.status = status;
    }

    const rows = await query(
      `SELECT id, title, reward_amount, reward_points, deadline, max_accept_count, current_accept_count,
              vip_only, deposit_required, deposit_type, deposit_amount, status, created_at
       FROM tasks
       ${where}
       ORDER BY id DESC
       LIMIT 200`,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (error) {
    return next(error);
  }
}

export async function adminCreateTask(req, res, next) {
  try {
    const title = sanitizeString(req.body.title || '', 128);
    const content = sanitizeString(req.body.content || '', 2000);
    const rewardAmount = Number(req.body.rewardAmount || 0);
    const rewardPoints = Number(req.body.rewardPoints || 0);
    const maxAcceptCount = Number(req.body.maxAcceptCount || 1);
    const vipOnly = req.body.vipOnly ? 1 : 0;
    const depositRequired = req.body.depositRequired ? 1 : 0;
    const depositType = ['none', 'points', 'balance'].includes(req.body.depositType) ? req.body.depositType : 'none';
    const depositAmount = Number(req.body.depositAmount || 0);
    const status = ['pending', 'open', 'closed', 'cancelled'].includes(req.body.status) ? req.body.status : 'pending';
    const deadline = req.body.deadline || null;

    if (!title) return res.status(400).json({ success: false, message: '任务标题不能为空' });
    if (!isPositiveMoney(rewardAmount)) return res.status(400).json({ success: false, message: '余额奖励不合法' });
    if (!isPositiveInteger(rewardPoints)) return res.status(400).json({ success: false, message: '积分奖励不合法' });
    if (!isPositiveInteger(maxAcceptCount) || maxAcceptCount < 1) return res.status(400).json({ success: false, message: '接单人数不合法' });
    if (!isPositiveMoney(depositAmount)) return res.status(400).json({ success: false, message: '押金金额不合法' });

    const result = await query(
      `INSERT INTO tasks (admin_id, title, content, reward_amount, reward_points, deadline, max_accept_count,
                          vip_only, deposit_required, deposit_type, deposit_amount, status)
       VALUES (:adminId, :title, :content, :rewardAmount, :rewardPoints, :deadline, :maxAcceptCount,
               :vipOnly, :depositRequired, :depositType, :depositAmount, :status)`,
      { adminId: req.user.id, title, content, rewardAmount, rewardPoints, deadline, maxAcceptCount, vipOnly, depositRequired, depositType, depositAmount, status }
    );

    return res.status(201).json({ success: true, message: '任务已创建', data: { id: result.insertId } });
  } catch (error) {
    return next(error);
  }
}

export async function adminUpdateTaskStatus(req, res, next) {
  try {
    const taskId = Number(req.params.id);
    const status = sanitizeString(req.body.status || '', 32);
    const allowed = ['pending', 'open', 'closed', 'cancelled'];

    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: '任务状态不合法' });
    }

    await query('UPDATE tasks SET status = :status WHERE id = :taskId', { status, taskId });
    return res.json({ success: true, message: '任务状态已更新' });
  } catch (error) {
    return next(error);
  }
}
