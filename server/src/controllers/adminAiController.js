import { query, transaction } from '../config/db.js';
import { sanitizeString } from '../utils/validators.js';
import { writeAdminLog } from '../services/adminLogService.js';

function buildPlaceholderOutput(draftType, inputText) {
  const cleanInput = inputText || '未填写详细信息';

  if (draftType === 'product') {
    return `【商品文案草稿】\n标题：神秘客精选好物\n卖点：\n1. 平台精选，上架前人工确认。\n2. 适合神秘客用户积分、VIP、普通购买场景。\n3. 可根据实际商品补充材质、规格、发货说明。\n原始信息：${cleanInput}`;
  }

  if (draftType === 'task') {
    return `【任务文案草稿】\n任务标题：神秘客限时任务\n任务要求：按后台设置完成指定动作，并在期限内上传进度。\n验收标准：提交内容清晰、真实、可审核。\n注意事项：超时或恶意提交可能影响押金退还。\n原始信息：${cleanInput}`;
  }

  return `【客服回复草稿】\n您好，您的问题我们已经收到。请您补充订单号、任务编号或用户编码，后台会尽快核实处理。\n原始消息：${cleanInput}`;
}

export async function adminCreateAiDraft(req, res, next) {
  try {
    const draftType = ['product', 'task', 'reply'].includes(req.body.draftType) ? req.body.draftType : 'reply';
    const inputText = sanitizeString(req.body.inputText || '', 2000);
    const outputText = buildPlaceholderOutput(draftType, inputText);

    const result = await transaction(async (connection) => {
      const [insertResult] = await connection.execute(
        `INSERT INTO ai_drafts (admin_id, draft_type, input_text, output_text, status)
         VALUES (:adminId, :draftType, :inputText, :outputText, 'draft')`,
        { adminId: req.user.id, draftType, inputText, outputText }
      );

      await writeAdminLog(connection, {
        adminId: req.user.id,
        action: 'ai_draft_create',
        targetType: 'ai_draft',
        targetId: insertResult.insertId,
        description: `创建AI占位草稿：${draftType}`,
        ip: req.ip
      });

      return { id: insertResult.insertId, draft_type: draftType, input_text: inputText, output_text: outputText, status: 'draft' };
    });

    return res.status(201).json({ success: true, message: '草稿已生成', data: result });
  } catch (error) {
    return next(error);
  }
}

export async function adminListAiDrafts(req, res, next) {
  try {
    const draftType = ['product', 'task', 'reply'].includes(req.query.draftType) ? req.query.draftType : '';
    const status = ['draft', 'used', 'discarded'].includes(req.query.status) ? req.query.status : '';
    const page = Math.max(Number(req.query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize || 20), 1), 100);
    const offset = (page - 1) * pageSize;

    const conditions = [];
    const params = { pageSize, offset };

    if (draftType) {
      conditions.push('draft_type = :draftType');
      params.draftType = draftType;
    }

    if (status) {
      conditions.push('status = :status');
      params.status = status;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await query(
      `SELECT id, admin_id, draft_type, input_text, output_text, status, created_at, updated_at
       FROM ai_drafts
       ${where}
       ORDER BY id DESC
       LIMIT :pageSize OFFSET :offset`,
      params
    );

    const totalRows = await query(`SELECT COUNT(*) AS total FROM ai_drafts ${where}`, params);
    const total = totalRows[0]?.total || 0;

    return res.json({ success: true, data: { list: rows, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } } });
  } catch (error) {
    return next(error);
  }
}

export async function adminUpdateAiDraftStatus(req, res, next) {
  try {
    const draftId = Number(req.params.id);
    const status = ['draft', 'used', 'discarded'].includes(req.body.status) ? req.body.status : '';

    if (!status) {
      return res.status(400).json({ success: false, message: '草稿状态不合法' });
    }

    const result = await transaction(async (connection) => {
      await connection.execute('UPDATE ai_drafts SET status = :status WHERE id = :draftId', { status, draftId });

      await writeAdminLog(connection, {
        adminId: req.user.id,
        action: 'ai_draft_status_update',
        targetType: 'ai_draft',
        targetId: draftId,
        description: `更新AI占位草稿状态：${status}`,
        ip: req.ip
      });

      return { id: draftId, status };
    });

    return res.json({ success: true, message: '草稿状态已更新', data: result });
  } catch (error) {
    return next(error);
  }
}
