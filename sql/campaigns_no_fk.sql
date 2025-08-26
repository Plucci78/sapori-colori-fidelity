-- Sistema Campagne Email - Versione SENZA Foreign Key
-- Esegui questo in Supabase SQL Editor

-- Tabella principale campagne (standalone)
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Tipologia e stato
  campaign_type TEXT DEFAULT 'regular',
  status TEXT DEFAULT 'draft',
  
  -- Contenuto email
  subject TEXT NOT NULL,
  preview_text TEXT,
  from_name TEXT NOT NULL,
  reply_to TEXT,
  
  -- Template e design (JSON)
  template_data JSONB DEFAULT '{}',
  unlayer_design JSONB DEFAULT '{}',
  html_content TEXT,
  
  -- Targeting e audience
  audience_type TEXT DEFAULT 'all',
  audience_filter JSONB DEFAULT '{}',
  audience_count INTEGER DEFAULT 0,
  excluded_emails TEXT[],
  
  -- Scheduling
  schedule_type TEXT DEFAULT 'now',
  scheduled_at TIMESTAMP,
  timezone TEXT DEFAULT 'Europe/Rome',
  
  -- Automation settings
  trigger_type TEXT,
  trigger_conditions JSONB DEFAULT '{}',
  
  -- A/B Test settings
  ab_test_config JSONB DEFAULT '{}',
  
  -- Metriche e risultati
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  total_unsubscribed INTEGER DEFAULT 0,
  
  -- Tassi calcolati
  open_rate DECIMAL(5,2) DEFAULT 0,
  click_rate DECIMAL(5,2) DEFAULT 0,
  bounce_rate DECIMAL(5,2) DEFAULT 0,
  unsubscribe_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  launched_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Owner (come testo, senza FK)
  created_by_id TEXT,
  business_id TEXT
);

-- Tabella tracking campagne (SENZA FK)
CREATE TABLE IF NOT EXISTS campaign_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id TEXT, -- Come TEXT invece di FK
  email_log_id TEXT, -- Come TEXT invece di FK
  customer_id TEXT,
  customer_email TEXT,
  
  -- Status delivery
  delivery_status TEXT DEFAULT 'pending',
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  
  -- Tracking data
  opened_at TIMESTAMP,
  first_click_at TIMESTAMP,
  unsubscribed_at TIMESTAMP,
  
  -- Error info
  error_message TEXT,
  bounce_reason TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabella liste email (standalone)
CREATE TABLE IF NOT EXISTS email_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Lista emails
  emails TEXT[] NOT NULL,
  total_count INTEGER GENERATED ALWAYS AS (array_length(emails, 1)) STORED,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by_id TEXT,
  business_id TEXT
);

-- Tabella template (standalone)
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'custom',
  
  -- Design data
  unlayer_design JSONB NOT NULL,
  html_preview TEXT,
  thumbnail_url TEXT,
  
  -- Usage stats
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  
  -- Metadata  
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by_id TEXT,
  business_id TEXT
);

-- Indici per performance (importante senza FK!)
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_type ON email_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at ON email_campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_business_id ON email_campaigns(business_id);

CREATE INDEX IF NOT EXISTS idx_campaign_deliveries_campaign_id ON campaign_deliveries(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_deliveries_customer_email ON campaign_deliveries(customer_email);
CREATE INDEX IF NOT EXISTS idx_campaign_deliveries_status ON campaign_deliveries(delivery_status);
CREATE INDEX IF NOT EXISTS idx_campaign_deliveries_sent_at ON campaign_deliveries(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_lists_business_id ON email_lists(business_id);
CREATE INDEX IF NOT EXISTS idx_email_lists_created_at ON email_lists(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_templates_business_id ON email_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_created_at ON email_templates(created_at DESC);

-- Trigger per updated_at automatico
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON email_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_lists_updated_at  
  BEFORE UPDATE ON email_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates  
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Funzione per calcolare metriche campagna (usando TEXT IDs)
CREATE OR REPLACE FUNCTION calculate_campaign_metrics(campaign_uuid TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE email_campaigns 
  SET 
    total_sent = (
      SELECT COUNT(*) FROM campaign_deliveries 
      WHERE campaign_id = campaign_uuid AND delivery_status IN ('sent', 'delivered')
    ),
    total_delivered = (
      SELECT COUNT(*) FROM campaign_deliveries 
      WHERE campaign_id = campaign_uuid AND delivery_status = 'delivered'
    ),
    total_opened = (
      SELECT COUNT(*) FROM campaign_deliveries 
      WHERE campaign_id = campaign_uuid AND opened_at IS NOT NULL
    ),
    total_clicked = (
      SELECT COUNT(*) FROM campaign_deliveries 
      WHERE campaign_id = campaign_uuid AND first_click_at IS NOT NULL
    ),
    total_bounced = (
      SELECT COUNT(*) FROM campaign_deliveries 
      WHERE campaign_id = campaign_uuid AND delivery_status = 'bounced'
    )
  WHERE id::text = campaign_uuid;
  
  -- Calcola tassi percentuali
  UPDATE email_campaigns 
  SET 
    open_rate = CASE 
      WHEN total_delivered > 0 THEN (total_opened::decimal / total_delivered::decimal) * 100
      ELSE 0 
    END,
    click_rate = CASE 
      WHEN total_delivered > 0 THEN (total_clicked::decimal / total_delivered::decimal) * 100
      ELSE 0 
    END,
    bounce_rate = CASE 
      WHEN total_sent > 0 THEN (total_bounced::decimal / total_sent::decimal) * 100
      ELSE 0 
    END
  WHERE id::text = campaign_uuid;
END;
$$ LANGUAGE plpgsql;

-- Inserisci alcuni template di esempio
INSERT INTO email_templates (name, description, category, unlayer_design, html_preview) 
VALUES 
  (
    'Welcome Template', 
    'Template di benvenuto per nuovi clienti', 
    'welcome',
    '{"body":{"rows":[{"cells":[{"modules":[{"type":"text","options":{"text":"Benvenuto!"}}]}]}]}}',
    '<h1>Benvenuto!</h1>'
  ),
  (
    'Promo Template', 
    'Template per promozioni e offerte', 
    'promo',
    '{"body":{"rows":[{"cells":[{"modules":[{"type":"text","options":{"text":"Offerta Speciale!"}}]}]}]}}',
    '<h1>Offerta Speciale!</h1>'
  )
ON CONFLICT DO NOTHING;

-- Messaggio di successo
DO $$
BEGIN
  RAISE NOTICE 'Sistema campagne email creato con successo!';
  RAISE NOTICE 'Tabelle create: email_campaigns, campaign_deliveries, email_lists, email_templates';
  RAISE NOTICE 'Funzioni create: calculate_campaign_metrics, update_updated_at_column';
  RAISE NOTICE 'Template di esempio inseriti: Welcome Template, Promo Template';
END $$;