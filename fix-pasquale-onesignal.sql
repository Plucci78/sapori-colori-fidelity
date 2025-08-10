-- Aggiorna OneSignal IDs corretti per Pasquale
-- Da eseguire una sola volta

-- Prima aggiungi la colonna se non esiste
ALTER TABLE customers ADD COLUMN IF NOT EXISTS onesignal_subscription_id TEXT;

-- Aggiorna gli ID OneSignal corretti per Pasquale
UPDATE customers 
SET 
  onesignal_player_id = 'dd25f77d-dfab-4e28-8c89-d3a6a9a55b28',
  onesignal_subscription_id = '93b3efb8-3845-46dc-bbe9-23aaa0e7947e'
WHERE id = '3a6c6c13-ce52-436d-8d94-c045e8e2c5d6';

-- Verifica l'aggiornamento
SELECT 
  name, 
  onesignal_player_id,
  onesignal_subscription_id
FROM customers 
WHERE id = '3a6c6c13-ce52-436d-8d94-c045e8e2c5d6';