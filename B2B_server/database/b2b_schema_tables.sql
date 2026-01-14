-- ========================================
-- B2B Schema Tables Creation Script
-- Schema: b2b (Production)
-- Purpose: Create all tables for production schema
-- ========================================

-- Set search path to use b2b schema
SET search_path TO "b2b", public;

-- ========================================
-- TABLE CREATION
-- ========================================

-- Users table (Clean version with only required columns)
CREATE TABLE "b2b".users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'deleted')),
    two_factor BOOLEAN DEFAULT false
);

-- Auth Sessions table
CREATE TABLE "b2b".auth_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auth_session_user FOREIGN KEY (user_id) REFERENCES "b2b".users(id) ON DELETE CASCADE
);

-- User Profiles table (Full version for production)
CREATE TABLE "b2b".user_profiles (
    user_id UUID PRIMARY KEY,
    role VARCHAR(50),
    profile_data JSONB,
    privacy_settings JSONB,
    about TEXT,
    social_links JSONB,
    experience JSONB,
    projects JSONB,
    education JSONB,
    achievements JSONB,
    skills JSONB,
    certifications JSONB,
    posts JSONB,
    products JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_profile_user FOREIGN KEY (user_id) REFERENCES "b2b".users(id) ON DELETE CASCADE
);

-- Roles table
CREATE TABLE "b2b".roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Roles table (Many-to-many relationship)
CREATE TABLE "b2b".user_roles (
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES "b2b".users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES "b2b".roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_assigned_by FOREIGN KEY (assigned_by) REFERENCES "b2b".users(id) ON DELETE SET NULL
);

-- Permissions table
CREATE TABLE "b2b".permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, resource, action)
);

-- Role Permissions table (Many-to-many relationship)
CREATE TABLE "b2b".role_permissions (
    role_id UUID NOT NULL,
    perm_id UUID NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID,
    PRIMARY KEY (role_id, perm_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES "b2b".roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (perm_id) REFERENCES "b2b".permissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_granted_by FOREIGN KEY (granted_by) REFERENCES "b2b".users(id) ON DELETE SET NULL
);

-- Profile Schema table (For dynamic profile field definitions)
CREATE TABLE "b2b".profile_schema (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role VARCHAR(50),
    field_name VARCHAR(100) NOT NULL,
    field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'number', 'boolean', 'date', 'email', 'url', 'json', 'array')),
    required BOOLEAN DEFAULT false,
    rules JSONB,
    display_order INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role, field_name)
);

-- Product table
CREATE TABLE "b2b".products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    certifications JSONB,
    images JSONB,
    quantity INT,
    price NUMERIC(12,2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    tags JSONB,
    availability BOOLEAN DEFAULT true,
    offers JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_seller FOREIGN KEY (seller_id) REFERENCES "b2b".users(id) ON DELETE RESTRICT
);

-- Chat table
CREATE TABLE "b2b".chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL,
    recipient_id UUID NOT NULL,
    message TEXT,
    media JSONB,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    product_id UUID,
    quotation_id UUID,
    read_receipts JSONB,
    typing_status BOOLEAN DEFAULT false,
    online BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chat_sender FOREIGN KEY (sender_id) REFERENCES "b2b".users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_chat_recipient FOREIGN KEY (recipient_id) REFERENCES "b2b".users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_chat_product FOREIGN KEY (product_id) REFERENCES "b2b".products(id) ON DELETE RESTRICT
);

-- Quotation table
CREATE TABLE "b2b".quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL,
    buyer_id UUID NOT NULL,
    seller_id UUID NOT NULL,
    requirements TEXT,
    quantity INT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'closed')),
    pdf_export_link TEXT,
    chat_id UUID,
    history JSONB,
    conversion_rate NUMERIC(5,2),
    template_id UUID,
    attachments JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_quotation_product FOREIGN KEY (product_id) REFERENCES "b2b".products(id) ON DELETE RESTRICT,
    CONSTRAINT fk_quotation_buyer FOREIGN KEY (buyer_id) REFERENCES "b2b".users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_quotation_seller FOREIGN KEY (seller_id) REFERENCES "b2b".users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_quotation_chat FOREIGN KEY (chat_id) REFERENCES "b2b".chats(id) ON DELETE RESTRICT
);

-- Add the missing foreign key constraint to chats table
ALTER TABLE "b2b".chats 
ADD CONSTRAINT fk_chat_quotation FOREIGN KEY (quotation_id) REFERENCES "b2b".quotations(id) ON DELETE RESTRICT;

-- Post table
CREATE TABLE "b2b".posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    content TEXT,
    type VARCHAR(20) CHECK (type IN ('text', 'image', 'video', 'link')),
    media JSONB,
    audience VARCHAR(20) DEFAULT 'public' CHECK (audience IN ('public', 'private', 'connections')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    shares INT DEFAULT 0,
    saves INT DEFAULT 0,
    likes INT DEFAULT 0,
    comments INT DEFAULT 0,
    reposts INT DEFAULT 0,
    tags JSONB,
    CONSTRAINT fk_post_user FOREIGN KEY (user_id) REFERENCES "b2b".users(id) ON DELETE RESTRICT
);

-- Review table
CREATE TABLE "b2b".reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL,
    user_id UUID NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    text TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'visible' CHECK (status IN ('visible', 'hidden', 'flagged')),
    moderation_flag BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_review_product FOREIGN KEY (product_id) REFERENCES "b2b".products(id) ON DELETE RESTRICT,
    CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES "b2b".users(id) ON DELETE RESTRICT
);

-- Comment table
CREATE TABLE "b2b".comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL,
    user_id UUID NOT NULL,
    parent_id UUID,
    text TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'visible' CHECK (status IN ('visible', 'hidden', 'flagged')),
    media JSONB,
    moderation_flag BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comment_post FOREIGN KEY (post_id) REFERENCES "b2b".posts(id) ON DELETE RESTRICT,
    CONSTRAINT fk_comment_user FOREIGN KEY (user_id) REFERENCES "b2b".users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_comment_parent FOREIGN KEY (parent_id) REFERENCES "b2b".comments(id) ON DELETE RESTRICT
);

-- DashboardStat table
CREATE TABLE "b2b".dashboard_stats (
    user_id UUID PRIMARY KEY,
    product_views INT DEFAULT 0,
    quotation_requests INT DEFAULT 0,
    bestsellers JSONB,
    product_matrix JSONB,
    downloadable_links JSONB,
    historical_analytics JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dashboard_stat_user FOREIGN KEY (user_id) REFERENCES "b2b".users(id) ON DELETE RESTRICT
);

-- Notification table
CREATE TABLE "b2b".notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    type VARCHAR(100),
    payload JSONB,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read BOOLEAN DEFAULT false,
    delivery_method VARCHAR(20) NOT NULL CHECK (delivery_method IN ('email', 'in-app', 'sms')),
    muted BOOLEAN DEFAULT false,
    batched BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES "b2b".users(id) ON DELETE RESTRICT
);

-- Connection table
CREATE TABLE "b2b".connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    connected_id UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
    tags JSONB,
    last_active TIMESTAMP,
    role_permissions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_connection_user FOREIGN KEY (user_id) REFERENCES "b2b".users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_connection_connected FOREIGN KEY (connected_id) REFERENCES "b2b".users(id) ON DELETE RESTRICT,
    CONSTRAINT unique_connection UNIQUE (user_id, connected_id)
);

-- Inventory table
CREATE TABLE "b2b".inventory (
    product_id UUID PRIMARY KEY,
    current_stock INT,
    low_stock_threshold INT,
    bulk_import_status BOOLEAN DEFAULT false,
    restock_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES "b2b".products(id) ON DELETE RESTRICT
);
