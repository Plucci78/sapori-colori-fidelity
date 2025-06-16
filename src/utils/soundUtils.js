// Utility per gestire i suoni dell'applicazione

class SoundManager {
  constructor() {
    this.sounds = {
      addGemme: new Audio('/sounds/coin.wav'),        // Suono per aggiungere GEMME (positivo)
      removeGemme: new Audio('/sounds/lose.wav'),      // Suono per rimuovere GEMME (negativo)
      removeGemmeAlt: new Audio('/sounds/remove.wav'), // Suono alternativo per rimozione
      qrScan: new Audio('/sounds/scannerqr.mp3'),     // Suono dedicato per scansione QR code (MP3)
    }
    
    // Precarica i suoni e gestisce errori
    Object.entries(this.sounds).forEach(([key, audio]) => {
      audio.preload = 'auto'
      audio.volume = 0.6 // Volume moderato
      
      // Gestione errori di caricamento
      audio.addEventListener('error', () => {
        console.warn(`❌ Impossibile caricare il suono: ${key}`)
      })
    })
  }

  /**
   * Riproduce il suono appropriato per l'aggiunta di GEMME
   * @param {number} amount - Quantità di GEMME aggiunte
   */
  playAddGemme(amount = 0) {
    try {
      const audio = this.sounds.addGemme.cloneNode()
      audio.volume = Math.min(0.8, 0.4 + (Math.abs(amount) * 0.03)) // Volume proporzionale
      audio.play().catch(error => {
        console.warn('❌ Errore riproduzione suono aggiunta GEMME:', error)
      })
    } catch (error) {
      console.warn('❌ Errore suono aggiunta GEMME:', error)
    }
  }

  /**
   * Riproduce il suono appropriato per la rimozione di GEMME
   * @param {number} amount - Quantità di GEMME rimosse (valore negativo)
   * @param {boolean} useAltSound - Se usare il suono alternativo
   */
  playRemoveGemme(amount = 0, useAltSound = false) {
    try {
      const soundKey = useAltSound ? 'removeGemmeAlt' : 'removeGemme'
      const audio = this.sounds[soundKey].cloneNode()
      audio.volume = Math.min(0.8, 0.4 + (Math.abs(amount) * 0.03)) // Volume proporzionale
      audio.play().catch(error => {
        console.warn('❌ Errore riproduzione suono rimozione GEMME:', error)
      })
    } catch (error) {
      console.warn('❌ Errore suono rimozione GEMME:', error)
    }
  }

  /**
   * Riproduce il suono per la scansione QR code
   */
  playQRScan() {
    try {
      const audio = this.sounds.qrScan.cloneNode()
      audio.volume = 0.7 // Volume moderato per feedback
      audio.play().catch(error => {
        console.warn('❌ Errore riproduzione suono scansione QR:', error)
      })
    } catch (error) {
      console.warn('❌ Errore suono scansione QR:', error)
    }
  }

  /**
   * Riproduce il suono appropriato in base al valore delle GEMME
   * @param {number} amount - Quantità di GEMME (positiva o negativa)
   * @param {boolean} useAltRemoveSound - Se usare il suono alternativo per la rimozione
   */
  playGemmeSound(amount, useAltRemoveSound = false) {
    const numAmount = parseInt(amount)
    
    if (numAmount > 0) {
      this.playAddGemme(numAmount)
    } else if (numAmount < 0) {
      this.playRemoveGemme(numAmount, useAltRemoveSound)
    }
  }

  /**
   * Testa i suoni disponibili
   */
  testSounds() {
    console.log('🔊 Testing suoni GEMME...')
    
    setTimeout(() => {
      console.log('🔊 Suono aggiunta GEMME (+10)...')
      this.playAddGemme(10)
    }, 500)
    
    setTimeout(() => {
      console.log('🔊 Suono rimozione GEMME standard (-10)...')
      this.playRemoveGemme(-10, false)
    }, 1500)
    
    setTimeout(() => {
      console.log('🔊 Suono rimozione GEMME alternativo (-10)...')
      this.playRemoveGemme(-10, true)
    }, 2500)
    
    setTimeout(() => {
      console.log('✅ Test completato!')
    }, 3500)
  }

  /**
   * Disabilita tutti i suoni
   */
  mute() {
    Object.values(this.sounds).forEach(audio => {
      audio.volume = 0
    })
  }

  /**
   * Riabilita tutti i suoni
   */
  unmute() {
    Object.values(this.sounds).forEach(audio => {
      audio.volume = 0.6
    })
  }

  /**
   * Ottieni lista dei suoni disponibili
   */
  getSoundsList() {
    return Object.keys(this.sounds).map(key => ({
      key,
      description: this.getSoundDescription(key)
    }))
  }

  /**
   * Descrizioni dei suoni
   */
  getSoundDescription(key) {
    const descriptions = {
      addGemme: '🟢 Aggiunta GEMME (positivo)',
      removeGemme: '🔴 Rimozione GEMME (principale)', 
      removeGemmeAlt: '⚠️ Rimozione GEMME (alternativo)',
      qrScan: '📱 Scansione QR Code'
    }
    return descriptions[key] || key
  }
}
// Istanza globale del sound manager
export const soundManager = new SoundManager()

// Funzioni helper per facilità d'uso
export const playGemmeSound = (amount, useAltRemoveSound = false) => soundManager.playGemmeSound(amount, useAltRemoveSound)
export const playAddGemmeSound = (amount) => soundManager.playAddGemme(amount)
export const playRemoveGemmeSound = (amount, useAltSound = false) => soundManager.playRemoveGemme(amount, useAltSound)
export const playQRScanSound = () => soundManager.playQRScan()
export const testGemmeSounds = () => soundManager.testSounds()
export const getSoundsList = () => soundManager.getSoundsList()

// Funzioni avanzate
export const playRemoveGemmeStandard = (amount) => soundManager.playRemoveGemme(amount, false)
export const playRemoveGemmeAlt = (amount) => soundManager.playRemoveGemme(amount, true)

export default soundManager
