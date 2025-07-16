// NFCView ibrido - funziona sia online che con hardware
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

const NFCViewHybrid = ({ showNotification }) => {
  const [customers, setCustomers] = useState([])
  const [nfcAvailable, setNfcAvailable] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [manualTagId, setManualTagId] = useState('')
  const [associatedTags, setAssociatedTags] = useState([])
  const [nfcLogs, setNfcLogs] = useState([])
  const [activeTab, setActiveTab] = useState('scan')

  // Verifica se NFC è disponibile (Android + browser supportato)
  useEffect(() => {
    const checkNFC = async () => {
      if ('NDEFReader' in window) {
        try {
          new window.NDEFReader()
          setNfcAvailable(true)
          console.log('✅ NFC disponibile su questo dispositivo!')
        } catch (error) {
          console.log('❌ NFC non disponibile:', error)
          setNfcAvailable(false)
        }
      } else {
        console.log('🌐 Browser non supporta Web NFC API')
        setNfcAvailable(false)
      }
    }
    
    checkNFC()
  }, [])

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
      showNotification('Errore caricamento clienti', 'error')
    }
  }

  const loadAssociatedTags = async () => {
    try {
      const { data, error } = await supabase
        .from('nfc_tags')
        .select(`
          *,
          customer:customers(name, points, phone)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setAssociatedTags(data || [])
    } catch (error) {
      console.error('Errore caricamento tag:', error)
      showNotification('Errore caricamento tag associati', 'error')
    }
  }

  const loadNfcLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('nfc_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (error) throw error
      
      // Carica separatamente i dati del cliente per ogni log
      const logsWithCustomers = await Promise.all(
        (data || []).map(async (log) => {
          if (log.customer_id) {
            const { data: customer } = await supabase
              .from('customers')
              .select('name, points')
              .eq('id', log.customer_id)
              .single()
            
            return { ...log, customer }
          }
          return log
        })
      )
      
      setNfcLogs(logsWithCustomers)
    } catch (error) {
      console.error('Errore caricamento log:', error)
      showNotification('Errore caricamento log NFC', 'error')
    }
  }

  // Lettura NFC Web API (Android Chrome)
  const startNFCReading = async () => {
    if (!nfcAvailable) {
      showNotification('NFC non disponibile su questo dispositivo', 'error')
      return
    }

    try {
      setIsScanning(true)
      const ndef = new window.NDEFReader()
      
      showNotification('🔍 Avvicina un tag NFC...', 'info')
      
      ndef.addEventListener('reading', ({ serialNumber }) => {
        console.log('🏷️ Tag NFC letto:', serialNumber)
        handleTagRead(serialNumber)
        setIsScanning(false)
      })

      ndef.addEventListener('readingerror', () => {
        showNotification('❌ Errore lettura NFC', 'error')
        setIsScanning(false)
      })

      await ndef.scan()
      
    } catch (error) {
      console.error('Errore NFC:', error)
      showNotification('Errore durante la scansione NFC', 'error')
      setIsScanning(false)
    }
  }

  const handleTagRead = async (tagId) => {
    console.log('🔍 Tag letto:', tagId)
    
    // Normalizza il tag ID
    const normalizedTagId = tagId.replace(/:/g, '').toLowerCase()
    
    // Cerca se il tag è già associato
    const { data: existingTag } = await supabase
      .from('nfc_tags')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('tag_id', normalizedTagId)
      .eq('is_active', true)
      .single()

    if (existingTag?.customer) {
      // Log dell'accesso
      try {
        await supabase
          .from('nfc_logs')
          .insert([{
            tag_id: normalizedTagId,
            customer_id: existingTag.customer.id,
            action_type: 'customer_access_hybrid',
            created_at: new Date().toISOString()
          }])
        
        // Ricarica i log
        loadNfcLogs()
      } catch (logError) {
        console.error('Errore creazione log:', logError)
      }
      
      showNotification(`🎯 Cliente trovato: ${existingTag.customer.name}`, 'success')
    } else {
      showNotification(`🆕 Tag non associato: ${normalizedTagId}`, 'info')
      setManualTagId(normalizedTagId)
    }
  }

  const associateTag = async () => {
    if (!selectedCustomerId || !manualTagId) {
      showNotification('Seleziona un cliente e inserisci ID tag', 'error')
      return
    }

    try {
      const { error } = await supabase
        .from('nfc_tags')
        .insert({
          tag_id: manualTagId.toLowerCase(),
          customer_id: selectedCustomerId,
          created_at: new Date().toISOString()
        })

      if (error) throw error

      const customer = customers.find(c => c.id === selectedCustomerId)
      showNotification(`✅ Tag associato a ${customer?.name}!`, 'success')
      setManualTagId('')
      setSelectedCustomerId('')
      
      // Ricarica i dati
      loadAssociatedTags()
      
    } catch (error) {
      console.error('Errore associazione:', error)
      if (error.code === '23505') {
        showNotification('Tag già associato a un altro cliente', 'error')
      } else {
        showNotification('Errore durante l\'associazione', 'error')
      }
    }
  }

  const disassociateTag = async (tagId) => {
    try {
      const { error } = await supabase
        .from('nfc_tags')
        .update({ is_active: false })
        .eq('tag_id', tagId)

      if (error) throw error

      showNotification('✅ Tag disassociato con successo', 'success')
      loadAssociatedTags()
      
    } catch (error) {
      console.error('Errore disassociazione:', error)
      showNotification('Errore durante la disassociazione', 'error')
    }
  }

  useEffect(() => {
    const loadAllData = async () => {
      await loadCustomers()
      await loadAssociatedTags()
      await loadNfcLogs()
    }
    loadAllData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #B8860B 0%, #DAA520 50%, #CD853F 100%)',
        color: 'white',
        padding: '20px',
        borderRadius: '16px',
        marginBottom: '24px',
        textAlign: 'center'
      }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px' }}>
          📱 NFC Gestione Ibrida
        </h1>
        <p style={{ margin: 0, opacity: 0.9 }}>
          {nfcAvailable ? '✅ NFC Web API Disponibile' : '🌐 Modalità Web (senza NFC)'}
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '2px solid #e5e7eb'
      }}>
        {[
          { id: 'scan', label: '🔍 Scansione', icon: '📱' },
          { id: 'tags', label: '🏷️ Tag Associati', icon: '📋' },
          { id: 'logs', label: '📊 Log Attività', icon: '📈' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: activeTab === tab.id ? '#B8860B' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#6b7280',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px 8px 0 0',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Status NFC */}
      {activeTab === 'scan' && (
        <>
          <div style={{
            background: nfcAvailable ? '#dcfce7' : '#fef3c7',
            border: `2px solid ${nfcAvailable ? '#16a34a' : '#f59e0b'}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: nfcAvailable ? '#15803d' : '#92400e' }}>
              {nfcAvailable ? '📡 NFC Attivo' : '⚠️ NFC Non Disponibile'}
            </h3>
            <p style={{ margin: '0', fontSize: '14px', color: nfcAvailable ? '#15803d' : '#92400e' }}>
              {nfcAvailable 
                ? 'Puoi leggere tag NFC direttamente dal browser Chrome su Android!'
                : 'Utilizza la modalità manuale per inserire ID tag o QR code.'
              }
            </p>
          </div>

          {/* Controlli NFC */}
          {nfcAvailable && (
            <div style={{
              background: 'white',
              border: '2px solid #B8860B',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#8B4513' }}>🔍 Lettura NFC</h3>
              <button
                onClick={startNFCReading}
                disabled={isScanning}
                style={{
                  background: isScanning ? '#ccc' : 'linear-gradient(135deg, #B8860B, #DAA520)',
                  color: 'white',
                  border: 'none',
                  padding: '16px 32px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: isScanning ? 'not-allowed' : 'pointer',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {isScanning ? '🔄 Scansione in corso...' : '📱 Avvia Lettura NFC'}
              </button>
            </div>
          )}

          {/* Associazione Manuale */}
          <div style={{
            background: 'white',
            border: '2px solid #CD853F',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#8B4513' }}>✏️ Associazione Manuale</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#8B4513' }}>
                ID Tag NFC o QR Code:
              </label>
              <input
                type="text"
                value={manualTagId}
                onChange={(e) => setManualTagId(e.target.value)}
                placeholder="es: 04:A1:B2:C3:D4:E5:F6"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#8B4513' }}>
                Cliente:
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              >
                <option value="">Seleziona cliente...</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.points || 0} gemme
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={associateTag}
              disabled={!selectedCustomerId || !manualTagId}
              style={{
                background: (!selectedCustomerId || !manualTagId) ? '#ccc' : 'linear-gradient(135deg, #CD853F, #B8860B)',
                color: 'white',
                border: 'none',
                padding: '14px 28px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: (!selectedCustomerId || !manualTagId) ? 'not-allowed' : 'pointer',
                width: '100%'
              }}
            >
              🔗 Associa Tag
            </button>
          </div>

          {/* Info Browser */}
          <div style={{
            background: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            padding: '16px',
            fontSize: '13px',
            color: '#6b7280'
          }}>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong>💡 Info:</strong> Il NFC Web API funziona solo su:
            </p>
            <ul style={{ margin: '0', paddingLeft: '20px' }}>
              <li>Android con Chrome browser</li>
              <li>Connessione HTTPS (obbligatoria)</li>
              <li>Permessi NFC attivati nel browser</li>
            </ul>
          </div>
        </>
      )}

      {/* Tab Tag Associati */}
      {activeTab === 'tags' && (
        <div style={{
          background: 'white',
          border: '2px solid #CD853F',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#8B4513' }}>🏷️ Tag NFC Associati</h3>
            <button
              onClick={loadAssociatedTags}
              style={{
                background: '#B8860B',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              🔄 Ricarica
            </button>
          </div>
          
          {associatedTags.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏷️</div>
              <p>Nessun tag NFC associato</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {associatedTags.map(tag => (
                <div
                  key={tag.id}
                  style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '4px' }}>
                      🏷️ {tag.tag_id}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      Cliente: <strong>{tag.customer?.name || 'Sconosciuto'}</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      Associato: {new Date(tag.created_at).toLocaleDateString('it-IT')}
                    </div>
                  </div>
                  <button
                    onClick={() => disassociateTag(tag.tag_id)}
                    style={{
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    🗑️ Disassocia
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Log Attività */}
      {activeTab === 'logs' && (
        <div style={{
          background: 'white',
          border: '2px solid #CD853F',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#8B4513' }}>📊 Log Attività NFC</h3>
            <button
              onClick={loadNfcLogs}
              style={{
                background: '#B8860B',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              🔄 Ricarica
            </button>
          </div>
          
          {nfcLogs.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
              <p>Nessuna attività registrata</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {nfcLogs.map(log => (
                <div
                  key={log.id}
                  style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    padding: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937' }}>
                      {log.action_type === 'customer_access' || log.action_type === 'customer_access_hybrid' ? '👤' : '🔍'} {log.customer?.name || 'Cliente sconosciuto'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      Tag: {log.tag_id} • {log.action_type}
                    </div>
                    {log.customer && (
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {log.customer.points} gemme
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {new Date(log.created_at).toLocaleString('it-IT')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NFCViewHybrid
