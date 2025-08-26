import { supabase } from '../supabase'

class EmailTrackingService {
  // Genera un pixel di tracking per un'email
  generateTrackingPixel(emailLogId, customerEmail) {
    const trackingId = btoa(`${emailLogId}:${customerEmail}:${Date.now()}`)
    const baseUrl = window.location.origin
    return `<img src="${baseUrl}/api/email-tracking/pixel/${trackingId}" width="1" height="1" style="display:none;" alt="" />`
  }

  // Genera link con tracking per i click
  generateTrackedLink(originalUrl, emailLogId, customerEmail) {
    const trackingId = btoa(`${emailLogId}:${customerEmail}:${originalUrl}:${Date.now()}`)
    const baseUrl = window.location.origin
    return `${baseUrl}/api/email-tracking/click/${trackingId}`
  }

  // Inserisce pixel di tracking nell'HTML dell'email
  injectTrackingPixel(htmlContent, emailLogId, customerEmail) {
    const trackingPixel = this.generateTrackingPixel(emailLogId, customerEmail)
    
    // Inserisce il pixel prima del tag di chiusura </body> o alla fine
    if (htmlContent.includes('</body>')) {
      return htmlContent.replace('</body>', `${trackingPixel}</body>`)
    } else {
      return htmlContent + trackingPixel
    }
  }

  // Trasforma tutti i link in link tracciati
  injectLinkTracking(htmlContent, emailLogId, customerEmail) {
    const linkRegex = /href=["'](https?:\/\/[^"']+)["']/gi
    
    return htmlContent.replace(linkRegex, (match, url) => {
      const trackedUrl = this.generateTrackedLink(url, emailLogId, customerEmail)
      return `href="${trackedUrl}"`
    })
  }

  // Processa l'HTML completo per aggiungere tracking
  processEmailForTracking(htmlContent, emailLogId, customerEmail) {
    let processedContent = htmlContent
    
    // Aggiungi tracking pixel
    processedContent = this.injectTrackingPixel(processedContent, emailLogId, customerEmail)
    
    // Aggiungi tracking link
    processedContent = this.injectLinkTracking(processedContent, emailLogId, customerEmail)
    
    return processedContent
  }

  // Registra apertura email
  async trackEmailOpen(emailLogId, customerEmail, ipAddress, userAgent) {
    try {
      const { data, error } = await supabase
        .from('email_opens')
        .insert([{
          email_log_id: emailLogId,
          customer_email: customerEmail,
          ip_address: ipAddress,
          user_agent: userAgent
        }])

      if (error) {
        console.error('Errore tracking apertura:', error)
        return false
      }

      console.log('✅ Apertura email tracciata:', customerEmail)
      return true
    } catch (error) {
      console.error('Errore tracking apertura:', error)
      return false
    }
  }

  // Registra click su link
  async trackEmailClick(emailLogId, customerEmail, clickedUrl, ipAddress, userAgent) {
    try {
      const { data, error } = await supabase
        .from('email_clicks')
        .insert([{
          email_log_id: emailLogId,
          customer_email: customerEmail,
          clicked_url: clickedUrl,
          ip_address: ipAddress,
          user_agent: userAgent
        }])

      if (error) {
        console.error('Errore tracking click:', error)
        return false
      }

      console.log('✅ Click email tracciato:', customerEmail, clickedUrl)
      return true
    } catch (error) {
      console.error('Errore tracking click:', error)
      return false
    }
  }

  // Ottieni statistiche complete per una campagna
  async getCampaignStats(emailLogId) {
    try {
      const { data, error } = await supabase
        .from('email_campaign_stats')
        .select('*')
        .eq('email_log_id', emailLogId)
        .single()

      if (error && error.code !== 'PGRST116') { // Ignora "not found"
        console.error('Errore statistiche campagna:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Errore statistiche campagna:', error)
      return null
    }
  }

  // Ottieni statistiche aggregate per periodo
  async getStatsForPeriod(startDate, endDate) {
    try {
      const { data: logs, error } = await supabase
        .from('email_logs')
        .select(`
          *,
          email_campaign_stats(*)
        `)
        .gte('sent_at', startDate)
        .lte('sent_at', endDate)
        .order('sent_at', { ascending: false })

      if (error) {
        console.error('Errore statistiche periodo:', error)
        return []
      }

      return logs
    } catch (error) {
      console.error('Errore statistiche periodo:', error)
      return []
    }
  }

  // Crea record statistiche per una nuova campagna
  async createCampaignStats(emailLogId, campaignName, totalSent) {
    try {
      const { data, error } = await supabase
        .from('email_campaign_stats')
        .insert([{
          email_log_id: emailLogId,
          campaign_name: campaignName,
          total_sent: totalSent,
          total_delivered: totalSent // Assumiamo delivered = sent inizialmente
        }])
        .select()
        .single()

      if (error) {
        console.error('Errore creazione statistiche:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Errore creazione statistiche:', error)
      return null
    }
  }

  // Ottieni top email per aperture/click
  async getTopPerformingEmails(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('email_campaign_stats')
        .select(`
          *,
          email_logs(subject, sent_at)
        `)
        .order('open_rate', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Errore top email:', error)
        return []
      }

      return data
    } catch (error) {
      console.error('Errore top email:', error)
      return []
    }
  }

  // Ottieni statistiche generali dashboard
  async getDashboardStats(days = 30) {
    try {
      const endDate = new Date().toISOString()
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

      // Conta email inviate
      console.log('🔍 Conteggio email inviate dal', startDate, 'al', endDate)
      const { data: emailLogs, error: logsError } = await supabase
        .from('email_logs')
        .select('id')
        .gte('sent_at', startDate)
        .lte('sent_at', endDate)
        
      console.log('📧 Email logs trovati:', emailLogs?.length || 0)

      if (logsError) {
        console.error('Errore conteggio email inviate:', logsError)
        return {
          totalSent: 0,
          totalOpened: 0,
          totalClicked: 0,
          avgOpenRate: 0,
          avgClickRate: 0
        }
      }

      const totalSent = emailLogs.length

      // Conta aperture uniche
      console.log('🔍 Conteggio aperture email dal', startDate, 'al', endDate)
      const { data: opens, error: opensError } = await supabase
        .from('email_opens')
        .select('customer_email')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        
      console.log('📖 Aperture trovate:', opens?.length || 0)

      if (opensError) {
        console.error('Errore conteggio aperture:', opensError)
      }

      const uniqueOpens = opens ? new Set(opens.map(o => o.customer_email)).size : 0

      // Conta click unici
      const { data: clicks, error: clicksError } = await supabase
        .from('email_clicks')
        .select('customer_email')
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      if (clicksError) {
        console.error('Errore conteggio click:', clicksError)
      }

      const uniqueClicks = clicks ? new Set(clicks.map(c => c.customer_email)).size : 0

      // Calcola percentuali
      const openRate = totalSent > 0 ? (uniqueOpens / totalSent) * 100 : 0
      const clickRate = totalSent > 0 ? (uniqueClicks / totalSent) * 100 : 0

      console.log(`📊 Dashboard Stats: ${totalSent} sent, ${uniqueOpens} opened (${openRate.toFixed(1)}%), ${uniqueClicks} clicked (${clickRate.toFixed(1)}%)`)

      return {
        totalSent,
        totalOpened: uniqueOpens,
        totalClicked: uniqueClicks,
        avgOpenRate: openRate,
        avgClickRate: clickRate
      }

    } catch (error) {
      console.error('Errore statistiche dashboard:', error)
      return {
        totalSent: 0,
        totalOpened: 0,
        totalClicked: 0,
        avgOpenRate: 0,
        avgClickRate: 0
      }
    }
  }
}

export const emailTrackingService = new EmailTrackingService()