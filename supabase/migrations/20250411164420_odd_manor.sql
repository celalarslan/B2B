/*
  # Database Performance Optimization

  1. New Indexes
    - Composite indexes for frequently joined columns
    - Partial indexes for specific queries
    - B-tree indexes for sorting and filtering
    - Text search indexes for name fields
    
  2. Performance Impact
    - Improved query performance for common operations
    - Optimized JOIN operations
    - Better text search capabilities
    - Minimal write overhead
*/

-- Enable pg_trgm extension for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Businesses Table Optimizations
CREATE INDEX IF NOT EXISTS idx_businesses_user_id_sector
ON businesses (user_id, sector);

CREATE INDEX IF NOT EXISTS idx_businesses_name_trgm
ON businesses USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_businesses_created_at
ON businesses (created_at DESC);

-- Customers Table Optimizations
CREATE INDEX IF NOT EXISTS idx_customers_business_phone
ON customers (business_id, phone_number);

CREATE INDEX IF NOT EXISTS idx_customers_name_trgm
ON customers USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_customers_email
ON customers (email)
WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_created_at
ON customers (created_at DESC);

-- Conversations Table Optimizations
CREATE INDEX IF NOT EXISTS idx_conversations_business_customer
ON conversations (business_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_conversations_created_at
ON conversations (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_transcript
ON conversations USING gin (transcript);

-- Subscriptions Table Optimizations
CREATE INDEX IF NOT EXISTS idx_subscriptions_status
ON subscriptions (status, business_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end
ON subscriptions (current_period_end)
WHERE status = 'active';

-- Analyze tables to update statistics
ANALYZE businesses;
ANALYZE customers;
ANALYZE conversations;
ANALYZE subscriptions;

-- Add index descriptions
COMMENT ON INDEX idx_businesses_user_id_sector IS 'Optimizes queries filtering by user_id and sector';
COMMENT ON INDEX idx_businesses_name_trgm IS 'Enables fast text search on business names';
COMMENT ON INDEX idx_businesses_created_at IS 'Optimizes recent businesses queries';

COMMENT ON INDEX idx_customers_business_phone IS 'Optimizes customer lookup by business and phone';
COMMENT ON INDEX idx_customers_name_trgm IS 'Enables fast text search on customer names';
COMMENT ON INDEX idx_customers_email IS 'Optimizes customer lookup by email (partial)';
COMMENT ON INDEX idx_customers_created_at IS 'Optimizes recent customers queries';

COMMENT ON INDEX idx_conversations_business_customer IS 'Optimizes conversation history queries';
COMMENT ON INDEX idx_conversations_created_at IS 'Optimizes recent conversations queries';
COMMENT ON INDEX idx_conversations_transcript IS 'Enables full text search in transcripts';

COMMENT ON INDEX idx_subscriptions_status IS 'Optimizes active subscription queries';
COMMENT ON INDEX idx_subscriptions_period_end IS 'Optimizes expiring subscription queries';