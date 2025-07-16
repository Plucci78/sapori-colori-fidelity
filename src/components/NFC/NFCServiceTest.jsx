import { useState, useEffect } from 'react'
import nfcService from '../../services/nfcService'

const NFCServiceTest = ({ showNotification }) => {
  const [status, setStatus] = useState({
    service: '⏳ Non testato',
    connection: '⏳ Non testato',
    websocket: '⏳ Non testato'
  })

  useEffect(() => {
    testNFCService()
  }, [])

  const testNFCService = async () => {
    console.log('🧪 Test NFCService avviato')
    
    // Test 1: Verifica configurazione service
    setStatus(prev => ({ 
      ...prev, 
      service: `✅ URL: ${nfcService.serverUrl || 'Non definito'}` 
    }))

    // Test 2: Listener setup
    nfcService.on('connected', () => {
      console.log('✅ NFCService: Evento connected ricevuto')
      setStatus(prev => ({ ...prev, connection: '✅ WebSocket Connesso' }))
    })

    nfcService.on('disconnected', () => {
      console.log('❌ NFCService: Evento disconnected ricevuto')
      setStatus(prev => ({ ...prev, connection: '❌ WebSocket Disconnesso' }))
    })

    nfcService.on('readerConnected', (data) => {
      console.log('✅ NFCService: Lettore connesso', data)
      showNotification(`✅ Lettore: ${data.name}`, 'success')
    })

    // Test 3: Tentativo connessione
    try {
      setStatus(prev => ({ ...prev, websocket: '⏳ Connessione in corso...' }))
      
      await nfcService.connect()
      
      setStatus(prev => ({ ...prev, websocket: '✅ Connessione riuscita' }))
      console.log('✅ NFCService.connect() completato')
      
    } catch (error) {
      console.error('❌ NFCService.connect() fallito:', error)
      setStatus(prev => ({ 
        ...prev, 
        websocket: `❌ Errore: ${error.message}` 
      }))
    }
  }

  const testReconnect = async () => {
    console.log('🔄 Test riconnessione...')
    await testNFCService()
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>🧪 Test NFCService</h2>
      
      <div style={{ 
        background: '#f0f0f0', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3>Status NFCService:</h3>
        {Object.entries(status).map(([key, value]) => (
          <div key={key} style={{ margin: '8px 0' }}>
            <strong>{key}:</strong> {value}
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4>Configurazione Attuale:</h4>
        <div>Server URL: {nfcService.serverUrl}</div>
        <div>API URL: {nfcService.apiUrl}</div>
        <div>Connesso: {nfcService.isConnected ? '✅' : '❌'}</div>
      </div>

      <button 
        onClick={testReconnect}
        style={{
          padding: '10px 20px',
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginRight: '10px'
        }}
      >
        🔄 Test Riconnessione
      </button>

      <button 
        onClick={() => {
          console.log('NFCService state:', {
            isConnected: nfcService.isConnected,
            serverUrl: nfcService.serverUrl,
            apiUrl: nfcService.apiUrl,
            ws: nfcService.ws?.readyState
          })
        }}
        style={{
          padding: '10px 20px',
          background: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        📊 Log State
      </button>
    </div>
  )
}

export default NFCServiceTest
