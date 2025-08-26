-- Fix email_templates table - add missing columns

ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'custom',
ADD COLUMN IF NOT EXISTS html_preview TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add some sample data for testing
INSERT INTO email_templates (name, description, category, unlayer_design, html_preview) VALUES 
('Welcome Email', 'Template di benvenuto per nuovi clienti', 'welcome', '{}', '<h1>Benvenuto!</h1><p>Grazie per esserti iscritto.</p>'),
('Newsletter', 'Template per newsletter mensile', 'newsletter', '{}', '<h2>Newsletter</h2><p>Le ultime novità dal nostro ristorante.</p>'),
('Promozioni', 'Template per offerte speciali', 'promotions', '{}', '<h2>Offerta Speciale!</h2><p>Sconto del 20% su tutti i piatti.</p>')
ON CONFLICT (id) DO NOTHING;

SELECT 'Template table fixed and sample data added!' as result;