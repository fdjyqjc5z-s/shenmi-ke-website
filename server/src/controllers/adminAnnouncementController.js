import { query } from '../config/db.js';
import { sanitizeString } from '../utils/validators.js';

function normalizeAnnouncementPayload(body) {
  return {
    title: sanitizeString(body.title || '', 128),
    content: sanitizeString(body.content || '', 2000),
    status: ['draft', 'published', 'hidden'].includes(body.status) ? body.status : 'draft'
  };
}

export async function adminListAnnouncements(req, res, next) {
  try {
    const keyword = sanitizeString(req.query.keyword || '', 64);
    const status = ['draft', 'published', 'hidden'].includes(req.query.status) ? req.query.status : '';
    const page = Math.max(Number(req.query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize || 20), 1), 100);
    const offset = (page - 1) * pageSize;

    const conditions = [];
    const params = { pageSize, offset };

    if (keyword) {
      conditions.push('(title LIKE :keyword OR content LIKE :keyword)');
      params.keyword = `%${keyword}%`;
    }

    if (status) {
      conditions.push('status = :status');
      params.status = status;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await query(
      `SELECT id, title, content, status, created_at, updated_at
       FROM announcements
       ${where}
       ORDER BY id DESC
       LIMIT :pageSize OFFSET :offset`,
      params
    );

    const totalRows = await query(`SELECT COUNT(*) AS total FROM announcements ${where}`, params);
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

export async function adminCreateAnnouncement(req, res, next) {
  try {
    const data = normalizeAnnouncementPayload(req.body);

    if (!data.title) return res.status(400).json({ success: false, message: '公告标题不能为空' });
    if (!data.content) return res.status(400).json({ success: false, message: '公告内容不能为空' });

    const result = await query(
      `INSERT INTO announcements (title, content, status)
       VALUES (:title, :content, :status)`,
      data
    );

    return res.status(201).json({ success: true, message: '公告已创建', data: { id: result.insertId } });
  } catch (error) {
    return next(error);
  }
}

export async function adminUpdateAnnouncement(req, res, next) {
  try {
    const announcementId = Number(req.params.id);
    const data = normalizeAnnouncementPayload(req.body);

    if (!data.title) return res.status(400).json({ success: false, message: '公告标题不能为空' });
    if (!data.content) return res.status(400).json({ success: false, message: '公告内容不能为空' });

    await query(
      `UPDATE announcements
       SET title = :title,
           content = :content,
           status = :status
       WHERE id = :announcementId`,
      { announcementId, ...data }
    );

    return res.json({ success: true, message: '公告已更新' });
  } catch (error) {
    return next(error);
  }
}

export async function adminUpdateAnnouncementStatus(req, res, next) {
  try {
    const announcementId = Number(req.params.id);
    const status = ['draft', 'published', 'hidden'].includes(req.body.status) ? req.body.status : 'draft';

    await query('UPDATE announcements SET status = :status WHERE id = :announcementId', { status, announcementId });

    return res.json({ success: true, message: '公告状态已更新' });
  } catch (error) {
    return next(error);
  }
}

export async function adminDeleteAnnouncement(req, res, next) {
  try {
    const announcementId = Number(req.params.id);
    await query('DELETE FROM announcements WHERE id = :announcementId', { announcementId });
    return res.json({ success: true, message: '公告已删除' });
  } catch (error) {
    return next(error);
  }
}
