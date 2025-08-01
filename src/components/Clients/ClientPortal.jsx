import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { getCustomerLevel, getNextLevelInfo } from '../../utils/levelsUtils'
import './ClientPortal.css'; // <-- 1. AGGIUNGI QUESTO IMPORT
import QRCodeGenerator from '../Common/QRCodeGenerator'
import { copyToClipboard } from '../../utils/clipboardUtils'

const ClientPortal = ({ token }) => {
  const [customer, setCustomer] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [prizes, setPrizes] = useState([])
  const [levels, setLevels] = useState([])
  const [coupons, setCoupons] = useState([]) // NUOVO STATO PER I COUPON
  const [subscriptions, setSubscriptions] = useState([]) // NUOVO STATO PER GLI ABBONAMENTI
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

        // Carica abbonamenti del cliente
        const { data: subscriptionsData } = await supabase
          .from('customer_subscriptions')
          .select(`
            *,
            subscription_plans!inner(*)
          `)
          .eq('customer_id', customerData.id)
          .in('status', ['active', 'expiring'])
          .order('created_at', { ascending: false })
        setSubscriptions(subscriptionsData || [])
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

  // Calcola giorni rimanenti per abbonamento
  const getDaysRemaining = (endDate) => {
    const now = new Date()
    const end = new Date(endDate)
    const diffTime = end - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  // Formatta valuta
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
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
                    foregroundColor={customerLevel.primary_color || "#8B4513"}
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
                  const today = new Date().setHours(0, 0, 0, 0);
                  const expiryDate = new Date(coupon.expiry_date).setHours(0, 0, 0, 0);
                  const daysToExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

                  // 🧪 TEST: Forza il primo coupon a essere "in scadenza oggi" per vedere l'animazione
                  const isFirstCoupon = coupons.indexOf(coupon) === 0;
                  const isExpiringToday = isFirstCoupon ? true : (daysToExpiry === 0);
                  const isExpiringSoon = isFirstCoupon ? true : (daysToExpiry > 0 && daysToExpiry <= 7);
                  
                  // Determina la classe CSS per l'animazione
                  let couponClass = 'coupon-card';
                  if (isExpiringToday || isExpiringSoon) {
                    couponClass += ' expiring-soon'; // Usa sempre expiring-soon per l'animazione della card
                  }
                  
                  return (
                    <div 
                      key={coupon.id} 
                      className={couponClass}
                      style={{ 
                        // Stili minimi che non interferiscono con l'animazione CSS
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
                          // Solo stili per coupon normali (non in scadenza)
                          ...(!(isExpiringToday || isExpiringSoon) && {
                            borderTop: '1px dashed #eee',
                            textAlign: 'center',
                            fontSize: '0.9em',
                            color: '#666',
                            paddingTop: '10px',
                            marginTop: '15px'
                          })
                        }}
                        ref={(el) => {
                          // � ANIMAZIONE SUPER VISIBILE
                          if (el && (isExpiringToday || isExpiringSoon)) {
                            console.log('🚀 ANIMAZIONE ATTIVATA');
                            
                            let state = 0; // 0 = primo colore, 1 = secondo colore
                            
                            const animateElement = () => {
                              if (isExpiringToday) {
                                // PER "SCADE OGGI" - Rosso/Bianco ultra contrastato
                                if (state === 0) {
                                  el.style.backgroundColor = '#DC2626'; // Rosso puro
                                  el.style.color = '#FFFFFF'; // Bianco puro
                                  el.style.boxShadow = '0 0 30px #DC2626, 0 0 50px #DC2626';
                                  el.style.transform = 'scale(1.15)';
                                  el.style.border = '4px solid #FFFFFF';
                                } else {
                                  el.style.backgroundColor = '#FFFFFF'; // Bianco puro
                                  el.style.color = '#DC2626'; // Rosso puro
                                  el.style.boxShadow = '0 0 30px #DC2626, 0 0 50px #DC2626';
                                  el.style.transform = 'scale(1.1)';
                                  el.style.border = '4px solid #DC2626';
                                }
                              } else {
                                // PER "SCADE TRA X GIORNI" - Arancione/Bianco ultra contrastato
                                if (state === 0) {
                                  el.style.backgroundColor = '#F97316'; // Arancione puro
                                  el.style.color = '#FFFFFF'; // Bianco puro
                                  el.style.boxShadow = '0 0 25px #F97316, 0 0 40px #F97316';
                                  el.style.transform = 'scale(1.12)';
                                  el.style.border = '3px solid #FFFFFF';
                                } else {
                                  el.style.backgroundColor = '#FFFFFF'; // Bianco puro
                                  el.style.color = '#F97316'; // Arancione puro
                                  el.style.boxShadow = '0 0 25px #F97316, 0 0 40px #F97316';
                                  el.style.transform = 'scale(1.08)';
                                  el.style.border = '3px solid #F97316';
                                }
                              }
                              
                              state = state === 0 ? 1 : 0;
                            };
                            
                            // Velocità più veloce per maggiore impatto
                            const speed = isExpiringToday ? 500 : 750; // Molto più veloce
                            
                            // Applica stili di base SENZA transizione per colori netti
                            el.style.borderRadius = '12px';
                            el.style.padding = '18px';
                            el.style.fontWeight = '900';
                            el.style.textAlign = 'center';
                            el.style.fontSize = '1.1em';
                            el.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
                            // NO transition = cambi immediati e netti!
                            
                            // Avvia animazione
                            animateElement(); // Prima esecuzione immediata
                            setInterval(animateElement, speed);
                          }
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

          {/* === SEZIONE ABBONAMENTI === */}
          {subscriptions.length > 0 && (
            <div className="client-section">
              <h3>🎯 I tuoi Abbonamenti</h3>
              <div className="subscriptions-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                gap: '20px' 
              }}>
                {subscriptions.map(subscription => {
                  const daysRemaining = getDaysRemaining(subscription.end_date)
                  const isExpiring = daysRemaining <= 3
                  const plan = subscription.subscription_plans

                  return (
                    <div 
                      key={subscription.id} 
                      className={`subscription-card ${isExpiring ? 'expiring' : ''}`}
                      style={{ 
                        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                        border: `2px solid ${isExpiring ? '#f59e0b' : '#8B4513'}`,
                        borderRadius: '12px',
                        padding: '20px',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Header */}
                      <div style={{
                        background: 'linear-gradient(135deg, #8B4513 0%, #D4AF37 100%)',
                        color: 'white',
                        padding: '12px',
                        margin: '-20px -20px 16px -20px',
                        borderRadius: '12px 12px 0 0',
                        textAlign: 'center'
                      }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>
                          {plan?.name || 'Abbonamento'}
                        </h4>
                        <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>
                          {plan?.description}
                        </p>
                      </div>

                      {/* Bollini Utilizzi */}
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          marginBottom: '8px' 
                        }}>
                          <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#8B4513' }}>
                            Utilizzi
                          </span>
                          <span style={{ fontSize: '12px', color: '#666' }}>
                            {subscription.remaining_usage}/{plan?.max_usage || 0} rimasti
                          </span>
                        </div>
                        
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: `repeat(${Math.min(plan?.max_usage || 0, 10)}, 1fr)`, 
                          gap: '4px',
                          maxWidth: '200px'
                        }}>
                          {Array.from({ length: plan?.max_usage || 0 }, (_, index) => {
                            const isUsed = index < (plan?.max_usage - subscription.remaining_usage)
                            return (
                              <div 
                                key={index}
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  background: isUsed 
                                    ? 'linear-gradient(135deg, #8B4513 0%, #D4AF37 100%)' 
                                    : '#e5e7eb',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '10px',
                                  color: 'white',
                                  fontWeight: 'bold'
                                }}
                              >
                                {isUsed ? '✓' : ''}
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Info Scadenza */}
                      <div style={{ 
                        background: isExpiring ? '#fef3c7' : '#f0f9ff',
                        border: `1px solid ${isExpiring ? '#f59e0b' : '#0ea5e9'}`,
                        borderRadius: '8px',
                        padding: '12px',
                        textAlign: 'center',
                        marginBottom: '12px'
                      }}>
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: 'bold',
                          color: isExpiring ? '#92400e' : '#0c4a6e',
                          marginBottom: '4px'
                        }}>
                          {isExpiring ? '⚠️ In scadenza!' : '✅ Attivo'}
                        </div>
                        <div style={{ 
                          fontSize: '12px',
                          color: isExpiring ? '#92400e' : '#0c4a6e'
                        }}>
                          {daysRemaining > 0 ? (
                            <>⏰ {daysRemaining} giorni rimanenti<br/>
                            Scade: {new Date(subscription.end_date).toLocaleDateString('it-IT')}</>
                          ) : (
                            '❌ Scaduto'
                          )}
                        </div>
                      </div>

                      {/* Valore */}
                      <div style={{ 
                        textAlign: 'center',
                        padding: '8px',
                        background: 'rgba(139, 69, 19, 0.1)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#8B4513'
                      }}>
                        <strong>Valore: {formatCurrency(subscription.total_amount_paid || 0)}</strong>
                      </div>

                      {/* Badge status */}
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: subscription.status === 'active' ? '#22c55e' : '#f59e0b',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                      }}>
                        {subscription.status === 'active' ? '✅ ATTIVO' : '⚠️ SCADENZA'}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Messaggio informativo */}
              <div style={{
                marginTop: '16px',
                padding: '12px',
                background: '#f0f9ff',
                border: '1px solid #0ea5e9',
                borderRadius: '8px',
                textAlign: 'center',
                fontSize: '14px',
                color: '#0c4a6e'
              }}>
                💡 <strong>I tuoi abbonamenti si aggiornano automaticamente</strong> ogni volta che vengono utilizzati in negozio
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
