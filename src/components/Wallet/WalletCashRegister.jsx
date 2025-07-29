import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import NFCQuickReaderHybrid from '../NFC/NFCQuickReaderHybrid'
import { soundManager } from '../../utils/soundUtils'
import './WalletCashRegister.css'

const WalletCashRegister = ({ showNotification }) => {
  const [currentAmount, setCurrentAmount] = useState('0.00')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [isNFCActive, setIsNFCActive] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [operationType, setOperationType] = useState('credit') // credit o debit
  const [paymentMethod, setPaymentMethod] = useState('contanti') // contanti o bancomat
  const [exportFilters, setExportFilters] = useState({
    startDate: '',
    endDate: '',
    type: 'all', // all, credit, debit
    customerId: ''
  })
  const [showExportModal, setShowExportModal] = useState(false)
  const [lastTransaction, setLastTransaction] = useState(null) // Ultima transazione per stampa ricevuta
  const [customers, setCustomers] = useState([]) // Lista clienti con credito
  const [customersFilter, setCustomersFilter] = useState('') // Filtro ricerca clienti
  const [printedReceipts, setPrintedReceipts] = useState([]) // Storico ricevute stampate

  // Carica dati iniziali
  useEffect(() => {
    loadRecentTransactions()
    loadCustomersWithCredit()
    loadPrintedReceipts()
  }, [])

  // Carica clienti con credito wallet
  const loadCustomersWithCredit = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, phone, wallet_balance, created_at')
        .gt('wallet_balance', 0) // Solo clienti con credito > 0
        .order('wallet_balance', { ascending: false })
        .limit(50)

      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('Errore caricamento clienti:', error)
    }
  }

  const loadRecentTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select(`
          *,
          customer:customers(name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Errore caricamento transazioni:', error)
    }
  }

  // Carica storico ricevute stampate
  const loadPrintedReceipts = async () => {
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select(`
          *,
          customer:customers(name, email, phone)
        `)
        .not('receipt_printed_at', 'is', null) // Solo transazioni con ricevuta stampata
        .order('receipt_printed_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setPrintedReceipts(data || [])
    } catch (error) {
      console.error('Errore caricamento ricevute stampate:', error)
    }
  }

  // Gestione tastierino numerico - logica corretta per euro e centesimi
  const handleNumberClick = (num) => {
    // Rimuovi il punto decimale e converti a centesimi
    const currentCents = Math.round(parseFloat(currentAmount) * 100)
    const newCents = currentCents * 10 + parseInt(num)
    
    // Limita a 99999 centesimi (999.99 euro)
    if (newCents <= 99999) {
      const newAmount = newCents / 100
      setCurrentAmount(newAmount.toFixed(2))
    }
  }

  // Pulsanti rapidi per importi comuni
  const handleQuickAmount = (amount) => {
    setCurrentAmount(amount.toFixed(2))
  }

  const handleClear = () => {
    setCurrentAmount('0.00')
  }

  const handleBackspace = () => {
    // Converti a centesimi, rimuovi l'ultima cifra, riconverti a euro
    const currentCents = Math.round(parseFloat(currentAmount) * 100)
    const newCents = Math.floor(currentCents / 10)
    const newAmount = newCents / 100
    setCurrentAmount(newAmount.toFixed(2))
  }

  // Gestione NFC - callback dal NFCQuickReaderHybrid
  const handleCustomerFound = (customer) => {
    setSelectedCustomer(customer)
    showNotification?.(`Cliente riconosciuto: ${customer.name}`, 'success')
    setIsNFCActive(false) // Disattiva NFC dopo aver trovato il cliente
  }

  // Selezione cliente dalla tabella
  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer)
    showNotification?.(`Cliente selezionato: ${customer.name}`, 'info')
  }

  // Filtra clienti per ricerca
  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(customersFilter.toLowerCase()) ||
    customer.email.toLowerCase().includes(customersFilter.toLowerCase()) ||
    customer.phone.includes(customersFilter)
  )

  // Conferma operazione wallet (ricarica o scala)
  const handleConfirmOperation = async () => {
    if (!selectedCustomer) {
      showNotification?.('Seleziona prima un cliente tramite NFC', 'warning')
      return
    }

    const amount = parseFloat(currentAmount)
    if (amount <= 0) {
      showNotification?.('Inserisci un importo valido', 'warning')
      return
    }

    // Controlla se c'è saldo sufficiente per il prelievo
    if (operationType === 'debit' && (selectedCustomer.wallet_balance || 0) < amount) {
      showNotification?.('Saldo insufficiente nel wallet del cliente', 'warning')
      return
    }

    try {
      setLoading(true)

      // Calcola nuovo saldo
      const currentBalance = selectedCustomer.wallet_balance || 0
      const newBalance = operationType === 'credit' ? 
        currentBalance + amount : 
        currentBalance - amount

      // Aggiorna saldo wallet cliente
      const { error: updateError } = await supabase
        .from('customers')
        .update({ wallet_balance: newBalance })
        .eq('id', selectedCustomer.id)

      if (updateError) throw updateError

      // Registra transazione
      const description = operationType === 'credit' ? 
        `Ricarica wallet - ${paymentMethod === 'contanti' ? 'Contanti' : 'Bancomat'}` :
        `Utilizzo wallet - Pagamento`

      const { data: transactionData, error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          customer_id: selectedCustomer.id,
          type: operationType,
          amount: amount,
          description: description,
          operator: 'Cassa'
        })
        .select()
        .single()

      if (transactionError) throw transactionError

      // Salva ultima transazione per stampa ricevuta
      setLastTransaction({
        ...transactionData,
        customer: selectedCustomer,
        newBalance: newBalance,
        paymentMethod: paymentMethod
      })

      // Aggiorna selectedCustomer per l'anteprima
      setSelectedCustomer({
        ...selectedCustomer,
        wallet_balance: newBalance
      })

      const operationText = operationType === 'credit' ? 'ricaricato' : 'scalato'
      showNotification?.(`Wallet ${operationText}: € ${amount.toFixed(2)} - Ricevuta disponibile per stampa`, 'success')
      
      // Suona cash register solo per le ricariche (credit)
      if (operationType === 'credit') {
        try {
          console.log('🎵 Riproduzione suono cash register per ricarica €', amount)
          soundManager.playCashRegister(amount)
        } catch (error) {
          console.warn('❌ Errore riproduzione suono cash register:', error)
        }
      }
      
      // Reset solo l'importo, non il cliente e ultima transazione
      setCurrentAmount('0.00')
      loadRecentTransactions()
      loadCustomersWithCredit() // Aggiorna anche la lista clienti

    } catch (error) {
      console.error('Errore operazione wallet:', error)
      showNotification?.('Errore durante l\'operazione wallet', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Stampa ricevuta saldo attuale cliente
  const printCustomerBalanceReceipt = async () => {
    if (!selectedCustomer) {
      showNotification?.('Seleziona prima un cliente per stampare il saldo', 'warning')
      return
    }

    try {
      setLoading(true)
      
      const response = await fetch('http://localhost:3002/print/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptType: 'balance',
          orderId: `SALDO-${selectedCustomer.id}-${Date.now()}`,
          total: 0.01, // Nessun costo per la ricevuta saldo
          customer: selectedCustomer.name,
          operator: 'Consultazione Saldo',
          paymentMethod: 'Gratuito',
          balance: (selectedCustomer.wallet_balance || 0).toFixed(2),
          items: [{
            name: '📄 Consultazione Saldo Wallet',
            quantity: 1,
            price: 0
          }],
          notes: `
═══════════════════════════════════
         RICEVUTA SALDO WALLET
═══════════════════════════════════

Cliente: ${selectedCustomer.name}
${selectedCustomer.email ? `Email: ${selectedCustomer.email}` : ''}
${selectedCustomer.phone ? `Telefono: ${selectedCustomer.phone}` : ''}

💰 CREDITO DISPONIBILE: € ${(selectedCustomer.wallet_balance || 0).toFixed(2)}

Data: ${new Date().toLocaleDateString('it-IT')}
Ora: ${new Date().toLocaleTimeString('it-IT')}

═══════════════════════════════════
   Grazie per aver scelto i nostri
         servizi di fidelizzazione!
═══════════════════════════════════

Per informazioni:
📧 Email: info@saporiecolori.net
📱 Telefono: [Il tuo numero]

Il credito non ha scadenza ed è
utilizzabile per tutti i nostri prodotti.
          `
        })
      })

      if (!response.ok) throw new Error('Errore stampa ricevuta saldo')
      
      showNotification?.(`✅ Ricevuta saldo stampata per ${selectedCustomer.name}`, 'success')
      
    } catch (error) {
      console.error('Errore stampa ricevuta saldo:', error)
      showNotification?.('Errore nella stampa della ricevuta saldo', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Stampa ricevuta ultima transazione
  const printLastTransactionReceipt = async () => {
    if (!lastTransaction) {
      showNotification?.('Nessuna transazione da stampare. Esegui prima un\'operazione wallet.', 'warning')
      return
    }

    try {
      setLoading(true)
      
      const operationText = lastTransaction.type === 'credit' ? 'Ricarica' : 'Utilizzo'
      const paymentText = lastTransaction.type === 'credit' ? 
        (lastTransaction.paymentMethod === 'contanti' ? 'Contanti' : 'Bancomat') : 
        'Wallet'

      const response = await fetch('http://localhost:3002/print/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: `WALLET-${lastTransaction.id}`,
          total: lastTransaction.amount,
          customer: lastTransaction.customer.name,
          operator: `${operationText} Wallet`,
          paymentMethod: paymentText,
          items: [{
            name: `${operationText} Wallet - ${lastTransaction.customer.name}`,
            quantity: 1,
            price: lastTransaction.type === 'credit' ? lastTransaction.amount : -lastTransaction.amount
          }],
          notes: `Saldo wallet dopo operazione: € ${lastTransaction.newBalance.toFixed(2)}`
        })
      })

      if (!response.ok) throw new Error('Errore stampa ricevuta')
      
      // Salva la data di stampa nel database
      await supabase
        .from('wallet_transactions')
        .update({ receipt_printed_at: new Date().toISOString() })
        .eq('id', lastTransaction.id)
      
      showNotification?.('Ricevuta stampata con successo', 'success')
      
      // Ricarica la lista delle ricevute stampate
      loadPrintedReceipts()
      
      // Cancella ultima transazione dopo stampa
      setLastTransaction(null)
      
    } catch (error) {
      console.error('Errore stampa ricevuta wallet:', error)
      showNotification?.('Errore nella stampa della ricevuta', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Ristampa ricevuta esistente
  const reprintReceipt = async (transaction) => {
    try {
      setLoading(true)
      
      const receiptData = {
        customer: transaction.customer,
        amount: transaction.amount,
        type: transaction.type,
        balance: transaction.balance,
        paymentMethod: transaction.payment_method || 'contanti',
        date: new Date(transaction.created_at).toLocaleString('it-IT'),
        operatorId: transaction.operator_id
      }

      const response = await fetch('http://localhost:3002/print/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(receiptData)
      })

      if (!response.ok) throw new Error('Errore ristampa ricevuta')
      
      // Aggiorna la data di ultima stampa nella transazione
      await supabase
        .from('wallet_transactions')
        .update({ receipt_printed_at: new Date().toISOString() })
        .eq('id', transaction.id)

      showNotification?.('Ricevuta ristampata con successo', 'success')
      loadPrintedReceipts() // Ricarica la lista
      
    } catch (error) {
      console.error('Errore ristampa ricevuta:', error)
      showNotification?.('Errore nella ristampa della ricevuta', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Esportazione CSV per commercialista
  const exportTransactions = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('wallet_transactions')
        .select(`
          *,
          customer:customers(name, email, phone)
        `)
        .order('created_at', { ascending: false })

      // Applica filtri
      if (exportFilters.startDate) {
        query = query.gte('created_at', exportFilters.startDate + 'T00:00:00')
      }
      if (exportFilters.endDate) {
        query = query.lte('created_at', exportFilters.endDate + 'T23:59:59')
      }
      if (exportFilters.type !== 'all') {
        query = query.eq('type', exportFilters.type)
      }
      if (exportFilters.customerId) {
        query = query.eq('customer_id', exportFilters.customerId)
      }

      const { data, error } = await query

      if (error) throw error

      // Genera CSV
      const csvHeader = 'Data,Ora,Cliente,Email,Telefono,Tipo,Importo,Descrizione,Operatore\n'
      const csvRows = data.map(transaction => {
        const date = new Date(transaction.created_at)
        const dateStr = date.toLocaleDateString('it-IT')
        const timeStr = date.toLocaleTimeString('it-IT')
        const amount = transaction.type === 'credit' ? 
          `+${transaction.amount.toFixed(2)}` : 
          `-${transaction.amount.toFixed(2)}`
        
        return [
          dateStr,
          timeStr,
          `"${transaction.customer?.name || 'N/A'}"`,
          `"${transaction.customer?.email || 'N/A'}"`,
          `"${transaction.customer?.phone || 'N/A'}"`,
          transaction.type === 'credit' ? 'Ricarica' : 'Utilizzo',
          `"€ ${amount}"`,
          `"${transaction.description}"`,
          `"${transaction.operator}"`
        ].join(',')
      }).join('\n')

      const csvContent = csvHeader + csvRows
      
      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      
      const filename = `wallet_transactions_${exportFilters.startDate || 'all'}_${exportFilters.endDate || 'all'}.csv`
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      showNotification?.(`Esportate ${data.length} transazioni`, 'success')
      setShowExportModal(false)

    } catch (error) {
      console.error('Errore esportazione:', error)
      showNotification?.('Errore durante l\'esportazione', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="wallet-cash-register">
      <div className="register-header">
        <h2>💰 Wallet - Registro Cassa</h2>
        <p>Ricarica credito clienti tramite NFC</p>
      </div>

      <div className="register-main">
        <div className="register-left">
          {/* Display Digitale con Tastierino Integrato */}
          <div className="digital-display">
            <div className="display-screen">
            <div className="amount-display">€ {currentAmount}</div>
            
            {selectedCustomer && (
              <div className="customer-display">
                👤 {selectedCustomer.name}
                <div className="balance-info">
                  💰 Wallet: € {(selectedCustomer.wallet_balance || 0).toFixed(2)}
                </div>
                <div className="operation-preview">
                  {operationType === 'credit' ? '➕' : '➖'} Dopo {operationType === 'credit' ? 'ricarica' : 'utilizzo'}: € {
                    operationType === 'credit' ? 
                      ((selectedCustomer.wallet_balance || 0) + parseFloat(currentAmount)).toFixed(2) :
                      Math.max(0, (selectedCustomer.wallet_balance || 0) - parseFloat(currentAmount)).toFixed(2)
                  }
                </div>
              </div>
            )}

            {/* Pulsanti Rapidi */}
            <div className="quick-amounts">
              <button onClick={() => handleQuickAmount(10)} className="quick-btn">10€</button>
              <button onClick={() => handleQuickAmount(20)} className="quick-btn">20€</button>
              <button onClick={() => handleQuickAmount(50)} className="quick-btn">50€</button>
              <button onClick={() => handleQuickAmount(100)} className="quick-btn">100€</button>
            </div>

            {/* Tastierino Numerico Integrato */}
            <div className="integrated-keypad">
              <div className="keypad-row">
                <button onClick={() => handleNumberClick('7')}>7</button>
                <button onClick={() => handleNumberClick('8')}>8</button>
                <button onClick={() => handleNumberClick('9')}>9</button>
              </div>
              <div className="keypad-row">
                <button onClick={() => handleNumberClick('4')}>4</button>
                <button onClick={() => handleNumberClick('5')}>5</button>
                <button onClick={() => handleNumberClick('6')}>6</button>
              </div>
              <div className="keypad-row">
                <button onClick={() => handleNumberClick('1')}>1</button>
                <button onClick={() => handleNumberClick('2')}>2</button>
                <button onClick={() => handleNumberClick('3')}>3</button>
              </div>
              <div className="keypad-row">
                <button onClick={handleClear} className="clear-btn">C</button>
                <button onClick={() => handleNumberClick('0')}>0</button>
                <button onClick={handleBackspace} className="backspace-btn">⌫</button>
              </div>
            </div>
            </div>
          </div>
        </div>

        <div className="register-controls">
          {/* Selezione Operazione */}
          <div className="operation-controls">
            <div className="operation-type">
              <label>Operazione:</label>
              <div className="radio-group">
                <label className={operationType === 'credit' ? 'active' : ''}>
                  <input 
                    type="radio" 
                    value="credit" 
                    checked={operationType === 'credit'}
                    onChange={(e) => setOperationType(e.target.value)}
                  />
                  💰 Ricarica
                </label>
                <label className={operationType === 'debit' ? 'active' : ''}>
                  <input 
                    type="radio" 
                    value="debit" 
                    checked={operationType === 'debit'}
                    onChange={(e) => setOperationType(e.target.value)}
                  />
                  💸 Scala Credito
                </label>
              </div>
            </div>
            
            {operationType === 'credit' && (
              <div className="payment-method">
                <label>Pagamento:</label>
                <div className="radio-group">
                  <label className={paymentMethod === 'contanti' ? 'active' : ''}>
                    <input 
                      type="radio" 
                      value="contanti" 
                      checked={paymentMethod === 'contanti'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    💵 Contanti
                  </label>
                  <label className={paymentMethod === 'bancomat' ? 'active' : ''}>
                    <input 
                      type="radio" 
                      value="bancomat" 
                      checked={paymentMethod === 'bancomat'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    💳 Bancomat
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Azioni */}
          <div className="action-buttons">
            <button 
              onClick={() => setIsNFCActive(!isNFCActive)}
              className={`nfc-toggle ${isNFCActive ? 'active' : ''}`}
              disabled={loading}
            >
              📶 {isNFCActive ? 'NFC Attivo' : 'Leggi Card NFC'}
            </button>
            
            <button 
              onClick={handleConfirmOperation}
              className="confirm-btn"
              disabled={!selectedCustomer || parseFloat(currentAmount) <= 0 || loading}
            >
              {loading ? '⏳ Elaborando...' : `✅ Conferma ${operationType === 'credit' ? 'Ricarica' : 'Utilizzo'}`}
            </button>
            
            <button 
              onClick={printLastTransactionReceipt}
              className="print-btn"
              disabled={!lastTransaction || loading}
            >
              🖨️ {lastTransaction ? `Stampa Ricevuta (€${lastTransaction.amount.toFixed(2)})` : 'Nessuna Ricevuta'}
            </button>
            
            <button 
              onClick={printCustomerBalanceReceipt}
              className="balance-receipt-btn"
              disabled={!selectedCustomer || loading}
            >
              📄 {selectedCustomer ? `Stampa Saldo (€${(selectedCustomer.wallet_balance || 0).toFixed(2)})` : 'Stampa Saldo Cliente'}
            </button>
          </div>

          {/* Display Credito Cliente */}
          {selectedCustomer && (
            <div className="customer-balance-display">
              <div className="balance-header">💰 Credito Cliente</div>
              <div className="balance-customer-name">{selectedCustomer.name}</div>
              <div className="balance-amount">€ {(selectedCustomer.wallet_balance || 0).toFixed(2)}</div>
              <div className={`balance-status ${(selectedCustomer.wallet_balance || 0) > 0 ? 'available' : 'empty'}`}>
                {(selectedCustomer.wallet_balance || 0) > 0 ? 
                  `✅ Credito disponibile` : 
                  `⚠️ Nessun credito`
                }
              </div>
            </div>
          )}
        </div>

        {/* Tabella Clienti con Credito */}
        <div className="register-right">
          <div className="customers-section">
            <div className="customers-header">
              <h3>👥 Clienti con Credito</h3>
              <div className="customers-search">
                <input
                  type="text"
                  placeholder="🔍 Cerca cliente..."
                  value={customersFilter}
                  onChange={(e) => setCustomersFilter(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>
            
            <div className="customers-table-container">
              <table className="customers-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Credito</th>
                    <th>Azioni</th>
                    <th>Ricevuta</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map(customer => (
                    <tr 
                      key={customer.id} 
                      className={selectedCustomer?.id === customer.id ? 'selected' : ''}
                    >
                      <td>
                        <div className="customer-info">
                          <div className="customer-name">{customer.name}</div>
                          <div className="customer-details">
                            {customer.email && <span>📧 {customer.email}</span>}
                            {customer.phone && <span>📱 {customer.phone}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="credit-amount">
                        <span className="credit-value">
                          € {(customer.wallet_balance || 0).toFixed(2)}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleCustomerSelect(customer)}
                          className={`select-customer-btn ${selectedCustomer?.id === customer.id ? 'selected' : ''}`}
                          disabled={selectedCustomer?.id === customer.id}
                        >
                          {selectedCustomer?.id === customer.id ? '✅ Selezionato' : '👆 Seleziona'}
                        </button>
                      </td>
                      <td>
                        <button
                          onClick={async () => {
                            // Stampa saldo direttamente senza cambiare selezione
                            try {
                              setLoading(true)
                              
                              const response = await fetch('http://localhost:3002/print/receipt', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  receiptType: 'balance',
                                  orderId: `SALDO-${customer.id}-${Date.now()}`,
                                  total: 0.01,
                                  customer: customer.name,
                                  operator: 'Consultazione Saldo',
                                  paymentMethod: 'Gratuito',
                                  balance: (customer.wallet_balance || 0).toFixed(2),
                                  items: [{
                                    name: '📄 Consultazione Saldo Wallet',
                                    quantity: 1,
                                    price: 0
                                  }],
                                  notes: `
═══════════════════════════════════
         RICEVUTA SALDO WALLET
═══════════════════════════════════

Cliente: ${customer.name}
${customer.email ? `Email: ${customer.email}` : ''}
${customer.phone ? `Telefono: ${customer.phone}` : ''}

💰 CREDITO DISPONIBILE: € ${(customer.wallet_balance || 0).toFixed(2)}

Data: ${new Date().toLocaleDateString('it-IT')}
Ora: ${new Date().toLocaleTimeString('it-IT')}

═══════════════════════════════════
   Grazie per aver scelto i nostri
         servizi di fidelizzazione!
═══════════════════════════════════

Per informazioni:
📧 Email: info@saporiecolori.net
📱 Telefono: [Il tuo numero]

Il credito non ha scadenza ed è
utilizzabile per tutti i nostri prodotti.
                                  `
                                })
                              })

                              if (!response.ok) throw new Error('Errore stampa')
                              
                              showNotification?.(`✅ Ricevuta saldo stampata per ${customer.name}`, 'success')
                              
                            } catch (error) {
                              console.error('Errore stampa:', error)
                              showNotification?.('Errore nella stampa della ricevuta', 'error')
                            } finally {
                              setLoading(false)
                            }
                          }}
                          className="quick-print-btn"
                          disabled={loading}
                        >
                          📄 Stampa
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan="4" className="no-customers">
                        {customersFilter ? 'Nessun cliente trovato' : 'Nessun cliente con credito'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="customers-summary">
              <span>Totale clienti con credito: {customers.length}</span>
              <button onClick={loadCustomersWithCredit} className="refresh-btn">
                🔄 Ricarica
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* NFC Reader */}
      {isNFCActive && (
        <div className="nfc-reader-section">
          <h4>📶 Lettore NFC Attivo</h4>
          <p>Avvicinare la card del cliente per riconoscimento automatico</p>
          <NFCQuickReaderHybrid 
            onCustomerFound={handleCustomerFound}
            showNotification={showNotification}
          />
        </div>
      )}

      {/* Tabella Transazioni */}
      <div className="transactions-table">
        <div className="transactions-header">
          <h3>📊 Ultime Transazioni Wallet</h3>
          <button 
            onClick={() => setShowExportModal(true)}
            className="export-btn"
          >
            📊 Esporta Dati
          </button>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Data/Ora</th>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Importo</th>
                <th>Descrizione</th>
                <th>Operatore</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(transaction => (
                <tr key={transaction.id}>
                  <td>{new Date(transaction.created_at).toLocaleString('it-IT')}</td>
                  <td>{transaction.customer?.name || 'N/A'}</td>
                  <td>
                    <span className={`type ${transaction.type}`}>
                      {transaction.type === 'credit' ? '💰 Ricarica' : '💸 Utilizzo'}
                    </span>
                  </td>
                  <td className={`amount ${transaction.type}`}>
                    {transaction.type === 'credit' ? '+' : '-'}€ {Math.abs(transaction.amount).toFixed(2)}
                  </td>
                  <td>{transaction.description}</td>
                  <td>{transaction.operator}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabella Ricevute Stampate */}
      <div className="transactions-table" style={{marginTop: '40px'}}>
        <div className="transactions-header">
          <h3>🧾 Ricevute Stampate</h3>
          <button 
            onClick={() => setShowExportModal(true)}
            className="export-btn"
          >
            📊 Esporta Dati
          </button>
        </div>
        <div className="table-container receipts-table-container">
          <table>
            <thead>
              <tr>
                <th>Data Stampa</th>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Importo</th>
                <th>Metodo</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {printedReceipts.length > 0 ? (
                printedReceipts.map(receipt => (
                  <tr key={receipt.id}>
                    <td>{new Date(receipt.receipt_printed_at).toLocaleString('it-IT')}</td>
                    <td>
                      <div>
                        <strong>{receipt.customer?.name || 'N/A'}</strong>
                        <br />
                        <small>{receipt.customer?.phone || receipt.customer?.email || ''}</small>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${receipt.type === 'credit' ? 'credit' : 'debit'}`}>
                        {receipt.type === 'credit' ? '➕ Ricarica' : '➖ Prelievo'}
                      </span>
                    </td>
                    <td>
                      <strong className={receipt.type === 'credit' ? 'text-success' : 'text-danger'}>
                        € {Math.abs(receipt.amount).toFixed(2)}
                      </strong>
                    </td>
                    <td>
                      <span className="payment-method">
                        {receipt.payment_method === 'contanti' ? '💵 Contanti' : '💳 Bancomat'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => reprintReceipt(receipt)}
                        disabled={loading}
                        className="reprint-btn"
                      >
                        🖨️ Ristampa
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{textAlign: 'center', padding: '20px', color: '#666'}}>
                    Nessuna ricevuta stampata trovata
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Esportazione */}
      {showExportModal && (
        <div className="export-modal-overlay">
          <div className="export-modal">
            <div className="modal-header">
              <h4>📊 Esporta Transazioni Wallet</h4>
              <button 
                onClick={() => setShowExportModal(false)}
                className="close-btn"
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <div className="filter-group">
                <label>📅 Data Inizio:</label>
                <input
                  type="date"
                  value={exportFilters.startDate}
                  onChange={(e) => setExportFilters({...exportFilters, startDate: e.target.value})}
                />
              </div>
              
              <div className="filter-group">
                <label>📅 Data Fine:</label>
                <input
                  type="date"
                  value={exportFilters.endDate}
                  onChange={(e) => setExportFilters({...exportFilters, endDate: e.target.value})}
                />
              </div>
              
              <div className="filter-group">
                <label>🔍 Tipo Transazione:</label>
                <select
                  value={exportFilters.type}
                  onChange={(e) => setExportFilters({...exportFilters, type: e.target.value})}
                >
                  <option value="all">Tutte</option>
                  <option value="credit">Solo Ricariche</option>
                  <option value="debit">Solo Utilizzi</option>
                </select>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                onClick={exportTransactions}
                className="export-confirm-btn"
                disabled={loading}
              >
                {loading ? '⏳ Esportando...' : '📊 Scarica CSV'}
              </button>
              <button 
                onClick={() => setShowExportModal(false)}
                className="cancel-btn"
              >
                ❌ Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WalletCashRegister