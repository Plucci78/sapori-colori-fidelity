// TabletNFCManager - Gestione NFC specializzata per tablet
// Ottimizzato per ACR122U via WebUSB

class TabletNFCManager {
  constructor() {
    this.device = null
    this.isConnected = false
    this.isScanning = false
    this.onTagRead = null
    this.onError = null
    this.onStatusChange = null
    
    // Configurazione NFC Tool Pro
    this.VENDOR_ID = null    // Da rilevare automaticamente
    this.PRODUCT_ID = null   // Da rilevare automaticamente
    this.DEVICE_NAME = "NFC Tool Pro"
  }

  // Inizializzazione lettore per tablet
  async initializeReader() {
    try {
      // Check supporto WebUSB
      if (!navigator.usb) {
        throw new Error('WebUSB non supportato su questo tablet')
      }

      // Richiedi permessi per ACR122U
      this.device = await navigator.usb.requestDevice({
        filters: [{
          vendorId: this.VENDOR_ID,
          productId: this.PRODUCT_ID
        }]
      })

      if (this.device) {
        await this.connectDevice()
        this.onStatusChange?.({ connected: true, reader: 'ACR122U' })
        return true
      }

    } catch (err) {
      console.error('Errore inizializzazione lettore:', err)
      this.onError?.(`Errore lettore: ${err.message}`)
      return false
    }
  }

  // Connessione dispositivo
  async connectDevice() {
    if (!this.device) return false

    try {
      await this.device.open()
      await this.device.selectConfiguration(1)
      await this.device.claimInterface(0)
      
      this.isConnected = true
      console.log('✅ Lettore NFC connesso')
      return true

    } catch (error) {
      console.error('Errore connessione:', error)
      this.isConnected = false
      throw error
    }
  }

  // Scansione ottimizzata per tablet (modalità kiosk)
  async startTabletScan(callbacks = {}) {
    if (!this.isConnected) {
      await this.initializeReader()
    }

    if (!this.isConnected) {
      throw new Error('Lettore NFC non connesso')
    }

    this.isScanning = true
    this.onTagRead = callbacks.onTagRead
    this.onError = callbacks.onError

    // Polling continuo ottimizzato per tablet
    this.scanLoop()
  }

  // Loop di scansione continuo
  async scanLoop() {
    while (this.isScanning && this.isConnected) {
      try {
        const tagId = await this.readSingleTag()
        
        if (tagId && tagId !== '00000000') {
          // Tag trovato!
          console.log('🏷️ Tag letto:', tagId)
          
          // Feedback visivo/sonoro per tablet
          this.tabletFeedback()
          
          // Callback con dati tag
          this.onTagRead?.({
            tagId: tagId.toUpperCase(),
            timestamp: new Date().toISOString(),
            reader: 'tablet-hardware'
          })
          
          // Breve pausa per evitare letture multiple
          await this.sleep(1000)
        }
        
        // Polling interval ottimizzato
        await this.sleep(300)
        
      } catch (error) {
        console.error('Errore lettura tag:', error)
        this.onError?.(`Errore lettura: ${error.message}`)
        await this.sleep(1000) // Pausa più lunga in caso di errore
      }
    }
  }

  // Lettura singolo tag
  async readSingleTag() {
    if (!this.device || !this.isConnected) return null

    try {
      // Comando APDU per lettura UID (ACR122U)
      const getUIDCommand = new Uint8Array([
        0xFF, 0xCA, 0x00, 0x00, 0x00 // Get Data command per UID
      ])

      // Invio comando
      const result = await this.device.transferOut(2, getUIDCommand)
      
      if (result.status !== 'ok') return null

      // Lettura risposta
      const response = await this.device.transferIn(1, 64)
      
      if (response.status !== 'ok' || !response.data) return null

      const data = new Uint8Array(response.data.buffer)
      
      // Parsing UID dalla risposta
      if (data.length >= 4 && data[data.length - 2] === 0x90 && data[data.length - 1] === 0x00) {
        // Successo - estrai UID
        const uidBytes = data.slice(0, data.length - 2)
        const uid = Array.from(uidBytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
        
        return uid
      }

      return null

    } catch (error) {
      console.error('Errore comando APDU:', error)
      return null
    }
  }

  // Feedback specifico per tablet
  tabletFeedback() {
    // Vibrazione se supportata
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100])
    }

    // Suono di conferma
    try {
      const audio = new Audio('/sounds/scannerqr.mp3')
      audio.volume = 0.3
      audio.play()
    } catch (err) {
      console.log('Audio feedback non disponibile:', err.message)
    }
  }

  // Stop scansione
  stopScan() {
    this.isScanning = false
    console.log('🛑 Scansione fermata')
  }

  // Disconnessione pulita
  async disconnect() {
    this.stopScan()
    
    if (this.device && this.isConnected) {
      try {
        await this.device.releaseInterface(0)
        await this.device.close()
        this.isConnected = false
        console.log('📴 Lettore disconnesso')
      } catch (error) {
        console.error('Errore disconnessione:', error)
      }
    }
  }

  // Status lettore
  getStatus() {
    return {
      connected: this.isConnected,
      scanning: this.isScanning,
      deviceName: this.device?.productName || 'Nessuno',
      optimizedFor: 'tablet'
    }
  }

  // Utility
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export default TabletNFCManager
