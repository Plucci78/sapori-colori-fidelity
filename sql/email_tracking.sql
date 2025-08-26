-- Tabelle per tracking email avanzato
-- Esegui questo in Supabase SQL Editor

-- Prima creiamo la tabella base email_logs se non esiste
CREATE TABLE IF NOT EXISTS email_logs (
  id BIGSERIAL PRIMARY KEY,
  campaign_id UUID,
  customer_id UUID,
  customer_email TEXT,
  subject TEXT,
  content TEXT,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabella per tracking aperture email
CREATE TABLE IF NOT EXISTS email_opens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_log_id BIGINT REFERENCES email_logs(id) ON DELETE CASCADE,
  customer_id UUID,
  customer_email TEXT,
  opened_at TIMESTAMP DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabella per tracking click sui link
CREATE TABLE IF NOT EXISTS email_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_log_id BIGINT REFERENCES email_logs(id) ON DELETE CASCADE,
  customer_id UUID,
  customer_email TEXT,
  clicked_url TEXT,
  clicked_at TIMESTAMP DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabella per statistiche aggregate per email/campagna
CREATE TABLE IF NOT EXISTS email_campaign_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_log_id BIGINT REFERENCES email_logs(id) ON DELETE CASCADE,
  campaign_name TEXT,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  unique_opens INTEGER DEFAULT 0,
  unique_clicks INTEGER DEFAULT 0,
  open_rate DECIMAL(5,2) DEFAULT 0,
  click_rate DECIMAL(5,2) DEFAULT 0,
  bounce_rate DECIMAL(5,2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_email_opens_email_log_id ON email_opens(email_log_id);
CREATE INDEX IF NOT EXISTS idx_email_opens_customer_id ON email_opens(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_opens_opened_at ON email_opens(opened_at);

CREATE INDEX IF NOT EXISTS idx_email_clicks_email_log_id ON email_clicks(email_log_id);
CREATE INDEX IF NOT EXISTS idx_email_clicks_customer_id ON email_clicks(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_clicks_clicked_at ON email_clicks(clicked_at);

CREATE INDEX IF NOT EXISTS idx_email_campaign_stats_email_log_id ON email_campaign_stats(email_log_id);
CREATE INDEX IF NOT EXISTS idx_email_campaign_stats_created_at ON email_campaign_stats(created_at);

-- Trigger per aggiornare statistiche automaticamente
CREATE OR REPLACE FUNCTION update_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Aggiorna le statistiche quando c'è un'apertura o click
  UPDATE email_campaign_stats 
  SET 
    total_opened = (
      SELECT COUNT(*) FROM email_opens 
      WHERE email_log_id = NEW.email_log_id
    ),
    unique_opens = (
      SELECT COUNT(DISTINCT customer_email) FROM email_opens 
      WHERE email_log_id = NEW.email_log_id
    ),
    total_clicked = (
      SELECT COUNT(*) FROM email_clicks 
      WHERE email_log_id = NEW.email_log_id
    ),
    unique_clicks = (
      SELECT COUNT(DISTINCT customer_email) FROM email_clicks 
      WHERE email_log_id = NEW.email_log_id
    ),
    updated_at = NOW()
  WHERE email_log_id = NEW.email_log_id;
  
  -- Calcola i tassi
  UPDATE email_campaign_stats 
  SET 
    open_rate = CASE 
      WHEN total_sent > 0 THEN (unique_opens::decimal / total_sent::decimal) * 100
      ELSE 0 
    END,
    click_rate = CASE 
      WHEN total_sent > 0 THEN (unique_clicks::decimal / total_sent::decimal) * 100
      ELSE 0 
    END
  WHERE email_log_id = NEW.email_log_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per aperture (DROP IF EXISTS per evitare errori)
DROP TRIGGER IF EXISTS update_stats_on_open ON email_opens;
CREATE TRIGGER update_stats_on_open
  AFTER INSERT ON email_opens
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_stats();

-- Trigger per click (DROP IF EXISTS per evitare errori)
DROP TRIGGER IF EXISTS update_stats_on_click ON email_clicks;
CREATE TRIGGER update_stats_on_click
  AFTER INSERT ON email_clicks
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_stats();