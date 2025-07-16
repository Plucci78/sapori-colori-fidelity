// src/services/nfcService.js
// Servizio per comunicare con il server NFC sulla porta 3001

class NFCService {
  constructor() {
    this.ws = null
    this.wsUrl = ''
    this.apiUrl = ''
    this.isConnected = false
    this.listeners = new Map()
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000
  }

  setServerUrl(url) {
    this.wsUrl = url.replace('http:', 'ws:')
    this.apiUrl = url.endsWith('/api') ? url : `${url}/api`
    console.log(`NFC Service URL aggiornato a: WS: ${this.wsUrl}, API: ${this.apiUrl}`)
  }

  // Connessione WebSocket per eventi real-time
  connect() {
    return new Promise((resolve, reject) => {
      // Se già connesso, risolvi subito
      if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log('✅ Già connesso al server NFC')
        resolve()
        return
      }
      
      // Se sta già connettendo, aspetta
      if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
        console.log('⏳ Connessione già in corso...')
        setTimeout(() => resolve(), 100)
        return
      }
      
      try {
        console.log('🔌 Connessione al server NFC...')
        this.ws = new WebSocket(this.wsUrl)

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
            
            // Gestisci diversi tipi di messaggi
            switch (message.type) {
              case 'NFC_CARD_DETECTED':
                this.emit('cardDetected', message.data)
                break
              case 'NFC_CARD_REMOVED':
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
                this.emit('error', message.error)
                break
              case 'NFC_STATUS':
                this.emit('statusUpdate', message.data)
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
          this.attemptReconnect()
        }

      } catch (error) {
        console.error('Errore creazione WebSocket:', error)
        reject(error)
      }
    })
  }

  // Riconnessione automatica
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Raggiunto limite tentativi riconnessione')
      this.emit('error', 'Impossibile connettersi al server NFC')
      return
    }

    this.reconnectAttempts++
    console.log(`🔄 Tentativo riconnessione ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`)
    
    setTimeout(() => {
      this.connect().catch(err => {
        console.error('Errore riconnessione:', err)
      })
    }, this.reconnectDelay * this.reconnectAttempts)
  }

  // Disconnessione pulita
  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.isConnected = false
    this.listeners.clear()
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

  // Comando start scan via WebSocket
  startScanWS() {
    if (!this.isConnected) {
      throw new Error('Non connesso al server NFC')
    }
    
    this.ws.send(JSON.stringify({
      type: 'START_SCAN'
    }))
  }

  // Comando stop scan via WebSocket
  stopScanWS() {
    if (!this.isConnected) {
      throw new Error('Non connesso al server NFC')
    }
    
    this.ws.send(JSON.stringify({
      type: 'STOP_SCAN'
    }))
  }

  // API REST - Status sistema
  async getStatus() {
    try {
      const response = await fetch(`${this.apiUrl}/nfc/status`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Errore get status:', error)
      throw error
    }
  }

  // API REST - Start scan
  async startScan() {
    try {
      const response = await fetch(`${this.apiUrl}/nfc/scan/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Errore start scan:', error)
      throw error
    }
  }

  // API REST - Stop scan
  async stopScan() {
    try {
      const response = await fetch(`${this.apiUrl}/nfc/scan/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Errore stop scan:', error)
      throw error
    }
  }

  // Health check
  async checkHealth() {
    try {
      const response = await fetch(`${this.apiUrl}/health`)
      if (!response.ok) {
        return false
      }
      const data = await response.json()
      return data.status === 'running'
    } catch (error) {
      console.error('Server NFC non raggiungibile:', error)
      return false
    }
  }

  // Metodo helper per verificare se il server è online
  async waitForServer(maxAttempts = 10, delay = 1000) {
    for (let i = 0; i < maxAttempts; i++) {
      const isHealthy = await this.checkHealth()
      if (isHealthy) {
        console.log('✅ Server NFC online')
        return true
      }
      console.log(`⏳ Attesa server NFC... (${i + 1}/${maxAttempts})`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    console.error('❌ Server NFC non disponibile')
    return false
  }
}

// Esporta istanza singleton
const nfcService = new NFCService()

// Previeni multiple istanze
if (typeof window !== 'undefined') {
  if (window.__nfcService) {
    console.warn('⚠️ NFCService già istanziato, uso istanza esistente')
  } else {
    window.__nfcService = nfcService
  }
}

export default window.__nfcService || nfcService