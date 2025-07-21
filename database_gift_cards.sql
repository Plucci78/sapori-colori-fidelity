-- ===================================
-- GIFT CARDS DATABASE SCHEMA
-- Sistema completo per gestione gift card digitali
-- ===================================

-- Tabella principale gift cards
CREATE TABLE IF NOT EXISTS gift_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL, -- Codice univoco della gift card (es: GC12345ABCD)
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0), -- Valore originale della gift card
  balance DECIMAL(10,2) NOT NULL CHECK (balance >= 0), -- Saldo disponibile attuale
  
  -- INFORMAZIONI ACQUIRENTE (chi ha comprato la gift card)
  purchaser_customer_id UUID REFERENCES customers(id) NOT NULL, -- Cliente che ha acquistato
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Data acquisto
  purchase_amount DECIMAL(10,2) NOT NULL, -- Importo pagato per l'acquisto
  
  -- Informazioni destinatario (chi riceverà la gift card)
  recipient_name VARCHAR(255) NOT NULL,
  recipient_email VARCHAR(255),
  message TEXT, -- Messaggio personalizzato
  
  -- Stato e scadenza
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE, -- Data di scadenza (opzionale)
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id), -- Operatore che ha registrato l'acquisto
  used_at TIMESTAMP WITH TIME ZONE, -- Quando è stata completamente utilizzata
  
  -- Indici per performance
  CONSTRAINT balance_not_exceed_amount CHECK (balance <= amount)
);

-- Tabella transazioni gift card (per tracciare utilizzi parziali)
CREATE TABLE IF NOT EXISTS gift_card_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gift_card_id UUID REFERENCES gift_cards(id) ON DELETE CASCADE,
  
  -- Dettagli transazione
  amount DECIMAL(10,2) NOT NULL, -- Importo utilizzato (negativo per utilizzi, positivo per rimborsi)
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('use', 'refund', 'adjustment')),
  
  -- Collegamento alla vendita (se applicabile)
  customer_id UUID REFERENCES customers(id),
  sale_reference VARCHAR(255), -- Riferimento alla vendita/transazione
  
  -- Descrizione e metadata
  description TEXT,
  processed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- INDICI PER PERFORMANCE
-- ===================================

CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON gift_cards(code);
CREATE INDEX IF NOT EXISTS idx_gift_cards_status ON gift_cards(status);
CREATE INDEX IF NOT EXISTS idx_gift_cards_expires_at ON gift_cards(expires_at);
CREATE INDEX IF NOT EXISTS idx_gift_cards_created_at ON gift_cards(created_at);
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_card_id ON gift_card_transactions(gift_card_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_customer_id ON gift_card_transactions(customer_id);

-- ===================================
-- ROW LEVEL SECURITY (RLS)
-- ===================================

ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_card_transactions ENABLE ROW LEVEL SECURITY;

-- Policy per gift_cards - tutti gli utenti autenticati possono vedere tutte le gift card
CREATE POLICY "Allow all operations on gift_cards for authenticated users" ON gift_cards
  FOR ALL USING (auth.role() = 'authenticated');

-- Policy per gift_card_transactions - tutti gli utenti autenticati possono vedere tutte le transazioni
CREATE POLICY "Allow all operations on gift_card_transactions for authenticated users" ON gift_card_transactions
  FOR ALL USING (auth.role() = 'authenticated');

-- ===================================
-- FUNZIONI UTILITY
-- ===================================

-- Funzione per utilizzare una gift card
CREATE OR REPLACE FUNCTION use_gift_card(
  card_code VARCHAR(20),
  use_amount DECIMAL(10,2),
  customer_id_param UUID DEFAULT NULL,
  sale_ref VARCHAR(255) DEFAULT NULL,
  description_param TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  card_record gift_cards%ROWTYPE;
  new_balance DECIMAL(10,2);
  result JSON;
BEGIN
  -- Trova e blocca la gift card
  SELECT * INTO card_record
  FROM gift_cards
  WHERE code = card_code AND status = 'active'
  FOR UPDATE;
  
  -- Verifica che la gift card esista
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Gift card non trovata o non attiva',
      'code', 'CARD_NOT_FOUND'
    );
  END IF;
  
  -- Verifica che non sia scaduta
  IF card_record.expires_at IS NOT NULL AND card_record.expires_at < NOW() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Gift card scaduta',
      'code', 'CARD_EXPIRED'
    );
  END IF;
  
  -- Verifica che l'importo non superi il saldo disponibile
  IF use_amount > card_record.balance THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Saldo insufficiente',
      'code', 'INSUFFICIENT_BALANCE',
      'available_balance', card_record.balance
    );
  END IF;
  
  -- Calcola il nuovo saldo
  new_balance := card_record.balance - use_amount;
  
  -- Aggiorna il saldo della gift card
  UPDATE gift_cards 
  SET 
    balance = new_balance,
    status = CASE WHEN new_balance = 0 THEN 'used' ELSE 'active' END,
    used_at = CASE WHEN new_balance = 0 THEN NOW() ELSE used_at END
  WHERE id = card_record.id;
  
  -- Registra la transazione
  INSERT INTO gift_card_transactions (
    gift_card_id,
    amount,
    transaction_type,
    customer_id,
    sale_reference,
    description,
    processed_by
  ) VALUES (
    card_record.id,
    -use_amount, -- Negativo perché è un utilizzo
    'use',
    customer_id_param,
    sale_ref,
    COALESCE(description_param, 'Utilizzo gift card'),
    auth.uid()
  );
  
  -- Restituisci il risultato
  RETURN json_build_object(
    'success', true,
    'used_amount', use_amount,
    'remaining_balance', new_balance,
    'card_status', CASE WHEN new_balance = 0 THEN 'used' ELSE 'active' END
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Errore durante l''utilizzo della gift card: ' || SQLERRM,
      'code', 'PROCESSING_ERROR'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per verificare il saldo di una gift card
CREATE OR REPLACE FUNCTION check_gift_card_balance(card_code VARCHAR(20))
RETURNS JSON AS $$
DECLARE
  card_record gift_cards%ROWTYPE;
BEGIN
  SELECT * INTO card_record
  FROM gift_cards
  WHERE code = card_code;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Gift card non trovata',
      'code', 'CARD_NOT_FOUND'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'code', card_record.code,
    'balance', card_record.balance,
    'original_amount', card_record.amount,
    'status', card_record.status,
    'expires_at', card_record.expires_at,
    'recipient_name', card_record.recipient_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- TRIGGER PER AGGIORNAMENTO AUTOMATICO STATO
-- ===================================

-- Trigger per marcare automaticamente come scadute le gift card
CREATE OR REPLACE FUNCTION update_expired_gift_cards()
RETURNS TRIGGER AS $$
BEGIN
  -- Aggiorna tutte le gift card scadute
  UPDATE gift_cards 
  SET status = 'expired'
  WHERE expires_at < NOW() 
    AND status = 'active';
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Crea un trigger che viene eseguito periodicamente (o si può usare pg_cron)
-- Per ora creiamo una funzione che può essere chiamata manualmente o via cron

-- ===================================
-- VIEW PER REPORTING
-- ===================================

-- Vista per statistiche gift card
CREATE OR REPLACE VIEW gift_card_stats AS
SELECT 
  COUNT(*) as total_cards,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_cards,
  COUNT(CASE WHEN status = 'used' THEN 1 END) as used_cards,
  COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_cards,
  SUM(amount) as total_value_issued,
  SUM(balance) as total_balance_remaining,
  SUM(amount - balance) as total_value_used,
  AVG(amount) as average_card_value
FROM gift_cards;

-- Vista per transazioni dettagliate con dati acquirente
CREATE OR REPLACE VIEW gift_card_usage_report AS
SELECT 
  gc.code,
  gc.recipient_name,
  gc.amount as original_amount,
  gc.balance as current_balance,
  gc.status,
  gc.purchase_date,
  gc.purchase_amount,
  gc.created_at as issued_date,
  gc.expires_at,
  purchaser.name as purchaser_name,
  purchaser.email as purchaser_email,
  gct.amount as transaction_amount,
  gct.transaction_type,
  gct.description as transaction_description,
  gct.created_at as transaction_date,
  usage_customer.name as usage_customer_name
FROM gift_cards gc
LEFT JOIN customers purchaser ON gc.purchaser_customer_id = purchaser.id
LEFT JOIN gift_card_transactions gct ON gc.id = gct.gift_card_id
LEFT JOIN customers usage_customer ON gct.customer_id = usage_customer.id
ORDER BY gc.purchase_date DESC, gct.created_at DESC;

-- ===================================
-- GRANT PERMISSIONS
-- ===================================

-- Concedi permessi sulle tabelle
GRANT ALL ON gift_cards TO authenticated;
GRANT ALL ON gift_card_transactions TO authenticated;

-- Concedi permessi sulle funzioni
GRANT EXECUTE ON FUNCTION use_gift_card(VARCHAR(20), DECIMAL(10,2), UUID, VARCHAR(255), TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_gift_card_balance(VARCHAR(20)) TO authenticated;

-- Concedi permessi sulle viste
GRANT SELECT ON gift_card_stats TO authenticated;
GRANT SELECT ON gift_card_usage_report TO authenticated;

-- Tabella per registrare le ricevute stampate
CREATE TABLE IF NOT EXISTS gift_card_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gift_card_id UUID REFERENCES gift_cards(id) ON DELETE CASCADE,
  
  -- Dettagli stampa
  receipt_type VARCHAR(20) DEFAULT 'courtesy' CHECK (receipt_type IN ('courtesy', 'gift_card', 'transaction')),
  printed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  printed_by UUID REFERENCES auth.users(id),
  
  -- Metadata della ricevuta
  receipt_data JSONB, -- Contiene i dati della ricevuta al momento della stampa
  notes VARCHAR(500),
  
  -- Indici
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_gift_card_receipts_card_id ON gift_card_receipts(gift_card_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_receipts_printed_at ON gift_card_receipts(printed_at);
CREATE INDEX IF NOT EXISTS idx_gift_card_receipts_type ON gift_card_receipts(receipt_type);

-- RLS per la tabella ricevute
ALTER TABLE gift_card_receipts ENABLE ROW LEVEL SECURITY;

-- Policy per gift_card_receipts
CREATE POLICY "Allow all operations on gift_card_receipts for authenticated users" ON gift_card_receipts
  FOR ALL USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON gift_card_receipts TO authenticated;

-- ===================================
-- DATI DI TEST (OPZIONALE)
-- ===================================

-- Inserisci alcune gift card di esempio per testing
-- INSERT INTO gift_cards (code, amount, balance, recipient_name, recipient_email, message)
-- VALUES 
--   ('GC123EXAMPLE', 50.00, 50.00, 'Mario Rossi', 'mario@esempio.com', 'Buon compleanno!'),
--   ('GC456SAMPLE', 100.00, 75.00, 'Anna Verdi', 'anna@esempio.com', 'Congratulazioni!'),
--   ('GC789TEST', 25.00, 0.00, 'Luigi Bianchi', NULL, NULL);

COMMIT;