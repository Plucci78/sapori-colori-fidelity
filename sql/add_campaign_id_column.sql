-- Aggiungi colonna campaign_id alla tabella email_opens
ALTER TABLE email_opens 
ADD COLUMN IF NOT EXISTS campaign_id TEXT;

-- Aggiungi colonna campaign_id alla tabella email_clicks  
ALTER TABLE email_clicks 
ADD COLUMN IF NOT EXISTS campaign_id TEXT;

-- Crea indici per performance
CREATE INDEX IF NOT EXISTS idx_email_opens_campaign_id ON email_opens(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_clicks_campaign_id ON email_clicks(campaign_id);

-- Messaggio di conferma
SELECT 'Colonna campaign_id aggiunta con successo!' as result;