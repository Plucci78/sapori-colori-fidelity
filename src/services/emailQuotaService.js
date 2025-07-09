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
      resetDay: 1,       // Giorno reset mensile
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

  // Ottieni il valore reale dal database o da configurazione
  async getRealMonthlyUsage() {
    try {
      // Cerca una configurazione salvata nel database
      const { data } = await supabase
        .from('email_settings')
        .select('value')
        .eq('key', 'monthly_usage')
        .single()

      if (data?.value) {
        return parseInt(data.value)
      }

      // Default: usa il valore che vedi sul portale EmailJS
      return 88
    } catch (error) {
      // Fallback al valore hardcoded
      return 88
    }
  }

  // Aggiorna manualmente l'utilizzo reale (per sincronizzare con EmailJS)
  async updateRealMonthlyUsage(newValue) {
    try {
      const { error } = await supabase
        .from('email_settings')
        .upsert([{
          key: 'monthly_usage',
          value: newValue.toString(),
          updated_at: new Date().toISOString()
        }])

      if (error) throw error
      
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
