-- ========================================
-- Populate company_profile_schema with validation rules
-- Run after creating company_profile_schema table
-- ========================================

-- Optional: clear existing rules
DELETE FROM "b2b_dev".company_profile_schema;

-- ========================================
-- BASIC INFORMATION SECTION
-- ========================================

INSERT INTO "b2b_dev".company_profile_schema (section, field_name, field_type, required, rules, display_order) VALUES
('basic_information', 'companyName', 'text', true,
 '{"type": "text", "required": true, "min_length": 3, "max_length": 100, "pattern": "^[A-Za-z0-9&\\-\\.\\s]+$", "trim": true, "unique": true, "immutable": true, "message": "Company name must be 3-100 characters and may only include letters, numbers, spaces, &, -, ."}'::jsonb,
 1),
('basic_information', 'company_type', 'enum', true,
 '{"type": "enum", "required": true, "values": ["Private", "Public", "Partnership", "Sole Proprietorship", "Non-Profit", "Other"], "message": "Company type must be selected from the provided options"}'::jsonb,
 2),
('basic_information', 'industry', 'text', true,
 '{"type": "text", "required": true, "min_length": 2, "max_length": 100, "message": "Industry is required"}'::jsonb,
 3),
('basic_information', 'tagline', 'text', false,
 '{"type": "text", "required": false, "max_length": 150, "message": "Tagline cannot exceed 150 characters"}'::jsonb,
 4),
('basic_information', 'company_size', 'number', true,
 '{"type": "number", "required": true, "min": 1, "max": 100, "message": "Company size must be between 1 and 100"}'::jsonb,
 5),
('basic_information', 'headquater_location', 'text', true,
 '{"type": "text", "required": true, "min_length": 5, "max_length": 500, "message": "Headquarter location must be between 5 and 500 characters"}'::jsonb,
 6),
('basic_information', 'location', 'text', false,
 '{"type": "text", "required": false, "min_length": 2, "max_length": 500, "message": "Location must be between 2 and 500 characters when provided"}'::jsonb,
 7),
('basic_information', 'company_website', 'url', false,
 '{"type": "url", "required": false, "must_have_protocol": true, "message": "Website must be a valid URL starting with http:// or https://"}'::jsonb,
 8);

-- ========================================
-- MEDIA SECTION
-- ========================================

INSERT INTO "b2b_dev".company_profile_schema (section, field_name, field_type, required, rules, display_order) VALUES
('media', 'company_logo', 'json', true,
 '{"type": "json", "required": true, "required_keys": ["fileId", "fileUrl", "fileName", "uploadedAt"], "max_size_mb": 2, "allowed_extensions": ["png", "jpg", "jpeg", "svg"], "min_dimensions": {"width": 200, "height": 200}, "message": "Company logo must be an image (PNG/JPG/SVG) under 2MB with minimum 200x200 dimensions"}'::jsonb,
 20);

-- ========================================
-- CONTACT INFORMATION SECTION
-- ========================================

INSERT INTO "b2b_dev".company_profile_schema (section, field_name, field_type, required, rules, display_order) VALUES
('contact_information', 'primary_email', 'email', true,
 '{"type": "email", "required": true, "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", "message": "Primary email must be a valid email address"}'::jsonb,
 40),
('contact_information', 'additional_email', 'array', false,
 '{"type": "array", "required": false, "item_type": "email", "max_items": 10, "message": "Additional emails must be valid email addresses (max 10)"}'::jsonb,
 41),
('contact_information', 'phone_number', 'phone', true,
 '{"type": "phone", "required": true, "message": "Primary phone number must be in international E.164 format"}'::jsonb,
 42),
('contact_information', 'additional_phone_numbers', 'array', false,
 '{"type": "array", "required": false, "item_type": "phone", "max_items": 10, "message": "Additional phone numbers must be valid phone numbers (max 10)"}'::jsonb,
 43);

-- ========================================
-- PRIVACY SETTINGS SECTION
-- ========================================

INSERT INTO "b2b_dev".company_profile_schema (section, field_name, field_type, required, rules, display_order) VALUES
('privacy_settings', 'profile_visibility', 'enum', true,
 '{"type": "enum", "required": true, "values": ["public", "registered_users", "private", "unlisted"], "default": "public", "message": "Profile visibility must be one of: public, registered_users, private, unlisted"}'::jsonb,
 60),
('privacy_settings', 'contact_visibility', 'enum', true,
 '{"type": "enum", "required": true, "values": ["public", "connections", "private"], "default": "public", "message": "Contact visibility must be one of: public, connections, private"}'::jsonb,
 61);

-- ========================================
-- INDEXES & SUMMARY
-- ========================================

CREATE INDEX IF NOT EXISTS idx_company_profile_schema_section
    ON "b2b_dev".company_profile_schema(section);

-- Summary output
SELECT 
    section,
    COUNT(*) AS total_fields,
    SUM(CASE WHEN required THEN 1 ELSE 0 END) AS required_fields
FROM "b2b_dev".company_profile_schema
GROUP BY section
ORDER BY section;
