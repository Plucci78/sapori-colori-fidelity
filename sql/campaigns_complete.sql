-- Sistema Campagne Email Completo
-- Esegui questo dopo aver testato campaigns_minimal.sql

-- Tabella tracking deliveries
CREATE TABLE IF NOT EXISTS campaign_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id TEXT,
  email_log_id TEXT,
  customer_id TEXT,
  customer_email TEXT,
  delivery_status TEXT DEFAULT 'pending',
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  first_click_at TIMESTAMP,
  unsubscribed_at TIMESTAMP,
  error_message TEXT,
  bounce_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabella liste email
CREATE TABLE IF NOT EXISTS email_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  emails TEXT[] NOT NULL,
  total_count INTEGER GENERATED ALWAYS AS (array_length(emails, 1)) STORED,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by_id TEXT,
  business_id TEXT
);

-- Tabella template
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'custom',
  unlayer_design JSONB NOT NULL,
  html_preview TEXT,
  thumbnail_url TEXT,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by_id TEXT,
  business_id TEXT
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_type ON email_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at ON email_campaigns(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_deliveries_campaign_id ON campaign_deliveries(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_deliveries_customer_email ON campaign_deliveries(customer_email);

CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_created_at ON email_templates(created_at DESC);

-- Funzione per updated_at
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

-- Funzione calcolo metriche
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
    ),
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

-- Template di esempio
INSERT INTO email_templates (name, description, category, unlayer_design, html_preview) 
VALUES 
  (
    'Welcome Template', 
    'Template di benvenuto per nuovi clienti', 
    'welcome',
    '{"body":{"rows":[{"cells":[{"modules":[{"type":"text","options":{"text":"Benvenuto nella famiglia!"}}]}]}]}}',
    '<div style="font-family: Arial, sans-serif; padding: 20px;"><h1>Benvenuto nella famiglia!</h1><p>Grazie per esserti iscritto.</p></div>'
  ),
  (
    'Promo Template', 
    'Template per promozioni e offerte', 
    'promo',
    '{"body":{"rows":[{"cells":[{"modules":[{"type":"text","options":{"text":"🔥 Offerta Speciale!"}}]}]}]}}',
    '<div style="font-family: Arial, sans-serif; padding: 20px; background: #ff6b6b; color: white;"><h1>🔥 Offerta Speciale!</h1><p>Non perdere questa occasione unica!</p></div>'
  )
ON CONFLICT DO NOTHING;

-- Messaggio finale
SELECT 'Sistema campagne completo installato con successo!' as result;
SELECT 'Tabelle create: email_campaigns, campaign_deliveries, email_lists, email_templates' as info;
SELECT COUNT(*) || ' template di esempio inseriti' as templates FROM email_templates;