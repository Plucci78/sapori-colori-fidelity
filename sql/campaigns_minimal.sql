-- Test minimo per le campagne
-- Esegui questo per primo per testare

-- Solo tabella principale campagne
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT DEFAULT 'regular',
  status TEXT DEFAULT 'draft',
  subject TEXT NOT NULL,
  preview_text TEXT,
  from_name TEXT NOT NULL,
  reply_to TEXT,
  template_data JSONB DEFAULT '{}',
  unlayer_design JSONB DEFAULT '{}',
  html_content TEXT,
  audience_type TEXT DEFAULT 'all',
  audience_filter JSONB DEFAULT '{}',
  audience_count INTEGER DEFAULT 0,
  excluded_emails TEXT[],
  schedule_type TEXT DEFAULT 'now',
  scheduled_at TIMESTAMP,
  timezone TEXT DEFAULT 'Europe/Rome',
  trigger_type TEXT,
  trigger_conditions JSONB DEFAULT '{}',
  ab_test_config JSONB DEFAULT '{}',
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  total_unsubscribed INTEGER DEFAULT 0,
  open_rate DECIMAL(5,2) DEFAULT 0,
  click_rate DECIMAL(5,2) DEFAULT 0,
  bounce_rate DECIMAL(5,2) DEFAULT 0,
  unsubscribe_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  launched_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_by_id TEXT,
  business_id TEXT
);

-- Messaggio finale
SELECT 'Tabella email_campaigns creata con successo!' as result;