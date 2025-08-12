-- Tabella per le landing pages create con GrapesJS Page Builder
-- Eseguire questo script nel SQL Editor di Supabase

CREATE TABLE IF NOT EXISTS landing_pages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Dati base
  title VARCHAR(200) NOT NULL,
  description TEXT,
  slug VARCHAR(100) UNIQUE NOT NULL,
  
  -- Contenuto
  html_content TEXT NOT NULL,
  css_content TEXT DEFAULT '',
  grapesjs_data JSONB DEFAULT '{}',
  
  -- SEO
  meta_title VARCHAR(200),
  meta_description TEXT,
  
  -- Stato
  is_published BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Analytics
  view_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_landing_pages_published ON landing_pages(is_published, is_active);
CREATE INDEX IF NOT EXISTS idx_landing_pages_created_at ON landing_pages(created_at DESC);

-- RLS (Row Level Security) - Permetti lettura pubblica per landing pages pubblicate
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;

-- Policy per lettura pubblica delle landing pages pubblicate
CREATE POLICY "Lettura pubblica landing pages pubblicate" ON landing_pages
  FOR SELECT USING (is_published = true AND is_active = true);

-- Policy per gestione admin (inserimento, aggiornamento, eliminazione)
-- Nota: Configurare in base al sistema di autenticazione
CREATE POLICY "Admin gestione landing pages" ON landing_pages
  FOR ALL USING (true); -- Temporaneo: permetti tutto

-- Commenti sulla tabella
COMMENT ON TABLE landing_pages IS 'Landing pages create con GrapesJS Page Builder per Sapori & Colori';
COMMENT ON COLUMN landing_pages.grapesjs_data IS 'JSON con configurazione GrapesJS per editing';
COMMENT ON COLUMN landing_pages.slug IS 'URL-friendly identifier per la landing page';
COMMENT ON COLUMN landing_pages.view_count IS 'Numero di visualizzazioni della landing page';
COMMENT ON COLUMN landing_pages.click_count IS 'Numero di click sui CTA della landing page';