-- ==============================================================================
-- PostgreSQL Initialization Script for whatsapp_ai
-- ==============================================================================

-- Ensure extensions for UUID generation and cryptographic utilities
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set default timezone to UTC
SET timezone = 'UTC';

-- Log successful initialization
DO $$
BEGIN
  RAISE NOTICE 'Database whatsapp_ai initialized with extensions uuid-ossp and pgcrypto.';
END $$;
