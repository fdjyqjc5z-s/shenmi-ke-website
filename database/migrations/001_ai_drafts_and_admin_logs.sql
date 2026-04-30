USE shenmi_ke;

CREATE TABLE IF NOT EXISTS ai_drafts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  admin_id BIGINT NOT NULL,
  draft_type ENUM('product','task','reply') NOT NULL,
  input_text TEXT,
  output_text TEXT,
  status ENUM('draft','used','discarded') DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_operation_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  admin_id BIGINT,
  action VARCHAR(64) NOT NULL,
  target_type VARCHAR(64),
  target_id BIGINT,
  description VARCHAR(255),
  ip VARCHAR(64),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_drafts_admin ON ai_drafts(admin_id);
CREATE INDEX idx_admin_logs_admin ON admin_operation_logs(admin_id);
CREATE INDEX idx_admin_logs_action ON admin_operation_logs(action);
