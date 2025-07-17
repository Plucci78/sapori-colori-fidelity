// ===================================
// EMAIL TEMPLATES - SAPORI & COLORI
// File: src/components/Email/emailTemplates.js
// ===================================

// Template Email Professionali
export const emailTemplates = [
  {
    id: 'welcome',
    name: 'Benvenuto Premium',
    category: 'Onboarding',
    preview: '🎉',
    subject: 'Benvenuto in Sapori & Colori, {{nome}}!',
    html: `
<!DOCTYPE html>
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
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 40px 30px; text-align: center;">
              <img src="https://jexkalekaofsfcusdfjh.supabase.co/storage/v1/object/public/tinymce-images//saporiecolorilogo2.png" alt="Sapori & Colori" style="height: 60px; margin-bottom: 10px;" />
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">Sapori & Colori</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">Il tuo panificio di fiducia</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px;">Benvenuto {{nome}}! 🎉</h2>
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
          <!-- Footer -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 30px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #e0e0e0; font-size: 14px;">
                Via Bagaladi 9, 00132 Roma • Tel: 0639911640 • saporiecolori.net
              </p>
              <p style="margin: 0; color: #a0a0a0; font-size: 12px;">
                © 2024 Sapori & Colori. Tutti i diritti riservati.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  },
  {
    id: 'promo',
    name: 'Offerta Speciale',
    category: 'Marketing',
    preview: '🔥',
    subject: 'Offerta Speciale per te, {{nome}}!',
    html: `
<!DOCTYPE html>
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
          <!-- Header con Offerta -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 20px 30px; position: relative;">
              <div style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 8px 16px; border-radius: 4px; font-weight: bold; font-size: 14px; position: absolute; top: 20px; right: 30px;">
                OFFERTA LIMITATA
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Sapori & Colori</h1>
            </td>
          </tr>
          <!-- Hero Image -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 60px 30px; text-align: center;">
              <h2 style="margin: 0 0 10px 0; color: #ffffff; font-size: 40px; font-weight: bold;">20% SCONTO</h2>
              <p style="margin: 0; color: #ffffff; font-size: 20px;">Su tutti i prodotti da forno!</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px;">Ciao {{nome}},</p>
              <p style="margin: 0 0 30px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Come nostro cliente speciale con {{gemme}} GEMME, ti offriamo uno sconto esclusivo valido questa settimana!
              </p>
              <!-- Product Cards -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="48%" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; vertical-align: top;">
                    <h3 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 18px;">Pane Fresco</h3>
                    <p style="margin: 0 0 10px 0; color: #dc2626; font-size: 24px; font-weight: bold;">-20%</p>
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Tutti i tipi di pane</p>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; vertical-align: top;">
                    <h3 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 18px;">Dolci</h3>
                    <p style="margin: 0 0 10px 0; color: #dc2626; font-size: 24px; font-weight: bold;">-20%</p>
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Paste e torte</p>
                  </td>
                </tr>
              </table>
              <div style="text-align: center; margin: 40px 0;">
                <a href="#" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">Approfitta Ora</a>
              </div>
              <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
                *Offerta valida fino al [DATA]. Non cumulabile con altre promozioni.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  },
  {
    id: 'reward',
    name: 'Premio GEMME',
    category: 'Loyalty',
    preview: '💎',
    subject: 'Congratulazioni {{nome}}! Hai raggiunto {{gemme}} GEMME!',
    html: `
<!DOCTYPE html>
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
          <!-- Header Celebration -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 60px 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <div style="font-size: 60px; margin-bottom: 20px;">💎</div>
              <h1 style="margin: 0 0 10px 0; color: #ffffff; font-size: 32px;">Complimenti {{nome}}!</h1>
              <p style="margin: 0; color: #ffffff; font-size: 20px;">Hai raggiunto {{gemme}} GEMME!</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 30px 0; color: #e0e0e0; font-size: 16px; line-height: 1.6; text-align: center;">
                Il tuo impegno è stato premiato! Ora puoi riscattare fantastici premi.
              </p>
              <!-- Rewards Grid -->
              <div style="background-color: #1a1a1a; border-radius: 8px; padding: 30px; margin: 30px 0;">
                <h3 style="margin: 0 0 20px 0; color: #dc2626; font-size: 20px; text-align: center;">Premi Disponibili:</h3>
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="color: #e0e0e0; padding: 10px 0; border-bottom: 1px solid #3a3a3a;">
                      <span style="color: #dc2626; font-weight: bold;">50 GEMME</span> - Caffè Gratis
                    </td>
                  </tr>
                  <tr>
                    <td style="color: #e0e0e0; padding: 10px 0; border-bottom: 1px solid #3a3a3a;">
                      <span style="color: #dc2626; font-weight: bold;">100 GEMME</span> - Sconto 20%
                    </td>
                  </tr>
                  <tr>
                    <td style="color: #e0e0e0; padding: 10px 0;">
                      <span style="color: #dc2626; font-weight: bold;">150 GEMME</span> - Torta Omaggio
                    </td>
                  </tr>
                </table>
              </div>
              <div style="text-align: center; margin: 40px 0;">
                <a href="#" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">Riscatta Premio</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  },
  {
    id: 'birthday',
    name: 'Auguri Compleanno',
    category: 'Personal',
    preview: '🎂',
    subject: 'Tanti auguri {{nome}}! 🎉',
    html: `
<!DOCTYPE html>
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
          <!-- Birthday Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 60px 30px; text-align: center;">
              <div style="font-size: 80px; margin-bottom: 20px;">🎂</div>
              <h1 style="margin: 0 0 10px 0; color: #ffffff; font-size: 36px;">Buon Compleanno {{nome}}!</h1>
            </td>
          </tr>
          <!-- Content -->
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
</html>
    `
  },
  {
    id: 'newsletter',
    name: 'Newsletter Mensile',
    category: 'Info',
    preview: '📰',
    subject: 'Le novità di {{mese}} da Sapori & Colori',
    html: `
<!DOCTYPE html>
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
          <!-- Header -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 30px; border-bottom: 1px solid #3a3a3a;">
              <h1 style="margin: 0 0 10px 0; color: #dc2626; font-size: 28px;">Sapori & Colori News</h1>
              <p style="margin: 0; color: #a0a0a0; font-size: 14px;">Newsletter di {{mese}}</p>
            </td>
          </tr>
          <!-- Main Article -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 20px 0; color: #e0e0e0; font-size: 24px;">Le Novità del Mese</h2>
              <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <h3 style="margin: 0 0 10px 0; color: #dc2626; font-size: 18px;">🥖 Nuovo Pane ai Cereali</h3>
                <p style="margin: 0; color: #a0a0a0; font-size: 14px; line-height: 1.6;">
                  Abbiamo introdotto una nuova linea di pane ai cereali antichi, perfetto per chi cerca sapori autentici e genuini.
                </p>
              </div>
              <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <h3 style="margin: 0 0 10px 0; color: #dc2626; font-size: 18px;">🍰 Dolci di Stagione</h3>
                <p style="margin: 0; color: #a0a0a0; font-size: 14px; line-height: 1.6;">
                  Scopri i nostri nuovi dolci stagionali, preparati con ingredienti freschi e ricette tradizionali.
                </p>
              </div>
              <!-- Stats -->
              <div style="background-color: #3a3a3a; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
                <p style="margin: 0 0 10px 0; color: #e0e0e0; font-size: 16px;">Le tue GEMME attuali:</p>
                <p style="margin: 0; color: #dc2626; font-size: 36px; font-weight: bold;">{{gemme}} 💎</p>
              </div>
              <div style="text-align: center;">
                <a href="#" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: bold; font-size: 14px;">Visita il Negozio</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  }
];

// Blocchi Email per l'editor
export const emailBlocks = [
  {
    id: 'header',
    name: 'Header',
    icon: '📱',
    html: `<tr><td style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 32px;">Titolo Header</h1>
    </td></tr>`
  },
  {
    id: 'text',
    name: 'Testo',
    icon: '📝',
    html: `<tr><td style="padding: 20px 30px;">
      <p style="margin: 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">Inserisci il tuo testo qui...</p>
    </td></tr>`
  },
  {
    id: 'button',
    name: 'Bottone',
    icon: '🎯',
    html: `<tr><td style="padding: 20px 30px; text-align: center;">
      <a href="#" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">Call to Action</a>
    </td></tr>`
  },
  {
    id: 'image',
    name: 'Immagine',
    icon: '🖼️',
    html: `<tr><td style="padding: 20px 30px; text-align: center;">
      <img src="https://via.placeholder.com/500x300" alt="Immagine" style="max-width: 100%; height: auto; border-radius: 8px;">
    </td></tr>`
  },
  {
    id: 'divider',
    name: 'Divisore',
    icon: '➖',
    html: `<tr><td style="padding: 20px 30px;">
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0;">
    </td></tr>`
  },
  {
    id: 'card',
    name: 'Card',
    icon: '🎴',
    html: `<tr><td style="padding: 20px 30px;">
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
        <h3 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 18px;">Titolo Card</h3>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">Contenuto della card...</p>
      </div>
    </td></tr>`
  }
];

// Template automatici (per emailAutomation.js)
export const automaticTemplates = {
  welcome: {
    subject: 'Benvenuto in Sapori & Colori, {{nome}}! 🎉',
    html: emailTemplates[0].html // Riusa il template welcome
  },
  
  birthday: {
    subject: 'Tanti auguri {{nome}}! 🎉',
    html: emailTemplates[3].html // Riusa il template birthday (indice 3)
  },
  
  milestone: {
    subject: '🎉 Hai raggiunto {{gemme}} GEMME!',
    html: `
<!DOCTYPE html>
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
</html>
    `
  }
};

// Esporta tutto
export default {
  emailTemplates,
  emailBlocks,
  automaticTemplates
};