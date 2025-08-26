-- Sistema Campagne Email - Versione Semplificata (senza foreign key problematiche)
-- Esegui questo in Supabase SQL Editor

-- Tabella principale campagne (senza FK problematiche)
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Tipologia e stato
  campaign_type TEXT DEFAULT 'regular' CHECK (campaign_type IN ('regular', 'ab_test', 'automated')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')),
  
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
  audience_type TEXT DEFAULT 'all' CHECK (audience_type IN ('all', 'segment', 'custom', 'list')),
  audience_filter JSONB DEFAULT '{}', -- Filtri per segmentazione
  audience_count INTEGER DEFAULT 0,
  excluded_emails TEXT[], -- Array di email da escludere
  
  -- Scheduling
  schedule_type TEXT DEFAULT 'now' CHECK (schedule_type IN ('now', 'scheduled', 'automated')),
  scheduled_at TIMESTAMP,
  timezone TEXT DEFAULT 'Europe/Rome',
  
  -- Automation settings (se automated)
  trigger_type TEXT CHECK (trigger_type IN ('welcome', 'birthday', 'purchase', 'abandoned_cart', 'milestone')),
  trigger_conditions JSONB DEFAULT '{}',
  
  -- A/B Test settings (se ab_test)
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
  
  -- Owner (solo come testo per ora, senza FK)
  created_by_id TEXT,
  business_id TEXT
);

-- Tabella per tracking dettagliato campagne (senza FK problematiche)
CREATE TABLE IF NOT EXISTS campaign_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  email_log_id BIGINT, -- Senza FK per evitare problemi tipo
  customer_id TEXT, -- Come testo invece di UUID FK
  customer_email TEXT,
  
  -- Status delivery
  delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'bounced', 'failed')),
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

-- Tabella per salvare liste di email personalizzate
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

-- Tabella template salvati (separati dalle campagne)
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

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_type ON email_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at ON email_campaigns(created_at);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_business_id ON email_campaigns(business_id);

CREATE INDEX IF NOT EXISTS idx_campaign_deliveries_campaign_id ON campaign_deliveries(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_deliveries_customer_email ON campaign_deliveries(customer_email);
CREATE INDEX IF NOT EXISTS idx_campaign_deliveries_status ON campaign_deliveries(delivery_status);

CREATE INDEX IF NOT EXISTS idx_email_lists_business_id ON email_lists(business_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_business_id ON email_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);

-- Aggiorna timestamp automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per updated_at
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

-- Funzione per calcolare metriche campagna automaticamente
CREATE OR REPLACE FUNCTION calculate_campaign_metrics(campaign_uuid UUID)
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
  WHERE id = campaign_uuid;
  
  -- Calcola tassi
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
  WHERE id = campaign_uuid;
END;
$$ LANGUAGE plpgsql;