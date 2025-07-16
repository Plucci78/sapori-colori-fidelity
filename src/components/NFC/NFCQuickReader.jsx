import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase'
import nfcService from '../../services/nfcService'

const NFCQuickReader = ({ onCustomerFound, showNotification }) => {
  const [isScanning, setIsScanning] = useState(false)
  const [scanTimeout, setScanTimeout] = useState(null)
  const [serverConnected, setServerConnected] = useState(nfcService.isConnected) // Inizializza con lo stato attuale
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    let unsubscribers = []

    const initializeNFCListeners = async () => {
      // Registra listener per eventi NFC dal servizio
      unsubscribers.push(nfcService.on('cardDetected', async (data) => {
        if (mounted.current) {
          // Qui gestiamo la carta rilevata dal server NFC
          const tagId = data.uid.replace(/:/g, '').toLowerCase() // IMPORTANTE: converti in minuscolo!
          try {
            // Prima cerchiamo il tag
            const { data: tagData, error: tagError } = await supabase
              .from('nfc_tags')
              .select('tag_id, customer_id')
              .eq('tag_id', tagId)
              .eq('is_active', true)
              .single()

            if (tagError || !tagData) {
              showNotification(`Tessera ${tagId.slice(-6)} non registrata`, 'error')
              setIsScanning(false)
              return
            }

            // Poi cerchiamo il cliente
            const { data: customerData, error: customerError } = await supabase
              .from('customers')
              .select('id, name, phone, email, points, created_at')
              .eq('id', tagData.customer_id)
              .single()

            if (customerError || !customerData) {
              showNotification(`Cliente non trovato per tessera ${tagId.slice(-6)}`, 'error')
              setIsScanning(false)
              return
            }

            const customer = customerData
            await supabase
              .from('nfc_logs')
              .insert([{
                tag_id: tagId,
                customer_id: customer.id,
                action_type: 'customer_access',
                created_at: new Date().toISOString()
              }])

            showNotification(`✅ ${customer.name} - ${customer.points} GEMME`, 'success')
            onCustomerFound(customer)
            setIsScanning(false)

          } catch (error) {
            console.error('Errore ricerca cliente:', error)
            showNotification('Errore nella lettura della tessera', 'error')
            setIsScanning(false)
          }
        }
      }))

      unsubscribers.push(nfcService.on('scanTimeout', () => {
        if (mounted.current) {
          setIsScanning(false)
          showNotification('⏱️ Scansione scaduta', 'info')
        }
      }))

      unsubscribers.push(nfcService.on('error', (error) => {
        if (mounted.current) {
          setIsScanning(false)
          showNotification(`❌ Errore NFC: ${error}`, 'error')
        }
      }))

      // Listener per lo stato di connessione del servizio NFC
      unsubscribers.push(nfcService.on('connected', () => {
        if (mounted.current) {
          setServerConnected(true)
        }
      }))
      unsubscribers.push(nfcService.on('disconnected', () => {
        if (mounted.current) {
          setServerConnected(false)
        }
      }))

      // Tenta connessione in background
      setTimeout(async () => {
        try {
          console.log('🔌 NFCQuickReader: Tentativo connessione WebSocket...')
          await nfcService.connect()
          console.log('✅ NFCQuickReader: Connessione riuscita')
        } catch (error) {
          console.log('⚠️ NFCQuickReader: Connessione fallita:', error.message)
        }
      }, 500) // Ritardo di 500ms
    }

    initializeNFCListeners()

    return () => {
      mounted.current = false
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
  }, [onCustomerFound, showNotification])

  const startQuickScan = async () => {
    console.log("Tentativo di avviare scansione rapida...")
    if (!serverConnected) {
      showNotification('❌ Server NFC non connesso', 'error')
      console.log("Scansione rapida non avviata: Server NFC non connesso.")
      return
    }

    setIsScanning(true)
    showNotification('Appoggia la tessera del cliente...', 'info')
    console.log("Avvio nfcService.startScan()...")

    try {
      const result = await nfcService.startScan()
      if (!result.success) {
        throw new Error(result.error || 'Errore avvio scansione')
      }
      console.log("nfcService.startScan() avviato con successo.")
    } catch (error) {
      console.error('Errore avvio scansione:', error)
      showNotification(`❌ ${error.message}`, 'error')
      setIsScanning(false)
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

  // Rimosso il check nfcSupported e il suo JSX
  return (
    <div className="text-center">
      {!isScanning ? (
        <button 
          onClick={startQuickScan}
          className="btn btn-success btn-lg"
          disabled={!serverConnected} // Disabilita se il server non è connesso
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