/*
  # Initial Schema Setup for B2B AI Assistant

  1. New Tables
    - businesses
      - Basic business information
      - Configuration settings
    - conversations
      - Store conversation history
      - Link to business and customer
    - customers
      - Customer information
    - subscriptions
      - Subscription and payment info
    
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  sector text NOT NULL,
  phone_number text,
  forwarding_number text,
  language text DEFAULT 'en',
  voice_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own business data"
  ON businesses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own business data"
  ON businesses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id),
  name text,
  phone_number text,
  email text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can access their customers"
  ON customers
  FOR ALL
  TO authenticated
  USING (business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  ));

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id),
  customer_id uuid REFERENCES customers(id),
  transcript jsonb,
  audio_url text,
  language text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can access their conversations"
  ON conversations
  FOR ALL
  TO authenticated
  USING (business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  ));

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id),
  stripe_subscription_id text,
  stripe_customer_id text,
  plan_id text NOT NULL,
  status text NOT NULL,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can access their subscriptions"
  ON subscriptions
  FOR ALL
  TO authenticated
  USING (business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  ));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_conversations_business_id ON conversations(business_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_business_id ON subscriptions(business_id);