import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

const NFCQuickReader = ({ onCustomerFound, showNotification }) => {
  const [isScanning, setIsScanning] = useState(false)
  const [nfcSupported, setNfcSupported] = useState(false)
  const [scanTimeout, setScanTimeout] = useState(null)

  useEffect(() => {
    // Check supporto NFC
    setNfcSupported('NDEFReader' in window)
  }, [])

  const startQuickScan = async () => {
    if (!nfcSupported) {
      showNotification('NFC non supportato. Usa la ricerca manuale.', 'warning')
      return
    }

    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      showNotification('NFC richiede HTTPS. Usa modalità locale per testare.', 'warning')
      return
    }

    setIsScanning(true)
    showNotification('Appoggia la tessera del cliente...', 'info')

    try {
      const ndef = new NDEFReader()
      await ndef.scan()

      // Vibrazione di feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(100)
      }

      // Timeout di 15 secondi
      const timeout = setTimeout(() => {
        setIsScanning(false)
        showNotification('Scansione scaduta. Riprova.', 'info')
      }, 15000)
      setScanTimeout(timeout)

      ndef.addEventListener("reading", async ({ serialNumber }) => {
        // Ferma timeout
        clearTimeout(timeout)
        
        // Vibrazione successo
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100])
        }

        const tagId = serialNumber.replace(/:/g, '').toUpperCase()
        
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
          
          // Log accesso NFC
          await supabase
            .from('nfc_logs')
            .insert([{
              tag_id: tagId,
              customer_id: customer.id,
              action_type: 'customer_access',
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

      ndef.addEventListener("readingerror", () => {
        clearTimeout(timeout)
        showNotification('Errore lettura tessera. Riprova.', 'error')
        setIsScanning(false)
      })

    } catch (error) {
      setIsScanning(false)
      
      if (error.name === 'NotAllowedError') {
        showNotification('Permesso NFC negato. Controlla le impostazioni.', 'error')
      } else if (error.name === 'NotSupportedError') {
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