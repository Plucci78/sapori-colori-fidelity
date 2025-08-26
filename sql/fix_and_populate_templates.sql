-- Fix email_templates table e aggiungi template di esempio

-- Aggiungi colonne mancanti
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'custom',
ADD COLUMN IF NOT EXISTS html_preview TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Rimuovi il vincolo NOT NULL da unlayer_design per compatibilità
ALTER TABLE email_templates 
ALTER COLUMN unlayer_design DROP NOT NULL;

-- Elimina eventuali template esistenti per test pulito
DELETE FROM email_templates;

-- Inserisci template di esempio
INSERT INTO email_templates (name, description, category, unlayer_design, html_preview) VALUES 

-- Template Unlayer (per campagne)
(
  'Benvenuto Nuovo Cliente', 
  'Template di benvenuto per nuovi clienti registrati', 
  'welcome',
  '{"counters":{"u_column":1,"u_row":1,"u_content_text":1,"u_content_heading":1,"u_content_button":1},"body":{"id":"body","rows":[{"id":"row-1","cells":[{"id":"column-1","contents":[{"id":"heading-1","type":"heading","values":{"containerPadding":"10px","anchor":"","headingType":"h1","fontFamily":{"label":"Arial","value":"arial,helvetica,sans-serif"},"fontSize":"32px","fontWeight":700,"textAlign":"center","lineHeight":"120%","linkStyle":{"inherit":true,"linkColor":"#0000ee","linkUnderline":true,"linkHoverColor":"#0000ee","linkHoverUnderline":true},"displayCondition":"","text":"<p><span style=\"color: #8b4513;\">Benvenuto {{nome}}!</span></p>"},"hasDeprecatedFontControls":true},{"id":"text-1","type":"text","values":{"containerPadding":"10px","anchor":"","color":"#000000","fontFamily":{"label":"Arial","value":"arial,helvetica,sans-serif"},"fontSize":"14px","fontWeight":400,"textAlign":"center","lineHeight":"140%","linkStyle":{"inherit":true,"linkColor":"#0000ee","linkUnderline":true,"linkHoverColor":"#0000ee","linkHoverUnderline":true},"displayCondition":"","text":"<p>Ti diamo il benvenuto nella famiglia Sapori &amp; Colori. Da oggi ogni tuo acquisto ti farà guadagnare preziose GEMME!</p>"},"hasDeprecatedFontControls":true},{"id":"button-1","type":"button","values":{"containerPadding":"10px","anchor":"","fontSize":"14px","fontWeight":400,"textAlign":"center","lineHeight":"120%","padding":"15px 25px","buttonColors":{"color":"#FFFFFF","backgroundColor":"#8B4513","hoverColor":"#FFFFFF","hoverBackgroundColor":"#D4AF37"},"borderRadius":"8px","linkStyle":{"inherit":false,"linkColor":"#FFFFFF","linkUnderline":false,"linkHoverColor":"#FFFFFF","linkHoverUnderline":false},"displayCondition":"","text":"Inizia Subito","href":"#"}}]}]}]}}',
  '<div style="text-align:center;padding:20px;"><h1 style="color:#8B4513;">Benvenuto {{nome}}!</h1><p>Ti diamo il benvenuto nella famiglia Sapori & Colori. Da oggi ogni tuo acquisto ti farà guadagnare preziose GEMME!</p><a href="#" style="display:inline-block;padding:15px 25px;background:#8B4513;color:white;text-decoration:none;border-radius:8px;">Inizia Subito</a></div>'
),

(
  'Newsletter Mensile', 
  'Template per newsletter con novità e promozioni', 
  'newsletter',
  '{"counters":{"u_column":1,"u_row":1,"u_content_text":2,"u_content_heading":1},"body":{"id":"body","rows":[{"id":"row-1","cells":[{"id":"column-1","contents":[{"id":"heading-1","type":"heading","values":{"containerPadding":"10px","anchor":"","headingType":"h2","fontFamily":{"label":"Arial","value":"arial,helvetica,sans-serif"},"fontSize":"28px","fontWeight":700,"textAlign":"center","lineHeight":"120%","linkStyle":{"inherit":true,"linkColor":"#0000ee","linkUnderline":true,"linkHoverColor":"#0000ee","linkHoverUnderline":true},"displayCondition":"","text":"<p><span style=\"color: #8b4513;\">Newsletter Sapori &amp; Colori</span></p>"},"hasDeprecatedFontControls":true},{"id":"text-1","type":"text","values":{"containerPadding":"10px","anchor":"","color":"#000000","fontFamily":{"label":"Arial","value":"arial,helvetica,sans-serif"},"fontSize":"16px","fontWeight":400,"textAlign":"left","lineHeight":"150%","linkStyle":{"inherit":true,"linkColor":"#0000ee","linkUnderline":true,"linkHoverColor":"#0000ee","linkHoverUnderline":true},"displayCondition":"","text":"<p><strong>Ciao {{nome}},</strong></p><p>Ecco le novità di questo mese dal nostro ristorante:</p>"},"hasDeprecatedFontControls":true},{"id":"text-2","type":"text","values":{"containerPadding":"10px","anchor":"","color":"#000000","fontFamily":{"label":"Arial","value":"arial,helvetica,sans-serif"},"fontSize":"14px","fontWeight":400,"textAlign":"left","lineHeight":"150%","linkStyle":{"inherit":true,"linkColor":"#0000ee","linkUnderline":true,"linkHoverColor":"#0000ee","linkHoverUnderline":true},"displayCondition":"","text":"<ul><li>Nuovi piatti della tradizione siciliana</li><li>Menu degustazione primaverile</li><li>Eventi speciali del weekend</li></ul>"},"hasDeprecatedFontControls":true}}]}]}]}}',
  '<div style="padding:20px;"><h2 style="color:#8B4513;text-align:center;">Newsletter Sapori & Colori</h2><p><strong>Ciao {{nome}},</strong></p><p>Ecco le novità di questo mese dal nostro ristorante:</p><ul><li>Nuovi piatti della tradizione siciliana</li><li>Menu degustazione primaverile</li><li>Eventi speciali del weekend</li></ul></div>'
),

(
  'Promozione Speciale', 
  'Template per offerte e promozioni limitate', 
  'promotions',
  '{"counters":{"u_column":1,"u_row":1,"u_content_text":1,"u_content_heading":2,"u_content_button":1},"body":{"id":"body","rows":[{"id":"row-1","cells":[{"id":"column-1","contents":[{"id":"heading-1","type":"heading","values":{"containerPadding":"10px","anchor":"","headingType":"h1","fontFamily":{"label":"Arial","value":"arial,helvetica,sans-serif"},"fontSize":"36px","fontWeight":700,"textAlign":"center","lineHeight":"120%","linkStyle":{"inherit":true,"linkColor":"#0000ee","linkUnderline":true,"linkHoverColor":"#0000ee","linkHoverUnderline":true},"displayCondition":"","text":"<p><span style=\"color: #d4af37;\">OFFERTA SPECIALE!</span></p>"},"hasDeprecatedFontControls":true},{"id":"heading-2","type":"heading","values":{"containerPadding":"10px","anchor":"","headingType":"h3","fontFamily":{"label":"Arial","value":"arial,helvetica,sans-serif"},"fontSize":"20px","fontWeight":400,"textAlign":"center","lineHeight":"120%","linkStyle":{"inherit":true,"linkColor":"#0000ee","linkUnderline":true,"linkHoverColor":"#0000ee","linkHoverUnderline":true},"displayCondition":"","text":"<p>Solo per te, {{nome}}</p>"},"hasDeprecatedFontControls":true},{"id":"text-1","type":"text","values":{"containerPadding":"10px","anchor":"","color":"#000000","fontFamily":{"label":"Arial","value":"arial,helvetica,sans-serif"},"fontSize":"16px","fontWeight":400,"textAlign":"center","lineHeight":"150%","linkStyle":{"inherit":true,"linkColor":"#0000ee","linkUnderline":true,"linkHoverColor":"#0000ee","linkHoverUnderline":true},"displayCondition":"","text":"<p><strong>Sconto del 20%</strong> su tutti i piatti del menu. Offerta valida fino al {{data_scadenza}}.</p>"},"hasDeprecatedFontControls":true},{"id":"button-1","type":"button","values":{"containerPadding":"10px","anchor":"","fontSize":"16px","fontWeight":700,"textAlign":"center","lineHeight":"120%","padding":"20px 40px","buttonColors":{"color":"#FFFFFF","backgroundColor":"#D4AF37","hoverColor":"#FFFFFF","hoverBackgroundColor":"#8B4513"},"borderRadius":"12px","linkStyle":{"inherit":false,"linkColor":"#FFFFFF","linkUnderline":false,"linkHoverColor":"#FFFFFF","linkHoverUnderline":false},"displayCondition":"","text":"Prenota Ora","href":"#"}}]}]}]}}',
  '<div style="text-align:center;padding:20px;background:linear-gradient(135deg,#f8f9fa,#e9ecef);"><h1 style="color:#D4AF37;margin:0;">OFFERTA SPECIALE!</h1><h3 style="color:#333;margin:10px 0;">Solo per te, {{nome}}</h3><p style="font-size:16px;"><strong>Sconto del 20%</strong> su tutti i piatti del menu. Offerta valida fino al {{data_scadenza}}.</p><a href="#" style="display:inline-block;padding:20px 40px;background:#D4AF37;color:white;text-decoration:none;border-radius:12px;font-weight:700;">Prenota Ora</a></div>'
),

-- Template Drag-and-Drop (per backward compatibility)
(
  'Template Drag & Drop Base', 
  'Template di base per il sistema drag and drop', 
  'drag_drop',
  '{"blocks": [{"id": 1, "type": "header", "props": {"title": "Ciao {{nome}}!", "background": "#8B4513", "color": "white"}}, {"id": 2, "type": "text", "props": {"content": "Questo è un template creato con il sistema drag and drop."}}]}',
  '<div style="background:#8B4513;color:white;padding:20px;text-align:center;"><h1>Ciao {{nome}}!</h1></div><div style="padding:20px;"><p>Questo è un template creato con il sistema drag and drop.</p></div>'
);

SELECT 'Template table fixed and sample templates added!' as result;