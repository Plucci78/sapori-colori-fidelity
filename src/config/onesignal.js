// OneSignal Configuration
// Configurazione per notifiche push PWA

export const ONESIGNAL_CONFIG = {
  appId: '61a2318f-68f7-4a79-8beb-203c58bf8763', // OneSignal App ID
  restApiKey: 'os_v2_app_mgrddd3i65fhtc7lea6frp4hmmyou6ukdzyu7vfcm2qzjiulvnc3wnewh66pban3dtkw4pcsyapuh4wrlqw7lxgbemnkir6eu5s4fvy',
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

  // Prompt settings
  promptOptions: {
    slidedown: {
      enabled: true,
      actionMessage: "Vuoi ricevere notifiche sui tuoi premi e offerte speciali?",
      acceptButton: "Sì, attiva notifiche",
      cancelButton: "Non ora"
    }
  }
}

// Configurazione per ambiente di sviluppo
export const isDevelopment = window.location.hostname === 'localhost'

// Configurazione dominio per produzione
export const PRODUCTION_DOMAIN = 'https://sapori-colori-fidelity.vercel.app'