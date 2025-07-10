import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { getCustomerLevel, getNextLevelInfo } from '../../utils/levelsUtils'
import QRCodeGenerator from '../Common/QRCodeGenerator'
import { copyToClipboard } from '../../utils/clipboardUtils'

const ClientPortal = ({ token }) => {
  const [customer, setCustomer] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [prizes, setPrizes] = useState([])
  const [levels, setLevels] = useState([])
  const [coupons, setCoupons] = useState([]) // NUOVO STATO PER I COUPON
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notification, setNotification] = useState({ show: false, message: '', type: '' })

  // Funzione per mostrare notifiche semplici
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  useEffect(() => {
    loadClientData()
    // eslint-disable-next-line
  }, [token])

  const loadClientData = async () => {
    setLoading(true)
    setError(null)
    
    if (!token) {
      setError('Token di accesso mancante')
      setLoading(false)
      return
    }
    
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
        console.error('Errore cliente:', customerError)
        setError('Cliente non trovato o link non valido')
        setLoading(false)
        return
      }
      
      setCustomer(customerData)

      // Solo se customerData esiste procedi con il resto
      if (customerData && customerData.id) {
        // Carica transazioni cliente (ultime 10)
        const { data: transactionsData } = await supabase
          .from('transactions')
          .select('*')
          .eq('customer_id', customerData.id)
          .order('created_at', { ascending: false })
          .limit(10)
        setTransactions(transactionsData || [])

        // Carica coupon del cliente
        const { data: couponsData } = await supabase
          .from('coupons')
          .select('*')
          .eq('customer_id', customerData.id)
          .eq('status', 'active')
          .gte('expiry_date', new Date().toISOString())
        setCoupons(couponsData || [])
      }

      // Carica premi del livello cliente o inferiore
      const customerLevel = getCustomerLevel(customerData.points, levelsData || [])
      const availableLevels = (levelsData || [])
        .filter(level => level.sort_order <= customerLevel.sort_order)
        .map(level => level.name)
      const { data: prizesData } = await supabase
        .from('prizes')
        .select('*')
        .eq('active', true)
        .order('points_cost')
      setPrizes(prizesData || [])

    } catch (err) {
      console.error('Errore caricamento:', err)
      setError('Errore nel caricamento dei dati')
    } finally {
      setLoading(false)
    }
  }

  // Funzione per la copia del codice referral
  const handleCopyReferralCode = () => {
    if (!customer?.referral_code) return;
    copyToClipboard(customer.referral_code, () => showNotification('✅ Codice Copiato!'));
  };

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

  const customerLevel = getCustomerLevel(customer.points, levels)
  const nextLevelInfo = getNextLevelInfo(customer.points, levels)

  return (
    <div
      className="client-portal"
      style={{
        background: customer && customerLevel ? (customerLevel.background_gradient || '#fff') : '#fff',
        minHeight: '100vh',
        transition: 'background 0.5s'
      }}
    >
      {notification.show && (
        <div className={`portal-notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Se il cliente non è stato caricato, mostra un errore */}
      {!customer ? (
        <div className="client-portal-error">
          <div className="error-icon">❌</div>
          <h2>Accesso non valido</h2>
          <p>{error || 'Token cliente non valido'}</p>
          <p>Contatta il negozio per assistenza.</p>
        </div>
      ) : (
        <>
          <div className="client-header">
            <img
              src="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png"
              alt="Sapori & Colori"
              className="client-logo"
            />
            <div className="client-info">
              <h1>Ciao {customer.name}! 👋</h1>
              <div className="client-level" style={{ backgroundColor: customerLevel.primary_color }}>
                <span className="level-icon">
                  <div dangerouslySetInnerHTML={{ __html: customerLevel.icon_svg }} />
                </span>
                <span>Cliente {customerLevel.name}</span>
              </div>
            </div>
          </div>

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
                title={`${Math.round(nextLevelInfo.progress)}% completato`}
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

          <div className="qr-recognition-section">
            <div className="qr-section-header">
              <h3 className="qr-recognition-title">📱 Il tuo QR Code di Riconoscimento</h3>
              <p className="qr-recognition-subtitle">
                Mostra questo codice in negozio per essere riconosciuto istantaneamente
              </p>
            </div>
            <div className="qr-central-container">
              <div className="qr-wrapper">
                <div className="qr-display-card">
                  <QRCodeGenerator
                    value={`CUSTOMER:${customer.id}`}
                    size={240}
                    backgroundColor="#ffffff"
                    foregroundColor={customerLevel.primary_color || "#2563eb"}
                    className="customer-qr-code"
                  />
                </div>
                <div className="qr-info-card">
                  <div className="qr-customer-info">
                    <h4>👤 {customer.name}</h4>
                    <p>ID Cliente: #{customer.id.substring(0,8)}</p>
                    <div className="qr-level-badge" style={{ backgroundColor: customerLevel.primary_color }}>
                      <span dangerouslySetInnerHTML={{ __html: customerLevel.icon_svg }} />
                      <span>{customerLevel.name}</span>
                    </div>
                  </div>
                  <div className="qr-instructions">
                    <div className="instruction-item">
                      <span className="step">1️⃣</span>
                      <span>Mostra il QR al personale</span>
                    </div>
                    <div className="instruction-item">
                      <span className="step">2️⃣</span>
                      <span>Verrai riconosciuto automaticamente</span>
                    </div>
                    <div className="instruction-item">
                      <span className="step">3️⃣</span>
                      <span>Accumula GEMME con i tuoi acquisti</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* === BOX REFERRAL MINIMALE === */}
          {customer?.referral_code && (
            <div className="client-section">
              <h3>💌 Invita un Amico, Guadagnate Entrambi!</h3>
              <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '0.9em', color: '#666' }}>
                Condividi il tuo codice personale. Il tuo amico riceverà <strong>5 GEMME</strong> di benvenuto e tu ne riceverai <strong>20</strong> dopo il suo primo acquisto!
              </p>
              <div className="referral-code-minimal" onClick={handleCopyReferralCode} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '15px 20px',
                borderRadius: '10px',
                border: '1px solid #ddd',
                backgroundColor: '#f9f9f9',
                maxWidth: '300px',
                margin: '0 auto'
              }}>
                <span style={{ fontSize: '2.2em', fontWeight: 'bold', color: '#333' }}>{customer.referral_code}</span>
                <img src="/refer-icon.png" alt="Referral Icon" style={{ width: '44px', height: '44px', marginLeft: '15px' }} />
              </div>
            </div>
          )}
          {/* =============================== */}

          {/* === SEZIONE COUPON (NUOVA) === */}
          {coupons.length > 0 && (
            <div className="client-section">
              <h3>🎁 I tuoi Coupon</h3>
              
              {/* Aggiungiamo un messaggio se ci sono più di 2 coupon */}
              {coupons.length > 2 && (
                <p style={{ 
                  textAlign: 'center', 
                  fontSize: '0.9em', 
                  color: '#666', 
                  marginBottom: '15px' 
                }}>
                  Mostrati i 2 coupon più recenti. Visita il negozio per visualizzare tutti i tuoi {coupons.length} coupon.
                </p>
              )}
              
              <div className="coupons-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                gap: '20px' 
              }}>
                {/* Limitiamo a 2 coupon con slice(0, 2) */}
                {coupons.slice(0, 2).map(coupon => {
                  // Calcola se è vicino alla scadenza (7 giorni)
                  const expiryDate = new Date(coupon.expiry_date);
                  const today = new Date();
                  const daysToExpiry = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));
                  const isExpiringSoon = daysToExpiry <= 7;
                  const isExpiringToday = daysToExpiry === 0;
                  
                  return (
                    <div 
                      key={coupon.id} 
                      className={`coupon-card ${isExpiringSoon ? 'expiring-soon' : ''}`}
                      style={{ 
                        border: isExpiringSoon ? '3px solid #DC2626' : '1px solid #eee', 
                        borderRadius: '12px', 
                        padding: '20px', 
                        backgroundColor: '#fff', 
                        boxShadow: isExpiringSoon ? '0 0 20px rgba(220, 38, 38, 0.3)' : '0 3px 10px rgba(0,0,0,0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        height: '100%'
                      }}
                    >
                      {/* Valore del coupon in evidenza */}
                      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                        <p style={{ 
                          fontSize: '2.2em', 
                          fontWeight: 'bold', 
                          color: '#E53E3E',
                          margin: '0'
                        }}>
                          {coupon.type === 'percentage' ? `${coupon.value}%` : `${coupon.value}€`}
                        </p>
                      </div>
                      
                      {/* Descrizione */}
                      <h4 style={{ 
                        color: '#333', 
                        marginBottom: '15px',
                        textAlign: 'center',
                        fontSize: '1.1em'
                      }}>
                        {coupon.description}
                      </h4>
                      
                      {/* Data di scadenza con animazione SUPER APPARISCENTE */}
                      <p 
                        className={
                          isExpiringToday ? "coupon-expiry-today" : 
                          isExpiringSoon ? "coupon-expiry-soon" : ""
                        }
                        style={{ 
                          textAlign: 'center',
                          fontSize: isExpiringSoon ? '1em' : '0.9em', 
                          color: isExpiringSoon ? '#E53E3E' : '#666',
                          marginTop: 'auto',
                          padding: isExpiringSoon ? '8px' : '8px',
                          borderTop: '1px dashed #eee'
                        }}
                      >
                        {isExpiringToday ? 
                          "⚠️ SCADE OGGI! ⚠️" :
                          isExpiringSoon && daysToExpiry > 0 ? 
                            `⏰ SCADE TRA ${daysToExpiry} GIORNI! ⏰` :
                            `Scade il: ${new Date(coupon.expiry_date).toLocaleDateString('it-IT')}`
                        }
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* =============================== */}

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

          <div className="client-footer">
            <p>
              <strong>Sapori & Colori</strong><br />
              Via Bagaladi 7, 00132 Roma<br />
              Tel: 06 39911640<br />
            </p>
            <p className="footer-note">
              💡 Non lasciare a casa la tua tessera fedeltà: è il tuo biglietto d'oro per raccogliere punti e conquistare i nostri premi più golosi! 🏆🥖
            </p>
          </div>
        </>
      )}
    </div>
  )
}

export default ClientPortal
