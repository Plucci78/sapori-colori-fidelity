import { useState, memo, useCallback } from 'react'

const Trust3700FReaderJSXTest = memo(() => {
  const [isConnected, setIsConnected] = useState(false)
  const [isReading, setIsReading] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState(null)
  const [lastReadTag, setLastReadTag] = useState(null)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [foundCustomer, setFoundCustomer] = useState(null)
  const [debugInfo, setDebugInfo] = useState('')

  // Debug log
  const addDebug = useCallback((message) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugInfo(prev => `${timestamp}: ${message}\n${prev}`)
    console.log(`🔧 JSX TEST: ${message}`)
  }, [])

  // Funzione di test WebUSB support
  const checkWebUSBSupport = () => {
    return !!navigator.usb
  }

  // Test data
  const setupTestData = () => {
    setIsConnected(true)
    setIsReading(true)
    setDeviceInfo({
      name: 'Test Utrust 700F',
      vendor: 'Test Identiv',
      vendorId: '0x04e6',
      productId: '0x5790',
      serial: 'TEST123456'
    })
    setLastReadTag({
      id: 'A1B2C3D4E5F6',
      type: 'MIFARE',
      timestamp: new Date().toISOString(),
      source: 'Utrust700F'
    })
    setFoundCustomer({
      name: 'Mario Rossi',
      email: 'mario@test.com',
      points: 150
    })
    addDebug('✅ Test data configurati')
  }

  const clearTestData = () => {
    setIsConnected(false)
    setIsReading(false)
    setDeviceInfo(null)
    setLastReadTag(null)
    setFoundCustomer(null)
    setIsLookingUp(false)
    addDebug('🗑️ Test data puliti')
  }

  const toggleLookup = () => {
    setIsLookingUp(!isLookingUp)
  }

  return (
    <div className="jsx-test-container">
      <div className="test-header">
        <h3>🧪 Trust 3700F JSX Test</h3>
        <div className="test-controls">
          <button onClick={setupTestData}>📊 Setup Test Data</button>
          <button onClick={clearTestData}>🗑️ Clear Data</button>
          <button onClick={toggleLookup}>🔍 Toggle Lookup</button>
        </div>
      </div>

      {/* *** QUESTO E' IL JSX SOSPETTO - VERSIONE SEMPLIFICATA DEL COMPONENTE ORIGINALE *** */}
      <div className="trust-reader-container">
        {/* Header Utrust 700F */}
        <div className="trust-header">
          <div className="trust-title-section">
            <div className="trust-icon">🔌</div>
            <div className="trust-title-content">
              <h3 className="trust-main-title">Utrust 700F USB Reader</h3>
              <p className="trust-subtitle">
                Lettore NFC professionale per riconoscimento clienti via OTG
              </p>
            </div>
          </div>
          
          <div className="trust-status">
            {isConnected ? (
              <span className="status-connected">
                <span className="status-dot connected"></span>
                Connesso
              </span>
            ) : (
              <span className="status-disconnected">
                <span className="status-dot disconnected"></span>
                Disconnesso
              </span>
            )}
          </div>
        </div>

        {/* Controlli Connessione */}
        <div className="trust-controls">
          {!isConnected ? (
            <div className="connection-buttons">
              <button
                onClick={() => setIsConnected(true)}
                className="connect-btn"
                disabled={!checkWebUSBSupport()}
              >
                <span className="btn-icon">🔌</span>
                <span className="btn-text">Connetti Utrust 700F</span>
              </button>
              
              <button
                onClick={() => addDebug('🧪 Test veloce eseguito')}
                className="test-btn"
                disabled={!checkWebUSBSupport()}
              >
                <span className="btn-icon">🧪</span>
                <span className="btn-text">Test Veloce</span>
              </button>
            </div>
          ) : (
            <div className="connected-controls">
              <button
                onClick={() => setIsConnected(false)}
                className="disconnect-btn"
              >
                <span className="btn-icon">🔌</span>
                <span className="btn-text">Disconnetti</span>
              </button>
              
              <button
                onClick={() => setIsReading(!isReading)}
                className={`reading-btn ${isReading ? 'reading' : 'stopped'}`}
              >
                <span className="btn-icon">
                  {isReading ? '⏹️' : '▶️'}
                </span>
                <span className="btn-text">
                  {isReading ? 'Ferma Lettura' : 'Avvia Lettura'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Informazioni Dispositivo */}
        {deviceInfo && (
          <div className="device-info">
            <h4 className="device-info-title">
              <span className="info-icon">📱</span>
              Informazioni Dispositivo
            </h4>
            <div className="device-details">
              <div className="device-detail">
                <span className="detail-label">Nome:</span>
                <span className="detail-value">{deviceInfo.name}</span>
              </div>
              <div className="device-detail">
                <span className="detail-label">Produttore:</span>
                <span className="detail-value">{deviceInfo.vendor}</span>
              </div>
              <div className="device-detail">
                <span className="detail-label">Vendor ID:</span>
                <span className="detail-value">{deviceInfo.vendorId}</span>
              </div>
              <div className="device-detail">
                <span className="detail-label">Product ID:</span>
                <span className="detail-value">{deviceInfo.productId}</span>
              </div>
              <div className="device-detail">
                <span className="detail-label">Seriale:</span>
                <span className="detail-value">{deviceInfo.serial}</span>
              </div>
            </div>
          </div>
        )}

        {/* Status Lettura */}
        {isConnected && (
          <div className="reading-status">
            <div className="status-header">
              <h4 className="status-title">
                <span className="status-icon">
                  {isReading ? '📡' : '💤'}
                </span>
                Status Lettura
              </h4>
              <div className="status-indicator">
                {isReading ? (
                  <span className="reading-active">
                    <span className="pulse-dot"></span>
                    Lettura Attiva
                  </span>
                ) : (
                  <span className="reading-inactive">
                    <span className="idle-dot"></span>
                    In Attesa
                  </span>
                )}
              </div>
            </div>

            {isLookingUp && (
              <div className="lookup-status">
                <span className="lookup-icon">🔍</span>
                <span className="lookup-text">Ricerca cliente in corso...</span>
              </div>
            )}
          </div>
        )}

        {/* Ultimo Tag Letto */}
        {lastReadTag && (
          <div className="last-tag-section">
            <div className="last-tag-header">
              <h4 className="last-tag-title">
                <span className="tag-icon">📱</span>
                Ultimo Tag Letto
              </h4>
              <div className="tag-timestamp">
                {new Date(lastReadTag.timestamp).toLocaleTimeString()}
              </div>
            </div>
            <div className="tag-details">
              <div className="tag-id">
                <span className="tag-label">ID:</span>
                <code className="tag-value">{lastReadTag.id}</code>
              </div>
              <div className="tag-type">
                <span className="tag-label">Tipo:</span>
                <span className="tag-value">{lastReadTag.type}</span>
              </div>
              <div className="tag-source">
                <span className="tag-label">Fonte:</span>
                <span className="tag-value">{lastReadTag.source}</span>
              </div>
            </div>
          </div>
        )}

        {/* Cliente Trovato */}
        {foundCustomer && (
          <div className="customer-found">
            <div className="customer-header">
              <div className="customer-icon">👤</div>
              <div className="customer-title">Cliente Riconosciuto</div>
            </div>
            <div className="customer-details">
              <div className="customer-name">{foundCustomer.name}</div>
              <div className="customer-email">{foundCustomer.email}</div>
              <div className="customer-points">{foundCustomer.points} GEMME</div>
            </div>
          </div>
        )}

        {/* Supporto Browser */}
        {!checkWebUSBSupport() && (
          <div className="browser-warning">
            <div className="warning-icon">⚠️</div>
            <div className="warning-content">
              <h4 className="warning-title">WebUSB Non Supportato</h4>
              <p className="warning-text">
                Il Utrust 700F richiede un browser che supporti WebUSB (Chrome, Edge).
                Safari e Firefox non sono attualmente supportati.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="debug-info">
        <h4>Debug Log:</h4>
        <pre className="debug-log">
          {debugInfo || 'Nessun log disponibile...'}
        </pre>
      </div>

      <div className="warning-box">
        <h4>⚠️ Test Focus:</h4>
        <p>Questo componente testa il JSX complesso del Trust3700FReader originale.</p>
        <p>Se questo causa crash, il problema è nella struttura JSX o negli elementi DOM.</p>
      </div>

      <style jsx>{`
        .jsx-test-container {
          padding: 20px;
          border: 2px solid #9b59b6;
          border-radius: 8px;
          background: #faf0ff;
          margin: 10px 0;
        }

        .test-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .test-controls {
          display: flex;
          gap: 10px;
        }

        .test-controls button {
          padding: 8px 16px;
          background: #9b59b6;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .test-controls button:hover {
          background: #8e44ad;
        }

        /* Trust Reader Styles - Simplified */
        .trust-reader-container {
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          margin: 15px 0;
        }

        .trust-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 15px;
          border-bottom: 1px solid #eee;
        }

        .trust-title-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .trust-icon {
          font-size: 24px;
        }

        .trust-main-title {
          margin: 0;
          color: #333;
        }

        .trust-subtitle {
          margin: 0;
          color: #666;
          font-size: 14px;
        }

        .status-connected {
          color: #27ae60;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-disconnected {
          color: #e74c3c;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-dot.connected {
          background: #27ae60;
        }

        .status-dot.disconnected {
          background: #e74c3c;
        }

        .trust-controls {
          margin: 15px 0;
        }

        .connection-buttons, .connected-controls {
          display: flex;
          gap: 10px;
        }

        .connect-btn, .test-btn, .disconnect-btn, .reading-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }

        .connect-btn {
          background: #27ae60;
          color: white;
        }

        .test-btn {
          background: #3498db;
          color: white;
        }

        .disconnect-btn {
          background: #e74c3c;
          color: white;
        }

        .reading-btn.reading {
          background: #e67e22;
          color: white;
        }

        .reading-btn.stopped {
          background: #27ae60;
          color: white;
        }

        .device-info, .reading-status, .last-tag-section, .customer-found {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 6px;
          padding: 15px;
          margin: 15px 0;
        }

        .device-info-title, .status-title, .last-tag-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 10px 0;
          color: #333;
        }

        .device-details {
          display: grid;
          gap: 8px;
        }

        .device-detail {
          display: flex;
          justify-content: space-between;
        }

        .detail-label {
          font-weight: 500;
          color: #666;
        }

        .detail-value {
          color: #333;
        }

        .status-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .reading-active {
          color: #27ae60;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .reading-inactive {
          color: #95a5a6;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pulse-dot, .idle-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .pulse-dot {
          background: #27ae60;
          animation: pulse 1.5s infinite;
        }

        .idle-dot {
          background: #95a5a6;
        }

        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }

        .tag-details {
          display: grid;
          gap: 8px;
        }

        .tag-id, .tag-type, .tag-source {
          display: flex;
          justify-content: space-between;
        }

        .tag-value {
          background: #f1f3f4;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: monospace;
        }

        .customer-found {
          background: #e8f5e8;
          border-color: #c8e6c9;
        }

        .customer-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .customer-icon {
          font-size: 24px;
        }

        .customer-title {
          font-weight: 500;
          color: #2e7d32;
        }

        .customer-details > div {
          margin: 5px 0;
        }

        .browser-warning {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 6px;
          padding: 15px;
          margin: 15px 0;
          display: flex;
          gap: 12px;
        }

        .warning-icon {
          font-size: 24px;
        }

        .warning-title {
          margin: 0 0 8px 0;
          color: #856404;
        }

        .warning-text {
          margin: 0;
          color: #664d03;
        }

        .debug-log {
          background: #1e1e1e;
          color: #d4d4d4;
          padding: 15px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
          max-height: 150px;
          overflow-y: auto;
          white-space: pre-wrap;
        }

        .warning-box {
          background: #f3e5f5;
          border: 1px solid #e1bee7;
          border-radius: 4px;
          padding: 15px;
          margin-top: 15px;
        }
      `}</style>
    </div>
  )
})

Trust3700FReaderJSXTest.displayName = 'Trust3700FReaderJSXTest'

export default Trust3700FReaderJSXTest
