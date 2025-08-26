-- BARE MINIMUM - Solo tabelle vuote

CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT DEFAULT 'regular',
  status TEXT DEFAULT 'draft',
  subject TEXT,
  preview_text TEXT,
  from_name TEXT,
  reply_to TEXT,
  template_data JSONB DEFAULT '{}',
  unlayer_design JSONB DEFAULT '{}',
  html_content TEXT,
  audience_type TEXT DEFAULT 'all',
  audience_filter JSONB DEFAULT '{}',
  audience_count INTEGER DEFAULT 0,
  schedule_type TEXT DEFAULT 'now',
  scheduled_at TIMESTAMP,
  timezone TEXT DEFAULT 'Europe/Rome',
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
  launched_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS email_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  emails TEXT[] NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  unlayer_design JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

SELECT 'Tabelle base create!' as result;