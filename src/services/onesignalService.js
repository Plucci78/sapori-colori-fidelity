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

        // Service Worker personalizzato self-hosted (evita CDN)
        serviceWorkerUpdaterPath: '/OneSignalSDKUpdaterWorker.js',
        serviceWorkerPath: '/OneSignalSDKWorker.js',
        
        // Configurazioni per evitare caricamenti CDN
        persistNotification: false,
        autoRegister: false
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
      
      // Se non ha ancora dato il permesso, mostra messaggio personalizzato prima
      if (!permission) {
        // Mostra messaggio personalizzato in italiano prima del popup del browser
        const userAccepted = await this.showCustomPermissionDialog(customerData.name)
        if (!userAccepted) {
          console.log('⚠️ Utente ha rifiutato nel messaggio personalizzato')
          return null
        }
        
        console.log('📝 Richiesta permesso notifiche al browser...')
        permission = await OneSignal.requestPermission()
        
        // Aspetta un po' per permettere al popup di processare la risposta
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        if (!permission) {
          console.log('⚠️ Utente ha rifiutato le notifiche nel browser')
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

  // Mostra dialogo personalizzato per richiedere permesso notifiche
  async showCustomPermissionDialog(customerName) {
    return new Promise((resolve) => {
      // Crea il dialogo HTML
      const dialog = document.createElement('div')
      dialog.id = 'custom-permission-dialog'
      dialog.innerHTML = `
        <div class="permission-overlay">
          <div class="permission-dialog">
            <div class="permission-header">
              <img src="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png" 
                   alt="Sapori & Colori" class="permission-logo">
              <h3>🔔 Notifiche Personalizzate</h3>
            </div>
            <div class="permission-content">
              <p>Ciao <strong>${customerName}</strong>! 👋</p>
              <p>Vuoi ricevere notifiche personalizzate sui tuoi:</p>
              <ul>
                <li>🎁 <strong>Premi disponibili</strong> in base ai tuoi punti</li>
                <li>✨ <strong>Offerte speciali</strong> dedicate a te</li>
                <li>🎯 <strong>Promozioni esclusive</strong> per il tuo livello</li>
                <li>🎂 <strong>Auguri di compleanno</strong> con sorprese</li>
              </ul>
              <p class="permission-note">
                📱 Dopo aver cliccato "Sì", il browser ti chiederà conferma (in inglese). 
                <br>Clicca <strong>"Allow"</strong> o <strong>"Consenti"</strong> per completare.
              </p>
            </div>
            <div class="permission-actions">
              <button class="permission-btn deny">❌ Non ora</button>
              <button class="permission-btn accept">✅ Sì, attiva notifiche!</button>
            </div>
          </div>
        </div>
      `

      // Stili CSS inline
      const style = document.createElement('style')
      style.textContent = `
        #custom-permission-dialog {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 99999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .permission-overlay {
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

        .permission-dialog {
          background: white;
          border-radius: 20px;
          max-width: 480px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease;
        }

        .permission-header {
          text-align: center;
          padding: 24px 24px 16px 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .permission-logo {
          width: 60px;
          height: 60px;
          object-fit: contain;
          margin-bottom: 12px;
        }

        .permission-header h3 {
          margin: 0;
          color: #8B4513;
          font-size: 1.4em;
          font-weight: bold;
        }

        .permission-content {
          padding: 24px;
        }

        .permission-content p {
          margin: 0 0 16px 0;
          color: #374151;
          line-height: 1.5;
        }

        .permission-content ul {
          margin: 16px 0;
          padding-left: 0;
          list-style: none;
        }

        .permission-content li {
          margin: 8px 0;
          padding: 8px 12px;
          background: #f8fafc;
          border-radius: 8px;
          border-left: 3px solid #8B4513;
        }

        .permission-note {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 10px;
          padding: 12px;
          font-size: 0.9em;
          color: #92400e;
        }

        .permission-actions {
          padding: 0 24px 24px 24px;
          display: flex;
          gap: 12px;
        }

        .permission-btn {
          flex: 1;
          padding: 14px 20px;
          border: none;
          border-radius: 12px;
          font-size: 1em;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .permission-btn.deny {
          background: #f3f4f6;
          color: #6b7280;
        }

        .permission-btn.deny:hover {
          background: #e5e7eb;
          transform: translateY(-1px);
        }

        .permission-btn.accept {
          background: linear-gradient(135deg, #8B4513 0%, #D4AF37 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(139, 69, 19, 0.3);
        }

        .permission-btn.accept:hover {
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
          .permission-dialog {
            margin: 10px;
            max-width: none;
          }
          
          .permission-header, .permission-content, .permission-actions {
            padding: 16px;
          }
          
          .permission-actions {
            flex-direction: column;
          }
        }
      `

      // Aggiungi al DOM
      document.head.appendChild(style)
      document.body.appendChild(dialog)

      // Event listeners
      const acceptBtn = dialog.querySelector('.permission-btn.accept')
      const denyBtn = dialog.querySelector('.permission-btn.deny')

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