USE shenmi_ke;

CREATE TABLE IF NOT EXISTS product_categories (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  value VARCHAR(64) NOT NULL UNIQUE,
  label VARCHAR(64) NOT NULL,
  sort_order INT DEFAULT 0,
  status ENUM('enabled','disabled') DEFAULT 'enabled',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_product_categories_status_sort (status, sort_order)
);

SET @has_category_col := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'products'
    AND COLUMN_NAME = 'category'
);

SET @alter_products_category_sql := IF(
  @has_category_col = 0,
  'ALTER TABLE products ADD COLUMN category VARCHAR(64) NOT NULL DEFAULT ''general'' AFTER name',
  'SELECT 1'
);
PREPARE stmt FROM @alter_products_category_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE INDEX idx_products_category ON products(category);

INSERT INTO product_categories (value, label, sort_order, status) VALUES
('general', '综合商品', 100, 'enabled'),
('digital', '数码电子', 90, 'enabled'),
('daily', '日用百货', 80, 'enabled'),
('fashion', '服饰配件', 70, 'enabled'),
('beauty', '美妆个护', 60, 'enabled'),
('virtual', '虚拟权益', 50, 'enabled'),
('points', '积分兑换', 40, 'enabled')
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  sort_order = VALUES(sort_order),
  status = VALUES(status);
