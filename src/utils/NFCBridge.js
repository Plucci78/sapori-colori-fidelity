// Bridge per lettori NFC Hardware
// Unifica Web NFC API e lettori PC/SC

class NFCBridge {
  constructor() {
    this.mode = 'auto' // 'web', 'hardware', 'auto'
    this.webNFCSupported = 'NDEFReader' in window
    this.hardwareReader = null
    this.callbacks = new Map()
  }

  // Rileva automaticamente il miglior metodo disponibile
  async detectBestReader() {
    // 1. Prova Web NFC (per mobile/Chrome)
    if (this.webNFCSupported && window.location.protocol === 'https:') {
      try {
        const ndef = new NDEFReader()
        await ndef.scan()
        ndef.addEventListener("reading", () => {}) // Test scan
        this.mode = 'web'
        return 'web'
      } catch (error) {
        console.log('Web NFC non disponibile:', error)
      }
    }

    // 2. Prova lettore hardware (ACR122U, ecc)
    if (navigator.usb) {
      try {
        const devices = await navigator.usb.getDevices()
        const nfcDevice = devices.find(d => 
          d.vendorId === 0x072f || // ACS (ACR122U)
          d.vendorId === 0x076b    // OmniKey
        )
        
        if (nfcDevice) {
          this.hardwareReader = nfcDevice
          this.mode = 'hardware'
          return 'hardware'
        }
      } catch (error) {
        console.log('Hardware reader non trovato:', error)
      }
    }

    this.mode = 'none'
    return 'none'
  }

  // Scansione unificata
  async startScan(callback) {
    const method = await this.detectBestReader()
    
    switch (method) {
      case 'web':
        return this.startWebNFCScan(callback)
      case 'hardware':
        return this.startHardwareScan(callback)
      default:
        throw new Error('Nessun lettore NFC disponibile')
    }
  }

  // Web NFC (implementazione esistente)
  async startWebNFCScan(callback) {
    const ndef = new NDEFReader()
    await ndef.scan()
    
    ndef.addEventListener("reading", async ({ serialNumber }) => {
      const tagId = serialNumber.replace(/:/g, '').toUpperCase()
      callback({ tagId, method: 'web' })
    })
    
    return () => ndef.stop()
  }

  // Hardware NFC (nuovo)
  async startHardwareScan(callback) {
    if (!this.hardwareReader) {
      throw new Error('Hardware reader non inizializzato')
    }

    // Implementazione WebUSB per ACR122U
    await this.hardwareReader.open()
    await this.hardwareReader.selectConfiguration(1)
    await this.hardwareReader.claimInterface(0)

    // Polling per tag NFC
    const pollInterval = setInterval(async () => {
      try {
        // Comando APDU per lettura UID
        const command = new Uint8Array([
          0xFF, 0xCA, 0x00, 0x00, 0x00 // Get UID command
        ])
        
        const result = await this.hardwareReader.transferOut(2, command)
        
        if (result.status === 'ok') {
          // Parsing risposta per estrarre UID
          const response = new Uint8Array(result.bytesTransferred)
          const tagId = Array.from(response.slice(0, -2))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('').toUpperCase()
          
          if (tagId && tagId !== '00000000') {
            callback({ tagId, method: 'hardware' })
          }
        }
      } catch (error) {
        console.error('Errore lettura hardware:', error)
      }
    }, 500) // Polling ogni 500ms

    return () => {
      clearInterval(pollInterval)
      this.hardwareReader.close()
    }
  }

  // Stato attuale
  getStatus() {
    return {
      mode: this.mode,
      webNFCSupported: this.webNFCSupported,
      hardwareConnected: !!this.hardwareReader
    }
  }
}

export default NFCBridge
