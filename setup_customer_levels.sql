-- ============================================
-- SCRIPT DI VERIFICA E CREAZIONE TABELLA CUSTOMER_LEVELS
-- Per il sistema di livelli cliente Sapori & Colori
-- ============================================

-- 1. Verifica se la tabella esiste già
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'customer_levels'
) AS table_exists;

-- 2. Crea la tabella customer_levels se non esiste
CREATE TABLE IF NOT EXISTS customer_levels (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  min_gems INTEGER NOT NULL DEFAULT 0,
  max_gems INTEGER NULL,
  primary_color VARCHAR(7) NOT NULL DEFAULT '#6366f1',
  background_gradient TEXT NULL,
  icon_svg TEXT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crea indici per ottimizzare le query
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_levels_sort 
ON customer_levels(sort_order) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_customer_levels_active 
ON customer_levels(active);

CREATE INDEX IF NOT EXISTS idx_customer_levels_gems 
ON customer_levels(min_gems, max_gems) WHERE active = true;

-- 4. Trigger per aggiornare automaticamente updated_at
CREATE OR REPLACE FUNCTION update_customer_levels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_customer_levels_updated_at ON customer_levels;
CREATE TRIGGER trigger_customer_levels_updated_at
    BEFORE UPDATE ON customer_levels
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_levels_updated_at();

-- 5. Inserisci livelli di default se la tabella è vuota
INSERT INTO customer_levels (name, min_gems, max_gems, primary_color, background_gradient, sort_order, active) 
SELECT * FROM (VALUES
  ('Bronzo', 0, 99, '#CD7F32', 'linear-gradient(135deg, #CD7F32 0%, #B8860B 100%)', 1, true),
  ('Argento', 100, 299, '#C0C0C0', 'linear-gradient(135deg, #C0C0C0 0%, #A9A9A9 100%)', 2, true),
  ('Oro', 300, 599, '#FFD700', 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', 3, true),
  ('Platino', 600, 999, '#E5E4E2', 'linear-gradient(135deg, #E5E4E2 0%, #D3D3D3 100%)', 4, true),
  ('Diamante', 1000, NULL, '#B9F2FF', 'linear-gradient(135deg, #B9F2FF 0%, #00BFFF 100%)', 5, true)
) AS new_levels(name, min_gems, max_gems, primary_color, background_gradient, sort_order, active)
WHERE NOT EXISTS (SELECT 1 FROM customer_levels LIMIT 1);

-- 6. Verifica che i livelli siano stati inseriti correttamente
SELECT 
  id,
  name,
  min_gems,
  max_gems,
  primary_color,
  sort_order,
  active,
  created_at
FROM customer_levels 
ORDER BY sort_order;

-- 7. Query di test per verificare la logica dei livelli
-- Test: Cliente con 50 GEMME dovrebbe essere livello "Bronzo"
WITH test_customer AS (
  SELECT 50 AS gemme_points
),
customer_level AS (
  SELECT cl.*
  FROM customer_levels cl, test_customer tc
  WHERE cl.active = true
    AND tc.gemme_points >= cl.min_gems
    AND (cl.max_gems IS NULL OR tc.gemme_points <= cl.max_gems)
  ORDER BY cl.sort_order
  LIMIT 1
)
SELECT 
  'Test: 50 GEMME' AS test_case,
  COALESCE(cl.name, 'Nessun livello') AS livello_risultato,
  cl.min_gems,
  cl.max_gems
FROM customer_level cl
UNION ALL
-- Test: Cliente con 250 GEMME dovrebbe essere livello "Argento"  
SELECT 
  'Test: 250 GEMME' AS test_case,
  COALESCE(cl.name, 'Nessun livello') AS livello_risultato,
  cl.min_gems,
  cl.max_gems
FROM customer_levels cl
WHERE cl.active = true
  AND 250 >= cl.min_gems
  AND (cl.max_gems IS NULL OR 250 <= cl.max_gems)
ORDER BY cl.sort_order
LIMIT 1;

-- 8. Verifica integrazione con tabella customers (se esiste)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers') THEN
    -- Mostra alcuni clienti con il loro livello calcolato
    RAISE NOTICE 'Tabella customers trovata. Test integrazione livelli...';
    
    PERFORM 1; -- Placeholder per query di test
    
    -- Query di esempio per mostrare clienti con livelli
    /*
    SELECT 
      c.id,
      c.full_name,
      COALESCE(c.gemme_points, c.points, 0) AS punti_totali,
      cl.name AS livello_attuale,
      cl.primary_color,
      cl.min_gems,
      cl.max_gems
    FROM customers c
    LEFT JOIN customer_levels cl ON (
      cl.active = true
      AND COALESCE(c.gemme_points, c.points, 0) >= cl.min_gems
      AND (cl.max_gems IS NULL OR COALESCE(c.gemme_points, c.points, 0) <= cl.max_gems)
    )
    ORDER BY COALESCE(c.gemme_points, c.points, 0) DESC, c.full_name
    LIMIT 10;
    */
    
  ELSE
    RAISE NOTICE 'Tabella customers non trovata. Sistema livelli pronto per integrazione futura.';
  END IF;
END $$;

-- 9. Messaggio di conferma
SELECT 
  'Setup completato!' AS messaggio,
  COUNT(*) AS livelli_creati,
  MIN(min_gems) AS gemme_minime,
  MAX(COALESCE(max_gems, 9999)) AS gemme_massime
FROM customer_levels 
WHERE active = true;
