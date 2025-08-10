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

    // Controllo aggiuntivo: verifica se OneSignal ha già una subscription attiva
    return new Promise((resolve) => {
      window.OneSignalDeferred.push(async (OneSignal) => {
        try {
          const existingSubscriptionId = OneSignal.User.PushSubscription.id
          const hasPermission = OneSignal.Notifications.permission
          
          if (existingSubscriptionId && hasPermission) {
            console.log('✅ Subscription OneSignal già attiva:', existingSubscriptionId)
            this.playerId = existingSubscriptionId
            resolve(existingSubscriptionId)
            return
          }
          
          console.log('🆕 Nessuna subscription attiva - procedo con registrazione')
          // Continua con la registrazione normale
          this.performRegistration(customerData, resolve)
          
        } catch (error) {
          console.error('❌ Errore controllo subscription esistente:', error)
          // Se errore, procedi comunque con registrazione
          this.performRegistration(customerData, resolve)
        }
      })
    })
  }

  // Metodo separato per eseguire la registrazione
  async performRegistration(customerData, resolve) {
    if (!this.initialized) {
      const success = await this.initialize()
      if (!success) {
        console.error('❌ Impossibile inizializzare OneSignal')
        resolve(null)
        return
      }
    }

    window.OneSignalDeferred.push(async (OneSignal) => {
        try {
          console.log('📱 Registrazione utente OneSignal SDK v16:', customerData.name)

          // Controlla permessi notifiche
          console.log('🔍 Controllo stato permessi notifiche...')
          const currentPermission = OneSignal.Notifications.permission
          console.log('✅ Stato permessi:', currentPermission)

          if (!currentPermission) {
            console.log('📝 Richiesta permesso notifiche tramite OneSignal SDK v16...')
            
            try {
              // Mostra popup custom invece del slidedown OneSignal
              console.log('🎯 Mostrando popup custom per permessi...')
              const userAccepted = await this.showCustomNotificationDialog(customerData.name)
              
              if (userAccepted) {
                console.log('✅ Utente ha accettato - attivando permessi browser...')
                // Usa l'API diretta OneSignal v16 per richiedere permesso
                const permissionGranted = await OneSignal.Notifications.requestPermission()
                console.log('📱 Permesso browser ricevuto:', permissionGranted)
                
                if (!permissionGranted) {
                  console.log('⚠️ Utente ha rifiutato nel popup browser')
                  resolve(null)
                  return
                }
              } else {
                console.log('⚠️ Utente ha rifiutato nel popup custom')
                resolve(null)
                return
              }
              
            } catch (error) {
              console.error('❌ Errore popup custom:', error)
              resolve(null)
              return
            }
          }

          // Login utente con External ID (Customer ID) per collegamento con database
          if (customerData.id) {
            console.log('🔑 Login utente con Customer ID come External ID:', customerData.id)
            await OneSignal.login(customerData.id.toString())
            console.log('✅ OneSignal External ID impostato:', customerData.id)
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
            
            // Debug extra per v16 - Mostra anche a schermo per mobile
            try {
              const permission = OneSignal.Notifications.permission
              const isPushSupported = OneSignal.Notifications.isPushSupported()
              const userId = OneSignal.User.onesignalId
              const externalId = OneSignal.User.externalId
              const subscriptionId = OneSignal.User.PushSubscription.id
              const subscriptionToken = OneSignal.User.PushSubscription.token
              const browserPermission = Notification.permission
              
              const debugInfo = { 
                permission, 
                isPushSupported,
                userId,
                externalId,
                subscriptionId,
                subscriptionToken,
                browserPermission
              }
              
              console.log('🔍 Debug OneSignal v16:', debugInfo)
              
              // Mostra debug anche visivamente per mobile
              const debugDiv = document.createElement('div')
              debugDiv.id = 'onesignal-debug'
              debugDiv.style.cssText = 'position:fixed;top:10px;left:10px;background:black;color:lime;padding:10px;font-family:monospace;font-size:12px;z-index:999999;max-width:90vw;overflow-wrap:break-word;'
              debugDiv.innerHTML = `
                <h4>🔍 OneSignal Debug</h4>
                <div>Permission: ${permission}</div>
                <div>Browser Permission: ${browserPermission}</div>
                <div>Push Supported: ${isPushSupported}</div>
                <div>User ID: ${userId || 'null'}</div>
                <div>External ID: ${externalId || 'null'}</div>
                <div>Subscription ID: ${subscriptionId || 'null'}</div>
                <div>Subscription Token: ${subscriptionToken ? 'presente' : 'null'}</div>
                <button onclick="this.parentElement.remove()" style="margin-top:10px;">Chiudi</button>
              `
              
              // Rimuovi debug precedenti
              const existing = document.getElementById('onesignal-debug')
              if (existing) existing.remove()
              
              document.body.appendChild(debugDiv)
              
              // Auto-rimuovi dopo 30 secondi
              setTimeout(() => {
                const debugEl = document.getElementById('onesignal-debug')
                if (debugEl) debugEl.remove()
              }, 30000)
              
            } catch (e) {
              console.log('🔍 Errore debug OneSignal v16:', e.message)
            }
            
            resolve(null)
            return
          }

          // Imposta tag avanzati per segmentazione marketing potente
          if (subscriptionId) {
            const tags = {
              // Info base cliente
              customer_name: customerData.name,
              customer_email: customerData.email || '',
              customer_phone: customerData.phone || '',
              customer_id: customerData.id,
              
              // Dati loyalty avanzati  
              customer_points: customerData.points?.toString() || '0',
              current_level: customerData.current_level || 'Bronzo',
              wallet_balance: customerData.wallet_balance?.toString() || '0',
              referral_count: customerData.referral_count?.toString() || '0',
              
              // Segmentazione per livelli esistenti
              is_platinum: customerData.current_level === 'Platinum' ? 'true' : 'false',
              is_gold: customerData.current_level === 'Oro' ? 'true' : 'false',
              is_silver: customerData.current_level === 'Argento' ? 'true' : 'false',
              registration_month: new Date(customerData.created_at || new Date()).toISOString().substring(0, 7),
              
              // Info tecniche
              subscription_date: new Date().toISOString(),
              platform: this.getPlatform(),
              last_sync: new Date().toISOString()
            }
            
            await OneSignal.User.addTags(tags)
            console.log('✅ Tag avanzati impostati per segmentazione:', Object.keys(tags).length, 'tags')

            // 🔄 SINCRONIZZAZIONE AUTOMATICA: Aggiorna entrambi gli ID OneSignal nel database
            try {
              const { createClient } = await import('@supabase/supabase-js')
              const supabase = createClient(
                'https://jexkalekaofsfcusdfjh.supabase.co',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGthbGVrYW9mc2ZjdXNkZmpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYyNjEzNCwiZXhwIjoyMDY0MjAyMTM0fQ.43plaZecrTvbwkr7U7g2Ucogkd0VgKRUg9VkJ--7JCU'
              )

              // Ottieni anche OneSignal User ID per completezza
              const oneSignalUserId = OneSignal.User.onesignalId
              
              console.log('🔄 Sincronizzazione automatica ID OneSignal nel database...')
              console.log('📝 Subscription ID:', subscriptionId)
              console.log('📝 OneSignal User ID:', oneSignalUserId)

              const updateData = {
                onesignal_subscription_id: subscriptionId, // Nuovo campo per Subscription ID
              }

              // Se abbiamo anche il OneSignal User ID, aggiornalo
              if (oneSignalUserId) {
                updateData.onesignal_player_id = oneSignalUserId // Player ID ora è OneSignal User ID
              }

              const { error: updateError } = await supabase
                .from('customers')
                .update(updateData)
                .eq('id', customerData.id)

              if (updateError) {
                console.error('❌ Errore sincronizzazione ID OneSignal:', updateError)
              } else {
                console.log('✅ ID OneSignal sincronizzati automaticamente nel database')
                console.log('✅ Subscription ID (per notifiche):', subscriptionId)
                if (oneSignalUserId) {
                  console.log('✅ User ID (per identificazione):', oneSignalUserId)
                }
              }
            } catch (syncError) {
              console.error('❌ Errore durante sincronizzazione automatica:', syncError)
            }
          }

          console.log('✅ Utente registrato OneSignal SDK v16:', subscriptionId)
          resolve(subscriptionId)

        } catch (error) {
          console.error('❌ Errore registrazione OneSignal SDK v16:', error)
          resolve(null)
        }
      })
  }

  // Mostra dialogo personalizzato per richiedere permesso notifiche (OneSignal v16)
  async showCustomNotificationDialog(customerName) {
    return new Promise((resolve) => {
      // Crea il dialogo HTML
      const dialog = document.createElement('div')
      dialog.id = 'custom-notification-dialog-v16'
      dialog.innerHTML = `
        <div class="notification-overlay">
          <div class="notification-dialog">
            <div class="notification-header">
              <img src="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png" 
                   alt="Sapori & Colori" class="notification-logo">
              <h3>🔔 Attiva le Notifiche Push</h3>
            </div>
            <div class="notification-content">
              <p>Ciao <strong>${customerName}</strong>! 👋</p>
              <p>Vuoi ricevere notifiche personalizzate sui tuoi:</p>
              <ul>
                <li>🎁 <strong>Premi disponibili</strong> quando raggiungi i punti necessari</li>
                <li>✨ <strong>Offerte speciali</strong> dedicate al tuo livello</li>
                <li>🎯 <strong>Promozioni esclusive</strong> per clienti fedeli</li>
                <li>🎂 <strong>Auguri di compleanno</strong> con sorprese</li>
              </ul>
              <p class="notification-note">
                📱 Dopo aver cliccato "Sì, attiva!", il browser ti chiederà conferma. 
                <br>Clicca <strong>"Allow"</strong> o <strong>"Consenti"</strong> per completare.
              </p>
            </div>
            <div class="notification-actions">
              <button class="notification-btn deny">❌ Non ora</button>
              <button class="notification-btn accept">✅ Sì, attiva!</button>
            </div>
          </div>
        </div>
      `

      // Stili CSS inline
      const style = document.createElement('style')
      style.textContent = `
        #custom-notification-dialog-v16 {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 99999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .notification-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: fadeIn 0.3s ease;
        }

        .notification-dialog {
          background: white;
          border-radius: 20px;
          max-width: 480px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease;
        }

        .notification-header {
          text-align: center;
          padding: 24px 24px 16px 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .notification-logo {
          width: 60px;
          height: 60px;
          object-fit: contain;
          margin-bottom: 12px;
        }

        .notification-header h3 {
          margin: 0;
          color: #8B4513;
          font-size: 1.4em;
          font-weight: bold;
        }

        .notification-content {
          padding: 24px;
        }

        .notification-content p {
          margin: 0 0 16px 0;
          color: #374151;
          line-height: 1.5;
        }

        .notification-content ul {
          margin: 16px 0;
          padding-left: 0;
          list-style: none;
        }

        .notification-content li {
          margin: 8px 0;
          padding: 8px 12px;
          background: #f8fafc;
          border-radius: 8px;
          border-left: 3px solid #8B4513;
        }

        .notification-note {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 10px;
          padding: 12px;
          font-size: 0.9em;
          color: #92400e;
        }

        .notification-actions {
          padding: 0 24px 24px 24px;
          display: flex;
          gap: 12px;
        }

        .notification-btn {
          flex: 1;
          padding: 14px 20px;
          border: none;
          border-radius: 12px;
          font-size: 1em;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .notification-btn.deny {
          background: #f3f4f6;
          color: #6b7280;
        }

        .notification-btn.deny:hover {
          background: #e5e7eb;
          transform: translateY(-1px);
        }

        .notification-btn.accept {
          background: linear-gradient(135deg, #8B4513 0%, #D4AF37 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(139, 69, 19, 0.3);
        }

        .notification-btn.accept:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(139, 69, 19, 0.4);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 480px) {
          .notification-dialog {
            margin: 10px;
            max-width: none;
          }
          
          .notification-header, .notification-content, .notification-actions {
            padding: 16px;
          }
          
          .notification-actions {
            flex-direction: column;
          }
        }
      `

      // Aggiungi al DOM
      document.head.appendChild(style)
      document.body.appendChild(dialog)

      // Event listeners
      const acceptBtn = dialog.querySelector('.notification-btn.accept')
      const denyBtn = dialog.querySelector('.notification-btn.deny')

      const cleanup = () => {
        document.body.removeChild(dialog)
        document.head.removeChild(style)
      }

      acceptBtn.addEventListener('click', () => {
        cleanup()
        resolve(true)
      })

      denyBtn.addEventListener('click', () => {
        cleanup()
        resolve(false)
      })

      // Chiudi con ESC
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          cleanup()
          document.removeEventListener('keydown', handleKeyDown)
          resolve(false)
        }
      }
      document.addEventListener('keydown', handleKeyDown)
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

  // Invia notifica push tramite API route con tracking completo
  async sendNotification({ title, message, playerIds, url, targetType, targetValue, sentBy }) {
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
          url,
          targetType,
          targetValue,
          sentBy
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