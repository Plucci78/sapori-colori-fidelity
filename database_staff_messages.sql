-- ===================================
-- SISTEMA CHAT STAFF - COMUNICAZIONI INTERNE
-- ===================================

-- Tabella per i messaggi dello staff
CREATE TABLE IF NOT EXISTS staff_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Contenuto messaggio
    message TEXT NOT NULL,
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Relazioni
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL = messaggio per tutti
    
    -- Metadati
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'read', 'archived')),
    
    -- Dati extra
    metadata JSONB DEFAULT '{}',
    
    -- Indici per performance
    CONSTRAINT valid_user_references CHECK (from_user_id IS NOT NULL)
);

-- Indici per ottimizzazione query
CREATE INDEX IF NOT EXISTS idx_staff_messages_customer ON staff_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_staff_messages_to_user ON staff_messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_messages_status ON staff_messages(status);
CREATE INDEX IF NOT EXISTS idx_staff_messages_created ON staff_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_messages_unread ON staff_messages(to_user_id, status) WHERE status = 'pending';

-- Politiche RLS (Row Level Security)
ALTER TABLE staff_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Gli utenti possono vedere i messaggi diretti a loro o messaggi generali
CREATE POLICY "staff_can_view_messages" ON staff_messages
    FOR SELECT USING (
        auth.uid() = to_user_id OR 
        to_user_id IS NULL OR 
        auth.uid() = from_user_id
    );

-- Policy: Gli utenti possono creare messaggi
CREATE POLICY "staff_can_create_messages" ON staff_messages
    FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Policy: Gli utenti possono aggiornare solo i propri messaggi o marcare come letti quelli diretti a loro
CREATE POLICY "staff_can_update_messages" ON staff_messages
    FOR UPDATE USING (
        auth.uid() = from_user_id OR 
        (auth.uid() = to_user_id AND status = 'pending')
    );

-- Funzione per ottenere messaggi non letti per un utente
CREATE OR REPLACE FUNCTION get_unread_messages_count(user_id UUID DEFAULT auth.uid())
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM staff_messages 
        WHERE (to_user_id = user_id OR to_user_id IS NULL) 
        AND status = 'pending'
        AND from_user_id != user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per marcare messaggi come letti
CREATE OR REPLACE FUNCTION mark_messages_as_read(customer_id_param UUID, user_id UUID DEFAULT auth.uid())
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE staff_messages 
    SET status = 'read', read_at = NOW()
    WHERE customer_id = customer_id_param
    AND (to_user_id = user_id OR to_user_id IS NULL)
    AND status = 'pending'
    AND from_user_id != user_id;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View per messaggi con informazioni utente
CREATE OR REPLACE VIEW staff_messages_with_users AS
SELECT 
    sm.*,
    cu.email as customer_email,
    cu.name as customer_name,
    fu.email as from_user_email,
    tu.email as to_user_email,
    EXTRACT(EPOCH FROM (NOW() - sm.created_at)) as age_seconds
FROM staff_messages sm
LEFT JOIN customers cu ON sm.customer_id = cu.id
LEFT JOIN auth.users fu ON sm.from_user_id = fu.id  
LEFT JOIN auth.users tu ON sm.to_user_id = tu.id
ORDER BY sm.created_at DESC;

-- Trigger per notifiche real-time (se necessario)
CREATE OR REPLACE FUNCTION notify_new_message() 
RETURNS TRIGGER AS $$
BEGIN
    -- Notifica real-time quando viene creato un nuovo messaggio
    PERFORM pg_notify(
        'new_staff_message',
        json_build_object(
            'message_id', NEW.id,
            'customer_id', NEW.customer_id,
            'to_user_id', NEW.to_user_id,
            'priority', NEW.priority
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER staff_message_notification
    AFTER INSERT ON staff_messages
    FOR EACH ROW EXECUTE FUNCTION notify_new_message();

-- Inserimento dati di test (opzionale)
INSERT INTO staff_messages (message, customer_id, from_user_id, to_user_id, priority) 
SELECT 
    'Messaggio di test per comunicazioni staff',
    (SELECT id FROM customers LIMIT 1),
    (SELECT id FROM auth.users LIMIT 1),
    NULL,
    'normal'
WHERE EXISTS (SELECT 1 FROM customers) AND EXISTS (SELECT 1 FROM auth.users);

-- Commenti per documentazione
COMMENT ON TABLE staff_messages IS 'Messaggi e comunicazioni interne tra membri dello staff';
COMMENT ON COLUMN staff_messages.to_user_id IS 'NULL = messaggio per tutti gli operatori';
COMMENT ON COLUMN staff_messages.priority IS 'Priorità: low, normal, high, urgent';
COMMENT ON COLUMN staff_messages.status IS 'Stato: pending, read, archived';