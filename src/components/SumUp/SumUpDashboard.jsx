import React, { useState, useEffect } from 'react'
import { useSumUp } from '../../hooks/useSumUp'
import TransactionCard from './TransactionCard'
import SumUpStats from './SumUpStats'
import TransactionFilters from './TransactionFilters'
import SumUpIcons from './SumUpIcons'
import './SumUpDashboard.css'

const SumUpDashboard = () => {
  const {
    transactions,
    loading,
    error,
    printingTransaction,
    fetchTransactions,
    printReceipt,
    getStats,
    filterByAmount,
    filterByDate,
    refreshTransactions,
    clearError
  } = useSumUp()

  const [filteredTransactions, setFilteredTransactions] = useState([])
  const [filters, setFilters] = useState({
    amount: '',
    date: '',
    cardType: ''
  })

  // Carica transazioni all'avvio
  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  // Applica filtri
  useEffect(() => {
    let filtered = transactions

    if (filters.amount) {
      filtered = filterByAmount(filters.amount)
    }

    if (filters.date) {
      filtered = filterByDate(filters.date)
    }

    if (filters.cardType) {
      filtered = filtered.filter(t => t.cardType === filters.cardType)
    }

    setFilteredTransactions(filtered)
  }, [transactions, filters, filterByAmount, filterByDate])

  // Gestisce stampa scontrino
  const handlePrintReceipt = async (transaction) => {
    try {
      await printReceipt(transaction.amount, transaction.code)
      // Mostra notifica di successo se necessario
    } catch (err) {
      // L'errore è già gestito nel hook
      console.error('Errore stampa:', err)
    }
  }

  // Gestisce cambio filtri
  const handleFiltersChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  // Pulisce filtri
  const clearFilters = () => {
    setFilters({ amount: '', date: '', cardType: '' })
  }

  const stats = getStats()

  return (
    <div className="sumup-dashboard">
      {/* Header */}
      <div className="sumup-header">
        <div className="header-title">
          <img 
            src="https://jexkalekaofsfcusdfjh.supabase.co/storage/v1/object/public/tinymce-images/sumup-logo.png" 
            alt="SumUp Dashboard" 
            className="sumup-logo"
            onError={(e) => {
              // Fallback se il logo non è disponibile
              e.target.style.display = 'none'
            }}
          />
        </div>
        <div className="header-actions">
          <button 
            onClick={refreshTransactions}
            disabled={loading}
            className="btn btn-outline"
          >
            {loading ? (
              <><SumUpIcons.Refresh size={16} /> Caricamento...</>
            ) : (
              <><SumUpIcons.Refresh size={16} /> Aggiorna</>
            )}
          </button>
        </div>
      </div>

      {/* Statistiche */}
      {stats && <SumUpStats stats={stats} />}

      {/* Filtri */}
      <TransactionFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={clearFilters}
        cardTypes={stats?.cardTypes || {}}
      />

      {/* Errori */}
      {error && (
        <div className="error-banner">
          <span><SumUpIcons.Error size={16} /> {error}</span>
          <button onClick={clearError} className="btn-close">×</button>
        </div>
      )}

      {/* Lista Transazioni */}
      <div className="transactions-section">
        <div className="transactions-header">
          <h3><SumUpIcons.CreditCard size={18} /> Transazioni Recenti</h3>
          <span className="transactions-count">
            {filteredTransactions.length} di {transactions.length}
          </span>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"><SumUpIcons.Refresh size={24} /></div>
            <p>Caricamento transazioni SumUp...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="empty-state">
            <p><SumUpIcons.Empty size={16} /> {filters.amount || filters.date || filters.cardType 
              ? 'Nessuna transazione trovata con i filtri attuali' 
              : 'Nessuna transazione SumUp trovata'
            }</p>
            {(filters.amount || filters.date || filters.cardType) && (
              <button onClick={clearFilters} className="btn btn-outline">
                Pulisci Filtri
              </button>
            )}
          </div>
        ) : (
          <div className="transactions-list">
            {filteredTransactions.map((transaction) => (
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
                onPrintReceipt={handlePrintReceipt}
                isPrinting={printingTransaction === transaction.code || printingTransaction === transaction.amount}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {filteredTransactions.length > 0 && (
        <div className="dashboard-footer">
          <button
            onClick={() => handlePrintReceipt(filteredTransactions[0])}
            disabled={!!printingTransaction}
            className="btn btn-primary"
          >
            <SumUpIcons.Print size={16} /> Stampa Ultima Transazione
          </button>
        </div>
      )}
    </div>
  )
}

export default SumUpDashboard