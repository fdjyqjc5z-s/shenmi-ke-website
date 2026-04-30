import { query, transaction } from '../config/db.js';

export async function listOpenTasks(req, res, next) {
  try {
    const type = req.query.type || 'all';
    const page = Math.max(Number(req.query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize || 20), 1), 100);
    const offset = (page - 1) * pageSize;

    const conditions = ["status = 'open'"];
    const params = { pageSize, offset };

    if (type === 'vip') conditions.push('vip_only = 1');
    if (type === 'deposit') conditions.push('deposit_required = 1');
    if (type === 'normal') conditions.push('vip_only = 0 AND deposit_required = 0');

    const where = `WHERE ${conditions.join(' AND ')}`;

    const rows = await query(
      `SELECT id, title, content, reward_amount, reward_points, deadline, max_accept_count,
              current_accept_count, vip_only, deposit_required, deposit_type, deposit_amount,
              status, created_at
       FROM tasks
       ${where}
       ORDER BY reward_amount DESC, reward_points DESC, id DESC
       LIMIT :pageSize OFFSET :offset`,
      params
    );

    const totalRows = await query(`SELECT COUNT(*) AS total FROM tasks ${where}`, params);
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

export async function getTaskDetail(req, res, next) {
  try {
    const taskId = Number(req.params.id);
    const [task] = await query(
      `SELECT id, title, content, reward_amount, reward_points, deadline, max_accept_count,
              current_accept_count, vip_only, deposit_required, deposit_type, deposit_amount,
              status, created_at
       FROM tasks
       WHERE id = :taskId AND status = 'open'
       LIMIT 1`,
      { taskId }
    );

    if (!task) {
      return res.status(404).json({ success: false, message: '任务不存在或已关闭' });
    }

    return res.json({ success: true, data: task });
  } catch (error) {
    return next(error);
  }
}

export async function acceptTask(req, res, next) {
  try {
    const taskId = Number(req.params.id);

    const result = await transaction(async (connection) => {
      const [tasks] = await connection.execute(
        `SELECT * FROM tasks WHERE id = :taskId AND status = 'open' FOR UPDATE`,
        { taskId }
      );
      const task = tasks[0];

      if (!task) {
        const error = new Error('任务不存在或已关闭');
        error.statusCode = 404;
        throw error;
      }

      if (task.deadline && new Date(task.deadline).getTime() < Date.now()) {
        const error = new Error('任务已超过接单时间');
        error.statusCode = 400;
        throw error;
      }

      if (Number(task.current_accept_count) >= Number(task.max_accept_count)) {
        const error = new Error('任务接单名额已满');
        error.statusCode = 400;
        throw error;
      }

      if (task.vip_only) {
        const [users] = await connection.execute(
          'SELECT vip_level_id, vip_expire_at, status FROM users WHERE id = :userId LIMIT 1',
          { userId: req.user.id }
        );
        const user = users[0];
        const vipExpired = user?.vip_expire_at && new Date(user.vip_expire_at).getTime() < Date.now();

        if (!user || user.status !== 'normal' || !user.vip_level_id || vipExpired) {
          const error = new Error('该任务仅限VIP用户接取');
          error.statusCode = 403;
          throw error;
        }
      }

      const [existsRows] = await connection.execute(
        `SELECT id FROM task_accepts
         WHERE task_id = :taskId AND user_id = :userId AND status NOT IN ('cancelled', 'rejected', 'timeout')
         LIMIT 1`,
        { taskId, userId: req.user.id }
      );

      if (existsRows[0]) {
        const error = new Error('你已接取过该任务');
        error.statusCode = 409;
        throw error;
      }

      let depositStatus = 'none';
      const depositAmount = Number(task.deposit_amount || 0);
      const depositType = task.deposit_required ? task.deposit_type : 'none';

      if (task.deposit_required && depositType === 'balance' && depositAmount > 0) {
        const [walletRows] = await connection.execute(
          'SELECT available_balance FROM user_wallets WHERE user_id = :userId FOR UPDATE',
          { userId: req.user.id }
        );
        const wallet = walletRows[0];

        if (!wallet || Number(wallet.available_balance) < depositAmount) {
          const error = new Error('余额不足，无法冻结任务押金');
          error.statusCode = 400;
          throw error;
        }

        await connection.execute(
          `UPDATE user_wallets
           SET available_balance = available_balance - :amount,
               deposit_frozen_balance = deposit_frozen_balance + :amount
           WHERE user_id = :userId`,
          { amount: depositAmount, userId: req.user.id }
        );
        depositStatus = 'frozen';
      }

      if (task.deposit_required && depositType === 'points' && depositAmount > 0) {
        const pointsAmount = Math.ceil(depositAmount);
        const [pointRows] = await connection.execute(
          'SELECT points_balance FROM points_accounts WHERE user_id = :userId FOR UPDATE',
          { userId: req.user.id }
        );
        const points = pointRows[0];

        if (!points || Number(points.points_balance) < pointsAmount) {
          const error = new Error('积分不足，无法冻结任务押金');
          error.statusCode = 400;
          throw error;
        }

        await connection.execute(
          `UPDATE points_accounts
           SET points_balance = points_balance - :pointsAmount,
               frozen_points = frozen_points + :pointsAmount
           WHERE user_id = :userId`,
          { pointsAmount, userId: req.user.id }
        );
        depositStatus = 'frozen';
      }

      const [acceptResult] = await connection.execute(
        `INSERT INTO task_accepts (task_id, user_id, status, deadline, deposit_type, deposit_amount, deposit_status)
         VALUES (:taskId, :userId, 'accepted', :deadline, :depositType, :depositAmount, :depositStatus)`,
        {
          taskId,
          userId: req.user.id,
          deadline: task.deadline,
          depositType,
          depositAmount,
          depositStatus
        }
      );

      if (depositStatus === 'frozen') {
        await connection.execute(
          `INSERT INTO task_deposit_logs (task_id, task_accept_id, user_id, deposit_type, amount, action, reason)
           VALUES (:taskId, :taskAcceptId, :userId, :depositType, :amount, 'freeze', '接任务冻结押金')`,
          { taskId, taskAcceptId: acceptResult.insertId, userId: req.user.id, depositType, amount: depositAmount }
        );
      }

      await connection.execute(
        'UPDATE tasks SET current_accept_count = current_accept_count + 1 WHERE id = :taskId',
        { taskId }
      );

      return {
        id: acceptResult.insertId,
        task_id: taskId,
        status: 'accepted',
        deposit_status: depositStatus
      };
    });

    return res.status(201).json({ success: true, message: '接任务成功', data: result });
  } catch (error) {
    return next(error);
  }
}

export async function getMyTaskAccepts(req, res, next) {
  try {
    const rows = await query(
      `SELECT ta.id, ta.task_id, ta.status, ta.accepted_at, ta.submitted_at, ta.deadline,
              ta.deposit_type, ta.deposit_amount, ta.deposit_status,
              t.title, t.reward_amount, t.reward_points
       FROM task_accepts ta
       LEFT JOIN tasks t ON t.id = ta.task_id
       WHERE ta.user_id = :userId
       ORDER BY ta.id DESC
       LIMIT 50`,
      { userId: req.user.id }
    );

    return res.json({ success: true, data: rows });
  } catch (error) {
    return next(error);
  }
}
