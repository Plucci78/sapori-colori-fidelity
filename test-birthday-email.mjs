// Test Birthday Email per pako.lucci@gmail.com
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jexkalekaofsfcusdfjh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGthbGVrYW9mc2ZjdXNkZmpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk3MDQ1NzUsImV4cCI6MjA0NTI4MDU3NX0.BTOqNg5KtNKa-wpJYnoH5xUhQlnXKRW9bSKT8XuwEU8'

const supabase = createClient(supabaseUrl, supabaseKey)

// Invia email di test compleanno
import emailjs from '@emailjs/browser'

// Template birthday email
const birthdayTemplate = `
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
              <h1 style="margin: 0 0 10px 0; color: #ffffff; font-size: 36px;">Buon Compleanno Pako!</h1>
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

// Configurazione EmailJS
const EMAIL_CONFIG = {
  serviceId: 'service_f6lj74h',
  templateId: 'template_kvxg4p9',
  publicKey: 'P0A99o_tLGsOuzhDs'
}

console.log('🎂 Invio email di test compleanno a pako.lucci@gmail.com...')

// Inizializza EmailJS
emailjs.init(EMAIL_CONFIG.publicKey)

// Parametri email
const emailParams = {
  to_name: 'Pako',
  to_email: 'pako.lucci@gmail.com',
  subject: 'Tanti auguri Pako! 🎉 - Test Email Compleanno',
  message_html: birthdayTemplate,
  reply_to: 'saporiecolori.b@gmail.com'
}

// Invia email
try {
  await emailjs.send(
    EMAIL_CONFIG.serviceId,
    EMAIL_CONFIG.templateId,
    emailParams
  )
  
  console.log('✅ Email compleanno inviata con successo!')
  console.log('📧 Controlla pako.lucci@gmail.com (anche spam)')
  
} catch (error) {
  console.error('❌ Errore invio email:', error)
}