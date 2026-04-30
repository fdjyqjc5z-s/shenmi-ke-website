import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { dbPool } from '../src/config/db.js';
import { securityConfig } from '../src/config/security.js';

const username = process.env.ADMIN_USERNAME || 'admin';
const password = process.env.ADMIN_PASSWORD;
const role = process.env.ADMIN_ROLE || 'super_admin';

if (!password || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
  console.error('请设置 ADMIN_PASSWORD，要求至少8位且包含字母和数字。');
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, securityConfig.password.bcryptSaltRounds);

await dbPool.execute(
  `INSERT INTO admin_users (username, password_hash, role, status)
   VALUES (:username, :passwordHash, :role, 'normal')
   ON DUPLICATE KEY UPDATE
     password_hash = VALUES(password_hash),
     role = VALUES(role),
     status = 'normal'`,
  { username, passwordHash, role }
);

console.log(`后台管理员已初始化：${username}`);
await dbPool.end();
