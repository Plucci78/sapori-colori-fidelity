import { useState, useEffect } from 'react'
import NFCQuickReader from '../NFC/NFCQuickReader'
import { generateClientURL } from '../../utils/tokenUtils'

const CustomerView = ({
  searchTerm,
  setSearchTerm,
  customers,
  selectedCustomer,
  setSelectedCustomer,
  newCustomerName,
  setNewCustomerName,
  newCustomerPhone,
  setNewCustomerPhone,
  newCustomerEmail,
  setNewCustomerEmail,
  createCustomer,
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
}) => {
  const [showGemmeRain, setShowGemmeRain] = useState(false);
  const [clientLinks, setClientLinks] = useState({})

  // Callback quando NFC trova un cliente
  const handleNFCCustomerFound = (customer) => {
    setSelectedCustomer(customer)
    setSearchTerm(customer.name)
    
    // Scroll automatico alla sezione cliente selezionato
    setTimeout(() => {
      const selectedSection = document.querySelector('.selected-customer-section')
      if (selectedSection) {
        selectedSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
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
      try {
        await navigator.clipboard.writeText(url)
        showNotification('Link copiato negli appunti!', 'success')
      } catch (err) {
        showNotification('Impossibile copiare automaticamente', 'error')
      }
    }
  }

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-brand mb-2">Gestione Clienti</h1>
        <p className="text-secondary">Identifica clienti, registra vendite e gestisci il programma fedeltà GEMME</p>
      </div>

      {/* SEZIONE NFC PRINCIPALE */}
      <div className="card card-nfc mb-6">
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
                  <div className="grid grid-3 gap-4 text-sm">
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
                    className={`p-6 rounded-xl border transition-all shadow-sm bg-white flex flex-col gap-3 ${
                      hasLevel && hasPoints
                        ? 'border-green-500'
                        : !hasLevel
                        ? 'border-gray-300 opacity-60'
                        : 'border-orange-300 opacity-80'
                    }`}
                    style={{ minWidth: 260, maxWidth: 340 }}
                  >
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
                    <button
                      onClick={() => redeemPrize(prize)}
                      disabled={!(hasLevel && hasPoints)}
                      className={`w-full py-3 px-4 rounded-lg font-semibold transition-all mt-auto ${
                        hasLevel && hasPoints
                          ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {hasLevel && hasPoints
                        ? (
                          <>
                            <svg className="inline w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Riscatta Premio
                          </>
                        )
                        : !hasLevel
                        ? (
                          <>
                            <svg className="inline w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Solo per livello {prize.min_level}
                          </>
                        )
                        : (
                          <>
                            <svg className="inline w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            GEMME insufficienti
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

      <div className="grid grid-2 gap-6">
        {/* NUOVO CLIENTE */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title flex items-center gap-3">
              <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Nuovo Cliente
            </h2>
            <p className="card-subtitle">Registra un nuovo cliente nel sistema</p>
          </div>
          <div className="card-body">
            <form className="space-y-4" onSubmit={e => { e.preventDefault(); createCustomer(); }}>
              <div>
                <label className="block text-sm font-semibold text-brand mb-1">Nome completo *</label>
                <input
                  type="text"
                  placeholder="Mario Rossi"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-brand focus:outline-none transition-colors bg-gray-50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-brand mb-1">Telefono *</label>
                <input
                  type="tel"
                  placeholder="Telefono"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-brand focus:outline-none transition-colors bg-gray-50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-brand mb-1">Email (opzionale)</label>
                <input
                  type="email"
                  placeholder="Email (opzionale per offerte)"
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-brand focus:outline-none transition-colors bg-gray-50"
                />
              </div>
              <button 
                type="submit"
                disabled={!newCustomerName.trim() || !newCustomerPhone.trim()}
                className="btn btn-success w-full py-3 text-lg font-semibold shadow-sm hover:shadow-md transition"
              >
                <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Crea Cliente
              </button>
            </form>
          </div>
        </div>

        {/* GESTIONE MANUALE GEMME */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title flex items-center gap-3">
              <div className="gemme-icon-lg"></div>
              Gestione Manuale GEMME
            </h2>
            <p className="card-subtitle">Aggiungi o rimuovi GEMME per situazioni speciali</p>
          </div>
          <div className="card-body">
            <form className="space-y-4" onSubmit={e => e.preventDefault()}>
              <div>
                <label className="block text-sm font-semibold text-brand mb-1">Cerca cliente</label>
                <input
                  type="text"
                  placeholder="Cerca cliente per nome..."
                  value={manualCustomerName}
                  onChange={(e) => {
                    setManualCustomerName(e.target.value)
                    searchCustomersForManual(e.target.value)
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-brand focus:outline-none transition-colors bg-gray-50"
                />
              </div>
              {foundCustomers.length > 0 && (
                <div className="space-y-3">
                  {foundCustomers.map(customer => (
                    <div key={customer.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-brand">{customer.name}</div>
                          <div className="flex items-center gap-2 text-sm text-secondary">
                            <div className="gemme-icon-sm"></div>
                            <span>{customer.points} GEMME attuali</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <input
                          type="number"
                          placeholder="±GEMME"
                          value={manualPoints}
                          onChange={(e) => setManualPoints(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:border-brand focus:outline-none bg-white"
                        />
                        <button 
                          type="button"
                          onClick={() => modifyPoints(customer, manualPoints)}
                          disabled={!manualPoints || parseInt(manualPoints) === 0}
                          className="btn btn-primary flex items-center gap-2"
                        >
                          <div className="gemme-icon-sm"></div>
                          Modifica
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </form>
          </div>
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
                  className={`search-result-item ${
                    selectedCustomer?.id === customer.id ? 'selected' : ''
                  }`}
                  onClick={() => handleNFCCustomerFound(customer)}
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

      {selectedCustomer && (
        <div className="customer-actions">
          <h4>🔗 Link Cliente</h4>
          <div className="client-link-section">
            <button 
              onClick={() => handleGenerateClientLink(selectedCustomer)}
              className="generate-link-btn"
            >
              📱 Genera Link Cliente
            </button>
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
                    onClick={() => {
                      navigator.clipboard.writeText(clientLinks[selectedCustomer.id].url)
                      showNotification('Link copiato!', 'success')
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
    </div>
  )
}

export default CustomerView