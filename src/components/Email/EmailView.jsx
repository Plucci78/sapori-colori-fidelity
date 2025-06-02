import { memo } from 'react'

const EmailView = memo(({
  emailStats,
  emailTemplate,
  setEmailTemplate,
  emailRecipients,
  setEmailRecipients,
  showIndividualSelection,
  setShowIndividualSelection,
  loadAllCustomersForEmail,
  selectedIndividualCustomers,
  allCustomersForEmail,
  toggleAllCustomers,
  toggleIndividualCustomer,
  emailSubject,
  setEmailSubject,
  customMessage,
  setCustomMessage,
  sendEmail
}) => (
  <div className="email-container">
    <div className="email-header">
      <h1>Email Marketing</h1>
      <p>Campagne email automatiche e manuali</p>
    </div>

    <div className="email-stats-section">
      <div className="email-stats-grid">
        <div className="email-stat-card">
          <div className="stat-icon">📧</div>
          <div className="stat-content">
            <div className="stat-number">{emailStats.sent}</div>
            <div className="stat-label">Email Inviate</div>
          </div>
        </div>
        <div className="email-stat-card">
          <div className="stat-icon">📖</div>
          <div className="stat-content">
            <div className="stat-number">{emailStats.opened}</div>
            <div className="stat-label">Email Aperte</div>
          </div>
        </div>
      </div>
    </div>

    <div className="email-automation-info">
      <h3>✨ Email Automatiche Attive</h3>
      <div className="automation-cards">
        <div className="automation-card">
          <div className="automation-icon">🎉</div>
          <div className="automation-content">
            <h4>Benvenuto</h4>
            <p>Invio automatico alla creazione cliente con email</p>
          </div>
        </div>
        <div className="automation-card">
          <div className="automation-icon">
            <span className="gemma-icon-small"></span>
          </div>
          <div className="automation-content">
            <h4>50 GEMME</h4>
            <p>Email "Congratulazioni" automatica</p>
          </div>
        </div>
        <div className="automation-card">
          <div className="automation-icon">⭐</div>
          <div className="automation-content">
            <h4>100 GEMME</h4>
            <p>Email "Cliente VIP" automatica</p>
          </div>
        </div>
        <div className="automation-card">
          <div className="automation-icon">🚀</div>
          <div className="automation-content">
            <h4>150 GEMME</h4>
            <p>Email "Incredibile" automatica</p>
          </div>
        </div>
      </div>
    </div>

    <div className="email-composer-section">
      <h3>📝 Componi Email Manuale</h3>
      <div className="email-composer">
        <div className="composer-settings">
          <div className="setting-row">
            <label>Template:</label>
            <select
              value={emailTemplate}
              onChange={(e) => setEmailTemplate(e.target.value)}
            >
              <option value="welcome">🎉 Benvenuto</option>
              <option value="points">🔥 GEMME Raggiunte</option>
              <option value="promo">🔥 Promozione</option>
            </select>
          </div>

          <div className="setting-row">
            <label>Destinatari:</label>
            <select
              value={emailRecipients}
              onChange={(e) => {
                setEmailRecipients(e.target.value)
                if (e.target.value === 'individual') {
                  setShowIndividualSelection(true)
                  loadAllCustomersForEmail()
                } else {
                  setShowIndividualSelection(false)
                }
              }}
            >
              <option value="all">Tutti i Clienti</option>
              <option value="top">Top Clienti (50+ GEMME)</option>
              <option value="active">Clienti Attivi</option>
              <option value="inactive">Clienti Inattivi</option>
              <option value="individual">🆕 Selezione Individuale</option>
            </select>
          </div>
        </div>

        {showIndividualSelection && (
          <div className="individual-selection">
            <h4>🎯 Seleziona Clienti Specifici</h4>

            <div className="selection-controls">
              <button
                onClick={toggleAllCustomers}
                className="btn-secondary"
              >
                {selectedIndividualCustomers.length === allCustomersForEmail.length ? 'Deseleziona Tutti' : 'Seleziona Tutti'}
              </button>
              <span className="selection-count">
                {selectedIndividualCustomers.length} di {allCustomersForEmail.length} clienti selezionati
              </span>
            </div>

            <div className="customers-selection-list">
              {allCustomersForEmail.map((customer) => (
                <div
                  key={customer.id}
                  className={`customer-selection-item ${selectedIndividualCustomers.includes(customer.id) ? 'selected' : ''}`}
                  onClick={() => toggleIndividualCustomer(customer.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedIndividualCustomers.includes(customer.id)}
                    onChange={() => toggleIndividualCustomer(customer.id)}
                  />
                  <div className="customer-selection-info">
                    <strong>{customer.name}</strong>
                    <span className="customer-points">
                      <span className="gemma-icon-tiny"></span>{customer.points} GEMME
                    </span>
                    <small>{customer.email}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="composer-inputs">
          <input
            type="text"
            placeholder="Oggetto email..."
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            className="subject-input"
          />

          <textarea
            placeholder="Messaggio personalizzato (opzionale)..."
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="message-input"
          />

          <button onClick={sendEmail} className="btn-send-email">
            📧 INVIA EMAIL
          </button>
        </div>
      </div>
    </div>
  </div>
))

EmailView.displayName = 'EmailView'

export default EmailView