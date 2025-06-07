import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

const ClientPortal = ({ token }) => {
  const [customer, setCustomer] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [prizes, setPrizes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadClientData()
  }, [token])

  const loadClientData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Carica dati cliente
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('client_token', token)
        .single()

      if (customerError || !customerData) {
        setError('Cliente non trovato o link non valido')
        setLoading(false)
        return
      }

      setCustomer(customerData)

      // Carica transazioni cliente (ultime 10)
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .eq('customer_id', customerData.id)
        .order('created_at', { ascending: false })
        .limit(10)

      setTransactions(transactionsData || [])

      // Carica premi disponibili
      const { data: prizesData } = await supabase
        .from('prizes')
        .select('*')
        .eq('active', true)
        .order('points_cost')

      setPrizes(prizesData || [])

    } catch (err) {
      setError('Errore nel caricamento dei dati')
      console.error('Errore caricamento portale cliente:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getCustomerLevel = (points) => {
    if (points >= 150) return { level: 'Diamante', color: '#9333ea', icon: '💎' }
    if (points >= 100) return { level: 'Oro', color: '#f59e0b', icon: '🥇' }
    if (points >= 50) return { level: 'Argento', color: '#6b7280', icon: '🥈' }
    return { level: 'Bronzo', color: '#a3a3a3', icon: '🥉' }
  }

  if (loading) {
    return (
      <div className="client-portal-loading">
        <div className="loading-spinner"></div>
        <p>Caricamento in corso...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="client-portal-error">
        <div className="error-icon">❌</div>
        <h2>Accesso non valido</h2>
        <p>{error}</p>
        <p>Contatta il negozio per assistenza.</p>
      </div>
    )
  }

  const customerLevel = getCustomerLevel(customer.points)

  return (
    <div className="client-portal">
      {/* HEADER CLIENTE */}
      <div className="client-header">
        <img
          src="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png"
          alt="Sapori & Colori"
          className="client-logo"
        />
        <div className="client-info">
          <h1>Ciao {customer.name}! 👋</h1>
          <div className="client-level" style={{ backgroundColor: customerLevel.color }}>
            <span className="level-icon">{customerLevel.icon}</span>
            <span>Cliente {customerLevel.level}</span>
          </div>
        </div>
      </div>

      {/* GEMME ATTUALI */}
      <div className="client-gems-card">
        <div className="gems-display">
          <div className="gems-icon"></div>
          <div className="gems-info">
            <h2>{customer.points}</h2>
            <p>GEMME Disponibili</p>
          </div>
        </div>
        <div className="gems-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${Math.min((customer.points % 50) * 2, 100)}%` }}
            ></div>
          </div>
          <p>Prossimo livello: {50 - (customer.points % 50)} GEMME</p>
        </div>
      </div>

      {/* PREMI DISPONIBILI */}
      <div className="client-section">
        <h3>🎁 Premi Disponibili</h3>
        <div className="prizes-grid">
          {prizes.map(prize => (
            <div 
              key={prize.id} 
              className={`prize-card ${customer.points >= prize.points_cost ? 'available' : 'unavailable'}`}
            >
              {prize.image_url && (
                <img src={prize.image_url} alt={prize.name} className="prize-image" />
              )}
              <div className="prize-info">
                <h4>{prize.name}</h4>
                <p>{prize.description}</p>
                <div className="prize-cost">
                  <span className="cost-gems">💎 {prize.points_cost}</span>
                  {customer.points >= prize.points_cost ? (
                    <span className="cost-status available">✅ Disponibile</span>
                  ) : (
                    <span className="cost-status unavailable">
                      📍 Ti mancano {prize.points_cost - customer.points} GEMME
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* STORICO VISITE */}
      <div className="client-section">
        <h3>📊 Le tue ultime visite</h3>
        {transactions.length > 0 ? (
          <div className="transactions-list">
            {transactions.map(transaction => (
              <div key={transaction.id} className="transaction-item">
                <div className="transaction-info">
                  <div className="transaction-type">
                    {transaction.type === 'acquistare' ? '🛍️ Acquisto' : '🎁 Premio Riscattato'}
                  </div>
                  <div className="transaction-date">
                    {formatDate(transaction.created_at)}
                  </div>
                </div>
                <div className="transaction-points">
                  <span className={transaction.points_earned > 0 ? 'points-gained' : 'points-used'}>
                    {transaction.points_earned > 0 ? '+' : ''}{transaction.points_earned} GEMME
                  </span>
                  {transaction.amount > 0 && (
                    <span className="transaction-amount">€{transaction.amount}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-transactions">Nessuna transazione ancora registrata.</p>
        )}
      </div>

      {/* FOOTER */}
      <div className="client-footer">
        <p>
          <strong>Sapori & Colori</strong><br />
          Via Example 123, Roma<br />
          Tel: 06 1234567
        </p>
        <p className="footer-note">
          💡 Presenta questo link in negozio per identificarti rapidamente!
        </p>
      </div>
    </div>
  )
}

export default ClientPortal