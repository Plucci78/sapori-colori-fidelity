import io from 'socket.io-client'
import { NFC_SERVER_URL } from '../config/nfcConfig' // Importa l'URL

class NFCService {
  constructor () {
    this.socket = null
  }

  connect (
    onConnect,
    onDisconnect,
    onReaderConnected,
    onReaderDisconnected,
    onTagRead,
    onError
  ) {
    return new Promise((resolve, reject) => {
      console.log(`[NFCService] Connessione a ${NFC_SERVER_URL}...`)
      this.socket = io(NFC_SERVER_URL, {
        reconnectionAttempts: 3,
        timeout: 5000
      })

      this.socket.on('connect', () => {
        console.log('[NFCService] Connesso al server NFC')
        if (onConnect) onConnect()
        resolve()
      })

      this.socket.on('disconnect', () => {
        console.log('[NFCService] Disconnesso dal server NFC')
        if (onDisconnect) onDisconnect()
      })

      this.socket.on('connect_error', (error) => {
        console.error('[NFCService] Errore di connessione:', error.message)
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
        if (onTagRead) onTagRead(tag)
      })

      this.socket.on('nfc-error', (error) => {
        console.error('[NFCService] Errore NFC dal server:', error)
        if (onError) onError(error)
      })
    })
  }

  disconnect () {
    if (this.socket) {
      console.log('[NFCService] Disconnessione in corso...')
      this.socket.disconnect()
      this.socket = null
    }
  }

  startScan () {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        console.error('[NFCService] Socket non connesso. Impossibile avviare la scansione.')
        return resolve({ success: false, error: 'Socket non connesso' })
      }
      console.log('[NFCService] Avvio scansione...')
      this.socket.emit('start-scan', (response) => {
        console.log('[NFCService] Risposta da start-scan:', response)
        resolve(response)
      })
    })
  }

  stopScan () {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        console.error('[NFCService] Socket non connesso. Impossibile fermare la scansione.')
        return resolve({ success: false, error: 'Socket non connesso' })
      }
      console.log('[NFCService] Stop scansione...')
      this.socket.emit('stop-scan', (response) => {
        console.log('[NFCService] Risposta da stop-scan:', response)
        resolve(response)
      })
    })
  }
}

const nfcService = new NFCService()
export default nfcService
