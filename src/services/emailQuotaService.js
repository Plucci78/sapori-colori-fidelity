// ===================================
// EMAIL QUOTA SERVICE - MONITORAGGIO LIMITE EMAILJS
// ===================================

import { supabase } from '../supabase'

class EmailQuotaService {
  constructor() {
    // Configurazione quote EmailJS (piano gratuito standard)
    this.quotaConfig = {
      monthlyLimit: 200, // Limite mensile EmailJS gratuito
      dailyLimit: 20,    // Limite giornaliero stimato
      resetDay: 30,      // Reset il 30 luglio (modificato)
      warningThreshold: 0.8, // Avviso a 80%
      criticalThreshold: 0.95 // Critico a 95%
    }
  }

  // ===================================
  // MONITORAGGIO UTILIZZO
  // ===================================

  // Ottieni statistiche utilizzo corrente
  async getCurrentUsage() {
    try {
      // ===================================
      // PRIORITÀ 1: Usa i dati reali da EmailJS se disponibili
      // ===================================
      const realUsage = await this.getEmailJSUsage()
      if (realUsage) {
        return realUsage
      }

      // ===================================
      // FALLBACK: Usa i log locali se EmailJS non disponibile
      // ===================================
      const now = new Date()
      const currentMonth = now.getMonth() + 1
      const currentYear = now.getFullYear()
      
      // Primo giorno del mese corrente
      const monthStart = new Date(currentYear, currentMonth - 1, 1)
      const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59)
      
      // Query email inviate questo mese
      const { data: monthlyEmails, error: monthlyError } = await supabase
        .from('email_logs')
        .select('recipients_count, sent_at, status')
        .gte('sent_at', monthStart.toISOString())
        .lte('sent_at', monthEnd.toISOString())
        .eq('status', 'sent')

      if (monthlyError) throw monthlyError

      // Calcola totale email inviate questo mese
      const monthlyCount = monthlyEmails?.reduce((total, log) => 
        total + (log.recipients_count || 0), 0) || 0

      // Query email inviate oggi
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { data: dailyEmails, error: dailyError } = await supabase
        .from('email_logs')
        .select('recipients_count, sent_at, status')
        .gte('sent_at', today.toISOString())
        .lt('sent_at', tomorrow.toISOString())
        .eq('status', 'sent')

      if (dailyError) throw dailyError

      const dailyCount = dailyEmails?.reduce((total, log) => 
        total + (log.recipients_count || 0), 0) || 0

      // Calcola percentuali
      const monthlyPercentage = (monthlyCount / this.quotaConfig.monthlyLimit) * 100
      const dailyPercentage = (dailyCount / this.quotaConfig.dailyLimit) * 100

      // Prossimo reset
      const nextReset = this.getNextResetDate()

      return {
        monthly: {
          used: monthlyCount,
          limit: this.quotaConfig.monthlyLimit,
          remaining: this.quotaConfig.monthlyLimit - monthlyCount,
          percentage: Math.round(monthlyPercentage),
          status: this.getUsageStatus(monthlyPercentage)
        },
        daily: {
          used: dailyCount,
          limit: this.quotaConfig.dailyLimit,
          remaining: this.quotaConfig.dailyLimit - dailyCount,
          percentage: Math.round(dailyPercentage),
          status: this.getUsageStatus(dailyPercentage)
        },
        nextReset: {
          date: nextReset,
          daysRemaining: Math.ceil((nextReset - now) / (1000 * 60 * 60 * 24)),
          formatted: nextReset.toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })
        }
      }
    } catch (error) {
      console.error('Errore calcolo usage email:', error)
      return this.getDefaultUsage()
    }
  }

  // ===================================
  // INTEGRAZIONE EMAILJS REAL-TIME
  // ===================================

  // Ottieni statistiche reali da EmailJS (se disponibili)
  async getEmailJSUsage() {
    try {
      // ===================================
      // CONFIGURAZIONE UTILIZZO REALE
      // ===================================
      // Aggiorna questo valore con quello che vedi sul portale EmailJS
      const realMonthlyUsed = await this.getRealMonthlyUsage()
      
      const now = new Date()
      
      // Stima utilizzo giornaliero basato sui log locali
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { data: dailyEmails } = await supabase
        .from('email_logs')
        .select('recipients_count, sent_at, status')
        .gte('sent_at', today.toISOString())
        .lt('sent_at', tomorrow.toISOString())
        .eq('status', 'sent')

      const dailyCount = dailyEmails?.reduce((total, log) => 
        total + (log.recipients_count || 0), 0) || 0

      // Calcola percentuali
      const monthlyPercentage = (realMonthlyUsed / this.quotaConfig.monthlyLimit) * 100
      const dailyPercentage = (dailyCount / this.quotaConfig.dailyLimit) * 100

      // Prossimo reset
      const nextReset = this.getNextResetDate()

      return {
        monthly: {
          used: realMonthlyUsed,
          limit: this.quotaConfig.monthlyLimit,
          remaining: this.quotaConfig.monthlyLimit - realMonthlyUsed,
          percentage: Math.round(monthlyPercentage),
          status: this.getUsageStatus(monthlyPercentage)
        },
        daily: {
          used: dailyCount,
          limit: this.quotaConfig.dailyLimit,
          remaining: this.quotaConfig.dailyLimit - dailyCount,
          percentage: Math.round(dailyPercentage),
          status: this.getUsageStatus(dailyPercentage)
        },
        nextReset: {
          date: nextReset,
          daysRemaining: Math.ceil((nextReset - now) / (1000 * 60 * 60 * 24)),
          formatted: nextReset.toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })
        },
        source: 'emailjs-real' // Indica che sono dati reali
      }
    } catch (error) {
      console.error('Errore recupero dati EmailJS:', error)
      return null // Fallback ai log locali
    }
  }

  // ===================================
  // CONFIGURAZIONE MANUALE UTILIZZO REALE
  // ===================================

  // Ottieni il valore reale aggiornato manualmente
  async getRealMonthlyUsage() {
    try {
      console.log('🔍 getRealMonthlyUsage: Recupero valore manuale dal database...')
      
      // Prima cerca il valore aggiornato manualmente nel database
      const { data } = await supabase
        .from('email_settings')
        .select('value')
        .eq('key', 'monthly_usage')
        .single()

      if (data?.value && parseInt(data.value) >= 0) {
        console.log('📦 getRealMonthlyUsage: Found manual value in database:', data.value)
        return parseInt(data.value)
      }

      // Se non esiste, crea con valore di default 125
      console.log('💾 getRealMonthlyUsage: Creating default value in database: 125')
      await this.updateRealMonthlyUsage(125)
      return 125
    } catch (error) {
      console.warn('❌ getRealMonthlyUsage: Error, using fallback:', error)
      return 125 // Fallback al valore di default
    }
  }

  // Nuova funzione: Chiama l'API EmailJS per ottenere l'utilizzo reale
  async fetchEmailJSMonthlyUsage() {
    try {
      console.log('🚀 fetchEmailJSMonthlyUsage: Starting API call...')
      
      const EMAILJS_CONFIG = {
        publicKey: 'P0A99o_tLGsOuzhDs',
        privateKey: 'CkzkOZP4Etb1AMyZAD-he'
      }

      // Ottieni l'inizio del mese corrente
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      console.log('📅 fetchEmailJSMonthlyUsage: Current month range:', { 
        startOfMonth: startOfMonth.toISOString(), 
        now: now.toISOString(),
        currentMonth: now.getMonth() + 1,
        currentYear: now.getFullYear()
      })
      
      let allRecords = []
      let page = 1
      let hasMorePages = true
      
      // Scarica tutti i record del mese corrente (gestisce paginazione)
      while (hasMorePages) {
        const url = `https://api.emailjs.com/api/v1.1/history?user_id=${EMAILJS_CONFIG.publicKey}&accessToken=${EMAILJS_CONFIG.privateKey}&page=${page}&count=100`
        
        console.log(`📧 Fetching EmailJS history page ${page}...`)
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          console.error('❌ fetchEmailJSMonthlyUsage: API Error:', response.status, response.statusText)
          throw new Error(`EmailJS API error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        console.log(`📦 fetchEmailJSMonthlyUsage: Page ${page} response:`, data)
        
        // EmailJS restituisce { is_last_page: boolean, rows: [...] }
        let records = []
        if (data && data.rows && Array.isArray(data.rows)) {
          records = data.rows
          hasMorePages = !data.is_last_page
        } else if (Array.isArray(data)) {
          // Fallback per formato array diretto
          records = data
          hasMorePages = data.length === 100
        } else {
          console.error('❌ fetchEmailJSMonthlyUsage: Unexpected API format:', data)
          throw new Error(`EmailJS API returned unexpected data format: ${typeof data}`)
        }
        
        console.log(`📦 fetchEmailJSMonthlyUsage: Page ${page} returned ${records.length} records`)
        
        // Debug: mostra alcuni record per capire la struttura
        if (page === 1 && records.length > 0) {
          // Mostra i primi 5 record RAW per capire la struttura
          for (let i = 0; i < Math.min(5, records.length); i++) {
            const record = records[i]
            console.log(`🔍 Record #${i + 1} RAW:`, record)
            
            // Prova diversi campi per il timestamp
            console.log(`📅 Possible timestamp fields:`, {
              timestamp: record.timestamp,
              created_at: record.created_at,
              sent_at: record.sent_at,
              date: record.date,
              time: record.time
            })
          }
        }

        // Filtra i record del mese corrente - USA created_at non timestamp!
        const monthlyRecords = records.filter(record => {
          const recordDate = new Date(record.created_at)  // Corretto!
          return recordDate >= startOfMonth && recordDate <= now
        })

        console.log(`📅 Page ${page}: ${records.length} total, ${monthlyRecords.length} in current month`)
        allRecords = [...allRecords, ...monthlyRecords]
        
        // Se abbiamo meno di 100 record, non ci sono più pagine
        hasMorePages = data.length === 100
        page++
        
        // Rate limit: 1 richiesta al secondo
        if (hasMorePages) {
          await new Promise(resolve => setTimeout(resolve, 1100))
        }
      }

      // Conta solo le email inviate con successo
      console.log(`📊 Total monthly records found: ${allRecords.length}`)
      
      // Debug: mostra tutti i possibili risultati
      const resultStats = {}
      allRecords.forEach(record => {
        const result = record.result || 'undefined'
        resultStats[result] = (resultStats[result] || 0) + 1
      })
      console.log('📈 Result statistics:', resultStats)
      
      const successfulEmails = allRecords.filter(record => 
        record.result === 1 || record.result === '1' || record.result === 'success' || record.result === 'sent' || record.result === 'OK'
      ).length

      console.log(`✅ EmailJS Real Usage: ${successfulEmails} successful emails sent this month`)
      console.log(`📋 Out of ${allRecords.length} total records`)
      
      return successfulEmails

    } catch (error) {
      console.error('❌ Errore nel recupero dati EmailJS:', error)
      return null // Restituisce null per usare il fallback
    }
  }

  // Aggiorna manualmente l'utilizzo reale (per sincronizzare con EmailJS)
  async updateRealMonthlyUsage(newValue) {
    try {
      // Prima prova ad aggiornare
      const { error: updateError } = await supabase
        .from('email_settings')
        .update({
          value: newValue.toString(),
          updated_at: new Date().toISOString()
        })
        .eq('key', 'monthly_usage')

      // Se non esiste, crealo
      if (updateError && updateError.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('email_settings')
          .insert([{
            key: 'monthly_usage',
            value: newValue.toString(),
            updated_at: new Date().toISOString()
          }])
        
        if (insertError) throw insertError
      } else if (updateError) {
        throw updateError
      }
      
      console.log(`✅ Utilizzo EmailJS aggiornato: ${newValue}/200`)
      return true
    } catch (error) {
      console.error('Errore aggiornamento utilizzo EmailJS:', error)
      return false
    }
  }

  // Ottieni data prossimo reset
  getNextResetDate() {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    // Se siamo dopo il giorno di reset di questo mese, il prossimo reset è il mese prossimo
    if (now.getDate() >= this.quotaConfig.resetDay) {
      return new Date(currentYear, currentMonth + 1, this.quotaConfig.resetDay)
    } else {
      return new Date(currentYear, currentMonth, this.quotaConfig.resetDay)
    }
  }

  // Determina stato utilizzo basato su percentuale
  getUsageStatus(percentage) {
    if (percentage >= this.quotaConfig.criticalThreshold * 100) {
      return 'critical' // Rosso
    } else if (percentage >= this.quotaConfig.warningThreshold * 100) {
      return 'warning'  // Arancione
    } else {
      return 'normal'   // Verde
    }
  }

  // Dati di default in caso di errore
  getDefaultUsage() {
    const nextReset = this.getNextResetDate()
    const now = new Date()
    
    return {
      monthly: {
        used: 0,
        limit: this.quotaConfig.monthlyLimit,
        remaining: this.quotaConfig.monthlyLimit,
        percentage: 0,
        status: 'normal'
      },
      daily: {
        used: 0,
        limit: this.quotaConfig.dailyLimit,
        remaining: this.quotaConfig.dailyLimit,
        percentage: 0,
        status: 'normal'
      },
      nextReset: {
        date: nextReset,
        daysRemaining: Math.ceil((nextReset - now) / (1000 * 60 * 60 * 24)),
        formatted: nextReset.toLocaleDateString('it-IT', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      }
    }
  }

  // ===================================
  // CONTROLLI PRE-INVIO
  // ===================================

  // Controlla se è possibile inviare un certo numero di email
  async canSendEmails(emailCount) {
  try {
    const usage = await this.getCurrentUsage()
    
    const monthlyOk = usage.monthly.remaining >= emailCount
    const dailyOk = usage.daily.remaining >= emailCount
    const allowed = monthlyOk && dailyOk

    let message = ''
    if (!monthlyOk) {
      message = `Limite mensile superato: richieste ${emailCount}, disponibili ${usage.monthly.remaining}`
    } else if (!dailyOk) {
      message = `Limite giornaliero superato: richieste ${emailCount}, disponibili ${usage.daily.remaining}`
    }

    // Warning se vicino al limite
    let warning = ''
    if (allowed) {
      const newMonthlyPercentage = ((usage.monthly.used + emailCount) / usage.monthly.limit) * 100
      if (newMonthlyPercentage >= this.quotaConfig.warningThreshold * 100) {
        warning = `Attenzione: dopo l'invio avrai usato il ${Math.round(newMonthlyPercentage)}% della quota mensile`
      }
    }

    return {
      allowed,
      message,
      warning,
      usage
    }
  } catch (error) {
    console.error('Errore controllo quota email:', error)
    return {
      allowed: true,
      message: '',
      warning: 'Impossibile verificare le quote. Invio consentito.',
      usage: this.getDefaultUsage()
    }
  }
}

  // ===================================
  // NOTIFICHE E AVVISI
  // ===================================

  // Ottieni messaggi di avviso basati sull'utilizzo
  async getQuotaAlerts() {
    try {
      const usage = await this.getCurrentUsage()
      const alerts = []

      // Alert quota mensile
      if (usage.monthly.status === 'critical') {
        alerts.push({
          type: 'error',
          title: '🚨 Quota Mensile Critica',
          message: `Hai usato ${usage.monthly.percentage}% della quota mensile (${usage.monthly.used}/${usage.monthly.limit}). Reset il ${usage.nextReset.formatted}.`,
          priority: 'high'
        })
      } else if (usage.monthly.status === 'warning') {
        alerts.push({
          type: 'warning',
          title: '⚠️ Quota Mensile in Esaurimento',
          message: `Hai usato ${usage.monthly.percentage}% della quota mensile. Rimangono ${usage.monthly.remaining} email fino al ${usage.nextReset.formatted}.`,
          priority: 'medium'
        })
      }

      // Alert quota giornaliera
      if (usage.daily.status === 'critical') {
        alerts.push({
          type: 'error',
          title: '🚨 Quota Giornaliera Critica',
          message: `Hai usato ${usage.daily.percentage}% della quota giornaliera (${usage.daily.used}/${usage.daily.limit}). Reset domani.`,
          priority: 'high'
        })
      } else if (usage.daily.status === 'warning') {
        alerts.push({
          type: 'warning',
          title: '⚠️ Quota Giornaliera in Esaurimento',
          message: `Hai usato ${usage.daily.percentage}% della quota giornaliera. Rimangono ${usage.daily.remaining} email oggi.`,
          priority: 'medium'
        })
      }

      // Alert rinnovo imminente
      if (usage.nextReset.daysRemaining <= 3 && usage.monthly.used > 0) {
        alerts.push({
          type: 'info',
          title: '🔄 Rinnovo Quota Imminente',
          message: `La quota si rinnoverà fra ${usage.nextReset.daysRemaining} giorni (${usage.nextReset.formatted}).`,
          priority: 'low'
        })
      }

      return alerts
    } catch (error) {
      console.error('Errore generazione alert quota:', error)
      return []
    }
  }

  // ===================================
  // CONFIGURAZIONE
  // ===================================

  // Aggiorna configurazione quote (per admin)
  updateQuotaConfig(newConfig) {
    this.quotaConfig = {
      ...this.quotaConfig,
      ...newConfig
    }
    
    // Salva in localStorage per persistenza
    localStorage.setItem('emailQuotaConfig', JSON.stringify(this.quotaConfig))
  }

  // Carica configurazione da localStorage
  loadQuotaConfig() {
    try {
      const saved = localStorage.getItem('emailQuotaConfig')
      if (saved) {
        this.quotaConfig = {
          ...this.quotaConfig,
          ...JSON.parse(saved)
        }
      }
    } catch (error) {
      console.error('Errore caricamento config quota:', error)
    }
  }

  // ===================================
  // STATISTICHE AVANZATE
  // ===================================

  // Ottieni trend utilizzo ultimi 30 giorni
  async getUsageTrend(days = 30) {
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data: logs, error } = await supabase
        .from('email_logs')
        .select('recipients_count, sent_at, status')
        .gte('sent_at', startDate.toISOString())
        .lte('sent_at', endDate.toISOString())
        .eq('status', 'sent')
        .order('sent_at', { ascending: true })

      if (error) throw error

      // Raggruppa per giorno
      const dailyUsage = {}
      logs?.forEach(log => {
        const date = new Date(log.sent_at).toISOString().split('T')[0]
        dailyUsage[date] = (dailyUsage[date] || 0) + (log.recipients_count || 0)
      })

      return {
        period: `${days} giorni`,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        dailyUsage,
        totalEmails: Object.values(dailyUsage).reduce((sum, count) => sum + count, 0),
        avgPerDay: Math.round(Object.values(dailyUsage).reduce((sum, count) => sum + count, 0) / days)
      }
    } catch (error) {
      console.error('Errore calcolo trend utilizzo:', error)
      return null
    }
  }

  // Proiezione utilizzo fine mese
  async getMonthlyProjection() {
    try {
      const usage = await this.getCurrentUsage()
      const trend = await this.getUsageTrend(7) // Ultimi 7 giorni
      
      if (!trend || trend.avgPerDay === 0) {
        return {
          projection: usage.monthly.used,
          willExceed: false,
          daysToLimit: null
        }
      }

      const daysRemainingInMonth = usage.nextReset.daysRemaining
      const projectedTotal = usage.monthly.used + (trend.avgPerDay * daysRemainingInMonth)
      
      return {
        projection: Math.round(projectedTotal),
        willExceed: projectedTotal > this.quotaConfig.monthlyLimit,
        daysToLimit: projectedTotal > this.quotaConfig.monthlyLimit 
          ? Math.ceil((this.quotaConfig.monthlyLimit - usage.monthly.used) / trend.avgPerDay)
          : null,
        avgPerDay: trend.avgPerDay
      }
    } catch (error) {
      console.error('Errore calcolo proiezione mensile:', error)
      return null
    }
  }

  // ===================================
  // UTILITY E DEBUG
  // ===================================

  // Metodo di debug per controllare i dati
  async debugQuotaData() {
    const usage = await this.getCurrentUsage()
    console.log('🔍 DEBUG QUOTA EMAIL:', {
      monthly: `${usage.monthly.used}/${usage.monthly.limit} (${usage.monthly.remaining} rimanenti)`,
      daily: `${usage.daily.used}/${usage.daily.limit} (${usage.daily.remaining} rimanenti)`,
      status: usage.monthly.status,
      source: usage.source || 'local-logs',
      nextReset: usage.nextReset.formatted
    })
    return usage
  }

  // Metodo rapido per sincronizzare con EmailJS
  async syncWithEmailJS(currentUsage) {
    const success = await this.updateRealMonthlyUsage(currentUsage)
    if (success) {
      console.log(`✅ Sincronizzato con EmailJS: ${currentUsage}/200`)
      
      // Ricarica i dati aggiornati
      const newUsage = await this.getCurrentUsage()
      console.log(`📊 Nuovi dati: ${newUsage.monthly.remaining} email rimanenti`)
      
      return newUsage
    }
    return null
  }
}

// Esporta istanza singleton
export const emailQuotaService = new EmailQuotaService()

// Carica configurazione al primo utilizzo
emailQuotaService.loadQuotaConfig()

export default emailQuotaService
