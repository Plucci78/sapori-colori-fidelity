-- Tabella per le transazioni del wallet
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  operator VARCHAR(100) NOT NULL DEFAULT 'Sistema',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aggiungi colonna wallet_balance alla tabella customers se non esiste
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10,2) DEFAULT 0.00 CHECK (wallet_balance >= 0);

-- Aggiungi colonna nfc_card_id alla tabella customers se non esiste  
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS nfc_card_id VARCHAR(50) UNIQUE;

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_customer_id ON wallet_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_customers_nfc_card_id ON customers(nfc_card_id);

-- RLS (Row Level Security) per wallet_transactions
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Policy per wallet_transactions (tutti gli utenti autenticati possono leggere/scrivere)
DROP POLICY IF EXISTS "Allow all operations for authenticated users on wallet_transactions" ON wallet_transactions;
CREATE POLICY "Allow all operations for authenticated users on wallet_transactions" 
ON wallet_transactions FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_wallet_transactions_updated_at ON wallet_transactions;
CREATE TRIGGER update_wallet_transactions_updated_at 
BEFORE UPDATE ON wallet_transactions 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Commenti per documentazione
COMMENT ON TABLE wallet_transactions IS 'Tabella per tracciare tutte le transazioni del wallet clienti';
COMMENT ON COLUMN wallet_transactions.type IS 'Tipo di transazione: credit (ricarica) o debit (utilizzo)';
COMMENT ON COLUMN wallet_transactions.amount IS 'Importo della transazione (sempre positivo)';
COMMENT ON COLUMN wallet_transactions.description IS 'Descrizione della transazione';
COMMENT ON COLUMN wallet_transactions.operator IS 'Chi ha effettuato la transazione';

COMMENT ON COLUMN customers.wallet_balance IS 'Saldo attuale del wallet del cliente';
COMMENT ON COLUMN customers.nfc_card_id IS 'ID univoco della card NFC associata al cliente';