import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase'

const NFCViewTest = ({ showNotification }) => {
  const [status, setStatus] = useState({
    supabase: '⏳ Controllando...',
    customers: '⏳ Controllando...',
    tags: '⏳ Controllando...',
    logs: '⏳ Controllando...',
    server: '⏳ Controllando...',
    websocket: '⏳ Controllando...'
  })
  
  const wsRef = useRef(null)

  useEffect(() => {
    testAllSystems()
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  const testAllSystems = async () => {
    console.log('🧪 NFCViewTest: Avvio test completo')
    
    // Test 1: Supabase connessione
    try {
      const { data, error } = await supabase.from('customers').select('count').single()
      if (error) throw error
      setStatus(prev => ({ ...prev, supabase: '✅ Supabase OK' }))
    } catch (error) {
      console.error('❌ Supabase error:', error)
      setStatus(prev => ({ ...prev, supabase: `❌ Supabase: ${error.message}` }))
    }

    // Test 2: Carica customers
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email')
        .limit(5)
      
      if (error) throw error
      setStatus(prev => ({ 
        ...prev, 
        customers: `✅ Customers: ${data?.length || 0} trovati` 
      }))
    } catch (error) {
      console.error('❌ Customers error:', error)
      setStatus(prev => ({ ...prev, customers: `❌ Customers: ${error.message}` }))
    }

    // Test 3: Carica tags
    try {
      const { data, error } = await supabase
        .from('nfc_tags')
        .select('*')
        .limit(10)
      
      if (error) throw error
      setStatus(prev => ({ 
        ...prev, 
        tags: `✅ Tags: ${data?.length || 0} trovati` 
      }))
    } catch (error) {
      console.error('❌ Tags error:', error)
      setStatus(prev => ({ ...prev, tags: `❌ Tags: ${error.message}` }))
    }

    // Test 4: Carica logs
    try {
      const { data, error } = await supabase
        .from('nfc_logs')
        .select('*')
        .limit(10)
      
      if (error) throw error
      setStatus(prev => ({ 
        ...prev, 
        logs: `✅ Logs: ${data?.length || 0} trovati` 
      }))
    } catch (error) {
      console.error('❌ Logs error:', error)
      setStatus(prev => ({ ...prev, logs: `❌ Logs: ${error.message}` }))
    }

    // Test 5: Server HTTP
    try {
      const response = await fetch('http://192.168.1.6:3001/status')
      const data = await response.json()
      setStatus(prev => ({ 
        ...prev, 
        server: `✅ Server: ${data.reader || 'OK'}` 
      }))
    } catch (error) {
      console.error('❌ Server error:', error)
      setStatus(prev => ({ ...prev, server: `❌ Server: ${error.message}` }))
    }

    // Test 6: WebSocket
    try {
      const ws = new WebSocket('ws://192.168.1.6:3001')
      wsRef.current = ws
      
      ws.onopen = () => {
        console.log('✅ WebSocket connesso')
        setStatus(prev => ({ ...prev, websocket: '✅ WebSocket: Connesso' }))
      }
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
        setStatus(prev => ({ ...prev, websocket: '❌ WebSocket: Errore connessione' }))
      }
      
      ws.onclose = () => {
        console.log('🔌 WebSocket chiuso')
      }
      
    } catch (error) {
      console.error('❌ WebSocket error:', error)
      setStatus(prev => ({ ...prev, websocket: `❌ WebSocket: ${error.message}` }))
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>🧪 Test Diagnostico NFCView</h2>
      
      <div style={{ 
        background: '#f0f0f0', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3>Status Sistemi:</h3>
        {Object.entries(status).map(([key, value]) => (
          <div key={key} style={{ margin: '8px 0' }}>
            <strong>{key}:</strong> {value}
          </div>
        ))}
      </div>

      <button 
        onClick={testAllSystems}
        style={{
          padding: '10px 20px',
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        🔄 Ripeti Test
      </button>

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        Questo componente testa tutti i sistemi necessari per NFCView.
        Controlla la console del browser per log dettagliati.
      </div>
    </div>
  )
}

export default NFCViewTest
