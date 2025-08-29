import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase'
import { useNFC } from '../../hooks/useNFC'
import workflowExecutor from '../../services/workflowExecutor'

// Versione con fix completo per la notifica NFC
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
        
        // SOLUZIONE FINALE: Inviamo direttamente la notifica push tramite OneSignal
        try {
          console.log('🔄 [DEBUG] Esecuzione trigger nfc_scan per cliente:', customer.id)
          showNotification(`Rilevato ${customer.name}`, 'info')
          
          // Esecuzione workflow email (in background)
          workflowExecutor.onNFCScan(customer).catch(err => 
            console.error('❌ Errore workflow email:', err)
          );

          // INVIA DIRETTAMENTE LA NOTIFICA PUSH
          try {
            // Importa OneSignal
            const { oneSignalService } = await import('../../services/onesignalService');
            
            // Invia notifica immediata
            const result = await oneSignalService.sendNotificationToAll({
              title: `Benvenuto ${customer.name}! 👋`,
              message: `Grazie per la visita! Hai ${customer.points || 0} GEMME.`,
              url: window.location.origin + '/portal'
            });
            
            console.log('✅ [DEBUG] Notifica inviata direttamente:', result);
            showNotification(`Notifica push inviata!`, 'success');
          } catch (notifyError) {
            console.error('❌ [DEBUG] Errore invio notifica:', notifyError);
          }
          
        } catch (error) {
          console.error('❌ [DEBUG] Errore generale:', error)
          showNotification(`Errore: ${error.message}`, 'error')
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
      console.error('Errore avvio scansione:', error)
      setIsScanning(false)
      showNotification(`Errore: ${error.message}`, 'error')
    }
  }

  const stopNFCScan = () => {
    setIsScanning(false)
  }

  const handleManualSubmit = async (e) => {
    e.preventDefault()
    if (!manualTagId) return

    try {
      const customer = await findCustomerByTag(manualTagId)
      if (customer && mounted.current) {
        onCustomerFound(customer)
        
        console.log('🔄 Esecuzione trigger nfc_scan per cliente (manuale):', customer.id)
        await workflowExecutor.onNFCScan(customer)
        console.log('✅ Trigger nfc_scan completato')
      }
      
      setManualTagId('')
      setShowManualInput(false)
    } catch (workflowError) {
      console.error('❌ Errore durante l\'esecuzione del workflow nfc_scan:', workflowError)
    }
  }

  // Initial check per capacità NFC
  useEffect(() => {
    detectNFCCapability()
  }, [])

  return (
    <div className="quick-reader-container">
      <div className="quick-reader-buttons">
        <button 
          className="scan-button" 
          onClick={isScanning ? stopNFCScan : startNFCScan} 
          disabled={!isNFCAvailable && isScanning}
        >
          {isScanning 
            ? '🛑 Ferma Scan' 
            : isNFCAvailable 
              ? '📱 Scan NFC'
              : '📝 ID Manuale'
          }
        </button>
      </div>
      
      {showManualInput && (
        <form onSubmit={handleManualSubmit} className="manual-id-form">
          <input 
            type="text" 
            placeholder="Inserisci ID Tag (es. 04a2b1c2f7)"
            value={manualTagId}
            onChange={(e) => setManualTagId(e.target.value)}
            className="manual-id-input"
          />
          <button type="submit" className="manual-id-button">Cerca</button>
        </form>
      )}
      
      {isScanning && (
        <div className="scanning-indicator">
          <div className="scanning-animation"></div>
          <p>Scansione in corso...</p>
        </div>
      )}
      
      <style jsx>{`
        .quick-reader-container {
          margin: 15px 0;
        }
        .quick-reader-buttons {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-bottom: 15px;
        }
        .scan-button {
          background: linear-gradient(135deg, #8B4513 0%, #D4AF37 100%);
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          font-weight: bold;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .scan-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(139, 69, 19, 0.3);
        }
        .scan-button:disabled {
          background: #cccccc;
          cursor: not-allowed;
        }
        .scanning-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 20px;
        }
        .scanning-animation {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: 3px solid #D4AF37;
          border-top-color: #8B4513;
          animation: spin 1s linear infinite;
          margin-bottom: 10px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .manual-id-form {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }
        .manual-id-input {
          flex: 1;
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 6px;
          font-size: 16px;
        }
        .manual-id-button {
          background: #8B4513;
          color: white;
          border: none;
          padding: 10px 15px;
          border-radius: 6px;
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}

export default NFCQuickReaderHybrid
