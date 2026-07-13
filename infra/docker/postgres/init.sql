-- ================================================================
-- Veyonix PostgreSQL Init Script
-- Runs once when the Docker container is first created.
-- Sets up extensions and base configuration.
-- ================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- For trigram text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For composite GIN indexes

-- Set timezone
SET timezone = 'UTC';

-- Optimize for OLTP workloads
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '768MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = '0.9';
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = '100';
ALTER SYSTEM SET random_page_cost = '1.1';
ALTER SYSTEM SET effective_io_concurrency = '200';
ALTER SYSTEM SET min_wal_size = '1GB';
ALTER SYSTEM SET max_wal_size = '4GB';

-- Logging configuration
ALTER SYSTEM SET log_min_duration_statement = '500'; -- Log queries > 500ms
ALTER SYSTEM SET log_checkpoints = 'on';
ALTER SYSTEM SET log_connections = 'off';
ALTER SYSTEM SET log_disconnections = 'off';
ALTER SYSTEM SET log_lock_waits = 'on';
ALTER SYSTEM SET log_temp_files = '0';
ALTER SYSTEM SET log_autovacuum_min_duration = '0';

SELECT pg_reload_conf();
