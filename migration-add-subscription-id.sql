-- Aggiunge colonna per OneSignal Subscription ID
-- Mantiene onesignal_player_id per OneSignal User ID esistente

ALTER TABLE customers 
ADD COLUMN onesignal_subscription_id TEXT;

-- Aggiunge indice per performance
CREATE INDEX idx_customers_subscription_id 
ON customers(onesignal_subscription_id);

-- Commento per documentazione
COMMENT ON COLUMN customers.onesignal_subscription_id 
IS 'OneSignal Subscription ID per invio notifiche push (differente da onesignal_player_id che è OneSignal User ID)';