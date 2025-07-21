import io from 'socket.io-client'
import { NFC_SERVER_URL } from '../config/nfcConfig' // Importa l'URL

class NFCService {
  constructor () {
    this.socket = null
    this.isConnected = false
    this.connectionMethod = null // 'websocket' | 'bridge' | null
    this.bridgeUrl = 'http://192.168.1.6:3001'
    this.listeners = new Map() // Per event emitter pattern
  }

  // Event emitter pattern per compatibilità con codice esistente
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)
    
    // Ritorna unsubscriber
    return () => {
      const listeners = this.listeners.get(event) || []
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  emit(event, ...args) {
    const listeners = this.listeners.get(event) || []
    listeners.forEach(callback => {
      try {
        callback(...args)
      } catch (error) {
        console.error(`Errore in listener ${event}:`, error)
      }
    })
  }

  // Rileva il metodo di connessione disponibile
  async detectConnectionMethod() {
    // 1. Prova bridge HTTP (solo se accesso locale)
    const isLocalAccess = window.location.hostname === 'localhost' || 
                         window.location.hostname === 'saporiecolori.local' ||
                         window.location.hostname.endsWith('.local') ||
                         window.location.hostname.startsWith('192.168.') ||
                         window.location.hostname.startsWith('10.') ||
                         window.location.hostname.startsWith('172.') ||
                         window.location.protocol === 'http:'
    
    if (isLocalAccess) {
      try {
        const response = await fetch(`${this.bridgeUrl}/nfc/status`, { 
          timeout: 2000 
        })
        if (response.ok) {
          const status = await response.json()
          if (status.available) {
            console.log('🟢 NFC: Bridge HTTP locale disponibile')
            return 'bridge'
          }
        }
      } catch (error) {
        console.log('🟡 NFC: Bridge HTTP locale non disponibile')
      }
    } else {
      console.log('🟡 NFC: Accesso remoto - bridge HTTP disabilitato per sicurezza')
    }

    // 2. Prova WebSocket (sistema esistente)
    try {
      const testSocket = io(NFC_SERVER_URL, {
        timeout: 2000,
        reconnection: false
      })
      
      return new Promise((resolve) => {
        testSocket.on('connect', () => {
          testSocket.disconnect()
          console.log('🔵 NFC: WebSocket disponibile')
          resolve('websocket')
        })
        
        testSocket.on('connect_error', () => {
          console.log('🟡 NFC: WebSocket non disponibile')
          resolve(null)
        })
        
        setTimeout(() => {
          testSocket.disconnect()
          resolve(null)
        }, 2000)
      })
    } catch (error) {
      console.log('🟡 NFC: WebSocket non disponibile')
      return null
    }
  }

  async connect (
    onConnect,
    onDisconnect,
    onReaderConnected,
    onReaderDisconnected,
    onTagRead,
    onError
  ) {
    try {
      // Rileva il metodo di connessione disponibile
      this.connectionMethod = await this.detectConnectionMethod()
      
      if (!this.connectionMethod) {
        throw new Error('Nessun servizio NFC disponibile')
      }

      if (this.connectionMethod === 'bridge') {
        return this.connectBridge(onConnect, onDisconnect, onReaderConnected, onReaderDisconnected, onTagRead, onError)
      } else {
        return this.connectWebSocket(onConnect, onDisconnect, onReaderConnected, onReaderDisconnected, onTagRead, onError)
      }
      
    } catch (error) {
      console.error('[NFCService] Errore connessione:', error)
      if (onError) onError(error)
      throw error
    }
  }

  // Connessione WebSocket (sistema esistente)  
  connectWebSocket (
    onConnect,
    onDisconnect,
    onReaderConnected,
    onReaderDisconnected,
    onTagRead,
    onError
  ) {
    return new Promise((resolve, reject) => {
      console.log(`[NFCService] Connessione WebSocket a ${NFC_SERVER_URL}...`)
      this.socket = io(NFC_SERVER_URL, {
        reconnectionAttempts: 3,
        timeout: 5000
      })

      this.socket.on('connect', () => {
        console.log('[NFCService] Connesso al server NFC WebSocket')
        this.isConnected = true
        this.emit('connected')
        if (onConnect) onConnect()
        resolve()
      })

      this.socket.on('disconnect', () => {
        console.log('[NFCService] Disconnesso dal server NFC WebSocket')
        this.isConnected = false
        this.emit('disconnected')
        if (onDisconnect) onDisconnect()
      })

      this.socket.on('connect_error', (error) => {
        console.error('[NFCService] Errore di connessione WebSocket:', error.message)
        this.isConnected = false
        this.emit('error', error)
        if (onError) onError(error)
        reject(error)
      })

      this.socket.on('reader-connected', (reader) => {
        console.log('[NFCService] Lettore connesso:', reader)
        if (onReaderConnected) onReaderConnected(reader)
      })

      this.socket.on('reader-disconnected', () => {
        console.log('[NFCService] Lettore disconnesso')
        if (onReaderDisconnected) onReaderDisconnected()
      })

      this.socket.on('tag-read', (tag) => {
        console.log('[NFCService] Tag letto:', tag)
        this.emit('cardDetected', { uid: tag.uid, data: tag.data })
        if (onTagRead) onTagRead(tag)
      })

      this.socket.on('nfc-error', (error) => {
        console.error('[NFCService] Errore NFC dal server:', error)
        this.emit('error', error)
        if (onError) onError(error)
      })
    })
  }

  // Connessione Bridge HTTP (nuovo sistema)
  async connectBridge (
    onConnect,
    onDisconnect,
    onReaderConnected,
    onReaderDisconnected,
    onTagRead,
    onError
  ) {
    try {
      console.log('[NFCService] Connessione Bridge HTTP...')
      
      // Verifica status
      const response = await fetch(`${this.bridgeUrl}/nfc/status`)
      const status = await response.json()
      
      if (!status.available) {
        throw new Error('Bridge NFC non disponibile')
      }

      this.isConnected = true
      this.emit('connected')
      console.log('[NFCService] Connesso al Bridge HTTP')
      
      if (onConnect) onConnect()
      if (onReaderConnected) onReaderConnected({ type: status.readerType })
      
      return Promise.resolve()
      
    } catch (error) {
      console.error('[NFCService] Errore connessione Bridge:', error)
      this.isConnected = false
      this.emit('error', error)
      if (onError) onError(error)
      throw error
    }
  }

  disconnect () {
    if (this.socket) {
      console.log('[NFCService] Disconnessione WebSocket...')
      this.socket.disconnect()
      this.socket = null
    }
    this.isConnected = false
    this.connectionMethod = null
    this.emit('disconnected')
  }

  async startScan () {
    if (!this.isConnected) {
      console.error('[NFCService] Servizio non connesso')
      return { success: false, error: 'Servizio non connesso' }
    }

    try {
      if (this.connectionMethod === 'bridge') {
        return await this.startScanBridge()
      } else if (this.connectionMethod === 'websocket') {
        return await this.startScanWebSocket()
      } else {
        throw new Error('Metodo di connessione non valido')
      }
    } catch (error) {
      console.error('[NFCService] Errore startScan:', error)
      return { success: false, error: error.message }
    }
  }

  async stopScan () {
    if (!this.isConnected) {
      console.error('[NFCService] Servizio non connesso')
      return { success: false, error: 'Servizio non connesso' }
    }

    try {
      if (this.connectionMethod === 'bridge') {
        return await this.stopScanBridge()
      } else if (this.connectionMethod === 'websocket') {
        return await this.stopScanWebSocket()
      } else {
        throw new Error('Metodo di connessione non valido')
      }
    } catch (error) {
      console.error('[NFCService] Errore stopScan:', error)
      return { success: false, error: error.message }
    }
  }

  // WebSocket scan methods
  startScanWebSocket () {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        console.error('[NFCService] Socket non connesso')
        return resolve({ success: false, error: 'Socket non connesso' })
      }
      console.log('[NFCService] Avvio scansione WebSocket...')
      this.socket.emit('start-scan', (response) => {
        console.log('[NFCService] Risposta da start-scan:', response)
        resolve(response)
      })
    })
  }

  stopScanWebSocket () {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        console.error('[NFCService] Socket non connesso')
        return resolve({ success: false, error: 'Socket non connesso' })
      }
      console.log('[NFCService] Stop scansione WebSocket...')
      this.socket.emit('stop-scan', (response) => {
        console.log('[NFCService] Risposta da stop-scan:', response)
        resolve(response)
      })
    })
  }

  // Bridge HTTP scan methods
  async startScanBridge () {
    try {
      console.log('[NFCService] Avvio scansione Bridge HTTP...')
      
      const response = await fetch(`${this.bridgeUrl}/nfc/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeout: 10000 })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        // Emette evento compatibile con i componenti esistenti
        const cardData = {
          uid: result.uid || result.data,
          data: result.data
        }
        
        console.log('[NFCService] Tag letto da Bridge:', cardData)
        this.emit('cardDetected', cardData)
        
        return { success: true, data: result }
      } else {
        throw new Error(result.error || 'Errore lettura NFC')
      }
      
    } catch (error) {
      console.error('[NFCService] Errore scansione Bridge:', error)
      this.emit('error', error)
      throw error
    }
  }

  async stopScanBridge () {
    // Il bridge HTTP non ha un meccanismo di stop attivo
    // La scansione si ferma automaticamente dopo timeout o lettura
    console.log('[NFCService] Stop scansione Bridge (non necessario)')
    return { success: true }
  }
}

const nfcService = new NFCService()
export default nfcService
