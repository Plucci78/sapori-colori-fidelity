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

      // Richiedi permesso notifiche
      const permission = await OneSignal.requestPermission()
      if (!permission) {
        console.log('⚠️ Utente ha rifiutato le notifiche')
        return null
      }

      // Ottieni Player ID
      this.playerId = await OneSignal.getPlayerId()
      if (!this.playerId) {
        console.log('⚠️ Impossibile ottenere Player ID')
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
}

// Istanza singleton
export const oneSignalService = new OneSignalService()
export default oneSignalService