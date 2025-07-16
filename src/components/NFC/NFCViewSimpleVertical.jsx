// NFCView semplice - senza tab, tutto verticale
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

const NFCViewSimpleVertical = ({ showNotification }) => {
  const [customers, setCustomers] = useState([])
  const [nfcAvailable, setNfcAvailable] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [tagName, setTagName] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [manualTagId, setManualTagId] = useState('')
  const [associatedTags, setAssociatedTags] = useState([])
  const [nfcLogs, setNfcLogs] = useState([])

  // Controllo disponibilità NFC
  useEffect(() => {
    const checkNFC = async () => {
      if ('NDEFReader' in window) {
        try {
          // Test rapido di permessi
          setNfcAvailable(true)
        } catch (error) {
          console.log('NFC non disponibile:', error)
          setNfcAvailable(false)
        }
      } else {
        console.log('NDEFReader non supportato')
        setNfcAvailable(false)
      }
    }

    checkNFC()
    loadCustomers()
    loadNfcTags()
    loadNfcLogs()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      const { data, error } = await supabase
        .from('nfc_tags')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAssociatedTags(data || [])
    } catch (error) {
      console.error('Errore caricamento tag NFC:', error)
      showNotification('❌ Errore nel caricamento tag', 'error')
    }
  }

  const loadNfcLogs = async () => {
    try {
      // Carica i log senza join per evitare errori di relazione
      const { data: logs, error } = await supabase
        .from('nfc_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (error) throw error
      
      // Carica i dati dei clienti separatamente
      if (logs && logs.length > 0) {
        const customerIds = [...new Set(logs.map(log => log.customer_id).filter(Boolean))]
        const { data: customers } = await supabase
          .from('customers')
          .select('id, name')
          .in('id', customerIds)
        
        // Associa i nomi dei clienti ai log
        const logsWithCustomers = logs.map(log => ({
          ...log,
          customer_name: customers?.find(c => c.id === log.customer_id)?.name || 'Sconosciuto'
        }))
        
        setNfcLogs(logsWithCustomers)
      } else {
        setNfcLogs([])
      }
    } catch (error) {
      console.error('Errore caricamento log NFC:', error)
      showNotification('❌ Errore nel caricamento log', 'error')
    }
  }

  const startNFCScan = async () => {
    if (!nfcAvailable) {
      showNotification('❌ NFC non disponibile su questo dispositivo', 'error')
      return
    }

    try {
      setIsScanning(true)
      showNotification('📱 Avvicina un tag NFC al telefono...', 'info')
      
      const ndef = new window.NDEFReader()
      
      const scanPromise = ndef.scan()
      
      ndef.addEventListener('reading', ({ serialNumber }) => {
        const tagId = serialNumber.toLowerCase()
        console.log('🏷️ Tag NFC letto:', tagId)
        
        handleTagRead(tagId)
        setIsScanning(false)
      })

      await scanPromise
      
    } catch (error) {
      console.error('Errore scansione NFC:', error)
      setIsScanning(false)
      
      if (error.name === 'NotAllowedError') {
        showNotification('❌ Permesso NFC negato. Abilita NFC nelle impostazioni.', 'error')
      } else {
        showNotification(`❌ Errore NFC: ${error.message}`, 'error')
      }
    }
  }

  const handleTagRead = async (tagId) => {
    try {
      // Cerca se il tag è già associato
      const { data: existingTag } = await supabase
        .from('nfc_tags')
        .select('*, customer:customers(*)')
        .eq('tag_id', tagId)
        .eq('is_active', true)
        .single()

      if (existingTag) {
        showNotification(`✅ Cliente trovato: ${existingTag.customer.name}`, 'success')
        // Puoi aggiungere qui logica per selezionare automaticamente il cliente
      } else {
        setManualTagId(tagId)
        showNotification(`🏷️ Nuovo tag rilevato: ${tagId}. Seleziona un cliente per associarlo.`, 'info')
      }

      // Registra il log
      await supabase
        .from('nfc_logs')
        .insert({
          tag_id: tagId,
          customer_id: existingTag?.customer_id || null,
          action_type: existingTag ? 'customer_access' : 'tag_read',
          details: existingTag ? `Accesso cliente: ${existingTag.customer.name}` : 'Tag non associato'
        })

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

  return (
    <div className="nfc-simple-container">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* HEADER */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 animate-fadeInUp">🏷️ Gestione NFC</h1>
          <p className="text-gray-600 mt-2">Sistema di lettura tag NFC per identificazione rapida clienti</p>
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
                <div className={`nfc-status-indicator ${nfcAvailable ? 'available' : 'unavailable'}`}></div>
                <span className="font-medium">
                  {nfcAvailable ? '✅ NFC Disponibile' : '❌ NFC Non Disponibile'}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {nfcAvailable ? 'Cellulare Android compatibile' : 'Usa un dispositivo Android con NFC'}
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
                  disabled={!nfcAvailable}
                  className={`btn btn-lg ${nfcAvailable ? 'btn-primary' : 'btn-secondary'}`}
                >
                  📱 {nfcAvailable ? 'Avvia Scansione NFC' : 'NFC Non Disponibile'}
                </button>
                <p className="text-sm text-gray-600 mt-4">
                  Tocca il pulsante e avvicina un tag NFC al telefono
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
              <div className="mb-4 p-3 bg-white rounded border">
                <strong>Tag rilevato:</strong> <span className="nfc-tag-code">{manualTagId}</span>
              </div>
              
              <div className="grid grid-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seleziona Cliente
                  </label>
                  <select 
                    value={selectedCustomerId} 
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Tag (opzionale)
                  </label>
                  <input
                    type="text"
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    placeholder="es. Tag NFC Principale"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-2 gap-4 mt-4">
                <button
                  onClick={() => setManualTagId('')}
                  className="btn btn-secondary"
                >
                  ❌ Annulla
                </button>
                <div>
                  <button
                    onClick={associateTag}
                    disabled={!selectedCustomerId}
                    className="btn btn-success w-full"
                  >
                    🔗 Associa Tag
                  </button>
                </div>
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
                      <div className="tag-header">
                        <div className="tag-name">{tag.tag_name}</div>
                        <button
                          onClick={() => disassociateTag(tag)}
                          className="btn btn-danger btn-sm"
                        >
                          🗑️ Rimuovi
                        </button>
                      </div>
                      <div className="tag-details">
                        <div>ID: <code>{tag.tag_id}</code></div>
                        <div>Cliente: {customer?.name || 'Non trovato'}</div>
                        <div>Creato: {new Date(tag.created_at).toLocaleDateString('it-IT')}</div>
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
                  <div key={log.id} className="nfc-log-item">
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
      </div>
    </div>
  )
}

export default NFCViewSimpleVertical
