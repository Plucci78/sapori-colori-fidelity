import { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react'
import { supabase } from '../../supabase'

const Trust3700FReaderReal = memo(({ onTagRead, onError, onCustomerFound, showNotification, isDemoMode = false }) => {
  const [isConnected, setIsConnected] = useState(false)
  const [isReading, setIsReading] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState(null)
  const [lastReadTag, setLastReadTag] = useState(null)
  const [foundCustomer, setFoundCustomer] = useState(null)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [debugInfo, setDebugInfo] = useState('')
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const deviceRef = useRef(null)
  const readerInterval = useRef(null)

  // Configurazione REAL UTRUST 3700F
  const UTRUST_CONFIG = useMemo(() => ({
    vendorId: 0x04e6,    // Identicon uTrust 3700F
    productId: 0x5790,   // Product ID principale
    interface: 0,
    endpoint: 1,
    alternatives: [
      { vendorId: 0x04e6, productId: 0x5591 }, // Alternativo 1
      { vendorId: 0x04e6, productId: 0x5790 }, // Principale  
      { vendorId: 0x072f, productId: 0x2200 }, // Alternativo 2
      { vendorId: 0x04e6, productId: 0x5292 }, // Possibile variante
    ]
  }), [])

  // Debug log
  const addDebug = useCallback((message) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugInfo(prev => `${timestamp}: ${message}\n${prev}`.split('\n').slice(0, 20).join('\n'))
    console.log(`🔥 REAL UTRUST: ${message}`)
  }, [])

  // Controlla supporto WebUSB
  const checkWebUSBSupport = useCallback(() => {
    if (!navigator.usb) {
      addDebug('❌ WebUSB non supportato - Serve Chrome/Edge')
      if (onError) onError(new Error('WebUSB non supportato. Usa Chrome o Edge.'))
      return false
    }
    addDebug('✅ WebUSB supportato')
    return true
  }, [addDebug, onError])

  // Connetti al dispositivo REALE
  const connectToDevice = useCallback(async () => {
    if (!checkWebUSBSupport()) return false

    try {
      addDebug('🔍 Ricerca dispositivo uTrust 3700F...')
      setConnectionStatus('connecting')

      // Primo tentativo: dispositivi già autorizzati
      let devices = await navigator.usb.getDevices()
      let device = devices.find(d => 
        UTRUST_CONFIG.alternatives.some(alt => 
          d.vendorId === alt.vendorId && d.productId === alt.productId
        )
      )

      // Secondo tentativo: richiedi permesso per nuovo dispositivo
      if (!device) {
        addDebug('📝 Richiedo permesso per nuovo dispositivo...')
        try {
          device = await navigator.usb.requestDevice({
            filters: UTRUST_CONFIG.alternatives.map(alt => ({
              vendorId: alt.vendorId,
              productId: alt.productId
            }))
          })
        } catch (error) {
          if (error.name === 'NotFoundError') {
            addDebug('❌ Nessun dispositivo selezionato dall\'utente')
          } else {
            addDebug(`❌ Errore richiesta permesso: ${error.message}`)
          }
          throw error
        }
      }

      if (!device) {
        throw new Error('uTrust 3700F non trovato')
      }

      addDebug(`🔌 Dispositivo trovato: ${device.productName || 'uTrust 3700F'}`)

      // Apri connessione
      if (!device.opened) {
        await device.open()
        addDebug('🔓 Dispositivo aperto')
      }

      // Configura dispositivo
      if (device.configuration === null) {
        await device.selectConfiguration(1)
        addDebug('⚙️ Configurazione selezionata')
      }

      // Rivendica interfaccia
      await device.claimInterface(UTRUST_CONFIG.interface)
      addDebug('🤝 Interfaccia rivendicata')

      deviceRef.current = device
      setDeviceInfo({
        productName: device.productName || 'uTrust 3700F',
        manufacturerName: device.manufacturerName || 'Identive',
        vendorId: device.vendorId,
        productId: device.productId,
        serialNumber: device.serialNumber || 'N/A'
      })

      setIsConnected(true)
      setConnectionStatus('connected')
      addDebug('🎉 CONNESSO! uTrust 3700F pronto')

      if (showNotification) {
        showNotification('uTrust 3700F connesso con successo!', 'success')
      }

      return true

    } catch (error) {
      addDebug(`❌ Errore connessione: ${error.message}`)
      setConnectionStatus('error')
      
      if (error.name !== 'NotFoundError') {
        console.error('❌ Errore connessione uTrust:', error)
        if (onError) onError(error)
      }
      
      return false
    }
  }, [checkWebUSBSupport, UTRUST_CONFIG, addDebug, showNotification, onError])

  // Leggi tag NFC REALE
  const readNFCTag = useCallback(async () => {
    if (isDemoMode) {
      // MODALITÀ DEMO - Simula tag
      if (Math.random() < 0.15) { // 15% probabilità
        const demoTags = ['DEMO12345678', 'DEMOA1B2C3D4', 'DEMO87654321']
        const tagId = demoTags[Math.floor(Math.random() * demoTags.length)]
        return {
          id: tagId,
          type: 'DEMO',
          data: new TextEncoder().encode(tagId),
          timestamp: new Date().toISOString(),
          source: 'Demo Mode'
        }
      }
      return null
    }

    // MODALITÀ REALE
    if (!deviceRef.current || !isConnected) return null

    try {
      // COMANDO REALE per leggere NFC dal uTrust 3700F
      // Sequenza di comandi PCSC standard per uTrust 3700F
      
      // 1. Comando per verificare presenza carta
      const checkCardCommand = new Uint8Array([0xFF, 0xCA, 0x00, 0x00, 0x00])
      
      const checkResult = await deviceRef.current.transferOut(
        UTRUST_CONFIG.endpoint, 
        checkCardCommand
      )

      if (checkResult.status !== 'ok') {
        return null // Nessuna carta presente
      }

      // 2. Leggi risposta
      const response = await deviceRef.current.transferIn(
        UTRUST_CONFIG.endpoint, 
        64
      )

      if (response.status !== 'ok' || !response.data) {
        return null
      }

      // 3. Parsing della risposta per estrarre UID
      const responseData = new Uint8Array(response.data.buffer)
      
      if (responseData.length < 4) {
        return null
      }

      // Estrai UID dalle prime 4-7 bytes (standard ISO14443)
      const uidLength = Math.min(7, responseData.length - 2)
      const uid = responseData.slice(0, uidLength)
      
      // Converti in stringa hex
      const tagId = Array.from(uid)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()

      if (tagId.length >= 8) {
        addDebug(`📱 Tag NFC letto: ${tagId}`)
        
        return {
          id: tagId,
          type: 'MIFARE',
          data: uid,
          timestamp: new Date().toISOString(),
          source: 'uTrust 3700F USB'
        }
      }

      return null

    } catch (error) {
      // Errori normali durante la scansione (nessuna carta)
      if (error.name === 'NetworkError' || 
          error.message.includes('DEVICE_NOT_FOUND') ||
          error.message.includes('No device selected')) {
        return null
      }

      addDebug(`⚠️ Errore lettura: ${error.message}`)
      return null
    }
  }, [isDemoMode, isConnected, UTRUST_CONFIG, addDebug])

  // Cerca cliente nel database
  const lookupCustomer = useCallback(async (tagId) => {
    try {
      setIsLookingUp(true)
      addDebug(`🔍 Ricerca cliente per tag: ${tagId}`)

      const { data: nfcTag, error: tagError } = await supabase
        .from('nfc_tags')
        .select(`
          *,
          customer:customer_id (
            id,
            name,
            email,
            phone,
            points,
            level,
            status
          )
        `)
        .eq('tag_id', tagId)
        .eq('status', 'active')
        .single()

      if (tagError && tagError.code !== 'PGRST116') {
        throw tagError
      }

      if (nfcTag && nfcTag.customer) {
        addDebug(`✅ Cliente trovato: ${nfcTag.customer.name}`)
        setFoundCustomer(nfcTag.customer)
        
        if (onCustomerFound) {
          onCustomerFound(nfcTag.customer)
        }
        
        if (showNotification) {
          showNotification(
            `👤 ${nfcTag.customer.name} - ${nfcTag.customer.points} GEMME`, 
            'success'
          )
        }

        // Log accesso
        await supabase.from('nfc_logs').insert([{
          tag_id: tagId,
          action_type: 'customer_recognition',
          device_info: `uTrust 3700F - ${isDemoMode ? 'Demo' : 'Real'}`,
          customer_id: nfcTag.customer.id
        }])

        return nfcTag.customer

      } else {
        addDebug(`ℹ️ Tag ${tagId} non associato`)
        
        if (showNotification) {
          showNotification(`📱 Tag ${tagId.slice(-8)} - Non associato`, 'warning')
        }

        return null
      }

    } catch (error) {
      addDebug(`❌ Errore ricerca: ${error.message}`)
      console.error('❌ Errore lookup:', error)
      return null
    } finally {
      setIsLookingUp(false)
    }
  }, [addDebug, onCustomerFound, showNotification, isDemoMode])

  // Avvia lettura continua
  const startReading = useCallback(() => {
    if (isReading) return

    setIsReading(true)
    addDebug('🔄 Avvio lettura continua')

    readerInterval.current = setInterval(async () => {
      try {
        const tag = await readNFCTag()
        
        if (tag && tag.id !== lastReadTag) {
          setLastReadTag(tag.id)
          addDebug(`📱 Nuovo tag: ${tag.id}`)
          
          if (onTagRead) {
            onTagRead(tag.id)
          }

          // Cerca cliente
          await lookupCustomer(tag.id)
        }
      } catch (error) {
        if (!error.message.includes('disconnected')) {
          addDebug(`⚠️ Errore durante lettura: ${error.message}`)
        }
      }
    }, isDemoMode ? 1000 : 500) // Demo più lento, reale più veloce

  }, [isReading, readNFCTag, lastReadTag, onTagRead, lookupCustomer, addDebug, isDemoMode])

  // Ferma lettura
  const stopReading = useCallback(() => {
    if (readerInterval.current) {
      clearInterval(readerInterval.current)
      readerInterval.current = null
    }
    setIsReading(false)
    addDebug('⏹️ Lettura fermata')
  }, [addDebug])

  // Disconnetti
  const disconnect = useCallback(async () => {
    try {
      stopReading()
      
      if (deviceRef.current) {
        await deviceRef.current.close()
        deviceRef.current = null
      }
      
      setIsConnected(false)
      setConnectionStatus('disconnected')
      setDeviceInfo(null)
      setFoundCustomer(null)
      setLastReadTag(null)
      addDebug('📴 Dispositivo disconnesso')
      
    } catch (error) {
      addDebug(`❌ Errore disconnessione: ${error.message}`)
    }
  }, [stopReading, addDebug])

  // Auto-connessione all'avvio
  useEffect(() => {
    if (!isDemoMode) {
      // Modalità reale: prova a connettersi automaticamente ai dispositivi autorizzati
      const autoConnect = async () => {
        const devices = await navigator.usb?.getDevices() || []
        const utrustDevice = devices.find(d => 
          UTRUST_CONFIG.alternatives.some(alt => 
            d.vendorId === alt.vendorId && d.productId === alt.productId
          )
        )
        
        if (utrustDevice) {
          addDebug('🔄 Auto-connessione al dispositivo autorizzato...')
          await connectToDevice()
        }
      }
      
      autoConnect()
    } else {
      // Modalità demo: simula connessione
      setIsConnected(true)
      setConnectionStatus('connected')
      setDeviceInfo({
        productName: 'uTrust 3700F (Demo)',
        manufacturerName: 'Identive (Simulato)',
        vendorId: '04e6',
        productId: '5790',
        serialNumber: 'DEMO-001'
      })
      addDebug('🎮 Modalità DEMO attivata')
    }

    return () => {
      // Cleanup viene gestito dal componente padre
    }
  }, [isDemoMode, connectToDevice, addDebug, UTRUST_CONFIG])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return (
    <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h4>🔥 uTrust 3700F - {isDemoMode ? 'DEMO' : 'REALE'}</h4>
        <div style={{ display: 'flex', gap: '10px' }}>
          {!isConnected ? (
            <button
              onClick={connectToDevice}
              disabled={connectionStatus === 'connecting'}
              style={{
                padding: '8px 16px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: connectionStatus === 'connecting' ? 'not-allowed' : 'pointer'
              }}
            >
              {connectionStatus === 'connecting' ? '🔄 Connessione...' : '🔌 Connetti'}
            </button>
          ) : (
            <>
              <button
                onClick={isReading ? stopReading : startReading}
                style={{
                  padding: '8px 16px',
                  background: isReading ? '#dc3545' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {isReading ? '⏹️ Stop' : '▶️ Leggi'}
              </button>
              <button
                onClick={disconnect}
                style={{
                  padding: '8px 16px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                📴 Disconnetti
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '15px' }}>
        <div>
          <strong>Status:</strong> 
          <span style={{ 
            color: isConnected ? '#28a745' : '#dc3545',
            marginLeft: '5px'
          }}>
            {isConnected ? '🟢 Connesso' : '🔴 Disconnesso'}
          </span>
        </div>
        <div>
          <strong>Lettura:</strong> 
          <span style={{ 
            color: isReading ? '#28a745' : '#6c757d',
            marginLeft: '5px'
          }}>
            {isReading ? '🔄 Attiva' : '⏸️ Inattiva'}
          </span>
        </div>
        <div>
          <strong>Modalità:</strong> 
          <span style={{ 
            color: isDemoMode ? '#ffc107' : '#dc3545',
            marginLeft: '5px'
          }}>
            {isDemoMode ? '🎮 Demo' : '🔥 Reale'}
          </span>
        </div>
      </div>

      {/* Device Info */}
      {deviceInfo && (
        <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>
          <div><strong>Dispositivo:</strong> {deviceInfo.productName}</div>
          <div><strong>Produttore:</strong> {deviceInfo.manufacturerName}</div>
          <div><strong>ID:</strong> {deviceInfo.vendorId}:{deviceInfo.productId}</div>
          {deviceInfo.serialNumber !== 'N/A' && (
            <div><strong>Seriale:</strong> {deviceInfo.serialNumber}</div>
          )}
        </div>
      )}

      {/* Last Read Tag */}
      {lastReadTag && (
        <div style={{ background: '#d4edda', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>
          <div><strong>Ultimo tag letto:</strong> {lastReadTag}</div>
          <div><strong>Timestamp:</strong> {new Date().toLocaleString()}</div>
        </div>
      )}

      {/* Found Customer */}
      {foundCustomer && (
        <div style={{ background: '#d1ecf1', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>
          <div><strong>👤 Cliente:</strong> {foundCustomer.name}</div>
          <div><strong>💎 Gemme:</strong> {foundCustomer.points}</div>
          <div><strong>🏆 Livello:</strong> {foundCustomer.level}</div>
        </div>
      )}

      {/* Lookup Status */}
      {isLookingUp && (
        <div style={{ background: '#fff3cd', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>
          🔍 Ricerca cliente in corso...
        </div>
      )}

      {/* Debug Info */}
      {debugInfo && (
        <details style={{ marginTop: '15px' }}>
          <summary>🔧 Debug Log</summary>
          <pre style={{ 
            background: '#f8f9fa', 
            padding: '10px', 
            borderRadius: '4px', 
            fontSize: '12px',
            maxHeight: '200px',
            overflow: 'auto',
            whiteSpace: 'pre-wrap'
          }}>
            {debugInfo}
          </pre>
        </details>
      )}
    </div>
  )
})

Trust3700FReaderReal.displayName = 'Trust3700FReaderReal'

export default Trust3700FReaderReal
