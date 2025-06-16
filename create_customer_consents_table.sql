-- Creazione tabella per i consensi privacy dei clienti
CREATE TABLE customer_consents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
    marketing boolean DEFAULT false,
    newsletter boolean DEFAULT false,
    profiling boolean DEFAULT false,
    fidelity boolean DEFAULT true, -- Sempre true per il programma fedeltà
    digital_signature text, -- Base64 della firma digitale (opzionale)
    consent_date timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    ip_address inet, -- IP del consenso (opzionale)
    user_agent text, -- User agent del browser (opzionale)
    
    -- Vincolo unico per customer_id
    UNIQUE(customer_id)
);

-- Indici per migliorare le performance
CREATE INDEX idx_customer_consents_customer_id ON customer_consents(customer_id);
CREATE INDEX idx_customer_consents_updated_at ON customer_consents(updated_at);

-- RLS (Row Level Security) per la sicurezza
ALTER TABLE customer_consents ENABLE ROW LEVEL SECURITY;

-- Policy per permettere lettura e scrittura agli utenti autenticati
CREATE POLICY "Allow all operations for authenticated users" ON customer_consents
    FOR ALL USING (auth.role() = 'authenticated');

-- Commenti per documentare la tabella
COMMENT ON TABLE customer_consents IS 'Gestione consensi privacy per ogni cliente del programma fedeltà';
COMMENT ON COLUMN customer_consents.marketing IS 'Consenso per comunicazioni marketing e promozionali';
COMMENT ON COLUMN customer_consents.newsletter IS 'Consenso per newsletter e aggiornamenti';
COMMENT ON COLUMN customer_consents.profiling IS 'Consenso per profilazione e offerte personalizzate';
COMMENT ON COLUMN customer_consents.fidelity IS 'Consenso per programma fedeltà (obbligatorio)';
COMMENT ON COLUMN customer_consents.digital_signature IS 'Firma digitale in formato base64 (opzionale)';
