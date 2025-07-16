-- Aggiunge la colonna per l'URL del server NFC se non esiste già.
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS nfc_server_url TEXT DEFAULT 'http://192.168.1.6:3001';

-- Se non esiste NESSUNA riga nella tabella delle impostazioni,
-- ne inserisce una nuova con un UUID generato automaticamente e valori predefiniti.
-- Questo garantisce che ci sia sempre una configurazione di base.
INSERT INTO public.settings (id, points_per_euro, points_for_prize, nfc_server_url)
SELECT gen_random_uuid(), 1, 10, 'http://192.168.1.6:3001'
WHERE NOT EXISTS (SELECT 1 FROM public.settings);

-- Aggiunge un commento alla nuova colonna per futura chiarezza.
COMMENT ON COLUMN public.settings.nfc_server_url IS 'URL completo (es. http://192.168.1.1:3001) del server per il lettore NFC.';