-- Tabella per sincronizzare subscription OneSignal nel nostro database
CREATE TABLE IF NOT EXISTS onesignal_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- ID OneSignal
  subscription_id TEXT UNIQUE NOT NULL,
  onesignal_user_id TEXT,
  external_user_id TEXT,
  
  -- Info dispositivo
  device_type TEXT, -- iOS, Android, Web, etc.
  device_model TEXT,
  device_os TEXT,
  app_version TEXT,
  
  -- Dati geografici
  country TEXT,
  timezone_id TEXT,
  language TEXT,
  
  -- Stato subscription
  is_active BOOLEAN DEFAULT true,
  notification_types INTEGER,
  
  -- Date tracking
  first_session TIMESTAMP WITH TIME ZONE,
  last_session TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  
  -- Link al nostro customer
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  
  -- Metadata
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_onesignal_subscriptions_subscription_id ON onesignal_subscriptions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_onesignal_subscriptions_external_user_id ON onesignal_subscriptions(external_user_id);
CREATE INDEX IF NOT EXISTS idx_onesignal_subscriptions_customer_id ON onesignal_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_onesignal_subscriptions_is_active ON onesignal_subscriptions(is_active);

-- RLS policies
ALTER TABLE onesignal_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for authenticated users" 
ON onesignal_subscriptions FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable insert for authenticated users" 
ON onesignal_subscriptions FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" 
ON onesignal_subscriptions FOR UPDATE 
TO authenticated 
USING (true);