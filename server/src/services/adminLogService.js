export async function writeAdminLog(connectionOrDb, payload) {
  const {
    adminId = null,
    action,
    targetType = null,
    targetId = null,
    description = '',
    ip = null
  } = payload;

  if (!action) return;

  await connectionOrDb.execute(
    `INSERT INTO admin_operation_logs (admin_id, action, target_type, target_id, description, ip)
     VALUES (:adminId, :action, :targetType, :targetId, :description, :ip)`,
    { adminId, action, targetType, targetId, description, ip }
  );
}
