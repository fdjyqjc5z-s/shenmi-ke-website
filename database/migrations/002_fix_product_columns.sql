USE shenmi_ke;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS required_points INT DEFAULT 0 AFTER vip_only,
  ADD COLUMN IF NOT EXISTS required_invites INT DEFAULT 0 AFTER required_points;

CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_type ON products(vip_only, is_points_product);
