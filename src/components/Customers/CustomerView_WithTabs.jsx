import { useState, useEffect } from 'react'
import NFCQuickReader from '../NFC/NFCQuickReader'
import RegistrationWizard from '../Registration/RegistrationWizard'
import ClipboardDebug from '../Common/ClipboardDebug'
import QRCodeReader from '../Common/QRCodeReader'
import { supabase } from '../../supabase'
import { copyToClipboard, copyReferralCode, copyClientLink } from '../../utils/clipboardUtils'
import { testGemmeSounds, playRemoveGemmeStandard, playRemoveGemmeAlt, playAddGemmeSound } from '../../utils/soundUtils'

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
  setFoundCustomers,
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
  loadReferredFriends,
  getReferralLevel,
  showQRModal,
  setShowQRModal,
  showShareModal,
  setShowShareModal,
  isMultiplierActive,
  completeReferral,
  fixReferralData
}) {
  const [showGemmeRain, setShowGemmeRain] = useState(false);
  const [clientLinks, setClientLinks] = useState({})
  const [showRegistrationWizard, setShowRegistrationWizard] = useState(false)
  const [customerConsents, setCustomerConsents] = useState({})
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [useAltRemoveSound, setUseAltRemoveSound] = useState(false)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [activeTab, setActiveTab] = useState('nfc') // Nuovo stato per tab attivo

  // Callback quando NFC trova un cliente
  const handleNFCCustomerFound = (customer) => {
    setSelectedCustomer(customer)
    setSearchTerm(customer.name)
    loadCustomerConsents(customer.id)
    setActiveTab('customer') // Passa automaticamente al tab cliente

    setTimeout(() => {
      const selectedSection = document.querySelector('.tab-content')
      if (selectedSection) {
        selectedSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }

  // Callback quando QR scanner trova un cliente
  const handleQRScan = async (qrData) => {
    try {
      console.log('🔍 QR scansionato:', qrData)
      
      const customerMatch = qrData.match(/^CUSTOMER:(\d+)$/)
      if (customerMatch) {
        const customerId = parseInt(customerMatch[1])
        console.log('✅ QR formato valido - ID Cliente:', customerId)
        
        const { data: customer, error } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .single()
          
        if (error) {
          console.error('❌ Errore query database:', error)
          showNotification(`❌ Errore database: ${error.message}`, 'error')
          return
        }
        
        if (!customer) {
          showNotification(`❌ Cliente con ID ${customerId} non trovato nel database`, 'error')
          return
        }
        
        if (!customer.is_active) {
          showNotification(`⚠️ Cliente ${customer.name} è disattivato`, 'warning')
          return
        }
        
        setSelectedCustomer(customer)
        setSearchTerm(customer.name)
        loadCustomerConsents(customer.id)
        setShowQRScanner(false)
        setActiveTab('customer') // Passa automaticamente al tab cliente
        
        showNotification(`✅ Cliente ${customer.name} riconosciuto via QR!`, 'success')
        
      } else {
        showNotification(`❌ QR Code non valido per riconoscimento cliente`, 'error')
      }
    } catch (error) {
      console.error('Errore processamento QR:', error)
      showNotification('❌ Errore nella scansione QR', 'error')
    }
  }

  // Funzione per caricare consensi cliente
  const loadCustomerConsents = async (customerId) => {
    try {
      const { data } = await supabase
        .from('consent_records')
        .select('*')
        .eq('customer_id', customerId)
        .order('consent_date', { ascending: false })

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

  const getCustomerCategory = (points) => {
    if (points < 50) return { name: 'BRONZO', color: '#cd7f32', emoji: '🥉' }
    if (points < 100) return { name: 'ARGENTO', color: '#c0c0c0', emoji: '🥈' }
    if (points < 200) return { name: 'ORO', color: '#ffd700', emoji: '🥇' }
    if (points < 500) return { name: 'PLATINO', color: '#e5e4e2', emoji: '💎' }
    return { name: 'VIP', color: '#9b59b6', emoji: '👑' }
  }

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.phone && customer.phone.includes(searchTerm)) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleAddTransaction = async () => {
    const audio = new Audio('/sounds/coin.wav')
    audio.play()
    await addTransaction()
    setShowGemmeRain(true)
    setTimeout(() => setShowGemmeRain(false), 1200)
  }

  return (
    <div className="p-6">
      {/* WIZARD REGISTRAZIONE */}
      {showRegistrationWizard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-lg w-full h-full max-w-none max-h-none overflow-auto" style={{ margin: '20px', maxWidth: 'calc(100vw - 40px)', maxHeight: 'calc(100vh - 40px)' }}>
            <RegistrationWizard
              onComplete={(customer, successMessage) => {
                loadCustomers()
                setShowRegistrationWizard(false)
                setSelectedCustomer(customer)
                setActiveTab('customer')
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
          
          <button 
            className={`tab-button ${activeTab === 'manual' ? 'active' : ''}`}
            onClick={() => setActiveTab('manual')}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            ⚙️ Gestione Manuale
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
        <div className="tab-content">
          {/* TAB NFC */}
          {activeTab === 'nfc' && (
            <div className="tab-panel">
              <div className="card">
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
            </div>
          )}

          {/* TAB QR SCANNER */}
          {activeTab === 'qr' && (
            <div className="tab-panel">
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title flex items-center gap-3">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6V4H4zm10 0v6h6V4h-6zM4 14v6h6v-6H4zm7 0l3 3 6-6" />
                    </svg>
                    Scanner QR Code Cliente
                  </h2>
                  <p className="card-subtitle">Scansiona il QR code dal portale cliente</p>
                </div>
                <div className="card-body">
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold mb-2">📋 Istruzioni:</h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p>• Il cliente deve aprire il suo portale personale</p>
                      <p>• Inquadra il QR code mostrato nel portale</p>
                      <p>• Formato richiesto: <code className="bg-white px-1 rounded">CUSTOMER:123</code></p>
                    </div>
                  </div>
                  
                  {/* PULSANTI TEST */}
                  <div className="mb-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                    <h5 className="text-yellow-800 font-semibold mb-2">🧪 Test Scanner</h5>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (customers && customers.length > 0) {
                            const testCustomer = customers[0]
                            const testQR = `CUSTOMER:${testCustomer.id}`
                            handleQRScan(testQR)
                          } else {
                            showNotification('❌ Nessun cliente disponibile per il test', 'error')
                          }
                        }}
                        className="btn btn-sm btn-warning"
                      >
                        🧪 Test QR Valido
                      </button>
                      <button
                        onClick={() => handleQRScan("INVALID:123")}
                        className="btn btn-sm btn-secondary"
                      >
                        🧪 Test QR Non Valido
                      </button>
                    </div>
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
                </div>
              </div>
            </div>
          )}

          {/* TAB RICERCA MANUALE */}
          {activeTab === 'search' && (
            <div className="tab-panel">
              <div className="card">
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
                  <div className="flex gap-4 mb-6">
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

                  {/* RISULTATI RICERCA */}
                  {searchTerm && filteredCustomers.length > 0 && (
                    <div className="grid grid-auto gap-4">
                      {filteredCustomers.slice(0, 6).map(customer => (
                        <div
                          key={customer.id}
                          className={`search-result-item ${selectedCustomer?.id === customer.id ? 'selected' : ''}`}
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
                  )}

                  {searchTerm && filteredCustomers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <p>Nessun cliente trovato per "{searchTerm}"</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB GESTIONE MANUALE */}
          {activeTab === 'manual' && (
            <div className="tab-panel">
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title flex items-center gap-3">
                    <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Gestione Manuale GEMME
                  </h2>
                  <p className="card-subtitle">Modifica GEMME per rimborsi e situazioni speciali</p>
                </div>
                <div className="card-body">
                  <div className="relative mb-6">
                    <input
                      type="text"
                      placeholder="Cerca cliente per nome, telefono o email..."
                      value={manualCustomerName}
                      onChange={(e) => {
                        setManualCustomerName(e.target.value)
                        searchCustomersForManual(e.target.value)
                      }}
                      className="w-full pl-10 pr-10 py-4 border-2 border-gray-200 rounded-xl focus:border-brand focus:outline-none"
                    />
                    <svg className="absolute left-3 top-4 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>

                  {foundCustomers.length > 0 && (
                    <div className="space-y-4">
                      {foundCustomers.map(customer => (
                        <div key={customer.id} className="manual-gemme-customer-card">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="customer-avatar-small">
                                {customer.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <span className="font-medium">{customer.points} GEMME</span>
                                </div>
                              </div>
                            </div>
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
                </div>
              </div>
            </div>
          )}

          {/* TAB CLIENTE SELEZIONATO */}
          {activeTab === 'customer' && selectedCustomer && (
            <div className="tab-panel">
              {/* INFO CLIENTE */}
              <div className="card mb-6">
                <div className="card-header">
                  <h2 className="card-title flex items-center gap-3">
                    <svg className="w-6 h-6 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Cliente Selezionato
                  </h2>
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
              <div className="card mb-6">
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
            </div>
          )}
        </div>
      </div>

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
