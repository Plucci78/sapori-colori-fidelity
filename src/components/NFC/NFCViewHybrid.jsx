// NFCView Hybrid - Layout verticale con Bridge Raspberry Pi
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useNFC } from '../../hooks/useNFC'
import '../../styles/nfc-modal.css'
import '../../styles/nfc-view.css'

const NFCViewHybrid = ({ showNotification }) => {
  const [customers, setCustomers] = useState([])
  const [isScanning, setIsScanning] = useState(false)
  const [tagName, setTagName] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [manualTagId, setManualTagId] = useState('')
  const [associatedTags, setAssociatedTags] = useState([])
  const [nfcLogs, setNfcLogs] = useState([])
  
  // Stati per il modale di riassociazione
  const [showReassignModal, setShowReassignModal] = useState(false)
  const [existingTagData, setExistingTagData] = useState(null)
  const [newCustomerId, setNewCustomerId] = useState('')

  // Usa il nostro hook NFC che gestisce sia Web NFC che Bridge Raspberry
  const {
    isNFCAvailable,
    isScanning: nfcHookScanning,
    lastScannedData,
    error: nfcError,
    nfcMethod,
    readNFC,
    detectNFCCapability
  } = useNFC()

  // Inizializzazione
  useEffect(() => {
    loadCustomers()
    loadNfcTags()
    loadNfcLogs()
  }, [])

  // Gestisce i dati scansionati dall'hook
  useEffect(() => {
    if (lastScannedData) {
      handleNFCData(lastScannedData)
    }
  }, [lastScannedData])

  // Gestisce errori dall'hook
  useEffect(() => {
    if (nfcError) {
      setIsScanning(false)
      showNotification(`❌ Errore NFC: ${nfcError}`, 'error')
    }
  }, [nfcError])

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name')

      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('Errore caricamento clienti:', error)
      showNotification('❌ Errore nel caricamento clienti', 'error')
    }
  }

  const loadNfcTags = async () => {
    try {
      console.log('🏷️ Caricamento tag NFC da Supabase...')
      const { data, error } = await supabase
        .from('nfc_tags')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Errore query tag NFC:', error)
        throw error
      }
      
      console.log(`✅ Caricati ${data?.length || 0} tag NFC`)
      setAssociatedTags(data || [])
    } catch (error) {
      console.error('❌ Errore caricamento tag NFC:', error)
      if (showNotification) {
        showNotification('❌ Errore nel caricamento tag', 'error')
      }
      // Non bloccare l'app
      setAssociatedTags([])
    }
  }

  const loadNfcLogs = async () => {
    try {
      console.log('📊 Caricamento log NFC da Supabase...')
      // Carica i log senza join per evitare errori di relazione
      const { data: logs, error } = await supabase
        .from('nfc_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (error) {
        console.error('❌ Errore query log NFC:', error)
        throw error
      }
      
      console.log(`✅ Caricati ${logs?.length || 0} log NFC`)
      
      // Carica i dati dei clienti separatamente solo se ci sono log
      if (logs && logs.length > 0) {
        const customerIds = [...new Set(logs.map(log => log.customer_id).filter(Boolean))]
        if (customerIds.length > 0) {
          const { data: customers, error: customerError } = await supabase
            .from('customers')
            .select('id, name')
            .in('id', customerIds)
          
          if (customerError) {
            console.error('❌ Errore query clienti per log:', customerError)
            // Continua comunque senza nomi clienti
          }
          
          // Associa i nomi dei clienti ai log
          const logsWithCustomers = logs.map(log => ({
            ...log,
            customer_name: customers?.find(c => c.id === log.customer_id)?.name || 'Sconosciuto'
          }))
          
          setNfcLogs(logsWithCustomers)
        } else {
          setNfcLogs(logs)
        }
      } else {
        setNfcLogs([])
      }
    } catch (error) {
      console.error('❌ Errore caricamento log NFC:', error)
      if (showNotification) {
        showNotification('❌ Errore nel caricamento log', 'error')
      }
      // Non bloccare l'app
      setNfcLogs([])
    }
  }

  // Gestisce i dati NFC ricevuti dall'hook
  const handleNFCData = async (nfcData) => {
    let tagId = null
    
    // Estrai l'ID del tag a seconda del metodo
    if (nfcData.method === 'raspberry-bridge') {
      tagId = nfcData.uid || nfcData.data
    } else if (nfcData.method === 'web-nfc') {
      tagId = nfcData.data
    }
    
    if (tagId) {
      console.log('📱 Tag NFC letto:', tagId)
      await handleTagRead(tagId.toLowerCase())
    }
    
    setIsScanning(false)
  }

  const startNFCScan = async () => {
    if (!isNFCAvailable) {
      showNotification('❌ NFC non disponibile su questo dispositivo', 'error')
      return
    }

    try {
      setIsScanning(true)
      showNotification(`Appoggia la tessera ${nfcMethod === 'raspberry-bridge' ? 'sul lettore' : 'NFC sul telefono'}...`, 'info')
      
      // Usa il nostro hook per leggere NFC (gestisce automaticamente Web NFC o Bridge)
      await readNFC()
      
    } catch (error) {
      console.error('Errore scansione NFC:', error)
      setIsScanning(false)
      showNotification(`❌ Errore NFC: ${error.message}`, 'error')
    }
  }

  const handleTagRead = async (tagId) => {
    try {
      console.log('🔍 Cercando tag:', tagId)
      
      // Prima cerca i tag senza join per evitare errori 404
      const { data: existingTags, error } = await supabase
        .from('nfc_tags')
        .select('*')
        .eq('tag_id', tagId)
        .eq('is_active', true)

      if (error) {
        console.error('Errore ricerca tag:', error)
        throw error
      }

      console.log('🏷️ Tag trovati:', existingTags)

      const existingTag = existingTags && existingTags.length > 0 ? existingTags[0] : null

      if (existingTag) {
        // Se il tag esiste, cerca i dati del cliente separatamente
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', existingTag.customer_id)
          .single()

        if (customerError) {
          console.error('Errore caricamento cliente:', customerError)
          // Continua comunque con i dati del tag
        }

        const customerName = customerData?.name || 'Cliente sconosciuto'
        console.log('✅ Tag esistente trovato per:', customerName)
        
        // Tag già associato - mostra modale per riassociazione
        setExistingTagData({
          ...existingTag,
          tag_id: tagId,
          customer: customerData || { name: customerName }
        })
        setShowReassignModal(true)
        showNotification(`⚠️ Attenzione: Tag già associato a ${customerName}`, 'warning')
        
        // Registra il log per tag esistente
        await supabase
          .from('nfc_logs')
          .insert({
            tag_id: tagId,
            customer_id: existingTag.customer_id,
            action_type: 'customer_access',
            details: `Accesso cliente: ${customerName}`
          })
      } else {
        console.log('🆕 Tag nuovo o non associato')
        setManualTagId(tagId)
        showNotification(`🏷️ Nuovo tag rilevato: ${tagId}. Seleziona un cliente per associarlo.`, 'info')
        
        // Registra il log per tag nuovo
        await supabase
          .from('nfc_logs')
          .insert({
            tag_id: tagId,
            customer_id: null,
            action_type: 'tag_read',
            details: 'Tag non associato'
          })
      }

      // Ricarica i log
      loadNfcLogs()
      
    } catch (error) {
      console.error('Errore gestione tag:', error)
      showNotification('❌ Errore nella gestione del tag', 'error')
    }
  }

  const associateTag = async () => {
    if (!selectedCustomerId || !manualTagId) {
      showNotification('❌ Seleziona un cliente e assicurati che ci sia un tag da associare', 'error')
      return
    }

    try {
      const customer = customers.find(c => c.id === selectedCustomerId)
      const finalTagName = tagName || `Tag ${customer?.name || 'Sconosciuto'}`

      const { error } = await supabase
        .from('nfc_tags')
        .insert({
          tag_id: manualTagId,
          customer_id: selectedCustomerId,
          tag_name: finalTagName,
          is_active: true
        })

      if (error) throw error

      showNotification(`✅ Tag associato al cliente ${customer?.name}!`, 'success')
      
      // Reset dei campi
      setManualTagId('')
      setSelectedCustomerId('')
      setTagName('')
      
      // Ricarica dati
      loadNfcTags()
      
    } catch (error) {
      console.error('Errore associazione tag:', error)
      if (error.code === '23505') {
        showNotification('❌ Questo tag è già associato a un cliente', 'error')
      } else {
        showNotification('❌ Errore nell\'associazione del tag', 'error')
      }
    }
  }

  const disassociateTag = async (tag) => {
    if (!confirm(`Sei sicuro di voler disassociare il tag "${tag.tag_name}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('nfc_tags')
        .update({ is_active: false })
        .eq('id', tag.id)

      if (error) throw error

      showNotification(`🗑️ Tag "${tag.tag_name}" disassociato!`, 'success')
      loadNfcTags()
      
    } catch (error) {
      console.error('Errore disassociazione tag:', error)
      showNotification('❌ Errore nella disassociazione', 'error')
    }
  }

  const reassignTag = async () => {
    if (!newCustomerId || !existingTagData) {
      showNotification('❌ Seleziona un cliente per la riassociazione', 'error')
      return
    }

    try {
      const newCustomer = customers.find(c => c.id === newCustomerId)
      
      // Disattiva il tag esistente
      await supabase
        .from('nfc_tags')
        .update({ is_active: false })
        .eq('id', existingTagData.id)

      // Crea una nuova associazione
      const { error } = await supabase
        .from('nfc_tags')
        .insert({
          tag_id: existingTagData.tag_id,
          customer_id: newCustomerId,
          tag_name: `Tag ${newCustomer?.name || 'Sconosciuto'}`,
          is_active: true
        })

      if (error) throw error

      showNotification(`✅ Tag riassociato al cliente ${newCustomer?.name}!`, 'success')
      
      // Reset e chiudi modale
      setShowReassignModal(false)
      setExistingTagData(null)
      setNewCustomerId('')
      
      // Ricarica dati
      loadNfcTags()
      loadNfcLogs()
      
    } catch (error) {
      console.error('Errore riassociazione tag:', error)
      showNotification('❌ Errore nella riassociazione del tag', 'error')
    }
  }

  const cancelReassign = () => {
    setShowReassignModal(false)
    setExistingTagData(null)
    setNewCustomerId('')
  }

  return (
    <div className="nfc-simple-container">
      <div className="nfc-page-wrapper">
        {/* HEADER */}
        <div className="nfc-header">
          <h1 className="nfc-title">🏷️ Gestione NFC</h1>
          <p className="nfc-subtitle">Sistema di lettura tag NFC per identificazione rapida clienti</p>
        </div>

        {/* STATO NFC */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Stato Sistema NFC
            </h2>
          </div>
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`nfc-status-indicator ${isNFCAvailable ? 'available' : 'unavailable'}`}></div>
                <span className="font-medium">
                  {nfcMethod === 'raspberry-bridge' ? '🍓 Bridge Raspberry Pi Connesso' : 
                   nfcMethod === 'web-nfc' ? '✅ NFC Mobile Disponibile' : 
                   isNFCAvailable === false ? '❌ NFC Non Disponibile' : '🔍 Rilevamento NFC...'}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {nfcMethod === 'raspberry-bridge' ? 'Lettore ACR122U collegato al Raspberry' : 
                 nfcMethod === 'web-nfc' ? 'Cellulare Android compatibile' : 
                 'Sistema NFC non disponibile'}
              </div>
            </div>
          </div>
        </div>

        {/* SCANSIONE NFC */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Lettura Tag NFC
            </h2>
          </div>
          <div className="card-body">
            {!isScanning ? (
              <div className="text-center">
                <button
                  onClick={startNFCScan}
                  disabled={!isNFCAvailable}
                  className={`btn btn-lg ${isNFCAvailable ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {nfcMethod === 'raspberry-bridge' ? '🍓 Scansiona con Bridge Raspberry' : 
                   nfcMethod === 'web-nfc' ? '📱 Avvia Scansione NFC Mobile' : 
                   '❌ NFC Non Disponibile'}
                </button>
                <p className="text-sm text-gray-600 mt-4">
                  {nfcMethod === 'raspberry-bridge' ? 
                    'Tocca il pulsante e appoggia il tag sul lettore' : 
                    'Tocca il pulsante e avvicina un tag NFC al telefono'}
                </p>
              </div>
            ) : (
              <div className="nfc-scanning-container">
                <div className="nfc-scanning-pulse">📱</div>
                <h3 className="text-xl font-bold text-blue-700 mt-4">Scansione in corso...</h3>
                <p className="text-blue-600 mt-2">Avvicina un tag NFC al telefono</p>
                <button 
                  onClick={() => setIsScanning(false)}
                  className="btn btn-secondary btn-sm mt-4"
                >
                  ❌ Annulla
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ASSOCIAZIONE TAG */}
        {manualTagId && (
          <div className="nfc-tag-association">
            <div className="card-header">
              <h2 className="card-title">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Associa Tag a Cliente
              </h2>
            </div>
            <div className="card-body">
              <div className="nfc-tag-detected">
                <strong>Tag rilevato:</strong> <span className="nfc-tag-code">{manualTagId}</span>
              </div>
              
              <div className="association-form-grid">
                <div>
                  <label>Seleziona Cliente</label>
                  <select 
                    value={selectedCustomerId} 
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                  >
                    <option value="">-- Seleziona Cliente --</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} 
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label>Nome Tag (opzionale)</label>
                  <input
                    type="text"
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    placeholder="es. Tag NFC Principale"
                  />
                </div>
              </div>
              
              <div className="nfc-association-buttons">
                <button
                  onClick={() => setManualTagId('')}
                  className="btn-cancel-association"
                >
                  ❌ Annulla
                </button>
                <button
                  onClick={associateTag}
                  disabled={!selectedCustomerId}
                  className="btn-associate"
                >
                  <span>🔗 Associa Tag</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAG ASSOCIATI */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 714.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 713.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 713.138-3.138z" />
              </svg>
              Tag Associati ({associatedTags.length})
            </h2>
          </div>
          <div className="card-body">
            {associatedTags.length > 0 ? (
              <div className="nfc-tags-grid">
                {associatedTags.map(tag => {
                  const customer = customers.find(c => c.id === tag.customer_id)
                  return (
                    <div key={tag.id} className="nfc-tag-item">
                      <div className="tag-inner-border"></div>
                      
                      <div className="tag-header">
                        <div className="tag-name">{tag.tag_name}</div>
                        <div className="tag-actions">
                          <button
                            onClick={() => disassociateTag(tag)}
                            className="btn-tag-remove"
                          >
                            🗑️ Rimuovi
                          </button>
                        </div>
                      </div>

                      <div className="tag-main-content">
                        <div className="tag-id-section">
                          <div className="tag-id-label">Codice Tag NFC</div>
                          <div className="tag-id-value">{tag.tag_id}</div>
                        </div>

                        <div className="tag-details">
                          <div className="tag-detail-item">
                            <div className="tag-detail-label">Cliente</div>
                            <div className="tag-detail-value">{customer?.name || 'Non trovato'}</div>
                          </div>
                          <div className="tag-detail-item">
                            <div className="tag-detail-label">Data Creazione</div>
                            <div className="tag-detail-value">{new Date(tag.created_at).toLocaleDateString('it-IT')}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="nfc-empty-state">
                <svg className="mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <h3>Nessun tag associato</h3>
                <p>Scansiona un tag NFC per iniziare l'associazione</p>
              </div>
            )}
          </div>
        </div>

        {/* LOG ATTIVITÀ */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Registro Attività ({nfcLogs.length})
            </h2>
          </div>
          <div className="card-body">
            {nfcLogs.length > 0 ? (
              <div className="nfc-logs-container">
                {nfcLogs.map(log => (
                  <div key={log.id} className="nfc-log-item" data-type={log.action_type}>
                    <div className="log-content">
                      <div className="log-icon">
                        {log.action_type === 'customer_access' ? '👤' :
                         log.action_type === 'tag_read' ? '📱' :
                         log.action_type === 'registration' ? '✅' : '📋'}
                      </div>
                      <div className="log-details">
                        <div className="log-action">
                          {log.action_type === 'customer_access' ? 'Accesso Cliente' :
                           log.action_type === 'tag_read' ? 'Lettura Tag' :
                           log.action_type === 'registration' ? 'Registrazione' : log.action_type}
                        </div>
                        <div className="log-info">
                          Tag: {log.tag_id} • {log.customer_name || 'Nessun cliente'}
                        </div>
                      </div>
                    </div>
                    <div className="log-time">
                      {new Date(log.created_at).toLocaleString('it-IT')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="nfc-empty-state">
                <svg className="mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3>Nessuna attività registrata</h3>
                <p>I log delle scansioni NFC appariranno qui</p>
              </div>
            )}
          </div>
        </div>

        {/* MODALE RIASSOCIAZIONE TAG */}
        {showReassignModal && existingTagData && (
          <div className="nfc-modal-overlay">
            <div className="nfc-modal-content">
              <div className="nfc-modal-header">
                <h3 className="nfc-modal-title">
                  ⚠️ Tag Già Associato
                </h3>
                <div className="nfc-modal-info">
                  <p>
                    <strong>Tag ID:</strong> <code>{existingTagData.tag_id}</code>
                  </p>
                  <p>
                    <strong>Attualmente associato a:</strong> {existingTagData.customer?.name}
                  </p>
                </div>
                <p className="nfc-modal-description">
                  Vuoi riassociare questo tag a un nuovo cliente?
                </p>
              </div>

              <div className="nfc-modal-form">
                <label className="nfc-modal-label">
                  Seleziona Nuovo Cliente
                </label>
                <select 
                  value={newCustomerId} 
                  onChange={(e) => setNewCustomerId(e.target.value)}
                  className="nfc-modal-select"
                >
                  <option value="">-- Seleziona Cliente --</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="nfc-modal-actions">
                <button
                  onClick={cancelReassign}
                  className="nfc-modal-btn nfc-modal-btn-cancel"
                >
                  ❌ Annulla
                </button>
                <button
                  onClick={reassignTag}
                  disabled={!newCustomerId}
                  className="nfc-modal-btn nfc-modal-btn-primary"
                >
                  🔄 Riassocia
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default NFCViewHybrid
