-- Aggiungi colonna external_id alla tabella customers
-- Questo permette di salvare l'External ID di OneSignal per ogni cliente

ALTER TABLE customers 
ADD COLUMN external_id UUID;

-- Aggiungi indice per performance
CREATE INDEX idx_customers_external_id ON customers(external_id);

-- Verifica la struttura aggiornata
\d customers;