// Debug component per NFCView
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import nfcService from '../../services/nfcService'

const NFCViewDebug = () => {
  const [debugInfo, setDebugInfo] = useState([])
  const [nfcTags, setNfcTags] = useState([])
  const [customers, setCustomers] = useState([])
  const [nfcLogs, setNfcLogs] = useState([])

  const addDebug = (message) => {
    console.log('🐛 DEBUG:', message)
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    addDebug('NFCViewDebug montato')
    
    // Test caricamento dati
    const loadData = async () => {
      try {
        addDebug('Inizio caricamento dati...')
        
        // Test clienti
        addDebug('Caricamento clienti...')
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('id, name, phone, email, points')
          .order('name')

        if (customersError) {
          addDebug(`❌ Errore clienti: ${customersError.message}`)
          return
        }
        
        setCustomers(customersData || [])
        addDebug(`✅ Clienti caricati: ${customersData?.length || 0}`)

        // Test tag NFC
        addDebug('Caricamento tag NFC...')
        const { data: tagsData, error: tagsError } = await supabase
          .from('nfc_tags')
          .select('*')
          .order('created_at', { ascending: false })

        if (tagsError) {
          addDebug(`❌ Errore tag: ${tagsError.message}`)
          return
        }

        const activeTags = tagsData?.filter(tag => tag.is_active !== false) || []
        setNfcTags(activeTags)
        addDebug(`✅ Tag NFC caricati: ${tagsData?.length || 0} (attivi: ${activeTags.length})`)

        // Test log NFC
        addDebug('Caricamento log NFC...')
        const { data: logsData, error: logsError } = await supabase
          .from('nfc_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20)

        if (logsError) {
          addDebug(`❌ Errore log: ${logsError.message}`)
          return
        }

        setNfcLogs(logsData || [])
        addDebug(`✅ Log NFC caricati: ${logsData?.length || 0}`)

        addDebug('✅ Tutti i dati caricati con successo!')

      } catch (error) {
        addDebug(`❌ Errore generale: ${error.message}`)
      }
    }

    loadData()

    // Test connessione NFC
    const testNFC = async () => {
      try {
        addDebug('Test connessione NFC...')
        
        // Test HTTP
        const response = await fetch('http://192.168.1.6:3001/api/status')
        if (response.ok) {
          const data = await response.json()
          addDebug(`✅ Server HTTP OK: lettore ${data.data.readerConnected ? 'connesso' : 'disconnesso'}`)
        } else {
          addDebug(`❌ Server HTTP errore: ${response.status}`)
        }

        // Test WebSocket
        addDebug('Test WebSocket...')
        await nfcService.connect()
        addDebug('✅ WebSocket connesso')
        
      } catch (error) {
        addDebug(`❌ Errore NFC: ${error.message}`)
      }
    }

    setTimeout(testNFC, 2000) // Test NFC dopo 2 secondi

  }, [])

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">🐛 Debug NFCView</h1>
      </div>

      <div className="dashboard-section">
        <div className="card">
          <div className="card-header">
            <h3>Log Debug</h3>
          </div>
          <div className="card-content">
            <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '12px' }}>
              {debugInfo.map((info, index) => (
                <div key={index} style={{ marginBottom: '4px' }}>
                  {info}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-section">
        <div className="card">
          <div className="card-header">
            <h3>Stato Dati</h3>
          </div>
          <div className="card-content">
            <p>👥 Clienti: {customers.length}</p>
            <p>📟 Tag NFC: {nfcTags.length}</p>
            <p>📋 Log: {nfcLogs.length}</p>
          </div>
        </div>
      </div>

      {nfcTags.length > 0 && (
        <div className="dashboard-section">
          <div className="card">
            <div className="card-header">
              <h3>Tag NFC (Prime 3)</h3>
            </div>
            <div className="card-content">
              {nfcTags.slice(0, 3).map(tag => (
                <div key={tag.id} style={{ marginBottom: '8px', padding: '8px', border: '1px solid #ccc' }}>
                  <strong>{tag.tag_name || 'Senza nome'}</strong><br />
                  ID: {tag.tag_id}<br />
                  Cliente: {tag.customer_id}<br />
                  Attivo: {tag.is_active ? 'Sì' : 'No'}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NFCViewDebug
