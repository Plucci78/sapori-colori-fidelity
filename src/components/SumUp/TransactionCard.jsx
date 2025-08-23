import React from 'react'

const TransactionCard = ({ transaction, onPrintReceipt, isPrinting }) => {
  // Icone per tipi di carta
  const getCardIcon = (cardType) => {
    const icons = {
      'VISA': '💳',
      'MASTERCARD': '💳',
      'MAESTRO': '💳',
      'AMERICAN EXPRESS': '💳',
      'AMEX': '💳'
    }
    return icons[cardType?.toUpperCase()] || '💳'
  }

  // Colori per tipi di carta
  const getCardColor = (cardType) => {
    const colors = {
      'VISA': '#1a73e8',
      'MASTERCARD': '#ff5f00', 
      'MAESTRO': '#0099df',
      'AMERICAN EXPRESS': '#2e77bb',
      'AMEX': '#2e77bb'
    }
    return colors[cardType?.toUpperCase()] || '#666'
  }

  // Icona per modalità di pagamento
  const getEntryModeIcon = (entryMode) => {
    const icons = {
      'contactless': '📡',
      'chip': '🔒',
      'swipe': '💳',
      'manual': '✋'
    }
    return icons[entryMode?.toLowerCase()] || '💳'
  }

  const formatAmount = (amount) => {
    return `€${parseFloat(amount).toFixed(2)}`
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: '2-digit',
      year: '2-digit'
    })
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className={`transaction-card ${transaction.printed ? 'printed' : ''}`}>
      {/* Header con importo */}
      <div className="transaction-header">
        <div className="amount-section">
          <span className="amount">{formatAmount(transaction.amount)}</span>
          <span className="currency">EUR</span>
        </div>
        <div className="status-section">
          {transaction.printed && (
            <span className="print-status printed">
              ✅ Stampato
            </span>
          )}
          <span className="transaction-status success">
            ✅ SUCCESSFUL
          </span>
        </div>
      </div>

      {/* Dettagli carta */}
      <div className="card-details">
        <div className="card-info">
          <span 
            className="card-type"
            style={{ color: getCardColor(transaction.cardType) }}
          >
            {getCardIcon(transaction.cardType)} {transaction.cardType}
          </span>
          <span className="entry-mode">
            {getEntryModeIcon(transaction.entryMode)} {transaction.entryMode}
          </span>
        </div>
      </div>

      {/* Info transazione */}
      <div className="transaction-info">
        <div className="date-time">
          <span className="date">📅 {formatDate(transaction.timestamp)}</span>
          <span className="time">🕐 {formatTime(transaction.timestamp)}</span>
        </div>
        <div className="transaction-id">
          <span className="label">ID:</span>
          <span className="id">{transaction.code}</span>
        </div>
      </div>

      {/* Azioni */}
      <div className="transaction-actions">
        <button
          onClick={() => onPrintReceipt(transaction)}
          disabled={isPrinting}
          className={`btn btn-print ${isPrinting ? 'printing' : ''}`}
        >
          {isPrinting ? (
            <>🔄 Stampa in corso...</>
          ) : (
            <>🖨️ Stampa Scontrino</>
          )}
        </button>
        
        {transaction.printed && transaction.lastPrintTime && (
          <span className="last-print">
            Stampato: {formatTime(transaction.lastPrintTime)}
          </span>
        )}
      </div>
    </div>
  )
}

export default TransactionCard