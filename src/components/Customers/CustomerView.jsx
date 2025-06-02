import { memo } from 'react'

const CustomerView = memo(({ 
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
  modifyPoints
}) => (
  <div className="customer-container">
    <div className="customer-header">
      <h1>Gestione Clienti</h1>
      <p>Cerca clienti, aggiungi vendite e gestisci GEMME</p>
    </div>

    <div className="customer-search">
      <input
        type="text"
        placeholder="🔍 Cerca cliente per nome o telefono..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-input"
      />
    </div>

    {customers.length > 0 && (
      <div className="customers-grid">
        {customers.map((customer) => (
          <div
            key={customer.id}
            className={`customer-card ${selectedCustomer?.id === customer.id ? 'selected' : ''}`}
            onClick={() => setSelectedCustomer(customer)}
          >
            <div className="customer-info">
              <h4>{customer.name}</h4>
              <p className="customer-phone">{customer.phone}</p>
              {customer.email && <p className="customer-email">📧 {customer.email}</p>}
            </div>
            <div className="customer-points">
              <span className="gemma-icon-small"></span>
              <span className="points-count">{customer.points}</span>
              <span className="points-label">GEMME</span>
            </div>
          </div>
        ))}
      </div>
    )}

    <div className="new-customer-section">
      <h3>➕ Nuovo Cliente</h3>
      <div className="new-customer-form">
        <input
          type="text"
          placeholder="Nome completo"
          value={newCustomerName}
          onChange={(e) => setNewCustomerName(e.target.value)}
        />
        <input
          type="tel"
          placeholder="Telefono"
          value={newCustomerPhone}
          onChange={(e) => setNewCustomerPhone(e.target.value)}
        />
        <input
          type="email"
          placeholder="Email (opzionale - per email automatiche)"
          value={newCustomerEmail}
          onChange={(e) => setNewCustomerEmail(e.target.value)}
        />
        <button onClick={createCustomer} className="btn-primary">
          Crea Cliente
        </button>
      </div>
    </div>

    {selectedCustomer && (
      <div className="selected-customer-section">
        <div className="customer-detail-card">
          <div className="customer-avatar">
            <span className="avatar-initial">{selectedCustomer.name.charAt(0)}</span>
          </div>
          <div className="customer-details">
            <h2>{selectedCustomer.name}</h2>
            <div className="customer-gemme">
              <span className="gemma-icon-large"></span>
              <span className="gemme-count">{selectedCustomer.points}</span>
              <span className="gemme-label">GEMME</span>
            </div>
            {selectedCustomer.email && (
              <p className="customer-contact">📧 {selectedCustomer.email}</p>
            )}
          </div>
        </div>

        <div className="transaction-section">
          <h3>💰 Nuova Vendita</h3>
          <div className="quick-amounts">
            <button onClick={() => setTransactionAmount('2.25')}>Pane 500g - €2,25</button>
            <button onClick={() => setTransactionAmount('4.50')}>Pane 1kg - €4,50</button>
            <button onClick={() => setTransactionAmount('1.80')}>Cornetto - €1,80</button>
            <button onClick={() => setTransactionAmount('3.50')}>Focaccia - €3,50</button>
          </div>
          <div className="amount-input">
            <input
              type="number"
              placeholder="Importo €"
              value={transactionAmount}
              onChange={(e) => setTransactionAmount(e.target.value)}
              step="0.01"
            />
            <button onClick={addTransaction} className="btn-primary">
              Registra Vendita
            </button>
          </div>
        </div>

        <div className="prizes-section">
          <h3>🎁 Riscatta Premi</h3>
          <div className="prizes-grid">
            {prizes.map((prize) => (
              <div key={prize.id} className="prize-card">
                <div className="prize-info">
                  <h4>{prize.name}</h4>
                  <p>{prize.description}</p>
                  <div className="prize-cost">
                    <span className="gemma-icon-small"></span>
                    {prize.points_cost} GEMME
                  </div>
                </div>
                <button
                  onClick={() => redeemPrize(prize)}
                  className={`btn-redeem ${selectedCustomer.points < prize.points_cost ? 'disabled' : ''}`}
                  disabled={selectedCustomer.points < prize.points_cost}
                >
                  {selectedCustomer.points >= prize.points_cost ? 'Riscatta' : 'GEMME insufficienti'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}

    <div className="manual-points-section">
      <h3>🔧 Gestione Manuale GEMME</h3>
      <div className="manual-search">
        <input
          type="text"
          placeholder="Cerca cliente per nome..."
          value={manualCustomerName}
          onChange={(e) => {
            setManualCustomerName(e.target.value)
            searchCustomersForManual(e.target.value)
          }}
        />
      </div>

      {foundCustomers.length > 0 && (
        <div className="found-customers">
          {foundCustomers.map((customer) => (
            <div key={customer.id} className="found-customer-item">
              <div className="customer-info">
                <strong>{customer.name}</strong>
                <span className="customer-points">
                  <span className="gemma-icon-tiny"></span>{customer.points} GEMME
                </span>
                <small>{customer.phone}</small>
                {customer.email && <small>• {customer.email}</small>}
              </div>
              <div className="points-controls">
                <input
                  type="number"
                  placeholder="±GEMME"
                  value={manualPoints}
                  onChange={(e) => setManualPoints(e.target.value)}
                />
                <button
                  onClick={() => modifyPoints(customer, manualPoints)}
                  className="btn-primary"
                >
                  Modifica
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
))

CustomerView.displayName = 'CustomerView'

export default CustomerView