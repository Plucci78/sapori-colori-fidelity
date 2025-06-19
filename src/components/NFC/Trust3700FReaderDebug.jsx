import { useState, useEffect, memo } from 'react'

const Trust3700FReaderDebug = memo(({ showNotification }) => {
  const [debugLevel, setDebugLevel] = useState(1)
  const [isConnected] = useState(false)
  const [debugInfo, setDebugInfo] = useState('')

  // Debug log
  const addDebug = (message) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugInfo(prev => `${timestamp}: ${message}\n${prev}`)
    console.log(`🔧 TRUST DEBUG: ${message}`)
  }

  useEffect(() => {
    addDebug(`Trust3700FReaderDebug montato - Level ${debugLevel}`)
    
    // Test basic hooks
    try {
      if (debugLevel >= 1) {
        addDebug('✅ useState hooks working')
      }
      
      if (debugLevel >= 2) {
        addDebug('✅ useEffect working')
      }
      
      if (debugLevel >= 3) {
        // Test WebUSB availability
        if (navigator.usb) {
          addDebug('✅ WebUSB API available')
        } else {
          addDebug('❌ WebUSB API not available')
        }
      }
      
    } catch (error) {
      addDebug(`❌ Error in useEffect: ${error.message}`)
      console.error('Trust3700FReaderDebug error:', error)
    }
  }, [debugLevel])

  const handleConnectTest = async () => {
    try {
      addDebug('🔌 Test connessione avviato...')
      
      if (!navigator.usb) {
        addDebug('❌ WebUSB non supportato')
        if (showNotification) {
          showNotification('WebUSB non supportato su questo browser', 'error')
        }
        return
      }
      
      addDebug('✅ WebUSB disponibile')
      
      // Test getDevices
      const devices = await navigator.usb.getDevices()
      addDebug(`📱 Device autorizzati: ${devices.length}`)
      
      if (showNotification) {
        showNotification(`Test completato: ${devices.length} device trovati`, 'info')
      }
      
    } catch (error) {
      addDebug(`❌ Errore test: ${error.message}`)
      console.error('Test error:', error)
      if (showNotification) {
        showNotification(`Errore test: ${error.message}`, 'error')
      }
    }
  }

  const incrementDebugLevel = () => {
    const newLevel = debugLevel < 5 ? debugLevel + 1 : 1
    setDebugLevel(newLevel)
    addDebug(`Debug level cambiato a: ${newLevel}`)
  }

  return (
    <div className="trust-debug-container">
      <div className="trust-debug-header">
        <h3>🔧 Trust 3700F Debug Mode</h3>
        <div className="debug-controls">
          <button 
            onClick={incrementDebugLevel}
            className="debug-level-btn"
          >
            Debug Level: {debugLevel}
          </button>
          
          <button 
            onClick={handleConnectTest}
            className="test-connection-btn"
          >
            Test Connessione
          </button>
          
          <div className="connection-status">
            Status: {isConnected ? '🟢 Connesso' : '🔴 Disconnesso'}
          </div>
        </div>
      </div>

      <div className="debug-info">
        <h4>Debug Log:</h4>
        <pre className="debug-log">
          {debugInfo || 'Nessun log disponibile...'}
        </pre>
      </div>

      <div className="debug-info-panel">
        <h4>Informazioni Debug:</h4>
        <div className="debug-grid">
          <div>Debug Level: {debugLevel}</div>
          <div>WebUSB: {navigator.usb ? '✅ Disponibile' : '❌ Non disponibile'}</div>
          <div>User Agent: {navigator.userAgent.slice(0, 50)}...</div>
          <div>Platform: {navigator.platform}</div>
        </div>
      </div>

      <style jsx>{`
        .trust-debug-container {
          padding: 20px;
          border: 2px solid #007acc;
          border-radius: 8px;
          background: #f5f5f5;
          margin: 10px 0;
        }

        .trust-debug-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .debug-controls {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .debug-level-btn, .test-connection-btn {
          padding: 8px 16px;
          background: #007acc;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .debug-level-btn:hover, .test-connection-btn:hover {
          background: #005a9e;
        }

        .connection-status {
          padding: 8px 12px;
          border-radius: 4px;
          background: white;
          border: 1px solid #ddd;
          font-weight: bold;
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

        .debug-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 10px;
        }

        .debug-grid > div {
          padding: 8px;
          background: white;
          border-radius: 4px;
          border: 1px solid #ddd;
        }
      `}</style>
    </div>
  )
})

Trust3700FReaderDebug.displayName = 'Trust3700FReaderDebug'

export default Trust3700FReaderDebug
