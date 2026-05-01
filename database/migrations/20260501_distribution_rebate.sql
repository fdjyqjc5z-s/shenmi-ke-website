-- Distribution rebate feature
USE shenmi_ke;

CREATE TABLE IF NOT EXISTS distribution_settings (
  id BIGINT PRIMARY KEY DEFAULT 1,
  platform_code VARCHAR(32) DEFAULT '',
  default_buyer_rebate_type ENUM('fixed','percent') DEFAULT 'fixed',
  default_buyer_rebate_value DECIMAL(10,2) DEFAULT 0.00,
  default_owner_rebate_type ENUM('fixed','percent') DEFAULT 'fixed',
  default_owner_rebate_value DECIMAL(10,2) DEFAULT 0.00,
  status ENUM('enabled','disabled') DEFAULT 'disabled',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO distribution_settings
  (id, platform_code, default_buyer_rebate_type, default_buyer_rebate_value, default_owner_rebate_type, default_owner_rebate_value, status)
VALUES
  (1, '', 'fixed', 0.00, 'fixed', 0.00, 'disabled')
ON DUPLICATE KEY UPDATE id = id;

CREATE TABLE IF NOT EXISTS distribution_user_rules (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  buyer_user_id BIGINT NOT NULL UNIQUE,
  owner_user_id BIGINT NOT NULL,
  buyer_rebate_type ENUM('fixed','percent') DEFAULT 'fixed',
  buyer_rebate_value DECIMAL(10,2) DEFAULT 0.00,
  owner_rebate_type ENUM('fixed','percent') DEFAULT 'fixed',
  owner_rebate_value DECIMAL(10,2) DEFAULT 0.00,
  status ENUM('enabled','disabled') DEFAULT 'enabled',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS distribution_reward_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL,
  order_no VARCHAR(64) NOT NULL,
  buyer_user_id BIGINT NOT NULL,
  receiver_user_id BIGINT NOT NULL,
  owner_user_id BIGINT NOT NULL,
  reward_type ENUM('buyer_rebate','owner_rebate') NOT NULL,
  reward_rule_type ENUM('fixed','percent') DEFAULT 'fixed',
  reward_rule_value DECIMAL(10,2) DEFAULT 0.00,
  reward_amount DECIMAL(10,2) DEFAULT 0.00,
  status ENUM('pending','paid','cancelled') DEFAULT 'paid',
  admin_id BIGINT,
  paid_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_distribution_order_receiver_type (order_id, receiver_user_id, reward_type),
  INDEX idx_distribution_buyer (buyer_user_id),
  INDEX idx_distribution_receiver (receiver_user_id),
  INDEX idx_distribution_owner (owner_user_id)
);
