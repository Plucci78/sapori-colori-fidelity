import { useState, useEffect } from 'react'
import NFCQuickReader from '../NFC/NFCQuickReader'
import RegistrationWizard from '../Registration/RegistrationWizard'
import ClipboardDebug from '../Common/ClipboardDebug'
import QRCodeReader from '../Common/QRCodeReader'
import { supabase } from '../../supabase'
import { copyToClipboard, copyReferralCode, copyClientLink } from '../../utils/clipboardUtils'
import { testGemmeSounds, playRemoveGemmeStandard, playRemoveGemmeAlt, playAddGemmeSound } from '../../utils/soundUtils'
import jsPDF from 'jspdf'

function CustomerView({
  searchTerm,
  setSearchTerm,
  customers,
  setCustomers,
  selectedCustomer,
  setSelectedCustomer,
  transactionAmount,
  setTransactionAmount,
  addTransaction,
  prizes,
  redeemPrize,
  manualCustomerName,
  setManualCustomerName,
  searchCustomersForManual,
  foundCustomers,
  setFoundCustomers, // AGGIUNTA: prop mancante per correggere l'errore
  manualPoints,
  setManualPoints,
  modifyPoints,
  showNotification,
  generateClientTokenForCustomer,
  regenerateClientToken,
  loadCustomers, // Aggiungi questa prop per ricaricare clienti
  deactivateCustomer,
  reactivateCustomer,
  // AGGIUNGI QUESTE NUOVE PROPS
  referredFriends,
  loadReferredFriends,
  getReferralLevel,
  showQRModal,
  setShowQRModal,
  showShareModal,
  setShowShareModal,
  isMultiplierActive, // <--- nuova prop
  completeReferral, // ✅ AGGIUNTA QUESTA PROP
  fixReferralData // ✅ AGGIUNTA FUNZIONE CORREZIONE
}) {
  const [showGemmeRain, setShowGemmeRain] = useState(false);
  const [clientLinks, setClientLinks] = useState({})
  const [showRegistrationWizard, setShowRegistrationWizard] = useState(false)
  const [customerConsents, setCustomerConsents] = useState({})
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [useAltRemoveSound, setUseAltRemoveSound] = useState(false) // Nuovo stato per tipo suono
  const [showQRScanner, setShowQRScanner] = useState(false) // Stato per QR scanner
  const [activeTab, setActiveTab] = useState('nfc') // Nuovo stato per tab attivo

  // Callback quando NFC trova un cliente
  const handleNFCCustomerFound = (customer) => {
    setSelectedCustomer(customer)
    setSearchTerm(customer.name)
    loadCustomerConsents(customer.id) // Carica consensi
    setActiveTab('customer') // Passa automaticamente al tab cliente

    // Scroll automatico alla sezione cliente selezionato
    setTimeout(() => {
      const selectedSection = document.querySelector('.selected-customer-section')
      if (selectedSection) {
        selectedSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }

  // Callback quando QR scanner trova un cliente
  const handleQRScan = async (qrData) => {
    try {
      console.log('🔍 QR scansionato:', qrData)
      
      // Verifica se è un QR di cliente (formato: CUSTOMER:ID)
      const customerMatch = qrData.match(/^CUSTOMER:(\d+)$/)
      if (customerMatch) {
        const customerId = parseInt(customerMatch[1])
        console.log('✅ QR formato valido - ID Cliente:', customerId)
        
        // Carica dati cliente dal database
        console.log('🔍 Ricerca cliente nel database...')
        const { data: customer, error } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .single()
          
        console.log('📊 Risultato query database:', { customer, error })
          
        if (error) {
          console.error('❌ Errore query database:', error)
          showNotification(`❌ Errore database: ${error.message}`, 'error')
          return
        }
        
        if (!customer) {
          console.log('❌ Cliente non trovato con ID:', customerId)
          showNotification(`❌ Cliente con ID ${customerId} non trovato nel database`, 'error')
          return
        }
        
        console.log('✅ Cliente trovato:', customer)
        
        if (!customer.is_active) {
          console.log('⚠️ Cliente disattivato:', customer)
          showNotification(`⚠️ Cliente ${customer.name} è disattivato`, 'warning')
          return
        }
        
        // Cliente trovato e attivo
        console.log('🎉 Impostazione cliente selezionato:', customer.name)
        setSelectedCustomer(customer)
        setSearchTerm(customer.name)
        loadCustomerConsents(customer.id)
        setShowQRScanner(false) // Chiudi scanner dopo successo
        setActiveTab('customer') // Passa automaticamente al tab cliente
        
        showNotification(`✅ Cliente ${customer.name} riconosciuto via QR!`, 'success')
        
        // Scroll automatico alla sezione cliente selezionato
        setTimeout(() => {
          const element = document.querySelector('.selected-customer-section')
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 100)
        
      } else {
        // Fornisci messaggi di errore più informativi
        console.log('QR Code scansionato non valido:', qrData)
        
        if (qrData.includes('http') || qrData.includes('www')) {
          showNotification('❌ QR Code web: usa solo QR clienti dal portale personale', 'error')
        } else if (qrData.length < 5) {
          showNotification('❌ QR Code troppo corto: formato non riconosciuto', 'error')
        } else if (qrData.includes('REFERRAL:') || qrData.includes('REF:')) {
          showNotification('❌ QR Code referral: usa la sezione dedicata', 'error')
        } else {
          showNotification(`❌ QR Code non valido per riconoscimento cliente.\n\n💡 Formato richiesto: QR dal portale cliente\n📱 Contenuto: ${qrData.substring(0, 30)}${qrData.length > 30 ? '...' : ''}`, 'error')
        }
      }
    } catch (error) {
      console.error('Errore processamento QR:', error)
      showNotification('❌ Errore nella scansione QR', 'error')
    }
  }

  // Funzione per caricare consensi cliente
  const loadCustomerConsents = async (customerId) => {
    try {
      const { data, error } = await supabase
        .from('consent_records')
        .select('*')
        .eq('customer_id', customerId)
        .order('consent_date', { ascending: false })

      console.log('Consensi caricati:', data); // <--- AGGIUNGI QUESTO

      if (data) {
        const consents = {}
        data.forEach(consent => {
          if (!consents[consent.consent_type]) {
            consents[consent.consent_type] = consent
          }
        })
        setCustomerConsents(consents)
      }
    } catch (error) {
      console.error('Errore caricamento consensi:', error)
    }
  }

  // Funzione calcolo età
  const calculateAge = (birthDate) => {
    if (!birthDate) return null
    const today = new Date()
    const birth = new Date(birthDate)
    const age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1
    }
    return age
  }

  // Funzione categoria cliente
  const getCustomerCategory = (points) => {
    if (points < 50) return { name: 'BRONZO', color: '#cd7f32', emoji: '🥉' }
    if (points < 100) return { name: 'ARGENTO', color: '#c0c0c0', emoji: '🥈' }
    if (points < 200) return { name: 'ORO', color: '#ffd700', emoji: '🥇' }
    if (points < 500) return { name: 'PLATINO', color: '#e5e4e2', emoji: '💎' }
    return { name: 'VIP', color: '#9b59b6', emoji: '👑' }
  }

  // Funzione consensi descrizioni
  const getConsentDescription = (type) => {
    const descriptions = {
      fidelity: 'Programma Fedeltà',
      email_marketing: 'Email Marketing',
      sms_marketing: 'SMS Promozionali',
      profiling: 'Profilazione Acquisti'
    }
    return descriptions[type] || type
  }

  // Filtro clienti per ricerca manuale
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.phone && customer.phone.includes(searchTerm)) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const playCoinSound = () => {
    const audio = new Audio('/sounds/coin.wav')
    audio.play()
  }

  const handleAddTransaction = async () => {
    playCoinSound();
    await addTransaction();
    startGemmeRain();
  }

  const startGemmeRain = () => {
    setShowGemmeRain(true);
    setTimeout(() => setShowGemmeRain(false), 1200); // durata animazione
  };

  const handleGenerateClientLink = async (customer) => {
    const token = await generateClientTokenForCustomer(customer.id)
    if (token) {
      const url = `${window.location.origin}/cliente/${token}`
      setClientLinks(prev => ({
        ...prev,
        [customer.id]: { token, url }
      }))
      
      // Usa la nuova funzione di copia migliorata
      await copyClientLink(url, showNotification)
    }
  }

  const handleRegenerateClientLink = async (customer) => {
    if (!regenerateClientToken) {
      showNotification('⚠️ Funzione rigenerazione non disponibile', 'warning')
      return
    }

    if (confirm(`⚠️ ATTENZIONE!\n\nRigenerare il link cliente per ${customer.name}?\n\nIl vecchio link smetterà di funzionare e dovrà essere inviato quello nuovo.`)) {
      const token = await regenerateClientToken(customer.id)
      if (token) {
        const url = `${window.location.origin}/cliente/${token}`
        setClientLinks(prev => ({
          ...prev,
          [customer.id]: { token, url }
        }))
        
        // Copia automaticamente il nuovo link
        await copyClientLink(url, showNotification)
      }
    }
  }

  const handleShowPrivacyPdf = () => {
    if (!customerConsents.fidelity) return;
    const doc = new jsPDF();
    let y = 15;
    doc.setFontSize(16);
    doc.text("Modulo Privacy - Sapori & Colori", 10, y);
    y += 10;
    doc.setFontSize(10);
    doc.text(
      `TITOLARE DEL TRATTAMENTO:\nSapori & Colori B srl\nVia [BAGALADI 7 00132 ROMA]\nTel: [TELEFONO] - Email: [EMAIL NEGOZIO]\n\n` +
      `FINALITÀ DEL TRATTAMENTO:\n- Gestione del programma fedeltà GEMME\n- Erogazione dei servizi richiesti\n- Invio comunicazioni commerciali (solo con consenso)\n- Profilazione per offerte personalizzate (solo con consenso)\n- Adempimenti fiscali e contabili\n\n` +
      `BASE GIURIDICA:\n- Consenso dell'interessato (art. 6, lett. a GDPR)\n- Esecuzione contratto (art. 6, lett. b GDPR)\n- Obblighi legali (art. 6, lett. c GDPR)\n\n` +
      `CATEGORIE DI DATI:\nRaccogliamo: nome, telefono, email, data nascita, città, note operative, preferenze, eventuali allergie/intolleranze (solo se comunicati volontariamente)\n\n` +
      `CONSERVAZIONE:\nI dati saranno conservati fino alla revoca del consenso o per 10 anni dall'ultima transazione per obblighi fiscali\n\n` +
      `DESTINATARI:\nI dati non verranno comunicati a terzi, salvo obblighi di legge o fornitori di servizi tecnici (con garanzie privacy)\n\n` +
      `TRASFERIMENTI:\nI dati vengono trattati nell'Unione Europea. Eventuali trasferimenti extra-UE avverranno con adeguate garanzie\n\n` +
      `DIRITTI:\n- Accedere ai suoi dati (art. 15 GDPR)\n- Rettificare dati inesatti (art. 16 GDPR)\n- Cancellare i dati (art. 17 GDPR)\n- Limitare il trattamento (art. 18 GDPR)\n- Portabilità dei dati (art. 20 GDPR)\n- Opporsi al trattamento (art. 21 GDPR)\n- Revocare il consenso in qualsiasi momento\n\n` +
      `COME ESERCITARE I DIRITTI:\nEmail: [EMAIL PRIVACY]\nTelefono: [TELEFONO NEGOZIO]\nDi persona presso il punto vendita\n\n` +
      `RECLAMI:\nHa diritto di proporre reclamo all'Autorità Garante per la Protezione dei Dati Personali (www.gpdp.it)\n\n` +
      `AGGIORNAMENTI:\nQuesta informativa può essere aggiornata. Le modifiche saranno comunicate tramite i nostri canali\n\n`,
      10,
      y,
      { maxWidth: 190 }
    );
    // AGGIUNGI QUESTO BLOCCO
    y = 230;
    doc.setFontSize(12);
    // Data e luogo
    const oggi = new Date();
    const dataString = oggi.toLocaleDateString('it-IT');
    doc.text("Roma, lì " + dataString, 10, y);
    y += 10;
    doc.text("Firma del cliente:", 10, y);
    if (customerConsents.fidelity.digital_signature) {
      doc.addImage(
        customerConsents.fidelity.digital_signature,
        "PNG",
        10,
        y + 5,
        80,
        30
      );
    }
    doc.save("modulo_privacy_firmato.pdf");
  };

  const saveCustomerEdits = async () => {
    try {
      console.log('Aggiornamento cliente:', editingCustomer);
      const { data, error } = await supabase
        .from('customers')
        .update({
          name: editingCustomer.name,
          phone: editingCustomer.phone,
          email: editingCustomer.email,
          city: editingCustomer.city,
          birth_date: editingCustomer.birth_date,
          notes: editingCustomer.notes,
          updated_at: new Date()
        })
        .eq('id', editingCustomer.id)

      if (error) throw error

      // Aggiorna il cliente nella lista locale
      setCustomers(prev =>
        prev.map(customer => customer.id === editingCustomer.id ? { ...customer, ...editingCustomer } : customer)
      )

      setShowEditModal(false)
      showNotification('✅ Cliente aggiornato con successo!', 'success')
    } catch (error) {
      console.error('Errore aggiornamento cliente:', error)
      showNotification('Errore durante il salvataggio delle modifiche', 'error')
    }
  }

  // Wrapper per modifyPoints che usa le preferenze suono locali
  const modifyPointsWithSound = async (customer, pointsToAdd) => {
    // Prima riproduce il suono con le preferenze locali
    const points = parseInt(pointsToAdd)
    if (points > 0) {
      playAddGemmeSound(points)
    } else if (points < 0) {
      // Per rimozione, usa la preferenza locale
      if (useAltRemoveSound) {
        playRemoveGemmeAlt(points)
      } else {
        playRemoveGemmeStandard(points)
      }
    }
    
    // Poi chiama la funzione originale (senza suoni)
    await modifyPoints(customer, pointsToAdd)
  }
  useEffect(() => {
    if (selectedCustomer?.id) {
      console.log('🔍 Cliente selezionato:', {
        name: selectedCustomer.name,
        id: selectedCustomer.id,
        referral_count: selectedCustomer.referral_count,
        referral_points_earned: selectedCustomer.referral_points_earned
      });
      loadReferredFriends(selectedCustomer.id);
    }
  }, [selectedCustomer, loadReferredFriends]);

  // Funzione condivisione WhatsApp
  const shareOnWhatsApp = () => {
    if (!selectedCustomer?.referral_code) {
      showNotification('Genera prima un codice referral!', 'warning');
      return;
    }
    const level = getReferralLevel(selectedCustomer.referral_count || 0);
    const bonus = isMultiplierActive ? '40' : '20'; // Doppio se multiplier attivo
    const message = `🥖 Ti invito da Sapori & Colori!\n\n` +
      `📱 Usa il mio codice: ${selectedCustomer.referral_code}\n\n` +
      `✅ Tu ricevi: 10 gemme subito\n` +
      `✅ Io ricevo: ${bonus} gemme al tuo primo acquisto\n` +
      `${isMultiplierActive ? '🔥 BONUS WEEKEND 2X ATTIVO!\n' : ''}\n` +
      `Sono già ${level} del programma fedeltà! 🏆\n\n` +
      `Ti aspetto! 🎁`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
  };

  // Modal Share Social (per ora solo notifica e copia link)
  const openShareModal = async () => {
    showNotification('🚀 Presto disponibili più opzioni di condivisione!', 'info');
    const shareLink = `https://saporiecolori.it/ref/${selectedCustomer.referral_code}`;
    await copyToClipboard(shareLink, showNotification);
  };

  return (
    <div className="p-6">
      {/* WIZARD REGISTRAZIONE - OVERLAY COMPLETO */}
      {showRegistrationWizard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-lg w-full h-full max-w-none max-h-none overflow-auto" style={{ margin: '20px', maxWidth: 'calc(100vw - 40px)', maxHeight: 'calc(100vh - 40px)' }}>
            <RegistrationWizard
              onComplete={(customer, successMessage) => {
                loadCustomers() // Ricarica lista clienti
                setShowRegistrationWizard(false)
                setSelectedCustomer(customer) // Seleziona il nuovo cliente
                showNotification(successMessage || `✅ Cliente ${customer.name} creato con successo!`, 'success')
              }}
              onCancel={() => setShowRegistrationWizard(false)}
            />
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-brand mb-2">🔷 Gestione Clienti GEMME</h1>
            <p className="text-secondary">Identifica clienti, registra vendite e gestisci il programma fedeltà</p>
          </div>
          <button
            onClick={() => setShowRegistrationWizard(true)}
            className="btn btn-success px-6 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            ➕ Nuovo Cliente
          </button>
        </div>
      </div>

      {/* SISTEMA TAB */}
      <div className="tabs-container">
        {/* TAB NAVIGATION */}
        <div className="tabs-nav">
          <button 
            className={`tab-button ${activeTab === 'nfc' ? 'active' : ''}`}
            onClick={() => setActiveTab('nfc')}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            📱 NFC Reader
          </button>
          
          <button 
            className={`tab-button ${activeTab === 'qr' ? 'active' : ''}`}
            onClick={() => setActiveTab('qr')}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6V4H4zm10 0v6h6V4h-6zM4 14v6h6v-6H4zm7 0l3 3 6-6" />
            </svg>
            📷 QR Scanner
          </button>
          
          <button 
            className={`tab-button ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            🔍 Ricerca Manuale
          </button>
          
          {selectedCustomer && (
            <button 
              className={`tab-button ${activeTab === 'customer' ? 'active customer-selected' : 'customer-selected'}`}
              onClick={() => setActiveTab('customer')}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              👤 {selectedCustomer.name}
            </button>
          )}
        </div>

        {/* TAB CONTENT */}
        <div className="tab-content">{/* ...existing code...*/}
        <div className="card-header">
          <h2 className="card-title flex items-center gap-3">
            <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Identificazione Cliente con NFC
          </h2>
          <p className="card-subtitle">Il modo più veloce per identificare clienti di ritorno</p>
        </div>
        <div className="card-body text-center">
          <NFCQuickReader
            onCustomerFound={handleNFCCustomerFound}
            showNotification={showNotification}
          />
          <p className="text-sm text-secondary mt-4">
            Appoggia la tessera NFC del cliente per aprire automaticamente il suo profilo
          </p>
        </div>
      </div>

      {/* DIVISORE VISIVO */}
      <div className="divider-container">
        <div className="divider-line"></div>
        <span className="divider-text">oppure</span>
        <div className="divider-line"></div>
      </div>

      {/* SEZIONE QR SCANNER */}
      <div className={`qr-scanner-section ${showQRScanner ? 'active' : ''}`}>
        <h3 className="card-title flex items-center gap-3 mb-4">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
          Riconoscimento Cliente con QR Code
        </h3>
        
        <button
          onClick={() => setShowQRScanner(!showQRScanner)}
          className={`qr-scanner-toggle ${showQRScanner ? 'active' : ''}`}
        >
          {showQRScanner ? (
            <>📱 ⏹️ Chiudi Scanner QR</>
          ) : (
            <>📱 📷 Avvia Scanner QR</>
          )}
        </button>
        
        {/* Debug: Mostra formato QR esempio */}
        <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-800">
            <h4 className="font-semibold mb-2">📋 Come usare lo Scanner QR</h4>
            <div className="space-y-2">
              <p><strong>1.</strong> Clicca su "📱 📷 Avvia Scanner QR" qui sotto</p>
              <p><strong>2.</strong> Consenti l'accesso alla fotocamera quando richiesto</p>
              <p><strong>3.</strong> Clicca su "📷 Avvia Scansione" nel componente che apparirà</p>
              <p><strong>4.</strong> Inquadra il QR del cliente dal suo portale personale</p>
            </div>
            <div className="mt-3 p-2 bg-white rounded border">
              <strong>Formato QR richiesto:</strong><br/>
              <code className="bg-gray-100 px-2 py-1 rounded text-blue-900">CUSTOMER:123</code><br/>
              <span className="text-xs text-gray-600">dove 123 è l'ID del cliente</span>
            </div>
          </div>
        </div>
        
        {showQRScanner && (
          <div className="qr-scanner-container mt-4">
            {/* PULSANTE TEST DEBUG */}
            <div className="mb-4 p-3 bg-yellow-50 rounded border border-yellow-200">
              <h5 className="text-yellow-800 font-semibold mb-2">🧪 Test QR Scanner</h5>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // Simula scansione QR con primo cliente disponibile
                    if (customers && customers.length > 0) {
                      const testCustomer = customers[0]
                      const testQR = `CUSTOMER:${testCustomer.id}`
                      console.log('🧪 Test QR simulato:', testQR)
                      handleQRScan(testQR)
                    } else {
                      showNotification('❌ Nessun cliente disponibile per il test', 'error')
                    }
                  }}
                  className="btn btn-sm btn-warning"
                >
                  🧪 Test QR Cliente 1
                </button>
                <button
                  onClick={() => {
                    // Test con QR non valido
                    console.log('🧪 Test QR non valido')
                    handleQRScan("INVALID:123")
                  }}
                  className="btn btn-sm btn-secondary"
                >
                  🧪 Test QR Non Valido
                </button>
              </div>
              <p className="text-xs text-yellow-700 mt-2">
                Usa questi pulsanti per testare la funzione di riconoscimento senza dover scannerizzare un QR reale
              </p>
            </div>

            <QRCodeReader
              onScan={handleQRScan}
              onError={(error) => {
                console.error('Errore QR Scanner:', error)
                showNotification('❌ Errore nell\'attivazione della fotocamera', 'error')
              }}
              width={300}
              height={200}
              className="mx-auto"
            />
            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="text-green-800 font-semibold mb-2">💡 Istruzioni per l'uso</h4>
              <div className="text-sm text-green-700 space-y-1">
                <p>• <strong>Passo 1:</strong> Assicurati che il cliente abbia accesso al suo portale personale</p>
                <p>• <strong>Passo 2:</strong> Il cliente deve mostrare il QR dal suo account (non da siti web!)</p>
                <p>• <strong>Passo 3:</strong> Inquadra il QR con questo scanner per identificare automaticamente il cliente</p>
                <p>• <strong>⚠️ Importante:</strong> Funziona solo con QR nel formato CUSTOMER:ID</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RICERCA MANUALE */}
      <div className="card mb-6">
        <div className="card-header">
          <h2 className="card-title flex items-center gap-3">
            <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Ricerca Manuale Cliente
          </h2>
          <p className="card-subtitle">Cerca per nome, telefono o email</p>
        </div>
        <div className="card-body">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Cerca cliente per nome, telefono o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand focus:outline-none transition-colors"
            />
            <button
              onClick={() => {
                if (searchTerm.trim()) {
                  showNotification(`Cercando: ${searchTerm}`, 'info')
                } else {
                  showNotification('Inserisci un termine di ricerca', 'warning')
                }
              }}
              className="btn btn-primary px-6"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Cerca
            </button>
          </div>
        </div>
      </div>

      {/* CLIENTE SELEZIONATO */}
      {selectedCustomer && (
        <div className="selected-customer-section mb-6">
          <div className="card card-selected-customer">
            <div className="card-header">
              <h2 className="card-title flex items-center gap-3">
                <svg className="w-6 h-6 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Cliente Attivo
              </h2>
              <p className="card-subtitle">Cliente identificato e pronto per la vendita</p>
            </div>

            <div className="card-body">
              <div className="customer-info-box flex items-center gap-6">
                <div className="customer-avatar">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-brand mb-3">{selectedCustomer.name}</h3>

                  {/* --- PULSANTI SOTTO IL NOME, ALLINEATI A SINISTRA --- */}
                  <div className="flex gap-2 mb-4">
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        setEditingCustomer({ ...selectedCustomer });
                        setShowEditModal(true);
                      }}
                    >
                      ✏️ Modifica
                    </button>
                    {selectedCustomer.is_active ? (
                      <button
                        className="btn btn-warning"
                        onClick={() => deactivateCustomer(selectedCustomer)}
                      >
                        ⏸️ Disattiva
                      </button>
                    ) : (
                      <button
                        className="btn btn-success"
                        onClick={() => reactivateCustomer(selectedCustomer)}
                      >
                        ▶️ Riattiva
                      </button>
                    )}
                  </div>
                  {/* --- FINE BLOCCO PULSANTI --- */}

                  {/* INFO BASE */}
                  <div className="grid grid-3 gap-4 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span className="font-medium">Tel:</span>
                      <span>{selectedCustomer.phone || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                      <span className="font-medium">Email:</span>
                      <span>{selectedCustomer.email || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 6v4m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium">Cliente dal:</span>
                      <span>{new Date(selectedCustomer.created_at).toLocaleDateString('it-IT')}</span>
                    </div>
                  </div>

                  {/* INFO DETTAGLIATE AGGIUNTIVE */}
                  <div className="grid grid-3 gap-4 text-sm mb-4 p-3 bg-gray-50 rounded-lg">
                    {/* Età */}
                    {selectedCustomer.birth_date && (
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🎂</span>
                        <span className="font-medium">Età:</span>
                        <span>{calculateAge(selectedCustomer.birth_date)} anni</span>
                      </div>
                    )}

                    {/* Città */}
                    {selectedCustomer.city && (
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🏠</span>
                        <span className="font-medium">Città:</span>
                        <span>{selectedCustomer.city}</span>
                      </div>
                    )}

                    {/* Categoria Cliente */}
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getCustomerCategory(selectedCustomer.points).emoji}</span>
                      <span className="font-medium">Categoria:</span>
                      <span
                        className="font-bold px-2 py-1 rounded text-white text-xs"
                        style={{ backgroundColor: getCustomerCategory(selectedCustomer.points).color }}
                      >
                        {getCustomerCategory(selectedCustomer.points).name}
                      </span>
                    </div>
                  </div>

                  {/* NOTE OPERATORI */}
                  {selectedCustomer.notes && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                      <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                        📝 Note Operatori:
                      </h4>
                      <div className="text-blue-700 text-sm bg-white p-2 rounded border">
                        {selectedCustomer.notes}
                      </div>
                    </div>
                  )}

                  {/* CONSENSI PRIVACY */}
                  <div className="mb-4 p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                    <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                      🛡️ Consensi Privacy:
                    </h4>
                    <div className="grid grid-2 gap-2">
                      {Object.entries(customerConsents).map(([type, consent]) => (
                        <div key={type} className="flex items-center gap-2 text-sm">
                          <span className={`w-3 h-3 rounded-full ${consent.consent_given ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className="text-gray-700">{getConsentDescription(type)}</span>
                          <span className={`text-xs font-medium ${consent.consent_given ? 'text-green-600' : 'text-red-600'}`}>
                            {consent.consent_given ? '✅ Sì' : '❌ No'}
                          </span>
                          {consent.digital_signature && (
                            <img
                              src={consent.digital_signature}
                              alt="Firma digitale"
                              style={{
                                maxWidth: 180,
                                border: '1px solid #ccc',
                                marginLeft: 12,
                                background: '#fff',
                                borderRadius: 4
                              }}
                            />
                          )}
                        </div>
                      ))}
                      {Object.keys(customerConsents).length === 0 && (
                        <div className="text-gray-500 text-sm italic">
                          Nessun consenso registrato
                        </div>
                      )}
                    </div>
                  </div>

                  {/* MODULO PRIVACY COMPLETO CON FIRMA */}
                  {selectedCustomer && customerConsents.fidelity && customerConsents.fidelity.digital_signature && (
                    <button
                      className="btn btn-outline-primary mb-4"
                      onClick={handleShowPrivacyPdf}
                      type="button"
                    >
                      📄 Visualizza modulo privacy firmato
                    </button>
                  )}
                </div>

                <div className="gemme-display">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="gemme-icon-lg"></div>
                    <span className="text-2xl font-extrabold text-red-600">{selectedCustomer.points}</span>
                  </div>
                  <div className="text-sm font-semibold text-red-700 uppercase tracking-wide">GEMME</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NUOVA VENDITA */}
      {selectedCustomer && (
        <div className="card card-transaction mb-6">
          <div className="card-header">
            <h2 className="card-title flex items-center gap-3">
              <svg className="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Nuova Vendita
            </h2>
            <p className="card-subtitle">Registra una vendita per {selectedCustomer.name}</p>
          </div>

          <div className="card-body">
            <div className="max-w-md">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                  <span className="currency-symbol">€</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={transactionAmount}
                    onChange={(e) => setTransactionAmount(e.target.value)}
                    className="input-currency"
                  />
                </div>
                <button
                  onClick={handleAddTransaction}
                  disabled={
                    !transactionAmount ||
                    parseFloat(transactionAmount) <= 0 ||
                    !selectedCustomer.is_active // <--- AGGIUNGI QUESTO
                  }
                  className="btn btn-warning px-8 py-4 text-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Registra Vendita
                </button>
              </div>

              {transactionAmount && (
                <div className="flex items-center gap-3 p-4 bg-white bg-opacity-70 rounded-lg border border-orange-200">
                  <div className="gemme-icon"></div>
                  <span className="font-semibold text-orange-800">
                    Aggiungerà: <strong>{Math.floor(parseFloat(transactionAmount || 0))} GEMME</strong>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PREMI DISPONIBILI */}
      {selectedCustomer && prizes.length > 0 && (
        <div className="card mb-6">
          <div className="card-header">
            <h2 className="card-title flex items-center gap-3">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Riscatta Premi
            </h2>
            <p className="card-subtitle">Premi disponibili per {selectedCustomer.name}</p>
          </div>
          <div className="card-body">
            <div className="grid grid-auto gap-4">
              {prizes.map(prize => {
                // Gestione livello minimo
                const levelOrder = ['Bronzo', 'Argento', 'Oro', 'Diamante']
                const customerLevelIndex = selectedCustomer.level
                  ? levelOrder.indexOf(selectedCustomer.level)
                  : 0
                const prizeLevelIndex = prize.min_level
                  ? levelOrder.indexOf(prize.min_level)
                  : 0
                const hasLevel = customerLevelIndex >= prizeLevelIndex
                const hasPoints = selectedCustomer.points >= prize.points_cost

                return (
                  <div
                    key={prize.id}
                    className={`p-6 rounded-xl border transition-all shadow-sm bg-white flex flex-col gap-3 ${hasLevel && hasPoints
                      ? 'border-green-500'
                      : !hasLevel
                        ? 'border-gray-300 opacity-60'
                        : 'border-orange-300 opacity-80'
                      }`}
                    style={{ minWidth: 260, maxWidth: 340, minHeight: 220, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {prize.image_url ? (
                          <img
                            src={prize.image_url}
                            alt={prize.name}
                            className="rounded-lg"
                            style={{ width: 60, height: 60, objectFit: 'cover', background: '#f3f4f6' }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 60,
                              height: 60,
                              background: '#f3f4f6',
                              borderRadius: 12,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#bbb',
                              fontSize: 28,
                            }}
                          >
                            🎁
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-brand text-lg">{prize.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <img
                              src="/gemma-rossa.png"
                              alt="gemma"
                              style={{ width: 22, height: 22, marginRight: 2, verticalAlign: 'middle', display: 'inline-block' }}
                            />
                            <span className="text-xl font-bold text-red-600">{prize.points_cost}</span>
                            <span className="text-xs font-semibold text-red-700">GEMME</span>
                          </div>
                          {prize.min_level && (
                            <div
                              className="prize-min-level"
                              style={{
                                marginTop: 4,
                                color: '#9333ea',
                                fontWeight: 500,
                                fontSize: 13,
                              }}
                            >
                              Richiede livello <b>{prize.min_level}</b>
                            </div>
                          )}
                        </div>
                      </div>
                      {prize.description && (
                        <p className="text-secondary text-sm mb-2">{prize.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => redeemPrize(prize)}
                      disabled={
                        !(hasLevel && hasPoints) ||
                        !selectedCustomer.is_active
                      }
                      className={`redeem-prize-btn ${
                        hasLevel && hasPoints && selectedCustomer.is_active
                          ? 'active pulse'
                          : !hasLevel
                            ? 'level-required'
                            : !hasPoints
                              ? 'insufficient'
                              : 'disabled'
                      }`}
                    >
                      {hasLevel && hasPoints && selectedCustomer.is_active
                        ? (
                          <>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                            </svg>
                            Riscatta
                          </>
                        )
                        : !hasLevel
                          ? (
                            <>
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Livello {prize.min_level} richiesto
                            </>
                          )
                          : !hasPoints
                            ? (
                              <>
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4m16 0a8 8 0 01-8 8m8-8a8 8 0 00-8-8m8 8H4m0 0a8 8 0 018-8m-8 8a8 8 0 008 8" />
                                </svg>
                                {prize.points_cost} GEMME necessarie
                              </>
                            )
                            : (
                              <>
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                                Non disponibile
                              </>
                            )
                      }
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* GESTIONE MANUALE GEMME - MANTENUTO */}
      <div className="card mb-6">
        <div className="card-header">
          <h2 className="card-title flex items-center gap-3">
            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Gestione Manuale GEMME
            
            {/* CONTROLLI SUONI */}
            <div className="flex items-center gap-2 ml-auto">
              {/* Selettore tipo suono rimozione */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-gray-600">Suono (-):</span>
                <select
                  value={useAltRemoveSound ? 'alt' : 'standard'}
                  onChange={(e) => setUseAltRemoveSound(e.target.value === 'alt')}
                  className="text-xs px-2 py-1 border rounded bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                  title="Scegli il tipo di suono per la rimozione GEMME"
                >
                  <option value="standard">🔴 lose.wav</option>
                  <option value="alt">⚠️ remove.wav</option>
                </select>
              </div>
              
              {/* Pulsante test suoni */}
              <button
                type="button"
                onClick={testGemmeSounds}
                className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors text-gray-600 hover:text-gray-800"
                title="Testa tutti i suoni GEMME"
              >
                🔊 Test Tutti
              </button>
              
              {/* Pulsante test suono rimozione corrente */}
              <button
                type="button"
                onClick={() => {
                  if (useAltRemoveSound) {
                    playRemoveGemmeAlt(-5)
                  } else {
                    playRemoveGemmeStandard(-5)
                  }
                }}
                className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 rounded-md transition-colors text-red-600 hover:text-red-800"
                title="Testa solo il suono di rimozione selezionato"
              >
                🔊 (-)
              </button>
            </div>
          </h2>
          <p className="card-subtitle">Modifica GEMME per rimborsi, compensazioni o situazioni speciali</p>
        </div>
        <div className="card-body">
          <form className="space-y-6" onSubmit={e => e.preventDefault()}>
            {/* BARRA DI RICERCA POTENZIATA */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Cerca cliente per nome, telefono o email..."
                value={manualCustomerName}
                onChange={(e) => {
                  setManualCustomerName(e.target.value)
                  searchCustomersForManual(e.target.value)
                }}
                className="w-full pl-10 pr-10 py-4 border-2 border-gray-200 rounded-xl focus:border-brand focus:outline-none transition-all duration-200 bg-gray-50 hover:bg-white"
              />
              {manualCustomerName && (
                <button
                  type="button"
                  onClick={() => {
                    setManualCustomerName('')
                    setFoundCustomers([])
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* CLIENTI TROVATI */}
            {foundCustomers.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {foundCustomers.length} cliente{foundCustomers.length !== 1 ? 'i' : ''} trovato{foundCustomers.length !== 1 ? 'i' : ''}
                </div>
                
                {foundCustomers.map(customer => (
                  <div key={customer.id} className={`manual-gemme-customer-card ${!customer.is_active ? 'opacity-60' : ''}`}>
                    {/* HEADER CLIENTE */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`customer-avatar-small ${customer.name ? customer.name.charAt(0).toUpperCase() : 'A'}`}>
                          {customer.name ? customer.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="font-medium">{customer.points} GEMME</span>
                          </div>
                        </div>
                      </div>
                      {!customer.is_active && (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                          Disattivato
                        </span>
                      )}
                    </div>

                    {/* QUICK ACTIONS */}
                    <div className="quick-actions">
                      <button
                        type="button"
                        onClick={() => modifyPointsWithSound(customer, '-5')}
                        disabled={!customer.is_active}
                        className="quick-btn negative"
                        title="Rimuovi 5 GEMME"
                      >
                        -5
                      </button>
                      <button
                        type="button"
                        onClick={() => modifyPointsWithSound(customer, '-10')}
                        disabled={!customer.is_active}
                        className="quick-btn negative"
                        title="Rimuovi 10 GEMME"
                      >
                        -10
                      </button>
                      <button
                        type="button"
                        onClick={() => modifyPointsWithSound(customer, '5')}
                        disabled={!customer.is_active}
                        className="quick-btn positive"
                        title="Aggiungi 5 GEMME"
                      >
                        +5
                      </button>
                      <button
                        type="button"
                        onClick={() => modifyPointsWithSound(customer, '10')}
                        disabled={!customer.is_active}
                        className="quick-btn positive"
                        title="Aggiungi 10 GEMME"
                      >
                        +10
                      </button>
                    </div>

                    {/* INPUT PERSONALIZZATO */}
                    <div className="flex gap-3 mt-4">
                      <div className="flex-1">
                        <input
                          type="number"
                          placeholder="Inserisci valore personalizzato (±)"
                          value={manualPoints}
                          onChange={(e) => setManualPoints(e.target.value)}
                          disabled={!customer.is_active}
                          className="gemme-input"
                        />
                        {manualPoints && (
                          <div className="preview-section">
                            <div className="text-xs text-gray-600">Anteprima:</div>
                            <div className="font-medium">
                              {customer.points} 
                              <span className={parseInt(manualPoints) >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {parseInt(manualPoints) >= 0 ? ' +' : ' '}
                                {manualPoints}
                              </span> 
                              = {customer.points + parseInt(manualPoints || 0)} GEMME
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => modifyPointsWithSound(customer, manualPoints)}
                        disabled={
                          !manualPoints ||
                          parseInt(manualPoints) === 0 ||
                          !customer.is_active
                        }
                        className="apply-btn"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Applica
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* STATO VUOTO */}
            {manualCustomerName && foundCustomers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-sm">Nessun cliente trovato per "{manualCustomerName}"</p>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* LISTA CLIENTI */}
      {searchTerm && filteredCustomers.length > 0 && (
        <div className="card mt-6">
          <div className="card-header">
            <h2 className="card-title">Risultati Ricerca</h2>
            <p className="card-subtitle">Trovati {filteredCustomers.length} clienti per "{searchTerm}"</p>
          </div>

          <div className="card-body">
            <div className="grid grid-auto gap-4">
              {filteredCustomers.slice(0, 6).map(customer => (
                <div
                  key={customer.id}
                  className={`search-result-item ${selectedCustomer?.id === customer.id ? 'selected' : ''
                    }`}
                  onClick={() => {
                    handleNFCCustomerFound(customer)
                    loadCustomerConsents(customer.id)
                  }}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-brand">{customer.name}</h4>
                      <p className="text-sm text-secondary">{customer.phone}</p>
                      <p className="text-xs text-muted">{customer.email || 'Nessuna email'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="gemme-icon"></div>
                      <span className="text-lg font-bold text-red-600">{customer.points}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* LINK CLIENTE */}
      {selectedCustomer && (
        <div className="customer-actions">
          <h4>🔗 Link Cliente</h4>
          <div className="client-link-section">
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => handleGenerateClientLink(selectedCustomer)}
                className="generate-link-btn"
              >
                📱 Genera Link Cliente
              </button>
              {regenerateClientToken && (
                <button
                  onClick={() => handleRegenerateClientLink(selectedCustomer)}
                  className="btn btn-outline-warning"
                  title="Rigenera un nuovo token (il vecchio smetterà di funzionare)"
                >
                  🔄 Rigenera Link
                </button>
              )}
            </div>
            {clientLinks[selectedCustomer.id] && (
              <div className="generated-link">
                <p>Link generato:</p>
                <div className="link-container">
                  <input
                    type="text"
                    value={clientLinks[selectedCustomer.id].url}
                    readOnly
                    className="link-input"
                  />
                  <button
                    onClick={async () => {
                      await copyClientLink(clientLinks[selectedCustomer.id].url, showNotification)
                    }}
                    className="copy-link-btn"
                  >
                    📋
                  </button>
                  <a
                    href={`mailto:${selectedCustomer.email || ''}?subject=Il%20tuo%20link%20cliente%20Sapori%20e%20Colori&body=Ecco%20il%20tuo%20link%20personale%20per%20vedere%20le%20tue%20GEMME:%0A${encodeURIComponent(clientLinks[selectedCustomer.id].url)}`}
                    className="copy-link-btn"
                    style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={selectedCustomer.email ? "Invia via email" : "Nessuna email cliente"}
                  >
                    📧
                  </a>
                </div>
                <p className="link-description">
                  Il cliente può salvare questo link per vedere le sue GEMME
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SEZIONE RIMBORSO */}
      {selectedCustomer && (
        <div className="referral-section-enhanced">
          {/* Header con animazione */}
          <div className="referral-header">
            <h4>🎁 Programma Invita un Amico</h4>
            {selectedCustomer.referral_count >= 5 && (
              <span className="referral-badge">⭐ TOP REFERRER</span>
            )}
          </div>

          {/* Progress Bar verso prossimo premio */}
          <div className="referral-progress">
            <div className="progress-info">
              <span>Prossimo premio tra {5 - (selectedCustomer.referral_count % 5)} inviti</span>
              <span className="bonus-preview">🎁 Mystery Box</span>
            </div>
            <div className="progress-bar-referral">
              <div
                className="progress-fill-referral"
                style={{ width: `${((selectedCustomer.referral_count % 5) / 5) * 100}%` }}
              />
            </div>
          </div>

          {/* Codice con effetto premium */}
          <div className="referral-code-box">
            <div className="code-label">Il tuo codice esclusivo:</div>
            <div className="code-container">
              <div className="code-display">
                <span className="code-text">{selectedCustomer.referral_code || 'GENERA'}</span>
                <div className="code-actions">
                  <button
                    className="btn-copy-fancy"
                    onClick={async () => {
                      // Test multipli per debug
                      const code = selectedCustomer.referral_code;
                      
                      // Prova prima la funzione custom
                      const customSuccess = await copyReferralCode(code, showNotification);
                      
                      // Se fallisce, prova il metodo diretto con più informazioni
                      if (!customSuccess) {
                        if (navigator.clipboard && window.isSecureContext) {
                          try {
                            await navigator.clipboard.writeText(code);
                            showNotification('✅ Copiato con metodo diretto!', 'success');
                          } catch (err) {
                            showNotification(`❌ Errore: ${err.message}`, 'error');
                            
                            // Fallback finale: mostra il codice in un alert
                            alert(`Copia manualmente questo codice:\n\n${code}\n\nSeleziona tutto e premi Ctrl+C (o Cmd+C su Mac)`);
                          }
                        } else {
                          showNotification('⚠️ Clipboard non disponibile - usa il fallback manuale', 'warning');
                          alert(`Copia manualmente questo codice:\n\n${code}`);
                        }
                      }
                    }}
                    disabled={!selectedCustomer.referral_code}
                    title={`Codice: ${selectedCustomer.referral_code || 'Nessuno'}`}
                  >
                    📋
                  </button>
                  <button
                    className="btn-qr"
                    onClick={() => setShowQRModal(true)}
                  >
                    QR
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats con animazioni */}
          <div className="referral-stats-grid">
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-number counter">{selectedCustomer.referral_count || 0}</div>
              <div className="stat-label">Amici invitati</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💎</div>
              <div className="stat-number counter">{selectedCustomer.referral_points_earned || 0}</div>
              <div className="stat-label">Gemme bonus</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🏆</div>
              <div className="stat-number">{getReferralLevel(selectedCustomer.referral_count)}</div>
              <div className="stat-label">Livello</div>
            </div>
            
            {/* Pulsante correzione dati */}
            <div className="stat-card" style={{backgroundColor: '#f8f9fa', cursor: 'pointer'}} 
                 onClick={() => fixReferralData && fixReferralData(selectedCustomer.id)}>
              <div className="stat-icon">🔧</div>
              <div className="stat-number" style={{fontSize: '12px'}}>CORREGGI</div>
              <div className="stat-label">Dati referral</div>
            </div>
          </div>

          {/* Lista amici invitati (se > 0) */}
          {referredFriends.length > 0 && (
            <div className="referred-friends-list">
              <h5>I tuoi inviti: ({referredFriends.length} in lista, {selectedCustomer.referral_count || 0} nel database)</h5>
              {referredFriends.length !== (selectedCustomer.referral_count || 0) && (
                <div style={{background: '#fff3cd', padding: '8px', borderRadius: '4px', marginBottom: '10px', fontSize: '12px'}}>
                  ⚠️ DISCREPANZA: Lista mostra {referredFriends.length} referral, ma il database ne conta {selectedCustomer.referral_count || 0}
                  <button 
                    onClick={() => fixReferralData && fixReferralData(selectedCustomer.id)}
                    style={{
                      marginLeft: '10px', 
                      padding: '4px 8px', 
                      fontSize: '11px', 
                      background: '#28a745', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    🔧 Correggi
                  </button>
                </div>
              )}
              {referredFriends.map((friend, index) => (
                <div key={friend.id} className="friend-item">
                  <span className="friend-number">#{index + 1}</span>
                  <span className="friend-name">{friend.referred?.name || 'Nome non disponibile'}</span>
                  <span className="friend-status">
                    {friend.status === 'completed' ? '✅ Attivo' : '⏳ In attesa'}
                  </span>
                  {friend.status === 'completed' && <span className="bonus-earned">+{friend.points_awarded || 20} 💎</span>}
                  
                  {/* Pulsante per completare manualmente se in attesa */}
                  {friend.status === 'pending' && (
                    <button
                      className="btn-complete-referral"
                      onClick={async () => {
                        console.log('🔘 Pulsante completa cliccato per:', friend.referred?.name, 'ID:', friend.referred_id);
                        
                        if (confirm(`Completare manualmente il referral per ${friend.referred?.name}?\n\nQuesto assegnerà i bonus.`)) {
                          try {
                            console.log('✅ Confermato! Chiamando completeReferral...');
                            
                            // Chiama direttamente la funzione completeReferral
                            await completeReferral(friend.referred_id);
                            
                            console.log('🎉 completeReferral completata!');
                            showNotification(`✅ Referral di ${friend.referred?.name} completato!`, 'success');
                            
                            // Ricarica i dati
                            loadReferredFriends(selectedCustomer.id);
                            
                          } catch (error) {
                            console.error('❌ Errore completamento referral:', error);
                            showNotification('❌ Errore nel completamento del referral', 'error');
                          }
                        } else {
                          console.log('❌ Utente ha annullato');
                        }
                      }}
                      title="Completa manualmente questo referral"
                    >
                      ✅ Completa
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Call to action buttons */}
          <div className="referral-actions">
            <button
              className="btn-share-whatsapp"
              onClick={shareOnWhatsApp}
            >
              <span className="btn-icon">💬</span>
              WhatsApp
            </button>
            <button
              className="btn-share-social"
              onClick={openShareModal}
            >
              <span className="btn-icon">📲</span>
              Altri Social
            </button>
          </div>

          {/* Bonus multiplier attivo */}
          {isMultiplierActive && (
            <div className="multiplier-alert">
              🔥 BONUS 2X ATTIVO! Invita ora e guadagna il doppio!
            </div>
          )}
        </div>
      )}

      {/* MODAL QR CODE */}
      {showQRModal && selectedCustomer && (
        <div className="modal-overlay" onClick={() => setShowQRModal(false)}>
          <div className="modal-content qr-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📱 QR Code Referral</h2>
              <button className="btn-close" onClick={() => setShowQRModal(false)}>✕</button>
            </div>
            <div className="modal-body text-center">
              <div className="qr-code-container">
                {/* Per ora mostriamo solo il codice, ma puoi aggiungere una libreria QR */}
                <div className="qr-placeholder">
                  <div className="qr-code-text">
                    <h3>{selectedCustomer.referral_code}</h3>
                    <p>Mostra questo codice in negozio</p>
                  </div>
                </div>
                <p className="qr-instructions">
                  Fai scannerizzare questo codice ai tuoi amici per farli registrare 
                  automaticamente con il tuo codice referral!
                </p>
              </div>
              <button 
                className="btn-primary"
                onClick={() => {
                  showNotification('🚧 Funzione stampa in arrivo!', 'info');
                }}
              >
                🖨️ Stampa QR Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ANIMAZIONE GEMME */}
      {showGemmeRain && (
        <div className="gemme-rain">
          {[...Array(18)].map((_, i) => (
            <img
              key={i}
              src="/gemma-rossa.png"
              alt="gemma"
              className="gemma-drop"
              style={{
                left: `${Math.random() * 95}%`,
                animationDelay: `${Math.random() * 0.7}s`
              }}
            />
          ))}
        </div>
      )}

      {/* MODAL MODIFICA CLIENTE */}
      {showEditModal && editingCustomer && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✏️ Modifica Cliente</h2>
              <button
                className="close-btn"
                onClick={() => setShowEditModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Nome */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-brand mb-1">Nome</label>
                <input
                  type="text"
                  value={editingCustomer.name}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-brand focus:outline-none transition-colors"
                />
              </div>

              {/* Telefono */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-brand mb-1">Telefono</label>
                <input
                  type="text"
                  value={editingCustomer.phone}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-brand focus:outline-none transition-colors"
                />
              </div>

              {/* Email */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-brand mb-1">Email</label>
                <input
                  type="email"
                  value={editingCustomer.email}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-brand focus:outline-none transition-colors"
                />
              </div>

              {/* Città */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-brand mb-1">Città</label>
                <input
                  type="text"
                  value={editingCustomer.city}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, city: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-brand focus:outline-none transition-colors"
                />
              </div>

              {/* Data di nascita */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-brand mb-1">Data di Nascita</label>
                <input
                  type="date"
                  value={editingCustomer.birth_date ? editingCustomer.birth_date.substring(0, 10) : ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, birth_date: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-brand focus:outline-none transition-colors"
                />
              </div>

              {/* Note */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-brand mb-1">Note Operatore</label>
                <textarea
                  value={editingCustomer.notes}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, notes: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-brand focus:outline-none transition-colors"
                  rows="3"
                ></textarea>
              </div>

              {/* Consensi */}
              <div className="mb-4">
                <h4 className="font-semibold text-brand mb-2">Consensi Privacy</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(customerConsents).map(([type, consent]) => (
                    <div key={type} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={consent.consent_given}
                        onChange={() => {
                          const newConsents = { ...customerConsents }
                          newConsents[type].consent_given = !newConsents[type].consent_given
                          setCustomerConsents(newConsents)
                        }}
                        className="form-checkbox h-5 w-5 text-brand"
                      />
                      <span className="text-sm text-gray-700">{getConsentDescription(type)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowEditModal(false)}
              >
                Annulla
              </button>
              <button
                className="btn btn-primary"
                onClick={saveCustomerEdits}
                disabled={!editingCustomer.name || !editingCustomer.phone}
              >
                💾 Salva Modifiche
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* DEBUG CLIPBOARD */}
      <ClipboardDebug showNotification={showNotification} />
    </div>
  )
}

export default CustomerView