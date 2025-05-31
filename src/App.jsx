import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import emailjs from '@emailjs/browser'
import './App.css'

function App() {
  const [customers, setCustomers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerEmail, setNewCustomerEmail] = useState('')
  const [transactionAmount, setTransactionAmount] = useState('')
  const [settings, setSettings] = useState({ points_per_euro: 1, points_for_prize: 10 })
  const [activeTab, setActiveTab] = useState('customer')
  
  // Stati per gestione manuale punti
  const [manualCustomerName, setManualCustomerName] = useState('')
  const [manualPoints, setManualPoints] = useState('')
  const [foundCustomers, setFoundCustomers] = useState([])
  
  // Stati per i premi
  const [prizes, setPrizes] = useState([])
  const [newPrizeName, setNewPrizeName] = useState('')
  const [newPrizeDescription, setNewPrizeDescription] = useState('')
  const [newPrizeCost, setNewPrizeCost] = useState('')
  
  // Stati per statistiche reali
  const [todayStats, setTodayStats] = useState({
    customers: 0,
    points: 0,
    redeems: 0,
    revenue: 0
  })
  const [topCustomers, setTopCustomers] = useState([])

  // Stati per Email Marketing
  const [emailTemplate, setEmailTemplate] = useState('welcome')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailRecipients, setEmailRecipients] = useState('all')
  const [customMessage, setCustomMessage] = useState('')
  const [emailStats, setEmailStats] = useState({ sent: 0, opened: 0 })

  // Sistema notifiche moderne
  const [notifications, setNotifications] = useState([])

  // NUOVO: Configurazione EmailJS
  const EMAIL_CONFIG = {
    serviceId: 'service_f6lj74h',
    templateId: 'template_kvxg4p9',
    publicKey: 'P0A99o_tLGsOuzhDs'
  }

  // Inizializza EmailJS
  useEffect(() => {
    emailjs.init(EMAIL_CONFIG.publicKey)
  }, [])

  // Funzione per mostrare notifiche moderne
  const showNotification = (message, type = 'success') => {
    const id = Date.now()
    const notification = { id, message, type }
    
    setNotifications(prev => [...prev, notification])
    
    // Auto-rimuovi dopo 4 secondi
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 4000)
  }

  // Componente Notification
  const NotificationContainer = () => (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      {notifications.map(notification => (
        <div
          key={notification.id}
          style={{
            background: notification.type === 'success' ? 
              'linear-gradient(135deg, #4CAF50, #45a049)' : 
              notification.type === 'error' ? 
              'linear-gradient(135deg, #f44336, #da190b)' : 
              'linear-gradient(135deg, #2196F3, #1976D2)',
            color: 'white',
            padding: '16px 20px',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            fontSize: '14px',
            fontWeight: '500',
            maxWidth: '350px',
            animation: 'slideIn 0.3s ease-out',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <span style={{ fontSize: '18px' }}>
            {notification.type === 'success' ? '✅' : 
             notification.type === 'error' ? '❌' : '📧'}
          </span>
          {notification.message}
          <button
            onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              marginLeft: 'auto',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )

  // Carica impostazioni e premi
  useEffect(() => {
    loadSettings()
    loadPrizes()
    loadTodayStats()
    loadTopCustomers()
  }, [])

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single()
      
      if (data) setSettings(data)
    } catch (error) {
      console.log('Errore caricamento impostazioni:', error)
    }
  }

  // Carica premi
  const loadPrizes = async () => {
    try {
      const { data, error } = await supabase
        .from('prizes')
        .select('*')
        .eq('active', true)
        .order('points_cost')

      if (data) setPrizes(data)
    } catch (error) {
      console.log('Errore caricamento premi:', error)
    }
  }

  // Carica statistiche reali
  const loadTodayStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', today + 'T00:00:00')
        .lte('created_at', today + 'T23:59:59')

      if (transactions) {
        const purchases = transactions.filter(t => t.type === 'acquistare')
        const redeems = transactions.filter(t => t.type === 'riscattare')
        
        const uniqueCustomers = new Set(transactions.map(t => t.customer_id)).size
        const totalPoints = purchases.reduce((sum, t) => sum + t.points_earned, 0)
        const totalRevenue = purchases.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
        
        setTodayStats({
          customers: uniqueCustomers,
          points: totalPoints,
          redeems: redeems.length,
          revenue: totalRevenue
        })
      }
    } catch (error) {
      console.log('Errore caricamento statistiche:', error)
    }
  }

  // Carica top clienti reali
  const loadTopCustomers = async () => {
    try {
      const { data: customers, error } = await supabase
        .from('customers')
        .select('*')
        .order('points', { ascending: false })
        .limit(5)

      if (customers) {
        setTopCustomers(customers)
      }
    } catch (error) {
      console.log('Errore caricamento top clienti:', error)
    }
  }

  // Template Email HTML
  const getEmailTemplate = (type, customerName, customMsg = '') => {
    const templates = {
      welcome: {
        subject: `Benvenuto in Sapori & Colori, ${customerName}! 🍞`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%);">
            <div style="padding: 40px; text-align: center;">
              <img src="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png" alt="Sapori & Colori" style="max-width: 200px; margin-bottom: 20px;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Benvenuto ${customerName}! 🎉</h1>
            </div>
            <div style="background: white; padding: 40px; margin: 0 20px; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
              <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Il tuo viaggio nei sapori inizia qui!</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Grazie per esserti unito alla famiglia Sapori & Colori! Ora fai parte del nostro esclusivo programma fedeltà.
              </p>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #ff7e5f; margin-top: 0;">Come funziona:</h3>
                <ul style="color: #666; line-height: 1.8;">
                  <li>🛍️ <strong>1€ speso = 1 punto guadagnato</strong></li>
                  <li>🎁 <strong>Accumula punti e riscatta premi esclusivi</strong></li>
                  <li>✨ <strong>Offerte speciali riservate ai membri</strong></li>
                </ul>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="background: linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">Vieni a trovarci! 🏪</a>
              </div>
              <p style="color: #999; font-size: 14px; text-align: center;">
                Ti aspettiamo per la tua prima visita!<br>
                Via Example 123, Roma • Tel: 06 1234567
              </p>
            </div>
          </div>
        `
      },
      points: {
        subject: `Hai raggiunto ${customMsg} punti! 🌟`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <div style="padding: 40px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Congratulazioni ${customerName}! 🎉</h1>
              <p style="color: #e1e8ff; font-size: 18px;">Hai raggiunto ${customMsg} punti fedeltà!</p>
            </div>
            <div style="background: white; padding: 40px; margin: 0 20px; border-radius: 10px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; width: 100px; height: 100px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold;">
                  ${customMsg}
                </div>
              </div>
              <h2 style="color: #333; text-align: center;">I tuoi punti crescono! 📈</h2>
              <p style="color: #666; text-align: center; font-size: 16px;">
                Continua così! Sei sempre più vicino ai nostri premi esclusivi.
              </p>
            </div>
          </div>
        `
      },
      promo: {
        subject: `Offerta Speciale per te, ${customerName}! 🔥`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
            <div style="padding: 40px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 32px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">🔥 OFFERTA SPECIALE 🔥</h1>
              <p style="color: white; font-size: 20px; margin: 10px 0;">Solo per te, ${customerName}!</p>
            </div>
            <div style="background: white; padding: 40px; margin: 0 20px; border-radius: 10px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="background: #fa709a; color: white; padding: 20px; border-radius: 10px; display: inline-block;">
                  <h2 style="margin: 0; font-size: 24px;">SCONTO 20%</h2>
                  <p style="margin: 5px 0; font-size: 16px;">Su tutti i prodotti da forno</p>
                </div>
              </div>
              <p style="color: #666; text-align: center; font-size: 16px; margin-bottom: 20px;">
                ${customMsg || 'Approfitta di questa offerta esclusiva valida fino alla fine del mese!'}
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 18px; display: inline-block;">Vieni ora! 🏃‍♂️</a>
              </div>
            </div>
          </div>
        `
      }
    }
    return templates[type]
  }

  // NUOVO: Funzione invio email REALI tramite EmailJS
  const sendEmail = async () => {
    if (!emailSubject) {
      showNotification('Inserisci l\'oggetto dell\'email', 'error')
      return
    }

    try {
      // Ottieni lista destinatari
      let recipients = []
      const { data: allCustomers } = await supabase
        .from('customers')
        .select('*')
        .not('email', 'is', null)

      switch (emailRecipients) {
        case 'all':
          recipients = allCustomers.filter(c => c.email)
          break
        case 'top':
          recipients = allCustomers.filter(c => c.email && c.points >= 50)
          break
        case 'active':
          recipients = allCustomers.filter(c => c.email && c.points > 0)
          break
        case 'inactive':
          recipients = allCustomers.filter(c => c.email && c.points === 0)
          break
      }

      if (recipients.length === 0) {
        showNotification('Nessun destinatario trovato per i criteri selezionati', 'error')
        return
      }

      showNotification(`Invio ${recipients.length} email in corso...`, 'info')

      // Invia email reali a tutti i destinatari
      let successCount = 0
      const emailPromises = recipients.map(async (customer) => {
        try {
          const template = getEmailTemplate(emailTemplate, customer.name, customMessage)
          
          const templateParams = {
            to_name: customer.name,
            to_email: customer.email,
            subject: emailSubject || template.subject,
            message_html: template.html,
            reply_to: 'saporiecolori.b@gmail.com'
          }

          await emailjs.send(
            EMAIL_CONFIG.serviceId,
            EMAIL_CONFIG.templateId,
            templateParams,
            EMAIL_CONFIG.publicKey
          )
          
          successCount++
          return true
        } catch (error) {
          console.error(`Errore invio email a ${customer.name}:`, error)
          return false
        }
      })

      // Aspetta che tutte le email vengano inviate
      await Promise.all(emailPromises)

      // Aggiorna statistiche
      setEmailStats({ 
        sent: emailStats.sent + successCount, 
        opened: emailStats.opened 
      })

      if (successCount === recipients.length) {
        showNotification(`🎉 Tutte le ${successCount} email inviate con successo!`, 'success')
      } else {
        showNotification(`⚠️ ${successCount}/${recipients.length} email inviate correttamente`, 'info')
      }

      setEmailSubject('')
      setCustomMessage('')

    } catch (error) {
      console.log('Errore invio email:', error)
      showNotification('Errore nell\'invio delle email', 'error')
    }
  }

  // Cerca clienti per gestione manuale
  const searchCustomersForManual = async (searchName) => {
    if (searchName.length < 2) {
      setFoundCustomers([])
      return
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .ilike('name', `%${searchName}%`)
        .limit(5)

      if (data) {
        setFoundCustomers(data)
      }
    } catch (error) {
      console.log('Errore ricerca clienti:', error)
    }
  }

  // Modifica punti manualmente
  const modifyPoints = async (customer, pointsToAdd) => {
    const points = parseInt(pointsToAdd)
    if (isNaN(points) || points === 0) {
      showNotification('Inserisci un numero valido di punti', 'error')
      return
    }

    try {
      const newPoints = Math.max(0, customer.points + points)

      await supabase
        .from('customers')
        .update({ points: newPoints })
        .eq('id', customer.id)

      await supabase
        .from('transactions')
        .insert([{
          customer_id: customer.id,
          amount: 0,
          points_earned: points,
          type: points > 0 ? 'acquistare' : 'riscattare'
        }])

      loadTodayStats()
      loadTopCustomers()
      searchCustomersForManual(manualCustomerName)
      
      if (selectedCustomer && selectedCustomer.id === customer.id) {
        setSelectedCustomer({ ...selectedCustomer, points: newPoints })
      }
      
      setManualPoints('')
      showNotification(`${points > 0 ? 'Aggiunti' : 'Rimossi'} ${Math.abs(points)} punti a ${customer.name}`)
    } catch (error) {
      console.log('Errore modifica punti:', error)
      showNotification('Errore nella modifica punti', 'error')
    }
  }

  // Salva impostazioni
  const saveSettings = async () => {
    try {
      const { error } = await supabase
        .from('settings')
        .update({
          points_per_euro: settings.points_per_euro,
          points_for_prize: settings.points_for_prize
        })
        .eq('id', settings.id)

      if (!error) {
        showNotification('Configurazione salvata con successo!')
      }
    } catch (error) {
      console.log('Errore salvataggio:', error)
      showNotification('Errore nel salvataggio', 'error')
    }
  }

  // Aggiungi premio
  const addPrize = async () => {
    if (!newPrizeName || !newPrizeDescription || !newPrizeCost) {
      showNotification('Compila tutti i campi del premio', 'error')
      return
    }

    try {
      const { data, error } = await supabase
        .from('prizes')
        .insert([{
          name: newPrizeName,
          description: newPrizeDescription,
          points_cost: parseInt(newPrizeCost),
          active: true
        }])
        .select()

      if (data) {
        setPrizes([...prizes, data[0]])
        setNewPrizeName('')
        setNewPrizeDescription('')
        setNewPrizeCost('')
        showNotification('Premio aggiunto con successo! 🎁')
      }
    } catch (error) {
      console.log('Errore aggiunta premio:', error)
      showNotification('Errore nell\'aggiunta del premio', 'error')
    }
  }

  // Elimina premio
  const deletePrize = async (prizeId) => {
    if (!confirm('Sei sicuro di voler eliminare questo premio?')) return

    try {
      const { error } = await supabase
        .from('prizes')
        .update({ active: false })
        .eq('id', prizeId)

      if (!error) {
        setPrizes(prizes.filter(p => p.id !== prizeId))
        showNotification('Premio eliminato con successo!')
      }
    } catch (error) {
      console.log('Errore eliminazione premio:', error)
      showNotification('Errore nell\'eliminazione del premio', 'error')
    }
  }

  // Cerca clienti
  const searchCustomers = async () => {
    if (searchTerm.length < 2) {
      setCustomers([])
      return
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .order('name')

      if (data) setCustomers(data)
    } catch (error) {
      console.log('Errore ricerca:', error)
    }
  }

  useEffect(() => {
    searchCustomers()
  }, [searchTerm])

  // Crea nuovo cliente - CON EMAIL
  const createCustomer = async () => {
    if (!newCustomerName || !newCustomerPhone) {
      showNotification('Inserisci nome e telefono', 'error')
      return
    }

    if (newCustomerEmail && !/\S+@\S+\.\S+/.test(newCustomerEmail)) {
      showNotification('Formato email non valido', 'error')
      return
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{ 
          name: newCustomerName, 
          phone: newCustomerPhone, 
          email: newCustomerEmail || null,
          points: 0 
        }])
        .select()

      if (data) {
        setSelectedCustomer(data[0])
        setNewCustomerName('')
        setNewCustomerPhone('')
        setNewCustomerEmail('')
        showNotification(`Cliente ${data[0].name} creato con successo! 👤`)
      }
      loadTodayStats()
    } catch (error) {
      console.log('Errore creazione cliente:', error)
      showNotification('Errore: probabilmente il telefono è già registrato', 'error')
    }
  }

  // Aggiungi transazione
  const addTransaction = async () => {
    if (!selectedCustomer || !transactionAmount) return

    const amount = parseFloat(transactionAmount)
    const pointsEarned = Math.floor(amount * settings.points_per_euro)

    try {
      await supabase
        .from('transactions')
        .insert([{
          customer_id: selectedCustomer.id,
          amount: amount,
          points_earned: pointsEarned,
          type: 'acquistare'
        }])

      const newPoints = selectedCustomer.points + pointsEarned
      await supabase
        .from('customers')
        .update({ points: newPoints })
        .eq('id', selectedCustomer.id)

      setSelectedCustomer({ ...selectedCustomer, points: newPoints })
      setTransactionAmount('')
      showNotification(`+${pointsEarned} punti guadagnati! 🎯`)
      loadTodayStats()
    } catch (error) {
      console.log('Errore transazione:', error)
      showNotification('Errore nella registrazione della transazione', 'error')
    }
  }

  // Riscatta premio specifico
  const redeemPrize = async (prize) => {
    if (!selectedCustomer || selectedCustomer.points < prize.points_cost) return

    try {
      await supabase
        .from('transactions')
        .insert([{
          customer_id: selectedCustomer.id,
          amount: 0,
          points_earned: -prize.points_cost,
          type: 'riscattare'
        }])

      const newPoints = selectedCustomer.points - prize.points_cost
      await supabase
        .from('customers')
        .update({ points: newPoints })
        .eq('id', selectedCustomer.id)

      setSelectedCustomer({ ...selectedCustomer, points: newPoints })
      showNotification(`${prize.name} riscattato con successo! 🎉`)
      loadTodayStats()
    } catch (error) {
      console.log('Errore riscatto:', error)
      showNotification('Errore nel riscatto del premio', 'error')
    }
  }

  return (
    <div className="app">
      {/* Container notifiche moderne */}
      <NotificationContainer />
      
      {/* CSS per animazioni */}
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>

      <header className="header">
        <div className="header-content">
          <img 
            src="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png" 
            alt="Sapori e Colori Logo" 
            className="header-logo"
          />
          <div className="header-text">
            <h1>Sapori & Colori Fidelity</h1>
          </div>
        </div>
      </header>

      <div className="tabs">
        <button 
          className={activeTab === 'customer' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('customer')}
        >
          👤 Cliente
        </button>
        <button 
          className={activeTab === 'admin' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('admin')}
        >
          ⚙️ Gestione
        </button>
      </div>

      {activeTab === 'customer' && (
        <div className="screen">
          <div className="search-section">
            <input
              type="text"
              placeholder="Cerca cliente per nome o telefono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {customers.length > 0 && (
            <div className="customers-list">
              {customers.map((customer) => (
                <div 
                  key={customer.id} 
                  className="customer-item"
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <div>
                    <h4>{customer.name}</h4>
                    <p>{customer.phone}</p>
                    {customer.email && <p style={{color: '#666', fontSize: '14px'}}>📧 {customer.email}</p>}
                  </div>
                  <div className="points-badge">{customer.points} punti</div>
                </div>
              ))}
            </div>
          )}

          <div className="new-customer">
            <h3>Nuovo Cliente</h3>
            <input
              type="text"
              placeholder="Nome"
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
            />
            <input
              type="tel"
              placeholder="Telefono"
              value={newCustomerPhone}
              onChange={(e) => setNewCustomerPhone(e.target.value)}
            />
            <input
              type="email"
              placeholder="Email (opzionale)"
              value={newCustomerEmail}
              onChange={(e) => setNewCustomerEmail(e.target.value)}
            />
            <button onClick={createCustomer} className="btn-primary">
              Crea Cliente
            </button>
          </div>

          {selectedCustomer && (
            <div className="selected-customer">
              <div className="customer-card">
                <h2>{selectedCustomer.name}</h2>
                <div className="points-display">{selectedCustomer.points}</div>
                <p>Punti Fedeltà</p>
                {selectedCustomer.email && (
                  <p style={{color: '#666', fontSize: '14px'}}>📧 {selectedCustomer.email}</p>
                )}
              </div>

              <div className="transaction-section">
                <h3>Nuova Spesa</h3>
                <div className="quick-amounts">
                  <button onClick={() => setTransactionAmount('2.25')}>Pane 500g - €2,25</button>
                  <button onClick={() => setTransactionAmount('4.50')}>Pane 1kg - €4,50</button>
                  <button onClick={() => setTransactionAmount('1.80')}>Cornetto - €1,80</button>
                </div>
                <input
                  type="number"
                  placeholder="Importo €"
                  value={transactionAmount}
                  onChange={(e) => setTransactionAmount(e.target.value)}
                  step="0.01"
                />
                <button onClick={addTransaction} className="btn-primary">
                  Registra Spesa
                </button>

                <div className="prizes-section">
                  <h3>🎁 Premi Disponibili</h3>
                  <div className="prizes-list">
                    {prizes.map((prize) => (
                      <div key={prize.id} className="prize-item">
                        <div className="prize-info">
                          <h4>{prize.name}</h4>
                          <p>{prize.description}</p>
                          <span className="prize-cost">{prize.points_cost} punti</span>
                        </div>
                        <button 
                          onClick={() => redeemPrize(prize)}
                          className="btn-redeem"
                          disabled={selectedCustomer.points < prize.points_cost}
                        >
                          Riscatta
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'admin' && (
        <div className="screen">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
            <h2>Pannello Amministratore</h2>
            <button 
              onClick={() => {
                window.location.reload()
              }}
              className="btn-primary"
              style={{width: 'auto', padding: '12px 20px', fontSize: '14px'}}
            >
              🔄 Aggiorna Dati
            </button>
          </div>
          
          <div className="admin-section">
            <h3>📊 Statistiche di Oggi</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-number">{todayStats.customers}</div>
                <div className="stat-label">Clienti Serviti</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{todayStats.points}</div>
                <div className="stat-label">Punti Distribuiti</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{todayStats.redeems}</div>
                <div className="stat-label">Premi Riscattati</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">€{todayStats.revenue.toFixed(2)}</div>
                <div className="stat-label">Fatturato Oggi</div>
              </div>
            </div>
          </div>

          {/* Sezione Email Marketing con EMAIL REALI */}
          <div className="admin-section">
            <h3>📧 Email Marketing - EMAIL REALI ✨</h3>
            
            <div className="email-stats" style={{display: 'flex', gap: '20px', marginBottom: '20px'}}>
              <div className="stat-item">
                <div className="stat-number">{emailStats.sent}</div>
                <div className="stat-label">Email Inviate</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{emailStats.opened}</div>
                <div className="stat-label">Email Aperte</div>
              </div>
            </div>

            <div className="email-composer">
              <h4>🚀 Invia Email Reali ai Clienti</h4>
              
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px'}}>
                <div>
                  <label>Template:</label>
                  <select 
                    value={emailTemplate} 
                    onChange={(e) => setEmailTemplate(e.target.value)}
                    style={{width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px'}}
                  >
                    <option value="welcome">🎉 Benvenuto</option>
                    <option value="points">⭐ Punti Raggiunti</option>
                    <option value="promo">🔥 Promozione</option>
                  </select>
                </div>
                
                <div>
                  <label>Destinatari:</label>
                  <select 
                    value={emailRecipients} 
                    onChange={(e) => setEmailRecipients(e.target.value)}
                    style={{width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px'}}
                  >
                    <option value="all">Tutti i Clienti</option>
                    <option value="top">Top Clienti (50+ punti)</option>
                    <option value="active">Clienti Attivi</option>
                    <option value="inactive">Clienti Inattivi</option>
                  </select>
                </div>
              </div>

              <input
                type="text"
                placeholder="Oggetto email..."
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                style={{width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '15px'}}
              />

              <textarea
                placeholder="Messaggio personalizzato (opzionale)..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                style={{width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px', height: '80px', marginBottom: '15px'}}
              />

              <button onClick={sendEmail} className="btn-primary" style={{width: '100%', background: 'linear-gradient(135deg, #4CAF50, #45a049)'}}>
                📧 INVIA EMAIL REALI
              </button>
            </div>
          </div>

          <div className="admin-section">
            <h3>⚙️ Configurazione Sistema</h3>
            <div className="config-item">
              <label>Punti per ogni €1 speso:</label>
              <input 
                type="number" 
                value={settings.points_per_euro} 
                onChange={(e) => setSettings({...settings, points_per_euro: parseInt(e.target.value)})}
                min="1" 
                max="10" 
              />
            </div>
            <div className="config-item">
              <label>Punti necessari per premio:</label>
              <input 
                type="number" 
                value={settings.points_for_prize} 
                onChange={(e) => setSettings({...settings, points_for_prize: parseInt(e.target.value)})}
                min="5" 
                max="100" 
              />
            </div>
            <button className="btn-primary" onClick={saveSettings}>Salva Configurazione</button>
          </div>

          <div className="admin-section">
            <h3>🎁 Gestione Premi</h3>
            
            <div className="add-prize">
              <h4>Aggiungi Nuovo Premio</h4>
              <input
                type="text"
                placeholder="Nome premio (es. Cornetto Gratis)"
                value={newPrizeName}
                onChange={(e) => setNewPrizeName(e.target.value)}
              />
              <input
                type="text"
                placeholder="Descrizione (es. Un cornetto della casa)"
                value={newPrizeDescription}
                onChange={(e) => setNewPrizeDescription(e.target.value)}
              />
              <input
                type="number"
                placeholder="Costo in punti"
                value={newPrizeCost}
                onChange={(e) => setNewPrizeCost(e.target.value)}
                min="1"
              />
              <button onClick={addPrize} className="btn-primary">Aggiungi Premio</button>
            </div>

            <div className="prizes-management">
              <h4>Premi Esistenti</h4>
              {prizes.map((prize) => (
                <div key={prize.id} className="prize-management-item">
                  <div>
                    <strong>{prize.name}</strong> - {prize.points_cost} punti
                    <br />
                    <small>{prize.description}</small>
                  </div>
                  <button 
                    onClick={() => deletePrize(prize.id)}
                    className="btn-danger"
                  >
                    Elimina
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-section">
            <h3>👥 Gestione Manuale Punti</h3>
            
            <div className="manual-search">
              <input 
                type="text" 
                placeholder="Cerca cliente per nome..."
                value={manualCustomerName}
                onChange={(e) => {
                  setManualCustomerName(e.target.value)
                  searchCustomersForManual(e.target.value)
                }}
              />
              
              {foundCustomers.length > 0 && (
                <div className="found-customers">
                  {foundCustomers.map((customer) => (
                    <div key={customer.id} className="found-customer-item">
                      <div>
                        <strong>{customer.name}</strong> - {customer.points} punti
                        <br />
                        <small>{customer.phone}</small>
                        {customer.email && <small style={{color: '#666'}}> • {customer.email}</small>}
                      </div>
                      <div className="points-controls">
                        <input 
                          type="number" 
                          placeholder="±punti"
                          value={manualPoints}
                          onChange={(e) => setManualPoints(e.target.value)}
                          style={{width: '100px', marginRight: '10px'}}
                        />
                        <button 
                          onClick={() => modifyPoints(customer, manualPoints)}
                          className="btn-primary"
                          style={{padding: '8px 16px', fontSize: '14px'}}
                        >
                          Modifica
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="admin-section">
            <h3>📈 Top Clienti</h3>
            <div className="top-customers">
              {topCustomers.length > 0 ? (
                topCustomers.map((customer, index) => (
                  <div key={customer.id} className="customer-rank">
                    <span>{index + 1}. {customer.name}</span>
                    <span>{customer.points} punti</span>
                  </div>
                ))
              ) : (
                <div className="customer-rank">
                  <span>Nessun cliente ancora</span>
                  <span>0 punti</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App