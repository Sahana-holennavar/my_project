-- ========================================
-- Insert Company Roles
-- ========================================

INSERT INTO "b2b_dev".roles (name, description, created_at, updated_at)
VALUES 
  ('company_admin', 'Company Administrator Role', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('editor', 'Editor Role', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

