import { useState, useEffect, memo } from 'react'
import { supabase } from '../../supabase'

const NFCView = memo(({ showNotification }) => {
  const [isDemoMode, setIsDemoMode] = useState(true)
  const [isReading, setIsReading] = useState(false)
  const [nfcTags, setNfcTags] = useState([])
  const [customers, setCustomers] = useState([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [tagName, setTagName] = useState('')
  const [lastReadTag, setLastReadTag] = useState(null)
  const [nfcLogs, setNfcLogs] = useState([])

  // Carica dati all'avvio
  useEffect(() => {
    showNotification('🎮 Modalità DEMO NFC attivata', 'info')
    loadCustomers()
    loadNFCTags()
    loadNFCLogs()
  }, [])

  // Carica clienti
  const loadCustomers = async () => {
    try {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .order('name')

      if (data) {
        setCustomers(data)
      }
    } catch (error) {
      console.error('Errore caricamento clienti:', error)
    }
  }

  // Carica tag NFC
  const loadNFCTags = async () => {
    try {
      const { data } = await supabase
        .from('nfc_tags')
        .select('*')
        .eq('is_active', true)

      if (data) {
        setNfcTags(data)
      }
    } catch (error) {
      console.error('Errore caricamento tag:', error)
    }
  }

  // Carica log NFC
  const loadNFCLogs = async () => {
    try {
      const { data } = await supabase
        .from('nfc_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (data) {
        setNfcLogs(data)
      }
    } catch (error) {
      console.error('Errore caricamento log:', error)
    }
  }

  // Simula lettura NFC
  const simulateNFCRead = () => {
    const tagId = 'NFC' + Date.now()
    setLastReadTag({ id: tagId, time: new Date() })
    
    // Salva log
    saveLog(tagId, 'read')
    
    showNotification(`🎮 Tag simulato: ${tagId}`, 'success')
  }

  // Avvia simulazione
  const startReading = () => {
    setIsReading(true)
    setTimeout(() => {
      simulateNFCRead()
      setIsReading(false)
    }, 2000)
  }

  // Salva log nel database
  const saveLog = async (tagId, action) => {
    try {
      await supabase
        .from('nfc_logs')
        .insert([{
          tag_id: tagId,
          action_type: action,
          created_at: new Date().toISOString()
        }])
      
      loadNFCLogs() // Ricarica i log
    } catch (error) {
      console.error('Errore salvataggio log:', error)
    }
  }

  // Associa tag a cliente
  const associateTag = async () => {
    if (!lastReadTag || !selectedCustomerId) {
      showNotification('Seleziona un cliente prima!', 'error')
      return
    }

    const selectedCustomer = customers.find(c => c.id === parseInt(selectedCustomerId))
    if (!selectedCustomer) return

    try {
      await supabase
        .from('nfc_tags')
        .insert([{
          tag_id: lastReadTag.id,
          customer_id: selectedCustomer.id,
          tag_name: tagName || `Tag ${selectedCustomer.name}`,
          is_active: true,
          created_at: new Date().toISOString()
        }])

      showNotification(`✅ Tag associato a ${selectedCustomer.name}!`, 'success')
      
      // Reset form
      setLastReadTag(null)
      setSelectedCustomerId('')
      setTagName('')
      
      // Ricarica dati
      loadNFCTags()
      saveLog(lastReadTag.id, 'registration')
      
    } catch (error) {
      console.error('Errore associazione:', error)
      showNotification('Errore nell\'associazione', 'error')
    }
  }

  return (
    <div className="nfc-container">
      <div className="nfc-header">
        <h1>📱 Gestione NFC</h1>
        <p>Sistema di identificazione e transazioni veloci con tag NFC</p>
      </div>

      {/* Status */}
      <div className="nfc-status-section">
        <div className="nfc-status-card supported">
          <div className="status-icon">🎮</div>
          <div className="status-content">
            <h3>Modalità DEMO Attiva</h3>
            <p>Simulazione completa delle funzionalità NFC</p>
          </div>
        </div>
      </div>

      {/* Lettore */}
      <div className="nfc-reader-section">
        <h3>📡 Lettore NFC (DEMO)</h3>
        <div className="nfc-reader-controls">
          <button 
            onClick={startReading}
            className={`btn-nfc-read ${isReading ? 'reading' : ''}`}
            disabled={isReading}
          >
            {isReading ? '🔄 Lettura in corso...' : '🎮 Simula Lettura NFC'}
          </button>
          
          {lastReadTag && (
            <div className="last-read-tag">
              <h4>🏷️ Ultimo Tag Letto (SIMULATO):</h4>
              <p><strong>ID:</strong> {lastReadTag.id}</p>
              <p><strong>Ora:</strong> {lastReadTag.time.toLocaleTimeString()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Associazione */}
      {lastReadTag && (
        <div className="tag-association-section">
          <h3>🔗 Associa Tag a Cliente</h3>
          <div className="association-form">
            <input
              type="text"
              placeholder="Nome tag (opzionale)"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              className="tag-name-input"
            />
            
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="customer-select"
            >
              <option value="">Seleziona Cliente</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.phone}
                </option>
              ))}
            </select>
            
            <button onClick={associateTag} className="btn-primary">
              🔗 Associa Tag
            </button>
          </div>
        </div>
      )}

      {/* Tag Associati */}
      <div className="nfc-tags-section">
        <h3>🏷️ Tag NFC Associati ({nfcTags.length})</h3>
        {nfcTags.length > 0 ? (
          <div className="nfc-tags-grid">
            {nfcTags.map(tag => {
              const customer = customers.find(c => c.id === tag.customer_id)
              return (
                <div key={tag.id} className="nfc-tag-card">
                  <div className="tag-info">
                    <h4>{tag.tag_name}</h4>
                    <p><strong>Tag ID:</strong> {tag.tag_id}</p>
                    <p><strong>Cliente:</strong> {customer?.name || 'N/A'}</p>
                    <p><strong>Telefono:</strong> {customer?.phone || 'N/A'}</p>
                    <div className="customer-points">
                      <span className="gemma-icon-small"></span>
                      {customer?.points || 0} GEMME
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="empty-state">
            <p>Nessun tag NFC associato</p>
            <p>💡 Usa il simulatore per testare!</p>
          </div>
        )}
      </div>

      {/* Log Attività */}
      <div className="nfc-logs-section">
        <h3>📋 Log Attività NFC ({nfcLogs.length})</h3>
        {nfcLogs.length > 0 ? (
          <div className="nfc-logs-list">
            {nfcLogs.map(log => (
              <div key={log.id} className="nfc-log-item">
                <div className="log-info">
                  <span className="log-action">{log.action_type}</span>
                  <span className="log-tag">Tag: {log.tag_id}</span>
                  <span className="log-time">{new Date(log.created_at).toLocaleString()}</span>
                  <span className="demo-badge">🎮 DEMO</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>Nessuna attività registrata</p>
            <p>💡 Prova il simulatore!</p>
          </div>
        )}
      </div>
    </div>
  )
})

NFCView.displayName = 'NFCView'

export default NFCView