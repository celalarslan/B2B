/*
  # Invoicing System Implementation

  1. New Tables
    - invoices: Core invoice information
    - invoice_items: Line items for each invoice
    - invoice_events: Audit trail for invoice lifecycle
    
  2. Security
    - RLS policies for data access
    - Audit logging triggers
    - GDPR compliance helpers
*/

-- Create enum types
CREATE TYPE invoice_status AS ENUM (
  'draft',
  'pending',
  'paid',
  'void',
  'refunded',
  'partially_refunded'
);

CREATE TYPE invoice_type AS ENUM (
  'subscription',
  'usage',
  'one_time',
  'credit'
);

-- Create invoices table
CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  plan_id uuid REFERENCES pricing_plans(id),
  stripe_invoice_id text,
  stripe_payment_intent_id text,
  invoice_number text NOT NULL,
  invoice_type invoice_type NOT NULL DEFAULT 'subscription',
  status invoice_status NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'usd',
  subtotal_amount decimal(12,2) NOT NULL DEFAULT 0,
  tax_amount decimal(12,2) NOT NULL DEFAULT 0,
  total_amount decimal(12,2) NOT NULL DEFAULT 0,
  vat_rate decimal(5,2),
  vat_number text,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  invoice_date timestamptz NOT NULL DEFAULT now(),
  due_date timestamptz,
  paid_date timestamptz,
  pdf_url text,
  billing_address jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT valid_amount_check CHECK (total_amount = subtotal_amount + tax_amount),
  CONSTRAINT valid_vat_rate CHECK (vat_rate BETWEEN 0 AND 100),
  CONSTRAINT valid_dates CHECK (
    period_start <= period_end AND
    invoice_date <= COALESCE(due_date, invoice_date)
  )
);

-- Create invoice items table
CREATE TABLE invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(12,2) NOT NULL,
  amount decimal(12,2) NOT NULL,
  tax_rate decimal(5,2),
  tax_amount decimal(12,2),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT positive_quantity CHECK (quantity > 0),
  CONSTRAINT valid_amount CHECK (amount = quantity * unit_price)
);

-- Create invoice events table
CREATE TABLE invoice_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_invoices_user ON invoices(user_id);
CREATE INDEX idx_invoices_organization ON invoices(organization_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_date ON invoices(invoice_date DESC);
CREATE INDEX idx_invoices_stripe ON invoices(stripe_invoice_id);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_events_invoice ON invoice_events(invoice_id);
CREATE INDEX idx_invoice_events_type ON invoice_events(event_type);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own invoices"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their invoice items"
  ON invoice_items
  FOR SELECT
  TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM invoices
      WHERE user_id = auth.uid() OR
      organization_id IN (
        SELECT organization_id FROM organization_users
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view their invoice events"
  ON invoice_events
  FOR SELECT
  TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM invoices
      WHERE user_id = auth.uid() OR
      organization_id IN (
        SELECT organization_id FROM organization_users
        WHERE user_id = auth.uid()
      )
    )
  );

-- Create function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  year text;
  sequence_number integer;
  invoice_number text;
BEGIN
  year := to_char(current_date, 'YYYY');
  
  -- Get next sequence number for the year
  WITH seq AS (
    SELECT COUNT(*) + 1 as next_num
    FROM invoices
    WHERE invoice_number LIKE year || '-%'
  )
  SELECT next_num INTO sequence_number FROM seq;
  
  -- Format: YYYY-XXXXXX (6 digits, zero-padded)
  invoice_number := year || '-' || lpad(sequence_number::text, 6, '0');
  
  RETURN invoice_number;
END;
$$;

-- Create function to calculate invoice totals
CREATE OR REPLACE FUNCTION calculate_invoice_totals(p_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_subtotal decimal(12,2);
  v_tax_amount decimal(12,2);
BEGIN
  -- Calculate subtotal and tax from items
  SELECT 
    SUM(amount),
    SUM(COALESCE(tax_amount, 0))
  INTO v_subtotal, v_tax_amount
  FROM invoice_items
  WHERE invoice_id = p_invoice_id;

  -- Update invoice totals
  UPDATE invoices
  SET 
    subtotal_amount = COALESCE(v_subtotal, 0),
    tax_amount = COALESCE(v_tax_amount, 0),
    total_amount = COALESCE(v_subtotal, 0) + COALESCE(v_tax_amount, 0),
    updated_at = now()
  WHERE id = p_invoice_id;
END;
$$;

-- Create trigger to update invoice totals
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM calculate_invoice_totals(
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.invoice_id
      ELSE NEW.invoice_id
    END
  );
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_invoice_totals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_totals();

-- Create function to log invoice events
CREATE OR REPLACE FUNCTION log_invoice_event(
  p_invoice_id uuid,
  p_event_type text,
  p_event_data jsonb
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO invoice_events (
    invoice_id,
    user_id,
    event_type,
    event_data
  ) VALUES (
    p_invoice_id,
    auth.uid(),
    p_event_type,
    p_event_data
  );
END;
$$;

-- Create trigger for invoice status changes
CREATE OR REPLACE FUNCTION log_invoice_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_invoice_event(
      NEW.id,
      'status_changed',
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'changed_at', now()
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_invoice_status_changes
  AFTER UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION log_invoice_status_change();

-- Create function to handle GDPR data export
CREATE OR REPLACE FUNCTION export_user_invoice_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'invoices', jsonb_agg(to_jsonb(i)),
    'invoice_items', jsonb_agg(to_jsonb(ii)),
    'events', jsonb_agg(to_jsonb(e))
  ) INTO result
  FROM invoices i
  LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
  LEFT JOIN invoice_events e ON i.id = e.invoice_id
  WHERE i.user_id = p_user_id
  AND i.deleted_at IS NULL;

  RETURN result;
END;
$$;

-- Create function to handle GDPR data deletion
CREATE OR REPLACE FUNCTION delete_user_invoice_data(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Soft delete invoices
  UPDATE invoices
  SET 
    deleted_at = now(),
    pdf_url = NULL,
    stripe_invoice_id = NULL,
    stripe_payment_intent_id = NULL,
    vat_number = NULL,
    billing_address = NULL,
    metadata = '{}'::jsonb
  WHERE user_id = p_user_id;

  -- Log deletion event
  INSERT INTO invoice_events (
    invoice_id,
    user_id,
    event_type,
    event_data
  )
  SELECT 
    id,
    auth.uid(),
    'gdpr_deletion',
    jsonb_build_object('deleted_at', now())
  FROM invoices
  WHERE user_id = p_user_id;
END;
$$;

-- Add comments
COMMENT ON TABLE invoices IS 'Stores invoice records for all billing events';
COMMENT ON TABLE invoice_items IS 'Stores line items for each invoice';
COMMENT ON TABLE invoice_events IS 'Tracks invoice lifecycle events';