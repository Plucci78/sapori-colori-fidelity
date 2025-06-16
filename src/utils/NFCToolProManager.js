// NFCToolProManager - Versione specializzata per NFC Tool Pro
// Gestione ottimizzata per il dispositivo specifico

class NFCToolProManager {
  constructor() {
    this.device = null
    this.isConnected = false
    this.isScanning = false
    this.onTagRead = null
    this.onError = null
    this.onStatusChange = null
    
    // Configurazione auto-detect per NFC Tool Pro
    this.supportedDevices = [
      // Possibili Vendor/Product ID per NFC Tool Pro
      { vendorId: 0x04e6, productId: 0x5816 }, // SCM Microsystems
      { vendorId: 0x072f, productId: 0x2200 }, // ACS (se compatibile)
      { vendorId: 0x1234, productId: 0x5678 }, // Da determinare
    ]
    
    this.deviceInfo = {
      name: "NFC Tool Pro",
      type: "contactless",
      standards: ["ISO14443A", "ISO14443B", "ISO15693"]
    }
  }

  // Auto-rilevamento NFC Tool Pro
  async detectNFCToolPro() {
    // Check WebUSB support
    if (!navigator.usb) {
      const userAgent = navigator.userAgent
      const isIOS = /iPad|iPhone|iPod/.test(userAgent)
      const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent)
      
      let errorMsg = 'WebUSB non supportato su questo browser.'
      if (isIOS) {
        errorMsg += ' iOS non supporta WebUSB. Usa Chrome su Android o PC/Mac.'
      } else if (isSafari) {
        errorMsg += ' Safari non supporta WebUSB. Usa Chrome o Edge.'
      } else {
        errorMsg += ' Prova con Chrome, Edge o Firefox (versioni recenti).'
      }
      
      throw new Error(errorMsg)
    }

    try {
      // Prima prova con dispositivi già connessi
      const existingDevices = await navigator.usb.getDevices()
      console.log('🔍 Dispositivi USB esistenti:', existingDevices)

      for (const device of existingDevices) {
        if (this.isNFCToolPro(device)) {
          this.device = device
          console.log('✅ NFC Tool Pro trovato tra dispositivi esistenti')
          return device
        }
      }

      // Se non trovato, richiedi permesso per nuovi dispositivi
      console.log('📱 Richiesta permesso per NFC Tool Pro...')
      
      // Prova con filtri multipli per massima compatibilità
      for (const filter of this.supportedDevices) {
        try {
          this.device = await navigator.usb.requestDevice({
            filters: [filter]
          })
          
          if (this.device && this.isNFCToolPro(this.device)) {
            console.log('✅ NFC Tool Pro rilevato e autorizzato')
            return this.device
          }
        } catch (err) {
          console.log(`⚠️ Tentativo fallito con filtro ${JSON.stringify(filter)}:`, err.message)
        }
      }

      // Ultima risorsa: richiesta senza filtri
      console.log('🎯 Tentativo rilevamento generico...')
      this.device = await navigator.usb.requestDevice({ filters: [] })
      
      if (this.device && this.couldBeNFCReader(this.device)) {
        console.log('🤔 Possibile lettore NFC rilevato, test di compatibilità...')
        return this.device
      }

      throw new Error('NFC Tool Pro non trovato o non riconosciuto')

    } catch (error) {
      console.error('❌ Errore rilevamento NFC Tool Pro:', error)
      throw error
    }
  }

  // Verifica se il dispositivo è NFC Tool Pro
  isNFCToolPro(device) {
    if (!device) return false
    
    const name = (device.productName || '').toLowerCase()
    
    // Controlli specifici per NFC Tool Pro
    return (
      name.includes('nfc') ||
      name.includes('tool') ||
      name.includes('pro') ||
      this.supportedDevices.some(d => 
        d.vendorId === device.vendorId && 
        d.productId === device.productId
      )
    )
  }

  // Verifica generica per lettori NFC
  couldBeNFCReader(device) {
    if (!device) return false
    
    const name = (device.productName || '').toLowerCase()
    const className = (device.deviceClass || 0)
    
    return (
      name.includes('nfc') ||
      name.includes('rfid') ||
      name.includes('reader') ||
      name.includes('contactless') ||
      className === 11 // Smart Card Device Class
    )
  }

  // Inizializzazione completa
  async initializeReader() {
    try {
      console.log('🚀 Inizializzazione NFC Tool Pro...')
      
      // Rilevamento dispositivo
      await this.detectNFCToolPro()
      
      if (!this.device) {
        throw new Error('Dispositivo non rilevato')
      }

      // Log info dispositivo
      console.log('📋 Info dispositivo:', {
        name: this.device.productName,
        vendor: `0x${this.device.vendorId.toString(16)}`,
        product: `0x${this.device.productId.toString(16)}`,
        serial: this.device.serialNumber
      })

      // Connessione
      await this.connectDevice()
      
      // Test iniziale
      await this.testConnection()
      
      this.onStatusChange?.({ 
        connected: true, 
        reader: this.deviceInfo.name,
        model: this.device.productName 
      })
      
      console.log('✅ NFC Tool Pro inizializzato con successo!')
      return true

    } catch (error) {
      console.error('❌ Errore inizializzazione:', error)
      this.onError?.(`Errore inizializzazione: ${error.message}`)
      return false
    }
  }

  // Connessione dispositivo con retry
  async connectDevice() {
    if (!this.device) throw new Error('Dispositivo non disponibile')

    const maxRetries = 3
    let lastError = null

    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`🔌 Tentativo connessione ${i + 1}/${maxRetries}...`)
        
        await this.device.open()
        
        // Selezione configurazione (di solito la prima)
        if (this.device.configurations.length > 0) {
          await this.device.selectConfiguration(1)
        }
        
        // Claim dell'interfaccia (di solito la prima)
        const interfaces = this.device.configuration?.interfaces || []
        if (interfaces.length > 0) {
          await this.device.claimInterface(0)
        }
        
        this.isConnected = true
        console.log('✅ Connessione stabilita')
        return true

      } catch (error) {
        lastError = error
        console.log(`⚠️ Tentativo ${i + 1} fallito:`, error.message)
        
        if (i < maxRetries - 1) {
          await this.sleep(1000) // Pausa prima del retry
        }
      }
    }

    throw new Error(`Connessione fallita dopo ${maxRetries} tentativi: ${lastError?.message}`)
  }

  // Test connessione con comando di base
  async testConnection() {
    if (!this.isConnected) return false

    try {
      console.log('🧪 Test connessione con comando di base...')
      
      // Comando di test generico (Get Version)
      const testCommand = new Uint8Array([0xFF, 0x00, 0x48, 0x00, 0x00])
      
      // Trova endpoint per output
      const endpoints = this.getEndpoints()
      
      if (endpoints.out) {
        const result = await this.device.transferOut(endpoints.out, testCommand)
        console.log('📤 Test command inviato:', result.status)
      }
      
      if (endpoints.in) {
        const response = await this.device.transferIn(endpoints.in, 64)
        console.log('📥 Test response:', response.status)
      }
      
      console.log('✅ Test connessione completato')
      return true

    } catch (error) {
      console.log('⚠️ Test connessione non riuscito (normale per alcuni dispositivi):', error.message)
      return true // Non fatale, il dispositivo potrebbe essere comunque funzionante
    }
  }

  // Trova endpoint di comunicazione
  getEndpoints() {
    if (!this.device?.configuration?.interfaces) {
      return { in: 1, out: 2 } // Default fallback
    }

    const deviceInterface = this.device.configuration.interfaces[0]
    const endpoints = deviceInterface?.alternates?.[0]?.endpoints || []
    
    const inEndpoint = endpoints.find(ep => ep.direction === 'in')?.endpointNumber
    const outEndpoint = endpoints.find(ep => ep.direction === 'out')?.endpointNumber
    
    return {
      in: inEndpoint || 1,
      out: outEndpoint || 2
    }
  }

  // Scansione ottimizzata per NFC Tool Pro
  async startTabletScan(callbacks = {}) {
    if (!this.isConnected) {
      await this.initializeReader()
    }

    if (!this.isConnected) {
      throw new Error('NFC Tool Pro non connesso')
    }

    this.isScanning = true
    this.onTagRead = callbacks.onTagRead
    this.onError = callbacks.onError

    console.log('🔍 Avvio scansione NFC Tool Pro...')
    
    // Scansione continua ottimizzata
    this.scanLoop()
  }

  // Loop di scansione con gestione errori migliorata
  async scanLoop() {
    while (this.isScanning && this.isConnected) {
      try {
        const tagId = await this.readSingleTag()
        
        if (tagId && tagId !== '00000000' && tagId.length >= 8) {
          console.log('🏷️ Tag NFC Tool Pro rilevato:', tagId)
          
          // Feedback per tablet
          this.tabletFeedback()
          
          // Callback con dati
          this.onTagRead?.({
            tagId: tagId.toUpperCase(),
            timestamp: new Date().toISOString(),
            reader: 'nfc-tool-pro',
            deviceInfo: this.deviceInfo
          })
          
          // Pausa anti-letture multiple
          await this.sleep(1500)
        }
        
        // Polling interval ottimizzato per NFC Tool Pro
        await this.sleep(200)
        
      } catch (error) {
        console.error('⚠️ Errore durante scansione:', error)
        this.onError?.(`Errore lettura: ${error.message}`)
        
        // Pausa più lunga in caso di errore
        await this.sleep(2000)
      }
    }
  }

  // Lettura tag ottimizzata per NFC Tool Pro
  async readSingleTag() {
    if (!this.device || !this.isConnected) return null

    try {
      const endpoints = this.getEndpoints()
      
      // Comando per lettura UID - versione NFC Tool Pro
      const readCommand = new Uint8Array([
        0xFF, 0xCA, 0x00, 0x00, 0x00 // Standard Get Data command
      ])

      // Invio comando
      await this.device.transferOut(endpoints.out, readCommand)
      
      // Lettura risposta con timeout
      const response = await Promise.race([
        this.device.transferIn(endpoints.in, 64),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 500)
        )
      ])
      
      if (response.status !== 'ok' || !response.data) return null

      const data = new Uint8Array(response.data.buffer)
      
      // Parsing UID dalla risposta
      if (data.length >= 4) {
        // Estrazione UID (primi bytes eccetto status)
        const uidLength = Math.min(data.length - 2, 10) // Max 10 bytes UID
        const uidBytes = data.slice(0, uidLength)
        
        const uid = Array.from(uidBytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
        
        return uid.length >= 8 ? uid : null
      }

      return null

    } catch (error) {
      if (error.message !== 'Timeout') {
        console.error('❌ Errore lettura tag:', error)
      }
      return null
    }
  }

  // Feedback ottimizzato per tablet
  tabletFeedback() {
    // Vibrazione se supportata
    if (navigator.vibrate) {
      navigator.vibrate([150, 50, 150])
    }

    // Suono di conferma
    try {
      const audio = new Audio('/sounds/scannerqr.mp3')
      audio.volume = 0.4
      audio.play()
    } catch (err) {
      console.log('Audio feedback non disponibile:', err.message)
    }
  }

  // Stop scansione
  stopScan() {
    this.isScanning = false
    console.log('🛑 Scansione NFC Tool Pro fermata')
  }

  // Disconnessione pulita
  async disconnect() {
    this.stopScan()
    
    if (this.device && this.isConnected) {
      try {
        await this.device.releaseInterface(0)
        await this.device.close()
        this.isConnected = false
        console.log('📴 NFC Tool Pro disconnesso')
      } catch (error) {
        console.error('⚠️ Errore disconnessione:', error)
      }
    }
  }

  // Status completo
  getStatus() {
    return {
      connected: this.isConnected,
      scanning: this.isScanning,
      deviceName: this.device?.productName || 'Non connesso',
      deviceInfo: this.deviceInfo,
      optimizedFor: 'tablet',
      model: 'NFC Tool Pro'
    }
  }

  // Utility
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export default NFCToolProManager
