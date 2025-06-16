import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import NFCToolProManager from '../../utils/NFCToolProManager'

const TabletNFCReader = ({ onCustomerFound, showNotification }) => {
  const [nfcManager] = useState(new NFCToolProManager())
  const [readerStatus, setReaderStatus] = useState({ connected: false, scanning: false })
  const [lastTag, setLastTag] = useState(null)
  const [autoScanMode, setAutoScanMode] = useState(false)

  useEffect(() => {
    // Setup callbacks del manager
    nfcManager.onStatusChange = (status) => {
      setReaderStatus(status)
      if (status.connected) {
        showNotification('✅ Lettore NFC connesso e pronto', 'success')
      }
    }

    nfcManager.onError = (error) => {
      showNotification(error, 'error')
    }

    nfcManager.onTagRead = async (tagData) => {
      setLastTag(tagData)
      await handleTagRead(tagData.tagId)
    }

    // Cleanup on unmount
    return () => {
      nfcManager.disconnect()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Gestione lettura tag
  const handleTagRead = async (tagId) => {
    try {
      // Cerca cliente nel database
      const { data: tagData, error } = await supabase
        .from('nfc_tags')
        .select(`
          tag_id,
          customer_id,
          customers (
            id,
            name,
            phone,
            email,
            points,
            created_at
          )
        `)
        .eq('tag_id', tagId)
        .eq('is_active', true)
        .single()

      if (error || !tagData || !tagData.customers) {
        showNotification(`❌ Tessera ${tagId.slice(-6)} non registrata`, 'error')
        return
      }

      const customer = tagData.customers

      // Log accesso
      await supabase
        .from('nfc_logs')
        .insert([{
          tag_id: tagId,
          customer_id: customer.id,
          action_type: 'tablet_access',
          read_method: 'tablet_hardware',
          created_at: new Date().toISOString()
        }])

      // Feedback successo
      showNotification(
        `✅ ${customer.name} - ${customer.points} GEMME`,
        'success'
      )

      // Callback al componente padre
      onCustomerFound(customer)

    } catch (err) {
      console.error('Errore ricerca cliente:', err)
      showNotification('Errore nella lettura della tessera', 'error')
    }
  }

  // Inizializzazione lettore
  const initializeReader = async () => {
    try {
      const success = await nfcManager.initializeReader()
      if (success) {
        setReaderStatus({ connected: true, scanning: false })
      }
    } catch {
      showNotification('Errore inizializzazione lettore NFC', 'error')
    }
  }

  // Toggle modalità auto-scan
  const toggleAutoScan = async () => {
    if (!readerStatus.connected) {
      await initializeReader()
      return
    }

    if (autoScanMode) {
      nfcManager.stopScan()
      setAutoScanMode(false)
      setReaderStatus(prev => ({ ...prev, scanning: false }))
      showNotification('⏸️ Modalità auto-scan disattivata', 'info')
    } else {
      await nfcManager.startTabletScan()
      setAutoScanMode(true)
      setReaderStatus(prev => ({ ...prev, scanning: true }))
      showNotification('▶️ Modalità auto-scan attivata', 'success')
    }
  }

  // Scansione singola
  const singleScan = async () => {
    if (!readerStatus.connected) {
      await initializeReader()
      return
    }

    showNotification('📖 Appoggia la tessera del cliente...', 'info')
    
    // Scansione temporanea di 10 secondi
    await nfcManager.startTabletScan()
    
    setTimeout(() => {
      if (!autoScanMode) {
        nfcManager.stopScan()
        showNotification('⏱️ Tempo scaduto per la lettura', 'warning')
      }
    }, 10000)
  }

  return (
    <div className="card border-primary shadow-lg">
      <div className="card-header bg-primary text-white">
        <h4 className="mb-0">
          <svg className="w-6 h-6 me-2 d-inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>            Lettore NFC Tool Pro
        </h4>
      </div>

      <div className="card-body">
        {/* Status lettore */}
        <div className="d-flex align-items-center mb-4">
          <div className={`badge ${readerStatus.connected ? 'bg-success' : 'bg-danger'} me-3 p-2`}>
            {readerStatus.connected ? '🟢 CONNESSO' : '🔴 DISCONNESSO'}
          </div>
          {readerStatus.scanning && (
            <div className="badge bg-info p-2">
              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
              SCANSIONE ATTIVA
            </div>
          )}
        </div>

        {/* Controlli principali - Tablet friendly */}
        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <button
              onClick={initializeReader}
              disabled={readerStatus.connected}
              className="btn btn-outline-primary btn-lg w-100 h-100"
            >
              <svg className="w-8 h-8 mb-2 d-block mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <div>Connetti NFC Tool Pro</div>
              <small className="text-muted">Inizializza lettore NFC</small>
            </button>
          </div>

          <div className="col-md-6">
            <button
              onClick={toggleAutoScan}
              disabled={!readerStatus.connected}
              className={`btn btn-lg w-100 h-100 ${autoScanMode ? 'btn-warning' : 'btn-success'}`}
            >
              <svg className="w-8 h-8 mb-2 d-block mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={autoScanMode ? "M10 9v6m4-6v6" : "M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V16"} />
              </svg>
              <div>{autoScanMode ? 'Ferma Auto-Scan' : 'Avvia Auto-Scan'}</div>
              <small className="text-muted">
                {autoScanMode ? 'Modalità continua attiva' : 'Lettura automatica'}
              </small>
            </button>
          </div>
        </div>

        {/* Scansione singola - Pulsante grande per tablet */}
        <div className="text-center mb-4">
          <button
            onClick={singleScan}
            disabled={!readerStatus.connected || autoScanMode}
            className="btn btn-primary btn-lg px-5 py-3"
            style={{ fontSize: '1.2rem' }}
          >
            <svg className="w-8 h-8 me-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            LEGGI TESSERA CLIENTE
          </button>
        </div>

        {/* Ultimo tag letto */}
        {lastTag && (
          <div className="alert alert-info">
            <strong>Ultimo tag:</strong> {lastTag.tagId.slice(-8)} 
            <small className="ms-2 text-muted">
              {new Date(lastTag.timestamp).toLocaleTimeString()}
            </small>
          </div>
        )}

        {/* Istruzioni per tablet */}
        <div className="alert alert-light border">
          <h6 className="alert-heading">📋 Istruzioni NFC Tool Pro:</h6>
          <ol className="mb-0 small">
            <li>Connetti NFC Tool Pro via USB al tablet</li>
            <li>Clicca "Connetti NFC Tool Pro" per inizializzare</li>
            <li>Usa "Auto-Scan" per modalità cassa continua</li>
            <li>Oppure "Leggi Tessera" per singole letture</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

export default TabletNFCReader
