import { query, transaction } from '../config/db.js';
import { isPositiveInteger, isPositiveMoney, sanitizeString } from '../utils/validators.js';
import { rewardUserPoints } from '../services/accountService.js';
import { writeAdminLog } from '../services/adminLogService.js';

function normalizeAmountCategory(value) {
  const category = sanitizeString(value || 'micro', 32);
  return ['micro', 'small', 'medium', 'high', 'custom'].includes(category) ? category : 'micro';
}

async function refundTaskDeposit(connection, accept, adminId, reason) {
  if (accept.deposit_status !== 'frozen') return;

  const amount = Number(accept.deposit_amount || 0);
  if (amount <= 0) return;

  if (accept.deposit_type === 'balance') {
    await connection.execute(
      `UPDATE user_wallets
       SET deposit_frozen_balance = deposit_frozen_balance - :amount,
           available_balance = available_balance + :amount
       WHERE user_id = :userId`,
      { amount, userId: accept.user_id }
    );
  }

  if (accept.deposit_type === 'points') {
    const pointsAmount = Math.ceil(amount);
    await connection.execute(
      `UPDATE points_accounts
       SET frozen_points = frozen_points - :pointsAmount,
           points_balance = points_balance + :pointsAmount
       WHERE user_id = :userId`,
      { pointsAmount, userId: accept.user_id }
    );
  }

  await connection.execute(
    `INSERT INTO task_deposit_logs (task_id, task_accept_id, user_id, deposit_type, amount, action, reason, admin_id)
     VALUES (:taskId, :acceptId, :userId, :depositType, :amount, 'refund', :reason, :adminId)`,
    {
      taskId: accept.task_id,
      acceptId: accept.id,
      userId: accept.user_id,
      depositType: accept.deposit_type,
      amount,
      reason,
      adminId
    }
  );

  await connection.execute(
    `UPDATE task_accepts
     SET deposit_status = 'refunded'
     WHERE id = :acceptId`,
    { acceptId: accept.id }
  );
}

async function rewardTaskUser(connection, accept, task) {
  const rewardAmount = Number(task.reward_amount || 0);
  const rewardPoints = Number(task.reward_points || 0);

  if (rewardAmount > 0) {
    const [walletRows] = await connection.execute(
      'SELECT available_balance FROM user_wallets WHERE user_id = :userId FOR UPDATE',
      { userId: accept.user_id }
    );
    const wallet = walletRows[0] || { available_balance: 0 };
    const before = Number(wallet.available_balance || 0);
    const after = before + rewardAmount;

    await connection.execute(
      `UPDATE user_wallets
       SET available_balance = available_balance + :rewardAmount,
           total_income = total_income + :rewardAmount
       WHERE user_id = :userId`,
      { rewardAmount, userId: accept.user_id }
    );

    await connection.execute(
      `INSERT INTO wallet_logs (user_id, type, amount, balance_before, balance_after, source_type, source_id, description)
       VALUES (:userId, 'earn', :rewardAmount, :before, :after, 'task', :taskId, '任务审核通过奖励')`,
      { userId: accept.user_id, rewardAmount, before, after, taskId: task.id }
    );
  }

  if (rewardPoints > 0) {
    await rewardUserPoints(connection, accept.user_id, rewardPoints, '任务审核通过奖励', 'task', task.id);
  }
}

export async function adminListTasks(req, res, next) {
  try {
    const status = sanitizeString(req.query.status || '', 32);
    const amountCategory = sanitizeString(req.query.amountCategory || req.query.amount_category || '', 32);
    const params = {};
    let where = 'WHERE 1=1';

    if (status) {
      where += ' AND status = :status';
      params.status = status;
    }

    if (amountCategory) {
      where += ' AND amount_category = :amountCategory';
      params.amountCategory = amountCategory;
    }

    const rows = await query(
      `SELECT id, title, amount_category, reward_amount, reward_points, deadline, max_accept_count, current_accept_count,
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
    const amountCategory = normalizeAmountCategory(req.body.amountCategory || req.body.amount_category);
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
      `INSERT INTO tasks (admin_id, title, content, amount_category, reward_amount, reward_points, deadline, max_accept_count,
                          vip_only, deposit_required, deposit_type, deposit_amount, status)
       VALUES (:adminId, :title, :content, :amountCategory, :rewardAmount, :rewardPoints, :deadline, :maxAcceptCount,
               :vipOnly, :depositRequired, :depositType, :depositAmount, :status)`,
      { adminId: req.user.id, title, content, amountCategory, rewardAmount, rewardPoints, deadline, maxAcceptCount, vipOnly, depositRequired, depositType, depositAmount, status }
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

export async function adminListTaskSubmissions(req, res, next) {
  try {
    const status = ['submitted', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : '';
    const page = Math.max(Number(req.query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize || 20), 1), 100);
    const offset = (page - 1) * pageSize;

    const conditions = [];
    const params = { pageSize, offset };

    if (status) {
      conditions.push('tp.status = :status');
      params.status = status;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await query(
      `SELECT tp.id, tp.task_accept_id, tp.task_id, tp.user_id, tp.progress_percent, tp.content,
              tp.images, tp.files, tp.status, tp.review_comment, tp.created_at, tp.updated_at,
              t.title, t.amount_category, t.reward_amount, t.reward_points,
              ta.deposit_type, ta.deposit_amount, ta.deposit_status,
              u.username, u.nickname, u.user_code
       FROM task_progress tp
       LEFT JOIN tasks t ON t.id = tp.task_id
       LEFT JOIN task_accepts ta ON ta.id = tp.task_accept_id
       LEFT JOIN users u ON u.id = tp.user_id
       ${where}
       ORDER BY tp.id DESC
       LIMIT :pageSize OFFSET :offset`,
      params
    );

    const totalRows = await query(
      `SELECT COUNT(*) AS total
       FROM task_progress tp
       LEFT JOIN tasks t ON t.id = tp.task_id
       LEFT JOIN task_accepts ta ON ta.id = tp.task_accept_id
       LEFT JOIN users u ON u.id = tp.user_id
       ${where}`,
      params
    );

    const total = totalRows[0]?.total || 0;

    return res.json({
      success: true,
      data: {
        list: rows,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function adminReviewTaskSubmission(req, res, next) {
  try {
    const progressId = Number(req.params.progressId);
    const action = ['approved', 'rejected'].includes(req.body.action) ? req.body.action : '';
    const reviewComment = sanitizeString(req.body.reviewComment || req.body.review_comment || '', 255);

    if (!action) {
      return res.status(400).json({ success: false, message: '审核操作不合法' });
    }

    const result = await transaction(async (connection) => {
      const [progressRows] = await connection.execute(
        `SELECT * FROM task_progress WHERE id = :progressId FOR UPDATE`,
        { progressId }
      );
      const progress = progressRows[0];

      if (!progress) {
        const error = new Error('任务提交记录不存在');
        error.statusCode = 404;
        throw error;
      }

      if (progress.status !== 'submitted') {
        const error = new Error('该任务提交已审核，不能重复操作');
        error.statusCode = 400;
        throw error;
      }

      const [acceptRows] = await connection.execute(
        `SELECT * FROM task_accepts WHERE id = :acceptId FOR UPDATE`,
        { acceptId: progress.task_accept_id }
      );
      const accept = acceptRows[0];

      const [taskRows] = await connection.execute(
        `SELECT * FROM tasks WHERE id = :taskId LIMIT 1`,
        { taskId: progress.task_id }
      );
      const task = taskRows[0];

      if (!accept || !task) {
        const error = new Error('任务或接单记录不存在');
        error.statusCode = 404;
        throw error;
      }

      if (action === 'approved') {
        await rewardTaskUser(connection, accept, task);
        await refundTaskDeposit(connection, accept, req.user.id, '任务审核通过退回押金');

        await connection.execute(
          `UPDATE task_accepts
           SET status = 'approved', approved_at = NOW()
           WHERE id = :acceptId`,
          { acceptId: accept.id }
        );

        await connection.execute(
          `UPDATE task_progress
           SET status = 'approved', review_comment = :reviewComment, review_admin_id = :adminId
           WHERE id = :progressId`,
          { reviewComment, adminId: req.user.id, progressId }
        );
      }

      if (action === 'rejected') {
        await refundTaskDeposit(connection, accept, req.user.id, '任务审核拒绝退回押金');

        await connection.execute(
          `UPDATE task_accepts
           SET status = 'rejected'
           WHERE id = :acceptId`,
          { acceptId: accept.id }
        );

        await connection.execute(
          `UPDATE tasks
           SET current_accept_count = GREATEST(current_accept_count - 1, 0)
           WHERE id = :taskId`,
          { taskId: task.id }
        );

        await connection.execute(
          `UPDATE task_progress
           SET status = 'rejected', review_comment = :reviewComment, review_admin_id = :adminId
           WHERE id = :progressId`,
          { reviewComment: reviewComment || '任务审核未通过', adminId: req.user.id, progressId }
        );
      }

      await writeAdminLog(connection, {
        adminId: req.user.id,
        action: action === 'approved' ? 'task_submission_approve' : 'task_submission_reject',
        targetType: 'task_progress',
        targetId: progressId,
        description: `审核任务提交：${action}`,
        ip: req.ip
      });

      return { id: progressId, status: action };
    });

    return res.json({ success: true, message: action === 'approved' ? '任务已审核通过并发放奖励' : '任务已拒绝并退回押金', data: result });
  } catch (error) {
    return next(error);
  }
}
