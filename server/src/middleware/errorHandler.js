export function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    message: '接口不存在'
  });
}

export function errorHandler(err, req, res, next) {
  console.error('[SERVER_ERROR]', {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    path: req.originalUrl,
    method: req.method
  });

  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? '服务器异常，请稍后再试' : err.message
  });
}
