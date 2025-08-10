-- Aggiunge colonna gender alla tabella customers

ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS gender TEXT;

-- Aggiunge commento per documentazione
COMMENT ON COLUMN customers.gender 
IS 'Sesso del cliente: male, female';

-- Verifica la struttura aggiornata
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND column_name = 'gender';