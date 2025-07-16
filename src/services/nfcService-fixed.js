// src/services/nfcService.js
// Servizio NFC FIXED per comunicazione con server Raspberry Pi

class NFCService {
  constructor() {
    this.ws = null
    this.isConnected = false
    this.listeners = new Map()
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 2000
    this.serverUrl = 'ws://192.168.1.6:3001'
    this.apiUrl = 'http://192.168.1.6:3001/api'
  }

  // Connessione WebSocket
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔌 Connessione al server NFC...')
        this.ws = new WebSocket(this.serverUrl)

        this.ws.onopen = () => {
          console.log('✅ Connesso al server NFC')
          this.isConnected = true
          this.reconnectAttempts = 0
          this.emit('connected', { status: 'connected' })
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            console.log('📨 Messaggio NFC:', message)
            
            switch (message.type) {
              case 'CONNECTION_ESTABLISHED':
                console.log('🎯 Connessione stabilita')
                if (message.data.readerConnected) {
                  this.emit('readerConnected', message.data)
                }
                break
              case 'CARD_DETECTED':
                console.log('🎯 CARTA RILEVATA:', message.data)
                this.emit('cardDetected', message.data)
                break
              case 'CARD_REMOVED':
                this.emit('cardRemoved', message.data)
                break
              case 'READER_CONNECTED':
                this.emit('readerConnected', message.data)
                break
              case 'READER_DISCONNECTED':
                this.emit('readerDisconnected', message.data)
                break
              case 'SCAN_STARTED':
                this.emit('scanStarted', message.data)
                break
              case 'SCAN_STOPPED':
                this.emit('scanStopped', message.data)
                break
              case 'SCAN_TIMEOUT':
                this.emit('scanTimeout', message.data)
                break
              case 'ERROR':
                console.error('❌ Errore server NFC:', message.error)
                this.emit('error', message.error)
                break
              default:
                console.log('Messaggio non gestito:', message)
            }
          } catch (error) {
            console.error('Errore parsing messaggio:', error)
          }
        }

        this.ws.onerror = (error) => {
          console.error('❌ Errore WebSocket:', error)
          this.emit('error', 'Errore connessione WebSocket')
          reject(error)
        }

        this.ws.onclose = () => {
          console.log('🔌 Connessione chiusa')
          this.isConnected = false
          this.emit('disconnected', { status: 'disconnected' })
          
          // Auto-reconnect
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            console.log(`🔄 Tentativo reconnessione ${this.reconnectAttempts}/${this.maxReconnectAttempts}`)
            setTimeout(() => this.connect(), this.reconnectDelay)
          }
        }

        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Timeout connessione'))
          }
        }, 10000)

      } catch (error) {
        console.error('Errore creazione WebSocket:', error)
        reject(error)
      }
    })
  }

  // Disconnetti
  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.isConnected = false
  }

  // Sistema eventi
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)
    
    // Ritorna funzione per rimuovere listener
    return () => {
      const callbacks = this.listeners.get(event)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
      }
    }
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Errore in listener ${event}:`, error)
        }
      })
    }
  }

  // Avvia scansione
  async startScan() {
    try {
      if (!this.isConnected) {
        await this.connect()
      }

      // Prova prima via WebSocket
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'START_SCAN' }))
        return { success: true, message: 'Scansione avviata via WebSocket' }
      }

      // Fallback API REST
      const response = await fetch(`${this.apiUrl}/scan/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      return data

    } catch (error) {
      console.error('Errore avvio scansione:', error)
      throw error
    }
  }

  // Ferma scansione
  async stopScan() {
    try {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'STOP_SCAN' }))
        return { success: true, message: 'Scansione fermata via WebSocket' }
      }

      const response = await fetch(`${this.apiUrl}/scan/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()
      return data

    } catch (error) {
      console.error('Errore stop scansione:', error)
      throw error
    }
  }

  // Ottieni stato
  async getStatus() {
    try {
      const response = await fetch(`${this.apiUrl}/status`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      return data

    } catch (error) {
      console.error('Errore get status:', error)
      return { success: false, error: error.message }
    }
  }

  // Verifica se il server è online
  async isServerOnline() {
    try {
      const response = await fetch(`${this.apiUrl}/status`, {
        timeout: 3000
      })
      return response.ok
    } catch {
      return false
    }
  }

  // Attendi che il server sia online
  async waitForServer(maxAttempts = 10, delay = 1000) {
    for (let i = 0; i < maxAttempts; i++) {
      if (await this.isServerOnline()) {
        console.log('✅ Server NFC online')
        return true
      }
      console.log(`⏳ Tentativo ${i + 1}/${maxAttempts}...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    console.log('❌ Server NFC non raggiungibile')
    return false
  }
}

// Singleton instance
const nfcService = new NFCService()

// Auto-connetti se possibile
nfcService.waitForServer(3, 2000).then(online => {
  if (online) {
    nfcService.connect().catch(err => {
      console.log('❌ Auto-connessione fallita:', err.message)
    })
  }
})

export default nfcService
