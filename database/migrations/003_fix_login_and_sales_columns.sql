USE shenmi_ke;

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(64) AFTER status,
  ADD COLUMN IF NOT EXISTS last_login_at DATETIME AFTER last_login_ip;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sales_count INT DEFAULT 0 AFTER stock;

CREATE INDEX idx_admin_users_status ON admin_users(status);
