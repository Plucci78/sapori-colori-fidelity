import { useState } from 'react'
import NFCQuickReader from '../NFC/NFCQuickReader'
import RegistrationWizard from '../Registration/RegistrationWizard'
import ClipboardDebug from '../Common/ClipboardDebug'
import QRCodeReader from '../Common/QRCodeReader'
import { supabase } from '../../supabase'
import { copyToClipboard, copyReferralCode } from '../../utils/clipboardUtils'
import { testGemmeSounds, playAddGemmeSound } from '../../utils/soundUtils'

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
  loadCustomers,
  referredFriends,
  getReferralLevel,
  isMultiplierActive,
  fixReferralData
}) {
  const [showGemmeRain, setShowGemmeRain] = useState(false);
  const [showRegistrationWizard, setShowRegistrationWizard] = useState(false)
  const [customerConsents, setCustomerConsents] = useState({})
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [showQRScanner, setShowQRScanner] = useState(false)

  // Funzione per gestire cliente trovato via NFC
  const handleNFCCustomerFound = (customer) => {
    setSelectedCustomer(customer)
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
          .eq('id', parseInt(customerId))
          .single()

        if (error) {
          console.error('❌ Errore ricerca cliente:', error)
          showNotification('❌ Cliente non trovato nel database', 'error')
          return
        }

        if (customer) {
          console.log('✅ Cliente trovato dal QR:', customer)
          setSelectedCustomer(customer)
          setShowQRScanner(false)
          showNotification(`✅ Cliente trovato via QR: ${customer.name}`, 'success')
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

  // Test functions per QR
  const testValidQR = () => {
    console.log('🧪 Test QR Valido - Simulando CUSTOMER:1')
    handleQRScan('CUSTOMER:1')
  }

  const testInvalidQR = () => {
    console.log('🧪 Test QR Non Valido - Simulando codice casuale')
    handleQRScan('https://esempio.com/random')
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

  const getConsentDescription = (type) => {
    const descriptions = {
      marketing: 'Consenso Marketing',
      newsletter: 'Consenso Newsletter',
      fidelity: 'Consenso Fidelity',
      profiling: 'Consenso Profilazione'
    }
    return descriptions[type] || type
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

            {/* DEBUG BUTTONS */}
            <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-800">
                <strong>🧪 Test Debug:</strong>
                <div className="space-y-2">
                  <div className="mb-2">
                    <button onClick={testValidQR} className="btn btn-sm btn-success mr-2">Test QR Valido (ID: 1)</button>
                    <button onClick={testInvalidQR} className="btn btn-sm btn-warning mr-2">Test QR Non Valido</button>
                  </div>
                  <div className="mb-2">
                    <button 
                      onClick={() => {
                        console.log('🎵 Test suono aggiunta gemme')
                        playAddGemmeSound(50)
                      }} 
                      className="btn btn-sm btn-info mr-2"
                    >
                      🎵 Test Suono Gemme
                    </button>
                    <button 
                      onClick={() => {
                        console.log('🌧️ Test animazione pioggia gemme')
                        setShowGemmeRain(true)
                        setTimeout(() => setShowGemmeRain(false), 3000)
                      }} 
                      className="btn btn-sm btn-info mr-2"
                    >
                      🌧️ Test Pioggia Gemme
                    </button>
                    <button 
                      onClick={testGemmeSounds} 
                      className="btn btn-sm btn-secondary"
                    >
                      🔊 Test Tutti Suoni
                    </button>
                  </div>
                </div>
                <div className="mt-3 p-2 bg-white rounded border">
                  <strong>Formato atteso:</strong> <code>CUSTOMER:123</code><br/>
                  <strong>Generato da:</strong> Portale Cliente
                </div>
              </div>
            </div>

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

      {/* SEZIONE RICERCA MANUALE */}
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

          {/* RICERCA MANUALE PUNTI */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
              Gestione Manuale Gemme
            </h3>
            <div className="flex gap-4 mb-4">
              <input
                type="text"
                placeholder="Nome cliente..."
                value={manualCustomerName}
                onChange={(e) => setManualCustomerName(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-lg"
              />
              <button
                onClick={searchCustomersForManual}
                disabled={!manualCustomerName}
                className="btn btn-primary"
              >
                🔍 Cerca
              </button>
            </div>

            {foundCustomers.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold">Clienti trovati:</h4>
                {foundCustomers.map(customer => (
                  <div key={customer.id} className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h5 className="font-bold">{customer.name}</h5>
                        <p className="text-sm text-gray-600">{customer.phone} • {customer.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="gemme-icon"></div>
                          <span className="font-bold text-red-600">{customer.points} GEMME</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedCustomer(customer)}
                        className="btn btn-primary"
                      >
                        📋 Seleziona
                      </button>
                    </div>

                    <div className="flex gap-3">
                      <input
                        type="number"
                        placeholder="Inserisci valore (±)"
                        value={manualPoints}
                        onChange={(e) => setManualPoints(e.target.value)}
                        className="flex-1 px-4 py-2 border rounded-lg"
                      />
                      <button
                        onClick={() => modifyPoints(customer, manualPoints)}
                        disabled={!manualPoints || parseInt(manualPoints) === 0}
                        className="btn btn-primary"
                      >
                        Applica
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* LISTA CLIENTI DALLA RICERCA */}
            {searchTerm && filteredCustomers.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold">Risultati ricerca:</h4>
                <div className="grid gap-3">
                  {filteredCustomers.map(customer => (
                    <div key={customer.id} className="customer-card-search" onClick={() => setSelectedCustomer(customer)}>
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
              <div className="customer-info-box flex items-center gap-6">
                <div className="customer-avatar">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-brand mb-3">{selectedCustomer.name}</h3>
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
                  />
                </div>
                <button
                  onClick={handleAddTransaction}
                  disabled={!transactionAmount || parseFloat(transactionAmount) <= 0}
                  className="btn btn-warning px-8 py-4 text-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Registra Vendita
                </button>
              </div>
              {transactionAmount && (
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
              </div>
              <div className="card-body">
                <div className="grid grid-auto gap-4">
                  {prizes.map(prize => {
                    const hasPoints = selectedCustomer.points >= prize.points_cost
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
                            disabled={!hasPoints}
                            className={`btn ${hasPoints ? 'btn-success' : 'btn-secondary'}`}
                          >
                            {hasPoints ? '🎁 Riscatta' : '❌ Non disponibile'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SEZIONE REFERRAL */}
          <div className="referral-section-enhanced">
            <div className="referral-header">
              <h3>🚀 Programma Invita & Guadagna</h3>
              <p>Condividi il tuo codice e guadagna gemme extra!</p>
            </div>

            <div className="referral-progress">
              <div className="progress-label">
                <span>Prossimo bonus a {Math.ceil((selectedCustomer.referral_count || 0) / 5) * 5} inviti</span>
                <span>{selectedCustomer.referral_count || 0}/5</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${((selectedCustomer.referral_count || 0) % 5) * 20}%` }}></div>
              </div>
            </div>

            <div className="referral-code-premium">
              <div className="code-label">Il tuo codice referral</div>
              <div className="code-value" onClick={() => copyReferralCode(selectedCustomer.referral_code, showNotification)}>
                <span className="code-text">{selectedCustomer.referral_code}</span>
                <span className="copy-icon">📋</span>
              </div>
              <div className="code-hint">Clicca per copiare</div>
            </div>

            <div className="referral-stats">
              <div className="stat-item">
                <div className="stat-icon">👥</div>
                <div className="stat-value">{selectedCustomer.referral_count || 0}</div>
                <div className="stat-label">Amici Invitati</div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">💎</div>
                <div className="stat-value">{(selectedCustomer.referral_count || 0) * 5}</div>
                <div className="stat-label">Gemme Guadagnate</div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">🎯</div>
                <div className="stat-value">{getReferralLevel(selectedCustomer.referral_count || 0)}</div>
                <div className="stat-label">Livello</div>
              </div>
            </div>

            {referredFriends.length > 0 && (
              <div className="referred-friends-list">
                <h5>I tuoi inviti: ({referredFriends.length} amici invitati)</h5>
                {referredFriends.map((friend, index) => (
                  <div key={index} className="friend-item">
                    <div className="friend-avatar">
                      {friend.name ? friend.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className="friend-info">
                      <div className="friend-name">{friend.name || 'Nome non disponibile'}</div>
                      <div className="friend-date">Invitato il {new Date(friend.created_at).toLocaleDateString('it-IT')}</div>
                    </div>
                    <div className="friend-status">
                      <span className="status-badge active">✅ Attivo</span>
                      <div className="friend-points">{friend.points || 0} 💎</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

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

            {isMultiplierActive && (
              <div className="multiplier-alert">
                🔥 BONUS 2X ATTIVO! Invita ora e guadagna il doppio!
              </div>
            )}
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
