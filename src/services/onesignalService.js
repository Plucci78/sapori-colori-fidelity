import OneSignal from 'react-onesignal'
import { ONESIGNAL_CONFIG, isDevelopment } from '../config/onesignal'

class OneSignalService {
  constructor() {
    this.initialized = false
    this.playerId = null
  }

  // Inizializza OneSignal
  async initialize() {
    if (this.initialized) return

    try {
      console.log('🔔 Inizializzazione OneSignal...')
      
      await OneSignal.init({
        appId: ONESIGNAL_CONFIG.appId,
        allowLocalhostAsSecureOrigin: ONESIGNAL_CONFIG.allowLocalhostAsSecureOrigin,
        
        // Configurazioni notifiche
        notificationClickHandling: ONESIGNAL_CONFIG.notificationClickHandling,
        welcomeNotification: ONESIGNAL_CONFIG.welcomeNotification,
        promptOptions: ONESIGNAL_CONFIG.promptOptions,

        // Service Worker personalizzato (integrazione con quello esistente)
        serviceWorkerUpdaterPath: 'OneSignalSDKUpdaterWorker.js',
        serviceWorkerPath: 'OneSignalSDKWorker.js'
      })

      this.initialized = true
      console.log('✅ OneSignal inizializzato con successo')

      // Ottieni Player ID se l'utente è già registrato
      this.playerId = await OneSignal.getPlayerId()
      if (this.playerId) {
        console.log('👤 Player ID esistente:', this.playerId)
      }

      return true
    } catch (error) {
      console.error('❌ Errore inizializzazione OneSignal:', error)
      return false
    }
  }

  // Registra utente per notifiche push
  async registerUser(customerData) {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      console.log('📱 Registrazione utente OneSignal:', customerData.name)

      // Verifica se l'utente ha già dato il permesso
      const currentPermission = await OneSignal.getPermission()
      console.log('🔍 Permesso attuale:', currentPermission)

      let permission = currentPermission
      
      // Se non ha ancora dato il permesso, richiedilo
      if (!permission) {
        console.log('📝 Richiesta permesso notifiche...')
        permission = await OneSignal.requestPermission()
        
        // Aspetta un po' per permettere al popup di processare la risposta
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        if (!permission) {
          console.log('⚠️ Utente ha rifiutato le notifiche')
          return null
        }
      }

      // Ottieni Player ID con retry
      let attempts = 0
      const maxAttempts = 5
      
      while (attempts < maxAttempts) {
        this.playerId = await OneSignal.getPlayerId()
        if (this.playerId) break
        
        console.log(`🔄 Tentativo ${attempts + 1}/${maxAttempts} per ottenere Player ID...`)
        await new Promise(resolve => setTimeout(resolve, 500))
        attempts++
      }

      if (!this.playerId) {
        console.log('⚠️ Impossibile ottenere Player ID dopo', maxAttempts, 'tentativi')
        return null
      }

      // Associa dati utente
      await OneSignal.setTags({
        customer_id: customerData.id,
        customer_name: customerData.name,
        customer_email: customerData.email || '',
        customer_phone: customerData.phone || '',
        customer_points: customerData.points || 0,
        registration_date: new Date().toISOString()
      })

      console.log('✅ Utente registrato OneSignal:', this.playerId)
      
      // Forza chiusura eventuali popup rimasti aperti
      try {
        const onesignalElements = document.querySelectorAll('[id*="onesignal"], [class*="onesignal"]')
        onesignalElements.forEach(el => {
          if (el.style.display !== 'none') {
            console.log('🔒 Nascondo elemento OneSignal rimasto aperto')
            el.style.display = 'none'
          }
        })
      } catch (e) {
        console.log('⚠️ Errore pulizia popup OneSignal:', e)
      }
      
      return this.playerId

    } catch (error) {
      console.error('❌ Errore registrazione OneSignal:', error)
      return null
    }
  }

  // Aggiorna dati utente
  async updateUserData(customerData) {
    if (!this.playerId) return

    try {
      await OneSignal.setTags({
        customer_points: customerData.points || 0,
        last_update: new Date().toISOString()
      })
      console.log('✅ Dati utente aggiornati OneSignal')
    } catch (error) {
      console.error('❌ Errore aggiornamento dati OneSignal:', error)
    }
  }

  // Ottieni stato notifiche
  async getNotificationStatus() {
    if (!this.initialized) return null

    try {
      const permission = await OneSignal.getPermission()
      const playerId = await OneSignal.getPlayerId()
      const isSubscribed = await OneSignal.isSubscribed()

      return {
        permission,
        playerId,
        isSubscribed,
        pushSupported: OneSignal.isPushSupported()
      }
    } catch (error) {
      console.error('❌ Errore stato notifiche:', error)
      return null
    }
  }

  // Logout utente (rimuovi tags)
  async logoutUser() {
    if (!this.playerId) return

    try {
      await OneSignal.deleteTags([
        'customer_id',
        'customer_name', 
        'customer_email',
        'customer_phone',
        'customer_points'
      ])
      console.log('✅ Logout OneSignal completato')
    } catch (error) {
      console.error('❌ Errore logout OneSignal:', error)
    }
  }

  // Invia notifica push (solo per admin)
  async sendNotification({ title, message, playerIds, url, tags = null }) {
    try {
      console.log(`📤 Invio notifica a ${playerIds.length} utenti:`, title)

      const notificationData = {
        app_id: ONESIGNAL_CONFIG.appId,
        headings: { en: title, it: title },
        contents: { en: message, it: message },
        include_player_ids: playerIds
      }

      // Aggiungi URL se fornito
      if (url) {
        notificationData.url = url
      }

      // Aggiungi filtri per tag se forniti
      if (tags && Object.keys(tags).length > 0) {
        // Costruisci filtri OneSignal per tag
        const filters = Object.entries(tags).map(([key, value], index) => {
          const filter = { field: 'tag', key, relation: '=', value: value.toString() }
          if (index > 0) {
            return [{ operator: 'AND' }, filter]
          }
          return filter
        }).flat()
        
        notificationData.filters = filters
        delete notificationData.include_player_ids // Usa filtri invece di player IDs specifici
      }

      // Chiamata REST API OneSignal
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${ONESIGNAL_CONFIG.restApiKey}`
        },
        body: JSON.stringify(notificationData)
      })

      const result = await response.json()

      if (response.ok && result.id) {
        console.log('✅ Notifica inviata con successo:', result.id)
        return {
          success: true,
          notificationId: result.id,
          recipients: result.recipients || playerIds.length
        }
      } else {
        console.error('❌ Errore invio notifica:', result)
        return {
          success: false,
          error: result.errors ? result.errors.join(', ') : 'Errore sconosciuto'
        }
      }

    } catch (error) {
      console.error('❌ Errore invio notifica:', error)
      return {
        success: false,
        error: error.message || 'Errore di rete'
      }
    }
  }
}

// Istanza singleton
export const oneSignalService = new OneSignalService()
export default oneSignalService