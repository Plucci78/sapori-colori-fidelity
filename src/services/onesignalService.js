import { ONESIGNAL_CONFIG } from '../config/onesignal'

class OneSignalService {
  constructor() {
    this.initialized = false
    this.playerId = null
    this.isInitializing = false
    
    // Inizializza OneSignalDeferred per v16
    window.OneSignalDeferred = window.OneSignalDeferred || []
  }

  // Inizializza OneSignal con SDK v16 ufficiale
  async initialize() {
    // Evita doppia inizializzazione
    if (this.initialized || this.isInitializing) {
      console.log('⚠️ OneSignal già inizializzato o in fase di inizializzazione')
      return this.initialized
    }

    this.isInitializing = true

    try {
      console.log('🔔 Inizializzazione OneSignal SDK v16...')
      console.log('🌐 URL corrente:', window.location.href)
      console.log('📱 User Agent:', navigator.userAgent.includes('iPhone') ? 'iOS' : navigator.userAgent.includes('Android') ? 'Android' : 'Desktop')
      
      return new Promise((resolve) => {
        window.OneSignalDeferred.push(async (OneSignal) => {
          try {
            await OneSignal.init({
              appId: ONESIGNAL_CONFIG.appId,
              safari_web_id: ONESIGNAL_CONFIG.safariWebId || undefined,
              
              // Configurazioni per tutti i browser
              notifyButton: {
                enable: false // Gestiamo il prompt manualmente
              },
              
              // Configurazioni PWA/Web Push
              serviceWorkerPath: '/OneSignalSDKWorker.js',
              serviceWorkerUpdaterPath: '/OneSignalSDKUpdaterWorker.js',
              
              // Supporto multi-piattaforma automatico
              autoResubscribe: true,
              
              // Prompt personalizzato
              promptOptions: ONESIGNAL_CONFIG.promptOptions
            })

            console.log('✅ OneSignal SDK v16 inizializzato')
            this.initialized = true
            this.isInitializing = false
            resolve(true)

          } catch (error) {
            console.error('❌ Errore inizializzazione OneSignal SDK v16:', error)
            this.initialized = false
            this.isInitializing = false
            resolve(false)
          }
        })
      })

    } catch (error) {
      console.error('❌ Errore setup OneSignal SDK v16:', error)
      this.initialized = false
      this.isInitializing = false
      return false
    }
  }

  // Registra utente per notifiche push con SDK v16
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

    return new Promise((resolve) => {
      window.OneSignalDeferred.push(async (OneSignal) => {
        try {
          console.log('📱 Registrazione utente OneSignal SDK v16:', customerData.name)

          // Controlla permessi notifiche
          console.log('🔍 Controllo stato permessi notifiche...')
          const currentPermission = OneSignal.Notifications.permission
          console.log('✅ Stato permessi:', currentPermission)

          if (!currentPermission) {
            // Messaggio personalizzato per l'utente
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
              resolve(null)
              return
            }
            
            console.log('📝 Richiesta permesso notifiche tramite OneSignal SDK v16...')
            
            try {
              // Usa il slidedown prompt OneSignal v16 invece del browser nativo
              console.log('🎯 Tentativo slidedown prompt OneSignal v16...')
              await OneSignal.Slidedown.promptPush({ force: true })
              console.log('✅ Slidedown prompt mostrato')
              
              // Aspetta un po' per dare tempo all'utente di rispondere
              await new Promise(resolve => setTimeout(resolve, 2000))
              
            } catch (error) {
              console.error('❌ Errore slidedown prompt:', error)
              console.log('🔄 Fallback al browser nativo...')
              
              try {
                await OneSignal.Notifications.requestPermission()
                console.log('✅ Permesso browser richiesto')
              } catch (fallbackError) {
                console.error('❌ Errore anche con fallback:', fallbackError)
              }
            }
          }

          // Login utente con External ID per v16
          if (customerData.id) {
            console.log('🔑 Login utente con External ID:', customerData.id)
            await OneSignal.login(customerData.id.toString())
          }

          // Attende che OneSignal generi il Subscription ID (Player ID) con API v16
          console.log('🔄 Aspettando generazione Subscription ID (Player ID)...')
          
          // Strategia v16: usa l'event listener per subscription changes
          let subscriptionId = OneSignal.User.PushSubscription.id
          
          if (subscriptionId) {
            console.log('✅ Subscription ID già disponibile:', subscriptionId)
            this.playerId = subscriptionId
          } else {
            console.log('🔄 Aspettando evento subscription change...')
            
            // Timeout per evitare attese infinite
            const timeoutPromise = new Promise((timeoutResolve) => {
              setTimeout(() => {
                console.log('⏰ Timeout raggiunto per Subscription ID')
                timeoutResolve(null)
              }, 20000) // 20 secondi
            })
            
            // Promise per l'evento subscription change
            const subscriptionPromise = new Promise((subscriptionResolve) => {
              const pushSubscriptionChangeListener = (event) => {
                console.log('📡 Subscription change event:', event)
                if (event.current.id) {
                  console.log('✅ Subscription ID ottenuto via event:', event.current.id)
                  subscriptionResolve(event.current.id)
                }
              }
              
              OneSignal.User.PushSubscription.addEventListener('change', pushSubscriptionChangeListener)
              
              // Controlla anche immediatamente se è già disponibile
              setTimeout(() => {
                const currentId = OneSignal.User.PushSubscription.id
                if (currentId) {
                  console.log('✅ Subscription ID trovato in controllo ritardato:', currentId)
                  subscriptionResolve(currentId)
                }
              }, 1000)
            })
            
            // Aggiungi anche listener per cambio permessi
            const permissionPromise = new Promise((permissionResolve) => {
              OneSignal.Notifications.addEventListener('permissionChange', (permission) => {
                console.log('🔔 Permesso cambiato:', permission)
                if (permission) {
                  // Aspetta un po' e controlla se ora c'è il subscription ID
                  setTimeout(() => {
                    const newId = OneSignal.User.PushSubscription.id
                    if (newId) {
                      console.log('✅ Subscription ID ottenuto dopo permesso:', newId)
                      permissionResolve(newId)
                    }
                  }, 1000)
                }
              })
            })
            
            // Aspetta il primo che si risolve tra tutti e tre
            const result = await Promise.race([subscriptionPromise, timeoutPromise, permissionPromise])
            
            if (result) {
              this.playerId = result
              subscriptionId = result
            }
          }

          if (!subscriptionId) {
            console.error('❌ Impossibile ottenere Subscription ID dopo 20 secondi')
            
            // Debug extra per v16
            try {
              const permission = OneSignal.Notifications.permission
              const isPushSupported = OneSignal.Notifications.isPushSupported()
              const userId = OneSignal.User.onesignalId
              const externalId = OneSignal.User.externalId
              
              console.log('🔍 Debug OneSignal v16:', { 
                permission, 
                isPushSupported,
                userId,
                externalId,
                subscriptionId: OneSignal.User.PushSubscription.id,
                subscriptionToken: OneSignal.User.PushSubscription.token
              })
            } catch (e) {
              console.log('🔍 Errore debug OneSignal v16:', e.message)
            }
            
            resolve(null)
            return
          }

          // Imposta i tag utente per personalizzazione con API v16
          if (subscriptionId) {
            await OneSignal.User.addTags({
              customer_name: customerData.name,
              customer_email: customerData.email || '',
              customer_phone: customerData.phone || '',
              customer_points: customerData.points?.toString() || '0',
              subscription_date: new Date().toISOString(),
              platform: this.getPlatform()
            })
            console.log('✅ Tag utente impostati')
          }

          console.log('✅ Utente registrato OneSignal SDK v16:', subscriptionId)
          resolve(subscriptionId)

        } catch (error) {
          console.error('❌ Errore registrazione OneSignal SDK v16:', error)
          resolve(null)
        }
      })
    })
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

  // Aggiorna dati utente con SDK v16
  async updateUserData(customerData) {
    if (!this.initialized || !this.playerId) return

    return new Promise((resolve) => {
      window.OneSignalDeferred.push(async (OneSignal) => {
        try {
          await OneSignal.User.addTags({
            customer_name: customerData.name,
            customer_email: customerData.email || '',
            customer_phone: customerData.phone || '',
            customer_points: customerData.points?.toString() || '0',
            last_update: new Date().toISOString(),
            platform: this.getPlatform()
          })
          console.log('✅ Dati utente aggiornati OneSignal SDK v16')
          resolve(true)
        } catch (error) {
          console.error('❌ Errore aggiornamento dati OneSignal SDK v16:', error)
          resolve(false)
        }
      })
    })
  }

  // Ottieni stato notifiche con SDK v16
  async getNotificationStatus() {
    if (!this.initialized) return null

    return new Promise((resolve) => {
      window.OneSignalDeferred.push(async (OneSignal) => {
        try {
          const permission = OneSignal.Notifications.permission
          const subscriptionId = OneSignal.User.PushSubscription.id
          const isSupported = OneSignal.Notifications.isPushSupported()
          const optedIn = OneSignal.User.PushSubscription.optedIn
          
          resolve({
            permission,
            playerId: subscriptionId,
            isSubscribed: optedIn,
            pushSupported: isSupported,
            platform: this.getPlatform()
          })
        } catch (error) {
          console.error('❌ Errore stato notifiche SDK v16:', error)
          resolve(null)
        }
      })
    })
  }

  // Logout utente con SDK v16
  async logoutUser() {
    if (!this.initialized) return

    return new Promise((resolve) => {
      window.OneSignalDeferred.push(async (OneSignal) => {
        try {
          // Rimuovi tutti i tag utente
          await OneSignal.User.removeTags([
            'customer_name', 
            'customer_email',
            'customer_phone',
            'customer_points'
          ])
          
          // Logout dall'External ID
          await OneSignal.logout()
          
          this.playerId = null
          console.log('✅ Logout OneSignal SDK v16 completato')
          resolve(true)
        } catch (error) {
          console.error('❌ Errore logout OneSignal SDK v16:', error)
          resolve(false)
        }
      })
    })
  }

  // Metodi per compatibilità con il codice esistente
  async promptPermission() {
    console.log('🔔 promptPermission chiamato - usando registerUser v16...')
    const customerData = JSON.parse(localStorage.getItem('pwa_customer_data') || '{}')
    if (customerData.id) {
      return await this.registerUser(customerData)
    }
    return null
  }

  // Listener per cambiamenti subscription v16
  onSubscriptionChange(callback) {
    console.log('👂 onSubscriptionChange listener aggiunto per v16')
    if (typeof callback === 'function') {
      window.OneSignalDeferred.push((OneSignal) => {
        OneSignal.User.PushSubscription.addEventListener('change', callback)
        console.log('📡 Subscription change listener registrato v16')
      })
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