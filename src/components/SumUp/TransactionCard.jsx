import React from 'react'
import SumUpIcons from './SumUpIcons'

const TransactionCard = ({ transaction, onPrintReceipt, isPrinting }) => {
  // Icone per tipi di carta
  const getCardIcon = (cardType) => {
    const type = cardType?.toUpperCase()
    switch(type) {
      case 'VISA':
      case 'V PAY':
        return <SumUpIcons.Visa size={20} />
      case 'MASTERCARD':
        return <SumUpIcons.Mastercard size={20} />
      case 'MAESTRO':
        return <SumUpIcons.Maestro size={20} />
      case 'AMERICAN EXPRESS':
      case 'AMEX':
        return <SumUpIcons.AmericanExpress size={20} />
      case 'DISCOVER':
        return <SumUpIcons.Discover size={20} />
      case 'DINERS CLUB':
      case 'DINERSCLUB':
        return <SumUpIcons.DinersClub size={20} />
      default:
        return <SumUpIcons.CreditCard size={20} />
    }
  }

  // Colori per tipi di carta
  const getCardColor = (cardType) => {
    const colors = {
      'VISA': '#1a73e8',
      'V PAY': '#1a73e8',
      'MASTERCARD': '#ff5f00', 
      'MAESTRO': '#0099df',
      'AMERICAN EXPRESS': '#2e77bb',
      'AMEX': '#2e77bb',
      'DISCOVER': '#ff6000',
      'DINERS CLUB': '#0079be',
      'DINERSCLUB': '#0079be'
    }
    return colors[cardType?.toUpperCase()] || '#666'
  }

  // Icona per modalità di pagamento
  const getEntryModeIcon = (entryMode) => {
    const mode = entryMode?.toLowerCase()
    switch(mode) {
      case 'contactless':
        return <SumUpIcons.Contactless size={16} />
      case 'chip':
        return <SumUpIcons.Chip size={16} />
      case 'swipe':
        return <SumUpIcons.Swipe size={16} />
      case 'manual':
        return <SumUpIcons.Manual size={16} />
      default:
        return <SumUpIcons.CreditCard size={16} />
    }
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
              <SumUpIcons.Success size={12} /> Stampato
            </span>
          )}
          <span className="transaction-status success">
            <SumUpIcons.Success size={12} /> SUCCESSFUL
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
          <span className="date"><SumUpIcons.Calendar size={14} /> {formatDate(transaction.timestamp)}</span>
          <span className="time"><SumUpIcons.Clock size={14} /> {formatTime(transaction.timestamp)}</span>
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
            <><SumUpIcons.Refresh size={16} /> Stampa in corso...</>
          ) : (
            <><SumUpIcons.Print size={16} /> Stampa Scontrino</>
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