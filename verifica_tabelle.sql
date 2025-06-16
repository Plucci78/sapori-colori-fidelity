-- ===================================
-- SCRIPT DI VERIFICA - TABELLE ESISTENTI
-- ===================================

-- Controlla se la tabella email_logs esiste
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'email_logs'
) AS email_logs_exists;

-- Lista tutte le tabelle esistenti
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Se email_logs esiste, mostra la sua struttura
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'email_logs' 
AND table_schema = 'public'
ORDER BY ordinal_position;
