import { useState, useEffect, memo, useCallback } from 'react'
import { supabase } from '../../supabase'
import TabletNFCReader from './TabletNFCReader'
import Trust3700FReaderWebSerial from './Trust3700FReaderWebSerial'

const NFCView = memo(({ showNotification }) => {
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [isReading, setIsReading] = useState(false)
  const [nfcTags, setNfcTags] = useState([])
  const [customers, setCustomers] = useState([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [tagName, setTagName] = useState('')
  const [lastReadTag, setLastReadTag] = useState(null)
  const [nfcLogs, setNfcLogs] = useState([])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [existingTag, setExistingTag] = useState(null)
  const [deviceType, setDeviceType] = useState('unknown')

  // Rileva tipo dispositivo
  const detectDeviceType = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const forceDevice = urlParams.get('device')
    if (forceDevice === 'tablet') {
      console.log('🔧 MODALITÀ TABLET FORZATA VIA URL')
      return 'tablet'
    }

    const hasTouch = 'ontouchstart' in window
    const screenWidth = window.screen.width
    const userAgent = navigator.userAgent.toLowerCase()
    const isAndroidTablet = userAgent.includes('android') && !userAgent.includes('mobile')
    const isLenovoTablet = userAgent.includes('lenovo')

    if (isLenovoTablet) {
      console.log('✅ LENOVO TAB M11 RICONOSCIUTO!')
      return 'tablet'
    }

    if (hasTouch && screenWidth >= 768 && screenWidth <= 1920) {
      console.log('✅ Rilevato: TABLET')
      return 'tablet'
    }

    if (isAndroidTablet) {
      console.log('✅ Rilevato: TABLET (Android)')
      return 'tablet'
    }

    if (hasTouch && screenWidth < 768) {
      console.log('✅ Rilevato: MOBILE')
      return 'mobile'
    } else {
      console.log('✅ Rilevato: DESKTOP')
      return 'desktop'
    }
  }, [])

  // Carica dati all'avvio
  useEffect(() => {
    const detected = detectDeviceType()
    setDeviceType(detected)
    loadCustomers()
    loadNfcTags()
    loadNfcLogs()
  }, [detectDeviceType])

  // Carica clienti
  const loadCustomers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('Errore caricamento clienti:', error)
      if (showNotification) {
        showNotification('Errore caricamento clienti', 'error')
      }
    }
  }, [showNotification])

  // Carica tag NFC
  const loadNfcTags = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('nfc_tags')
        .select(`
          *,
          customer:customers(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setNfcTags(data || [])
    } catch (error) {
      console.error('Errore caricamento tag NFC:', error)
    }
  }, [])

  // Carica log NFC
  const loadNfcLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('nfc_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setNfcLogs(data || [])
    } catch (error) {
      console.error('Errore caricamento log NFC:', error)
    }
  }, [])

  // Gestione lettura tag
  const handleTagRead = useCallback(async (tag) => {
    console.log('� Tag letto:', tag)
    setLastReadTag(tag)

    // Verifica se il tag esiste già
    const existingTagData = nfcTags.find(nfcTag => nfcTag.tag_id === tag.id)

    if (existingTagData) {
      setExistingTag(existingTagData)
      setShowConfirmDialog(true)
    }

    if (showNotification) {
      showNotification(`Tag letto: ${tag.id?.slice(-8) || 'N/A'}`, 'info')
    }
  }, [nfcTags, showNotification])

  // Associa tag a cliente
  const associateTag = useCallback(async () => {
    if (!lastReadTag || !selectedCustomerId || !tagName.trim()) {
      showNotification('Compila tutti i campi richiesti', 'error')
      return
    }

    try {
      const { error } = await supabase
        .from('nfc_tags')
        .insert([{
          tag_id: lastReadTag.id,
          customer_id: selectedCustomerId,
          tag_name: tagName.trim(),
          device_info: `${deviceType} - ${navigator.userAgent}`,
          is_active: true
        }])

      if (error) throw error

      // Log dell'associazione
      await supabase.from('nfc_logs').insert([{
        tag_id: lastReadTag.id,
        action_type: 'tag_association',
        device_info: `${deviceType} - Associate to customer`,
        customer_id: selectedCustomerId
      }])

      showNotification('Tag associato con successo!', 'success')

      // Reset form
      setSelectedCustomerId('')
      setTagName('')
      setLastReadTag(null)

      // Ricarica dati
      loadNfcTags()
      loadNfcLogs()

    } catch (error) {
      console.error('Errore associazione tag:', error)
      showNotification('Errore durante l\'associazione del tag', 'error')
    }
  }, [lastReadTag, selectedCustomerId, tagName, deviceType, showNotification, loadNfcTags, loadNfcLogs])

  // Riassocia tag esistente
  const reassociateTag = useCallback(async () => {
    if (!existingTag || !selectedCustomerId) return

    try {
      const { error } = await supabase
        .from('nfc_tags')
        .update({
          customer_id: selectedCustomerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingTag.id)

      if (error) throw error

      showNotification('Tag riassociato con successo!', 'success')
      setShowConfirmDialog(false)
      setExistingTag(null)
      setSelectedCustomerId('')
      loadNfcTags()

    } catch (error) {
      console.error('Errore riassociazione tag:', error)
      showNotification('Errore durante la riassociazione', 'error')
    }
  }, [existingTag, selectedCustomerId, showNotification, loadNfcTags])

  return (
    <div style={{ padding: '20px' }}>
      <h1>📱 Sistema NFC - uTrust 3700F</h1>

      {/* Status Device */}
      <div style={{
        background: '#f8f9fa',
        padding: '15px',
        margin: '10px 0',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h3>📍 Stato Dispositivo</h3>
        <p><strong>Tipo:</strong> {deviceType}</p>
        <p><strong>Demo Mode:</strong> {isDemoMode ? 'Attivo' : 'Disattivo'}</p>
        <p><strong>Ultimo Tag:</strong> {lastReadTag?.id?.slice(-8) || 'Nessuno'}</p>

        <button
          onClick={() => setIsDemoMode(!isDemoMode)}
          style={{
            padding: '8px 16px',
            background: isDemoMode ? '#dc3545' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          {isDemoMode ? 'Disattiva Demo' : 'Attiva Demo'}
        </button>
      </div>

      {/* Desktop - uTrust 3700F Reader */}
      {deviceType === 'desktop' && (
        <div style={{
          margin: '20px 0',
          padding: '20px',
          background: 'white',
          border: '2px solid #007bff',
          borderRadius: '8px'
        }}>
          <h3>� uTrust 3700F Reader (Serial/HID)</h3>
          <Trust3700FReaderWebSerial
            onTagRead={handleTagRead}
            onError={(error) => {
              console.error('❌ Errore lettore:', error)
              if (showNotification) {
                showNotification(`Errore lettore: ${error.message}`, 'error')
              }
            }}
            onCustomerFound={(customer) => {
              console.log('👤 Cliente trovato:', customer)
              if (showNotification) {
                showNotification(`Cliente: ${customer.name} - ${customer.points} GEMME`, 'success')
              }
            }}
            showNotification={showNotification}
            isDemoMode={isDemoMode}
          />
        </div>
      )}

      {/* Mobile/Tablet - uTrust 3700F Reader */}
      {(deviceType === 'mobile' || deviceType === 'tablet') && (
        <div style={{
          margin: '20px 0',
          padding: '20px',
          background: 'white',
          border: '2px solid #007bff',
          borderRadius: '8px'
        }}>
          <h3>🔥 uTrust 3700F Reader ({deviceType})</h3>
          <Trust3700FReaderWebSerial
            onTagRead={handleTagRead}
            onError={(error) => {
              console.error('❌ Errore lettore:', error)
              if (showNotification) {
                showNotification(`Errore lettore: ${error.message}`, 'error')
              }
            }}
            onCustomerFound={(customer) => {
              console.log('👤 Cliente trovato:', customer)
              if (showNotification) {
                showNotification(`Cliente: ${customer.name} - ${customer.points} GEMME`, 'success')
              }
            }}
            showNotification={showNotification}
            isDemoMode={isDemoMode}
          />
        </div>
      )}

      {/* Form Associazione Tag */}
      {lastReadTag && (
        <div style={{
          margin: '20px 0',
          padding: '20px',
          background: '#fff3cd',
          border: '2px solid #ffc107',
          borderRadius: '8px'
        }}>
          <h3>🏷️ Associa Tag al Cliente</h3>
          <p><strong>Tag ID:</strong> {lastReadTag.id}</p>

          <div style={{ marginBottom: '15px' }}>
            <label>Nome Tag:</label>
            <input
              type="text"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder="es. Carta Cliente Rossi"
              style={{
                width: '100%',
                padding: '8px',
                margin: '5px 0',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>Cliente:</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                margin: '5px 0',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            >
              <option value="">Seleziona cliente...</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.phone} ({customer.points} GEMME)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={associateTag}
            disabled={!selectedCustomerId || !tagName.trim()}
            style={{
              padding: '10px 20px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            Associa Tag
          </button>

          <button
            onClick={() => {
              setLastReadTag(null)
              setSelectedCustomerId('')
              setTagName('')
            }}
            style={{
              padding: '10px 20px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Annulla
          </button>
        </div>
      )}

      {/* Dialog Conferma Riassociazione */}
      {showConfirmDialog && existingTag && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3>⚠️ Tag già associato</h3>
            <p>Il tag è già associato a: <strong>{existingTag.customer?.name}</strong></p>
            <p>Vuoi riassociarlo a un altro cliente?</p>

            <div style={{ marginBottom: '15px' }}>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                <option value="">Seleziona nuovo cliente...</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.phone}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={reassociateTag}
              disabled={!selectedCustomerId}
              style={{
                padding: '10px 20px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              Riassocia
            </button>

            <button
              onClick={() => {
                setShowConfirmDialog(false)
                setExistingTag(null)
                setSelectedCustomerId('')
              }}
              style={{
                padding: '10px 20px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Lista Tag Associati */}
      <div style={{
        margin: '20px 0',
        padding: '20px',
        background: 'white',
        border: '1px solid #dee2e6',
        borderRadius: '8px'
      }}>
        <h3>📋 Tag NFC Associati ({nfcTags.length})</h3>

        {nfcTags.length === 0 ? (
          <p>Nessun tag associato</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6' }}>Tag ID</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6' }}>Nome</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6' }}>Cliente</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6' }}>Status</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6' }}>Creato</th>
                </tr>
              </thead>
              <tbody>
                {nfcTags.map(tag => (
                  <tr key={tag.id}>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>
                      {tag.tag_id.slice(-8)}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>
                      {tag.tag_name}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>
                      {tag.customer?.name || 'N/A'}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: tag.is_active ? '#d4edda' : '#f8d7da',
                        color: tag.is_active ? '#155724' : '#721c24'
                      }}>
                        {tag.is_active ? 'Attivo' : 'Inattivo'}
                      </span>
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>
                      {new Date(tag.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Attività */}
      <div style={{
        margin: '20px 0',
        padding: '20px',
        background: 'white',
        border: '1px solid #dee2e6',
        borderRadius: '8px'
      }}>
        <h3>📜 Log Attività NFC (Ultimi 50)</h3>

        {nfcLogs.length === 0 ? (
          <p>Nessuna attività registrata</p>
        ) : (
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {nfcLogs.map(log => (
              <div key={log.id} style={{
                padding: '8px',
                margin: '5px 0',
                background: '#f8f9fa',
                borderRadius: '4px',
                fontSize: '14px'
              }}>
                <strong>{new Date(log.created_at).toLocaleString()}</strong> -
                {log.action_type} - Tag: {log.tag_id?.slice(-8) || 'N/A'}
                {log.device_info && ` - ${log.device_info}`}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})

NFCView.displayName = 'NFCView'

export default NFCView