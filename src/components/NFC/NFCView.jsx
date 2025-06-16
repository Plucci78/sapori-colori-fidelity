import { useState, useEffect, memo } from 'react'
import { supabase } from '../../supabase'
import TabletNFCReader from './TabletNFCReader'

const NFCView = memo(({ showNotification }) => {
  const [isDemoMode, setIsDemoMode] = useState(true)
  const [isReading, setIsReading] = useState(false)
  const [nfcTags, setNfcTags] = useState([])
  const [customers, setCustomers] = useState([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [tagName, setTagName] = useState('')
  const [lastReadTag, setLastReadTag] = useState(null)
  const [nfcLogs, setNfcLogs] = useState([])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [existingTag, setExistingTag] = useState(null)
  const [deviceType, setDeviceType] = useState('unknown') // 'mobile', 'tablet', 'desktop'

  // Rileva tipo dispositivo con debug e override
  const detectDeviceType = () => {
    // Check for manual override
    const urlParams = new URLSearchParams(window.location.search)
    const forceDevice = urlParams.get('device')
    if (forceDevice === 'tablet') {
      console.log('🔧 MODALITÀ TABLET FORZATA VIA URL')
      return 'tablet'
    }
    
    const hasTouch = 'ontouchstart' in window
    const screenWidth = window.screen.width
    const screenHeight = window.screen.height
    const windowWidth = window.innerWidth
    
    // Debug info
    console.log('🔍 Device Detection Debug:', {
      hasTouch,
      screenWidth,
      screenHeight,
      windowWidth,
      userAgent: navigator.userAgent.substring(0, 100),
      platform: navigator.platform
    })
    
    // Rilevamento SPECIFICO per Lenovo Tab M11 e altri tablet
    const userAgent = navigator.userAgent.toLowerCase()
    const isAndroidTablet = userAgent.includes('android') && !userAgent.includes('mobile')
    const isLenovoTablet = userAgent.includes('lenovo')
    const isTabM11 = userAgent.includes('lenovo') && userAgent.includes('tab')
    
    // FORZATURA SPECIFICA PER LENOVO TAB M11
    if (isTabM11 || isLenovoTablet) {
      console.log('✅ LENOVO TAB M11 RICONOSCIUTO! Modalità tablet attivata')
      return 'tablet'
    }
    
    // Rileva tablet anche per schermi grandi (fino a 1920px per Tab M11)
    if (hasTouch && screenWidth >= 768 && screenWidth <= 1920) {
      console.log('✅ Rilevato: TABLET (schermo grande compatibile)')
      return 'tablet'
    } 
    
    // Android tablet senza "mobile" nel user agent
    if (isAndroidTablet) {
      console.log('✅ Rilevato: TABLET (Android tablet)')
      return 'tablet'
    }
    
    if (hasTouch && screenWidth < 768) {
      console.log('✅ Rilevato: MOBILE')
      return 'mobile'  
    } else {
      console.log('✅ Rilevato: DESKTOP')
      return 'desktop'
    }
  }

  // Carica dati all'avvio
  useEffect(() => {
    const detected = detectDeviceType()
    setDeviceType(detected)
    
    if (detected === 'tablet') {
      showNotification('🖥️ Modalità Tablet rilevata - Lettore NFC Tool Pro disponibile', 'info')
    } else if ('NDEFReader' in window) {
      showNotification('NFC supportato! Puoi usare la modalità produzione', 'info')
    } else {
      showNotification('NFC non supportato su questo browser. Usa la modalità test o prova su tablet', 'warning')
    }
    
    loadCustomers()
    loadNFCTags()
    loadNFCLogs()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Gestisce cliente trovato dal lettore tablet
  const handleCustomerFound = (customer) => {
    showNotification(`Cliente selezionato: ${customer.name}`, 'success')
    // Qui puoi aggiungere logica per aprire il pannello cliente
    // o navigare verso CustomerView con i dati del cliente
  }

  // Carica clienti - CORRETTO
  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, email, points')
        .order('name')

      if (error) {
        console.error('Errore Supabase customers:', error)
        showNotification(`Errore caricamento clienti: ${error.message}`, 'error')
        return
      }

      if (data) {
        setCustomers(data)
        console.log('✅ Clienti caricati:', data.length)
      }
    } catch (error) {
      console.error('Errore generale customers:', error)
      showNotification('Errore di rete nel caricamento clienti', 'error')
    }
  }

  // Carica tag NFC - CORRETTO
  const loadNFCTags = async () => {
    try {
      const { data, error } = await supabase
        .from('nfc_tags')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Errore Supabase nfc_tags:', error)
        showNotification(`Errore caricamento tag: ${error.message}`, 'error')
        return
      }

      if (data) {
        const activeTags = data.filter(tag => tag.is_active !== false)
        setNfcTags(activeTags)
        console.log('✅ Tag NFC caricati:', activeTags.length)
      }
    } catch (error) {
      console.error('Errore generale nfc_tags:', error)
      showNotification('Errore di rete nel caricamento tag', 'error')
    }
  }

  // Carica log NFC - CORRETTO  
  const loadNFCLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('nfc_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Errore Supabase nfc_logs:', error)
        showNotification(`Errore caricamento log: ${error.message}`, 'error')
        return
      }

      if (data) {
        setNfcLogs(data)
        console.log('✅ Log NFC caricati:', data.length)
      }
    } catch (error) {
      console.error('Errore generale nfc_logs:', error)
      showNotification('Errore di rete nel caricamento log', 'error')
    }
  }

  // Controlla supporto NFC
  const checkNFCSupport = () => {
    if (!('NDEFReader' in window)) {
      showNotification('NFC non supportato su questo browser/dispositivo', 'error')
      return false
    }
    return true
  }

  // Simula lettura NFC (DEMO MODE)
  const simulateNFCRead = () => {
    const tagId = 'NFC' + Date.now()
    setLastReadTag({ id: tagId, time: new Date() })
    
    saveLog(tagId, 'read_demo')
    showNotification(`Tag simulato: ${tagId}`, 'success')
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
    if (!checkNFCSupport()) {
      setIsDemoMode(true)
      return
    }
    
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      showNotification('NFC richiede HTTPS. Usa modalità test per sviluppo.', 'warning')
      return
    }
    
    setIsReading(true)
    
    try {
      const ndef = new window.NDEFReader()
      await ndef.scan()
      
      showNotification('Avvicina il tag NFC al telefono...', 'info')
      
      if ('vibrate' in navigator) {
        navigator.vibrate(100)
      }
      
      ndef.addEventListener("reading", ({ serialNumber }) => {
        console.log('Tag letto:', serialNumber)
        
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100])
        }
        
        const tagId = serialNumber.replace(/:/g, '').toUpperCase()
        
        setLastReadTag({ 
          id: tagId, 
          time: new Date() 
        })
        
        setIsReading(false)
        saveLog(tagId, 'read_real')
        showNotification(`Tag NFC letto: ${tagId}`, 'success')
      })
      
      ndef.addEventListener("readingerror", () => {
        showNotification('Errore nella lettura del tag', 'error')
        setIsReading(false)
      })
      
    } catch (error) {
      setIsReading(false)
      
      if (error.name === 'NotAllowedError') {
        showNotification('Permesso NFC negato! Abilita NFC nelle impostazioni del browser.', 'error')
      } else if (error.name === 'NotSupportedError') {
        showNotification('NFC non supportato su questo dispositivo', 'error')
        setIsDemoMode(true)
      } else {
        showNotification(`Errore: ${error.message}`, 'error')
      }
    }
  }

  // Salva log nel database - CORRETTO
  const saveLog = async (tagId, action) => {
    try {
      const { data, error } = await supabase
        .from('nfc_logs')
        .insert([{
          tag_id: tagId,
          action_type: action,
          device_info: isDemoMode ? 'test_mode' : navigator.userAgent.substring(0, 100),
          created_at: new Date().toISOString()
        }])

      if (error) {
        console.error('Errore salvataggio log:', error)
        showNotification(`Errore log: ${error.message}`, 'warning')
        return
      }
      
      console.log('✅ Log salvato:', data)
      loadNFCLogs()
    } catch (error) {
      console.error('Errore generale log:', error)
    }
  }

  // Associa tag a cliente - CORRETTO CON CONTROLLO RIASSOCIAZIONE
  const associateTag = async () => {
    if (!lastReadTag || !selectedCustomerId) {
      showNotification('Seleziona un cliente e leggi un tag prima!', 'error')
      return
    }

    console.log('🔍 Selected ID raw:', selectedCustomerId, typeof selectedCustomerId)
    
    const selectedCustomer = customers.find(c => String(c.id) === String(selectedCustomerId))
    
    console.log('🔍 Debug associazione:', {
      selectedCustomerId,
      customerFound: !!selectedCustomer,
      availableIds: customers.map(c => c.id),
      customerName: selectedCustomer?.name
    })
    
    if (!selectedCustomer) {
      showNotification(`Cliente non trovato! Ricarica la pagina e riprova.`, 'error')
      console.error('❌ Cliente non trovato tra:', customers.map(c => ({id: c.id, name: c.name})))
      return
    }

    const existingTagAssociation = nfcTags.find(tag => tag.tag_id === lastReadTag.id)
    
    if (existingTagAssociation) {
      const existingCustomer = customers.find(c => String(c.id) === String(existingTagAssociation.customer_id))
      
      if (existingCustomer && String(existingCustomer.id) !== String(selectedCustomer.id)) {
        setExistingTag({
          tag: existingTagAssociation,
          oldCustomer: existingCustomer,
          newCustomer: selectedCustomer
        })
        setShowConfirmDialog(true)
        return
      }
    }

    await performAssociation(selectedCustomer, existingTagAssociation ? 'riassociazione' : 'nuova')
  }

  // NUOVA: Funzione per eseguire l'associazione
  const performAssociation = async (selectedCustomer, actionType = 'nuova') => {
    try {
      const { data, error } = await supabase
        .from('nfc_tags')
        .upsert([{
          tag_id: lastReadTag.id,
          customer_id: selectedCustomer.id,
          tag_name: tagName || `Tag ${selectedCustomer.name}`,
          is_active: true,
          notes: isDemoMode ? 'Creato in modalità test' : 'Tag NFC reale',
          created_at: new Date().toISOString()
        }], {
          onConflict: 'tag_id',
          ignoreDuplicates: false
        })

      if (error) {
        console.error('Errore associazione:', error)
        showNotification(`Errore associazione: ${error.message}`, 'error')
        return
      }

      const message = actionType === 'riassociazione' 
        ? `🔄 Tag riassociato a ${selectedCustomer.name}!`
        : `✅ Tag associato a ${selectedCustomer.name}!`
      
      showNotification(message, 'success')
      
      setLastReadTag(null)
      setSelectedCustomerId('')
      setTagName('')
      setShowConfirmDialog(false)
      setExistingTag(null)
      
      loadNFCTags()
      saveLog(lastReadTag.id, actionType === 'riassociazione' ? 'reassociation' : 'registration')
      
      console.log('✅ Associazione completata:', data)
      
    } catch (error) {
      console.error('Errore generale associazione:', error)
      showNotification('Errore di rete nell\'associazione', 'error')
    }
  }

  // NUOVA: Disassocia tag
  const disassociateTag = async (tag) => {
    if (!window.confirm(`Vuoi disassociare il tag "${tag.tag_name}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('nfc_tags')
        .update({ 
          is_active: false,
          notes: (tag.notes || '') + ' [DISASSOCIATO]'
        })
        .eq('id', tag.id)

      if (error) {
        showNotification(`Errore disassociazione: ${error.message}`, 'error')
        return
      }

      showNotification(`🗑️ Tag "${tag.tag_name}" disassociato!`, 'success')
      loadNFCTags()
      saveLog(tag.tag_id, 'disassociation')

    } catch (error) {
      console.error('Errore disassociazione:', error)
      showNotification('Errore di rete nella disassociazione', 'error')
    }
  }

  return (
    <div className="dashboard-container">
      {/* Header Dashboard Style */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1 className="dashboard-title">
            <span className="title-icon">📱</span>
            Gestione NFC
          </h1>
          <p className="dashboard-subtitle">Sistema di identificazione e transazioni veloci con tag NFC</p>
          
          {/* Info Dispositivo - Sempre visibile per debug */}
          <div style={{
            margin: '10px 0',
            padding: '10px',
            background: deviceType === 'tablet' ? '#e8f5e8' : '#fff3cd',
            border: `2px solid ${deviceType === 'tablet' ? '#28a745' : '#ffc107'}`,
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>📱 DISPOSITIVO RILEVATO:</strong> <code style={{ 
                background: deviceType === 'tablet' ? '#d4edda' : '#ffeaa7',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 'bold'
              }}>{deviceType.toUpperCase()}</code>
              
              {deviceType !== 'tablet' && (
                <span style={{ color: '#856404', marginLeft: '10px' }}>
                  ⚠️ Per NFC Tool Pro serve modalità Tablet
                </span>
              )}
            </div>
            
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
              Screen: {window.screen.width}x{window.screen.height} | 
              Touch: {'ontouchstart' in window ? '✅' : '❌'} |
              Browser: {navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                       navigator.userAgent.includes('Safari') ? 'Safari' : 
                       navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Altri'}
            </div>

            <div style={{ marginTop: '8px' }}>
              <button 
                onClick={() => {
                  setDeviceType('tablet')
                  showNotification('🔧 Modalità tablet forzata!', 'info')
                }}
                style={{ 
                  marginRight: '8px', 
                  padding: '6px 12px', 
                  fontSize: '12px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                🔧 Forza Modalità Tablet
              </button>
              <button 
                onClick={() => {
                  const detected = detectDeviceType()
                  setDeviceType(detected)
                  showNotification(`🔍 Rilevamento automatico: ${detected}`, 'info')
                }}
                style={{ 
                  padding: '6px 12px', 
                  fontSize: '12px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                🔍 Rileva di Nuovo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lettore NFC Tablet - Mostrato solo in modalità tablet */}
      {deviceType === 'tablet' && (
        <div className="dashboard-section mb-4">
          <TabletNFCReader 
            onCustomerFound={handleCustomerFound}
            showNotification={showNotification}
          />
        </div>
      )}

      {/* Status Card Dashboard Style - REDESIGNED */}
      <div className="dashboard-section">
        <div className="nfc-status-card">
          <div className="status-card-header">
            <div className="status-title-section">
              <div className="status-icon-wrapper">
                {isDemoMode ? '🧪' : '🚀'}
              </div>
              <div className="status-title-content">
                <h3 className="status-main-title">Stato Sistema NFC</h3>
                <p className="status-subtitle">Monitoraggio in tempo reale del sistema</p>
              </div>
            </div>
            <div className="status-switch-wrapper">
              <div className="mode-toggle-container">
                <label className="modern-toggle">
                  <input
                    type="checkbox"
                    checked={!isDemoMode}
                    onChange={(e) => setIsDemoMode(!e.target.checked)}
                    disabled={!('NDEFReader' in window)}
                  />
                  <span className="toggle-slider"></span>
                  <span className="toggle-labels">
                    <span className="label-test">TEST</span>
                    <span className="label-prod">PROD</span>
                  </span>
                </label>
              </div>
            </div>
          </div>
          
          <div className="status-card-body">
            <div className="status-main-display">
              <div className={`status-indicator-modern ${isDemoMode ? 'demo-mode' : 'prod-mode'}`}>
                <div className="status-circle">
                  <div className="status-pulse"></div>
                  <div className="status-center">
                    {isDemoMode ? '🧪' : '📡'}
                  </div>
                </div>
                <div className="status-text-content">
                  <div className="status-badge-modern">
                    {isDemoMode ? 'MODALITÀ TEST' : 'PRODUZIONE ATTIVA'}
                  </div>
                  <p className="status-description-modern">
                    {isDemoMode 
                      ? 'Sistema di simulazione per test e formazione' 
                      : 'Lettura NFC reale abilitata e funzionante'
                    }
                  </p>
                </div>
              </div>
            </div>
            
            <div className="status-stats-grid">
              <div className="status-stat-item">
                <div className="stat-icon">📊</div>
                <div className="stat-content">
                  <span className="stat-value">{nfcTags.length}</span>
                  <span className="stat-label">Tag Associati</span>
                </div>
              </div>
              <div className="status-stat-item">
                <div className="stat-icon">📝</div>
                <div className="stat-content">
                  <span className="stat-value">{nfcLogs.length}</span>
                  <span className="stat-label">Letture Oggi</span>
                </div>
              </div>
              <div className="status-stat-item">
                <div className="stat-icon">⚡</div>
                <div className="stat-content">
                  <span className="stat-value">{isDemoMode ? 'SIM' : 'REAL'}</span>
                  <span className="stat-label">Modalità</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lettore NFC Dashboard Style */}
      <div className="dashboard-section">
        <div className="reader-card">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-icon">🔍</span>
              Lettore NFC
            </h3>
            <div className="header-actions">
              <div className="mode-toggle-wrapper">
                <label className="toggle-container">
                  <input
                    type="checkbox"
                    checked={!isDemoMode}
                    onChange={(e) => setIsDemoMode(!e.target.checked)}
                    disabled={!('NDEFReader' in window)}
                  />
                  <span className="toggle-label">
                    {isDemoMode ? 'Test' : 'Produzione'}
                  </span>
                </label>
              </div>
            </div>
          </div>
          
          <div className="card-content">
            <div className="reader-controls">
              <div className="action-buttons">
                {isDemoMode ? (
                  <button 
                    onClick={startDemoReading}
                    className={`btn btn-primary btn-large ${isReading ? 'loading' : ''}`}
                    disabled={isReading}
                  >
                    <span className="btn-icon">🧪</span>
                    {isReading ? 'Test in corso...' : 'Avvia Test Lettura'}
                  </button>
                ) : (
                  <button 
                    onClick={startRealNFCReading}
                    className={`btn btn-success btn-large ${isReading ? 'loading' : ''}`}
                    disabled={isReading}
                  >
                    <span className="btn-icon">📱</span>
                    {isReading ? 'Scansione NFC attiva...' : 'Avvia Lettura NFC'}
                  </button>
                )}
              </div>
              
              {lastReadTag && (
                <div className="last-read-display">
                  <div className="read-result-card">
                    <div className="result-header">
                      <h4>Ultimo Tag Letto {isDemoMode ? '(TEST)' : ''}</h4>
                      <span className="read-time">{lastReadTag.time.toLocaleTimeString()}</span>
                    </div>
                    <div className="tag-id-display">
                      <span className="tag-label">ID Tag:</span>
                      <code className="tag-id">{lastReadTag.id}</code>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Associazione Dashboard Style */}
      {lastReadTag && (
        <div className="dashboard-section">
          <div className="association-card">
            <div className="card-header">
              <h3 className="card-title">
                <span className="card-icon">🔗</span>
                Associa Tag a Cliente
              </h3>
            </div>
            <div className="card-content">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Nome Tag (opzionale)</label>
                  <input
                    type="text"
                    placeholder="es. Tag Cliente VIP"
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Seleziona Cliente</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => {
                      console.log('🔍 Selected value:', e.target.value)
                      setSelectedCustomerId(e.target.value)
                    }}
                    className="form-select"
                  >
                    <option value="">-- Scegli un cliente --</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={String(customer.id)}>
                        {customer.name} - {customer.phone || 'N/A'}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-actions">
                  <button onClick={associateTag} className="btn btn-primary btn-large">
                    <span className="btn-icon">🔗</span>
                    Associa Tag
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tag Associati Dashboard Style */}
      <div className="dashboard-section">
        <div className="tags-card">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-icon">🏷️</span>
              Tag NFC Associati
            </h3>
            <div className="header-badge">
              <span className="count-badge">{nfcTags.length}</span>
            </div>
          </div>
          <div className="card-content">
            {nfcTags.length > 0 ? (
              <div className="tags-grid">
                {nfcTags.map(tag => {
                  const customer = customers.find(c => c.id === tag.customer_id)
                  return (
                    <div key={tag.id} className="tag-item-card">
                      <div className="tag-header">
                        <h4 className="tag-name">{tag.tag_name || 'Tag Senza Nome'}</h4>
                        <div className="tag-badges">
                          {tag.notes && (tag.notes.includes('test') || tag.notes.includes('TEST')) && 
                            <span className="badge badge-warning">TEST</span>
                          }
                          {tag.notes && tag.notes.includes('DISASSOCIATO') && 
                            <span className="badge badge-danger">INATTIVO</span>
                          }
                        </div>
                      </div>
                      
                      <div className="tag-details">
                        <div className="detail-row">
                          <span className="detail-label">Tag ID:</span>
                          <code className="detail-value">{tag.tag_id}</code>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Cliente:</span>
                          <span className="detail-value">{customer?.name || 'Cliente non trovato'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Telefono:</span>
                          <span className="detail-value">{customer?.phone || 'N/A'}</span>
                        </div>
                        <div className="gemme-display">
                          <span className="gemma-icon">💎</span>
                          <span className="gemme-count">{customer?.points || 0} GEMME</span>
                        </div>
                        {tag.last_used_at && (
                          <div className="last-used">
                            Ultimo uso: {new Date(tag.last_used_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      <div className="tag-actions">
                        <button 
                          onClick={() => disassociateTag(tag)}
                          className="btn btn-danger btn-small"
                          title="Disassocia tag"
                        >
                          <span className="btn-icon">🗑️</span>
                          Disassocia
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📱</div>
                <h4>Nessun tag NFC associato</h4>
                <p>{isDemoMode ? 'Usa la modalità test per verificare il funzionamento!' : 'Leggi un tag NFC per iniziare!'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Log Attività Dashboard Style */}
      <div className="dashboard-section">
        <div className="logs-card">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-icon">📋</span>
              Log Attività NFC
            </h3>
            <div className="header-badge">
              <span className="count-badge">{nfcLogs.length}</span>
            </div>
          </div>
          <div className="card-content">
            {nfcLogs.length > 0 ? (
              <div className="logs-list">
                {nfcLogs.map(log => {
                  const getActionIcon = (action) => {
                    switch(action) {
                      case 'read_demo': return '🧪'
                      case 'read_real': return '📱'
                      case 'registration': return '✅'
                      case 'reassociation': return '🔄'
                      case 'disassociation': return '🗑️'
                      default: return '📋'
                    }
                  }
                  
                  const getActionLabel = (action) => {
                    switch(action) {
                      case 'read_demo': return 'Lettura Test'
                      case 'read_real': return 'Lettura NFC'
                      case 'registration': return 'Associazione'
                      case 'reassociation': return 'Riassociazione'
                      case 'disassociation': return 'Disassociazione'
                      default: return action
                    }
                  }

                  return (
                    <div key={log.id} className="log-item">
                      <div className="log-icon">
                        {getActionIcon(log.action_type)}
                      </div>
                      <div className="log-content">
                        <div className="log-action">
                          {getActionLabel(log.action_type)}
                        </div>
                        <div className="log-details">
                          <span className="log-tag">Tag: {log.tag_id}</span>
                          <span className="log-time">{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="log-badges">
                        {log.device_info && (log.device_info.includes('test') || log.device_info.includes('TEST')) && 
                          <span className="badge badge-warning">TEST</span>
                        }
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h4>Nessuna attività registrata</h4>
                <p>{isDemoMode ? 'Prova la modalità test!' : 'Leggi un tag per iniziare!'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialog conferma riassociazione */}
      {showConfirmDialog && existingTag && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">
                <span className="modal-icon">⚠️</span>
                Conferma Riassociazione
              </h3>
            </div>
            <div className="modal-content">
              <p className="modal-text">
                Il tag <code className="tag-highlight">{lastReadTag?.id}</code> è già associato a:
              </p>
              <div className="existing-customer-card">
                <div className="customer-info">
                  <h4>{existingTag.oldCustomer.name}</h4>
                  <p>📞 {existingTag.oldCustomer.phone}</p>
                </div>
              </div>
              <p className="modal-text">
                Vuoi riassociarlo a <strong>{existingTag.newCustomer.name}</strong>?
              </p>
            </div>
            <div className="modal-actions">
              <button 
                onClick={() => {
                  setShowConfirmDialog(false)
                  setExistingTag(null)
                }}
                className="btn btn-secondary"
              >
                <span className="btn-icon">❌</span>
                Annulla
              </button>
              <button 
                onClick={() => performAssociation(existingTag.newCustomer, 'riassociazione')}
                className="btn btn-primary"
              >
                <span className="btn-icon">🔄</span>
                Riassocia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

NFCView.displayName = 'NFCView'

export default NFCView