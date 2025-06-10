import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { getCustomerLevel, getNextLevelInfo } from '../../utils/levelsUtils'

const ClientPortal = ({ token }) => {
  const [customer, setCustomer] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [prizes, setPrizes] = useState([])
  const [levels, setLevels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadClientData()
    // eslint-disable-next-line
  }, [token])

  const loadClientData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Carica livelli configurati
      const { data: levelsData } = await supabase
        .from('customer_levels')
        .select('*')
        .eq('active', true)
        .order('sort_order')
      setLevels(levelsData || [])

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

      // Carica premi del livello cliente o inferiore
      const customerLevel = getCustomerLevel(customerData.points, levelsData || [])
      const availableLevels = (levelsData || [])
        .filter(level => level.sort_order <= customerLevel.sort_order)
        .map(level => level.name)
      const { data: prizesData } = await supabase
        .from('prizes')
        .select('*')
        .eq('active', true)
        .in('required_level', availableLevels)
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

  // Calcola livello e progressione
  const customerLevel = getCustomerLevel(customer.points, levels)
  const nextLevelInfo = getNextLevelInfo(customer.points, levels)

  return (
    <div
      className="client-portal"
      style={{
        background: customerLevel.background_gradient || '#fff', // CAMBIATO
        minHeight: '100vh',
        transition: 'background 0.5s'
      }}
    >
      {/* HEADER CLIENTE */}
      <div className="client-header">
        <img
          src="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png"
          alt="Sapori & Colori"
          className="client-logo"
        />
        <div className="client-info">
          <h1>Ciao {customer.name}! 👋</h1>
          <div className="client-level" style={{ backgroundColor: customerLevel.primary_color }}> {/* CAMBIATO */}
            <span className="level-icon">
              <div dangerouslySetInnerHTML={{ __html: customerLevel.icon_svg }} /> {/* CAMBIATO */}
            </span>
            <span>Cliente {customerLevel.name}</span> {/* CAMBIATO */}
          </div>
        </div>
      </div>

      {/* GEMME ATTUALI */}
      <div className="client-gems-card">
        <div className="gems-display">
          <div className="gems-icon">💎</div>
          <div className="gems-info">
            <h2>{customer.points}</h2>
            <p>GEMME Disponibili</p>
          </div>
        </div>
        <div className="gems-progress">
          <div
            className="progress-bar"
            title={`${Math.round(nextLevelInfo.progress)}% completato - ${customer.points}/${levels.find(l => l.name === nextLevelInfo.nextLevelName)?.min_gems || 150} GEMME`}
          >
            <div
              className="progress-fill"
              style={{
                width: `${nextLevelInfo.progress}%`,
                background: customerLevel.primary_color
              }}
            ></div>
          </div>
          {nextLevelInfo.hasNextLevel ? (
            <p>Prossimo livello ({nextLevelInfo.nextLevelName}): {nextLevelInfo.gemsNeeded} GEMME</p>
          ) : (
            <p>🏆 Hai raggiunto il livello massimo!</p>
          )}
        </div>
      </div>

      {/* PREMI DISPONIBILI */}
      <div className="client-section">
        <h3>🎁 Premi Disponibili per il tuo livello</h3>
        <div className="prizes-grid">
          {prizes.map(prize => {
            const prizeLevel = levels.find(l => l.name === prize.required_level)
            return (
              <div
                key={prize.id}
                className={`prize-card ${customer.points >= prize.points_cost ? 'available' : 'unavailable'}`}
              >
                {prize.image_url && (
                  <img src={prize.image_url} alt={prize.name} className="prize-image" />
                )}
                <div className="prize-info">
                  <div className="prize-header">
                    <h4>{prize.name}</h4>
                    {prizeLevel && (
                      <div
                        className="prize-level-badge"
                        style={{
                          backgroundColor: prizeLevel.primary_color,
                          color: 'white',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          borderRadius: 8,
                          padding: '2px 8px',
                          marginLeft: 8
                        }}
                      >
                        <span
                          className="prize-level-icon"
                          dangerouslySetInnerHTML={{ __html: prizeLevel.icon_svg }}
                        />
                        <span>{prizeLevel.name}</span>
                      </div>
                    )}
                  </div>
                  <p>{prize.description}</p>
                  <div className="prize-cost">
                    <span className="cost-gems">
                      <img
                        src="/gemma-rossa.png"
                        alt="gemma"
                        style={{ width: 22, height: 22, marginRight: 4, verticalAlign: 'middle', display: 'inline-block' }}
                      />
                      {prize.points_cost}
                    </span>
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
            )
          })}
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
          Via Bagaladi 7, 00132 Roma<br />
          Tel: 06 39911640<br />
        </p>
        <p className="footer-note">
          💡 Ricorda di portare il tuo badge fisico per accumulare punti e riscattare premi!
        </p>
      </div>
    </div>
  )
}

export default ClientPortal