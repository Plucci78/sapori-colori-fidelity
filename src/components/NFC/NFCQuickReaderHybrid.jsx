import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase'

const NFCQuickReaderHybrid = ({ onCustomerFound, showNotification }) => {
  const [isScanning, setIsScanning] = useState(false)
  const [nfcSupported, setNfcSupported] = useState(false)
  const [manualTagId, setManualTagId] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    
    // Verifica supporto Web NFC API
    if ('NDEFReader' in window) {
      setNfcSupported(true)
      console.log('✅ Web NFC API supportata')
    } else {
      console.log('⚠️ Web NFC API non supportata - modalità manuale disponibile')
    }

    return () => {
      mounted.current = false
    }
  }, [])

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

      // Poi cerchiamo il cliente
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id, name, phone, email, points, created_at')
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

  const startNFCScan = async () => {
    if (!nfcSupported) {
      setShowManualInput(true)
      return
    }

    try {
      setIsScanning(true)
      showNotification('Appoggia la tessera NFC...', 'info')

      // eslint-disable-next-line no-undef
      const ndef = new NDEFReader()
      await ndef.scan()

      const abortController = new AbortController()
      
      // Timeout di 10 secondi
      const timeoutId = setTimeout(() => {
        abortController.abort()
        if (mounted.current) {
          setIsScanning(false)
          showNotification('⏱️ Scansione scaduta', 'info')
        }
      }, 10000)

      ndef.addEventListener('reading', async ({ serialNumber }) => {
        clearTimeout(timeoutId)
        if (!mounted.current) return

        const tagId = serialNumber || 'unknown'
        console.log('📱 Tag NFC letto:', tagId)

        const customer = await findCustomerByTag(tagId)
        if (customer && mounted.current) {
          onCustomerFound(customer)
        }
        
        if (mounted.current) {
          setIsScanning(false)
        }
      }, { signal: abortController.signal })

    } catch (error) {
      console.error('Errore scansione NFC:', error)
      if (mounted.current) {
        setIsScanning(false)
        if (error.name === 'NotAllowedError') {
          showNotification('❌ Permesso NFC negato', 'error')
        } else {
          showNotification('❌ Errore scansione NFC', 'error')
        }
      }
    }
  }

  const handleManualTagSubmit = async (e) => {
    e.preventDefault()
    if (!manualTagId.trim()) return

    const customer = await findCustomerByTag(manualTagId.trim())
    if (customer && mounted.current) {
      onCustomerFound(customer)
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
            className="btn btn-success btn-lg w-full"
          >
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            {nfcSupported ? 'Leggi Tessera NFC' : 'Inserisci Tessera'}
          </button>
          
          {nfcSupported && (
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
        {nfcSupported ? (
          <span className="text-success">📱 NFC Mobile Supportato</span>
        ) : (
          <span className="text-warning">💻 Modalità Web (solo inserimento manuale)</span>
        )}
      </div>
    </div>
  )
}

export default NFCQuickReaderHybrid
