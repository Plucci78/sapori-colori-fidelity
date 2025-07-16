import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase'
import nfcService from '../../services/nfcService'

const NFCViewSimple = ({ showNotification }) => {
  const [customers, setCustomers] = useState([])
  const [nfcTags, setNfcTags] = useState([])
  const [nfcLogs, setNfcLogs] = useState([])
  const [serverStatus, setServerStatus] = useState('connecting')
  const [readerStatus, setReaderStatus] = useState('disconnected')
  const [isReading, setIsReading] = useState(false)
  const [lastReadTag, setLastReadTag] = useState(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  
  const isMounted = useRef(true)

  useEffect(() => {
    return () => { isMounted.current = false }
  }, [])

  // Carica dati dal database
  const loadData = async () => {
    try {
      // Carica clienti
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name, phone, email, points')
        .order('name')

      if (customersError) throw customersError
      if (isMounted.current) {
        setCustomers(customersData || [])
        console.log('✅ Clienti caricati:', customersData?.length)
      }

      // Carica tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('nfc_tags')
        .select('*')
        .order('created_at', { ascending: false })

      if (tagsError) throw tagsError
      if (isMounted.current) {
        setNfcTags(tagsData || [])
        console.log('✅ Tag caricati:', tagsData?.length)
      }

      // Carica logs
      const { data: logsData, error: logsError } = await supabase
        .from('nfc_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (logsError) throw logsError
      if (isMounted.current) {
        setNfcLogs(logsData || [])
        console.log('✅ Log caricati:', logsData?.length)
      }

    } catch (error) {
      console.error('❌ Errore caricamento dati:', error)
      showNotification('Errore caricamento dati', 'error')
    }
  }

  // Inizializza NFC service
  useEffect(() => {
    console.log('🔧 Inizializzazione NFCView Simple...')
    
    // Setup listeners
    const unsubConnected = nfcService.on('connected', () => {
      if (isMounted.current) {
        setServerStatus('connected')
        showNotification('✅ Connesso al server NFC', 'success')
      }
    })

    const unsubReaderConnected = nfcService.on('readerConnected', (data) => {
      if (isMounted.current) {
        setReaderStatus('connected')
        showNotification(`📟 Lettore ${data.name || 'NFC'} connesso`, 'success')
      }
    })

    const unsubCardDetected = nfcService.on('cardDetected', (data) => {
      if (isMounted.current && isReading) {
        setLastReadTag({
          id: data.uid,
          type: data.type || 'Unknown',
          time: new Date()
        })
        setIsReading(false)
        showNotification(`🎯 Tag letto: ${data.uid}`, 'success')
      }
    })

    // Carica dati iniziali
    loadData()

    // Connetti al service
    setTimeout(async () => {
      try {
        await nfcService.connect()
        console.log('✅ NFCService connesso')
      } catch (error) {
        console.log('⚠️ NFCService offline, modalità limitata')
        if (isMounted.current) {
          setServerStatus('offline')
        }
      }
    }, 1000)

    // Cleanup
    return () => {
      unsubConnected()
      unsubReaderConnected()
      unsubCardDetected()
    }
  }, [])

  // Avvia lettura
  const startReading = async () => {
    if (serverStatus !== 'connected') {
      showNotification('❌ Server NFC non connesso', 'error')
      return
    }

    try {
      setIsReading(true)
      showNotification('📟 Avvicinare il tag al lettore...', 'info')
      await nfcService.startScan()
    } catch (error) {
      setIsReading(false)
      showNotification(`❌ ${error.message}`, 'error')
    }
  }

  // Ferma lettura
  const stopReading = async () => {
    try {
      await nfcService.stopScan()
      setIsReading(false)
      showNotification('⏹️ Lettura fermata', 'info')
    } catch (error) {
      console.error('Errore stop:', error)
    }
  }

  // Associa tag
  const associateTag = async () => {
    if (!lastReadTag || !selectedCustomerId) {
      showNotification('Seleziona un cliente e leggi un tag!', 'error')
      return
    }

    try {
      const { error } = await supabase
        .from('nfc_tags')
        .insert([{
          tag_id: lastReadTag.id,
          customer_id: selectedCustomerId,
          created_at: new Date().toISOString()
        }])

      if (error) throw error
      
      showNotification('✅ Tag associato con successo!', 'success')
      setLastReadTag(null)
      setSelectedCustomerId('')
      loadData() // Ricarica i dati
      
    } catch (error) {
      console.error('Errore associazione:', error)
      showNotification('❌ Errore associazione tag', 'error')
    }
  }

  const getStatusColor = () => {
    if (serverStatus === 'connected' && readerStatus === 'connected') return 'green'
    if (serverStatus === 'connected') return 'orange'
    return 'red'
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>📟 Gestione NFC - Versione Semplice</h2>
      
      {/* Status */}
      <div style={{ 
        background: '#f8f9fa', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '20px',
        border: `3px solid ${getStatusColor()}`
      }}>
        <h3>📊 Status Sistema</h3>
        <div>🖥️ Server: <strong>{serverStatus}</strong></div>
        <div>📟 Lettore: <strong>{readerStatus}</strong></div>
        <div>📋 Clienti: <strong>{customers.length}</strong></div>
        <div>🏷️ Tag: <strong>{nfcTags.length}</strong></div>
        <div>📝 Log: <strong>{nfcLogs.length}</strong></div>
      </div>

      {/* Controlli lettura */}
      <div style={{ marginBottom: '20px' }}>
        <h3>🎯 Lettura Tag</h3>
        <button 
          onClick={isReading ? stopReading : startReading}
          disabled={serverStatus !== 'connected'}
          style={{
            padding: '10px 20px',
            background: isReading ? '#dc3545' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          {isReading ? '⏹️ Ferma Lettura' : '▶️ Avvia Lettura'}
        </button>

        {lastReadTag && (
          <div style={{ marginTop: '10px', padding: '10px', background: '#e7f3ff', borderRadius: '4px' }}>
            <strong>🎯 Ultimo tag:</strong> {lastReadTag.id} ({lastReadTag.type})
          </div>
        )}
      </div>

      {/* Associazione */}
      {lastReadTag && (
        <div style={{ marginBottom: '20px' }}>
          <h3>🔗 Associa Tag</h3>
          <select 
            value={selectedCustomerId} 
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            style={{ padding: '5px', marginRight: '10px' }}
          >
            <option value="">Seleziona cliente...</option>
            {customers.map(customer => (
              <option key={customer.id} value={customer.id}>
                {customer.name} ({customer.email})
              </option>
            ))}
          </select>
          <button 
            onClick={associateTag}
            disabled={!selectedCustomerId}
            style={{
              padding: '8px 16px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ✅ Associa Tag
          </button>
        </div>
      )}

      {/* Lista tag esistenti */}
      <div style={{ marginBottom: '20px' }}>
        <h3>🏷️ Tag Associati ({nfcTags.length})</h3>
        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
          {nfcTags.map(tag => (
            <div key={tag.id} style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
              <strong>{tag.tag_id}</strong> → Cliente: {tag.customer_id}
            </div>
          ))}
        </div>
      </div>

      {/* Log recenti */}
      <div>
        <h3>📝 Log Recenti ({nfcLogs.length})</h3>
        <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
          {nfcLogs.map(log => (
            <div key={log.id} style={{ padding: '6px', borderBottom: '1px solid #eee', fontSize: '12px' }}>
              {new Date(log.created_at).toLocaleString()} - {log.tag_id} ({log.action_type})
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default NFCViewSimple
