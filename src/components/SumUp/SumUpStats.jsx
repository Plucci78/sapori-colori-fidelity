import React from 'react'

const SumUpStats = ({ stats }) => {
  const {
    todayTotal,
    todayCount,
    weekTotal,
    weekCount,
    totalTransactions,
    cardTypes
  } = stats

  // Trova il tipo di carta più usato
  const getMostUsedCard = () => {
    if (!cardTypes || Object.keys(cardTypes).length === 0) return null
    
    const [mostUsed] = Object.entries(cardTypes)
      .sort(([,a], [,b]) => b - a)
    
    return mostUsed
  }

  const mostUsedCard = getMostUsedCard()

  return (
    <div className="sumup-stats">
      <h3>📊 Statistiche Pagamenti</h3>
      
      <div className="stats-grid">
        {/* Incassi oggi */}
        <div className="stat-card today">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-value">€{todayTotal}</div>
            <div className="stat-label">Oggi ({todayCount} transazioni)</div>
          </div>
        </div>

        {/* Incassi settimana */}
        <div className="stat-card week">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <div className="stat-value">€{weekTotal}</div>
            <div className="stat-label">Questa settimana ({weekCount})</div>
          </div>
        </div>

        {/* Totale transazioni */}
        <div className="stat-card total">
          <div className="stat-icon">🧾</div>
          <div className="stat-content">
            <div className="stat-value">{totalTransactions}</div>
            <div className="stat-label">Transazioni totali</div>
          </div>
        </div>

        {/* Carta più usata */}
        {mostUsedCard && (
          <div className="stat-card card-type">
            <div className="stat-icon">💳</div>
            <div className="stat-content">
              <div className="stat-value">{mostUsedCard[0]}</div>
              <div className="stat-label">Più usata ({mostUsedCard[1]}x)</div>
            </div>
          </div>
        )}
      </div>

      {/* Breakdown tipi carta */}
      {cardTypes && Object.keys(cardTypes).length > 1 && (
        <div className="card-breakdown">
          <h4>💳 Distribuzione Tipi Carta</h4>
          <div className="card-types">
            {Object.entries(cardTypes)
              .sort(([,a], [,b]) => b - a)
              .map(([type, count]) => (
                <div key={type} className="card-type-item">
                  <span className="card-name">{type}</span>
                  <span className="card-count">{count}</span>
                  <div className="card-bar">
                    <div 
                      className="card-bar-fill"
                      style={{ 
                        width: `${(count / totalTransactions) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}

export default SumUpStats