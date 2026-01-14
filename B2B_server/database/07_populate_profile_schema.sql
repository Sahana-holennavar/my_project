-- ========================================
-- Populate Profile Schema with Validation Rules
-- This script inserts all validation rules for student and professional profiles
-- Run this after creating the profile_schema table
-- ========================================

-- Clear existing data (optional - comment out if you want to preserve existing rules)
DELETE FROM "b2b_dev".profile_schema;

-- Reset display order counter starts at 1
-- ========================================
-- STUDENT ROLE - PERSONAL INFORMATION
-- ========================================

INSERT INTO "b2b_dev".profile_schema (role, field_name, field_type, required, rules, display_order) VALUES
('student', 'personal_information.first_name', 'text', true, '{"type": "text", "required": true, "min_length": 2, "max_length": 50, "pattern": "^[a-zA-Z\\s\\-'']+$", "message": "First name must be 2-50 characters with only alphabets, spaces, hyphens, and apostrophes"}'::jsonb, 1),
('student', 'personal_information.last_name', 'text', true, '{"type": "text", "required": true, "min_length": 2, "max_length": 50, "pattern": "^[a-zA-Z\\s\\-'']+$", "message": "Last name must be 2-50 characters with only alphabets, spaces, hyphens, and apostrophes"}'::jsonb, 2),
('student', 'personal_information.email', 'email', true, '{"type": "email", "required": true, "max_length": 254, "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", "unique": true, "immutable": true, "message": "Email must be valid RFC 5322 format and unique"}'::jsonb, 3),
('student', 'personal_information.phone_number', 'text', false, '{"type": "text", "required": false, "pattern": "^\\+?[1-9]\\d{1,14}$", "message": "Phone number must be in international format"}'::jsonb, 4),
('student', 'personal_information.date_of_birth', 'date', true, '{"type": "date", "required": true, "format": "YYYY-MM-DD", "min_age": 12, "max_age": 125, "no_future": true, "message": "Date of birth must be between 12-125 years old and not in the future"}'::jsonb, 5),
('student', 'personal_information.gender', 'text', false, '{"type": "enum", "required": false, "values": ["Male", "Female", "Other", "Prefer not to say"], "message": "Gender must be one of the predefined options"}'::jsonb, 6),
('student', 'personal_information.country', 'text', true, '{"type": "text", "required": true, "message": "Country must be a valid ISO 3166-1 country code"}'::jsonb, 7),
('student', 'personal_information.state_province', 'text', true, '{"type": "text", "required": true, "min_length": 2, "max_length": 100, "pattern": "^[a-zA-Z\\s\\-]+$", "message": "State/Province must be 2-100 characters with only alphabets, spaces, and hyphens"}'::jsonb, 8),
('student', 'personal_information.city', 'text', true, '{"type": "text", "required": true, "min_length": 2, "max_length": 100, "pattern": "^[a-zA-Z\\s\\-]+$", "message": "City must be 2-100 characters with only alphabets, spaces, and hyphens"}'::jsonb, 9),
('student', 'personal_information.postal_code', 'text', false, '{"type": "text", "required": false, "min_length": 3, "max_length": 10, "message": "Postal code must be 3-10 characters"}'::jsonb, 10);

-- ========================================
-- STUDENT ROLE - ABOUT
-- ========================================

INSERT INTO "b2b_dev".profile_schema (role, field_name, field_type, required, rules, display_order) VALUES
('student', 'about.professional_summary', 'text', false, '{"type": "rich_text", "required": false, "min_length": 50, "max_length": 2000, "allow_html": true, "message": "Professional summary must be 50-2000 characters"}'::jsonb, 11),
('student', 'about.industry', 'text', false, '{"type": "enum", "required": false, "values": ["Technology", "Healthcare", "Finance", "Education", "Other"], "message": "Industry must be from predefined categories"}'::jsonb, 12),
('student', 'about.current_status', 'text', false, '{"type": "enum", "required": false, "values": ["Studying", "Looking for internship", "Looking for job"], "message": "Current status must be appropriate for students"}'::jsonb, 13);

-- ========================================
-- STUDENT ROLE - EDUCATION
-- ========================================

INSERT INTO "b2b_dev".profile_schema (role, field_name, field_type, required, rules, display_order) VALUES
('student', 'education.institution_name', 'text', false, '{"type": "text", "required": false, "min_length": 2, "max_length": 200, "message": "Institution name must be 2-200 characters"}'::jsonb, 14),
('student', 'education.degree_type', 'text', false, '{"type": "enum", "required": false, "values": ["Bachelor''s", "Master''s", "PhD", "Diploma", "Certificate"], "message": "Degree type must be from predefined categories"}'::jsonb, 15),
('student', 'education.field_of_study', 'text', false, '{"type": "text", "required": false, "min_length": 2, "max_length": 100, "message": "Field of study must be 2-100 characters"}'::jsonb, 16),
('student', 'education.start_year', 'number', false, '{"type": "number", "required": false, "min": 1950, "max": "current_year", "message": "Start year must be between 1950 and current year"}'::jsonb, 17),
('student', 'education.end_year', 'number', false, '{"type": "number", "required": false, "min": "start_year", "max": "current_year_plus_10", "message": "End year must be after start year"}'::jsonb, 18),
('student', 'education.gpa_grade', 'number', false, '{"type": "number", "required": false, "min": 0, "max": 4.0, "message": "GPA must be between 0.0 and 4.0"}'::jsonb, 19),
('student', 'education.currently_studying', 'boolean', false, '{"type": "boolean", "required": false, "max_instances": 1, "message": "Only one currently studying entry allowed"}'::jsonb, 20);

-- ========================================
-- STUDENT ROLE - SKILLS
-- ========================================

INSERT INTO "b2b_dev".profile_schema (role, field_name, field_type, required, rules, display_order) VALUES
('student', 'skills.skill_name', 'text', false, '{"type": "text", "required": false, "min_length": 2, "max_length": 50, "max_count": 50, "message": "Skill name must be 2-50 characters, maximum 50 skills allowed"}'::jsonb, 21),
('student', 'skills.proficiency_level', 'text', false, '{"type": "enum", "required": false, "values": ["Beginner", "Intermediate", "Advanced", "Expert"], "message": "Proficiency level must be from predefined options"}'::jsonb, 22),
('student', 'skills.years_of_experience', 'number', false, '{"type": "number", "required": false, "min": 0, "max": 50, "message": "Years of experience must be between 0-50"}'::jsonb, 23);

-- ========================================
-- STUDENT ROLE - PROJECTS
-- ========================================

INSERT INTO "b2b_dev".profile_schema (role, field_name, field_type, required, rules, display_order) VALUES
('student', 'projects.project_title', 'text', false, '{"type": "text", "required": false, "min_length": 5, "max_length": 100, "unique": true, "message": "Project title must be 5-100 characters and unique within profile"}'::jsonb, 24),
('student', 'projects.description', 'text', false, '{"type": "rich_text", "required": false, "min_length": 100, "max_length": 2000, "allow_html": true, "message": "Description must be 100-2000 characters"}'::jsonb, 25),
('student', 'projects.technologies_used', 'array', false, '{"type": "array", "required": false, "max_items": 20, "message": "Maximum 20 technologies allowed per project"}'::jsonb, 26),
('student', 'projects.project_url', 'url', false, '{"type": "url", "required": false, "message": "Project URL must be a valid URL format"}'::jsonb, 27),
('student', 'projects.start_date', 'date', false, '{"type": "date", "required": false, "format": "MM/YYYY", "no_future": true, "message": "Start date must be in MM/YYYY format and not in the future"}'::jsonb, 28),
('student', 'projects.end_date', 'date', false, '{"type": "date", "required": false, "format": "MM/YYYY", "after": "start_date", "message": "End date must be after start date"}'::jsonb, 29),
('student', 'projects.project_type', 'text', false, '{"type": "enum", "required": false, "values": ["Personal", "Academic", "Professional", "Open Source"], "message": "Project type must be from predefined options"}'::jsonb, 30);

-- ========================================
-- STUDENT ROLE - PRIVACY SETTINGS
-- ========================================

INSERT INTO "b2b_dev".profile_schema (role, field_name, field_type, required, rules, display_order) VALUES
('student', 'privacy_settings.profile_visibility', 'text', true, '{"type": "enum", "required": true, "values": ["Public", "Connections Only", "Private"], "default": "Connections Only", "message": "Profile visibility must be from predefined options"}'::jsonb, 31),
('student', 'privacy_settings.contact_visibility', 'text', true, '{"type": "enum", "required": true, "values": ["Public", "Connections Only", "Hidden"], "default": "Connections Only", "message": "Contact visibility must be from predefined options"}'::jsonb, 32),
('student', 'privacy_settings.experience_visibility', 'text', true, '{"type": "enum", "required": true, "values": ["Public", "Connections Only", "Hidden"], "default": "Public", "message": "Experience visibility must be from predefined options"}'::jsonb, 33),
('student', 'privacy_settings.skills_visibility', 'boolean', true, '{"type": "boolean", "required": true, "default": true, "message": "Skills visibility must be boolean"}'::jsonb, 34),
('student', 'privacy_settings.recruiter_contact', 'boolean', true, '{"type": "boolean", "required": true, "default": false, "message": "Recruiter contact must be boolean"}'::jsonb, 35);

-- ========================================
-- PROFESSIONAL ROLE - PERSONAL INFORMATION
-- ========================================

INSERT INTO "b2b_dev".profile_schema (role, field_name, field_type, required, rules, display_order) VALUES
('professional', 'personal_information.first_name', 'text', true, '{"type": "text", "required": true, "min_length": 2, "max_length": 50, "pattern": "^[a-zA-Z\\s\\-'']+$", "message": "First name must be 2-50 characters with only alphabets, spaces, hyphens, and apostrophes"}'::jsonb, 100),
('professional', 'personal_information.last_name', 'text', true, '{"type": "text", "required": true, "min_length": 2, "max_length": 50, "pattern": "^[a-zA-Z\\s\\-'']+$", "message": "Last name must be 2-50 characters with only alphabets, spaces, hyphens, and apostrophes"}'::jsonb, 101),
('professional', 'personal_information.email', 'email', true, '{"type": "email", "required": true, "max_length": 254, "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", "unique": true, "immutable": true, "message": "Email must be valid RFC 5322 format and unique"}'::jsonb, 102),
('professional', 'personal_information.phone_number', 'text', true, '{"type": "text", "required": true, "pattern": "^\\+?[1-9]\\d{1,14}$", "message": "Phone number is required for professionals in international format"}'::jsonb, 103),
('professional', 'personal_information.date_of_birth', 'date', true, '{"type": "date", "required": true, "format": "YYYY-MM-DD", "min_age": 12, "max_age": 125, "no_future": true, "message": "Date of birth must be between 12-125 years old and not in the future"}'::jsonb, 104),
('professional', 'personal_information.gender', 'text', false, '{"type": "enum", "required": false, "values": ["Male", "Female", "Other", "Prefer not to say"], "message": "Gender must be one of the predefined options"}'::jsonb, 105),
('professional', 'personal_information.country', 'text', true, '{"type": "text", "required": true, "message": "Country must be a valid ISO 3166-1 country code"}'::jsonb, 106),
('professional', 'personal_information.state_province', 'text', true, '{"type": "text", "required": true, "min_length": 2, "max_length": 100, "pattern": "^[a-zA-Z\\s\\-]+$", "message": "State/Province must be 2-100 characters with only alphabets, spaces, and hyphens"}'::jsonb, 107),
('professional', 'personal_information.city', 'text', true, '{"type": "text", "required": true, "min_length": 2, "max_length": 100, "pattern": "^[a-zA-Z\\s\\-]+$", "message": "City must be 2-100 characters with only alphabets, spaces, and hyphens"}'::jsonb, 108),
('professional', 'personal_information.postal_code', 'text', false, '{"type": "text", "required": false, "min_length": 3, "max_length": 10, "message": "Postal code must be 3-10 characters"}'::jsonb, 109);

-- ========================================
-- PROFESSIONAL ROLE - ABOUT
-- ========================================

INSERT INTO "b2b_dev".profile_schema (role, field_name, field_type, required, rules, display_order) VALUES
('professional', 'about.professional_summary', 'text', false, '{"type": "rich_text", "required": false, "min_length": 50, "max_length": 2000, "allow_html": true, "message": "Professional summary must be 50-2000 characters"}'::jsonb, 110),
('professional', 'about.industry', 'text', false, '{"type": "enum", "required": false, "values": ["Technology", "Healthcare", "Finance", "Education", "Other"], "message": "Industry must be from predefined categories"}'::jsonb, 111),
('professional', 'about.current_status', 'text', false, '{"type": "enum", "required": false, "values": ["Employed", "Unemployed", "Freelancing", "Consulting"], "message": "Current status must be appropriate for professionals"}'::jsonb, 112);

-- ========================================
-- PROFESSIONAL ROLE - EXPERIENCE
-- ========================================

INSERT INTO "b2b_dev".profile_schema (role, field_name, field_type, required, rules, display_order) VALUES
('professional', 'experience.company_name', 'text', false, '{"type": "text", "required": false, "min_length": 2, "max_length": 100, "pattern": "^[a-zA-Z0-9\\s\\-\\&\\.]+$", "message": "Company name must be 2-100 characters with alphanumeric and common business symbols"}'::jsonb, 113),
('professional', 'experience.job_title', 'text', false, '{"type": "text", "required": false, "min_length": 2, "max_length": 100, "message": "Job title must be 2-100 characters"}'::jsonb, 114),
('professional', 'experience.employment_type', 'text', false, '{"type": "enum", "required": false, "values": ["Full-time", "Part-time", "Contract", "Internship", "Freelance"], "message": "Employment type must be from predefined options"}'::jsonb, 115),
('professional', 'experience.start_date', 'date', false, '{"type": "date", "required": false, "format": "MM/YYYY", "no_future": true, "after_birth_plus_14": true, "message": "Start date must be in MM/YYYY format and after age 14"}'::jsonb, 116),
('professional', 'experience.end_date', 'date', false, '{"type": "date", "required": false, "format": "MM/YYYY", "after": "start_date", "no_future": true, "message": "End date must be after start date and not in the future"}'::jsonb, 117),
('professional', 'experience.job_description', 'text', false, '{"type": "rich_text", "required": false, "min_length": 50, "max_length": 2000, "allow_html": true, "message": "Job description must be 50-2000 characters"}'::jsonb, 118),
('professional', 'experience.currently_working', 'boolean', false, '{"type": "boolean", "required": false, "max_instances": 1, "message": "Only one currently working position allowed"}'::jsonb, 119);

-- ========================================
-- PROFESSIONAL ROLE - EDUCATION
-- ========================================

INSERT INTO "b2b_dev".profile_schema (role, field_name, field_type, required, rules, display_order) VALUES
('professional', 'education.institution_name', 'text', false, '{"type": "text", "required": false, "min_length": 2, "max_length": 200, "message": "Institution name must be 2-200 characters"}'::jsonb, 120),
('professional', 'education.degree_type', 'text', false, '{"type": "enum", "required": false, "values": ["Bachelor''s", "Master''s", "PhD", "Diploma", "Certificate"], "message": "Degree type must be from predefined categories"}'::jsonb, 121),
('professional', 'education.field_of_study', 'text', false, '{"type": "text", "required": false, "min_length": 2, "max_length": 100, "message": "Field of study must be 2-100 characters"}'::jsonb, 122),
('professional', 'education.start_year', 'number', false, '{"type": "number", "required": false, "min": 1950, "max": "current_year", "message": "Start year must be between 1950 and current year"}'::jsonb, 123),
('professional', 'education.end_year', 'number', false, '{"type": "number", "required": false, "min": "start_year", "max": "current_year_plus_10", "message": "End year must be after start year"}'::jsonb, 124),
('professional', 'education.gpa_grade', 'number', false, '{"type": "number", "required": false, "min": 0, "max": 4.0, "message": "GPA must be between 0.0 and 4.0"}'::jsonb, 125),
('professional', 'education.currently_studying', 'boolean', false, '{"type": "boolean", "required": false, "max_instances": 1, "message": "Only one currently studying entry allowed"}'::jsonb, 126);

-- ========================================
-- PROFESSIONAL ROLE - SKILLS
-- ========================================

INSERT INTO "b2b_dev".profile_schema (role, field_name, field_type, required, rules, display_order) VALUES
('professional', 'skills.skill_name', 'text', false, '{"type": "text", "required": false, "min_length": 2, "max_length": 50, "max_count": 50, "message": "Skill name must be 2-50 characters, maximum 50 skills allowed"}'::jsonb, 127),
('professional', 'skills.proficiency_level', 'text', false, '{"type": "enum", "required": false, "values": ["Beginner", "Intermediate", "Advanced", "Expert"], "message": "Proficiency level must be from predefined options"}'::jsonb, 128),
('professional', 'skills.years_of_experience', 'number', false, '{"type": "number", "required": false, "min": 0, "max": 50, "message": "Years of experience must be between 0-50"}'::jsonb, 129);

-- ========================================
-- PROFESSIONAL ROLE - PROJECTS
-- ========================================

INSERT INTO "b2b_dev".profile_schema (role, field_name, field_type, required, rules, display_order) VALUES
('professional', 'projects.project_title', 'text', false, '{"type": "text", "required": false, "min_length": 5, "max_length": 100, "unique": true, "message": "Project title must be 5-100 characters and unique within profile"}'::jsonb, 130),
('professional', 'projects.description', 'text', false, '{"type": "rich_text", "required": false, "min_length": 100, "max_length": 2000, "allow_html": true, "message": "Description must be 100-2000 characters"}'::jsonb, 131),
('professional', 'projects.technologies_used', 'array', false, '{"type": "array", "required": false, "max_items": 20, "message": "Maximum 20 technologies allowed per project"}'::jsonb, 132),
('professional', 'projects.project_url', 'url', false, '{"type": "url", "required": false, "message": "Project URL must be a valid URL format"}'::jsonb, 133),
('professional', 'projects.start_date', 'date', false, '{"type": "date", "required": false, "format": "MM/YYYY", "no_future": true, "message": "Start date must be in MM/YYYY format and not in the future"}'::jsonb, 134),
('professional', 'projects.end_date', 'date', false, '{"type": "date", "required": false, "format": "MM/YYYY", "after": "start_date", "message": "End date must be after start date"}'::jsonb, 135),
('professional', 'projects.project_type', 'text', false, '{"type": "enum", "required": false, "values": ["Personal", "Academic", "Professional", "Open Source"], "message": "Project type must be from predefined options"}'::jsonb, 136);

-- ========================================
-- PROFESSIONAL ROLE - AWARDS
-- ========================================

INSERT INTO "b2b_dev".profile_schema (role, field_name, field_type, required, rules, display_order) VALUES
('professional', 'awards.award_name', 'text', false, '{"type": "text", "required": false, "min_length": 5, "max_length": 100, "message": "Award name must be 5-100 characters"}'::jsonb, 137),
('professional', 'awards.issuing_organization', 'text', false, '{"type": "text", "required": false, "min_length": 2, "max_length": 100, "message": "Issuing organization must be 2-100 characters"}'::jsonb, 138),
('professional', 'awards.date_received', 'date', false, '{"type": "date", "required": false, "format": "MM/YYYY", "no_future": true, "message": "Date received must be in MM/YYYY format and not in the future"}'::jsonb, 139),
('professional', 'awards.description', 'text', false, '{"type": "text", "required": false, "min_length": 50, "max_length": 500, "message": "Description must be 50-500 characters"}'::jsonb, 140),
('professional', 'awards.certificate_url', 'url', false, '{"type": "url", "required": false, "message": "Certificate URL must be a valid URL format"}'::jsonb, 141);

-- ========================================
-- PROFESSIONAL ROLE - CERTIFICATIONS
-- ========================================

INSERT INTO "b2b_dev".profile_schema (role, field_name, field_type, required, rules, display_order) VALUES
('professional', 'certifications.certification_name', 'text', false, '{"type": "text", "required": false, "min_length": 5, "max_length": 100, "message": "Certification name must be 5-100 characters"}'::jsonb, 142),
('professional', 'certifications.issuing_authority', 'text', false, '{"type": "text", "required": false, "min_length": 2, "max_length": 100, "message": "Issuing authority must be 2-100 characters"}'::jsonb, 143),
('professional', 'certifications.license_number', 'text', false, '{"type": "text", "required": false, "unique": true, "message": "License number must be alphanumeric and unique within issuing authority"}'::jsonb, 144),
('professional', 'certifications.issue_date', 'date', false, '{"type": "date", "required": false, "format": "MM/YYYY", "no_future": true, "message": "Issue date must be in MM/YYYY format and not in the future"}'::jsonb, 145),
('professional', 'certifications.expiration_date', 'date', false, '{"type": "date", "required": false, "format": "MM/YYYY", "after": "issue_date", "message": "Expiration date must be after issue date"}'::jsonb, 146),
('professional', 'certifications.verification_url', 'url', false, '{"type": "url", "required": false, "message": "Verification URL must be a valid URL format"}'::jsonb, 147);

-- ========================================
-- PROFESSIONAL ROLE - PRIVACY SETTINGS
-- ========================================

INSERT INTO "b2b_dev".profile_schema (role, field_name, field_type, required, rules, display_order) VALUES
('professional', 'privacy_settings.profile_visibility', 'text', true, '{"type": "enum", "required": true, "values": ["Public", "Connections Only", "Private"], "default": "Connections Only", "message": "Profile visibility must be from predefined options"}'::jsonb, 148),
('professional', 'privacy_settings.contact_visibility', 'text', true, '{"type": "enum", "required": true, "values": ["Public", "Connections Only", "Hidden"], "default": "Connections Only", "message": "Contact visibility must be from predefined options"}'::jsonb, 149),
('professional', 'privacy_settings.experience_visibility', 'text', true, '{"type": "enum", "required": true, "values": ["Public", "Connections Only", "Hidden"], "default": "Public", "message": "Experience visibility must be from predefined options"}'::jsonb, 150),
('professional', 'privacy_settings.skills_visibility', 'boolean', true, '{"type": "boolean", "required": true, "default": true, "message": "Skills visibility must be boolean"}'::jsonb, 151),
('professional', 'privacy_settings.recruiter_contact', 'boolean', true, '{"type": "boolean", "required": true, "default": true, "message": "Recruiter contact must be boolean"}'::jsonb, 152);

-- ========================================
-- Create helpful indexes for performance
-- ========================================

CREATE INDEX IF NOT EXISTS idx_profile_schema_role_field ON "b2b_dev".profile_schema(role, field_name);
CREATE INDEX IF NOT EXISTS idx_profile_schema_role ON "b2b_dev".profile_schema(role);

-- ========================================
-- Verify insertion
-- ========================================

SELECT 
    role, 
    COUNT(*) as total_fields,
    SUM(CASE WHEN required THEN 1 ELSE 0 END) as required_fields,
    SUM(CASE WHEN NOT required THEN 1 ELSE 0 END) as optional_fields
FROM "b2b_dev".profile_schema
GROUP BY role
ORDER BY role;

-- Show summary
SELECT 
    'Total validation rules inserted: ' || COUNT(*)::text as summary
FROM "b2b_dev".profile_schema;

