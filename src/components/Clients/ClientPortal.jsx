import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { getCustomerLevel, getNextLevelInfo } from '../../utils/levelsUtils'
import './ClientPortal.css'; // <-- 1. AGGIUNGI QUESTO IMPORT
import QRCodeGenerator from '../Common/QRCodeGenerator'
import { copyToClipboard } from '../../utils/clipboardUtils'
import oneSignalService from '../../services/onesignalService'
import MobileNavigation from './MobileNavigation'
import QRModal from './QRModal'
import ImageUpload from '../Common/ImageUpload'

const ClientPortal = ({ token }) => {
  const [loginStep, setLoginStep] = useState('welcome') // 'welcome', 'login', 'loading'
  const [loginInput, setLoginInput] = useState('')
  const [loginError, setLoginError] = useState('')
  
  // Stati per referral
  const [referredFriends, setReferredFriends] = useState([])
  const [referralLoading, setReferralLoading] = useState(false)

  // Funzioni referral
  const loadReferredFriends = async (customerId) => {
    if (!customerId) return
    
    setReferralLoading(true)
    try {
      console.log('🔍 Caricamento referral per cliente:', customerId)
      
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          *,
          referred:customers!referrals_referred_id_fkey(name, created_at, points)
        `)
        .eq('referrer_id', customerId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Errore caricamento referral:', error)
        return
      }

      console.log('📊 Referral trovati:', data?.length || 0)
      setReferredFriends(data || [])
    } catch (error) {
      console.error('❌ Errore caricamento referral:', error)
    } finally {
      setReferralLoading(false)
    }
  }

  // Funzioni di calcolo livelli referral
  const getReferralLevel = (count) => {
    if (count >= 20) return "🏆 Master"
    if (count >= 10) return "🥇 Expert"
    if (count >= 5) return "🥈 Advanced"
    return "🥉 Starter"
  }

  const getReferralPoints = (count) => {
    if (count >= 20) return 50
    if (count >= 10) return 35
    if (count >= 5) return 25
    return 20
  }

  const getReferralLevelInfo = (count) => {
    const level = count >= 20 ? 4 : count >= 10 ? 3 : count >= 5 ? 2 : 1
    const points = getReferralPoints(count)
    const bonusPercent = count >= 20 ? 50 : count >= 10 ? 25 : count >= 5 ? 15 : 0
    const isBonus = bonusPercent > 0
    
    return { level, points, bonusPercent, isBonus }
  }

  // Funzione per accesso cliente tramite email/telefono
  const handleClientLogin = async () => {
    if (!loginInput.trim()) {
      setLoginError('Inserisci email o telefono')
      return
    }

    setLoginStep('loading')
    setLoginError('')

    try {
      // Normalizza input (rimuovi spazi e converti minuscolo per email)
      const normalizedInput = loginInput.trim().toLowerCase()
      
      // Prima prova con email
      let { data: customerData, error } = await supabase
        .from('customers')
        .select('*')
        .eq('email', normalizedInput)
        .eq('is_active', true)
        .single()

      // Se non trovato con email, prova con telefono
      if (error || !customerData) {
        const phoneResult = await supabase
          .from('customers')
          .select('*')
          .eq('phone', loginInput.trim())
          .eq('is_active', true)
          .single()
        
        customerData = phoneResult.data
        error = phoneResult.error
      }

      if (error || !customerData) {
        setLoginError('Cliente non trovato. Verifica email o telefono.')
        setLoginStep('login')
        return
      }

      // Salva cliente in localStorage per sessioni future
      localStorage.setItem('pwa_customer_id', customerData.id)
      localStorage.setItem('pwa_customer_data', JSON.stringify(customerData))
      
      // 🔔 COLLEGAMENTO ONESIGNAL: Listener per cambio permessi
      console.log('🔔 Login completato, impostando listener OneSignal...')
      
      // Funzione per tentare collegamento
      const tryConnectOneSignal = async () => {
        try {
          if (window.OneSignal && customerData && customerData.id) {
            const permission = await window.OneSignal.Notifications.permission
            console.log('🔔 Tentativo collegamento, permesso attuale:', permission)
            
            if (permission === 'granted' || permission === true) {
              console.log('✅ Cliente ha accettato notifiche, collegamento OneSignal SDK v16:', customerData.id)
              
              // FINALMENTE CORRETTO: In SDK v16 si usa OneSignal.login() (non User.login()!)
              await window.OneSignal.login(customerData.id)
              console.log('✅ Cliente collegato a OneSignal v16 con OneSignal.login():', customerData.id)
              console.log('✅ External ID settato:', window.OneSignal.User.externalId)
              
              // Salva External ID nel database per il matching bidirezionale
              try {
                const { error: updateError } = await supabase
                  .from('customers')
                  .update({ external_id: customerData.id })
                  .eq('id', customerData.id)
                
                if (updateError) {
                  console.error('❌ Errore salvataggio External ID:', updateError)
                } else {
                  console.log('✅ External ID salvato nel database:', customerData.id)
                }
              } catch (dbError) {
                console.error('❌ Errore database External ID:', dbError)
              }
              
              // OneSignal AI conferma: no delays needed, addTags() subito dopo login()
              try {
                const tags = {
                  customer_name: String(customerData.name || ''),
                  customer_points: String(customerData.points || 0)
                }
                console.log('🏷️ Aggiunta tag (valori string):', tags)
                console.log('🏷️ Tipo customer_name:', typeof tags.customer_name)
                console.log('🏷️ Tipo customer_points:', typeof tags.customer_points)
                
                window.OneSignal.User.addTags(tags) // NO await - come da documentazione
                console.log('✅ addTags() chiamato - SDK gestisce internamente')
                
                // Verifica dopo un momento
                setTimeout(async () => {
                  try {
                    const currentTags = await window.OneSignal.User.getTags()
                    console.log('🔍 Tag verificati dopo 2 sec:', currentTags)
                  } catch (e) {
                    console.log('🔍 Errore getTags():', e)
                  }
                }, 2000)
                
              } catch (tagError) {
                console.error('❌ ERRORE TAG:', tagError)
              }
              
              return true // Collegamento riuscito
            }
          }
        } catch (error) {
          console.error('❌ Errore collegamento OneSignal:', error)
        }
        return false // Collegamento fallito
      }
      
      // Prova subito
      const immediateResult = await tryConnectOneSignal()
      
      // Se non è riuscito subito, prova ogni 2 secondi per max 10 volte
      if (!immediateResult) {
        console.log('🔔 Collegamento immediato fallito, attivando retry...')
        let attempts = 0
        const maxAttempts = 10
        
        const retryInterval = setInterval(async () => {
          attempts++
          console.log(`🔔 Retry collegamento OneSignal (${attempts}/${maxAttempts})...`)
          
          const success = await tryConnectOneSignal()
          
          if (success || attempts >= maxAttempts) {
            clearInterval(retryInterval)
            if (!success) {
              console.log('📵 Collegamento OneSignal fallito dopo tutti i tentativi')
            }
          }
        }, 2000) // Ogni 2 secondi
      }
      
      // Invece di reload, imposta il login step per aggiornare l'UI
      setLoginStep('welcome')
      // Il componente si aggiornerà automaticamente quando rileva customerData in localStorage

    } catch (err) {
      console.error('Errore login cliente:', err)
      setLoginError('Errore durante l\'accesso. Riprova.')
      setLoginStep('login')
    }
  }

  // Gestione PWA senza token
  if (token === 'PWA_NO_TOKEN') {
    // Controlla se cliente già salvato in localStorage
    const savedCustomerId = localStorage.getItem('pwa_customer_id')
    const savedCustomerData = localStorage.getItem('pwa_customer_data')
    
    if (savedCustomerId && savedCustomerData) {
      // Cliente già loggato, mostra direttamente il portale
      try {
        const customerData = JSON.parse(savedCustomerData)
        // Simula un token usando i dati salvati
        // Usa il componente esistente ma con dati da localStorage
        return <ClientPortalFromStorage customerData={customerData} />
      } catch (e) {
        // Se ci sono errori nel parsing, pulisci e mostra login
        localStorage.removeItem('pwa_customer_id')
        localStorage.removeItem('pwa_customer_data')
      }
    }

    // Mostra welcome o form login
    return (
      <div className="client-portal" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #8B4513 0%, #D4AF37 100%)' }}>
        <div style={{ textAlign: 'center', color: 'white', padding: '40px', borderRadius: '20px', background: 'rgba(0,0,0,0.3)', maxWidth: '400px', width: '90%' }}>
          <img
            src="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png"
            alt="Sapori & Colori"
            style={{ width: '120px', marginBottom: '20px' }}
          />
          
          {loginStep === 'welcome' && (
            <>
              <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>Benvenuto nella Fidelity App!</h1>
              <p style={{ fontSize: '16px', marginBottom: '30px', lineHeight: '1.5' }}>
                La tua app per gestire punti,<br/>
                abbonamenti e premi del forno gastronomico<br/>
                <strong>Sapori & Colori</strong>
              </p>
              <div style={{ fontSize: '48px', marginBottom: '30px' }}>📱✨</div>
              <button
                onClick={() => setLoginStep('login')}
                style={{
                  background: 'linear-gradient(135deg, #D4AF37 0%, #FFD700 100%)',
                  color: '#8B4513',
                  border: 'none',
                  padding: '15px 30px',
                  borderRadius: '25px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(212, 175, 55, 0.4)',
                  transition: 'transform 0.2s'
                }}
                onMouseDown={(e) => e.target.style.transform = 'scale(0.95)'}
                onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                🚀 Accedi al tuo Portale
              </button>
            </>
          )}

          {loginStep === 'login' && (
            <>
              <h2 style={{ fontSize: '22px', marginBottom: '20px' }}>Accedi al tuo Portale</h2>
              <p style={{ fontSize: '14px', marginBottom: '25px', opacity: '0.9' }}>
                Inserisci la tua email o numero di telefono<br/>
                per accedere ai tuoi punti e premi
              </p>
              
              <input
                type="text"
                placeholder="Email o Telefono"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleClientLogin()}
                style={{
                  width: '100%',
                  padding: '15px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '16px',
                  marginBottom: '20px',
                  textAlign: 'center',
                  outline: 'none'
                }}
              />
              
              {loginError && (
                <p style={{ color: '#ffcccb', fontSize: '14px', marginBottom: '20px' }}>
                  ⚠️ {loginError}
                </p>
              )}
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  onClick={() => setLoginStep('welcome')}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    padding: '12px 20px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  ← Indietro
                </button>
                <button
                  onClick={handleClientLogin}
                  style={{
                    background: 'linear-gradient(135deg, #D4AF37 0%, #FFD700 100%)',
                    color: '#8B4513',
                    border: 'none',
                    padding: '12px 25px',
                    borderRadius: '20px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  🔑 Accedi
                </button>
              </div>
            </>
          )}

          {loginStep === 'loading' && (
            <>
              <h2 style={{ fontSize: '22px', marginBottom: '20px' }}>Accesso in corso...</h2>
              <div style={{ fontSize: '40px', marginBottom: '20px' }}>⏳</div>
              <p style={{ fontSize: '14px', opacity: '0.9' }}>
                Stiamo verificando i tuoi dati...
              </p>
            </>
          )}
        </div>
      </div>
    )
  }
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

  // 💎 CONTROLLO EVENTI PIOGGIA GEMME dal gestionale
  const checkGemmeEvents = async () => {
    if (!customer?.id) return;
    
    try {
      // Cerca eventi non processati per questo cliente
      const { data: events, error } = await supabase
        .from('gemme_events')
        .select('*')
        .eq('customer_id', customer.id)
        .eq('is_processed', false)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Errore controllo eventi gemme:', error);
        return;
      }

      if (events && events.length > 0) {
        // Processo tutti gli eventi non processati
        for (const event of events) {
          console.log(`💎 Evento gemme trovato: +${event.points_earned} GEMME`);
          
          // 🎆 EFFETTO SPETTACOLARE con SUONO
          createSpectacularGemmeEffect(event.points_earned);
          
          // Marca l'evento come processato
          await supabase
            .from('gemme_events')
            .update({ is_processed: true })
            .eq('id', event.id);
          
          // Ricarica i dati del cliente per aggiornare i punti
          loadClientData();
          
          // Mostra notifica
          showNotification(`🎉 Hai guadagnato ${event.points_earned} GEMME da un acquisto di €${event.transaction_amount}!`, 'success');
          
          // Pausa tra eventi multipli
          if (events.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    } catch (error) {
      console.error('❌ Errore durante controllo eventi gemme:', error);
    }
  };

  // 💥 EFFETTO ESPLOSIONE GEMME SPETTACOLARE
  const createSpectacularGemmeEffect = (pointsEarned) => {
    console.log(`💥 Creando ESPLOSIONE spettacolare per +${pointsEarned} GEMME`);
    
    // SUONO (stesso del gestionale)
    try {
      const gemmeSound = new Audio('/sounds/coin.wav');
      gemmeSound.volume = 0.8;
      gemmeSound.play().catch(() => {}); // Fail silently se audio bloccato
    } catch (error) {
      // Fail silently
    }
    
    // CSS per effetto ESPLOSIONE
    const style = document.createElement('style');
    style.id = 'spectacular-gemme-style';
    style.innerHTML = `
      .spectacular-explosion {
        pointer-events: none; position: fixed;
        top: 0; left: 0; width: 100vw; height: 100vh;
        z-index: 9999; overflow: hidden;
        background: radial-gradient(circle at 50% 50%, rgba(220,38,38,0.4) 0%, rgba(212,175,55,0.3) 30%, transparent 70%);
        animation: explosionFlash 3s ease-out;
      }
      @keyframes explosionFlash { 
        0% { opacity: 0; background-color: rgba(255,215,0,0.8); } 
        5% { opacity: 1; background-color: rgba(255,255,255,0.9); }
        15% { opacity: 0.8; background-color: rgba(220,38,38,0.6); }
        100% { opacity: 0; background-color: transparent; } 
      }
      .explosion-gem {
        position: absolute; width: 60px; height: 60px;
        animation-fill-mode: forwards; user-select: none;
        filter: drop-shadow(0 0 20px #dc2626) brightness(1.6) saturate(2) contrast(1.3);
        z-index: 10001;
      }
      @keyframes explosionBlast {
        0% { 
          transform: scale(0.1) rotate(0deg); 
          opacity: 1; 
        }
        15% { 
          transform: scale(1.8) rotate(180deg); 
          opacity: 1; 
        }
        100% { 
          opacity: 0.2; 
          transform: scale(0.4) rotate(720deg); 
        }
      }
      .mega-burst {
        position: absolute; top: 50%; left: 50%; 
        width: 300px; height: 300px;
        margin: -150px 0 0 -150px; border-radius: 50%;
        background: radial-gradient(circle, 
          rgba(255,255,255,1) 0%, 
          rgba(255,215,0,0.9) 20%, 
          rgba(220,38,38,0.8) 40%, 
          rgba(212,175,55,0.6) 60%, 
          transparent 100%);
        animation: megaExplosion 1.5s ease-out;
        z-index: 10000;
      }
      @keyframes megaExplosion {
        0% { 
          transform: scale(0); 
          opacity: 1; 
          filter: brightness(2) blur(0px);
        }
        30% { 
          transform: scale(1.2); 
          opacity: 1; 
          filter: brightness(1.8) blur(2px);
        }
        70% { 
          transform: scale(2.5); 
          opacity: 0.7; 
          filter: brightness(1.4) blur(4px);
        }
        100% { 
          transform: scale(4); 
          opacity: 0; 
          filter: brightness(1) blur(8px);
        }
      }
      .screen-shake {
        animation: screenShake 0.8s ease-in-out;
      }
      @keyframes screenShake {
        0%, 100% { transform: translateX(0) translateY(0); }
        10% { transform: translateX(-10px) translateY(-5px); }
        20% { transform: translateX(10px) translateY(5px); }
        30% { transform: translateX(-8px) translateY(-3px); }
        40% { transform: translateX(8px) translateY(3px); }
        50% { transform: translateX(-6px) translateY(-2px); }
        60% { transform: translateX(6px) translateY(2px); }
        70% { transform: translateX(-4px) translateY(-1px); }
        80% { transform: translateX(4px) translateY(1px); }
        90% { transform: translateX(-2px) translateY(-1px); }
      }
    `;
    document.head.appendChild(style);
    
    // SHAKE dello schermo
    document.body.classList.add('screen-shake');
    setTimeout(() => {
      document.body.classList.remove('screen-shake');
    }, 800);
    
    // Container effetto
    const explosion = document.createElement('div');
    explosion.className = 'spectacular-explosion';
    explosion.id = 'spectacular-gemme-container';
    document.body.appendChild(explosion);
    
    // MEGA ESPLOSIONE centrale
    setTimeout(() => {
      const megaBurst = document.createElement('div');
      megaBurst.className = 'mega-burst';
      explosion.appendChild(megaBurst);
    }, 50);
    
    // ESPLOSIONE RADIALE di gemme (come fuochi d'artificio)
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const gemCount = Math.min(Math.max(pointsEarned * 2, 25), 60); // Più gemme!
    
    for (let i = 0; i < gemCount; i++) {
      setTimeout(() => {
        const gem = document.createElement('img');
        gem.src = '/gemma-rossa.png';
        gem.alt = 'gemma';
        gem.className = 'explosion-gem';
        
        // Posizione centrale di partenza
        gem.style.left = centerX - 30 + 'px';
        gem.style.top = centerY - 30 + 'px';
        
        // Direzione casuale dell'esplosione
        const angle = (360 / gemCount) * i + Math.random() * 30;
        const distance = 200 + Math.random() * 400;
        const finalX = centerX + Math.cos(angle * Math.PI / 180) * distance;
        const finalY = centerY + Math.sin(angle * Math.PI / 180) * distance;
        
        // Animazione esplosiva
        const duration = 1.5 + Math.random() * 1.5;
        gem.style.animation = `explosionBlast ${duration}s ease-out forwards`;
        
        explosion.appendChild(gem);
        
        // Animazione verso la posizione finale
        setTimeout(() => {
          gem.style.transition = `all ${duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
          gem.style.left = finalX - 30 + 'px';
          gem.style.top = finalY - 30 + 'px';
        }, 100);
        
      }, i * 20); // Intervallo più veloce per effetto esplosivo
    }
    
    // Cleanup dopo 4 secondi
    setTimeout(() => {
      const container = document.getElementById('spectacular-gemme-container');
      const styleEl = document.getElementById('spectacular-gemme-style');
      if (container) document.body.removeChild(container);
      if (styleEl) document.head.removeChild(styleEl);
      console.log('💥 Esplosione spettacolare completata!');
    }, 4000);
  };

  useEffect(() => {
    loadClientData()
    // eslint-disable-next-line
  }, [token])

  // ✅ POLLING RIMOSSO - usa solo quello nella sezione PWA (più sicuro)

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
        // Carica referral del cliente
        await loadReferredFriends(customerData.id)
        
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

      // Carica TUTTI i premi (per tutti i livelli)
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
  const handleCopyReferralCode = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!customer?.referral_code) {
      showNotification('⚠️ Nessun codice referral disponibile', 'warning');
      return;
    }
    
    try {
      await copyToClipboard(customer.referral_code, () => showNotification('✅ Codice Copiato!'));
    } catch (error) {
      console.error('❌ Errore copia referral:', error);
      showNotification('❌ Errore durante la copia', 'error');
    }
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
              <div className="gems-icon">
                <img 
                  src="/gemma-rossa.png" 
                  alt="Gemme" 
                  style={{ 
                    width: '40px', 
                    height: '40px',
                    filter: 'drop-shadow(0 2px 8px rgba(220, 38, 38, 0.4))'
                  }}
                />
              </div>
              <div className="gems-info">
                <h2>{customer.points}</h2>
                <p>GEMME Disponibili</p>
              </div>
            </div>
            <div className="gems-progress">
              <div
                className="level-progress-bar"
                title={`${Math.round(nextLevelInfo.progress)}% completato`}
              >
                <div
                  className="level-progress-fill"
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

          {/* === SEZIONE WALLET === */}
          {customer?.wallet_balance && customer.wallet_balance > 0 && (
            <div className="client-section">
              <h3>💳 Il tuo Wallet</h3>
              <div style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                borderRadius: '15px',
                padding: '25px',
                textAlign: 'center',
                color: 'white',
                boxShadow: '0 8px 25px rgba(16, 185, 129, 0.3)',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '2.5em', marginBottom: '10px' }}>💰</div>
                <div style={{ fontSize: '2.2em', fontWeight: 'bold', marginBottom: '8px' }}>
                  {formatCurrency(customer.wallet_balance)}
                </div>
                <div style={{ fontSize: '1.1em', opacity: 0.9 }}>
                  Credito Disponibile
                </div>
                <div style={{ 
                  fontSize: '0.9em', 
                  opacity: 0.8, 
                  marginTop: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  padding: '8px 15px',
                  borderRadius: '20px',
                  display: 'inline-block'
                }}>
                  💡 Utilizzalo per i tuoi acquisti in negozio
                </div>
              </div>
            </div>
          )}

          {/* === BOX REFERRAL MINIMALE === */}
          {customer?.referral_code && (
            <div className="client-section">
              <h3>👥 Sistema Referral</h3>
              
              {/* Progresso referral */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em', color: '#666', marginBottom: '8px' }}>
                  <span>Prossimo bonus a {Math.ceil((referredFriends.length) / 5) * 5} inviti</span>
                  <span style={{ fontWeight: 'bold', color: '#8B4513' }}>{referredFriends.length}/5</span>
                </div>
                <div style={{ width: '100%', height: '12px', backgroundColor: '#e0e0e0', borderRadius: '6px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      background: 'linear-gradient(to right, #8B4513, #D4AF37)',
                      width: `${((referredFriends.length % 5) * 20)}%`,
                      transition: 'width 0.5s ease'
                    }}
                  ></div>
                </div>
              </div>

              {/* Statistiche referral */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '20px' }}>
                <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '10px' }}>
                  <div style={{ fontSize: '1.5em', marginBottom: '5px' }}>👥</div>
                  <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#8B4513' }}>{referredFriends.length}</div>
                  <div style={{ fontSize: '0.8em', color: '#666' }}>Amici Invitati</div>
                </div>
                <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#ffe6e6', borderRadius: '10px' }}>
                  <div style={{ fontSize: '1.5em', marginBottom: '5px' }}>💎</div>
                  <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#d32f2f' }}>{referredFriends.length * getReferralPoints(referredFriends.length)}</div>
                  <div style={{ fontSize: '0.8em', color: '#666' }}>GEMME Guadagnate</div>
                </div>
                <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f0f8ff', borderRadius: '10px' }}>
                  <div style={{ fontSize: '1.5em', marginBottom: '5px' }}>🎯</div>
                  <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#8B4513' }}>{getReferralLevel(referredFriends.length)}</div>
                  <div style={{ fontSize: '0.8em', color: '#666' }}>Livello</div>
                </div>
              </div>

              {/* Codice referral */}
              <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '10px', border: '2px solid #8B4513' }}>
                <div style={{ fontSize: '0.9em', fontWeight: '600', color: '#666', marginBottom: '10px', textAlign: 'center' }}>
                  Il tuo codice referral
                </div>
                <div 
                  className="referral-code-minimal" 
                  onClick={handleCopyReferralCode} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '15px 20px',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #ddd',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <span style={{ fontSize: '2.2em', fontWeight: 'bold', color: '#333', letterSpacing: '2px' }}>
                    {customer.referral_code}
                  </span>
                  <svg style={{ width: '24px', height: '24px', marginLeft: '15px', color: '#8B4513' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div style={{ fontSize: '0.8em', color: '#666', textAlign: 'center', marginTop: '5px' }}>
                  Clicca per copiare negli appunti
                </div>
              </div>

              {/* Lista amici invitati */}
              {referralLoading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{ fontSize: '1.2em' }}>⏳ Caricamento referral...</div>
                </div>
              ) : referredFriends.length > 0 ? (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontWeight: '600', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg style={{ width: '20px', height: '20px', color: '#8B4513' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    Amici che hai invitato ({referredFriends.length})
                  </h4>
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {referredFriends.map((referral, index) => (
                      <div key={referral.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 15px', backgroundColor: '#f8f9fa', borderRadius: '8px', marginBottom: '8px', border: '1px solid #e0e0e0' }}>
                        <div>
                          <div style={{ fontWeight: '600', color: '#333' }}>
                            {referral.referred?.name || 'Nome non disponibile'}
                          </div>
                          <div style={{ fontSize: '0.8em', color: '#666' }}>
                            Registrato il {new Date(referral.created_at).toLocaleDateString('it-IT')}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ padding: '4px 8px', backgroundColor: referral.status === 'completed' ? '#d4edda' : '#fff3cd', color: referral.status === 'completed' ? '#155724' : '#856404', borderRadius: '12px', fontSize: '0.75em', fontWeight: '600' }}>
                            {referral.status === 'completed' ? '✅ Completato' : '⏳ In attesa'}
                          </span>
                          {referral.status === 'completed' && (
                            <span style={{ fontSize: '0.8em', fontWeight: 'bold', color: '#d32f2f' }}>
                              +{getReferralPoints(index)} 💎
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '10px', border: '2px dashed #ddd' }}>
                  <div style={{ fontSize: '1.2em', marginBottom: '10px' }}>🎯</div>
                  <h4 style={{ fontWeight: '600', marginBottom: '10px' }}>Inizia a invitare amici!</h4>
                  <p style={{ fontSize: '0.9em', color: '#666', lineHeight: '1.4' }}>
                    Condividi il tuo codice referral per guadagnare gemme extra. 
                    I tuoi amici riceveranno <strong>10 gemme</strong> di benvenuto e tu ne guadagnerai <strong>{getReferralPoints(0)}</strong> al loro primo acquisto!
                  </p>
                </div>
              )}

              {/* Bottoni condivisione */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '20px' }}>
                <button 
                  onClick={() => {
                    const message = `🎉 Ciao! Ti invito a scoprire il fantastico programma fedeltà di Sapori e Colori! Con il mio codice referral ${customer.referral_code} riceverai subito 10 GEMME gratuite! 💎\n\nRegistrati qui: ${window.location.origin}/portal?ref=${customer.referral_code}\n\nPiù acquisti, più gemme accumuli, più premi ottieni! 🎁`
                    const url = `https://wa.me/?text=${encodeURIComponent(message)}`
                    window.open(url, '_blank')
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 16px',
                    backgroundColor: '#25d366',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.9em',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background-color 0.3s ease'
                  }}
                >
                  📱 WhatsApp
                </button>
                <button 
                  onClick={async () => {
                    const shareLink = `${window.location.origin}/portal?ref=${customer.referral_code}`
                    await copyToClipboard(shareLink, () => showNotification('🔗 Link copiato negli appunti!'))
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 16px',
                    backgroundColor: '#8B4513',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.9em',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background-color 0.3s ease'
                  }}
                >
                  🔗 Copia Link
                </button>
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
                            Utilizzi Abbonamento
                          </span>
                          <span style={{ fontSize: '12px', color: '#666' }}>
                            {(plan?.max_usage || 0) - (subscription.remaining_usage || 0)}/{plan?.max_usage || 0} utilizzati
                          </span>
                        </div>
                        
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: `repeat(${Math.min(plan?.max_usage || 0, 10)}, 1fr)`, 
                          gap: '4px',
                          maxWidth: '200px'
                        }}>
                          {Array.from({ length: plan?.max_usage || 0 }, (_, index) => {
                            // Calcolo corretto: i primi X bollini sono utilizzati
                            const usedCount = (plan?.max_usage || 0) - (subscription.remaining_usage || 0)
                            const isUsed = index < usedCount
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
                                {isUsed ? '✓' : index + 1}
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
            <h3>🎁 Tutti i Premi Disponibili</h3>
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

// Componente per gestire clienti salvati in localStorage  
const ClientPortalFromStorage = ({ customerData }) => {
  const [customer, setCustomer] = useState(customerData)
  const [transactions, setTransactions] = useState([])
  const [prizes, setPrizes] = useState([])
  const [levels, setLevels] = useState([])
  const [coupons, setCoupons] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notification, setNotification] = useState({ show: false, message: '', type: '' })
  
  // Mobile Navigation States
  const [activeSection, setActiveSection] = useState('home')
  const [showQRModal, setShowQRModal] = useState(false)
  
  // Impostazioni audio
  const [audioEnabled, setAudioEnabled] = useState(() => {
    const saved = localStorage.getItem('pwa_audio_enabled');
    return saved !== null ? JSON.parse(saved) : true; // Default true
  })

  // Stati per referral (mancavano nel ClientPortalFromStorage!)
  const [referredFriends, setReferredFriends] = useState([])
  const [referralLoading, setReferralLoading] = useState(false)

  // Funzioni referral (copiate dal componente principale)
  const loadReferredFriends = async (customerId) => {
    if (!customerId) return
    
    setReferralLoading(true)
    try {
      console.log('🔍 Caricamento referral per cliente:', customerId)
      
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          *,
          referred:customers!referrals_referred_id_fkey(name, created_at, points)
        `)
        .eq('referrer_id', customerId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Errore caricamento referral:', error)
        return
      }

      console.log('📊 Referral trovati:', data?.length || 0)
      setReferredFriends(data || [])
    } catch (error) {
      console.error('❌ Errore caricamento referral:', error)
    } finally {
      setReferralLoading(false)
    }
  }

  const getReferralLevel = (count) => {
    if (count >= 20) return 'GOLD'
    if (count >= 10) return 'SILVER' 
    if (count >= 5) return 'BRONZE'
    return 'NOVICE'
  }

  const getReferralPoints = (count) => {
    const level = getReferralLevel(count)
    switch(level) {
      case 'GOLD': return 10
      case 'SILVER': return 8
      case 'BRONZE': return 5
      default: return 3
    }
  }

  // Funzione per mostrare notifiche semplici
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  // 💎 CONTROLLO EVENTI PIOGGIA GEMME dal gestionale
  const checkGemmeEvents = async () => {
    if (!customer?.id) return;
    
    try {
      // Cerca eventi non processati per questo cliente
      const { data: events, error } = await supabase
        .from('gemme_events')
        .select('*')
        .eq('customer_id', customer.id)
        .eq('is_processed', false)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Errore controllo eventi gemme:', error);
        return;
      }

      if (events && events.length > 0) {
        // Processo tutti gli eventi non processati
        for (const event of events) {
          console.log(`💎 Evento gemme trovato: +${event.points_earned} GEMME`);
          
          // 🎆 EFFETTO SPETTACOLARE con SUONO
          createSpectacularGemmeEffect(event.points_earned);
          
          // Marca l'evento come processato
          await supabase
            .from('gemme_events')
            .update({ is_processed: true })
            .eq('id', event.id);
          
          // Ricarica i dati del cliente per aggiornare i punti
          loadClientData();
          
          // Mostra notifica
          showNotification(`🎉 Hai guadagnato ${event.points_earned} GEMME da un acquisto di €${event.transaction_amount}!`, 'success');
          
          // Pausa tra eventi multipli
          if (events.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    } catch (error) {
      console.error('❌ Errore durante controllo eventi gemme:', error);
    }
  };

  // 💥 EFFETTO ESPLOSIONE GEMME SPETTACOLARE - PWA
  const createSpectacularGemmeEffect = (pointsEarned) => {
    console.log(`💥 PWA - Creando ESPLOSIONE spettacolare per +${pointsEarned} GEMME`);
    
    // SUONO solo se abilitato nelle impostazioni E sbloccato (importante per iOS)
    if (audioEnabled) {
      try {
        const gemmeSound = new Audio('/sounds/coin.wav');
        gemmeSound.volume = 0.8;
        
        // Controlla se l'audio è stato sbloccato dall'utente (iOS/Safari)
        const isAudioUnlocked = sessionStorage.getItem('audio_unlocked') === 'true';
        
        if (isAudioUnlocked) {
          gemmeSound.play().catch(() => {}); // Fail silently se audio bloccato
        } else {
          console.log('🍎 Audio non ancora sbloccato - vai su Impostazioni e attiva l\'audio');
        }
      } catch (error) {
        // Fail silently
      }
    }
    
    // CSS per effetto ESPLOSIONE
    const style = document.createElement('style');
    style.id = 'spectacular-gemme-style';
    style.innerHTML = `
      .spectacular-explosion {
        pointer-events: none; position: fixed;
        top: 0; left: 0; width: 100vw; height: 100vh;
        z-index: 9999; overflow: hidden;
        background: radial-gradient(circle at 50% 50%, rgba(220,38,38,0.4) 0%, rgba(212,175,55,0.3) 30%, transparent 70%);
        animation: explosionFlash 3s ease-out;
      }
      @keyframes explosionFlash { 
        0% { opacity: 0; background-color: rgba(255,215,0,0.8); } 
        5% { opacity: 1; background-color: rgba(255,255,255,0.9); }
        15% { opacity: 0.8; background-color: rgba(220,38,38,0.6); }
        100% { opacity: 0; background-color: transparent; } 
      }
      .explosion-gem {
        position: absolute; width: 60px; height: 60px;
        animation-fill-mode: forwards; user-select: none;
        filter: drop-shadow(0 0 20px #dc2626) brightness(1.6) saturate(2) contrast(1.3);
        z-index: 10001;
      }
      @keyframes explosionBlast {
        0% { 
          transform: scale(0.1) rotate(0deg); 
          opacity: 1; 
        }
        15% { 
          transform: scale(1.8) rotate(180deg); 
          opacity: 1; 
        }
        100% { 
          opacity: 0.2; 
          transform: scale(0.4) rotate(720deg); 
        }
      }
      .mega-burst {
        position: absolute; top: 50%; left: 50%; 
        width: 300px; height: 300px;
        margin: -150px 0 0 -150px; border-radius: 50%;
        background: radial-gradient(circle, 
          rgba(255,255,255,1) 0%, 
          rgba(255,215,0,0.9) 20%, 
          rgba(220,38,38,0.8) 40%, 
          rgba(212,175,55,0.6) 60%, 
          transparent 100%);
        animation: megaExplosion 1.5s ease-out;
        z-index: 10000;
      }
      @keyframes megaExplosion {
        0% { 
          transform: scale(0); 
          opacity: 1; 
          filter: brightness(2) blur(0px);
        }
        30% { 
          transform: scale(1.2); 
          opacity: 1; 
          filter: brightness(1.8) blur(2px);
        }
        70% { 
          transform: scale(2.5); 
          opacity: 0.7; 
          filter: brightness(1.4) blur(4px);
        }
        100% { 
          transform: scale(4); 
          opacity: 0; 
          filter: brightness(1) blur(8px);
        }
      }
      .screen-shake {
        animation: screenShake 0.8s ease-in-out;
      }
      @keyframes screenShake {
        0%, 100% { transform: translateX(0) translateY(0); }
        10% { transform: translateX(-10px) translateY(-5px); }
        20% { transform: translateX(10px) translateY(5px); }
        30% { transform: translateX(-8px) translateY(-3px); }
        40% { transform: translateX(8px) translateY(3px); }
        50% { transform: translateX(-6px) translateY(-2px); }
        60% { transform: translateX(6px) translateY(2px); }
        70% { transform: translateX(-4px) translateY(-1px); }
        80% { transform: translateX(4px) translateY(1px); }
        90% { transform: translateX(-2px) translateY(-1px); }
      }
    `;
    document.head.appendChild(style);
    
    // SHAKE dello schermo
    document.body.classList.add('screen-shake');
    setTimeout(() => {
      document.body.classList.remove('screen-shake');
    }, 800);
    
    // Container effetto
    const explosion = document.createElement('div');
    explosion.className = 'spectacular-explosion';
    explosion.id = 'spectacular-gemme-container';
    document.body.appendChild(explosion);
    
    // MEGA ESPLOSIONE centrale
    setTimeout(() => {
      const megaBurst = document.createElement('div');
      megaBurst.className = 'mega-burst';
      explosion.appendChild(megaBurst);
    }, 50);
    
    // ESPLOSIONE RADIALE di gemme (come fuochi d'artificio)
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const gemCount = Math.min(Math.max(pointsEarned * 2, 25), 60); // Più gemme!
    
    for (let i = 0; i < gemCount; i++) {
      setTimeout(() => {
        const gem = document.createElement('img');
        gem.src = '/gemma-rossa.png';
        gem.alt = 'gemma';
        gem.className = 'explosion-gem';
        
        // Posizione centrale di partenza
        gem.style.left = centerX - 30 + 'px';
        gem.style.top = centerY - 30 + 'px';
        
        // Direzione casuale dell'esplosione
        const angle = (360 / gemCount) * i + Math.random() * 30;
        const distance = 200 + Math.random() * 400;
        const finalX = centerX + Math.cos(angle * Math.PI / 180) * distance;
        const finalY = centerY + Math.sin(angle * Math.PI / 180) * distance;
        
        // Animazione esplosiva
        const duration = 1.5 + Math.random() * 1.5;
        gem.style.animation = `explosionBlast ${duration}s ease-out forwards`;
        
        explosion.appendChild(gem);
        
        // Animazione verso la posizione finale
        setTimeout(() => {
          gem.style.transition = `all ${duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
          gem.style.left = finalX - 30 + 'px';
          gem.style.top = finalY - 30 + 'px';
        }, 100);
        
      }, i * 20); // Intervallo più veloce per effetto esplosivo
    }
    
    // Cleanup dopo 4 secondi
    setTimeout(() => {
      const container = document.getElementById('spectacular-gemme-container');
      const styleEl = document.getElementById('spectacular-gemme-style');
      if (container) document.body.removeChild(container);
      if (styleEl) document.head.removeChild(styleEl);
      console.log('💥 Esplosione PWA spettacolare completata!');
    }, 4000);
  };

  // Funzione per toggle audio
  const toggleAudio = async () => {
    const newState = !audioEnabled;
    setAudioEnabled(newState);
    localStorage.setItem('pwa_audio_enabled', JSON.stringify(newState));
    
    if (newState) {
      // Test audio IMMEDIATO quando viene abilitato (importante per iOS)
      try {
        const testSound = new Audio('/sounds/coin.wav');
        testSound.volume = 0.8;
        
        // Su iOS/Safari, l'audio DEVE essere riprodotto in risposta diretta al click dell'utente
        await testSound.play();
        showNotification('🔊 Audio abilitato! Suoni effetti attivi ✨', 'success');
        
        // Salva che l'audio è stato "sbloccato" per questo session
        sessionStorage.setItem('audio_unlocked', 'true');
      } catch (error) {
        console.warn('🍎 Audio bloccato iOS/Safari:', error.message);
        showNotification('🔊 Audio abilitato! (Su iPhone: interagisci prima con la pagina)', 'success');
      }
    } else {
      showNotification('🔇 Audio disabilitato', 'success');
      sessionStorage.removeItem('audio_unlocked');
    }
  };

  // Funzione per logout (pulisce localStorage)
  const handleLogout = async () => {
    // 🔔 Logout OneSignal
    try {
      await oneSignalService.logoutUser()
      localStorage.removeItem('pwa_onesignal_player_id')
    } catch (error) {
      console.error('⚠️ Errore logout OneSignal:', error)
    }
    
    // Logout normale
    localStorage.removeItem('pwa_customer_id')
    localStorage.removeItem('pwa_customer_data')
    window.location.reload()
  }

  useEffect(() => {
    loadClientData()
    
    // 🔔 Inizializza OneSignal per cliente già loggato
    const initOneSignal = async () => {
      try {
        await oneSignalService.initialize()
        
        // Controlla se il cliente ha già un Player ID salvato
        const savedPlayerId = localStorage.getItem('pwa_onesignal_player_id')
        const dbPlayerId = customerData?.onesignal_player_id
        
        console.log('🔍 Player ID check:', { savedPlayerId, dbPlayerId, customerName: customerData?.name })
        
        // Se ha un Player ID nel database ma non nel localStorage
        if (dbPlayerId && !savedPlayerId && customerData) {
          localStorage.setItem('pwa_onesignal_player_id', dbPlayerId)
          
          // Verifica se è già salvato nel database
          const { data: customerCheck } = await supabase
            .from('customers')
            .select('onesignal_player_id')
            .eq('id', customerData.id)
            .single()
          
          if (!customerCheck?.onesignal_player_id || customerCheck.onesignal_player_id !== dbPlayerId) {
            console.log('💾 Aggiornamento Player ID nel database per cliente esistente')
            const { error: updateError } = await supabase
              .from('customers')
              .update({ onesignal_player_id: dbPlayerId })
              .eq('id', customerData.id)
            
            if (updateError) {
              console.error('⚠️ Errore salvataggio Player ID nel database:', updateError)
            } else {
              console.log('✅ Player ID aggiornato nel database per cliente:', customerData.name)
            }
          }
        } 
        // SEMPRE tenta registrazione OneSignal v16 per ottenere nuovo Subscription ID
        // (Il vecchio Player ID nel database è del legacy SDK, OneSignal v16 richiede nuova registrazione)
        if (customerData && !savedPlayerId) {
          console.log('🆕 Registrazione OneSignal v16 richiesta - Player ID legacy presente:', dbPlayerId)
          const playerId = await oneSignalService.registerUser(customerData)
          if (playerId) {
            localStorage.setItem('pwa_onesignal_player_id', playerId)
            
            // Salva Player ID nel database del cliente
            const { error: updateError } = await supabase
              .from('customers')
              .update({ onesignal_player_id: playerId })
              .eq('id', customerData.id)
            
            if (updateError) {
              console.error('⚠️ Errore salvataggio Player ID nel database:', updateError)
            } else {
              console.log('✅ Player ID salvato nel database per cliente nuovo:', customerData.name)
            }
          }
        }
      } catch (error) {
        console.error('⚠️ Errore inizializzazione OneSignal PWA:', error)
      }
    }
    
    initOneSignal()
    
    // Timer per forzare chiusura popup OneSignal bloccati
    const closeOneSignalPopups = () => {
      try {
        // Trova tutti gli elementi OneSignal
        const onesignalElements = document.querySelectorAll(
          '.onesignal-slidedown-container, .onesignal-popover-container, [id*="onesignal"], [class*="onesignal"]'
        )
        
        let foundVisiblePopup = false
        onesignalElements.forEach(el => {
          const isVisible = el.offsetParent !== null || 
                           window.getComputedStyle(el).display !== 'none' ||
                           window.getComputedStyle(el).visibility !== 'hidden'
          
          if (isVisible && (el.classList.contains('onesignal-slidedown-container') || 
                           el.classList.contains('onesignal-popover-container'))) {
            console.log('🔒 Forzando chiusura popup OneSignal bloccato')
            el.style.display = 'none'
            el.style.visibility = 'hidden'
            el.style.opacity = '0'
            el.style.pointerEvents = 'none'
            el.classList.add('onesignal-reset')
            foundVisiblePopup = true
          }
        })
        
        if (foundVisiblePopup) {
          console.log('✅ Popup OneSignal chiusi forzatamente')
        }
      } catch (error) {
        console.log('⚠️ Errore chiusura popup OneSignal:', error)
      }
    }
    
    // Controlla ogni 3 secondi per popup bloccati
    const popupCheckInterval = setInterval(closeOneSignalPopups, 3000)
    
    // Pulizia al dismount
    return () => {
      clearInterval(popupCheckInterval)
    }
  }, [])

  // 💎 POLLING EVENTI PIOGGIA GEMME ogni 5 secondi per PWA
  useEffect(() => {
    if (!customer?.id) return;

    console.log('🎯 Avvio polling gemme per cliente PWA:', customer.name);

    // Controllo immediato
    checkGemmeEvents();

    // Poi ogni 5 secondi
    const interval = setInterval(() => {
      checkGemmeEvents();
    }, 5000); // 5 secondi

    return () => clearInterval(interval);
  }, [customer?.id]) // Dipende dall'ID del cliente

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

      // Aggiorna dati cliente dal database (per avere dati freschi)
      const { data: freshCustomerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerData.id)
        .single()
        
      if (customerError || !freshCustomerData) {
        console.error('Errore ricarica cliente:', customerError)
        // Se il cliente non esiste più, fa logout
        handleLogout()
        return
      }
      
      setCustomer(freshCustomerData)
      // Aggiorna anche il localStorage con dati freschi
      localStorage.setItem('pwa_customer_data', JSON.stringify(freshCustomerData))

      // Carica transazioni cliente (ultime 10)
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .eq('customer_id', freshCustomerData.id)
        .order('created_at', { ascending: false })
        .limit(10)
      setTransactions(transactionsData || [])

      // Carica coupon del cliente
      const { data: couponsData } = await supabase
        .from('coupons')
        .select('*')
        .eq('customer_id', freshCustomerData.id)
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
        .eq('customer_id', freshCustomerData.id)
        .in('status', ['active', 'expiring'])
        .order('created_at', { ascending: false })
      setSubscriptions(subscriptionsData || [])

      // Carica TUTTI i premi (per tutti i livelli)
      const { data: prizesData } = await supabase
        .from('prizes')
        .select('*')
        .eq('active', true)
        .order('points_cost')
      setPrizes(prizesData || [])

      // Carica referral del cliente (FIX per referredFriends undefined)
      await loadReferredFriends(freshCustomerData.id)

    } catch (err) {
      console.error('Errore caricamento:', err)
      setError('Errore nel caricamento dei dati')
    } finally {
      setLoading(false)
    }
  }

  // Resto della logica identica al componente principale...
  // Funzione per la copia del codice referral
  const handleCopyReferralCode = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!customer?.referral_code) {
      showNotification('⚠️ Nessun codice referral disponibile', 'warning');
      return;
    }
    
    try {
      await copyToClipboard(customer.referral_code, () => showNotification('✅ Codice Copiato!'));
    } catch (error) {
      console.error('❌ Errore copia referral:', error);
      showNotification('❌ Errore durante la copia', 'error');
    }
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
        <h2>Errore caricamento</h2>
        <p>{error}</p>
        <button onClick={handleLogout} style={{ marginTop: '20px', padding: '10px 20px', borderRadius: '5px', border: 'none', background: '#8B4513', color: 'white' }}>
          🔄 Riprova accesso
        </button>
      </div>
    )
  }

  const customerLevel = getCustomerLevel(customer.points, levels)
  const nextLevelInfo = getNextLevelInfo(customer.points, levels)

  // Funzione per renderizzare la sezione attiva
  const renderActiveSection = () => {
    switch(activeSection) {
      case 'home':
        return (
          <>
            <div className="client-gems-card">
              <div className="gems-display">
                <div className="gems-icon">
                  <img 
                    src="/gemma-rossa.png" 
                    alt="Gemme" 
                    style={{ 
                      width: '40px', 
                      height: '40px',
                      filter: 'drop-shadow(0 2px 8px rgba(220, 38, 38, 0.4))'
                    }}
                  />
                </div>
                <div className="gems-info">
                  <h2>{customer.points}</h2>
                  <p>GEMME Disponibili</p>
                </div>
              </div>
              <div className="gems-progress">
                <div
                  className="level-progress-bar"
                  title={`${Math.round(nextLevelInfo.progress)}% completato`}
                >
                  <div
                    className="level-progress-fill"
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

            {/* === SEZIONE WALLET === */}
            {customer?.wallet_balance && customer.wallet_balance > 0 && (
              <div className="client-section">
                <h3>💳 Il tuo Wallet</h3>
                <div style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  borderRadius: '15px',
                  padding: '25px',
                  textAlign: 'center',
                  color: 'white',
                  boxShadow: '0 8px 25px rgba(16, 185, 129, 0.3)',
                  marginBottom: '20px'
                }}>
                  <div style={{ fontSize: '2.5em', marginBottom: '10px' }}>💰</div>
                  <div style={{ fontSize: '2.2em', fontWeight: 'bold', marginBottom: '8px' }}>
                    {formatCurrency(customer.wallet_balance)}
                  </div>
                  <div style={{ fontSize: '1.1em', opacity: 0.9 }}>
                    Credito Disponibile
                  </div>
                  <div style={{ 
                    fontSize: '0.9em', 
                    opacity: 0.8, 
                    marginTop: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    padding: '8px 15px',
                    borderRadius: '20px',
                    display: 'inline-block'
                  }}>
                    💡 Utilizzalo per i tuoi acquisti in negozio
                  </div>
                </div>
              </div>
            )}

            {/* Referral section */}
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

            {/* === SEZIONE COUPON === */}
            {coupons.length > 0 && (
              <div className="client-section">
                <h3>🎁 I tuoi Coupon</h3>
                <div className="coupons-grid" style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                  gap: '20px' 
                }}>
                  {coupons.slice(0, 2).map(coupon => (
                    <div key={coupon.id} className="coupon-card">
                      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                        <p style={{ fontSize: '2.2em', fontWeight: 'bold', color: '#E53E3E', margin: '0' }}>
                          {coupon.type === 'percentage' ? `${coupon.value}%` : `${coupon.value}€`}
                        </p>
                      </div>
                      <h4 style={{ color: '#333', marginBottom: '15px', textAlign: 'center', fontSize: '1.1em' }}>
                        {coupon.description}
                      </h4>
                      <p style={{ borderTop: '1px dashed #eee', textAlign: 'center', fontSize: '0.9em', color: '#666', paddingTop: '10px', marginTop: '15px' }}>
                        Scade il: {new Date(coupon.expiry_date).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                      <div key={subscription.id} className={`subscription-card ${isExpiring ? 'expiring' : ''}`}
                        style={{ 
                          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                          border: `2px solid ${isExpiring ? '#f59e0b' : '#8B4513'}`,
                          borderRadius: '12px',
                          padding: '20px',
                          position: 'relative'
                        }}>
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
                        <div style={{ 
                          background: isExpiring ? '#fef3c7' : '#f0f9ff',
                          border: `1px solid ${isExpiring ? '#f59e0b' : '#0ea5e9'}`,
                          borderRadius: '8px',
                          padding: '12px',
                          textAlign: 'center',
                          marginBottom: '12px'
                        }}>
                          <div style={{ fontSize: '14px', fontWeight: 'bold', color: isExpiring ? '#92400e' : '#0c4a6e', marginBottom: '4px' }}>
                            {isExpiring ? '⚠️ In scadenza!' : '✅ Attivo'}
                          </div>
                          <div style={{ fontSize: '12px', color: isExpiring ? '#92400e' : '#0c4a6e' }}>
                            {daysRemaining > 0 ? `⏰ ${daysRemaining} giorni rimanenti` : '❌ Scaduto'}
                          </div>
                          <div style={{ fontSize: '11px', color: isExpiring ? '#92400e' : '#0c4a6e', marginTop: '4px', opacity: 0.8 }}>
                            Utilizzi rimasti: {subscription.remaining_usage || 0}
                          </div>
                        </div>
                        
                        {/* Bollini utilizzi abbonamento */}
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            marginBottom: '8px' 
                          }}>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#8B4513' }}>
                              Utilizzi Abbonamento
                            </span>
                            <span style={{ fontSize: '11px', color: '#666' }}>
                              {(plan?.max_usage || 0) - (subscription.remaining_usage || 0)}/{plan?.max_usage || 0} utilizzati
                            </span>
                          </div>
                          
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: `repeat(${Math.min(plan?.max_usage || 0, 10)}, 1fr)`, 
                            gap: '3px',
                            maxWidth: '180px',
                            margin: '0 auto'
                          }}>
                            {Array.from({ length: plan?.max_usage || 0 }, (_, index) => {
                              // Calcolo corretto: i primi X bollini sono utilizzati
                              const usedCount = (plan?.max_usage || 0) - (subscription.remaining_usage || 0)
                              const isUsed = index < usedCount
                              return (
                                <div 
                                  key={index}
                                  style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    backgroundColor: isUsed ? '#ef4444' : '#10b981',
                                    border: '1px solid #fff',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                    transition: 'all 0.2s ease'
                                  }}
                                  title={isUsed ? 'Utilizzato' : 'Disponibile'}
                                />
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* QR Code Section */}
            <div className="client-section">
              <h3>📱 Il tuo QR Code di Riconoscimento</h3>
              <p style={{ textAlign: 'center', marginBottom: '20px', fontSize: '0.9em', color: '#666' }}>
                Mostra questo codice in negozio per essere riconosciuto istantaneamente
              </p>
              
              <div style={{
                background: 'white',
                borderRadius: '20px',
                padding: '30px 20px',
                textAlign: 'center',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
                border: `3px solid ${customerLevel.primary_color}`,
                margin: '0 auto',
                maxWidth: '350px'
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '20px'
                }}>
                  {/* QR Code */}
                  <div style={{
                    padding: '20px',
                    background: 'white',
                    borderRadius: '15px',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                    border: '2px solid #f0f0f0'
                  }}>
                    <QRCodeGenerator
                      value={`CUSTOMER:${customer.id}`}
                      size={200}
                      backgroundColor="#ffffff"
                      foregroundColor={customerLevel.primary_color || "#8B4513"}
                      style={{ display: 'block', margin: '0 auto' }}
                    />
                  </div>
                  
                  {/* Customer Info */}
                  <div style={{ textAlign: 'center' }}>
                    <h4 style={{ 
                      color: customerLevel.primary_color, 
                      margin: '0 0 8px 0', 
                      fontSize: '1.2em',
                      fontWeight: 'bold' 
                    }}>
                      👤 {customer.name}
                    </h4>
                    <p style={{ 
                      margin: '0 0 12px 0', 
                      fontSize: '0.9em', 
                      color: '#666',
                      fontFamily: 'monospace' 
                    }}>
                      ID: #{customer.id.substring(0,8)}
                    </p>
                    <div style={{
                      backgroundColor: customerLevel.primary_color,
                      color: 'white',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.9em',
                      fontWeight: 'bold'
                    }}>
                      <span dangerouslySetInnerHTML={{ __html: customerLevel.icon_svg }} />
                      <span>{customerLevel.name}</span>
                    </div>
                  </div>
                </div>
                
                {/* Instructions */}
                <div style={{ 
                  marginTop: '25px', 
                  padding: '15px',
                  background: '#f8f9fa',
                  borderRadius: '12px',
                  fontSize: '0.85em'
                }}>
                  <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#8B4513' }}>
                    🎯 Come usarlo:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>1️⃣</span>
                      <span>Mostra il QR al personale</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>2️⃣</span>
                      <span>Verrai riconosciuto automaticamente</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>3️⃣</span>
                      <span>Accumula GEMME con i tuoi acquisti</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )

      case 'prizes':
        return (
          <div className="client-section">
            <h3>🎁 Tutti i Premi Disponibili</h3>
            <div className="prizes-grid">
              {prizes.map(prize => {
                const prizeLevel = levels.find(l => l.name === prize.required_level)
                return (
                  <div key={prize.id} className={`prize-card ${customer.points >= prize.points_cost ? 'available' : 'unavailable'}`}>
                    {prize.image_url && (
                      <img src={prize.image_url} alt={prize.name} className="prize-image" />
                    )}
                    <div className="prize-info">
                      <div className="prize-header">
                        <h4>{prize.name}</h4>
                        {prizeLevel && (
                          <div className="prize-level-badge" style={{
                            backgroundColor: prizeLevel.primary_color,
                            color: 'white',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            borderRadius: 8,
                            padding: '2px 8px',
                            marginLeft: 8
                          }}>
                            <span dangerouslySetInnerHTML={{ __html: prizeLevel.icon_svg }} />
                            <span>{prizeLevel.name}</span>
                          </div>
                        )}
                      </div>
                      <p>{prize.description}</p>
                      <div className="prize-cost">
                        <span className="cost-gems">
                          <img src="/gemma-rossa.png" alt="gemma" style={{ width: 22, height: 22, marginRight: 4, verticalAlign: 'middle', display: 'inline-block' }} />
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
        )

      case 'history':
        return (
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
        )

      case 'referral':
        return (
          <div className="client-section">
            <h3>👥 Sistema Referral</h3>
            
            {/* Progresso referral */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em', color: '#666', marginBottom: '8px' }}>
                <span>Prossimo bonus a {Math.ceil((referredFriends.length) / 5) * 5} inviti</span>
                <span style={{ fontWeight: 'bold', color: '#8B4513' }}>{referredFriends.length}/5</span>
              </div>
              <div style={{ width: '100%', height: '12px', backgroundColor: '#e0e0e0', borderRadius: '6px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    height: '100%', 
                    background: 'linear-gradient(to right, #8B4513, #D4AF37)',
                    width: `${((referredFriends.length % 5) * 20)}%`,
                    transition: 'width 0.5s ease'
                  }}
                ></div>
              </div>
            </div>

            {/* Statistiche referral */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '20px' }}>
              <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '10px' }}>
                <div style={{ fontSize: '1.5em', marginBottom: '5px' }}>👥</div>
                <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#8B4513' }}>{referredFriends.length}</div>
                <div style={{ fontSize: '0.8em', color: '#666' }}>Amici Invitati</div>
              </div>
              <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#ffe6e6', borderRadius: '10px' }}>
                <div style={{ fontSize: '1.5em', marginBottom: '5px' }}>💎</div>
                <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#d32f2f' }}>{referredFriends.length * getReferralPoints(referredFriends.length)}</div>
                <div style={{ fontSize: '0.8em', color: '#666' }}>GEMME Guadagnate</div>
              </div>
              <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f0f8ff', borderRadius: '10px' }}>
                <div style={{ fontSize: '1.5em', marginBottom: '5px' }}>🎯</div>
                <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#8B4513' }}>{getReferralLevel(referredFriends.length)}</div>
                <div style={{ fontSize: '0.8em', color: '#666' }}>Livello</div>
              </div>
            </div>

            {/* Codice referral */}
            <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '10px', border: '2px solid #8B4513' }}>
              <div style={{ fontSize: '0.9em', fontWeight: '600', color: '#666', marginBottom: '10px', textAlign: 'center' }}>
                Il tuo codice referral
              </div>
              <div 
                className="referral-code-minimal" 
                onClick={handleCopyReferralCode} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '15px 20px',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #ddd',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                <span style={{ fontSize: '2.2em', fontWeight: 'bold', color: '#333', letterSpacing: '2px' }}>
                  {customer.referral_code}
                </span>
                <svg style={{ width: '24px', height: '24px', marginLeft: '15px', color: '#8B4513' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div style={{ fontSize: '0.8em', color: '#666', textAlign: 'center', marginTop: '5px' }}>
                Clicca per copiare negli appunti
              </div>
            </div>

            {/* Lista amici invitati */}
            {referralLoading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ fontSize: '1.2em' }}>⏳ Caricamento referral...</div>
              </div>
            ) : referredFriends.length > 0 ? (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontWeight: '600', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg style={{ width: '20px', height: '20px', color: '#8B4513' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  Amici che hai invitato ({referredFriends.length})
                </h4>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {referredFriends.map((referral, index) => (
                    <div key={referral.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 15px', backgroundColor: '#f8f9fa', borderRadius: '8px', marginBottom: '8px', border: '1px solid #e0e0e0' }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#333' }}>
                          {referral.referred?.name || 'Nome non disponibile'}
                        </div>
                        <div style={{ fontSize: '0.8em', color: '#666' }}>
                          Registrato il {new Date(referral.created_at).toLocaleDateString('it-IT')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ padding: '4px 8px', backgroundColor: referral.status === 'completed' ? '#d4edda' : '#fff3cd', color: referral.status === 'completed' ? '#155724' : '#856404', borderRadius: '12px', fontSize: '0.75em', fontWeight: '600' }}>
                          {referral.status === 'completed' ? '✅ Completato' : '⏳ In attesa'}
                        </span>
                        {referral.status === 'completed' && (
                          <span style={{ fontSize: '0.8em', fontWeight: 'bold', color: '#d32f2f' }}>
                            +{getReferralPoints(index)} 💎
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '10px', border: '2px dashed #ddd' }}>
                <div style={{ fontSize: '1.2em', marginBottom: '10px' }}>🎯</div>
                <h4 style={{ fontWeight: '600', marginBottom: '10px' }}>Inizia a invitare amici!</h4>
                <p style={{ fontSize: '0.9em', color: '#666', lineHeight: '1.4' }}>
                  Condividi il tuo codice referral per guadagnare gemme extra. 
                  I tuoi amici riceveranno <strong>10 gemme</strong> di benvenuto e tu ne guadagnerai <strong>{getReferralPoints(0)}</strong> al loro primo acquisto!
                </p>
              </div>
            )}

            {/* Bottoni condivisione */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '20px' }}>
              <button 
                onClick={() => {
                  const message = `🎉 Ciao! Ti invito a scoprire il fantastico programma fedeltà di Sapori e Colori! Con il mio codice referral ${customer.referral_code} riceverai subito 10 GEMME gratuite! 💎\n\nRegistrati qui: ${window.location.origin}/portal?ref=${customer.referral_code}\n\nPiù acquisti, più gemme accumuli, più premi ottieni! 🎁`
                  const url = `https://wa.me/?text=${encodeURIComponent(message)}`
                  window.open(url, '_blank')
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  backgroundColor: '#25d366',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9em',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s ease'
                }}
              >
                📱 WhatsApp
              </button>
              <button 
                onClick={async () => {
                  const shareLink = `${window.location.origin}/portal?ref=${customer.referral_code}`
                  await copyToClipboard(shareLink, () => showNotification('🔗 Link copiato negli appunti!'))
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  backgroundColor: '#8B4513',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9em',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s ease'
                }}
              >
                🔗 Copia Link
              </button>
            </div>
          </div>
        )

      case 'profile':
        return (
          <div className="client-section">
            <h3>👤 Il tuo Profilo</h3>
            <div style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
              border: '2px solid #8B4513',
              borderRadius: '15px',
              padding: '25px',
              textAlign: 'center'
            }}>
              {/* Upload immagine profilo */}
              <div style={{ marginBottom: '20px' }}>
                <ImageUpload
                  currentImage={customer.avatar_url}
                  customerId={customer.id}
                  onImageUploaded={(newImageUrl) => {
                    // Aggiorna lo stato locale del customer
                    setCustomer(prev => ({ ...prev, avatar_url: newImageUrl }))
                    showNotification(newImageUrl ? '✅ Foto profilo aggiornata!' : '✅ Foto profilo rimossa!')
                  }}
                  maxSize={3}
                  bucketName="customer-avatars"
                />
              </div>
              
              <h2 style={{ color: '#8B4513', marginBottom: '10px' }}>{customer.name}</h2>
              <div className="client-level" style={{ 
                backgroundColor: customerLevel.primary_color,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '20px',
                color: 'white',
                fontWeight: 'bold',
                marginBottom: '20px'
              }}>
                <span dangerouslySetInnerHTML={{ __html: customerLevel.icon_svg }} />
                <span>Cliente {customerLevel.name}</span>
              </div>
              
              <div style={{ 
                background: 'white',
                borderRadius: '10px',
                padding: '15px',
                marginBottom: '15px',
                textAlign: 'left'
              }}>
                <p><strong>📧 Email:</strong> {customer.email || 'Non specificata'}</p>
                <p><strong>📱 Telefono:</strong> {customer.phone || 'Non specificato'}</p>
                <p><strong>🗓️ Membro dal:</strong> {new Date(customer.created_at).toLocaleDateString('it-IT')}</p>
                <p><strong>💎 GEMME Totali:</strong> {customer.points}</p>
                {customer.referral_code && (
                  <p><strong>🔗 Codice Referral:</strong> {customer.referral_code}</p>
                )}
              </div>
            </div>
          </div>
        )

      case 'settings':
        return (
          <div className="client-section">
            <h3>⚙️ Impostazioni</h3>
            <div style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
              border: '2px solid #8B4513',
              borderRadius: '15px',
              padding: '25px'
            }}>
              {/* Sezione Audio */}
              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ color: '#8B4513', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🔊 Audio Effetti
                </h4>
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                      Suoni degli Effetti Gemme
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {audioEnabled ? 
                        '🔊 Attivo - Sentirai il suono quando guadagni gemme' : 
                        '🔇 Disattivo - Nessun suono negli effetti'
                      }
                      {audioEnabled && !sessionStorage.getItem('audio_unlocked') && (
                        <div style={{ color: '#F59E0B', fontSize: '12px', marginTop: '4px' }}>
                          🍎 Su iPhone: clicca il pulsante per sbloccare l'audio
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={toggleAudio}
                    style={{
                      background: audioEnabled ? 
                        'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 
                        'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '25px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: audioEnabled ? 
                        '0 4px 15px rgba(16, 185, 129, 0.3)' : 
                        '0 4px 15px rgba(107, 114, 128, 0.3)'
                    }}
                  >
                    {audioEnabled ? '🔊 ATTIVO' : '🔇 DISATTIVO'}
                  </button>
                </div>
              </div>

              {/* Test Notifiche Push */}
              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ color: '#8B4513', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🔔 Test Notifiche Push
                </h4>
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                      Testa Sistema Notifiche
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      Verifica se le notifiche push funzionano
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        showNotification('🔄 Testando notifiche push...', 'success');
                        
                        // Test completo del sistema OneSignal
                        console.log('=== 🔔 TEST NOTIFICHE PUSH ===');
                        
                        // 1. Verifica inizializzazione
                        const isInitialized = await oneSignalService.initialize();
                        console.log('✅ OneSignal inizializzato:', isInitialized);
                        
                        // 2. Controlla permessi
                        const notificationStatus = await oneSignalService.getNotificationStatus();
                        console.log('📋 Status notifiche:', notificationStatus);
                        
                        // 3. Forza nuova registrazione per test (rimuove cache)
                        console.log('🗑️ Rimuovendo Player ID cached per test...');
                        localStorage.removeItem('pwa_onesignal_player_id');
                        
                        console.log('🔄 Registrando utente con nuovo sistema...');
                        const playerId = await oneSignalService.registerUser(customer);
                        console.log('✅ Player ID ottenuto:', playerId);
                        
                        // 4. Invia notifica di test
                        if (playerId) {
                          console.log('📤 Inviando notifica di test...');
                          const result = await oneSignalService.sendNotification({
                            title: '🎉 Test Notification',
                            message: `Ciao ${customer.name}! Le notifiche funzionano perfettamente!`,
                            playerIds: [playerId],
                            url: window.location.href
                          });
                          console.log('📨 Risultato invio:', result);
                          
                          if (result.success) {
                            showNotification('✅ Test completato! Controlla se hai ricevuto la notifica', 'success');
                          } else {
                            showNotification(`❌ Errore test: ${result.error}`, 'error');
                          }
                        } else {
                          showNotification('❌ Impossibile ottenere Player ID', 'error');
                        }
                        
                        console.log('=== 🏁 FINE TEST ===');
                        
                      } catch (error) {
                        console.error('❌ Errore test notifiche:', error);
                        showNotification(`❌ Errore test: ${error.message}`, 'error');
                      }
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '25px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
                    }}
                  >
                    🧪 TESTA NOTIFICHE
                  </button>
                </div>
              </div>
              
              {/* Test Notifiche Browser Native */}
              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ color: '#8B4513', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🌐 Test Notifiche Browser Nativo
                </h4>
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                      Test Notifica Browser Nativa
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      Testa il sistema base del browser senza OneSignal
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        console.log('=== 🌐 TEST NOTIFICA BROWSER NATIVA ===');
                        
                        // Verifica supporto
                        if (!('Notification' in window)) {
                          showNotification('❌ Browser non supporta notifiche', 'error');
                          return;
                        }
                        
                        // Verifica permesso
                        let permission = Notification.permission;
                        console.log('🔍 Permesso attuale:', permission);
                        
                        if (permission === 'default') {
                          console.log('📝 Richiedendo permesso...');
                          permission = await Notification.requestPermission();
                        }
                        
                        if (permission !== 'granted') {
                          showNotification('❌ Permesso notifiche negato', 'error');
                          console.log('❌ Permesso negato:', permission);
                          return;
                        }
                        
                        // Crea notifica nativa
                        console.log('✅ Permesso concesso, creando notifica nativa...');
                        
                        // Verifica focus della tab
                        const isTabFocused = !document.hidden;
                        console.log('👁️ Tab è in focus:', isTabFocused);
                        
                        const notification = new Notification('🎉 Test Notifica Browser', {
                          body: `Ciao ${customer.name}! Questa è una notifica nativa del browser`,
                          icon: '/icon-192x192.png',
                          badge: '/icon-192x192.png',
                          tag: 'test-notification',
                          requireInteraction: false,
                          silent: false
                        });
                        
                        console.log('✅ Notifica creata:', notification);
                        
                        // Aggiungi listener per tutti gli eventi
                        notification.onshow = () => {
                          console.log('👀 Notifica mostrata (onshow)');
                        };
                        
                        notification.onclose = () => {
                          console.log('❌ Notifica chiusa (onclose)');
                        };
                        
                        notification.onerror = (error) => {
                          console.error('⚠️ Errore notifica (onerror):', error);
                        };
                        
                        // Gestisci click
                        notification.onclick = () => {
                          console.log('👆 Click su notifica nativa');
                          notification.close();
                          window.focus();
                        };
                        
                        // Auto-chiudi dopo 10 secondi invece di 5 per più tempo
                        setTimeout(() => {
                          console.log('⏰ Auto-chiusura notifica dopo 10 secondi');
                          notification.close();
                        }, 10000);
                        
                        showNotification('✅ Notifica browser inviata! Se non la vedi, apri una nuova tab e prova', 'success');
                        console.log('=== 🏁 FINE TEST BROWSER NATIVO ===');
                        
                      } catch (error) {
                        console.error('❌ Errore test notifica nativa:', error);
                        showNotification(`❌ Errore: ${error.message}`, 'error');
                      }
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '25px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    🌐 TEST BROWSER
                  </button>
                </div>
              </div>
              
              {/* Debug Service Worker */}
              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ color: '#8B4513', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🔧 Debug Service Worker
                </h4>
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                      Controlla Service Worker
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      Verifica registrazione e stato del Service Worker
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        console.log('=== 🔧 DEBUG SERVICE WORKER ===');
                        
                        // Controlla supporto Service Worker
                        if (!('serviceWorker' in navigator)) {
                          showNotification('❌ Service Worker non supportato', 'error');
                          return;
                        }
                        
                        console.log('✅ Service Worker supportato');
                        
                        // Controlla registrazioni esistenti
                        const registrations = await navigator.serviceWorker.getRegistrations();
                        console.log('📋 Registrazioni Service Worker:', registrations.length);
                        
                        registrations.forEach((registration, index) => {
                          console.log(`📝 Registration ${index}:`, {
                            scope: registration.scope,
                            active: registration.active?.scriptURL,
                            installing: registration.installing?.scriptURL,
                            waiting: registration.waiting?.scriptURL
                          });
                        });
                        
                        // Controlla stato specifico OneSignal
                        try {
                          const registration = await navigator.serviceWorker.getRegistration('/');
                          if (registration) {
                            console.log('✅ Registrazione OneSignal trovata:', {
                              scope: registration.scope,
                              active: !!registration.active,
                              scriptURL: registration.active?.scriptURL
                            });
                            
                            // Controlla se può gestire push
                            if (registration.active) {
                              console.log('📨 Service Worker attivo, testando push...');
                              
                              // Test del messaging
                              registration.active.postMessage({
                                type: 'TEST_MESSAGE',
                                data: { test: true }
                              });
                              
                              showNotification('✅ Service Worker attivo e funzionante', 'success');
                            } else {
                              console.log('⚠️ Service Worker registrato ma non attivo');
                              showNotification('⚠️ Service Worker non attivo', 'warning');
                            }
                          } else {
                            console.log('❌ Nessuna registrazione OneSignal trovata');
                            showNotification('❌ Service Worker non registrato', 'error');
                          }
                        } catch (swError) {
                          console.error('❌ Errore controllo registrazione:', swError);
                          showNotification(`❌ Errore SW: ${swError.message}`, 'error');
                        }
                        
                        console.log('=== 🏁 FINE DEBUG SERVICE WORKER ===');
                        
                      } catch (error) {
                        console.error('❌ Errore debug Service Worker:', error);
                        showNotification(`❌ Errore: ${error.message}`, 'error');
                      }
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '25px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)'
                    }}
                  >
                    🔧 DEBUG SW
                  </button>
                </div>
              </div>

              {/* Info sezione */}
              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid #3B82F6',
                borderRadius: '10px',
                padding: '15px',
                textAlign: 'left'
              }}>
                <div style={{ fontSize: '14px', color: '#1E40AF', marginBottom: '10px' }}>
                  <strong>💡 Audio:</strong> Se abiliti l'audio ma non senti i suoni, assicurati di aver interagito con la pagina (tocca lo schermo) per permettere ai browser di riprodurre l'audio.
                </div>
                <div style={{ fontSize: '14px', color: '#DC2626' }}>
                  <strong>🔔 Notifiche:</strong> Se i test riportano successo ma non vedi le notifiche:
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>Controlla impostazioni browser: <code>Impostazioni → Privacy → Notifiche</code></li>
                    <li>Su iPhone: <code>Impostazioni → Safari → Notifiche</code></li>
                    <li>Prova ad aprire una nuova scheda del browser</li>
                    <li>Controlla se hai "Non Disturbare" attivato</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div
      className="client-portal content-with-nav"
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

      {/* Pulsante logout per PWA */}
      <div style={{ position: 'fixed', top: '10px', right: '10px', zIndex: 1000 }}>
        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(139, 69, 19, 0.8)',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '15px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          🚪 Esci
        </button>
      </div>

      {/* Header sempre visibile */}
      <div className="client-header">
        <img
          src="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png"
          alt="Sapori & Colori"
          className="client-logo"
        />
        <div className="client-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            {customer.avatar_url ? (
              <img 
                src={customer.avatar_url} 
                alt={`Avatar di ${customer.name}`}
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: `3px solid ${customerLevel.primary_color}`,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                }}
              />
            ) : (
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${customerLevel.primary_color} 0%, ${customerLevel.primary_color}80 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8em',
                color: 'white',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
              }}>
                👤
              </div>
            )}
            <div>
              <h1 style={{ margin: '0 0 8px 0' }}>Ciao {customer.name}! 👋</h1>
              <div className="client-level" style={{ backgroundColor: customerLevel.primary_color }}>
                <span className="level-icon">
                  <div dangerouslySetInnerHTML={{ __html: customerLevel.icon_svg }} />
                </span>
                <span>Cliente {customerLevel.name}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenuto dinamico basato sulla sezione attiva */}
      {renderActiveSection()}

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

      {/* Mobile Navigation Bar */}
      <MobileNavigation
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onGemClick={() => setShowQRModal(true)}
        customerPoints={customer.points}
      />

      {/* QR Modal */}
      <QRModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        customer={customer}
        customerLevel={getCustomerLevel(customer.points, levels)}
      />
    </div>
  )
}

export default ClientPortal
