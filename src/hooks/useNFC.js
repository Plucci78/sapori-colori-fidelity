import { useState, useEffect, useCallback } from 'react'

/**
 * Hook per gestire la comunicazione NFC
 * Funziona sia con Web NFC API che con bridge Raspberry
 */
export const useNFC = () => {
  const [isNFCAvailable, setIsNFCAvailable] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [lastScannedData, setLastScannedData] = useState(null)
  const [error, setError] = useState(null)
  const [nfcMethod, setNfcMethod] = useState(null) // 'web-nfc' | 'raspberry-bridge' | null

  // Rileva se siamo su Raspberry o dispositivo con NFC
  const detectNFCCapability = useCallback(async () => {
    try {
      // 1. Prova Web NFC API (browser moderni)
      if ('NDEFReader' in window) {
        setNfcMethod('web-nfc')
        setIsNFCAvailable(true)
        console.log('🔵 NFC: Web NFC API disponibile')
        return
      }

      // 2. Prova bridge Raspberry - tenta sempre se nella stessa rete
      console.log('🔍 NFC: Tentativo rilevazione bridge Raspberry...')
      
      // Lista URL da testare (API proxy Vercel prima, poi fallback)
      const bridgeUrls = [
        '/api/nfc', // API Proxy Vercel (stesso dominio, zero CORS)
        'http://192.168.1.6:3001', // Fallback locale
        'http://saporiecolori.local:3001',
        'http://localhost:3001'
      ]

      for (const bridgeUrl of bridgeUrls) {
        try {
          console.log(`🔍 NFC: Tentativo connessione a ${bridgeUrl}...`)
          
          // Se è API proxy Vercel, usa endpoint status specifico
          const statusUrl = bridgeUrl.startsWith('/api/nfc') 
            ? '/api/nfc/status' 
            : `${bridgeUrl}/nfc/status`
          
          const response = await fetch(statusUrl, { 
            timeout: 1000,
            headers: { 'Content-Type': 'application/json' }
          })
          
          if (response.ok) {
            const status = await response.json()
            if (status.available) {
              setNfcMethod('raspberry-bridge')
              setIsNFCAvailable(true)
              console.log(`🟢 NFC: Bridge Raspberry trovato su ${bridgeUrl}`)
              // Salva l'URL funzionante per uso futuro
              window.nfcBridgeUrl = bridgeUrl
              return
            }
          }
        } catch (bridgeError) {
          console.log(`🟡 NFC: ${bridgeUrl} non disponibile`)
        }
      }

      // 3. Nessun metodo NFC disponibile
      setNfcMethod(null)
      setIsNFCAvailable(false)
      console.log('🔴 NFC: Nessun metodo disponibile')

    } catch (error) {
      console.error('Errore rilevamento NFC:', error)
      setError('Errore durante il rilevamento NFC')
      setIsNFCAvailable(false)
    }
  }, [])

  // Suono di feedback per lettura riuscita
  const playSuccessSound = useCallback(() => {
    try {
      // Opzione 1: Usa file audio personalizzato
      const audio = new Audio('/sounds/scannerqr.mp3') // Suono scanner perfetto per NFC
      audio.volume = 0.7
      audio.play()
      
      console.log('🔊 Suono di conferma lettura NFC')
    } catch (error) {
      console.log('File audio non trovato, uso beep generato:', error)
      
      // Fallback: beep generato se il file non esiste
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.frequency.value = 800
        oscillator.type = 'sine'
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
        
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.3)
      } catch (fallbackError) {
        console.log('Impossibile riprodurre suono:', fallbackError)
      }
    }
  }, [])

  // Leggi tag NFC
  const readNFC = useCallback(async () => {
    if (!isNFCAvailable) {
      setError('NFC non disponibile')
      return null
    }

    setIsScanning(true)
    setError(null)

    try {
      let result = null
      if (nfcMethod === 'web-nfc') {
        result = await readWebNFC()
      } else if (nfcMethod === 'raspberry-bridge') {
        result = await readRaspberryBridge()
      } else {
        throw new Error('Metodo NFC non configurato')
      }
      
      // Riproduci suono di successo se la lettura è riuscita
      if (result && result.data) {
        playSuccessSound()
      }
      
      return result
    } catch (error) {
      console.error('Errore lettura NFC:', error)
      setError(error.message)
      return null
    } finally {
      setIsScanning(false)
    }
  }, [isNFCAvailable, nfcMethod, playSuccessSound])

  // Web NFC API (browser nativi)
  const readWebNFC = async () => {
    return new Promise((resolve, reject) => {
      const reader = new NDEFReader()
      
      const timeout = setTimeout(() => {
        reject(new Error('Timeout lettura NFC (10s)'))
      }, 10000)

      reader.addEventListener('reading', ({ message }) => {
        clearTimeout(timeout)
        
        try {
          // Estrai dati dal tag
          const record = message.records[0]
          let data = null

          if (record.recordType === 'text') {
            data = new TextDecoder().decode(record.data)
          } else if (record.recordType === 'url') {
            data = new TextDecoder().decode(record.data)
          } else {
            // Dati raw
            data = Array.from(new Uint8Array(record.data))
              .map(b => b.toString(16).padStart(2, '0'))
              .join('')
          }

          const result = {
            method: 'web-nfc',
            data,
            recordType: record.recordType,
            timestamp: new Date().toISOString()
          }

          setLastScannedData(result)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      reader.addEventListener('readingerror', () => {
        clearTimeout(timeout)
        reject(new Error('Errore durante la lettura NFC'))
      })

      // Inizia la scansione
      reader.scan().catch(reject)
    })
  }

  // Bridge Raspberry
  const readRaspberryBridge = async () => {
    const bridgeUrl = window.nfcBridgeUrl || '/api/nfc'
    
    // Se è API proxy Vercel, usa endpoint read specifico
    const readUrl = bridgeUrl.startsWith('/api/nfc') 
      ? '/api/nfc/read' 
      : `${bridgeUrl}/nfc/read`
    
    const response = await fetch(readUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeout: 5000 })
    })

    if (!response.ok) {
      throw new Error(`Errore bridge NFC: ${response.status}`)
    }

    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Errore lettura NFC')
    }

    const nfcData = {
      method: 'raspberry-bridge',
      data: result.data,
      uid: result.uid,
      type: result.type,
      timestamp: result.timestamp
    }

    setLastScannedData(nfcData)
    return nfcData
  }

  // Scrivi su tag NFC
  const writeNFC = useCallback(async (data, format = 'text') => {
    if (!isNFCAvailable) {
      setError('NFC non disponibile')
      return false
    }

    try {
      if (nfcMethod === 'web-nfc') {
        const writer = new NDEFWriter()
        await writer.write({
          records: [{ recordType: format, data }]
        })
        return true
      } else if (nfcMethod === 'raspberry-bridge') {
        const bridgeUrl = window.nfcBridgeUrl || 'http://localhost:3001'
        const response = await fetch(`${bridgeUrl}/nfc/write`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data, format })
        })

        const result = await response.json()
        return result.success
      }
    } catch (error) {
      console.error('Errore scrittura NFC:', error)
      setError(error.message)
      return false
    }
  }, [isNFCAvailable, nfcMethod])

  // Inizializzazione
  useEffect(() => {
    detectNFCCapability()
  }, [detectNFCCapability])

  return {
    // Stato
    isNFCAvailable,
    isScanning,
    lastScannedData,
    error,
    nfcMethod,
    
    // Metodi
    readNFC,
    writeNFC,
    detectNFCCapability
  }
}