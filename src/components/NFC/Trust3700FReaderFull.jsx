import { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react'
import { supabase } from '../../supabase'

const Trust3700FReaderFull = memo(({ onTagRead, onError, onCustomerFound, showNotification }) => {
  const [isConnected, setIsConnected] = useState(false)
  const [isReading, setIsReading] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState(null)
  const [lastReadTag, setLastReadTag] = useState(null)
  const [foundCustomer, setFoundCustomer] = useState(null)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [debugInfo, setDebugInfo] = useState('')
  const deviceRef = useRef(null)
  const readerInterval = useRef(null)

  // Configurazione UTRUST 700F
  const UTRUST_CONFIG = useMemo(() => ({
    vendorId: 0x04e6,
    productId: 0x5790,
    interface: 0,
    endpoint: 1,
    alternatives: [
      { vendorId: 0x04e6, productId: 0x5591 },
      { vendorId: 0x04e6, productId: 0x5790 },
      { vendorId: 0x072f, productId: 0x2200 },
    ]
  }), [])

  // Debug log
  const addDebug = useCallback((message) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugInfo(prev => `${timestamp}: ${message}\n${prev}`)
    console.log(`🔧 FULL UTRUST: ${message}`)
  }, [])

  // Controlla supporto WebUSB
  const checkWebUSBSupport = useCallback(() => {
    if (!navigator.usb) {
      addDebug('❌ WebUSB non supportato su questo browser')
      if (onError) onError(new Error('WebUSB non supportato su questo browser'))
      return false
    }
    addDebug('✅ WebUSB supportato')
    return true
  }, [addDebug, onError])

  // Leggi tag NFC (versione simulata sicura)
  const readNFCTag = useCallback(async () => {
    if (!deviceRef.current || !isConnected) return null

    try {
      // Simula operazioni USB invece di quelle reali per evitare errori
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Simula probabilità di tag trovato
      if (Math.random() < 0.2) { // 20% di probabilità
        const tagId = 'SIM' + Math.random().toString(36).substr(2, 8).toUpperCase()
        return {
          id: tagId,
          type: 'SIMULATED',
          data: new Uint8Array([0x01, 0x02, 0x03, 0x04]),
          timestamp: new Date().toISOString(),
          source: 'Utrust700F-Simulated'
        }
      }
      
      return null

    } catch (error) {
      if (!error.message.includes('DEVICE_NOT_FOUND') && 
          !error.message.includes('NetworkError')) {
        addDebug(`⚠️ Errore lettura: ${error.message}`)
      }
      return null
    }
  }, [isConnected, addDebug])

  // Cerca cliente nel database
  const lookupCustomer = useCallback(async (tagId) => {
    try {
      setIsLookingUp(true)
      
      addDebug(`🔍 Cerco cliente per tag: ${tagId}`)

      // Cerca tag nel database
      const { data: nfcTag, error: tagError } = await supabase
        .from('nfc_tags')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('tag_id', tagId)
        .eq('is_active', true)
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
            `👤 Cliente riconosciuto: ${nfcTag.customer.name} - ${nfcTag.customer.points} GEMME`, 
            'success'
          )
        }

        // Salva log accesso
        await supabase.from('nfc_logs').insert([{
          tag_id: tagId,
          action_type: 'customer_recognition',
          device_info: 'Utrust 700F USB Reader - Full Test',
          customer_id: nfcTag.customer.id
        }])

        return nfcTag.customer

      } else {
        addDebug(`ℹ️ Tag ${tagId} non associato a nessun cliente`)
        
        if (showNotification) {
          showNotification(
            `📱 Tag letto: ${tagId.slice(-8)} - Non associato`, 
            'warning'
          )
        }

        return null
      }

    } catch (error) {
      addDebug(`❌ Errore lookup cliente: ${error.message}`)
      console.error('❌ Errore lookup cliente:', error)
      if (showNotification) {
        showNotification('Errore ricerca cliente nel database', 'error')
      }
      return null
    } finally {
      setIsLookingUp(false)
    }
  }, [addDebug, onCustomerFound, showNotification])

  // Avvia lettura continua (ORA useCallback - CORREZIONE!)
  const startReading = useCallback(() => {
    if (readerInterval.current) return

    setIsReading(true)
    addDebug('🔄 Lettura automatica avviata')
    
    readerInterval.current = setInterval(async () => {
      const tag = await readNFCTag()
      
      if (tag && tag.id !== lastReadTag?.id) {
        addDebug(`📱 Nuovo tag letto: ${tag.id}`)
        
        setLastReadTag(tag)
        
        if (onTagRead) {
          onTagRead(tag)
        }
        
        // Cerca cliente associato
        await lookupCustomer(tag.id)
      }
    }, 800)
  }, [readNFCTag, lastReadTag, onTagRead, lookupCustomer, addDebug])

  // Ferma lettura
  const stopReading = useCallback(() => {
    if (readerInterval.current) {
      clearInterval(readerInterval.current)
      readerInterval.current = null
    }
    setIsReading(false)
    addDebug('⏹️ Lettura fermata')
  }, [addDebug])

  // Connetti al dispositivo (simulato)
  const connectToUtrust = useCallback(async () => {
    try {
      if (!checkWebUSBSupport()) return

      addDebug('🔌 Tentativo connessione Utrust 700F (simulata)...')
      
      // Simula connessione senza USB reale
      await new Promise(resolve => setTimeout(resolve, 1000))

      deviceRef.current = { simulated: true }
      setIsConnected(true)
      setDeviceInfo({
        name: 'Utrust 700F (Simulated)',
        vendor: 'Identiv (Simulated)',
        serial: 'SIM123456',
        vendorId: '0x04e6',
        productId: '0x5790'
      })

      addDebug('✅ Utrust 700F connesso (simulato)!')
      
      if (showNotification) {
        showNotification('✅ Utrust 700F connesso (simulato)!', 'success')
      }
      
      // Avvia lettura automatica
      startReading()

    } catch (error) {
      addDebug(`❌ Errore connessione: ${error.message}`)
      console.error('❌ Errore connessione Utrust 700F:', error)
      
      if (onError) onError(error)
      if (showNotification) {
        showNotification(`Errore connessione: ${error.message}`, 'error')
      }
    }
  }, [checkWebUSBSupport, addDebug, showNotification, onError, startReading])

  // Disconnetti dispositivo
  const disconnectDevice = useCallback(async () => {
    try {
      stopReading()
      
      if (deviceRef.current) {
        addDebug('🔌 Disconnessione in corso...')
        deviceRef.current = null
      }
      
      setIsConnected(false)
      setDeviceInfo(null)
      setLastReadTag(null)
      setFoundCustomer(null)
      
      addDebug('✅ Dispositivo disconnesso')
      
      if (showNotification) {
        showNotification('🔌 Utrust 700F disconnesso', 'info')
      }
      
    } catch (error) {
      addDebug(`❌ Errore disconnessione: ${error.message}`)
      console.error('Errore disconnessione:', error)
    }
  }, [stopReading, showNotification, addDebug])

  // Cleanup al dismount
  useEffect(() => {
    return () => {
      stopReading()
      disconnectDevice()
    }
  }, [stopReading, disconnectDevice])

  // Reset cliente trovato dopo 15 secondi
  useEffect(() => {
    if (foundCustomer) {
      const timer = setTimeout(() => {
        setFoundCustomer(null)
      }, 15000)
      
      return () => clearTimeout(timer)
    }
  }, [foundCustomer])

  return (
    <div className="trust-reader-container">
      <div className="trust-header">
        <div className="trust-title-section">
          <div className="trust-icon">🔌</div>
          <div className="trust-title-content">
            <h3 className="trust-main-title">Utrust 700F USB Reader (Full Test)</h3>
            <p className="trust-subtitle">
              Test completo con tutte le funzionalità (simulate per sicurezza)
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

      <div className="trust-controls">
        {!isConnected ? (
          <div className="connection-buttons">
            <button
              onClick={connectToUtrust}
              className="connect-btn"
              disabled={!checkWebUSBSupport()}
            >
              <span className="btn-icon">🔌</span>
              <span className="btn-text">Connetti (Simulato)</span>
            </button>
          </div>
        ) : (
          <div className="connected-controls">
            <button
              onClick={disconnectDevice}
              className="disconnect-btn"
            >
              <span className="btn-icon">🔌</span>
              <span className="btn-text">Disconnetti</span>
            </button>
            
            <button
              onClick={isReading ? stopReading : startReading}
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
          </div>
        </div>
      )}

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
          </div>
        </div>
      )}

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

      <div className="debug-info">
        <h4>Debug Log:</h4>
        <pre className="debug-log">
          {debugInfo || 'Nessun log disponibile...'}
        </pre>
      </div>

      {!checkWebUSBSupport() && (
        <div className="browser-warning">
          <div className="warning-icon">⚠️</div>
          <div className="warning-content">
            <h4 className="warning-title">WebUSB Non Supportato</h4>
            <p className="warning-text">
              Il Utrust 700F richiede un browser che supporti WebUSB (Chrome, Edge).
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        .trust-reader-container {
          background: white;
          border: 2px solid #2c3e50;
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
          color: #2c3e50;
        }

        .trust-subtitle {
          margin: 0;
          color: #7f8c8d;
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

        .connect-btn, .disconnect-btn, .reading-btn {
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
          color: #2c3e50;
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
          color: #7f8c8d;
        }

        .detail-value {
          color: #2c3e50;
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

        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #27ae60;
          animation: pulse 1.5s infinite;
        }

        .idle-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
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

        .tag-id, .tag-type {
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
      `}</style>
    </div>
  )
})

Trust3700FReaderFull.displayName = 'Trust3700FReaderFull'

export default Trust3700FReaderFull
