import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import NFCBridge from '../../utils/NFCBridge'

const NFCQuickReader = ({ onCustomerFound, showNotification }) => {
  const [isScanning, setIsScanning] = useState(false)
  const [nfcSupported, setNfcSupported] = useState(false)
  const [scanTimeout, setScanTimeout] = useState(null)
  const [nfcBridge] = useState(new NFCBridge())
  const [readerStatus, setReaderStatus] = useState({ mode: 'none', webNFCSupported: false, hardwareConnected: false })

  useEffect(() => {
    // Check supporto NFC e hardware
    checkNFCSupport()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const checkNFCSupport = async () => {
    const method = await nfcBridge.detectBestReader()
    const status = nfcBridge.getStatus()
    
    setReaderStatus(status)
    setNfcSupported(method !== 'none')
    
    if (method === 'web') {
      showNotification('✅ Web NFC disponibile', 'success')
    } else if (method === 'hardware') {
      showNotification('✅ Lettore NFC hardware rilevato', 'success')
    } else {
      showNotification('⚠️ Nessun lettore NFC disponibile', 'warning')
    }
  }

  const startQuickScan = async () => {
    if (!nfcSupported) {
      showNotification('NFC non supportato. Usa la ricerca manuale.', 'warning')
      return
    }

    setIsScanning(true)
    showNotification(`📡 Lettura con ${readerStatus.mode === 'web' ? 'Web NFC' : 'Hardware'}...`, 'info')

    try {
      // Usa il bridge unificato invece della logica specifica
      const stopScan = await nfcBridge.startScan(async ({ tagId, method }) => {
        console.log(`🏷️ Tag letto con ${method}:`, tagId)
        
        // Ferma timeout
        clearTimeout(scanTimeout)
        
        // Vibrazione successo
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100])
        }

        tagId = tagId.replace(/:/g, '').toUpperCase()
        
        try {
          // Cerca cliente associato al tag
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
            // Tag non trovato o non associato
            showNotification(`Tessera ${tagId.slice(-6)} non registrata`, 'error')
            setIsScanning(false)
            return
          }

          // Cliente trovato!
          const customer = tagData.customers
          
          // Log accesso NFC con metodo di lettura
          await supabase
            .from('nfc_logs')
            .insert([{
              tag_id: tagId,
              customer_id: customer.id,
              action_type: 'customer_access',
              read_method: method, // Aggiunge il metodo di lettura
              created_at: new Date().toISOString()
            }])

          // Feedback visivo e sonoro
          showNotification(
            `✅ ${customer.name} - ${customer.points} GEMME`, 
            'success'
          )

          // Callback al componente padre con i dati del cliente
          onCustomerFound(customer)
          setIsScanning(false)

        } catch (error) {
          console.error('Errore ricerca cliente:', error)
          showNotification('Errore nella lettura della tessera', 'error')
          setIsScanning(false)
        }
      })

      // Salva funzione di stop per cleanup
      setScanTimeout(stopScan)
      
      // Timeout di 15 secondi
      setTimeout(() => {
        if (isScanning) {
          stopScan()
          setIsScanning(false)
          showNotification('Scansione scaduta. Riprova.', 'info')
        }
      }, 15000)

    } catch (error) {
      setIsScanning(false)
      
      if (error.message.includes('negato')) {
        showNotification('Permesso NFC negato. Controlla le impostazioni.', 'error')
      } else if (error.message.includes('non supportato')) {
        showNotification('NFC non supportato su questo dispositivo', 'error')
      } else {
        showNotification(`Errore NFC: ${error.message}`, 'error')
      }
    }
  }

  const cancelScan = () => {
    setIsScanning(false)
    if (scanTimeout) {
      clearTimeout(scanTimeout)
      setScanTimeout(null)
    }
    showNotification('Scansione annullata', 'info')
  }

  if (!nfcSupported) {
    return (
      <div className="card bg-secondary">
        <div className="card-body text-center">
          <svg className="mx-auto h-12 w-12 text-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-semibold text-danger mb-2">NFC Non Supportato</h3>
          <p className="text-secondary">Questo dispositivo non supporta NFC. Usa la ricerca manuale.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="text-center">
      {!isScanning ? (
        <button 
          onClick={startQuickScan}
          className="btn btn-success btn-lg"
        >
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Leggi Tessera Cliente
        </button>
      ) : (
        <div className="space-y-4">
          <button 
            onClick={cancelScan}
            className="btn btn-danger btn-lg"
          >
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Annulla Scansione
          </button>
          <div className="badge badge-success p-3 text-base">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Appoggia la tessera...
          </div>
        </div>
      )}
    </div>
  )
}

export default NFCQuickReader