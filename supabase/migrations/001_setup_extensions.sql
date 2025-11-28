-- ============================================================================
-- Migration 001: Extensions and Setup
-- CRITICAL: Run FIRST - enables required PostgreSQL extensions
-- ============================================================================

-- Create extensions schema (best practice - don't pollute public schema)
CREATE SCHEMA IF NOT EXISTS extensions;

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;

-- Full text search with trigrams (for fuzzy search)
CREATE EXTENSION IF NOT EXISTS "pg_trgm" SCHEMA extensions;

-- Cron jobs for background tasks (cart cleanup, etc.)
-- Note: Only available in Supabase hosted projects, not local
-- CREATE EXTENSION IF NOT EXISTS "pg_cron" SCHEMA extensions;

-- ============================================================================
-- IMPORTANT: We are NOT using ltree or pg_jsonschema
-- ============================================================================
-- Reasons:
-- 1. ltree: Overkill for comment threading - adjacency list with CTEs is better
-- 2. pg_jsonschema: Runtime validation overhead - validate in application layer

-- ============================================================================
-- COMMENTS
-- ============================================================================
-- uuid-ossp: Generate UUIDs for primary keys
-- pg_trgm: Trigram-based fuzzy text search for products, titles, etc.
-- pg_cron: Schedule background jobs (disabled locally, enable in production)
--
-- Note: Extensions are installed in 'extensions' schema, not 'public'
-- Your config.toml already has: extra_search_path = ["public", "extensions"]
-- This allows you to use extension functions without schema prefix