-- Tabella per eventi pioggia gemme (comunicazione gestionale -> portale)
CREATE TABLE IF NOT EXISTS gemme_events (
  id SERIAL PRIMARY KEY,
  customer_id INT REFERENCES customers(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL DEFAULT 'gemme_gained',
  points_earned INT NOT NULL,
  transaction_amount DECIMAL(10,2),
  is_processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indice per query veloci
CREATE INDEX IF NOT EXISTS idx_gemme_events_customer_processed 
ON gemme_events(customer_id, is_processed, created_at DESC);

-- Commenti per documentazione
COMMENT ON TABLE gemme_events IS 'Eventi per sincronizzazione pioggia gemme tra gestionale e portale';
COMMENT ON COLUMN gemme_events.customer_id IS 'ID del cliente che ha guadagnato le gemme';
COMMENT ON COLUMN gemme_events.event_type IS 'Tipo evento: gemme_gained, level_up, bonus, etc.';
COMMENT ON COLUMN gemme_events.points_earned IS 'Numero di punti/gemme guadagnate';
COMMENT ON COLUMN gemme_events.transaction_amount IS 'Importo acquisto che ha generato le gemme';
COMMENT ON COLUMN gemme_events.is_processed IS 'Se true, evento già mostrato nel portale';