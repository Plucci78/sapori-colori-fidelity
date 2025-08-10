-- Sistema completo notifiche per dashboard professionale

-- Tabella storico notifiche inviate
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_type TEXT NOT NULL, -- 'all', 'level', 'individual'
  target_value TEXT, -- nome livello o array customer IDs
  recipients_count INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_by TEXT, -- user che ha inviato
  
  -- Dati OneSignal
  onesignal_notification_id TEXT,
  subscription_ids TEXT[], -- array di subscription IDs
  
  -- Analytics (da aggiornare via API)
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  
  -- Opzioni avanzate
  url TEXT, -- URL di destinazione
  scheduled_for TIMESTAMP WITH TIME ZONE, -- se programmata
  status TEXT DEFAULT 'sent', -- 'sent', 'scheduled', 'failed'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella template notifiche riutilizzabili  
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'all',
  target_value TEXT,
  url TEXT,
  
  -- Metadata
  created_by TEXT,
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at ON notification_history(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_history_target_type ON notification_history(target_type);
CREATE INDEX IF NOT EXISTS idx_notification_history_status ON notification_history(status);

-- RLS policies (Row Level Security)
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Policy per permettere inserimento/lettura a tutti gli utenti autenticati
CREATE POLICY "Enable read for authenticated users" 
ON notification_history FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable insert for authenticated users" 
ON notification_history FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" 
ON notification_history FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Enable read templates for authenticated users" 
ON notification_templates FOR ALL 
TO authenticated 
USING (true);

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notification_history_updated_at ON notification_history;
CREATE TRIGGER update_notification_history_updated_at 
  BEFORE UPDATE ON notification_history 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_templates_updated_at ON notification_templates;
CREATE TRIGGER update_notification_templates_updated_at 
  BEFORE UPDATE ON notification_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();