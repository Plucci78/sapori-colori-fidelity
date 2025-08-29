import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase'
import { useNFC } from '../../hooks/useNFC'
import workflowExecutor from '../../services/workflowExecutor' // Aggiunto import per workflowExecutor

const NFCQuickReaderHybrid = ({ onCustomerFound, showNotification }) => {
  const [isScanning, setIsScanning] = useState(false)
  const [manualTagId, setManualTagId] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)
  const mounted = useRef(true)

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

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  // Mostra lo stato NFC attuale
  useEffect(() => {
    if (nfcMethod) {
      if (nfcMethod === 'web-nfc') {
        console.log('✅ Web NFC API supportata')
      } else if (nfcMethod === 'raspberry-bridge') {
        console.log('✅ Bridge Raspberry Pi disponibile')
      }
    } else if (isNFCAvailable === false) {
      console.log('⚠️ NFC non disponibile - modalità manuale disponibile')
    }
  }, [nfcMethod, isNFCAvailable])

  // Gestisce i dati scansionati dall'hook
  useEffect(() => {
    if (lastScannedData && mounted.current) {
      handleNFCData(lastScannedData)
    }
  }, [lastScannedData])

  // Gestisce errori dall'hook
  useEffect(() => {
    if (nfcError && mounted.current) {
      setIsScanning(false)
      showNotification(`❌ Errore NFC: ${nfcError}`, 'error')
    }
  }, [nfcError])

  const findCustomerByTag = async (tagId) => {
    try {
      // Normalizza il tag ID
      const normalizedTagId = tagId.replace(/:/g, '').toLowerCase()
      
      // Prima cerchiamo il tag
      const { data: tagData, error: tagError } = await supabase
        .from('nfc_tags')
        .select('tag_id, customer_id')
        .eq('tag_id', normalizedTagId)
        .eq('is_active', true)
        .single()

      if (tagError || !tagData) {
        showNotification(`Tessera ${normalizedTagId.slice(-6)} non registrata`, 'error')
        return null
      }

      // Poi cerchiamo il cliente (incluso avatar_url)
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id, name, phone, email, points, wallet_balance, created_at, avatar_url, birth_date')
        .eq('id', tagData.customer_id)
        .single()

      if (customerError || !customerData) {
        showNotification(`Cliente non trovato per tessera ${normalizedTagId.slice(-6)}`, 'error')
        return null
      }

      // Log dell'accesso
      await supabase
        .from('nfc_logs')
        .insert([{
          tag_id: normalizedTagId,
          customer_id: customerData.id,
          action_type: 'customer_access_hybrid',
          created_at: new Date().toISOString()
        }])

      showNotification(`✅ ${customerData.name} - ${customerData.points} GEMME`, 'success')
      return customerData

    } catch (error) {
      console.error('Errore ricerca cliente:', error)
      showNotification('Errore nella lettura della tessera', 'error')
      return null
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
      const customer = await findCustomerByTag(tagId)
      if (customer && mounted.current) {
        onCustomerFound(customer)
        
        // NUOVO: Esegui il trigger workflow per NFC scan e importa direttamente il servizio notifiche
        try {
          console.log('🔄 [DEBUG] Esecuzione trigger nfc_scan per cliente:', customer.id)
          showNotification(`Esecuzione trigger NFC per ${customer.name}...`, 'info')
          
          // Importa e usa direttamente il servizio notificationWorkflowService
          const notificationModulePromise = import('../../services/notificationWorkflowService')
            .then(module => {
              console.log('✅ [DEBUG] Modulo notifiche importato con successo', Object.keys(module));
              return module.notificationWorkflowService;
            })
            .catch(err => {
              console.error('❌ [DEBUG] Errore importazione modulo notifiche:', err);
              return null;
            });
            
          // Chiamata parallela al workflow executor per email
          const workflowPromise = workflowExecutor.onNFCScan(customer)
            .then(result => {
              console.log('✅ [DEBUG] Risultato trigger nfc_scan (email):', result);
              return result;
            })
            .catch(err => {
              console.error('❌ [DEBUG] Errore trigger nfc_scan (email):', err);
              return null;
            });
            
          // Attendi entrambe le operazioni
          const [notificationService, workflowResult] = await Promise.all([
            notificationModulePromise,
            workflowPromise
          ]);
          
          // Esegui la notifica push direttamente, esattamente come avviene nel test del FlowEditor
          if (notificationService) {
            console.log('🔔 [DEBUG] Chiamata diretta triggerNfcScanNotification');
            const notifyResult = await notificationService.triggerNfcScanNotification(customer);
            console.log('✅ [DEBUG] Risultato notifica push diretta:', notifyResult);
            
            // Log risultato workflow (NESSUN fallback - solo workflow FlowEditor)
            if (notifyResult?.success) {
              if (notifyResult?.executed > 0) {
                console.log(`✅ [DEBUG] Push notification inviata tramite workflow (${notifyResult.executed})`);
              } else {
                console.log(`⚠️ [DEBUG] Nessun workflow push attivo per NFC scan`);
              }
            }
          }
          
          showNotification(`Trigger NFC completato per ${customer.name}`, 'success')
        } catch (workflowError) {
          console.error('❌ [DEBUG] Errore durante l\'esecuzione del workflow nfc_scan:', workflowError)
          showNotification(`Errore nell'esecuzione del workflow: ${workflowError.message}`, 'error')
        }
      }
    }
    
    setIsScanning(false)
  }

  const startNFCScan = async () => {
    if (!isNFCAvailable) {
      setShowManualInput(true)
      return
    }

    try {
      setIsScanning(true)
      showNotification(`Appoggia la tessera ${nfcMethod === 'raspberry-bridge' ? 'sul lettore' : 'NFC'}...`, 'info')

      // Usa il nostro hook per leggere NFC (gestisce automaticamente Web NFC o Bridge)
      await readNFC()

    } catch (error) {
      console.error('Errore scansione NFC:', error)
      if (mounted.current) {
        setIsScanning(false)
        showNotification('❌ Errore scansione NFC', 'error')
      }
    }
  }

  const handleManualTagSubmit = async (e) => {
    e.preventDefault()
    if (!manualTagId.trim()) return

    const customer = await findCustomerByTag(manualTagId.trim())
    if (customer && mounted.current) {
      onCustomerFound(customer)
      
      // NUOVO: Esegui il trigger workflow per NFC scan anche per inserimento manuale
      try {
        console.log('🔄 Esecuzione trigger nfc_scan per cliente (manuale):', customer.id)
        await workflowExecutor.onNFCScan(customer)
        console.log('✅ Trigger nfc_scan completato')
      } catch (workflowError) {
        console.error('❌ Errore durante l\'esecuzione del workflow nfc_scan:', workflowError)
      }
    }
    
    setManualTagId('')
    setShowManualInput(false)
  }

  const cancelScan = () => {
    setIsScanning(false)
    setShowManualInput(false)
    setManualTagId('')
    showNotification('Scansione annullata', 'info')
  }

  return (
    <div className="text-center space-y-4">
      {!isScanning && !showManualInput ? (
        <div className="space-y-3">
          <button 
            onClick={startNFCScan}
            className="btn btn-success btn-lg w-full flex flex-col items-center py-4"
          >
            {isNFCAvailable ? (
              <>
                <div className="flex items-center gap-2">
                  <img 
                    src="https://jexkalekaofsfcusdfjh.supabase.co/storage/v1/object/public/tinymce-images//NFCICONApng.png" 
                    alt="NFC" 
                    className="w-6 h-6"
                  />
                  <span className="text-lg font-semibold">Leggi NFC</span>
                </div>
                <small className="text-xs opacity-75 mt-1">
                  {nfcMethod === 'raspberry-bridge' ? 'Bridge Ready' : 'Mobile NFC'}
                </small>
              </>
            ) : (
              <span className="text-lg font-semibold">🔢 Inserisci Tessera</span>
            )}
          </button>
          
          {isNFCAvailable && (
            <button 
              onClick={() => setShowManualInput(true)}
              className="btn btn-outline btn-sm"
            >
              📝 Inserimento Manuale
            </button>
          )}
        </div>
      ) : isScanning ? (
        <div className="space-y-4">
          <div className="badge badge-success p-4 text-lg">
            <svg className="w-6 h-6 mr-2 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            📱 Appoggia la tessera...
          </div>
          <button 
            onClick={cancelScan}
            className="btn btn-error btn-sm"
          >
            ❌ Annulla
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <form onSubmit={handleManualTagSubmit} className="space-y-3">
            <div>
              <label className="label">
                <span className="label-text font-semibold">🏷️ ID Tessera:</span>
              </label>
              <input
                type="text"
                value={manualTagId}
                onChange={(e) => setManualTagId(e.target.value)}
                placeholder="Inserisci l'ID della tessera..."
                className="input input-bordered w-full"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button 
                type="submit" 
                className="btn btn-success flex-1"
                disabled={!manualTagId.trim()}
              >
                ✅ Cerca Cliente
              </button>
              <button 
                type="button"
                onClick={cancelScan}
                className="btn btn-outline"
              >
                ❌ Annulla
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Indicatore di supporto NFC */}
      <div className="text-sm opacity-70">
        {nfcMethod === 'raspberry-bridge' ? (
          <span className="text-success">🍓 Bridge Raspberry Pi Connesso</span>
        ) : nfcMethod === 'web-nfc' ? (
          <span className="text-success">📱 NFC Mobile Supportato</span>
        ) : isNFCAvailable === false ? (
          <span className="text-warning">💻 Solo Inserimento Manuale</span>
        ) : (
          <span className="text-info">🔍 Rilevamento NFC...</span>
        )}
      </div>
    </div>
  )
}

export default NFCQuickReaderHybrid
