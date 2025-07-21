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
      
      // Lista IP da testare (Raspberry IP prima, poi fallback)
      const bridgeUrls = [
        'http://192.168.1.6:3001',
        'http://saporiecolori.local:3001',
        'http://localhost:3001',
        'http://192.168.1.100:3001',
        'http://192.168.0.100:3001'
      ]

      for (const bridgeUrl of bridgeUrls) {
        try {
          console.log(`🔍 NFC: Tentativo connessione a ${bridgeUrl}...`)
          const response = await fetch(`${bridgeUrl}/nfc/status`, { 
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

  // Leggi tag NFC
  const readNFC = useCallback(async () => {
    if (!isNFCAvailable) {
      setError('NFC non disponibile')
      return null
    }

    setIsScanning(true)
    setError(null)

    try {
      if (nfcMethod === 'web-nfc') {
        return await readWebNFC()
      } else if (nfcMethod === 'raspberry-bridge') {
        return await readRaspberryBridge()
      } else {
        throw new Error('Metodo NFC non configurato')
      }
    } catch (error) {
      console.error('Errore lettura NFC:', error)
      setError(error.message)
      return null
    } finally {
      setIsScanning(false)
    }
  }, [isNFCAvailable, nfcMethod])

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
    const bridgeUrl = window.nfcBridgeUrl || 'http://localhost:3001'
    const response = await fetch(`${bridgeUrl}/nfc/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeout: 10000 })
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