-- Admin feature upgrade: product category, task amount category, announcements
USE shenmi_ke;

CREATE TABLE IF NOT EXISTS announcements (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(128) NOT NULL,
  content TEXT,
  status ENUM('draft','published','hidden') DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

SET @products_category_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'products'
    AND COLUMN_NAME = 'category'
);
SET @products_category_sql := IF(
  @products_category_exists = 0,
  'ALTER TABLE products ADD COLUMN category VARCHAR(64) DEFAULT ''general'' AFTER name',
  'SELECT 1'
);
PREPARE products_category_stmt FROM @products_category_sql;
EXECUTE products_category_stmt;
DEALLOCATE PREPARE products_category_stmt;

SET @tasks_amount_category_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tasks'
    AND COLUMN_NAME = 'amount_category'
);
SET @tasks_amount_category_sql := IF(
  @tasks_amount_category_exists = 0,
  'ALTER TABLE tasks ADD COLUMN amount_category VARCHAR(32) DEFAULT ''micro'' AFTER content',
  'SELECT 1'
);
PREPARE tasks_amount_category_stmt FROM @tasks_amount_category_sql;
EXECUTE tasks_amount_category_stmt;
DEALLOCATE PREPARE tasks_amount_category_stmt;

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_tasks_amount_category ON tasks(amount_category);
