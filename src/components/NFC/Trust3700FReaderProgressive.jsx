import { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react'

const Trust3700FReaderProgressive = memo(({ onError, showNotification }) => {
  // Test levels:
  // 1: Basic rendering and state
  // 2: Add UTRUST_CONFIG
  // 3: Add WebUSB check
  // 4: Add USB device listing
  // 5: Full connection logic
  const [testLevel, setTestLevel] = useState(1)
  
  const [isConnected, setIsConnected] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState(null)
  const [debugInfo, setDebugInfo] = useState('')
  const deviceRef = useRef(null)

  // Debug log
  const addDebug = useCallback((message) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugInfo(prev => `${timestamp}: ${message}\n${prev}`)
    console.log(`🔧 TRUST PROGRESSIVE: ${message}`)
  }, [])

  // Level 2: UTRUST CONFIG
  const UTRUST_CONFIG = useMemo(() => {
    return testLevel >= 2 ? {
      vendorId: 0x04e6,
      productId: 0x5790,
      interface: 0,
      endpoint: 1,
      alternatives: [
        { vendorId: 0x04e6, productId: 0x5591 },
        { vendorId: 0x04e6, productId: 0x5790 },
        { vendorId: 0x072f, productId: 0x2200 },
      ]
    } : null
  }, [testLevel])

  // Level 3: WebUSB check
  const checkWebUSBSupport = useCallback(() => {
    if (testLevel < 3) return true
    
    try {
      if (!navigator.usb) {
        addDebug('❌ WebUSB non supportato su questo browser')
        if (onError) onError(new Error('WebUSB non supportato su questo browser'))
        return false
      }
      addDebug('✅ WebUSB supportato')
      return true
    } catch (error) {
      addDebug(`❌ Errore check WebUSB: ${error.message}`)
      return false
    }
  }, [testLevel, addDebug, onError])

  // Level 4: List USB devices
  const listUSBDevices = useCallback(async () => {
    if (testLevel < 4) return []
    
    try {
      if (!navigator.usb) return []
      
      const devices = await navigator.usb.getDevices()
      addDebug(`📱 Device USB trovati: ${devices.length}`)
      
      devices.forEach((device, index) => {
        addDebug(`Device ${index + 1}: ${device.productName || 'Unknown'} (${device.vendorId}:${device.productId})`)
      })
      
      return devices
    } catch (error) {
      addDebug(`❌ Errore listing devices: ${error.message}`)
      return []
    }
  }, [testLevel, addDebug])

  // Level 5: Connect to device
  const connectToUtrust = useCallback(async () => {
    if (testLevel < 5) return
    
    try {
      if (!checkWebUSBSupport()) return
      if (!UTRUST_CONFIG) return

      addDebug('🔌 Tentativo connessione Utrust 700F...')
      
      const authorizedDevices = await navigator.usb.getDevices()
      addDebug(`📱 Device autorizzati: ${authorizedDevices.length}`)
      
      let device = null
      
      if (authorizedDevices.length > 0) {
        device = authorizedDevices.find(d => 
          d.vendorId === UTRUST_CONFIG.vendorId || 
          UTRUST_CONFIG.alternatives.some(alt => 
            d.vendorId === alt.vendorId && d.productId === alt.productId
          )
        )
        
        if (device) {
          addDebug(`✅ Device autorizzato trovato: ${device.productName}`)
        }
      }
      
      if (!device) {
        addDebug('🔍 Richiedo permessi per nuovo device...')
        
        device = await navigator.usb.requestDevice({
          filters: [
            { vendorId: UTRUST_CONFIG.vendorId },
            ...UTRUST_CONFIG.alternatives
          ]
        })
        
        addDebug(`📱 Device selezionato: ${device.productName || 'Sconosciuto'}`)
      }

      addDebug(`🔧 Vendor ID: 0x${device.vendorId.toString(16).padStart(4, '0')}`)
      addDebug(`🔧 Product ID: 0x${device.productId.toString(16).padStart(4, '0')}`)

      addDebug('🔓 Apertura device...')
      await device.open()
      
      if (device.configuration === null) {
        addDebug('⚙️ Seleziono configurazione 1...')
        await device.selectConfiguration(1)
      }
      
      addDebug(`⚙️ Claim interface ${UTRUST_CONFIG.interface}...`)
      await device.claimInterface(UTRUST_CONFIG.interface)

      deviceRef.current = device
      setIsConnected(true)
      setDeviceInfo({
        name: device.productName || 'Utrust 700F',
        vendor: device.manufacturerName || 'Identiv',
        serial: device.serialNumber || 'N/A',
        vendorId: `0x${device.vendorId.toString(16).padStart(4, '0')}`,
        productId: `0x${device.productId.toString(16).padStart(4, '0')}`
      })

      addDebug('✅ Utrust 700F connesso e configurato!')
      
      if (showNotification) {
        showNotification('✅ Utrust 700F connesso con successo!', 'success')
      }

    } catch (error) {
      addDebug(`❌ Errore connessione: ${error.message}`)
      console.error('❌ Errore connessione Utrust 700F:', error)
      
      if (onError) onError(error)
      if (showNotification) {
        showNotification(`Errore connessione: ${error.message}`, 'error')
      }
    }
  }, [testLevel, checkWebUSBSupport, UTRUST_CONFIG, addDebug, showNotification, onError])

  useEffect(() => {
    addDebug(`Trust3700FReaderProgressive avviato - Test Level ${testLevel}`)
    
    if (testLevel >= 4) {
      listUSBDevices()
    }
  }, [testLevel, addDebug, listUSBDevices])

  const nextLevel = () => {
    const newLevel = testLevel < 5 ? testLevel + 1 : 1
    setTestLevel(newLevel)
    addDebug(`Test level cambiato a: ${newLevel}`)
  }

  const testConnection = () => {
    if (testLevel >= 5) {
      connectToUtrust()
    } else {
      addDebug(`Connessione richiede test level 5 (attuale: ${testLevel})`)
    }
  }

  return (
    <div className="trust-progressive-container">
      <div className="trust-progressive-header">
        <h3>🧪 Trust 3700F Progressive Test</h3>
        <div className="test-controls">
          <button onClick={nextLevel} className="level-btn">
            Test Level: {testLevel}/5
          </button>
          
          {testLevel >= 5 && (
            <button onClick={testConnection} className="connect-btn">
              {isConnected ? '🟢 Connesso' : '🔴 Connetti'}
            </button>
          )}
        </div>
      </div>

      <div className="test-info">
        <div className="test-grid">
          <div>Test Level: {testLevel}/5</div>
          <div>WebUSB: {testLevel >= 3 ? (navigator.usb ? '✅' : '❌') : '⏳'}</div>
          <div>Config: {testLevel >= 2 ? '✅' : '⏳'}</div>
          <div>Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
        </div>

        {deviceInfo && (
          <div className="device-info">
            <h4>Device Info:</h4>
            <div>Name: {deviceInfo.name}</div>
            <div>Vendor: {deviceInfo.vendor}</div>
            <div>Vendor ID: {deviceInfo.vendorId}</div>
            <div>Product ID: {deviceInfo.productId}</div>
          </div>
        )}
      </div>

      <div className="debug-info">
        <h4>Debug Log:</h4>
        <pre className="debug-log">
          {debugInfo || 'Nessun log disponibile...'}
        </pre>
      </div>

      <style jsx>{`
        .trust-progressive-container {
          padding: 20px;
          border: 2px solid #28a745;
          border-radius: 8px;
          background: #f8f9fa;
          margin: 10px 0;
        }

        .trust-progressive-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .test-controls {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .level-btn, .connect-btn {
          padding: 8px 16px;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .level-btn:hover, .connect-btn:hover {
          background: #218838;
        }

        .test-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 15px;
        }

        .test-grid > div {
          padding: 8px;
          background: white;
          border-radius: 4px;
          border: 1px solid #ddd;
          text-align: center;
        }

        .device-info {
          background: white;
          padding: 15px;
          border-radius: 4px;
          border: 1px solid #ddd;
          margin-bottom: 15px;
        }

        .device-info > div {
          margin: 5px 0;
        }

        .debug-log {
          background: #1e1e1e;
          color: #d4d4d4;
          padding: 15px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
          max-height: 200px;
          overflow-y: auto;
          white-space: pre-wrap;
        }
      `}</style>
    </div>
  )
})

Trust3700FReaderProgressive.displayName = 'Trust3700FReaderProgressive'

export default Trust3700FReaderProgressive
