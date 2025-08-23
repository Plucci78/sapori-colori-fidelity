import React from 'react'
import SumUpIcons from './SumUpIcons'

const TransactionFilters = ({ filters, onFiltersChange, onClearFilters, cardTypes }) => {
  const handleInputChange = (field, value) => {
    onFiltersChange({ [field]: value })
  }

  const hasActiveFilters = filters.amount || filters.date || filters.cardType

  // Opzioni per filtro tipo carta
  const cardTypeOptions = Object.keys(cardTypes || {}).sort()

  return (
    <div className="transaction-filters">
      <div className="filters-header">
        <h3><SumUpIcons.Filter size={18} /> Filtri e Ricerca</h3>
        {hasActiveFilters && (
          <button 
            onClick={onClearFilters}
            className="btn btn-clear"
          >
            <SumUpIcons.Close size={16} /> Pulisci Filtri
          </button>
        )}
      </div>

      <div className="filters-grid">
        {/* Ricerca per importo */}
        <div className="filter-group">
          <label htmlFor="amount-filter"><SumUpIcons.Money size={16} /> Importo Esatto</label>
          <div className="input-group">
            <span className="input-prefix">€</span>
            <input
              id="amount-filter"
              type="number"
              step="0.01"
              min="0"
              placeholder="es. 21.00"
              value={filters.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              className="filter-input"
            />
          </div>
          <small>Cerca transazione per importo specifico</small>
        </div>

        {/* Filtro per data */}
        <div className="filter-group">
          <label htmlFor="date-filter"><SumUpIcons.Calendar size={16} /> Data Transazione</label>
          <input
            id="date-filter"
            type="date"
            value={filters.date}
            onChange={(e) => handleInputChange('date', e.target.value)}
            className="filter-input"
          />
          <small>Filtra per data specifica</small>
        </div>

        {/* Filtro tipo carta */}
        <div className="filter-group">
          <label htmlFor="card-type-filter"><SumUpIcons.CreditCard size={16} /> Tipo Carta</label>
          <select
            id="card-type-filter"
            value={filters.cardType}
            onChange={(e) => handleInputChange('cardType', e.target.value)}
            className="filter-select"
          >
            <option value="">Tutti i tipi</option>
            {cardTypeOptions.map(cardType => (
              <option key={cardType} value={cardType}>
                {cardType} ({cardTypes[cardType]})
              </option>
            ))}
          </select>
          <small>Filtra per tipo di carta</small>
        </div>
      </div>

      {/* Filtri rapidi */}
      <div className="quick-filters">
        <span className="quick-filters-label"><SumUpIcons.Filter size={16} /> Filtri Rapidi:</span>
        
        <button
          onClick={() => handleInputChange('date', new Date().toISOString().split('T')[0])}
          className={`btn btn-quick ${filters.date === new Date().toISOString().split('T')[0] ? 'active' : ''}`}
        >
          <SumUpIcons.Calendar size={16} /> Oggi
        </button>
        
        {cardTypeOptions.slice(0, 3).map(cardType => (
          <button
            key={cardType}
            onClick={() => handleInputChange('cardType', cardType)}
            className={`btn btn-quick ${filters.cardType === cardType ? 'active' : ''}`}
          >
            <SumUpIcons.CreditCard size={16} /> {cardType}
          </button>
        ))}
      </div>

      {/* Contatore risultati */}
      {hasActiveFilters && (
        <div className="filter-results">
          <span className="results-info">
            <SumUpIcons.Filter size={16} /> {hasActiveFilters ? 'Filtri attivi' : 'Mostra tutto'}
          </span>
        </div>
      )}
    </div>
  )
}

export default TransactionFilters