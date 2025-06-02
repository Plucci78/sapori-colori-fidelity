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
    // Check se NFC è supportato
    if ('NDEFReader' in window) {
      showNotification('📱 NFC supportato! Puoi usare la modalità reale', 'info')
    } else {
      showNotification('🎮 NFC non supportato. Usa la modalità DEMO', 'warning')
    }
    
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

  // Controlla supporto NFC
  const checkNFCSupport = () => {
    if (!('NDEFReader' in window)) {
      showNotification('❌ NFC non supportato su questo browser/dispositivo', 'error')
      return false
    }
    return true
  }

  // Simula lettura NFC (DEMO MODE)
  const simulateNFCRead = () => {
    const tagId = 'NFC' + Date.now()
    setLastReadTag({ id: tagId, time: new Date() })
    
    // Salva log
    saveLog(tagId, 'read')
    
    showNotification(`🎮 Tag simulato: ${tagId}`, 'success')
  }

  // Avvia simulazione DEMO
  const startDemoReading = () => {
    setIsReading(true)
    setTimeout(() => {
      simulateNFCRead()
      setIsReading(false)
    }, 2000)
  }

  // Lettura NFC REALE
  const startRealNFCReading = async () => {
    // Check supporto
    if (!checkNFCSupport()) {
      setIsDemoMode(true) // Forza modalità demo se non supportato
      return
    }
    
    // Check HTTPS
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      showNotification('❌ NFC richiede HTTPS! Usa la modalità DEMO per testare.', 'error')
      return
    }
    
    setIsReading(true)
    
    try {
      const ndef = new NDEFReader()
      
      // Richiede permessi e inizia scansione
      await ndef.scan()
      
      showNotification('📱 Avvicina il tag NFC al telefono...', 'info')
      
      // Vibrazione feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(100)
      }
      
      // Listener per lettura tag
      ndef.addEventListener("reading", ({ message, serialNumber }) => {
        console.log('Tag letto:', serialNumber)
        
        // Vibrazione successo
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100])
        }
        
        // Rimuovi i : dal serial number
        const tagId = serialNumber.replace(/:/g, '').toUpperCase()
        
        setLastReadTag({ 
          id: tagId, 
          time: new Date() 
        })
        
        setIsReading(false)
        
        // Salva log
        saveLog(tagId, 'read')
        
        showNotification(`✅ Tag NFC letto: ${tagId}`, 'success')
      })
      
      // Listener per errori
      ndef.addEventListener("readingerror", () => {
        showNotification('❌ Errore nella lettura del tag', 'error')
        setIsReading(false)
      })
      
    } catch (error) {
      setIsReading(false)
      
      if (error.name === 'NotAllowedError') {
        showNotification('❌ Permesso NFC negato! Abilita NFC nelle impostazioni del browser.', 'error')
      } else if (error.name === 'NotSupportedError') {
        showNotification('❌ NFC non supportato su questo dispositivo', 'error')
        setIsDemoMode(true)
      } else {
        showNotification(`❌ Errore: ${error.message}`, 'error')
      }
    }
  }

  // Salva log nel database
  const saveLog = async (tagId, action) => {
    try {
      await supabase
        .from('nfc_logs')
        .insert([{
          tag_id: tagId,
          action_type: action,
          is_demo: isDemoMode,
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
          is_demo: isDemoMode,
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
        <div className={`nfc-status-card ${isDemoMode ? 'demo' : 'supported'}`}>
          <div className="status-icon">{isDemoMode ? '🎮' : '📱'}</div>
          <div className="status-content">
            <h3>{isDemoMode ? 'Modalità DEMO Attiva' : 'NFC Reale Attivo'}</h3>
            <p>{isDemoMode ? 'Simulazione completa delle funzionalità NFC' : 'Lettura tag NFC reali abilitata'}</p>
          </div>
        </div>
      </div>

      {/* Lettore */}
      <div className="nfc-reader-section">
        <h3>📡 Lettore NFC</h3>
        
        {/* Toggle Modalità */}
        <div className="mode-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={!isDemoMode}
              onChange={(e) => setIsDemoMode(!e.target.checked)}
              disabled={!('NDEFReader' in window)}
            />
            <span className="toggle-slider"></span>
            <span className="toggle-text">
              {isDemoMode ? '🎮 Modalità DEMO' : '📱 NFC Reale'}
            </span>
          </label>
        </div>
        
        <div className="nfc-reader-controls">
          {isDemoMode ? (
            <button 
              onClick={startDemoReading}
              className={`btn-nfc-read ${isReading ? 'reading' : ''}`}
              disabled={isReading}
            >
              {isReading ? '🔄 Simulazione in corso...' : '🎮 Simula Lettura NFC'}
            </button>
          ) : (
            <button 
              onClick={startRealNFCReading}
              className={`btn-nfc-read ${isReading ? 'reading' : ''}`}
              disabled={isReading}
            >
              {isReading ? '📡 Scansione NFC attiva...' : '📱 Avvia Lettura NFC'}
            </button>
          )}
          
          {lastReadTag && (
            <div className="last-read-tag">
              <h4>🏷️ Ultimo Tag Letto {isDemoMode ? '(SIMULATO)' : ''}:</h4>
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
                    {tag.is_demo && <span className="demo-badge">🎮 DEMO</span>}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="empty-state">
            <p>Nessun tag NFC associato</p>
            <p>💡 {isDemoMode ? 'Usa il simulatore per testare!' : 'Leggi un tag NFC per iniziare!'}</p>
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
                  {log.is_demo && <span className="demo-badge">🎮 DEMO</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>Nessuna attività registrata</p>
            <p>💡 {isDemoMode ? 'Prova il simulatore!' : 'Leggi un tag per iniziare!'}</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .mode-toggle {
          margin: 20px 0;
          display: flex;
          justify-content: center;
        }

        .toggle-label {
          display: flex;
          align-items: center;
          cursor: pointer;
          gap: 10px;
        }

        .toggle-slider {
          width: 50px;
          height: 25px;
          background: #ccc;
          border-radius: 25px;
          position: relative;
          transition: 0.3s;
        }

        .toggle-slider::after {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          top: 2.5px;
          left: 2.5px;
          transition: 0.3s;
        }

        input[type="checkbox"]:checked + .toggle-slider {
          background: #dc2626;
        }

        input[type="checkbox"]:checked + .toggle-slider::after {
          transform: translateX(25px);
        }

        input[type="checkbox"] {
          display: none;
        }

        input[type="checkbox"]:disabled + .toggle-slider {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .toggle-text {
          font-weight: 600;
          color: #333;
        }

        .nfc-status-card.demo {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
        }

        .btn-nfc-read.reading {
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  )
})

NFCView.displayName = 'NFCView'

export default NFCView