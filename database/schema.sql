-- 神秘客平台 MVP 1.0 数据库结构
CREATE DATABASE IF NOT EXISTS shenmi_ke DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE shenmi_ke;

CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_code VARCHAR(32) NOT NULL UNIQUE,
  username VARCHAR(64) NOT NULL UNIQUE,
  phone VARCHAR(32) UNIQUE,
  email VARCHAR(128) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(64),
  avatar VARCHAR(255),
  invite_code VARCHAR(32) NOT NULL UNIQUE,
  invited_by_user_id BIGINT,
  vip_level_id BIGINT,
  vip_expire_at DATETIME,
  status ENUM('normal','frozen','banned') DEFAULT 'normal',
  withdraw_status ENUM('normal','limited') DEFAULT 'normal',
  register_ip VARCHAR(64),
  last_login_ip VARCHAR(64),
  last_login_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE admin_users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) DEFAULT 'super_admin',
  status ENUM('normal','disabled') DEFAULT 'normal',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE user_wallets (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL UNIQUE,
  available_balance DECIMAL(10,2) DEFAULT 0.00,
  frozen_balance DECIMAL(10,2) DEFAULT 0.00,
  deposit_frozen_balance DECIMAL(10,2) DEFAULT 0.00,
  total_income DECIMAL(10,2) DEFAULT 0.00,
  total_withdraw DECIMAL(10,2) DEFAULT 0.00,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE wallet_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  type VARCHAR(32) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2) DEFAULT 0.00,
  balance_after DECIMAL(10,2) DEFAULT 0.00,
  source_type VARCHAR(32),
  source_id BIGINT,
  description VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE withdraw_orders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  withdraw_no VARCHAR(64) NOT NULL UNIQUE,
  user_id BIGINT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending','approved','rejected','paid') DEFAULT 'pending',
  withdraw_method ENUM('alipay','wechat','manual') DEFAULT 'manual',
  account_name VARCHAR(64),
  account_no VARCHAR(128),
  audit_admin_id BIGINT,
  audit_time DATETIME,
  reject_reason VARCHAR(255),
  paid_time DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE points_accounts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL UNIQUE,
  points_balance INT DEFAULT 0,
  frozen_points INT DEFAULT 0,
  total_earned INT DEFAULT 0,
  total_used INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE points_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  type VARCHAR(32) NOT NULL,
  points INT NOT NULL,
  balance_before INT DEFAULT 0,
  balance_after INT DEFAULT 0,
  source_type VARCHAR(32),
  source_id BIGINT,
  description VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invite_relations (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  inviter_user_id BIGINT NOT NULL,
  invitee_user_id BIGINT NOT NULL,
  invite_code VARCHAR(32) NOT NULL,
  status ENUM('pending','effective','invalid') DEFAULT 'pending',
  effective_type VARCHAR(32),
  effective_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vip_levels (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(64) NOT NULL,
  level INT DEFAULT 1,
  points_bonus_rate DECIMAL(5,2) DEFAULT 1.00,
  invite_bonus_rate DECIMAL(5,2) DEFAULT 1.00,
  description TEXT,
  status ENUM('enabled','disabled') DEFAULT 'enabled',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  admin_id BIGINT,
  name VARCHAR(128) NOT NULL,
  cover_image VARCHAR(255),
  images JSON,
  price DECIMAL(10,2) DEFAULT 0.00,
  points_price INT DEFAULT 0,
  stock INT DEFAULT 0,
  reward_points INT DEFAULT 0,
  vip_only TINYINT DEFAULT 0,
  is_points_product TINYINT DEFAULT 0,
  status ENUM('on','off') DEFAULT 'off',
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_no VARCHAR(64) NOT NULL UNIQUE,
  user_id BIGINT NOT NULL,
  total_amount DECIMAL(10,2) DEFAULT 0.00,
  points_used INT DEFAULT 0,
  points_reward INT DEFAULT 0,
  status ENUM('pending','paid','shipped','completed','cancelled') DEFAULT 'pending',
  pay_status ENUM('unpaid','paid','refunded') DEFAULT 'unpaid',
  receiver_name VARCHAR(64),
  receiver_phone VARCHAR(32),
  receiver_address VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  product_name VARCHAR(128),
  product_image VARCHAR(255),
  price DECIMAL(10,2) DEFAULT 0.00,
  quantity INT DEFAULT 1,
  subtotal DECIMAL(10,2) DEFAULT 0.00,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  admin_id BIGINT,
  title VARCHAR(128) NOT NULL,
  content TEXT,
  reward_amount DECIMAL(10,2) DEFAULT 0.00,
  reward_points INT DEFAULT 0,
  deadline DATETIME,
  max_accept_count INT DEFAULT 1,
  current_accept_count INT DEFAULT 0,
  vip_only TINYINT DEFAULT 0,
  deposit_required TINYINT DEFAULT 0,
  deposit_type ENUM('none','points','balance') DEFAULT 'none',
  deposit_amount DECIMAL(10,2) DEFAULT 0.00,
  status ENUM('pending','open','closed','cancelled') DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE task_accepts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  task_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  status ENUM('accepted','in_progress','submitted','approved','rejected','timeout','cancelled') DEFAULT 'accepted',
  accepted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  submitted_at DATETIME,
  approved_at DATETIME,
  deadline DATETIME,
  deposit_type ENUM('none','points','balance') DEFAULT 'none',
  deposit_amount DECIMAL(10,2) DEFAULT 0.00,
  deposit_status ENUM('none','frozen','refunded','partial_deducted','deducted','dispute') DEFAULT 'none',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE task_progress (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  task_accept_id BIGINT NOT NULL,
  task_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  progress_percent INT DEFAULT 0,
  content TEXT,
  images JSON,
  files JSON,
  status ENUM('submitted','approved','rejected') DEFAULT 'submitted',
  review_comment VARCHAR(255),
  review_admin_id BIGINT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE task_deposit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  task_id BIGINT NOT NULL,
  task_accept_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  deposit_type ENUM('points','balance') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  action ENUM('freeze','refund','deduct','partial_deduct') NOT NULL,
  status ENUM('success','failed') DEFAULT 'success',
  reason VARCHAR(255),
  admin_id BIGINT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_messages (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  from_user_id BIGINT NOT NULL,
  to_user_id BIGINT,
  task_id BIGINT,
  content TEXT,
  message_type ENUM('text','image','file') DEFAULT 'text',
  is_read TINYINT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE banners (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(128),
  image_url VARCHAR(255) NOT NULL,
  link_url VARCHAR(255),
  sort_order INT DEFAULT 0,
  status ENUM('enabled','disabled') DEFAULT 'enabled',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE announcements (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(128) NOT NULL,
  content TEXT,
  status ENUM('draft','published','hidden') DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE risk_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT,
  risk_type VARCHAR(64),
  description VARCHAR(255),
  ip VARCHAR(64),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_invited_by ON users(invited_by_user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_task_accepts_user ON task_accepts(user_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_wallet_logs_user ON wallet_logs(user_id);
CREATE INDEX idx_points_logs_user ON points_logs(user_id);
