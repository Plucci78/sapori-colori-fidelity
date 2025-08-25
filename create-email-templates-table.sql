-- Tabella per templates email personalizzati
CREATE TABLE IF NOT EXISTS email_custom_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  blocks JSONB NOT NULL DEFAULT '[]',
  preview_html TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_email_templates_created_at ON email_custom_templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_templates_name ON email_custom_templates(name);

-- Policy RLS (Row Level Security) se necessaria
ALTER TABLE email_custom_templates ENABLE ROW LEVEL SECURITY;

-- Policy per permettere a tutti gli utenti autenticati di leggere/scrivere templates
CREATE POLICY IF NOT EXISTS "Users can manage email templates" ON email_custom_templates
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_update_email_templates_updated_at
    BEFORE UPDATE ON email_custom_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_email_templates_updated_at();

-- Inserimento templates di esempio
INSERT INTO email_custom_templates (name, description, blocks, preview_html) VALUES 
(
  'Benvenuto Semplice', 
  'Template di benvenuto base per nuovi clienti',
  '[
    {
      "id": 1,
      "type": "header",
      "props": {
        "title": "Benvenuto {{nome}}!",
        "subtitle": "Grazie per esserti registrato",
        "background": "#8B4513",
        "color": "white"
      }
    },
    {
      "id": 2,
      "type": "text", 
      "props": {
        "content": "Siamo felici di averti nella nostra famiglia Sapori & Colori!",
        "align": "center"
      }
    },
    {
      "id": 3,
      "type": "button",
      "props": {
        "text": "Scopri i vantaggi",
        "background": "#D4AF37",
        "color": "white"
      }
    }
  ]',
  '<div style="background:#8B4513;color:white;padding:20px;text-align:center;"><h1>Benvenuto {{nome}}!</h1><p>Grazie per esserti registrato</p></div><div style="padding:20px;text-align:center;"><p>Siamo felici di averti nella nostra famiglia Sapori & Colori!</p></div><div style="padding:20px;text-align:center;"><button style="background:#D4AF37;color:white;border:none;padding:15px 30px;border-radius:8px;">Scopri i vantaggi</button></div>'
) ON CONFLICT DO NOTHING;