import { ONESIGNAL_CONFIG, isDevelopment } from '../config/onesignal'

class OneSignalService {
  constructor() {
    this.initialized = false
    this.playerId = null
  }

  // Inizializza OneSignal con SDK ufficiale
  async initialize() {
    if (this.initialized) return

    try {
      console.log('🔔 Inizializzazione OneSignal SDK ufficiale...')
      console.log('🌐 URL corrente:', window.location.href)
      console.log('📱 User Agent:', navigator.userAgent.includes('iPhone') ? 'iOS' : navigator.userAgent.includes('Android') ? 'Android' : 'Desktop')
      
      // Carica SDK OneSignal se non presente
      if (!window.OneSignal) {
        await this.loadOneSignalSDK()
      }

      // Inizializza OneSignal
      await window.OneSignal.init({
        appId: ONESIGNAL_CONFIG.appId,
        safari_web_id: ONESIGNAL_CONFIG.safariWebId || undefined,
        allowLocalhostAsSecureOrigin: ONESIGNAL_CONFIG.allowLocalhostAsSecureOrigin,
        
        // Configurazioni per tutti i browser
        notifyButton: {
          enable: false // Gestiamo il prompt manualmente
        },
        
        // Configurazioni PWA/Web Push
        serviceWorkerPath: '/OneSignalSDKWorker.js',
        serviceWorkerUpdaterPath: '/OneSignalSDKUpdaterWorker.js',
        
        // Supporto multi-piattaforma automatico
        autoRegister: false,
        autoResubscribe: true,
        
        // Prompt personalizzato
        promptOptions: ONESIGNAL_CONFIG.promptOptions
      })

      console.log('✅ OneSignal SDK inizializzato')
      this.initialized = true
      return true

    } catch (error) {
      console.error('❌ Errore inizializzazione OneSignal SDK:', error)
      return false
    }
  }

  // Carica SDK OneSignal dinamicamente
  async loadOneSignalSDK() {
    return new Promise((resolve, reject) => {
      if (window.OneSignal) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://cdn.onesignal.com/sdks/OneSignalSDK.js'
      script.async = true
      script.onload = () => {
        console.log('✅ OneSignal SDK caricato')
        resolve()
      }
      script.onerror = (error) => {
        console.error('❌ Errore caricamento OneSignal SDK:', error)
        reject(error)
      }
      document.head.appendChild(script)
    })
  }

  // Registra utente per notifiche push con SDK ufficiale
  async registerUser(customerData) {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      console.log('📱 Registrazione utente OneSignal SDK:', customerData.name)

      // Controlla se già sottoscritto
      const isSubscribed = await window.OneSignal.getNotificationPermission()
      console.log('🔍 Stato attuale notifiche:', isSubscribed)

      if (isSubscribed !== 'granted') {
        // Per iOS, mostra prima le istruzioni PWA se necessario
        const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
        if (isIOS && !this.isPWA()) {
          console.log('📱 iOS rilevato - richiesta installazione PWA')
          const installAccepted = confirm(
            `🍎 IMPORTANTE per iPhone/iPad:\n\n` +
            `Per ricevere notifiche devi prima:\n` +
            `1. Installare questa app: tocca "Condividi" 📤\n` +
            `2. Scegli "Aggiungi alla schermata Home" ➕\n` +
            `3. Tocca "Aggiungi"\n\n` +
            `Vuoi continuare con la registrazione?`
          )
          if (!installAccepted) {
            console.log('⚠️ Utente ha annullato installazione PWA')
            return null
          }
        }
        
        // Mostra messaggio personalizzato prima del prompt
        const userAccepted = confirm(
          `🔔 Ciao ${customerData.name}!\n\n` +
          `Vuoi ricevere notifiche personalizzate su:\n` +
          `• 🎁 Premi disponibili\n` +
          `• ✨ Offerte speciali\n` +
          `• 🎯 Promozioni esclusive\n\n` +
          `(Il browser ti chiederà poi conferma)`
        )
        
        if (!userAccepted) {
          console.log('⚠️ Utente ha rifiutato nel messaggio personalizzato')
          return null
        }
        
        console.log('📝 Richiesta permesso notifiche tramite OneSignal SDK...')
        
        // OneSignal gestisce automaticamente iOS, Android, Desktop
        try {
          await window.OneSignal.registerForPushNotifications()
          console.log('✅ Registrazione push completata')
        } catch (error) {
          console.error('❌ Errore registrazione push:', error)
          return null
        }
      }

      // Attende che OneSignal sia pronto e ottiene l'ID utente
      await window.OneSignal.getUserId().then(userId => {
        if (userId) {
          this.playerId = userId
          console.log('✅ Player ID da OneSignal SDK:', this.playerId)
        }
      })

      // Se non abbiamo ancora un ID, aspetta l'inizializzazione
      if (!this.playerId) {
        await new Promise(resolve => {
          window.OneSignal.getUserId().then(userId => {
            this.playerId = userId
            resolve()
          })
        })
      }

      // Imposta i tag utente per personalizzazione
      if (this.playerId) {
        await window.OneSignal.sendTags({
          customer_id: customerData.id?.toString(),
          customer_name: customerData.name,
          customer_email: customerData.email || '',
          customer_phone: customerData.phone || '',
          customer_points: customerData.points?.toString() || '0',
          subscription_date: new Date().toISOString(),
          platform: this.getPlatform()
        })
        console.log('✅ Tag utente impostati')
      }

      console.log('✅ Utente registrato OneSignal SDK:', this.playerId)
      return this.playerId

    } catch (error) {
      console.error('❌ Errore registrazione OneSignal SDK:', error)
      return null
    }
  }

  // Rileva piattaforma corrente
  getPlatform() {
    const userAgent = navigator.userAgent
    if (/iPhone|iPad|iPod/.test(userAgent)) return 'iOS'
    if (/Android/.test(userAgent)) return 'Android'
    if (/Mac OS X/.test(userAgent)) return 'macOS'
    if (/Windows/.test(userAgent)) return 'Windows'
    return 'Web'
  }

  // Controlla se l'app è installata come PWA (importante per iOS)
  isPWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true
  }

  // Mostra prompt installazione PWA per iOS se necessario
  async showPWAInstallPrompt() {
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
    const isPWA = this.isPWA()
    
    if (isIOS && !isPWA) {
      console.log('📱 Dispositivo iOS rilevato, PWA non installata')
      return new Promise(resolve => {
        const dialog = document.createElement('div')
        dialog.innerHTML = `
          <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 999999; display: flex; align-items: center; justify-content: center; padding: 20px;">
            <div style="background: white; border-radius: 12px; padding: 24px; max-width: 400px; text-align: center;">
              <h3>🍎 Per ricevere notifiche su iPhone</h3>
              <p>1. Tocca il pulsante <strong>Condividi</strong> 📤</p>
              <p>2. Seleziona <strong>"Aggiungi alla schermata Home"</strong> ➕</p>
              <p>3. Tocca <strong>"Aggiungi"</strong> per installare l'app</p>
              <button onclick="this.closest('div').remove(); resolve(true)" 
                      style="background: #8B4513; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold;">
                Ho capito!
              </button>
            </div>
          </div>
        `
        document.body.appendChild(dialog)
      })
    }
    return true
  }


  // Aggiorna dati utente con SDK ufficiale
  async updateUserData(customerData) {
    if (!this.initialized || !this.playerId) return

    try {
      await window.OneSignal.sendTags({
        customer_id: customerData.id?.toString(),
        customer_name: customerData.name,
        customer_email: customerData.email || '',
        customer_phone: customerData.phone || '',
        customer_points: customerData.points?.toString() || '0',
        last_update: new Date().toISOString(),
        platform: this.getPlatform()
      })
      console.log('✅ Dati utente aggiornati OneSignal SDK')
    } catch (error) {
      console.error('❌ Errore aggiornamento dati OneSignal SDK:', error)
    }
  }

  // Ottieni stato notifiche con SDK ufficiale
  async getNotificationStatus() {
    if (!this.initialized) return null

    try {
      const permission = await window.OneSignal.getNotificationPermission()
      const userId = await window.OneSignal.getUserId()
      const isSupported = window.OneSignal.isPushNotificationsSupported()
      const isPushEnabled = await window.OneSignal.isPushNotificationsEnabled()
      
      return {
        permission,
        playerId: userId,
        isSubscribed: isPushEnabled,
        pushSupported: isSupported,
        platform: this.getPlatform()
      }
    } catch (error) {
      console.error('❌ Errore stato notifiche SDK:', error)
      return null
    }
  }

  // Logout utente con SDK ufficiale
  async logoutUser() {
    if (!this.initialized) return

    try {
      // Cancella tutti i tag utente
      await window.OneSignal.deleteTags([
        'customer_id',
        'customer_name', 
        'customer_email',
        'customer_phone',
        'customer_points'
      ])
      
      this.playerId = null
      console.log('✅ Logout OneSignal SDK completato')
    } catch (error) {
      console.error('❌ Errore logout OneSignal SDK:', error)
    }
  }

  // Invia notifica push tramite API route (risolve CORS)
  async sendNotification({ title, message, playerIds, url }) {
    try {
      console.log(`📤 Invio notifica a ${playerIds.length} utenti:`, title)

      // Usa l'API route invece della chiamata diretta OneSignal per evitare CORS
      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          message,
          playerIds,
          url
        })
      })

      const result = await response.json()

      if (result.success) {
        console.log('✅ Notifica inviata tramite API route:', result.notificationId)
        return {
          success: true,
          notificationId: result.notificationId,
          recipients: result.recipients
        }
      } else {
        console.error('❌ Errore invio notifica via API:', result.error)
        return {
          success: false,
          error: result.error
        }
      }

    } catch (error) {
      console.error('❌ Errore chiamata API route notifiche:', error)
      return {
        success: false,
        error: error.message || 'Errore di connessione'
      }
    }
  }
}

// Istanza singleton
export const oneSignalService = new OneSignalService()
export default oneSignalService