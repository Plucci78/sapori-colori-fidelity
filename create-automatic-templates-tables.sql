-- ===================================
-- TABELLE PER TEMPLATE AUTOMATICI
-- ===================================

-- Tabella per i template automatici personalizzati
CREATE TABLE IF NOT EXISTS automatic_templates (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabella per le milestone personalizzate
CREATE TABLE IF NOT EXISTS email_milestones (
  id SERIAL PRIMARY KEY,
  threshold INTEGER NOT NULL,
  message TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Inserisci template di default se non esistono
INSERT INTO automatic_templates (id, subject, html) VALUES 
(
  'welcome',
  'Benvenuto in Sapori & Colori, {{nome}}! 🎉',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 40px 30px; text-align: center;">
              <img src="https://jexkalekaofsfcusdfjh.supabase.co/storage/v1/object/public/tinymce-images//saporiecolorilogo2.png" alt="Sapori & Colori" style="height: 60px; margin-bottom: 10px;" />
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">Benvenuto {{nome}}!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Siamo felici di averti nella famiglia Sapori & Colori! Da oggi fai parte del nostro esclusivo programma fedeltà.
              </p>
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 30px 0;">
                <h3 style="margin: 0 0 10px 0; color: #dc2626; font-size: 18px;">Come funziona:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #4a4a4a;">
                  <li style="margin-bottom: 8px;">🛍️ 1€ speso = 1 GEMMA guadagnata</li>
                  <li style="margin-bottom: 8px;">💎 Accumula GEMME per premi esclusivi</li>
                  <li style="margin-bottom: 8px;">🎁 Offerte speciali solo per te</li>
                </ul>
              </div>
              <div style="text-align: center; margin: 40px 0;">
                <a href="#" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">Vieni a Trovarci</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>'
),
(
  'birthday',
  'Tanti auguri {{nome}}! 🎉',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 60px 30px; text-align: center;">
              <div style="font-size: 80px; margin-bottom: 20px;">🎂</div>
              <h1 style="margin: 0 0 10px 0; color: #ffffff; font-size: 36px;">Buon Compleanno {{nome}}!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 30px 0; color: #4a4a4a; font-size: 18px; line-height: 1.6; text-align: center;">
                In questo giorno speciale, Sapori & Colori vuole festeggiare con te!
              </p>
              <div style="background-color: #fef2f2; border: 2px dashed #dc2626; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0;">
                <h2 style="margin: 0 0 10px 0; color: #dc2626; font-size: 24px;">🎁 Il Nostro Regalo</h2>
                <p style="margin: 0 0 20px 0; color: #dc2626; font-size: 36px; font-weight: bold;">30% SCONTO</p>
                <p style="margin: 0; color: #4a4a4a; font-size: 16px;">Su tutto il tuo ordine di oggi!</p>
              </div>
              <div style="text-align: center; margin: 40px 0;">
                <a href="#" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">Ritira il Regalo</a>
              </div>
              <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
                Ti aspettiamo per festeggiare insieme! 🥳
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>'
),
(
  'milestone',
  '🎉 Hai raggiunto {{gemme}} GEMME!',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #1a1a1a;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #1a1a1a; padding: 20px 0;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #2a2a2a; border-radius: 8px; border: 1px solid #3a3a3a;">
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 60px 30px; text-align: center;">
              <div style="font-size: 60px; margin-bottom: 20px;">💎</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 32px;">Fantastico {{nome}}!</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 20px;">Hai {{gemme}} GEMME!</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 30px 0; color: #e0e0e0; font-size: 16px; text-align: center;">
                {{message}}
              </p>
              <div style="background-color: #1a1a1a; border-radius: 8px; padding: 30px;">
                <h3 style="margin: 0 0 15px 0; color: #dc2626; font-size: 18px; text-align: center;">🎁 I tuoi privilegi:</h3>
                <ul style="color: #e0e0e0; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>🥖 Sconto 10% su tutti i prodotti da forno</li>
                  <li>☕ Caffè gratis con ogni acquisto superiore a 15€</li>
                  <li>🍰 Accesso prioritario alle nuove ricette</li>
                  <li>📞 Possibilità di prenotare prodotti speciali</li>
                  <li>🎂 Sconto compleanno del 30% per tutto il mese</li>
                </ul>
              </div>
              <div style="text-align: center; margin: 40px 0;">
                <a href="#" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold;">Scopri i Premi</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>'
)
ON CONFLICT (id) DO NOTHING;

-- Inserisci milestone di default se non esistono
INSERT INTO email_milestones (threshold, message, enabled, order_index) VALUES 
(50, 'Complimenti! Hai dimostrato di essere un vero amante dei sapori autentici di Sapori & Colori!', true, 0),
(100, 'Incredibile! Sei entrato nel club VIP dei veri intenditori. Benvenuto tra i nostri clienti più fedeli!', true, 1),
(150, 'Sei una leggenda del buon gusto! La tua fedeltà a Sapori & Colori è straordinaria.', true, 2)
ON CONFLICT DO NOTHING;

-- Crea indici per prestazioni
CREATE INDEX IF NOT EXISTS idx_email_milestones_threshold ON email_milestones(threshold);
CREATE INDEX IF NOT EXISTS idx_email_milestones_enabled ON email_milestones(enabled);

-- Aggiungi trigger per updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_automatic_templates_updated_at BEFORE UPDATE ON automatic_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_milestones_updated_at BEFORE UPDATE ON email_milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();