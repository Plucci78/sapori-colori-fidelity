-- Sistema Campagne - VERSIONE CHE FUNZIONA SICURO
-- Niente indici, niente fronzoli, solo le tabelle

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

-- Template di esempio
INSERT INTO email_templates (name, description, category, unlayer_design, html_preview) 
VALUES 
  (
    'Welcome Template', 
    'Template di benvenuto', 
    'welcome',
    '{}',
    '<h1>Benvenuto!</h1>'
  ),
  (
    'Promo Template', 
    'Template promozioni', 
    'promo',
    '{}',
    '<h1>Offerta Speciale!</h1>'
  )
ON CONFLICT DO NOTHING;

-- FATTO!
SELECT 'Sistema campagne funzionante installato!' as result;