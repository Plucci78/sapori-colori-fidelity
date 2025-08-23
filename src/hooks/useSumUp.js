import { useState, useCallback } from 'react'

export const useSumUp = () => {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [printingTransaction, setPrintingTransaction] = useState(null)

  // Recupera lista transazioni SumUp
  const fetchTransactions = useCallback(async (limit = 20) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/sumup-print?action=list&limit=${limit}`)
      const data = await response.json()
      
      if (data.success) {
        setTransactions(data.transactions || [])
        return data.transactions
      } else {
        throw new Error(data.error || 'Errore recupero transazioni')
      }
    } catch (err) {
      console.error('Errore fetch transazioni SumUp:', err)
      setError(err.message)
      setTransactions([])
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  // Stampa scontrino per importo
  const printReceipt = useCallback(async (amount, transactionCode = null) => {
    if (printingTransaction) return // Previeni stampe multiple

    setPrintingTransaction(transactionCode || amount)
    setError(null)
    
    try {
      const response = await fetch('/api/sumup-print', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: amount.toString() })
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Aggiorna lo stato della transazione come stampata
        setTransactions(prev => prev.map(t => 
          t.amount === amount.toString() || t.code === transactionCode
            ? { ...t, printed: true, lastPrintTime: new Date().toISOString() }
            : t
        ))
        
        return {
          success: true,
          transaction: data.transaction,
          message: data.message
        }
      } else {
        throw new Error(data.message || 'Errore stampa scontrino')
      }
    } catch (err) {
      console.error('Errore stampa scontrino SumUp:', err)
      setError(`Errore stampa: ${err.message}`)
      throw err
    } finally {
      setPrintingTransaction(null)
    }
  }, [printingTransaction])

  // Calcola statistiche dalle transazioni
  const getStats = useCallback(() => {
    if (!transactions.length) return null

    const today = new Date().toDateString()
    const thisWeek = new Date()
    thisWeek.setDate(thisWeek.getDate() - 7)

    const todayTransactions = transactions.filter(t => 
      new Date(t.timestamp).toDateString() === today
    )
    
    const weekTransactions = transactions.filter(t => 
      new Date(t.timestamp) >= thisWeek
    )

    const todayTotal = todayTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0)
    const weekTotal = weekTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0)

    // Conta tipi di carte
    const cardTypes = transactions.reduce((acc, t) => {
      acc[t.cardType] = (acc[t.cardType] || 0) + 1
      return acc
    }, {})

    return {
      todayTotal: todayTotal.toFixed(2),
      todayCount: todayTransactions.length,
      weekTotal: weekTotal.toFixed(2),
      weekCount: weekTransactions.length,
      totalTransactions: transactions.length,
      cardTypes
    }
  }, [transactions])

  // Filtra transazioni per importo
  const filterByAmount = useCallback((amount) => {
    if (!amount) return transactions
    
    return transactions.filter(t => 
      parseFloat(t.amount) === parseFloat(amount)
    )
  }, [transactions])

  // Filtra transazioni per data
  const filterByDate = useCallback((date) => {
    if (!date) return transactions
    
    const targetDate = new Date(date).toDateString()
    return transactions.filter(t => 
      new Date(t.timestamp).toDateString() === targetDate
    )
  }, [transactions])

  return {
    transactions,
    loading,
    error,
    printingTransaction,
    fetchTransactions,
    printReceipt,
    getStats,
    filterByAmount,
    filterByDate,
    // Utility functions
    refreshTransactions: () => fetchTransactions(),
    clearError: () => setError(null)
  }
}