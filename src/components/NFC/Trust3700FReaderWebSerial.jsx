import { useState, useEffect, useRef, memo, useCallback } from 'react'
import { supabase } from '../../supabase'

const Trust3700FReaderWebSerial = memo(({ onTagRead, onError, onCustomerFound, showNotification, isDemoMode = false }) => {
  const [isConnected, setIsConnected] = useState(false)
  const [isReading, setIsReading] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState(null)
  const [lastReadTag, setLastReadTag] = useState(null)
  const [foundCustomer, setFoundCustomer] = useState(null)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [debugInfo, setDebugInfo] = useState('')
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [useHID, setUseHID] = useState(false)
  const portRef = useRef(null)
  const hidDeviceRef = useRef(null)
  const readerInterval = useRef(null)

  // Debug log
  const addDebug = useCallback((message) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugInfo(prev => `${timestamp}: ${message}\n${prev}`.split('\n').slice(0, 30).join('\n'))
    console.log(`🔥 UTRUST SERIAL: ${message}`)
  }, [])

  // Controlla supporto API
  const checkAPISupport = useCallback(() => {
    const hasSerial = 'serial' in navigator
    const hasHID = 'hid' in navigator
    
    if (!hasSerial && !hasHID) {
      addDebug('❌ Né Web Serial né WebHID supportati')
      if (onError) onError(new Error('Browser non supportato. Usa Chrome/Edge recente.'))
      return false
    }
    
    if (hasSerial) {
      addDebug('✅ Web Serial API supportata')
      setUseHID(false)
      return true
    }
    
    if (hasHID) {
      addDebug('✅ WebHID API supportata')
      setUseHID(true)
      return true
    }
    
    return false
  }, [addDebug, onError])

  // Connetti via Web Serial API
  const connectViaSerial = useCallback(async () => {
    try {
      addDebug('🔍 Richiesta porta seriale...')
      
      // Prima controlla se ci sono porte già autorizzate
      const ports = await navigator.serial.getPorts()
      let port = null
      
      if (ports.length > 0) {
        // Trova una porta che potrebbe essere l'uTrust
        port = ports.find(p => {
          const info = p.getInfo()
          return info.usbVendorId === 0x04e6 || 
                 info.usbVendorId === 0x072f
        })
        
        if (port) {
          addDebug('✅ Trovata porta già autorizzata')
        }
      }
      
      // Se non trovata, richiedi autorizzazione
      if (!port) {
        addDebug('📝 Richiedo autorizzazione nuova porta...')
        try {
          port = await navigator.serial.requestPort({
            filters: [
              { usbVendorId: 0x04e6, usbProductId: 0x5790 },
              { usbVendorId: 0x04e6, usbProductId: 0x5591 },
              { usbVendorId: 0x072f, usbProductId: 0x2200 }
            ]
          })
        } catch (error) {
          if (error.name === 'NotFoundError' || error.message.includes('No port selected')) {
            addDebug('⚠️ Nessuna porta selezionata dall\'utente')
            return false // Non è un errore grave
          }
          throw error
        }
      }

      if (!port) {
        addDebug('❌ Nessuna porta disponibile')
        return false
      }

      addDebug('🔓 Apertura porta seriale...')
      await port.open({ 
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none'
      })

      portRef.current = port
      
      const info = port.getInfo()
      setDeviceInfo({
        productName: 'uTrust 3700F (Serial)',
        manufacturerName: 'Identive',
        vendorId: info.usbVendorId?.toString(16) || 'N/A',
        productId: info.usbProductId?.toString(16) || 'N/A',
        type: 'Serial'
      })

      setIsConnected(true)
      setConnectionStatus('connected')
      addDebug('🎉 CONNESSO via Serial!')

      if (showNotification) {
        showNotification('uTrust 3700F connesso via Serial!', 'success')
      }

      return true

    } catch (error) {
      addDebug(`❌ Errore Serial: ${error.message}`)
      throw error
    }
  }, [addDebug, showNotification])

  // Connetti via WebHID API
  const connectViaHID = useCallback(async () => {
    try {
      addDebug('🔍 Controllo dispositivi HID autorizzati...')
      
      // Prima controlla dispositivi già autorizzati
      const devices = await navigator.hid.getDevices()
      let device = null
      
      if (devices.length > 0) {
        device = devices.find(d => 
          d.vendorId === 0x04e6 || d.vendorId === 0x072f
        )
        
        if (device) {
          addDebug(`✅ Trovato dispositivo già autorizzato: ${device.productName}`)
        }
      }
      
      // Se non trovato, richiedi autorizzazione
      if (!device) {
        addDebug('📝 Richiedo autorizzazione nuovo dispositivo HID...')
        try {
          const requestedDevices = await navigator.hid.requestDevice({
            filters: [
              { vendorId: 0x04e6, productId: 0x5790 },
              { vendorId: 0x04e6, productId: 0x5591 },
              { vendorId: 0x072f, productId: 0x2200 }
            ]
          })

          if (!requestedDevices || requestedDevices.length === 0) {
            addDebug('⚠️ Nessun dispositivo HID selezionato')
            return false
          }

          device = requestedDevices[0]
        } catch (error) {
          if (error.name === 'NotFoundError' || error.message.includes('No device selected')) {
            addDebug('⚠️ Nessun dispositivo selezionato dall\'utente')
            return false
          }
          throw error
        }
      }

      if (!device) {
        addDebug('❌ Nessun dispositivo HID disponibile')
        return false
      }

      addDebug(`🔓 Apertura dispositivo HID: ${device.productName}`)
      await device.open()
      hidDeviceRef.current = device

      setDeviceInfo({
        productName: device.productName || 'uTrust 3700F',
        manufacturerName: device.manufacturerName || 'Identive',
        vendorId: device.vendorId.toString(16),
        productId: device.productId.toString(16),
        type: 'HID'
      })

      setIsConnected(true)
      setConnectionStatus('connected')
      addDebug('🎉 CONNESSO via HID!')

      if (showNotification) {
        showNotification('uTrust 3700F connesso via HID!', 'success')
      }

      return true

    } catch (error) {
      addDebug(`❌ Errore HID: ${error.message}`)
      throw error
    }
  }, [addDebug, showNotification])

  // Connetti automaticamente ai dispositivi già autorizzati
  const autoConnect = useCallback(async () => {
    try {
      addDebug('🔄 Tentativo connessione automatica...')
      setConnectionStatus('connecting')

      // Prima prova Serial con dispositivi autorizzati
      if ('serial' in navigator) {
        const ports = await navigator.serial.getPorts()
        if (ports.length > 0) {
          addDebug('📡 Tentativo auto-connessione Serial...')
          setUseHID(false)
          const result = await connectViaSerial()
          if (result) return true
        }
      }

      // Poi prova HID con dispositivi autorizzati  
      if ('hid' in navigator) {
        const devices = await navigator.hid.getDevices()
        const utrustDevice = devices.find(d => 
          d.vendorId === 0x04e6 || d.vendorId === 0x072f
        )
        if (utrustDevice) {
          addDebug('🎮 Tentativo auto-connessione HID...')
          setUseHID(true)
          const result = await connectViaHID()
          if (result) return true
        }
      }

      addDebug('⚠️ Nessun dispositivo autorizzato trovato')
      setConnectionStatus('disconnected')
      return false

    } catch (error) {
      addDebug(`❌ Errore auto-connessione: ${error.message}`)
      setConnectionStatus('error')
      return false
    }
  }, [addDebug, connectViaSerial, connectViaHID])

  // Leggi dati via Serial
  const readFromSerial = useCallback(async () => {
    if (!portRef.current) return null

    try {
      const reader = portRef.current.readable.getReader()
      
      // Invia comando di richiesta carta
      const writer = portRef.current.writable.getWriter()
      const command = new Uint8Array([0xFF, 0xCA, 0x00, 0x00, 0x00]) // Comando APDU standard
      await writer.write(command)
      writer.releaseLock()

      // Leggi risposta con timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 1000)
      )
      
      const readPromise = reader.read()
      const result = await Promise.race([readPromise, timeoutPromise])
      
      reader.releaseLock()

      if (result.value && result.value.length > 4) {
        const data = result.value
        // Estrai UID dalle prime 4-8 bytes
        const uid = data.slice(0, Math.min(8, data.length))
        const tagId = Array.from(uid)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .toUpperCase()

        if (tagId.length >= 8) {
          return {
            id: tagId,
            type: 'MIFARE',
            data: uid,
            timestamp: new Date().toISOString(),
            source: 'uTrust 3700F Serial'
          }
        }
      }

      return null

    } catch (error) {
      if (!error.message.includes('Timeout')) {
        addDebug(`⚠️ Errore lettura Serial: ${error.message}`)
      }
      return null
    }
  }, [addDebug])

  // Leggi dati via HID
  const readFromHID = useCallback(async () => {
    if (!hidDeviceRef.current) return null

    try {
      // Invia comando HID per richiedere carta
      const command = new Uint8Array(64) // Report HID standard
      command[0] = 0x00 // Report ID
      command[1] = 0xFF // Comando APDU
      command[2] = 0xCA
      command[3] = 0x00
      command[4] = 0x00
      command[5] = 0x00

      await hidDeviceRef.current.sendReport(0, command)

      // Ascolta eventi di input
      return new Promise((resolve) => {
        let timeout = setTimeout(() => resolve(null), 1000)

        const handleInput = (event) => {
          clearTimeout(timeout)
          hidDeviceRef.current.removeEventListener('inputreport', handleInput)

          const data = new Uint8Array(event.data.buffer)
          if (data.length > 4) {
            const uid = data.slice(1, Math.min(9, data.length)) // Skip report ID
            const tagId = Array.from(uid)
              .map(b => b.toString(16).padStart(2, '0'))
              .join('')
              .toUpperCase()

            if (tagId.length >= 8 && tagId !== '00000000') {
              resolve({
                id: tagId,
                type: 'MIFARE',
                data: uid,
                timestamp: new Date().toISOString(),
                source: 'uTrust 3700F HID'
              })
              return
            }
          }
          resolve(null)
        }

        hidDeviceRef.current.addEventListener('inputreport', handleInput)
      })

    } catch (error) {
      addDebug(`⚠️ Errore lettura HID: ${error.message}`)
      return null
    }
  }, [addDebug])

  // Leggi tag NFC
  const readNFCTag = useCallback(async () => {
    if (isDemoMode) {
      // Modalità demo
      if (Math.random() < 0.12) {
        const demoTags = ['DEMO12345678', 'DEMOA1B2C3D4', 'DEMO87654321', 'DEMOF1E2D3C4']
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

    // Modalità reale
    if (!isConnected) return null

    try {
      if (useHID && hidDeviceRef.current) {
        return await readFromHID()
      } else if (!useHID && portRef.current) {
        return await readFromSerial()
      }
      return null

    } catch (error) {
      if (!error.message.includes('Timeout') && !error.message.includes('NetworkError')) {
        addDebug(`⚠️ Errore lettura: ${error.message}`)
      }
      return null
    }
  }, [isDemoMode, isConnected, useHID, readFromHID, readFromSerial, addDebug])

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
          device_info: `uTrust 3700F ${useHID ? 'HID' : 'Serial'} - ${isDemoMode ? 'Demo' : 'Real'}`,
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
  }, [addDebug, onCustomerFound, showNotification, useHID, isDemoMode])

  // Avvia lettura continua
  const startReading = useCallback(() => {
    if (isReading) return

    setIsReading(true)
    addDebug('🔄 Avvio lettura continua')

    readerInterval.current = setInterval(async () => {
      try {
        const tag = await readNFCTag()
        
        if (tag && tag.id !== lastReadTag && tag.id !== '00000000') {
          setLastReadTag(tag.id)
          addDebug(`📱 Nuovo tag: ${tag.id}`)
          
          if (onTagRead) {
            onTagRead(tag.id)
          }

          // Cerca cliente
          await lookupCustomer(tag.id)
        }
      } catch (error) {
        if (!error.message.includes('disconnected') && !error.message.includes('Timeout')) {
          addDebug(`⚠️ Errore durante lettura: ${error.message}`)
        }
      }
    }, isDemoMode ? 1500 : 800)

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
      
      if (portRef.current) {
        await portRef.current.close()
        portRef.current = null
      }
      
      if (hidDeviceRef.current) {
        await hidDeviceRef.current.close()
        hidDeviceRef.current = null
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

  // Connetti al dispositivo con selezione manuale
  const connectToDevice = useCallback(async () => {
    if (!checkAPISupport()) return false

    try {
      setConnectionStatus('connecting')
      
      if (useHID) {
        return await connectViaHID()
      } else {
        return await connectViaSerial()
      }

    } catch (error) {
      addDebug(`❌ Errore connessione: ${error.message}`)
      setConnectionStatus('error')
      
      if (error.name !== 'NotFoundError' && !error.message.includes('selezionat') && !error.message.includes('No port selected')) {
        console.error('❌ Errore connessione:', error)
        if (onError) onError(error)
      }
      
      return false
    }
  }, [checkAPISupport, useHID, connectViaHID, connectViaSerial, addDebug, onError])

  // Controlla dispositivi disponibili senza connettersi
  const checkAvailableDevices = useCallback(async () => {
    try {
      addDebug('🔍 Controllo dispositivi disponibili...')
      let devicesFound = false

      // Controlla porte seriali autorizzate
      if ('serial' in navigator) {
        const ports = await navigator.serial.getPorts()
        if (ports.length > 0) {
          addDebug(`📡 ${ports.length} porte seriali autorizzate trovate:`)
          ports.forEach((port, index) => {
            const info = port.getInfo()
            const vendorId = info.usbVendorId?.toString(16) || 'N/A'
            const productId = info.usbProductId?.toString(16) || 'N/A'
            addDebug(`  ${index + 1}. Porta Serial - Vendor: 0x${vendorId}, Product: 0x${productId}`)
            
            // Controlla se è un uTrust
            if (info.usbVendorId === 0x04e6 || info.usbVendorId === 0x072f) {
              addDebug(`    ✅ Possibile uTrust 3700F rilevato!`)
              devicesFound = true
            }
          })
        } else {
          addDebug('📡 Nessuna porta seriale autorizzata')
        }
      }

      // Controlla dispositivi HID autorizzati
      if ('hid' in navigator) {
        const devices = await navigator.hid.getDevices()
        if (devices.length > 0) {
          addDebug(`🎮 ${devices.length} dispositivi HID autorizzati trovati:`)
          devices.forEach((device, index) => {
            const vendorId = device.vendorId.toString(16)
            const productId = device.productId.toString(16)
            addDebug(`  ${index + 1}. ${device.productName || 'Unknown'} - Vendor: 0x${vendorId}, Product: 0x${productId}`)
            
            // Controlla se è un uTrust
            if (device.vendorId === 0x04e6 || device.vendorId === 0x072f) {
              addDebug(`    ✅ uTrust 3700F HID rilevato!`)
              devicesFound = true
            }
          })
        } else {
          addDebug('🎮 Nessun dispositivo HID autorizzato')
        }
      }

      if (!devicesFound) {
        addDebug('⚠️ Nessun lettore uTrust rilevato tra i dispositivi autorizzati')
        addDebug('💡 Usa i pulsanti Serial/HID per autorizzare il lettore')
      }

    } catch (error) {
      addDebug(`❌ Errore controllo dispositivi: ${error.message}`)
    }
  }, [addDebug])

  // Auto-setup modalità demo SOLAMENTE
  useEffect(() => {
    if (isDemoMode) {
      setIsConnected(true)
      setConnectionStatus('connected')
      setDeviceInfo({
        productName: 'uTrust 3700F (Demo)',
        manufacturerName: 'Identive (Simulato)',
        vendorId: '04e6',
        productId: '5790',
        type: 'Demo'
      })
      addDebug('🎮 Modalità DEMO attivata')
    } else {
      // Reset in modalità reale
      setIsConnected(false)
      setConnectionStatus('disconnected')
      setDeviceInfo(null)
      addDebug('🔄 Modalità reale - usa i pulsanti per connetterti')
    }

    return () => {
      if (readerInterval.current) {
        clearInterval(readerInterval.current)
      }
    }
  }, [isDemoMode, addDebug]) // Dipendenze necessarie

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
            <>
              <button
                onClick={autoConnect}
                disabled={connectionStatus === 'connecting'}
                style={{
                  padding: '6px 12px',
                  background: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: connectionStatus === 'connecting' ? 'not-allowed' : 'pointer',
                  fontSize: '12px'
                }}
              >
                🔄 Auto
              </button>
              <button
                onClick={() => {setUseHID(false); connectToDevice()}}
                disabled={connectionStatus === 'connecting'}
                style={{
                  padding: '6px 12px',
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: connectionStatus === 'connecting' ? 'not-allowed' : 'pointer',
                  fontSize: '12px'
                }}
              >
                🔌 Serial
              </button>
              <button
                onClick={() => {setUseHID(true); connectToDevice()}}
                disabled={connectionStatus === 'connecting'}
                style={{
                  padding: '6px 12px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: connectionStatus === 'connecting' ? 'not-allowed' : 'pointer',
                  fontSize: '12px'
                }}
              >
                🎮 HID
              </button>
              <button
                onClick={checkAvailableDevices}
                style={{
                  padding: '6px 12px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                🔍 Controlla
              </button>
            </>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '15px' }}>
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
          <strong>API:</strong> 
          <span style={{ marginLeft: '5px' }}>
            {deviceInfo?.type || (useHID ? 'HID' : 'Serial')}
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
          <div><strong>Connessione:</strong> {deviceInfo.type}</div>
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

      {/* Info */}
      <div style={{ background: '#e9ecef', padding: '8px', borderRadius: '4px', fontSize: '12px', marginBottom: '10px' }}>
        💡 <strong>Auto:</strong> Cerca dispositivi già autorizzati | <strong>Serial:</strong> Autorizza comunicazione seriale | <strong>HID:</strong> Autorizza protocollo HID | <strong>Controlla:</strong> Mostra dispositivi disponibili
        <br />
        ⚠️ Se vedi "No port/device selected", riprova cliccando il pulsante e seleziona il tuo lettore uTrust dalla lista
      </div>

      {/* Debug Info */}
      {debugInfo && (
        <details style={{ marginTop: '15px' }}>
          <summary>🔧 Debug Log</summary>
          <pre style={{ 
            background: '#f8f9fa', 
            padding: '10px', 
            borderRadius: '4px', 
            fontSize: '11px',
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

Trust3700FReaderWebSerial.displayName = 'Trust3700FReaderWebSerial'

export default Trust3700FReaderWebSerial
