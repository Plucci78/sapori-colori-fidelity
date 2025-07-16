import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import nfcService from '../../services/nfcService'

const NFCDebugSimple = ({ showNotification }) => {
  const [logs, setLogs] = useState([])
  const [connected, setConnected] = useState(false)
  const [customers, setCustomers] = useState([])
  const [tags, setTags] = useState([])

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `${timestamp}: ${message}`])
    console.log(`[NFCDebug] ${message}`)
  }

  useEffect(() => {
    addLog('🔧 Componente inizializzato')
    testEverything()
  }, [])

  const testEverything = async () => {
    // Test 1: Database
    addLog('🗄️ Test database...')
    try {
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name, email')
        .limit(5)
      
      if (customersError) throw customersError
      setCustomers(customersData || [])
      addLog(`✅ Database: ${customersData?.length || 0} clienti caricati`)
    } catch (error) {
      addLog(`❌ Database error: ${error.message}`)
    }

    // Test 2: Tags
    try {
      const { data: tagsData, error: tagsError } = await supabase
        .from('nfc_tags')
        .select('*')
        .limit(5)
      
      if (tagsError) throw tagsError
      setTags(tagsData || [])
      addLog(`✅ Tags: ${tagsData?.length || 0} tag caricati`)
    } catch (error) {
      addLog(`❌ Tags error: ${error.message}`)
    }

    // Test 3: NFC Service
    addLog('🔌 Test NFCService...')
    addLog(`📍 URL: ${nfcService.serverUrl}`)
    
    try {
      // Setup listener
      nfcService.on('connected', () => {
        setConnected(true)
        addLog('✅ NFCService: Evento connected')
      })

      nfcService.on('readerConnected', (data) => {
        addLog(`✅ Lettore: ${data.name}`)
      })

      // Tenta connessione
      await nfcService.connect()
      addLog('✅ NFCService.connect() completato')
    } catch (error) {
      addLog(`❌ NFCService error: ${error.message}`)
    }

    // Test 4: HTTP Status
    try {
      const response = await fetch('http://192.168.1.6:3001/status')
      const data = await response.json()
      addLog(`✅ HTTP Status: ${data.reader}`)
    } catch (error) {
      addLog(`❌ HTTP error: ${error.message}`)
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', fontSize: '14px' }}>
      <h2>🔧 NFC Debug Semplice</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <strong>Status:</strong> {connected ? '🟢 Connesso' : '🟡 Non connesso'}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <strong>Clienti:</strong> {customers.length} | 
        <strong> Tag:</strong> {tags.length}
      </div>

      <div style={{ 
        background: '#f8f9fa', 
        padding: '10px', 
        borderRadius: '4px',
        height: '400px',
        overflowY: 'scroll',
        border: '1px solid #dee2e6'
      }}>
        <h4>📜 Log Debug:</h4>
        {logs.map((log, index) => (
          <div key={index} style={{ margin: '2px 0', fontSize: '12px' }}>
            {log}
          </div>
        ))}
      </div>

      <div style={{ marginTop: '15px' }}>
        <button 
          onClick={testEverything}
          style={{
            padding: '8px 16px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          🔄 Ripeti Test
        </button>

        <button 
          onClick={() => setLogs([])}
          style={{
            padding: '8px 16px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🧹 Pulisci Log
        </button>
      </div>

      {customers.length > 0 && (
        <div style={{ marginTop: '15px' }}>
          <h4>👥 Clienti (primi 5):</h4>
          {customers.map(customer => (
            <div key={customer.id} style={{ fontSize: '12px' }}>
              {customer.name} ({customer.email})
            </div>
          ))}
        </div>
      )}

      {tags.length > 0 && (
        <div style={{ marginTop: '15px' }}>
          <h4>🏷️ Tag (primi 5):</h4>
          {tags.map(tag => (
            <div key={tag.id} style={{ fontSize: '12px' }}>
              {tag.tag_id} → Cliente {tag.customer_id}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default NFCDebugSimple
