/*
  # Call Forwarding Schema Setup

  1. New Tables
    - countries: Stores country information
    - operators: Stores mobile operator information and forwarding codes
    
  2. Security
    - Enable RLS on all tables
    - Add policies for public read access
*/

-- Create countries table
CREATE TABLE IF NOT EXISTS countries (
  code text PRIMARY KEY,
  name text NOT NULL,
  flag text NOT NULL,
  active boolean DEFAULT true
);

-- Create operators table
CREATE TABLE IF NOT EXISTS operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country_code text REFERENCES countries(code) NOT NULL,
  forward_code text NOT NULL,
  cancel_code text NOT NULL,
  logo_url text,
  active boolean DEFAULT true
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_operators_country ON operators(country_code);
CREATE INDEX IF NOT EXISTS idx_operators_active ON operators(active) WHERE active = true;

-- Enable RLS
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Public read access to countries"
  ON countries
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access to operators"
  ON operators
  FOR SELECT
  TO public
  USING (true);

-- Insert sample data for countries
INSERT INTO countries (code, name, flag) VALUES
  ('TR', 'Turkey', '🇹🇷'),
  ('US', 'United States', '🇺🇸'),
  ('GB', 'United Kingdom', '🇬🇧'),
  ('DE', 'Germany', '🇩🇪'),
  ('FR', 'France', '🇫🇷'),
  ('IT', 'Italy', '🇮🇹'),
  ('ES', 'Spain', '🇪🇸'),
  ('SA', 'Saudi Arabia', '🇸🇦'),
  ('AE', 'United Arab Emirates', '🇦🇪')
ON CONFLICT (code) DO NOTHING;

-- Insert sample data for operators
INSERT INTO operators (name, country_code, forward_code, cancel_code) VALUES
  ('Turkcell', 'TR', '*21*{phone}#', '#21#'),
  ('Vodafone TR', 'TR', '*21*{phone}#', '#21#'),
  ('Türk Telekom', 'TR', '*21*{phone}#', '#21#'),
  
  ('AT&T', 'US', '*72{phone}#', '*73#'),
  ('Verizon', 'US', '*71{phone}#', '*73#'),
  ('T-Mobile US', 'US', '*21*{phone}#', '#21#'),
  
  ('Vodafone UK', 'GB', '*21*{phone}#', '#21#'),
  ('EE', 'GB', '*21*{phone}#', '#21#'),
  ('O2 UK', 'GB', '*21*{phone}#', '#21#'),
  
  ('Deutsche Telekom', 'DE', '*21*{phone}#', '#21#'),
  ('Vodafone DE', 'DE', '*21*{phone}#', '#21#'),
  
  ('Orange', 'FR', '*21*{phone}#', '#21#'),
  ('SFR', 'FR', '*21*{phone}#', '#21#'),
  
  ('TIM', 'IT', '*21*{phone}#', '#21#'),
  ('Vodafone IT', 'IT', '*21*{phone}#', '#21#'),
  
  ('Movistar', 'ES', '*21*{phone}#', '#21#'),
  ('Vodafone ES', 'ES', '*21*{phone}#', '#21#'),
  
  ('STC', 'SA', '*21*{phone}#', '#21#'),
  ('Mobily', 'SA', '*21*{phone}#', '#21#'),
  
  ('Etisalat', 'AE', '*21*{phone}#', '#21#'),
  ('Du', 'AE', '*21*{phone}#', '#21#')
ON CONFLICT DO NOTHING;

-- Add comments
COMMENT ON TABLE countries IS 'Stores country information for call forwarding';
COMMENT ON TABLE operators IS 'Stores mobile operator information and forwarding codes';