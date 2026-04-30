import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { nanoid } from 'nanoid';
import { securityConfig } from '../config/security.js';

const uploadDir = process.env.UPLOAD_DIR || 'uploads';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${nanoid(10)}${ext}`);
  }
});

function fileFilter(req, file, cb) {
  const allowed = securityConfig.upload.allowedFileMimeTypes;
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error('不支持的文件类型'));
  }
  return cb(null, true);
}

export const secureUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: securityConfig.upload.maxFileSize,
    files: 6
  }
});
