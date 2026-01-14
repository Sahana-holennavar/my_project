-- ========================================
-- B2B Complete Database Creation Script
-- Database: b2b
-- Schemas: b2b, b2b_dev
-- Purpose: Complete database setup from scratch
-- ========================================

-- ========================================
-- CREATE DATABASE
-- ========================================

-- Create database (run this as superuser)
-- Note: This must be run from a different database (e.g., postgres)
CREATE DATABASE "b2b" 
    WITH 
    TEMPLATE = template0
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'C'
    LC_CTYPE = 'C'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- ========================================
-- ENABLE EXTENSIONS
-- ========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- CREATE SCHEMAS
-- ========================================

-- Create the b2b schema (Production)
CREATE SCHEMA IF NOT EXISTS "b2b";

-- Create the b2b_dev schema (Development)
CREATE SCHEMA IF NOT EXISTS "b2b_dev";

-- ========================================
-- SET SEARCH PATH
-- ========================================

-- Set search path to use b2b schema by default
SET search_path TO "b2b", public;
