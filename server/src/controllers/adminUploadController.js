import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { randomUUID } from 'crypto';

function resolveUploadRoot() {
  const configuredDir = process.env.UPLOAD_DIR || 'uploads';
  return path.isAbsolute(configuredDir)
    ? configuredDir
    : path.resolve(process.cwd(), configuredDir);
}

const uploadRoot = resolveUploadRoot();
const productImageDir = path.join(uploadRoot, 'products');

fs.mkdirSync(productImageDir, { recursive: true });

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]);

const extensionByMimeType = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, productImageDir);
  },
  filename(req, file, cb) {
    const ext = extensionByMimeType[file.mimetype] || path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  }
});

const rawUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter(req, file, cb) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(new Error('只允许上传 jpg、png、webp、gif 图片'));
    }
    return cb(null, true);
  }
}).single('image');

export function uploadImageMiddleware(req, res, next) {
  rawUpload(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message || '图片上传失败'
      });
    }
    return next();
  });
}

export function handleImageUpload(req, res) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: '请选择图片'
    });
  }

  const publicPath = (process.env.UPLOAD_PUBLIC_PATH || '/uploads').replace(/\/$/, '');
  const url = `${publicPath}/products/${req.file.filename}`;

  return res.json({
    success: true,
    message: '图片上传成功',
    data: {
      url,
      filename: req.file.filename,
      size: req.file.size
    }
  });
}
