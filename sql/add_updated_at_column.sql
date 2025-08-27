-- Aggiungi colonna updated_at alla tabella email_campaigns
ALTER TABLE email_campaigns 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Messaggio di conferma
SELECT 'Colonna updated_at aggiunta con successo!' as result;