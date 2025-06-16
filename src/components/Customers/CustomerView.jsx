import { useState } from 'react'
import NFCQuickReader from '../NFC/NFCQuickReader'
import RegistrationWizard from '../Registration/RegistrationWizard'
import ClipboardDebug from '../Common/ClipboardDebug'
import QRCodeReader from '../Common/QRCodeReader'
import { supabase } from '../../supabase'
import { copyToClipboard, copyReferralCode } from '../../utils/clipboardUtils'
import { playAddGemmeSound } from '../../utils/soundUtils'
import PrivacyManagement from '../Privacy/PrivacyManagement'

function CustomerView({
  searchTerm,
  setSearchTerm,
  customers,
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
  manualPoints,
  setManualPoints,
  modifyPoints,
  showNotification,
  generateClientTokenForCustomer,
  regenerateClientToken,
  loadCustomers,
  deactivateCustomer,
  reactivateCustomer,
  referredFriends,
  getReferralLevel,
  isMultiplierActive
}) {
  const [showGemmeRain, setShowGemmeRain] = useState(false);
  const [showRegistrationWizard, setShowRegistrationWizard] = useState(false)
  const [customerConsents, setCustomerConsents] = useState({})
  const [showQRScanner, setShowQRScanner] = useState(false)

  // Funzione per gestire cliente trovato via NFC
  const handleNFCCustomerFound = async (customer) => {
    setSelectedCustomer(customer)
    await loadConsentForSelectedCustomer(customer)
    showNotification(`✅ Cliente trovato: ${customer.name}`, 'success')
  }

  // Funzione per gestire QR scan
  const handleQRScan = async (qrData) => {
    console.log('🔍 QR Scansionato:', qrData)

    try {
      if (qrData.startsWith('CUSTOMER:')) {
        const customerId = qrData.split(':')[1]
        console.log('👤 ID Cliente dal QR:', customerId)

        const { data: customer, error } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .single()

        if (error) {
          console.error('❌ Errore ricerca cliente:', error)
          showNotification('❌ Cliente non trovato nel database', 'error')
          return
        }

        if (customer) {
          console.log('✅ Cliente trovato dal QR:', customer)
          setSelectedCustomer(customer)
          await loadConsentForSelectedCustomer(customer)
          setShowQRScanner(false)
          showNotification(`✅ Cliente trovato via QR: ${customer.name}`, 'success')
        } else {
          console.log('❌ Nessun cliente trovato con ID:', customerId)
          showNotification(`❌ Nessun cliente trovato con ID: ${customerId}`, 'error')
        }
      } else {
        console.log('⚠️ QR non riconosciuto come cliente')
        showNotification('⚠️ QR code non valido per riconoscimento cliente', 'warning')
      }
    } catch (error) {
      console.error('❌ Errore elaborazione QR:', error)
      showNotification('❌ Errore durante la scansione del QR', 'error')
    }
  }

  // Funzioni helper
  const calculateAge = (birthDate) => {
    if (!birthDate) return null
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
      return age - 1
    }
    return age
  }

  const getCustomerCategory = (points) => {
    if (points < 50) return { name: 'BRONZO', color: '#cd7f32', emoji: '🥉' }
    if (points < 100) return { name: 'ARGENTO', color: '#c0c0c0', emoji: '🥈' }
    if (points < 200) return { name: 'ORO', color: '#ffd700', emoji: '🥇' }
    if (points < 500) return { name: 'PLATINO', color: '#e5e4e2', emoji: '💎' }
    return { name: 'VIP', color: '#9b59b6', emoji: '👑' }
  }

  // Handle transaction con suoni e animazioni
  const handleAddTransaction = async () => {
    if (selectedCustomer && transactionAmount) {
      const amount = parseFloat(transactionAmount)
      
      console.log(`💎 Inizio registrazione vendita per ${selectedCustomer.name}`)
      console.log(`💰 Importo: €${amount}`)
      
      // Suona il suono di aggiunta gemme
      try {
        console.log('🎵 Chiamata playAddGemmeSound...')
        playAddGemmeSound(amount)
        console.log('✅ Suono riprodotto con successo')
      } catch (error) {
        console.error('❌ Errore riproduzione suono:', error)
      }
      
      // Mostra la pioggia di gemme
      console.log('🌧️ Avvio animazione pioggia gemme')
      setShowGemmeRain(true)
      setTimeout(() => {
        setShowGemmeRain(false)
        console.log('🛑 Fermata animazione pioggia gemme')
      }, 3000)
      
      // Registra la transazione
      console.log('💾 Registrazione transazione...')
      addTransaction(selectedCustomer, amount)
      
      showNotification(`💎 Aggiunte ${Math.floor(amount)} GEMME a ${selectedCustomer.name}!`, 'success')
      console.log('✅ Vendita registrata completamente')
    }
  }

  // Filtra clienti per ricerca
  const filteredCustomers = searchTerm
    ? customers.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 10)
    : []

  // Funzioni social
  const shareOnWhatsApp = () => {
    if (!selectedCustomer) return;
    const message = `🎉 Ciao! Ti invito a scoprire il fantastico programma fedeltà di Sapori e Colori! 

Con il mio codice referral ${selectedCustomer.referral_code} riceverai subito 5 GEMME gratuite! 💎

Registrati qui: https://saporiecolori.it/ref/${selectedCustomer.referral_code}

Più acquisti, più gemme accumuli, più premi ottieni! 🎁`

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  const openShareModal = async () => {
    showNotification('🚀 Presto disponibili più opzioni di condivisione!', 'info');
    const shareLink = `https://saporiecolori.it/ref/${selectedCustomer.referral_code}`;
    await copyToClipboard(shareLink, showNotification);
  };

  // Funzioni portale cliente
  const handleGenerateClientPortal = async () => {
    try {
      const token = await generateClientTokenForCustomer(selectedCustomer.id);
      if (token) {
        const clientUrl = `${window.location.origin}/cliente/${token}`;
        await copyToClipboard(clientUrl, showNotification);
        showNotification('🔗 Link portale cliente generato e copiato negli appunti!', 'success');
      }
    } catch (error) {
      console.error('Errore generazione portale cliente:', error);
      showNotification('❌ Errore nella generazione del link portale cliente', 'error');
    }
  };

  const handleRegenerateClientPortal = async () => {
    try {
      const token = await regenerateClientToken(selectedCustomer.id);
      if (token) {
        const clientUrl = `${window.location.origin}/cliente/${token}`;
        await copyToClipboard(clientUrl, showNotification);
        showNotification('🔄 Link portale cliente rigenerato e copiato negli appunti!', 'success');
      }
    } catch (error) {
      console.error('Errore rigenerazione portale cliente:', error);
      showNotification('❌ Errore nella rigenerazione del link portale cliente', 'error');
    }
  };

  // Funzione per caricare i consensi privacy dal database
  const loadCustomerConsents = async (customerId) => {
    try {
      console.log('Caricamento consensi per cliente:', customerId)
      
      // Carica consensi dal database Supabase
      const { data, error } = await supabase
        .from('customer_consents')
        .select('*')
        .eq('customer_id', customerId)
        .single()

      // Gestione errori migliorata - rileva tabella mancante in più modi
      if (error) {
        console.log('Dettagli errore caricamento:', error)
        
        const isTableNotFound = 
          error.code === '42P01' || 
          error.message?.includes('does not exist') ||
          error.message?.includes('customer_consents') ||
          (error.details === null && error.hint === null && !error.code)
        
        if (isTableNotFound) {
          console.warn('⚠️ Tabella customer_consents non ancora creata. Usando valori default.')
        } else if (error.code !== 'PGRST116') { // PGRST116 = record non trovato
          console.error('Errore caricamento consensi:', error)
        }
        
        return {
          fidelity: true,
          marketing: false,
          newsletter: false,
          profiling: false
        }
      }

      // Se non ci sono consensi nel DB, restituisci default
      if (!data) {
        return {
          fidelity: true,
          marketing: false,
          newsletter: false,
          profiling: false
        }
      }

      // Restituisci consensi dal database
      console.log('✅ Consensi caricati dal database:', data)
      return {
        fidelity: data.fidelity || true,
        marketing: data.marketing || false,
        newsletter: data.newsletter || false,
        profiling: data.profiling || false
      }
    } catch (error) {
      console.error('Errore caricamento consensi nel catch:', error)
      return {
        fidelity: true,
        marketing: false,
        newsletter: false,
        profiling: false
      }
    }
  }

  // Carica i consensi quando viene selezionato un cliente
  const loadConsentForSelectedCustomer = async (customer) => {
    if (customer && customer.id) {
      const consents = await loadCustomerConsents(customer.id)
      setCustomerConsents(prev => ({
        ...prev,
        [customer.id]: consents
      }))
    }
  }

  return (
    <div className="p-6">
      {/* WIZARD REGISTRAZIONE - OVERLAY COMPLETO */}
      {showRegistrationWizard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-lg w-full h-full max-w-none max-h-none overflow-auto" style={{ margin: '20px', maxWidth: 'calc(100vw - 40px)', maxHeight: 'calc(100vh - 40px)' }}>
            <RegistrationWizard
              onComplete={(customer, successMessage) => {
                loadCustomers()
                setShowRegistrationWizard(false)
                setSelectedCustomer(customer)
                showNotification(successMessage || `✅ Cliente ${customer.name} registrato con successo!`, 'success')
              }}
              onCancel={() => setShowRegistrationWizard(false)}
              showNotification={showNotification}
            />
          </div>
        </div>
      )}

      {/* HEADER PRINCIPALE */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-brand">Gestione Clienti</h1>
            <p className="text-secondary">Identifica clienti, registra vendite e gestisci il programma fedeltà</p>
          </div>
          <button
            onClick={() => setShowRegistrationWizard(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nuovo Cliente
          </button>
        </div>
      </div>

      {/* SEZIONE NFC READER */}
      <div className="card mb-6">
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
        </div>
      </div>

      {/* SEZIONE QR SCANNER */}
      <div className="card mb-6">
        <div className="card-header">
          <h2 className="card-title flex items-center gap-3">
            <svg className="w-6 h-6 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6V4H4zm10 0v6h6V4h-6zM4 14v6h6v-6H4zm7 0l3 3 6-6" />
            </svg>
            Scanner QR Code Cliente
          </h2>
          <p className="card-subtitle">Scansiona il QR code dal portale cliente</p>
        </div>
        <div className="card-body">
          <div className="qr-scanner-controls mb-4">
            <button
              onClick={() => setShowQRScanner(!showQRScanner)}
              className={`btn ${showQRScanner ? 'btn-danger' : 'btn-primary'} mb-3`}
            >
              {showQRScanner ? '❌ Chiudi Scanner' : '📷 Apri Scanner QR'}
            </button>



            {showQRScanner && (
              <div className="qr-scanner-container mt-4">
                <QRCodeReader
                  onScan={handleQRScan}
                  onError={(error) => showNotification(`❌ Errore scanner: ${error}`, 'error')}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SEZIONE RICERCA MANUALE - REDESIGN COERENTE */}
      <div className="card mb-6">
        <div className="card-header">
          <h2 className="card-title flex items-center gap-3">
            <svg className="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Ricerca Cliente
          </h2>
          <p className="card-subtitle">Cerca per nome, telefono o email</p>
        </div>
        <div className="card-body">
          {/* BARRA DI RICERCA */}
          <div className="relative mb-6">
            <div className="search-icon">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Cerca cliente per nome, telefono o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="clear-search"
              >
                ✕
              </button>
            )}
          </div>

          {/* GESTIONE MANUALE GEMME */}
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-amber-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
              Gestione Manuale GEMME
            </h3>
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                placeholder="Nome cliente per ricerca rapida..."
                value={manualCustomerName}
                onChange={(e) => setManualCustomerName(e.target.value)}
                className="flex-1 px-4 py-2 border border-amber-300 rounded-lg focus:border-amber-500 focus:outline-none"
              />
              <button
                onClick={() => {
                  console.log('🔍 Pulsante ricerca cliccato:', { manualCustomerName })
                  searchCustomersForManual(manualCustomerName)
                }}
                disabled={!manualCustomerName}
                className="btn btn-primary"
              >
                🔍 Cerca
              </button>
            </div>

            {foundCustomers.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-amber-800">Clienti trovati per modifica GEMME:</h4>
                {foundCustomers.map(customer => (
                  <div key={customer.id} className="p-4 bg-white border border-amber-200 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h5 className="font-bold text-brand-primary">{customer.name}</h5>
                          <p className="text-sm text-secondary">{customer.phone} • {customer.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                            <span className="font-bold text-gemme-red">{customer.points} GEMME</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          setSelectedCustomer(customer)
                          await loadConsentForSelectedCustomer(customer)
                        }}
                        className="btn btn-primary"
                      >
                        📋 Seleziona Cliente
                      </button>
                    </div>

                    <div className="flex gap-3 items-center">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-amber-800 mb-1">
                          Modifica GEMME (usa + o - per aggiungere/rimuovere):
                        </label>
                        <input
                          type="number"
                          placeholder="es: +10, -5, 20"
                          value={manualPoints}
                          onChange={(e) => setManualPoints(e.target.value)}
                          className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={() => {
                          console.log('🔘 Pulsante modifica GEMME cliccato:', { 
                            customerName: customer?.name, 
                            customerId: customer?.id,
                            currentPoints: customer?.points,
                            manualPoints, 
                            parsedPoints: parseInt(manualPoints),
                            isValid: !(!manualPoints || manualPoints.trim() === '' || isNaN(parseInt(manualPoints)) || parseInt(manualPoints) === 0)
                          })
                          modifyPoints(customer, manualPoints)
                          // Il reset del campo viene fatto automaticamente da modifyPoints
                        }}
                        disabled={!manualPoints || manualPoints.trim() === '' || isNaN(parseInt(manualPoints)) || parseInt(manualPoints) === 0}
                        className={`btn ${!manualPoints || manualPoints.trim() === '' || isNaN(parseInt(manualPoints)) || parseInt(manualPoints) === 0 ? 'btn-secondary' : 'btn-success'} px-6`}
                      >
                        ✅ Applica Modifica
                      </button>
                    </div>
                    
                    {manualPoints && !isNaN(parseInt(manualPoints)) && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-blue-800">
                            <strong>Anteprima:</strong> {customer.name} avrà{' '}
                            <strong className="text-gemme-red">
                              {Math.max(0, customer.points + parseInt(manualPoints))} GEMME
                            </strong>
                            {' '}({parseInt(manualPoints) > 0 ? '+' : ''}{parseInt(manualPoints)} GEMME)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* LISTA CLIENTI DALLA RICERCA GENERALE */}
          {searchTerm && filteredCustomers.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold">Risultati ricerca:</h4>
                <div className="grid gap-3">
                  {filteredCustomers.map(customer => (
                    <div 
                      key={customer.id} 
                      className="customer-card-search" 
                      onClick={async () => {
                        setSelectedCustomer(customer)
                        await loadConsentForSelectedCustomer(customer)
                      }}
                    >
                      <div className="customer-card-header">
                        <div className="customer-avatar">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="customer-info">
                          <h3 className="font-bold text-brand">{customer.name}</h3>
                          <p className="text-sm text-secondary">{customer.phone} • {customer.email}</p>
                        </div>
                        <div className="customer-points">
                          <div className="flex items-center gap-1 mb-1">
                            <div className="gemme-icon"></div>
                            <span className="font-bold text-red-600">{customer.points}</span>
                          </div>
                          <div
                            className="customer-category"
                            style={{ backgroundColor: getCustomerCategory(customer.points).color }}
                          >
                            {getCustomerCategory(customer.points).emoji} {getCustomerCategory(customer.points).name}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>

      {/* CLIENTE SELEZIONATO */}
      {selectedCustomer && (
        <div className="space-y-6">
          {/* INFO CLIENTE */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title flex items-center gap-3">
                <svg className="w-6 h-6 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Cliente Selezionato
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="btn btn-sm btn-danger"
                >
                  ❌ Deseleziona
                </button>
              </div>
            </div>
            <div className="card-body">
              {/* INDICATORE STATO CLIENTE */}
              {selectedCustomer.is_active === false && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="font-bold text-red-700">⚠️ CLIENTE DISATTIVATO</span>
                  </div>
                  {selectedCustomer.deactivation_reason && (
                    <p className="text-sm text-red-600 mt-1">
                      <strong>Motivo:</strong> {selectedCustomer.deactivation_reason}
                    </p>
                  )}
                  {selectedCustomer.deactivated_at && (
                    <p className="text-sm text-red-600 mt-1">
                      <strong>Disattivato il:</strong> {new Date(selectedCustomer.deactivated_at).toLocaleDateString('it-IT')}
                    </p>
                  )}
                </div>
              )}

              <div className="customer-info-box flex items-center gap-6">
                <div className="customer-avatar">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-2xl font-bold text-brand">{selectedCustomer.name}</h3>
                    {selectedCustomer.is_active === false && (
                      <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                        DISATTIVATO
                      </span>
                    )}
                  </div>
                  <div className="grid grid-3 gap-4 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Tel:</span>
                      <span>{selectedCustomer.phone || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Email:</span>
                      <span>{selectedCustomer.email || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Cliente dal:</span>
                      <span>{new Date(selectedCustomer.created_at).toLocaleDateString('it-IT')}</span>
                    </div>
                    {selectedCustomer.city && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Città:</span>
                        <span>{selectedCustomer.city}</span>
                      </div>
                    )}
                    {selectedCustomer.birth_date && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Età:</span>
                        <span>{calculateAge(selectedCustomer.birth_date)} anni</span>
                      </div>
                    )}
                  </div>
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

          {/* AZIONI CLIENTE SELEZIONATO */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title flex items-center gap-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Azioni Cliente
              </h2>
              <p className="card-subtitle">Gestisci link portale cliente e altre azioni</p>
            </div>
            <div className="card-body">
              <div className="grid grid-2 gap-4 mb-4">
                <button
                  onClick={handleGenerateClientPortal}
                  className="btn btn-primary flex items-center gap-2 justify-center"
                  disabled={selectedCustomer.is_active === false}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  🔗 Genera Link Portale Cliente
                </button>
                <button
                  onClick={handleRegenerateClientPortal}
                  className="btn btn-secondary flex items-center gap-2 justify-center"
                  disabled={selectedCustomer.is_active === false}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  🔄 Rigenera Link Portale
                </button>
              </div>

              {/* CONTROLLI ATTIVAZIONE/DISATTIVAZIONE CLIENTE */}
              <div className="grid grid-1 gap-3 mb-4">
                {selectedCustomer.is_active !== false ? (
                  <button
                    onClick={() => deactivateCustomer(selectedCustomer)}
                    className="btn btn-danger flex items-center gap-2 justify-center"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                    </svg>
                    🚫 Disattiva Cliente
                  </button>
                ) : (
                  <button
                    onClick={() => reactivateCustomer(selectedCustomer)}
                    className="btn btn-success flex items-center gap-2 justify-center"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    ✅ Riattiva Cliente
                  </button>
                )}
              </div>
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>💡 Info:</strong> Il link del portale cliente permette al cliente di vedere i suoi punti, transazioni e premi disponibili. Il link viene automaticamente copiato negli appunti.
                </p>
              </div>
            </div>
          </div>

          {/* GESTIONE PRIVACY */}
          <PrivacyManagement 
            customer={selectedCustomer}
            customerConsents={customerConsents}
            setCustomerConsents={setCustomerConsents}
            showNotification={showNotification}
          />

          {/* NUOVA VENDITA */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title flex items-center gap-3">
                <svg className="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Nuova Vendita
              </h2>
              <p className="card-subtitle">Registra una vendita per {selectedCustomer.name}</p>
              {selectedCustomer.is_active === false && (
                <div className="bg-red-100 text-red-700 px-3 py-2 rounded-lg mt-2">
                  ⚠️ Impossibile registrare vendite per cliente disattivato
                </div>
              )}
            </div>
            <div className="card-body">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1 max-w-md">
                  <span className="currency-symbol">€</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={transactionAmount}
                    onChange={(e) => setTransactionAmount(e.target.value)}
                    className="input-currency"
                    disabled={selectedCustomer.is_active === false}
                  />
                </div>
                <button
                  onClick={handleAddTransaction}
                  disabled={!transactionAmount || parseFloat(transactionAmount) <= 0 || selectedCustomer.is_active === false}
                  className="btn btn-warning px-8 py-4 text-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Registra Vendita
                </button>
              </div>
              {transactionAmount && selectedCustomer.is_active !== false && (
                <div className="flex items-center gap-3 p-4 bg-orange-100 rounded-lg">
                  <div className="gemme-icon"></div>
                  <span className="font-semibold text-orange-800">
                    Aggiungerà: <strong>{Math.floor(parseFloat(transactionAmount || 0))} GEMME</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* PREMI */}
          {prizes.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title flex items-center gap-3">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Riscatta Premi
                </h2>
                {selectedCustomer.is_active === false && (
                  <div className="bg-red-100 text-red-700 px-3 py-2 rounded-lg mt-2">
                    ⚠️ Impossibile riscattare premi per cliente disattivato
                  </div>
                )}
              </div>
              <div className="card-body">
                <div className="grid grid-auto gap-4">
                  {prizes.map(prize => {
                    const hasPoints = selectedCustomer.points >= prize.points_cost && selectedCustomer.is_active !== false
                    return (
                      <div key={prize.id} className={`p-4 rounded-lg border ${hasPoints ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50'}`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-bold text-brand">{prize.name}</h4>
                            <p className="text-sm text-secondary">{prize.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="gemme-icon"></div>
                              <span className="font-bold text-red-600">{prize.points_cost} GEMME</span>
                            </div>
                          </div>
                          <button
                            onClick={() => redeemPrize(prize)}
                            disabled={!hasPoints || selectedCustomer.is_active === false}
                            className={`btn ${hasPoints ? 'btn-success' : 'btn-secondary'}`}
                          >
                            {selectedCustomer.is_active === false ? '🚫 Cliente disattivato' : (hasPoints ? '🎁 Riscatta' : '❌ Non disponibile')}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SEZIONE REFERRAL - REDESIGN COERENTE */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title flex items-center gap-3">
                <svg className="w-6 h-6 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.196-2.196M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.196-2.196M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Programma Invita & Guadagna
              </h2>
              <p className="card-subtitle">Condividi il tuo codice e guadagna GEMME extra!</p>
              {isMultiplierActive && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-bold">
                    🔥 BONUS 2X ATTIVO! Invita ora e guadagna il doppio!
                  </div>
                </div>
              )}
            </div>
            <div className="card-body">
              {/* PROGRESSO REFERRAL */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-secondary mb-2">
                  <span>Prossimo bonus a {Math.ceil((selectedCustomer.referral_count || 0) / 5) * 5} inviti</span>
                  <span className="font-bold text-brand-primary">{selectedCustomer.referral_count || 0}/5</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-brand-primary to-brand-secondary h-3 rounded-full transition-all duration-500" 
                    style={{ width: `${((selectedCustomer.referral_count || 0) % 5) * 20}%` }}
                  ></div>
                </div>
              </div>

              {/* CODICE REFERRAL */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-brand-primary">
                <div className="text-sm font-medium text-secondary mb-2">Il tuo codice referral</div>
                <div 
                  className="flex items-center justify-between p-3 bg-white rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => copyReferralCode(selectedCustomer.referral_code, showNotification)}
                >
                  <span className="font-bold text-xl text-brand-primary tracking-wide">{selectedCustomer.referral_code}</span>
                  <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-xs text-secondary mt-1">Clicca per copiare negli appunti</div>
              </div>

              {/* STATISTICHE */}
              <div className="grid grid-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl mb-1">👥</div>
                  <div className="text-2xl font-bold text-brand-primary">{selectedCustomer.referral_count || 0}</div>
                  <div className="text-sm text-secondary">Amici Invitati</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl mb-1">💎</div>
                  <div className="text-2xl font-bold text-gemme-red">{(selectedCustomer.referral_count || 0) * 5}</div>
                  <div className="text-sm text-secondary">GEMME Guadagnate</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl mb-1">🎯</div>
                  <div className="text-2xl font-bold text-yellow-600">{getReferralLevel(selectedCustomer.referral_count || 0)}</div>
                  <div className="text-sm text-secondary">Livello</div>
                </div>
              </div>

              {/* LISTA AMICI INVITATI */}
              {referredFriends.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.196-2.196M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.196-2.196M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    I tuoi inviti ({referredFriends.length})
                  </h4>
                  <div className="space-y-3">
                    {referredFriends.map((friend, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 bg-brand-primary text-white rounded-full flex items-center justify-center font-bold">
                          {friend.name ? friend.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{friend.name || 'Nome non disponibile'}</div>
                          <div className="text-sm text-secondary">Invitato il {new Date(friend.created_at).toLocaleDateString('it-IT')}</div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                            ✅ Attivo
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gemme-red">
                            <span>{friend.points || 0}</span>
                            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AZIONI CONDIVISIONE */}
              <div className="grid grid-2 gap-3">
                <button
                  onClick={shareOnWhatsApp}
                  className="btn btn-success flex items-center gap-2 justify-center"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                  </svg>
                  Condividi su WhatsApp
                </button>
                <button
                  onClick={openShareModal}
                  className="btn btn-secondary flex items-center gap-2 justify-center"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  Altri Social
                </button>
              </div>
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

      <ClipboardDebug showNotification={showNotification} />
    </div>
  )
}

export default CustomerView
