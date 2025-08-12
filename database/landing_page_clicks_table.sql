-- Tabella per tracciare click dettagliati sulle landing pages (opzionale per analytics avanzate)
-- Eseguire questo script nel SQL Editor di Supabase DOPO aver creato la tabella landing_pages

CREATE TABLE IF NOT EXISTS landing_page_clicks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Relazione con landing page
  landing_page_id UUID REFERENCES landing_pages(id) ON DELETE CASCADE,
  
  -- Dati del click
  element_text VARCHAR(100),
  element_href VARCHAR(500),
  
  -- Dati sessione
  user_agent VARCHAR(500),
  ip_address INET,
  
  -- Timestamp
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_landing_page_clicks_page_id ON landing_page_clicks(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_landing_page_clicks_clicked_at ON landing_page_clicks(clicked_at DESC);

-- RLS
ALTER TABLE landing_page_clicks ENABLE ROW LEVEL SECURITY;

-- Policy per inserimento (permetti a tutti per tracking)
CREATE POLICY "Inserimento click tracking" ON landing_page_clicks
  FOR INSERT WITH CHECK (true);

-- Policy per lettura admin
CREATE POLICY "Admin lettura click analytics" ON landing_page_clicks
  FOR SELECT USING (true); -- Configurare in base al sistema di autenticazione

-- Commenti
COMMENT ON TABLE landing_page_clicks IS 'Analytics dettagliate dei click sulle landing pages';
COMMENT ON COLUMN landing_page_clicks.element_text IS 'Testo dell elemento cliccato';
COMMENT ON COLUMN landing_page_clicks.element_href IS 'URL dell elemento cliccato se link';