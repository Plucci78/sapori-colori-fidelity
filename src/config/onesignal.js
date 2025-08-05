// OneSignal Configuration
// Configurazione per notifiche push PWA

export const ONESIGNAL_CONFIG = {
  appId: '61a2318f-68f7-4a79-8beb-203c58bf8763', // OneSignal App ID
  restApiKey: 'you6ukdzyu7vfcm2qzjiulvnc',
  allowLocalhostAsSecureOrigin: true, // Per sviluppo locale
  
  // Configurazioni notifiche
  notificationClickHandling: {
    // Cosa fare quando utente clicca notifica
    default: {
      url: '/portal',
      action: 'navigate'
    }
  },

  // Welcome notification (opzionale)
  welcomeNotification: {
    disable: true // Disabilitiamo per ora
  },

  // Localizzazione italiana
  language: 'it',
  
  // Prompt settings con messaggi personalizzati
  promptOptions: {
    slidedown: {
      enabled: true,
      actionMessage: "🔔 Vuoi ricevere notifiche sui tuoi premi e offerte speciali di Sapori & Colori?",
      acceptButton: "✅ Sì, attiva notifiche",
      cancelButton: "❌ Non ora",
      showCredit: false // Nasconde "Powered by OneSignal"
    },
    customlink: {
      enabled: true,
      style: "button",
      size: "medium",
      color: {
        button: '#8B4513',
        text: '#FFFFFF'
      },
      text: {
        subscribe: "🔔 Attiva Notifiche",
        unsubscribe: "🔕 Disattiva Notifiche",
        explanation: "Ricevi offerte e aggiornamenti sui tuoi premi"
      }
    }
  },

  // Configurazioni avanzate per localizzazione
  autoRegister: false, // Controllo manuale della registrazione
  autoResubscribe: true,
  
  // Messaggi personalizzati per vari stati
  text: {
    'message.action.subscribe': '✅ Perfetto! Riceverai le nostre notifiche',
    'message.action.subscribed': '🔔 Notifiche già attive',
    'message.action.resubscribed': '🔄 Notifiche riattivate',
    'message.action.unsubscribed': '🔕 Notifiche disattivate',
    'dialog.main.title': 'Notifiche Sapori & Colori',
    'dialog.main.button.subscribe': 'Attiva Notifiche',
    'dialog.main.button.unsubscribe': 'Disattiva',
    'dialog.blocked.title': 'Sblocca le notifiche',
    'dialog.blocked.message': 'Clicca sull\'icona della notifica nella barra degli indirizzi per attivarle.'
  }
}

// Configurazione per ambiente di sviluppo
export const isDevelopment = window.location.hostname === 'localhost'

// Configurazione dominio per produzione
export const PRODUCTION_DOMAIN = 'https://sapori-colori-fidelity.vercel.app'