import emailjs from '@emailjs/browser'
import { supabase } from '../supabase'

// Configurazione EmailJS - usa la stessa dell'App
const EMAIL_CONFIG = {
  serviceId: 'service_f6lj74h',
  templateId: 'template_kvxg4p9',
  publicKey: 'P0A99o_tLGsOuzhDs'
}

export const emailService = {
  async init() {
    emailjs.init(EMAIL_CONFIG.publicKey)
  },

  async sendCampaignEmail({ subject, content, targetCustomers, campaignId, selectedTemplate, campaignData = {} }) {
    if (!subject?.trim() || !targetCustomers?.length) {
      throw new Error('Dati campagna non validi')
    }

    console.log(`📧 Invio campagna: ${subject}`)
    console.log(`👥 Destinatari: ${targetCustomers.length}`)

    let emailsSent = 0
    let emailsFailed = 0
    const results = []

    for (const customer of targetCustomers) {
      if (!customer.email) {
        console.warn(`⚠️ ${customer.name} non ha email`)
        continue
      }

      try {
        // Determina il contenuto da usare: template HTML o contenuto scritto
        let finalContent = content
        
        if (selectedTemplate && selectedTemplate.html_preview) {
          // Usa il contenuto HTML del template
          finalContent = selectedTemplate.html_preview
          console.log(`🎨 Usando template HTML: ${selectedTemplate.name}`)
        } else {
          console.log(`📝 Usando contenuto scritto manualmente`)
        }
        
        // Personalizza il contenuto per ogni cliente
        let personalizedContent = this.personalizeContent(finalContent, customer, campaignData)
        
        // Aggiungi pixel di tracking per le aperture email
        const trackingPixel = this.generateTrackingPixel(campaignId, customer.email)
        console.log('🔍 Pixel generato:', trackingPixel)
        personalizedContent = this.injectTrackingPixel(personalizedContent, trackingPixel)
        console.log('📧 Contenuto finale con pixel:', personalizedContent.slice(-200)) // Ultimi 200 caratteri
        
        const templateParams = {
          to_email: customer.email,
          to_name: customer.name,
          subject: subject,
          message_html: personalizedContent,
          reply_to: 'saporiecolori.b@gmail.com'
        }

        console.log(`📤 Invio a ${customer.name} (${customer.email})`)
        console.log(`🔧 EmailJS Config:`, {
          serviceId: EMAIL_CONFIG.serviceId,
          templateId: EMAIL_CONFIG.templateId,
          publicKey: EMAIL_CONFIG.publicKey ? 'OK' : 'MANCANTE'
        })
        console.log(`📋 Template params:`, {
          to_email: templateParams.to_email,
          to_name: templateParams.to_name,
          subject: templateParams.subject,
          message_html_length: templateParams.message_html?.length || 0,
          reply_to: templateParams.reply_to
        })
        
        await emailjs.send(
          EMAIL_CONFIG.serviceId,
          EMAIL_CONFIG.templateId,
          templateParams,
          EMAIL_CONFIG.publicKey
        )

        emailsSent++
        results.push({
          customer_id: customer.id,
          email: customer.email,
          status: 'sent',
          sent_at: new Date().toISOString()
        })

        console.log(`✅ Email inviata a ${customer.name}`)

        // Log nel database per tracking
        await this.logEmailSent(campaignId, customer, templateParams)

      } catch (error) {
        emailsFailed++
        console.error(`❌ Errore invio a ${customer.name}:`, error)
        console.error(`❌ Errore completo:`, JSON.stringify(error, null, 2))
        console.error(`❌ Stack trace:`, error.stack)
        
        results.push({
          customer_id: customer.id,
          email: customer.email,
          status: 'failed',
          error: error.message,
          errorDetails: {
            name: error.name,
            message: error.message,
            stack: error.stack,
            fullError: JSON.stringify(error, null, 2)
          },
          failed_at: new Date().toISOString()
        })
      }

      // Piccola pausa per evitare rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    console.log(`📊 Risultati invio: ${emailsSent} successo, ${emailsFailed} errori`)

    return {
      success: emailsFailed === 0,
      totalSent: emailsSent,
      totalFailed: emailsFailed,
      results
    }
  },

  personalizeContent(content, customer, campaignData = {}) {
    if (!content) return ''
    
    // Placeholder di base del cliente
    let personalizedContent = content
      .replace(/{{nome}}/g, customer.name || 'Cliente')
      .replace(/{{email}}/g, customer.email || '')
      .replace(/{{gemme}}/g, customer.points || 0)
      .replace(/{{livello}}/g, this.getCustomerLevel(customer.points))
    
    // Placeholder di date e promozioni
    const today = new Date()
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    
    personalizedContent = personalizedContent
      .replace(/{{data_scadenza}}/g, campaignData.expiryDate || nextWeek.toLocaleDateString('it-IT'))
      .replace(/{{data_oggi}}/g, today.toLocaleDateString('it-IT'))
      .replace(/{{data_prossimo_mese}}/g, nextMonth.toLocaleDateString('it-IT'))
      .replace(/{{sconto}}/g, campaignData.discount || '20%')
      .replace(/{{codice_sconto}}/g, campaignData.promoCode || 'SCONTO20')
    
    return personalizedContent
  },

  // Genera pixel di tracking per aperture email
  generateTrackingPixel(campaignId, customerEmail) {
    const trackingData = `${campaignId}:${customerEmail}:${Date.now()}`
    const trackingId = btoa(trackingData)
    
    // URL dinamico basato sull'ambiente
    let baseUrl = 'https://sapori-colori-fidelity.vercel.app' // Il tuo dominio di produzione
    
    if (typeof window !== 'undefined' && window.location) {
      baseUrl = window.location.origin
    }
    
    const pixelUrl = `${baseUrl}/api/email-tracking?action=pixel&trackingId=${trackingId}`
    console.log('🔗 URL pixel tracking:', pixelUrl)
    
    return `<img src="${pixelUrl}" width="1" height="1" style="display:none;" alt="" />`
  },

  // Inserisce pixel di tracking nell'HTML dell'email
  injectTrackingPixel(htmlContent, trackingPixel) {
    if (!htmlContent) return htmlContent
    
    // Inserisce il pixel prima del tag di chiusura </body> o alla fine
    if (htmlContent.includes('</body>')) {
      return htmlContent.replace('</body>', `${trackingPixel}</body>`)
    } else if (htmlContent.includes('</html>')) {
      return htmlContent.replace('</html>', `${trackingPixel}</html>`)
    } else {
      return htmlContent + trackingPixel
    }
  },

  getCustomerLevel(points) {
    if (points >= 500) return 'Platinum'
    if (points >= 300) return 'Gold'  
    if (points >= 100) return 'Silver'
    return 'Bronze'
  },

  async logEmailSent(campaignId, customer, templateParams) {
    try {
      // Log nella tabella email_logs se esiste
      const { data: logEntry, error } = await supabase
        .from('email_logs')
        .insert([{
          campaign_id: campaignId,
          customer_id: customer.id,
          customer_email: customer.email,
          subject: templateParams.subject,
          content: templateParams.message_html,
          status: 'sent',
          sent_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error && error.code !== '42P01') { // Ignora se la tabella non esiste
        console.error('Errore log email:', error)
        return null
      }
      
      return logEntry
    } catch (error) {
      console.error('Errore log email:', error)
      return null
    }
  },

  async sendTestEmail(email, subject, content) {
    const templateParams = {
      to_email: email,
      to_name: 'Test User',
      subject: `[TEST] ${subject}`,
      message_html: content,
      reply_to: 'saporiecolori.b@gmail.com'
    }

    return emailjs.send(
      EMAIL_CONFIG.serviceId,
      EMAIL_CONFIG.templateId,
      templateParams,
      EMAIL_CONFIG.publicKey
    )
  }
}