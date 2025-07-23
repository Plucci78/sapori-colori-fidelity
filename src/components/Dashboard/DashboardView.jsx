import React, { useState, useEffect } from 'react'
import DarkModeToggle from '../DarkModeToggle'
import { useAuth } from '../../auth/AuthContext'
import EmailQuotaWidget from '../Email/EmailQuotaWidget'
import { supabase } from '../../supabase'

const DashboardView = ({
  todayStats = { customers: 0, points: 0, revenue: 0, redeems: 0 },
  topCustomers = [],
  emailStats = { sent: 0, opened: 0 },
  showNotification = () => {} // Default fallback
}) => {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalText, setModalText] = useState("")
  const [showNuovoClienteForm, setShowNuovoClienteForm] = useState(false)
  const [showVenditaForm, setShowVenditaForm] = useState(false)
  const [showPremioForm, setShowPremioForm] = useState(false)
  const [nfcResult, setNfcResult] = useState(null)
  const [activePanel, setActivePanel] = useState(null)
  const [recentActivities, setRecentActivities] = useState([])
  const [loadingActivities, setLoadingActivities] = useState(true)

  const { profile } = useAuth()

  // Carica attività recenti dal database
  const loadRecentActivities = async () => {
    try {
      setLoadingActivities(true)
      const { data: activities, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(8)

      if (error) {
        console.error('Errore caricamento attività:', error)
        setRecentActivities([])
      } else {
        setRecentActivities(activities || [])
      }
    } catch (error) {
      console.error('Errore generale attività:', error)
      setRecentActivities([])
    } finally {
      setLoadingActivities(false)
    }
  }

  // Carica attività all'avvio
  useEffect(() => {
    loadRecentActivities()
  }, [])

  // Funzione per formattare il display delle attività
  const formatActivity = (activity) => {
    const timeAgo = getTimeAgo(activity.timestamp)
    
    switch (activity.action) {
      case 'CUSTOMER_REGISTERED': {
        const customerName = activity.details ? JSON.parse(activity.details).customer_name : 'Cliente'
        return {
          title: 'Nuovo cliente registrato',
          description: `${customerName} - Registrato ${timeAgo}`,
          badge: 'Completato',
          badgeClass: 'badge-success',
          icon: 'bg-success'
        }
      }
      
      case 'TRANSACTION_CREATED': {
        const details = activity.details ? JSON.parse(activity.details) : {}
        return {
          title: 'Vendita registrata',
          description: `€${details.amount || 0} • +${details.points_earned || 0} GEMME • ${timeAgo}`,
          badge: 'Vendita',
          badgeClass: 'badge-warning',
          icon: 'bg-warning'
        }
      }
      
      case 'PRIZE_REDEEMED': {
        const prizeDetails = activity.details ? JSON.parse(activity.details) : {}
        return {
          title: 'Premio riscattato',
          description: `${prizeDetails.prize_name || 'Premio'} • ${prizeDetails.customer_name || 'Cliente'} • ${timeAgo}`,
          badge: 'Premio',
          badgeClass: 'badge-gemme',
          icon: 'gemme-icon'
        }
      }
      
      case 'EMAIL_CAMPAIGN_SENT':
      case 'LEVEL_MILESTONE_EMAIL_SENT': {
        const emailDetails = activity.details ? JSON.parse(activity.details) : {}
        return {
          title: 'Email automatica inviata',
          description: `${emailDetails.email_type === 'level_milestone' ? 'Email milestone' : 'Email campagna'} • ${timeAgo}`,
          badge: 'Email',
          badgeClass: 'badge-primary',
          icon: 'bg-blue-500'
        }
      }
      
      default:
        return {
          title: activity.action.replace(/_/g, ' ').toLowerCase(),
          description: `${activity.user_name || 'Sistema'} • ${timeAgo}`,
          badge: 'Info',
          badgeClass: 'badge-secondary',
          icon: 'bg-gray-500'
        }
    }
  }

  // Funzione per calcolare tempo fa
  const getTimeAgo = (timestamp) => {
    const now = new Date()
    const activityTime = new Date(timestamp)
    const diffMs = now - activityTime
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'ora'
    if (diffMins < 60) return `${diffMins} minuti fa`
    if (diffHours < 24) return `${diffHours} ore fa`
    return `${diffDays} giorni fa`
  }

  // Funzione per aprire la modale generica (puoi tenerla per altri messaggi)
  const openModal = (text) => {
    setModalText(text)
    setModalOpen(true)
  }
  const closeModal = () => setModalOpen(false)

  const handleNuovoCliente = () => setActivePanel(activePanel === 'nuovo' ? null : 'nuovo')
  const handleRegistraVendita = () => setActivePanel(activePanel === 'vendita' ? null : 'vendita')
  const handleRiscattaPremio = () => setActivePanel(activePanel === 'premio' ? null : 'premio')

  // 4. Leggi Tessera NFC: simula lettura NFC (qui puoi integrare la vera API)
  const handleLeggiNFC = async () => {
    // Simulazione: dopo 1 secondo mostra un risultato
    setNfcResult("Tessera letta: ID123456789")
    setTimeout(() => setNfcResult(null), 3000)
  }

  // Form Nuovo Cliente (puoi sostituire con il tuo form reale)
  const NuovoClienteForm = () => (
    <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-xl z-50 transition-transform duration-300"
         style={{ transform: showNuovoClienteForm ? 'translateX(0)' : 'translateX(100%)' }}>
      <div className="p-8 h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Nuovo Cliente</h2>
          <button onClick={() => setShowNuovoClienteForm(false)} className="text-2xl">&times;</button>
        </div>
        <form className="flex-1 flex flex-col justify-between"
              onSubmit={e => { e.preventDefault(); setShowNuovoClienteForm(false); openModal("Cliente aggiunto!"); }}>
          <div>
            <input className="input mb-3 w-full" placeholder="Nome" required />
            <input className="input mb-3 w-full" placeholder="Telefono" required />
          </div>
          <div>
            <button className="btn btn-primary w-full" type="submit">Salva</button>
            <button className="btn btn-secondary w-full mt-2" type="button" onClick={() => setShowNuovoClienteForm(false)}>Annulla</button>
          </div>
        </form>
      </div>
    </div>
  )

  // Form Registra Vendita (puoi sostituire con il tuo form reale)
  const VenditaForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-8 shadow-xl max-w-xs w-full text-center">
        <h2 className="text-xl font-bold mb-4">Registra Vendita</h2>
        <form onSubmit={e => { e.preventDefault(); setShowVenditaForm(false); openModal("Vendita registrata!"); }}>
          <input className="input mb-3 w-full" placeholder="Importo (€)" type="number" required />
          <button className="btn btn-success w-full" type="submit">Registra</button>
        </form>
        <button className="btn btn-secondary w-full mt-2" onClick={() => setShowVenditaForm(false)}>Annulla</button>
      </div>
    </div>
  )

  // Form Riscatta Premio (puoi sostituire con il tuo form reale)
  const PremioForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-8 shadow-xl max-w-xs w-full text-center">
        <div className="mb-4">
          <div className="gemme-icon-lg w-16 h-16 mx-auto mb-3 opacity-80"></div>
          <h2 className="text-xl font-bold text-brand mb-2">💎 Riscatta Premio</h2>
          <p className="text-sm text-secondary">Inserisci il nome del premio da riscattare</p>
        </div>
        <form onSubmit={e => { e.preventDefault(); setShowPremioForm(false); openModal("🎉 Premio riscattato con successo!"); }}>
          <input 
            className="input mb-3 w-full" 
            placeholder="es. Cornetto gratuito" 
            required 
            style={{
              border: '2px solid #dc2626',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '1rem'
            }}
          />
          <button className="redeem-prize-btn active w-full mb-3" type="submit">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            🎁 Conferma Riscatto
          </button>
        </form>
        <button className="btn btn-secondary w-full" onClick={() => setShowPremioForm(false)}>❌ Annulla</button>
      </div>
    </div>
  )

  return (
    <div className="p-6">
      <DarkModeToggle />

      {/* LOGOUT + NOME UTENTE */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 24 }}>
        <span style={{ fontWeight: 600 }}>
          Benvenuto, {profile?.full_name}! 👋
        </span>
      </div>

      {/* MODALI FORM */}
      {showNuovoClienteForm && <NuovoClienteForm />}
      {showVenditaForm && <VenditaForm />}
      {showPremioForm && <PremioForm />}

      {/* MODALE GENERICA */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-8 shadow-xl max-w-xs w-full text-center">
            <div className="text-3xl mb-2">🚧</div>
            <div className="mb-4 text-lg font-semibold">{modalText}</div>
            <button className="btn btn-primary w-full" onClick={closeModal}>
              Chiudi
            </button>
          </div>
        </div>
      )}

      {/* NFC RESULT */}
      {nfcResult && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-8 shadow-xl max-w-xs w-full text-center">
            <div className="text-3xl mb-2">📶</div>
            <div className="mb-4 text-lg font-semibold">{nfcResult}</div>
          </div>
        </div>
      )}

      {/* HEADER BRAND */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-brand mb-2">Dashboard</h1>
        <p className="text-secondary">Panoramica delle attività giornaliere di Sapori & Colori</p>
      </div>

      {/* STATS CARDS GRID */}
      <div className="stats-grid">
        {/* CLIENTI OGGI */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Clienti Oggi</span>
            <svg className="stat-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="stat-value">{todayStats.customers}</div>
          <div className="stat-description">Nuovi clienti registrati</div>
        </div>

        {/* GEMME DISTRIBUITE */}
        <div className="stat-card gemme">
          <div className="stat-header">
            <span className="stat-title">GEMME Distribuite</span>
            <div className="gemme-icon"></div>
          </div>
          <div className="stat-value">{todayStats.points}</div>
          <div className="stat-description">Punti fedeltà assegnati oggi</div>
        </div>

        {/* INCASSO GIORNALIERO */}
        <div className="stat-card warning">
          <div className="stat-header">
            <span className="stat-title">Incasso Oggi</span>
            <svg className="stat-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-value">€{todayStats.revenue.toFixed(2)}</div>
          <div className="stat-description">Vendite registrate oggi</div>
        </div>

        {/* PREMI RISCATTATI */}
        <div className="stat-card success">
          <div className="stat-header">
            <span className="stat-title">Premi Riscattati</span>
            <svg className="stat-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="stat-value">{todayStats.redeems}</div>
          <div className="stat-description">Premi riscattati oggi</div>
        </div>
      </div>

      <div className="grid grid-2 gap-6">
        {/* TOP CLIENTI FEDELI - BELLO */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Top Clienti Fedeli</h2>
            <p className="card-subtitle">I tuoi migliori clienti con più GEMME accumulate</p>
          </div>
          <div className="card-body">
            {topCustomers.length > 0 ? (
              <div className="space-y-4">
                {topCustomers.map((customer, index) => (
                  <div key={customer.id} className="top-customer-item">
                    <div className="customer-info-left">
                      <div className="customer-rank">
                        {index + 1}
                      </div>
                      <div className="customer-details">
                        <h4>{customer.name}</h4>
                        <p>{customer.phone}</p>
                        {customer.email && <p className="text-xs text-muted">{customer.email}</p>}
                      </div>
                    </div>
                    <div className="customer-gemme">
                      <div className="gemme-icon"></div>
                      <div className="gemme-count">{customer.points}</div>
                      <div className="gemme-label">GEMME</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-secondary">
                <svg className="mx-auto h-16 w-16 text-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-lg font-semibold mb-2">Nessun cliente ancora</h3>
                <p className="text-sm">Registra il primo cliente per vedere le statistiche</p>
              </div>
            )}
          </div>
        </div>

        {/* EMAIL MARKETING */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Email Marketing</h2>
            <p className="card-subtitle">Performance delle campagne email automatiche</p>
          </div>
          <div className="card-body">
            <div className="grid grid-2 gap-4 mb-6">
              <div className="text-center p-4 bg-secondary rounded-lg border border-gray-200">
                <div className="text-3xl font-extrabold text-brand mb-1">{emailStats.sent}</div>
                <div className="text-sm text-secondary font-semibold">Email Inviate</div>
              </div>
              <div className="text-center p-4 bg-secondary rounded-lg border border-gray-200">
                <div className="text-3xl font-extrabold text-success mb-1">{emailStats.opened}</div>
                <div className="text-sm text-secondary font-semibold">Email Aperte</div>
              </div>
            </div>
            
            {/* PROGRESSO EMAIL */}
            <div className="mb-6">
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span>Tasso di apertura</span>
                <span className="text-brand">{emailStats.sent > 0 ? Math.round((emailStats.opened / emailStats.sent) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-3 rounded-full transition-all duration-500 bg-gradient-to-r from-green-400 to-green-600" 
                  style={{ 
                    width: `${emailStats.sent > 0 ? (emailStats.opened / emailStats.sent) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>

            {/* WIDGET QUOTA EMAIL ACCORDION */}
            <EmailQuotaWidget 
              showNotification={showNotification}
              accordion={true}
            />
          </div>
        </div>
      </div>

      {/* AZIONI RAPIDE */}
      <div className="card mt-6">
        <div className="card-header">
          <h2 className="card-title">Azioni Rapide</h2>
          <p className="card-subtitle">Le operazioni più comuni del negozio</p>
        </div>
        <div className="card-body">
          <div className="grid grid-4 gap-4">
            <button
              className={`btn btn-primary${activePanel === 'nuovo' ? ' ring-2 ring-brand' : ''}`}
              onClick={handleNuovoCliente}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Nuovo Cliente
            </button>
            
            <button
              className={`btn btn-success${activePanel === 'vendita' ? ' ring-2 ring-success' : ''}`}
              onClick={handleRegistraVendita}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Registra Vendita
            </button>
            
            <button
              className={`btn btn-gemme${activePanel === 'premio' ? ' ring-2 ring-gemme' : ''}`}
              onClick={handleRiscattaPremio}
            >
              <div className="gemme-icon w-4 h-4"></div>
              💎 Riscatta Premio
            </button>
            
            <button
              className="btn btn-warning"
              onClick={handleLeggiNFC}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Leggi Tessera NFC
            </button>
          </div>

          {/* PANNELLO ESPANDIBILE */}
          {activePanel === 'nuovo' && (
            <div className="my-6 p-6 bg-white dark:bg-gray-900 rounded-xl shadow-xl border">
              <h2 className="text-xl font-bold mb-4">Nuovo Cliente</h2>
              <form onSubmit={e => { e.preventDefault(); setActivePanel(null); openModal("Cliente aggiunto!"); }}>
                <input className="input mb-3 w-full" placeholder="Nome" required />
                <input className="input mb-3 w-full" placeholder="Telefono" required />
                <div className="flex gap-2">
                  <button className="btn btn-primary flex-1" type="submit">Salva</button>
                  <button className="btn btn-secondary flex-1" type="button" onClick={() => setActivePanel(null)}>Annulla</button>
                </div>
              </form>
            </div>
          )}
          {activePanel === 'vendita' && (
            <div className="my-6 p-6 bg-white dark:bg-gray-900 rounded-xl shadow-xl border">
              <h2 className="text-xl font-bold mb-4">Registra Vendita</h2>
              <form onSubmit={e => { e.preventDefault(); setActivePanel(null); openModal("Vendita registrata!"); }}>
                <input className="input mb-3 w-full" placeholder="Importo (€)" type="number" required />
                <div className="flex gap-2">
                  <button className="btn btn-success flex-1" type="submit">Registra</button>
                  <button className="btn btn-secondary flex-1" type="button" onClick={() => setActivePanel(null)}>Annulla</button>
                </div>
              </form>
            </div>
          )}
          {activePanel === 'premio' && (
            <div className="my-6 p-6 bg-white dark:bg-gray-900 rounded-xl shadow-xl border">
              <h2 className="text-xl font-bold mb-4">Riscatta Premio</h2>
              <form onSubmit={e => { e.preventDefault(); setActivePanel(null); openModal("Premio riscattato!"); }}>
                <input className="input mb-3 w-full" placeholder="Premio" required />
                <div className="flex gap-2">
                  <button className="btn btn-gemme flex-1" type="submit">Riscatta</button>
                  <button className="btn btn-secondary flex-1" type="button" onClick={() => setActivePanel(null)}>Annulla</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* ATTIVITÀ RECENTI */}
      <div className="card mt-6">
        <div className="card-header">
          <h2 className="card-title">Attività Recenti</h2>
          <p className="card-subtitle">Ultime operazioni registrate nel sistema</p>
        </div>
        <div className="card-body">
          {loadingActivities ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto"></div>
              <p className="text-sm text-secondary mt-2">Caricamento attività...</p>
            </div>
          ) : recentActivities.length > 0 ? (
            <div className="space-y-4">
              {recentActivities.map((activity, index) => {
                const formattedActivity = formatActivity(activity)
                return (
                  <div key={index} className="flex items-center gap-4 p-4 bg-secondary rounded-lg border border-gray-200">
                    <div className={`w-3 h-3 ${formattedActivity.icon === 'gemme-icon' ? 'gemme-icon' : formattedActivity.icon + ' rounded-full'} flex-shrink-0`}></div>
                    <div className="flex-1">
                      <div className="font-semibold text-brand">{formattedActivity.title}</div>
                      <div className="text-sm text-secondary">{formattedActivity.description}</div>
                    </div>
                    <span className={`badge ${formattedActivity.badgeClass}`}>{formattedActivity.badge}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-brand mb-2">Nessuna attività recente</h3>
              <p className="text-sm text-secondary">Le attività del sistema appariranno qui quando inizierai ad usare il sistema di fidelizzazione</p>
            </div>
          )}
          
          {/* Pulsante aggiorna attività */}
          <div className="text-center mt-6">
            <button
              className="btn btn-secondary"
              onClick={loadRecentActivities}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Aggiorna Attività
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardView