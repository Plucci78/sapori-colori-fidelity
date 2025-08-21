
// /src/config/emailTemplates.js

/**
 * @description
 * Questo file centralizza i template delle email per il sistema di marketing.
 * Separare i template dal componente `EmailView` semplifica la gestione,
 * la personalizzazione e l'eventuale caricamento dinamico da un database.
 * 
 * Ogni template ha:
 * - id: Identificativo unico.
 * - name: Nome visualizzato nell'interfaccia (include un'emoji per un tocco visivo).
 * - content: Il codice HTML completo del template. Le variabili come {{nome}} e {{gemme}}
 *            vengono sostituite dinamicamente prima dell'invio.
 */

export const emailTemplates = [
  {
    id: 'welcome',
    name: '🌟 Benvenuto VIP',
    content: `
      <div style="font-family: Arial, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%);">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
          <tr>
            <td style="padding: 50px 30px; text-align: center;">
              <div style="background: rgba(255,255,255,0.15); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);">
                <span style="color: white; font-size: 24px; font-weight: bold;">SC</span>
              </div>
              <h1 style="color: white; margin: 0 0 10px 0; font-size: 32px; font-weight: 300;">Benvenuto {{nome}}!</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 18px;">Nella famiglia Sapori & Colori</p>
            </td>
          </tr>
        </table>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 20px 20px 0 0;">
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 24px; text-align: center;">Il tuo viaggio inizia qui! 🚀</h2>
              
              <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin: 20px 0;">
                <h3 style="color: #B8860B; margin: 0 0 15px 0; font-size: 18px;">Come funziona:</h3>
                <div style="display: flex; justify-content: space-between; text-align: center;">
                  <div style="flex: 1; padding: 0 10px;">
                    <div style="font-size: 24px; margin-bottom: 8px;">💎</div>
                    <p style="margin: 0; font-size: 14px; color: #4a5568;"><strong>1€ = 1 GEMMA</strong></p>
                  </div>
                  <div style="flex: 1; padding: 0 10px;">
                    <div style="font-size: 24px; margin-bottom: 8px;">🎁</div>
                    <p style="margin: 0; font-size: 14px; color: #4a5568;"><strong>Premi Esclusivi</strong></p>
                  </div>
                  <div style="flex: 1; padding: 0 10px;">
                    <div style="font-size: 24px; margin-bottom: 8px;">⭐</div>
                    <p style="margin: 0; font-size: 14px; color: #4a5568;"><strong>Status VIP</strong></p>
                  </div>
                </div>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="display: inline-block; background: linear-gradient(135deg, #D4AF37, #B8860B); color: white; padding: 15px 35px; text-decoration: none; border-radius: 25px; font-weight: 600; font-size: 16px; box-shadow: 0 8px 20px rgba(212, 175, 55, 0.4);">Scopri i Premi</a>
              </div>
              
              <div style="background: #FFF8DC; padding: 20px; border-radius: 10px; border-left: 4px solid #D4AF37;">
                <p style="margin: 0; color: #4a5568; font-size: 16px; line-height: 1.5; font-style: italic;">
                  "{{nome}}, siamo entusiasti di averti con noi. Preparati a vivere un'esperienza culinaria unica!"
                </p>
                <p style="margin: 10px 0 0 0; color: #718096; font-size: 14px; font-weight: 600;">— Il Team Sapori & Colori</p>
              </div>
            </td>
          </tr>
        </table>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #2d3748;">
          <tr>
            <td style="padding: 25px; text-align: center;">
              <p style="color: #a0aec0; margin: 0; font-size: 14px;">📍 Via Bagaladi 9, 00132 Roma • 📞 0639911640</p>
              <p style="color: #718096; margin: 8px 0 0 0; font-size: 12px;">Ti aspettiamo per la tua prima visita!</p>
            </td>
          </tr>
        </table>
      </div>
    `
  },
  {
    id: 'promo',
    name: '🔥 Super Offerta',
    content: `
      <div style="font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f8f9fa;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: white;">
          <tr>
            <td style="background: linear-gradient(45deg, #DC2626, #B91C1C); padding: 40px 30px; text-align: center; position: relative;">
              <div style="background: rgba(255,255,255,0.95); border-radius: 12px; padding: 25px; backdrop-filter: blur(10px);">
                <h1 style="color: #2d3748; margin: 0 0 8px 0; font-size: 36px; font-weight: 800;">SUPER OFFERTA</h1>
                <p style="color: #4a5568; margin: 0; font-size: 18px;">Solo per te, {{nome}}! 🎯</p>
              </div>
            </td>
          </tr>
        </table>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: white;">
          <tr>
            <td style="padding: 40px 30px;">
              <div style="background: linear-gradient(135deg, #DC2626, #B91C1C); color: white; padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 25px; position: relative; overflow: hidden;">
                <div style="position: absolute; top: -20px; right: -20px; width: 60px; height: 60px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
                <h2 style="margin: 0 0 10px 0; font-size: 42px; font-weight: 900;">20%</h2>
                <p style="margin: 0; font-size: 18px; font-weight: 300;">DI SCONTO</p>
                <div style="width: 60px; height: 2px; background: rgba(255,255,255,0.8); margin: 15px auto;"></div>
                <p style="margin: 0; font-size: 16px; opacity: 0.9;">Su tutti i prodotti da forno</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="display: inline-block; background: linear-gradient(135deg, #DC2626, #B91C1C); color: white; padding: 18px 40px; text-decoration: none; border-radius: 25px; font-weight: 700; font-size: 18px; box-shadow: 0 10px 25px rgba(220, 38, 38, 0.4); text-transform: uppercase;">Vieni Subito!</a>
              </div>
            </td>
          </tr>
        </table>
      </div>
    `
  },
  {
    id: 'milestone',
    name: '🏆 Congratulazioni',
    content: `
      <div style="font-family: Arial, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%);">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
          <tr>
            <td style="padding: 50px 30px; text-align: center;">
              <div style="width: 120px; height: 120px; background: linear-gradient(135deg, #FFA500, #FF8C00); border-radius: 50%; margin: 0 auto 25px; display: flex; align-items: center; justify-content: center; box-shadow: 0 15px 40px rgba(255, 165, 0, 0.4); position: relative;">
                <div style="width: 100px; height: 100px; background: rgba(255,255,255,0.95); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-direction: column;">
                  <span style="font-size: 24px; margin-bottom: 4px;">🏆</span>
                  <span style="color: #2d3748; font-size: 16px; font-weight: 800;">{{gemme}}</span>
                  <span style="color: #4a5568; font-size: 10px;">GEMME</span>
                </div>
              </div>
              
              <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 300;">Fantastico {{nome}}!</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 18px;">Hai raggiunto un traguardo importante</p>
            </td>
          </tr>
        </table>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 20px 20px 0 0;">
          <tr>
            <td style="padding: 40px 30px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: #2d3748; margin: 0 0 10px 0; font-size: 24px;">Traguardo Raggiunto! 🎉</h2>
                <p style="color: #718096; margin: 0; font-size: 16px;">La tua fedeltà è stata premiata con {{gemme}} GEMME</p>
              </div>
              
              <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 25px 0;">
                <h3 style="color: #2d3748; margin: 0 0 20px 0; font-size: 18px; text-align: center;">I tuoi prossimi traguardi:</h3>
                
                <div style="margin-bottom: 15px; display: flex; align-items: center;">
                  <div style="width: 15px; height: 15px; background: #48bb78; border-radius: 50%; margin-right: 15px;"></div>
                  <div>
                    <strong style="color: #2d3748;">150 GEMME</strong>
                    <span style="color: #718096; margin-left: 10px;">🎁 Regalo sorpresa + Sconto 15%</span>
                  </div>
                </div>
                
                <div style="margin-bottom: 15px; display: flex; align-items: center;">
                  <div style="width: 15px; height: 15px; background: #ed8936; border-radius: 50%; margin-right: 15px;"></div>
                  <div>
                    <strong style="color: #2d3748;">250 GEMME</strong>
                    <span style="color: #718096; margin-left: 10px;">👑 Status VIP + Accesso anticipato</span>
                  </div>
                </div>
                
                <div style="display: flex; align-items: center;">
                  <div style="width: 15px; height: 15px; background: #9f7aea; border-radius: 50%; margin-right: 15px;"></div>
                  <div>
                    <strong style="color: #2d3748;">500 GEMME</strong>
                    <span style="color: #718096; margin-left: 10px;">💎 Premio esclusivo + Evento privato</span>
                  </div>
                </div>
              </div>
              
              <div style="background: #FFF8DC; border-left: 4px solid #D4AF37; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <p style="color: #8B4513; margin: 0; font-size: 16px; line-height: 1.4; font-style: italic; text-align: center;">
                  "Ogni GEMMA racconta la storia della tua passione per i sapori autentici"
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="display: inline-block; background: linear-gradient(135deg, #D4AF37, #B8860B); color: white; padding: 15px 35px; text-decoration: none; border-radius: 25px; font-weight: 600; font-size: 16px; box-shadow: 0 8px 20px rgba(212, 175, 55, 0.4);">Continua il Viaggio</a>
              </div>
            </td>
          </tr>
        </table>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #2d3748;">
          <tr>
            <td style="padding: 25px; text-align: center;">
              <p style="color: #a0aec0; margin: 0; font-size: 14px;">Grazie per essere parte della famiglia Sapori & Colori</p>
              <p style="color: #718096; margin: 8px 0 0 0; font-size: 12px;">📍 Via Bagaladi 9, 00132 Roma • 📞 0639911640</p>
            </td>
          </tr>
        </table>
      </div>
    `
  }
];
