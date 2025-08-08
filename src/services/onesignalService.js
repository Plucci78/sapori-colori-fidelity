import { ONESIGNAL_CONFIG, isDevelopment } from '../config/onesignal'

class OneSignalService {
  constructor() {
    this.initialized = false
    this.playerId = null
    this.isInitializing = false
  }

  // Inizializza OneSignal con SDK ufficiale
  async initialize() {
    // Evita doppia inizializzazione
    if (this.initialized || this.isInitializing) {
      console.log('⚠️ OneSignal già inizializzato o in fase di inizializzazione')
      return this.initialized
    }

    this.isInitializing = true

    try {
      console.log('🔔 Inizializzazione OneSignal SDK ufficiale...')
      console.log('🌐 URL corrente:', window.location.href)
      console.log('📱 User Agent:', navigator.userAgent.includes('iPhone') ? 'iOS' : navigator.userAgent.includes('Android') ? 'Android' : 'Desktop')
      
      // Controlla se OneSignal è già stato inizializzato globalmente
      if (window.OneSignal && typeof window.OneSignal.initialized !== 'undefined') {
        console.log('✅ OneSignal già inizializzato globalmente')
        this.initialized = true
        this.isInitializing = false
        return true
      }
      
      // Aspetta che OneSignal SDK sia caricato
      await this.waitForOneSignal()

      // Inizializza OneSignal solo se non è già inizializzato
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
      this.isInitializing = false
      return true

    } catch (error) {
      console.error('❌ Errore inizializzazione OneSignal SDK:', error)
      this.initialized = false
      this.isInitializing = false
      return false
    }
  }

  // Aspetta che OneSignal SDK sia disponibile
  async waitForOneSignal() {
    let attempts = 0
    while (!window.OneSignal && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }
    
    if (!window.OneSignal) {
      throw new Error('OneSignal SDK non caricato dopo 5 secondi')
    }
    
    console.log('✅ OneSignal SDK disponibile')
  }

  // Registra utente per notifiche push con SDK ufficiale
  async registerUser(customerData) {
    // Se c'è già un Player ID, evita doppia registrazione
    if (this.playerId) {
      console.log('⚠️ Utente già registrato con Player ID:', this.playerId)
      return this.playerId
    }

    if (!this.initialized) {
      const success = await this.initialize()
      if (!success) {
        console.error('❌ Impossibile inizializzare OneSignal')
        return null
      }
    }

    try {
      console.log('📱 Registrazione utente OneSignal SDK:', customerData.name)

      // Controlla se già sottoscritto (SEMPLIFICATO)
      console.log('🔍 Controllo stato permessi notifiche...')
      let isSubscribed = 'default' // Assumiamo sempre che non sia ancora iscritto
      
      // Controllo rapido senza bloccare
      try {
        isSubscribed = Notification.permission || 'default'
        console.log('✅ Stato permessi browser:', isSubscribed)
      } catch (error) {
        console.log('ℹ️ Controllo permessi non disponibile, procedo...')
      }

      if (isSubscribed !== 'granted') {
        // Messaggio unico che gestisce sia iOS che altri dispositivi
        const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
        let message = `🔔 Ciao ${customerData.name}!\n\n`
        
        if (isIOS && !this.isPWA()) {
          message += `🍎 IMPORTANTE per iPhone/iPad:\n` +
                    `Prima installa l'app: "Condividi" → "Aggiungi alla Home"\n\n`
        }
        
        message += `Vuoi ricevere notifiche personalizzate su:\n` +
                  `• 🎁 Premi disponibili\n` +
                  `• ✨ Offerte speciali\n` +
                  `• 🎯 Promozioni esclusive\n\n` +
                  `(Il browser ti chiederà poi conferma)`
        
        const userAccepted = confirm(message)
        
        if (!userAccepted) {
          console.log('⚠️ Utente ha rifiutato la registrazione notifiche')
          return null
        }
        
        console.log('📝 Richiesta permesso notifiche tramite OneSignal SDK...')
        
        // OneSignal gestisce automaticamente iOS, Android, Desktop
        try {
          // Prova prima v16 API
          if (window.OneSignal.User && window.OneSignal.User.PushSubscription) {
            console.log('🔧 Usando OneSignal v16 API...')
            await window.OneSignal.User.PushSubscription.optIn()
            console.log('✅ Registrazione push v16 completata')
          } else {
            // Fallback v15 API
            console.log('🔧 Usando OneSignal v15 API...')
            await window.OneSignal.registerForPushNotifications()
            console.log('✅ Registrazione push v15 completata')
          }
        } catch (error) {
          console.error('❌ Errore registrazione push:', error)
          console.log('🔄 Tentativo metodo alternativo...')
          try {
            // Ultimo tentativo con metodo diretto
            await window.OneSignal.showNativePrompt()
            console.log('✅ Prompt nativo mostrato')
          } catch (error2) {
            console.error('❌ Tutti i metodi falliti:', error2)
            return null
          }
        }
      }

      // Attende che OneSignal generi il Player ID
      console.log('🔄 Aspettando generazione Player ID...')
      
      // Aspetta fino a 10 secondi per il Player ID (v16 API)
      let attempts = 0
      while (!this.playerId && attempts < 100) {
        try {
          // Prova prima v16 API
          const userId = window.OneSignal.User?.PushSubscription?.id || await window.OneSignal.getUserId()
          if (userId) {
            this.playerId = userId
            console.log('✅ Player ID ottenuto (v16):', this.playerId)
            break
          }
        } catch (e) {
          // Se v16 non funziona, prova v15
          try {
            const userId = await window.OneSignal.getUserId()
            if (userId) {
              this.playerId = userId
              console.log('✅ Player ID ottenuto (v15):', this.playerId)
              break
            }
          } catch (e2) {
            console.log(`🔄 Tentativo ${attempts}/100 - Player ID non ancora disponibile`)
          }
        }
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
      }

      if (!this.playerId) {
        console.error('❌ Impossibile ottenere Player ID dopo 10 secondi')
        return null
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

  // Metodi mancanti per compatibilità
  async promptPermission() {
    console.log('🔔 promptPermission chiamato - usando registerUser...');
    const customerData = JSON.parse(localStorage.getItem('pwa_customer_data') || '{}');
    if (customerData.id) {
      // Chiamata diretta senza popup duplicato
      return await this.registerUser(customerData);
    }
    return null;
  }

  // Listener per cambiamenti subscription  
  onSubscriptionChange(callback) {
    console.log('👂 onSubscriptionChange listener aggiunto');
    // Implementazione semplice - potrebbe essere estesa se necessario
    if (typeof callback === 'function') {
      // Per ora solo log, può essere implementato con polling o eventi OneSignal
      console.log('📡 Subscription change listener registrato');
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