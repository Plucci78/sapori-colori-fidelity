import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../supabase'
import nfcService from '../../services/nfcService'
import './NFCView.css'

const NFCView = ({ showNotification }) => {
  // STATI PRINCIPALI
  const [serverConnected, setServerConnected] = useState(nfcService.isConnected)
  const [isScanning, setIsScanning] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)
  
  // DATI
  const [customers, setCustomers] = useState([])
  const [nfcTags, setNfcTags] = useState([])
  const [nfcLogs, setNfcLogs] = useState([])
  
  // TAG MANAGEMENT
  const [lastReadTag, setLastReadTag] = useState(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [tagName, setTagName] = useState('')
  
  // MODALS
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [existingTag, setExistingTag] = useState(null)
  
  // REFS
  const mounted = useRef(true)
  const isScanningRef = useRef(false) // ← AGGIUNTO PER SINCRONIZZAZIONE

  // Sincronizza ref con state
  useEffect(() => {
    isScanningRef.current = isScanning
    console.log('🔄 Aggiornato isScanningRef:', isScanning)
  }, [isScanning])

  // ==================== LIFECYCLE ====================
  useEffect(() => {
    mounted.current = true
    loadAllData()
    const cleanup = initializeNFC()
    
    return () => {
      mounted.current = false
      if (cleanup) cleanup()
    }
  }, [])

  // ==================== DATA LOADING ====================
  const loadAllData = useCallback(async () => {
    await Promise.all([
      loadCustomers(),
      loadNFCTags(),
      loadNFCLogs()
    ])
  }, [])

  const loadCustomers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, email, points')
        .order('name')

      if (error) throw error
      if (mounted.current && data) {
        setCustomers(data)
      }
    } catch (error) {
      console.error('Errore caricamento clienti:', error)
      if (mounted.current) {
        showNotification('Errore caricamento clienti', 'error')
      }
    }
  }, [showNotification])

  const loadNFCTags = useCallback(async () => {
    try {
      console.log('🔄 Caricamento tag NFC...')
      
      const { data, error } = await supabase
        .from('nfc_tags')
        .select('*')
        .order('created_at', { ascending: false })

      console.log('📊 Risultato query nfc_tags:', { data, error })
      console.log('📋 Tag trovati (tutti):', data?.length || 0)
      
      if (error) throw error
      
      if (mounted.current && data) {
        // Filtra solo quelli attivi DOPO aver visto tutti i dati
        const activeTags = data.filter(tag => tag.is_active !== false)
        console.log('📋 Tag attivi:', activeTags.length)
        console.log('📋 Dettaglio tag attivi:', activeTags.map(t => ({ 
          id: t.tag_id, 
          customer_id: t.customer_id, 
          is_active: t.is_active 
        })))
        
        setNfcTags(activeTags)
      }
    } catch (error) {
      console.error('Errore caricamento tag:', error)
    }
  }, [])

  const loadNFCLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('nfc_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      if (mounted.current && data) {
        setNfcLogs(data)
      }
    } catch (error) {
      console.error('Errore caricamento log:', error)
    }
  }, [])

  // ==================== NFC INITIALIZATION ====================
  const initializeNFC = useCallback(() => {
    let unsubscribers = []

    unsubscribers.push(nfcService.on('connected', () => {
      if (mounted.current) {
        setServerConnected(true)
        showNotification('✅ Server NFC connesso', 'success')
      }
    }))

    unsubscribers.push(nfcService.on('disconnected', () => {
      if (mounted.current) {
        setServerConnected(false)
        showNotification('❌ Server NFC disconnesso', 'error')
      }
    }))

    unsubscribers.push(nfcService.on('cardDetected', (data) => {
      console.log('🎯 NFCView ricevuto cardDetected:', data, 'isScanningRef.current:', isScanningRef.current)
      if (mounted.current && isScanningRef.current) {
        const tagId = data.uid.replace(/:/g, '').toLowerCase()
        console.log('🏷️ Processando tag:', tagId)
        handleTagDetected(tagId, data.type)
      } else {
        console.log('⚠️ Card detected ma isScanningRef=false o component unmounted')
      }
    }))

    unsubscribers.push(nfcService.on('scanTimeout', () => {
      console.log('⏱️ SCAN TIMEOUT ricevuto - settando isScanning=false')
      if (mounted.current) {
        setIsScanning(false)
        showNotification('⏱️ Scansione scaduta', 'info')
      }
    }))

    unsubscribers.push(nfcService.on('error', (error) => {
      console.log('❌ ERROR ricevuto - settando isScanning=false')
      if (mounted.current) {
        setIsScanning(false)
        showNotification(`❌ Errore NFC: ${error}`, 'error')
      }
    }))

    // Connessione
    setTimeout(async () => {
      try {
        await nfcService.connect()
      } catch (error) {
        console.log('Server NFC offline, modalità demo disponibile')
        if (mounted.current) {
          setIsDemoMode(true)
        }
      }
    }, 500)

    return () => {
      unsubscribers.forEach(unsub => {
        if (typeof unsub === 'function') {
          try {
            unsub()
          } catch (error) {
            console.warn('Errore cleanup listener:', error)
          }
        }
      })
    }
  }, [isScanning, showNotification])

  // ==================== TAG DETECTION ====================
  const handleTagDetected = (tagId, tagType = 'Unknown') => {
    if (!mounted.current) return

    setLastReadTag({
      id: tagId,
      type: tagType,
      time: new Date()
    })
    
    setIsScanning(false)
    saveNFCLog(tagId, isDemoMode ? 'read_demo' : 'read_physical')
    showNotification(`✅ Tag rilevato: ${tagId.slice(-6)}`, 'success')
    
    // CONTROLLO AUTOMATICO SE TAG GIÀ ASSOCIATO
    setTimeout(() => {
      checkExistingTagAssociation(tagId)
    }, 1000) // Aumentato delay per aspettare il caricamento dati
  }

  // CONTROLLO SE TAG È GIÀ ASSOCIATO - CON QUERY DIRETTA
  const checkExistingTagAssociation = async (tagId) => {
    console.log('🔍 === DEBUG CONTROLLO TAG ===')
    console.log('🏷️ Tag cercato:', tagId)
    
    try {
      // QUERY DIRETTA AL DATABASE - SEMPRE FRESCA!
      const { data: freshTags, error } = await supabase
        .from('nfc_tags')
        .select('*')
        .order('created_at', { ascending: false })

      console.log('📊 Query diretta risultato:', { data: freshTags, error })
      
      if (error) throw error
      
      const activeTags = freshTags?.filter(tag => tag.is_active !== false) || []
      
      console.log('📋 Tutti i tag freschi:', freshTags?.length || 0)
      console.log('📋 Tag attivi freschi:', activeTags.length)
      console.log('📋 Tag IDs freschi:', activeTags.map(t => t.tag_id))
      console.log('📋 Confronto case-insensitive:', activeTags.map(t => ({ 
        original: t.tag_id, 
        lowercase: t.tag_id.toLowerCase(),
        matches: t.tag_id.toLowerCase() === tagId.toLowerCase()
      })))
      
      const existingTag = activeTags.find(tag => 
        tag.tag_id.toLowerCase() === tagId.toLowerCase()
      )
      
      console.log('🔍 Tag esistente trovato:', existingTag)
      
      if (existingTag) {
        // Ricarica anche i clienti per essere sicuri
        const { data: freshCustomers } = await supabase
          .from('customers')
          .select('id, name, phone, email, points')
          .order('name')
        
        const existingCustomer = freshCustomers?.find(c => 
          String(c.id) === String(existingTag.customer_id)
        )
        
        console.log('👤 Cliente esistente:', existingCustomer)
        
        if (existingCustomer) {
          console.log('⚠️ TESSERA GIÀ ASSOCIATA:', existingCustomer.name)
          
          // MOSTRA MODALE DI RIASSOCIAZIONE AUTOMATICA
          setExistingTag({
            tag: existingTag,
            oldCustomer: existingCustomer,
            newCustomer: null // Sarà selezionato nel modale
          })
          setShowConfirmDialog(true)
          
          showNotification(`⚠️ Tessera già associata a ${existingCustomer.name}`, 'warning')
          console.log('✅ Modale riassociazione attivato automaticamente')
        }
      } else {
        console.log('✅ Tag non trovato nel database')
        showNotification('💡 Tessera pronta per associazione', 'info')
      }
    } catch (error) {
      console.error('❌ Errore controllo tag:', error)
      showNotification('Errore controllo tessera', 'error')
    }
  }

  // ==================== SCANNING ====================
  // ==================== SCANNING ====================
  const startScan = async () => {
    console.log('🚀 Avvio scansione, isDemoMode:', isDemoMode, 'serverConnected:', serverConnected)
    
    if (isDemoMode) {
      startDemoScan()
      return
    }

    if (!serverConnected) {
      showNotification('❌ Server NFC non connesso', 'error')
      return
    }

    try {
      console.log('🔧 Settando isScanning=true')
      setIsScanning(true)
      
      // DEBUG: Verifica che sia settato
      setTimeout(() => {
        console.log('🔍 Verifica isScanning dopo 100ms:', isScanning, 'isScanningRef:', isScanningRef.current)
      }, 100)
      
      showNotification('📟 Appoggia la tessera sul lettore...', 'info')
      
      const result = await nfcService.startScan()
      console.log('📡 Risultato startScan:', result)
      
      if (!result.success) {
        throw new Error(result.error || 'Errore avvio scansione')
      }
      
      // Verifica che sia ancora true
      setTimeout(() => {
        console.log('🔍 Verifica isScanning dopo startScan:', isScanning)
      }, 500)
      
    } catch (error) {
      console.error('Errore avvio scansione:', error)
      showNotification(`❌ ${error.message}`, 'error')
      setIsScanning(false)
    }
  }

  const startDemoScan = () => {
    setIsScanning(true)
    showNotification('🧪 Simulazione lettura in corso...', 'info')
    
    setTimeout(() => {
      if (mounted.current) {
        const demoTags = [
          { id: '04A1B2C3D4E5F6', type: 'MIFARE Classic' },
          { id: '62AE1E5D', type: 'MIFARE Ultralight' },
          { id: 'E0040100FA5C8B13', type: 'NTAG215' },
          { id: '04D257CA2C3B80', type: 'MIFARE Classic' },
          { id: '23a349cf', type: 'MIFARE Ultralight' }, // Tag esistente
          { id: '738f70cf', type: 'NTAG213' } // Altro tag esistente
        ]
        
        const randomTag = demoTags[Math.floor(Math.random() * demoTags.length)]
        handleTagDetected(randomTag.id, randomTag.type)
      }
    }, 2000)
  }

  const stopScan = async () => {
    try {
      if (!isDemoMode && serverConnected) {
        await nfcService.stopScan()
      }
      setIsScanning(false)
      showNotification('⏹️ Scansione fermata', 'info')
    } catch (error) {
      console.error('Errore stop scansione:', error)
    }
  }

  // ==================== TAG ASSOCIATION ====================
  const associateTag = async () => {
    if (!lastReadTag || !selectedCustomerId) {
      showNotification('Seleziona un cliente e leggi un tag prima!', 'error')
      return
    }

    const selectedCustomer = customers.find(c => String(c.id) === String(selectedCustomerId))
    if (!selectedCustomer) {
      showNotification('Cliente non trovato!', 'error')
      return
    }

    console.log('🔍 === DEBUG ASSOCIAZIONE ===')
    console.log('🏷️ Tag da associare:', lastReadTag.id)
    console.log('👤 Cliente selezionato:', selectedCustomer.name, 'ID:', selectedCustomer.id)
    console.log('📋 Tag nel database:', nfcTags.map(t => ({ id: t.tag_id, customer_id: t.customer_id, customer_name: customers.find(c => c.id === t.customer_id)?.name })))

    // CONTROLLO ASSOCIAZIONE ESISTENTE
    const existingTagAssociation = nfcTags.find(tag => 
      tag.tag_id.toLowerCase() === lastReadTag.id.toLowerCase()
    )
    
    console.log('🔍 Tag esistente trovato:', existingTagAssociation)
    
    if (existingTagAssociation) {
      console.log('⚠️ Tag già associato nel database!')
      
      const existingCustomer = customers.find(c => 
        String(c.id) === String(existingTagAssociation.customer_id)
      )
      
      console.log('👤 Cliente esistente:', existingCustomer)
      console.log('🔄 Confronto IDs: esistente =', String(existingCustomer?.id), 'selezionato =', String(selectedCustomer.id))
      
      if (existingCustomer && String(existingCustomer.id) !== String(selectedCustomer.id)) {
        console.log('🔄 DOVREBBE MOSTRARE MODALE DI RIASSOCIAZIONE')
        
        setExistingTag({
          tag: existingTagAssociation,
          oldCustomer: existingCustomer,
          newCustomer: selectedCustomer
        })
        setShowConfirmDialog(true)
        
        console.log('✅ Modale impostato:', {
          showConfirmDialog: true,
          oldCustomer: existingCustomer.name,
          newCustomer: selectedCustomer.name
        })
        return
      } else if (existingCustomer && String(existingCustomer.id) === String(selectedCustomer.id)) {
        console.log('ℹ️ Tag già associato allo stesso cliente')
        showNotification(`ℹ️ Tag già associato a ${selectedCustomer.name}`, 'info')
        return
      }
    } else {
      console.log('✅ Tag non trovato nel database - nuova associazione')
    }

    console.log('✅ Procedo con nuova associazione')
    await performAssociation(selectedCustomer, 'nuova')
  }

  const performAssociation = async (customer, actionType = 'nuova') => {
    const tagToAssociate = lastReadTag
    if (!tagToAssociate) {
      showNotification('Errore: nessun tag da associare', 'error')
      return
    }

    try {
      console.log(`🔧 Eseguo ${actionType} associazione`)
      
      const { error } = await supabase
        .from('nfc_tags')
        .upsert([{
          tag_id: tagToAssociate.id,
          customer_id: customer.id,
          tag_name: tagName || `Tessera ${customer.name}`,
          is_active: true,
          notes: isDemoMode ? 'Modalità demo' : 'Lettore ACR122U',
          device_info: tagToAssociate.type || 'ACR122U',
          created_at: new Date().toISOString()
        }], {
          onConflict: 'tag_id',
          ignoreDuplicates: false
        })

      if (error) throw error

      const message = actionType === 'riassociazione' 
        ? `🔄 Tessera riassociata a ${customer.name}!`
        : `✅ Tessera associata a ${customer.name}!`
      
      showNotification(message, 'success')
      
      // Reset form
      setLastReadTag(null)
      setSelectedCustomerId('')
      setTagName('')
      setShowConfirmDialog(false)
      setExistingTag(null)
      
      // Reload data
      await Promise.all([
        loadNFCTags(),
        saveNFCLog(tagToAssociate.id, actionType === 'riassociazione' ? 'reassociation' : 'registration')
      ])
      
    } catch (error) {
      console.error('Errore associazione:', error)
      showNotification('Errore nell\'associazione', 'error')
    }
  }

  // ==================== TAG MANAGEMENT ====================
  const disassociateTag = async (tag) => {
    if (!window.confirm(`Vuoi disassociare la tessera "${tag.tag_name}"?`)) {
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

      if (error) throw error

      showNotification(`🗑️ Tessera "${tag.tag_name}" disassociata!`, 'success')
      await loadNFCTags()
      await saveNFCLog(tag.tag_id, 'disassociation')

    } catch (error) {
      console.error('Errore disassociazione:', error)
      showNotification('Errore nella disassociazione', 'error')
    }
  }

  // ==================== LOGGING ====================
  const saveNFCLog = async (tagId, actionType) => {
    try {
      const { error } = await supabase
        .from('nfc_logs')
        .insert([{
          tag_id: tagId,
          action_type: actionType,
          device_info: isDemoMode ? 'demo_mode' : 'ACR122U',
          created_at: new Date().toISOString()
        }])

      if (error) throw error
      await loadNFCLogs()
    } catch (error) {
      console.error('Errore salvataggio log:', error)
    }
  }

  const getStatusColor = () => {
    if (isDemoMode) return '#DAA520' // Oro demo
    if (serverConnected) return '#B8860B' // Oro attivo
    return '#CD5C5C' // Rosso errore
  }

  const getStatusText = () => {
    if (isDemoMode) return 'Modalità Demo Attiva'
    if (serverConnected) return 'Sistema Operativo'
    return 'Sistema Offline'
  }

  const getActionIcon = (action) => {
    const icons = {
      'read_demo': '🧪',
      'read_physical': '📟',
      'registration': '✅',
      'reassociation': '🔄',
      'disassociation': '🗑️',
      'customer_access': '👤'
    }
    return icons[action] || '📋'
  }

  const getActionLabel = (action) => {
    const labels = {
      'read_demo': 'Lettura Demo',
      'read_physical': 'Lettura Fisica',
      'registration': 'Registrazione',
      'reassociation': 'Riassociazione',
      'disassociation': 'Disassociazione',
      'customer_access': 'Accesso Cliente'
    }
    return labels[action] || action
  }

  // ==================== RENDER ====================
  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1 className="dashboard-title">
            <span className="title-icon">📟</span>
            Gestione NFC - Lettore ACR122U
          </h1>
          <p className="dashboard-subtitle">
            Sistema professionale di identificazione clienti con tessere NFC
          </p>
        </div>
      </div>

      {/* Status Card */}
      <div className="dashboard-section">
        <div className="nfc-status-card">
          <div className="status-card-header">
            <div className="status-title-section">
              <div className="status-icon-wrapper">
                <div 
                  className="status-indicator-led"
                  style={{ 
                    backgroundColor: getStatusColor(),
                    boxShadow: `0 0 8px ${getStatusColor()}40, inset 0 2px 4px rgba(255,255,255,0.3)`,
                    border: `1px solid ${getStatusColor()}80`
                  }}
                >
                  {isDemoMode ? '🧪' : serverConnected ? '⚡' : '❌'}
                </div>
              </div>
              <div className="status-title-content">
                <h3 className="status-main-title">{getStatusText()}</h3>
                <p className="status-subtitle">
                  {isDemoMode ? 'Simulazione per test e formazione' : 'Lettore ACR122U Professional'}
                </p>
              </div>
            </div>
            
            {!serverConnected && (
              <div className="status-switch-wrapper">
                <label className="modern-toggle">
                  <input
                    type="checkbox"
                    checked={isDemoMode}
                    onChange={(e) => setIsDemoMode(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                  <span className="toggle-labels">
                    <span className="label-off">OFF</span>
                    <span className="label-demo">DEMO</span>
                  </span>
                </label>
              </div>
            )}
          </div>
          
          <div className="status-stats-grid">
            <div className="status-stat-item">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <span className="stat-value">{nfcTags.length}</span>
                <span className="stat-label">Tessere Attive</span>
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
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <span className="stat-value">{customers.length}</span>
                <span className="stat-label">Clienti</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reader Section */}
      <div className="dashboard-section">
        <div className="reader-card">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-icon">{isDemoMode ? '🧪' : '📟'}</span>
              {isDemoMode ? 'Simulatore NFC' : 'Lettore Tessere NFC'}
            </h3>
            {isScanning && (
              <button onClick={stopScan} className="btn btn-danger btn-small">
                ⏹️ Ferma
              </button>
            )}
          </div>
          
          <div className="card-content">
            <div className="reader-controls">
              <div className="action-buttons">
                {!isScanning ? (
                  <button 
                    onClick={startScan}
                    className={`btn ${isDemoMode ? 'btn-primary' : 'btn-success'} btn-large`}
                    disabled={!isDemoMode && !serverConnected}
                  >
                    <span className="btn-icon">{isDemoMode ? '🧪' : '📟'}</span>
                    {isDemoMode ? 'Simula Lettura' : 'Leggi Tessera'}
                  </button>
                ) : (
                  <div className="scanning-status">
                    <div className="pulse-animation"></div>
                    <p>{isDemoMode ? 'Simulazione in corso...' : 'Appoggia la tessera sul lettore...'}</p>
                  </div>
                )}
              </div>
              
              {lastReadTag && (
                <div className="last-read-display">
                  <div className="read-result-card">
                    <div className="result-header">
                      <h4>🏷️ Tessera Rilevata {isDemoMode ? '(DEMO)' : ''}</h4>
                      <span className="read-time">{lastReadTag.time.toLocaleTimeString()}</span>
                    </div>
                    <div className="tag-details">
                      <div className="tag-detail">
                        <span className="detail-label">ID:</span>
                        <code className="detail-value">{lastReadTag.id}</code>
                      </div>
                      <div className="tag-detail">
                        <span className="detail-label">Tipo:</span>
                        <span className="detail-value">{lastReadTag.type}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Association Section - SEZIONE MIGLIORATA */}
      {lastReadTag && (
        <div className="dashboard-section">
          <div style={{
            background: 'linear-gradient(135deg, #B8860B 0%, #DAA520 50%, #CD853F 100%)', // Gradiente oro Analytics
            borderRadius: '16px',
            padding: '2px',
            boxShadow: '0 10px 25px rgba(184, 134, 11, 0.3)'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '14px',
              overflow: 'hidden'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #B8860B 0%, #DAA520 50%, #CD853F 100%)', // Gradiente oro
                color: 'white',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  backgroundColor: 'rgba(218, 165, 32, 0.2)', // Oro trasparente
                  borderRadius: '12px',
                  padding: '8px',
                  fontSize: '24px'
                }}>🔗</div>
                <div>
                  <h3 style={{
                    margin: 0,
                    fontSize: '22px',
                    fontWeight: 'bold'
                  }}>Associa Tessera a Cliente</h3>
                  <p style={{
                    margin: '4px 0 0',
                    fontSize: '14px',
                    opacity: 0.9
                  }}>Collega la tessera rilevata ad un cliente del sistema</p>
                </div>
              </div>
              
              <div style={{ padding: '24px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '24px'
                }}>
                  <h4 style={{
                    margin: '0 0 12px',
                    fontSize: '16px',
                    color: '#1e293b',
                    fontWeight: '600'
                  }}>🏷️ Tessera Rilevata</h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    fontSize: '14px'
                  }}>
                    <div>
                      <span style={{ color: '#64748b', fontWeight: '500' }}>ID:</span>
                      <code style={{
                        backgroundColor: '#1e293b',
                        color: '#f8fafc',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        marginLeft: '8px',
                        fontSize: '13px',
                        fontWeight: 'bold'
                      }}>{lastReadTag.id}</code>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontWeight: '500' }}>Tipo:</span>
                      <span style={{ 
                        marginLeft: '8px',
                        color: '#1e293b',
                        fontWeight: '600'
                      }}>{lastReadTag.type}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '20px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '15px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>Nome Tessera (opzionale)</label>
                    <input
                      type="text"
                      placeholder="es. Tessera Gold, Tessera VIP..."
                      value={tagName}
                      onChange={(e) => setTagName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #d1d5db',
                        borderRadius: '10px',
                        fontSize: '15px',
                        backgroundColor: 'white',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#B8860B'} // Oro focus
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    />
                  </div>
                  
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '15px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>Seleziona Cliente</label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #d1d5db',
                        borderRadius: '10px',
                        fontSize: '15px',
                        backgroundColor: 'white',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#B8860B'} // Oro focus
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    >
                      <option value="">-- Scegli un cliente --</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={String(customer.id)}>
                          {customer.name} - {customer.phone || 'N/A'} - 💎 {customer.points} GEMME
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div style={{ textAlign: 'center', marginTop: '8px' }}>
                    <button 
                      onClick={associateTag}
                      disabled={!selectedCustomerId}
                      style={{
                        padding: '14px 32px',
                        borderRadius: '12px',
                        border: 'none',
                        background: selectedCustomerId 
                          ? 'linear-gradient(135deg, #B8860B 0%, #DAA520 50%, #CD853F 100%)' // Gradiente oro
                          : '#d1d5db',
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: selectedCustomerId ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        margin: '0 auto',
                        boxShadow: selectedCustomerId ? '0 8px 20px rgba(184, 134, 11, 0.3)' : 'none' // Ombra oro
                      }}
                      onMouseOver={(e) => {
                        if (selectedCustomerId) {
                          e.target.style.transform = 'translateY(-2px)'
                          e.target.style.boxShadow = '0 12px 25px rgba(184, 134, 11, 0.4)' // Hover oro
                        }
                      }}
                      onMouseOut={(e) => {
                        e.target.style.transform = 'translateY(0)'
                        e.target.style.boxShadow = selectedCustomerId ? '0 8px 20px rgba(184, 134, 11, 0.3)' : 'none'
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>🔗</span>
                      Associa Tessera
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Tags */}
      <div className="dashboard-section">
        <div className="tags-card">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-icon">💳</span>
              Tessere NFC Associate
            </h3>
            <div className="header-badge">
              <span className="count-badge">{nfcTags.length}</span>
            </div>
          </div>
          <div className="card-content">
            {nfcTags.length > 0 ? (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                gap: '16px' 
              }}>
                {nfcTags.map(tag => {
                  const customer = customers.find(c => c.id === tag.customer_id)
                  const cardStyle = {
                    background: 'linear-gradient(135deg, #F5E6B3 0%, #E6D08A 100%)',
                    border: '2px solid #B8860B',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: '0 4px 12px rgba(184, 134, 11, 0.2)',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden'
                  }
                  
                  return (
                    <div key={tag.id} className="tag-item-card">
                      <div className="tag-header">
                        <h4 className="tag-name">{tag.tag_name || 'Tessera Standard'}</h4>
                        <div className="tag-badges">
                          {tag.tag_type && (
                            <span className="badge badge-info">{tag.tag_type}</span>
                          )}
                          {tag.notes?.includes('demo') && 
                            <span className="badge badge-warning">DEMO</span>
                          }
                        </div>
                      </div>
                      
                      <div className="tag-details">
                        <div className="detail-row">
                          <span className="detail-label">ID:</span>
                          <code className="detail-value">{tag.tag_id}</code>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Cliente:</span>
                          <span className="detail-value">{customer?.name || 'Non trovato'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Telefono:</span>
                          <span className="detail-value">{customer?.phone || 'N/A'}</span>
                        </div>
                        <div className="gemme-display">
                          <span className="gemme-icon">💎</span>
                          <span className="gemme-count">{customer?.points || 0} GEMME</span>
                        </div>
                        <div className="tag-meta">
                          Creata: {new Date(tag.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="tag-actions">
                        <button 
                          onClick={() => disassociateTag(tag)}
                          className="btn btn-danger btn-small"
                          title="Disassocia tessera"
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
                <div className="empty-icon">💳</div>
                <h4>Nessuna tessera associata</h4>
                <p>Leggi una tessera NFC e associala a un cliente per iniziare!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="dashboard-section">
        <div className="logs-card">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-icon">📋</span>
              Registro Attività NFC
            </h3>
            <div className="header-badge">
              <span className="count-badge">{nfcLogs.length}</span>
            </div>
          </div>
          <div className="card-content">
            {nfcLogs.length > 0 ? (
              <div className="logs-list">
                {nfcLogs.map(log => (
                  <div key={log.id} className="log-item">
                    <div className="log-icon">
                      {getActionIcon(log.action_type)}
                    </div>
                    <div className="log-content">
                      <div className="log-action">
                        {getActionLabel(log.action_type)}
                      </div>
                      <div className="log-details">
                        <span className="log-tag">ID: {log.tag_id}</span>
                        <span className="log-time">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="log-badges">
                      {log.device_info === 'demo_mode' && 
                        <span className="badge badge-warning">DEMO</span>
                      }
                      {log.device_info === 'ACR122U' && 
                        <span className="badge badge-success">ACR122U</span>
                      }
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h4>Nessuna attività registrata</h4>
                <p>Le attività NFC appariranno qui automaticamente</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog - MODALE MIGLIORATO */}
      {showConfirmDialog && existingTag && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(139, 69, 19, 0.7)', // Overlay marrone come Analytics
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div className="modal-container" style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 25px 50px rgba(184, 134, 11, 0.25)', // Ombra oro
            border: '2px solid #DAA520', // Bordo oro
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            transform: 'scale(1)',
            animation: 'modalAppear 0.3s ease-out'
          }}>
            <div className="modal-header" style={{
              padding: '24px 24px 0',
              borderBottom: '1px solid #DAA520', // Bordo oro
              marginBottom: '20px',
              background: 'linear-gradient(135deg, #F5E6B3, #E6D08A)' // Sfondo oro chiaro
            }}>
              <h3 className="modal-title" style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#8B4513', // Marrone scuro Analytics
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span className="modal-icon" style={{
                  fontSize: '28px',
                  background: 'linear-gradient(135deg, #DAA520, #B8860B)', // Gradiente oro
                  borderRadius: '50%',
                  width: '45px',
                  height: '45px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>⚠️</span>
                Tessera Già Associata
              </h3>
            </div>
            
            <div className="modal-content" style={{ padding: '0 24px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #F5E6B3, #E6D08A)', // Gradiente oro chiaro per warning
                border: '1px solid #B8860B',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <p className="modal-text" style={{
                  margin: '0 0 12px',
                  fontSize: '16px',
                  color: '#8B4513', // Marrone scuro per testo
                  fontWeight: '500'
                }}>
                  La tessera <code style={{
                    backgroundColor: '#FFFACD', // Fondo crema per codice
                    color: '#8B4513', // Marrone per testo codice
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    border: '1px solid #DAA520' // Bordo oro
                  }}>{lastReadTag?.id}</code> è già associata a:
                </p>
                
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '10px',
                  padding: '16px',
                  border: '2px solid #B8860B', // Bordo oro
                  boxShadow: '0 4px 6px rgba(184, 134, 11, 0.1)' // Ombra oro leggera
                }}>
                  <div className="customer-info">
                    <h4 style={{
                      margin: '0 0 8px',
                      fontSize: '20px',
                      color: '#1f2937',
                      fontWeight: 'bold'
                    }}>{existingTag.oldCustomer.name}</h4>
                    <p style={{
                      margin: '4px 0',
                      color: '#6b7280',
                      fontSize: '15px'
                    }}>📞 {existingTag.oldCustomer.phone}</p>
                    <div style={{
                      background: 'linear-gradient(135deg, #CD853F, #8B4513)', // Gradiente marrone per GEMME
                      color: 'white',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      display: 'inline-block',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      marginTop: '8px'
                    }}>💎 {existingTag.oldCustomer.points} GEMME</div>
                  </div>
                </div>
              </div>
              
              <div style={{
                background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
                border: '1px solid #3b82f6',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px'
              }}>
                <p style={{
                  margin: '0 0 16px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#8B4513', // Marrone scuro per testo
                  textAlign: 'center'
                }}>
                  🔄 Vuoi riassociarla ad un altro cliente?
                </p>
                
                <div className="form-group">
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>Seleziona nuovo cliente:</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #d1d5db',
                      borderRadius: '10px',
                      fontSize: '15px',
                      backgroundColor: 'white',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#B8860B'} // Focus oro
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  >
                    <option value="">-- Scegli un cliente --</option>
                    {customers
                      .filter(c => String(c.id) !== String(existingTag.oldCustomer.id))
                      .map(customer => (
                      <option key={customer.id} value={String(customer.id)}>
                        {customer.name} - {customer.phone || 'N/A'} - 💎 {customer.points} GEMME
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="modal-actions" style={{
              padding: '20px 24px 24px',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button 
                onClick={() => {
                  setShowConfirmDialog(false)
                  setExistingTag(null)
                  setSelectedCustomerId('')
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: '2px solid #6b7280',
                  backgroundColor: 'white',
                  color: '#6b7280',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#f9fafb'
                  e.target.style.borderColor = '#374151'
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = 'white'
                  e.target.style.borderColor = '#6b7280'
                }}
              >
                <span>❌</span>
                Annulla
              </button>
              <button 
                onClick={() => {
                  if (!selectedCustomerId) {
                    showNotification('Seleziona un cliente prima!', 'error')
                    return
                  }
                  const newCustomer = customers.find(c => String(c.id) === String(selectedCustomerId))
                  performAssociation(newCustomer, 'riassociazione')
                }}
                disabled={!selectedCustomerId}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: selectedCustomerId 
                    ? 'linear-gradient(135deg, #B8860B, #DAA520)' // Gradiente oro
                    : '#d1d5db',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: selectedCustomerId ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: selectedCustomerId ? '0 4px 12px rgba(184, 134, 11, 0.3)' : 'none'
                }}
                onMouseOver={(e) => {
                  if (selectedCustomerId) {
                    e.target.style.transform = 'translateY(-1px)'
                    e.target.style.boxShadow = '0 6px 16px rgba(184, 134, 11, 0.4)' // Hover oro
                  }
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = selectedCustomerId ? '0 4px 12px rgba(184, 134, 11, 0.3)' : 'none'
                }}
              >
                <span>🔄</span>
                Riassocia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NFCView