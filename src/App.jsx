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
  const [activeView, setActiveView] = useState('customer')
  
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

  // TODO 3: Stati per selezione clienti individuali
  const [selectedIndividualCustomers, setSelectedIndividualCustomers] = useState([])
  const [showIndividualSelection, setShowIndividualSelection] = useState(false)
  const [allCustomersForEmail, setAllCustomersForEmail] = useState([])

  // Sistema notifiche moderne
  const [notifications, setNotifications] = useState([])

  // CONFIGURAZIONE EMAILJS
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
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 4000)
  }

  // TODO 4: Funzione per salvare statistiche email nel database
  const saveEmailLog = async (emailType, recipients, subject, status) => {
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .insert([{
          email_type: emailType,
          recipients_count: recipients.length,
          subject: subject,
          status: status,
          sent_at: new Date().toISOString()
        }])

      if (error) {
        console.error('Errore salvataggio log email:', error)
      }
    } catch (error) {
      console.error('Errore salvataggio log email:', error)
    }
  }

  // TODO 4: Carica statistiche email dal database
  const loadEmailStats = async () => {
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')

      if (data) {
        const totalSent = data.reduce((sum, log) => sum + log.recipients_count, 0)
        setEmailStats({ 
          sent: totalSent, 
          opened: 0
        })
      }
    } catch (error) {
      console.error('Errore caricamento statistiche email:', error)
    }
  }

  // TODO 1: Funzione automatica per email di benvenuto
  const sendWelcomeEmail = async (customer) => {
    if (!customer.email) return

    try {
      const template = getEmailTemplate('welcome', customer.name)
      
      const templateParams = {
        to_name: customer.name,
        to_email: customer.email,
        subject: template.subject,
        message_html: template.html,
        reply_to: 'saporiecolori.b@gmail.com'
      }

      await emailjs.send(
        EMAIL_CONFIG.serviceId,
        EMAIL_CONFIG.templateId,
        templateParams,
        EMAIL_CONFIG.publicKey
      )

      await saveEmailLog('welcome', [customer], template.subject, 'sent')
      
      showNotification(`📧 Email di benvenuto inviata a ${customer.name}!`, 'success')
    } catch (error) {
      console.error('Errore invio email benvenuto:', error)
      await saveEmailLog('welcome', [customer], 'Benvenuto', 'failed')
    }
  }

  // TODO 2: Funzione automatica per email milestone gemme
  const sendPointsMilestoneEmail = async (customer, points) => {
    if (!customer.email) return

    let milestoneReached = null
    let emailTitle = ''
    
    if (points === 50) {
      milestoneReached = '50'
      emailTitle = 'Congratulazioni! 🎉'
    } else if (points === 100) {
      milestoneReached = '100'
      emailTitle = 'Cliente VIP! ⭐'
    } else if (points === 150) {
      milestoneReached = '150'
      emailTitle = 'Incredibile! 🚀'
    }
    
    if (!milestoneReached) return

    try {
      const template = getEmailTemplate('points', customer.name, milestoneReached)
      
      const templateParams = {
        to_name: customer.name,
        to_email: customer.email,
        subject: template.subject,
        message_html: template.html,
        reply_to: 'saporiecolori.b@gmail.com'
      }

      await emailjs.send(
        EMAIL_CONFIG.serviceId,
        EMAIL_CONFIG.templateId,
        templateParams,
        EMAIL_CONFIG.publicKey
      )

      await saveEmailLog('milestone', [customer], template.subject, 'sent')
      
      showNotification(`${emailTitle} Email inviata a ${customer.name}`, 'success')
    } catch (error) {
      console.error('Errore invio email milestone:', error)
      await saveEmailLog('milestone', [customer], `Milestone ${milestoneReached} GEMME`, 'failed')
    }
  }

  // TODO 3: Carica tutti i clienti per selezione individuale
  const loadAllCustomersForEmail = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .not('email', 'is', null)
        .order('name')

      if (data) {
        setAllCustomersForEmail(data)
      }
    } catch (error) {
      console.error('Errore caricamento clienti per email:', error)
    }
  }

  // TODO 3: Toggle selezione cliente individuale
  const toggleIndividualCustomer = (customerId) => {
    setSelectedIndividualCustomers(prev => {
      if (prev.includes(customerId)) {
        return prev.filter(id => id !== customerId)
      } else {
        return [...prev, customerId]
      }
    })
  }

  // TODO 3: Seleziona/Deseleziona tutti i clienti
  const toggleAllCustomers = () => {
    if (selectedIndividualCustomers.length === allCustomersForEmail.length) {
      setSelectedIndividualCustomers([])
    } else {
      setSelectedIndividualCustomers(allCustomersForEmail.map(c => c.id))
    }
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
    loadEmailStats()
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

  // Template Email HTML AGGIORNATI con GEMME
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
                  <li>🛍️ <strong>1€ speso = 1 GEMMA guadagnata</strong></li>
                  <li>🎁 <strong>Accumula GEMME e riscatta premi esclusivi</strong></li>
                  <li>✨ <strong>Offerte speciali riservate ai membri VIP</strong></li>
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
        subject: `Hai raggiunto ${customMsg} GEMME! 🔥`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);">
            <div style="padding: 40px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Congratulazioni ${customerName}! 🎉</h1>
              <p style="color: #fecaca; font-size: 18px;">Hai raggiunto ${customMsg} GEMME fedeltà!</p>
            </div>
            <div style="background: white; padding: 40px; margin: 0 20px; border-radius: 10px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; width: 120px; height: 120px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold; box-shadow: 0 8px 25px rgba(220, 38, 38, 0.4);">
                  ${customMsg}
                </div>
              </div>
              <h2 style="color: #333; text-align: center;">Le tue GEMME crescono! 📈</h2>
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
                ${customMessage || 'Approfitta di questa offerta esclusiva valida fino alla fine del mese!'}
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

  // TODO 3: Funzione invio email AGGIORNATA con selezione individuale
  const sendEmail = async () => {
    if (!emailSubject) {
      showNotification('Inserisci l\'oggetto dell\'email', 'error')
      return
    }

    try {
      let recipients = []
      
      if (emailRecipients === 'individual' && selectedIndividualCustomers.length > 0) {
        recipients = allCustomersForEmail.filter(c => 
          selectedIndividualCustomers.includes(c.id) && c.email
        )
      } else {
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
      }

      if (recipients.length === 0) {
        showNotification('Nessun destinatario trovato per i criteri selezionati', 'error')
        return
      }

      showNotification(`Invio ${recipients.length} email in corso...`, 'info')

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

      await Promise.all(emailPromises)

      await saveEmailLog(emailTemplate, recipients, emailSubject, 'sent')
      await loadEmailStats()

      if (successCount === recipients.length) {
        showNotification(`🎉 Tutte le ${successCount} email inviate con successo!`, 'success')
      } else {
        showNotification(`⚠️ ${successCount}/${recipients.length} email inviate correttamente`, 'info')
      }

      setEmailSubject('')
      setCustomMessage('')
      setSelectedIndividualCustomers([])

    } catch (error) {
      console.log('Errore invio email:', error)
      await saveEmailLog(emailTemplate, [], emailSubject, 'failed')
      showNotification('Errore nell\'invio delle email', 'error')
    }
  }

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

  // TODO 2: Modifica punti manualmente CON email automatica milestone
  const modifyPoints = async (customer, pointsToAdd) => {
    const points = parseInt(pointsToAdd)
    if (isNaN(points) || points === 0) {
      showNotification('Inserisci un numero valido di GEMME', 'error')
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

      if (points > 0 && (newPoints === 50 || newPoints === 100 || newPoints === 150)) {
        await sendPointsMilestoneEmail(customer, newPoints)
      }

      loadTodayStats()
      loadTopCustomers()
      searchCustomersForManual(manualCustomerName)
      
      if (selectedCustomer && selectedCustomer.id === customer.id) {
        setSelectedCustomer({ ...selectedCustomer, points: newPoints })
      }
      
      setManualPoints('')
      showNotification(`${points > 0 ? 'Aggiunte' : 'Rimosse'} ${Math.abs(points)} GEMME a ${customer.name}`)
    } catch (error) {
      console.log('Errore modifica GEMME:', error)
      showNotification('Errore nella modifica GEMME', 'error')
    }
  }

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

  // TODO 1: Crea nuovo cliente CON email benvenuto automatica
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
        
        // TODO 1: Invia email di benvenuto automatica
        if (data[0].email) {
          await sendWelcomeEmail(data[0])
        }
        
        showNotification(`Cliente ${data[0].name} creato con successo! 👤`)
      }
      loadTodayStats()
    } catch (error) {
      console.log('Errore creazione cliente:', error)
      showNotification('Errore: probabilmente il telefono è già registrato', 'error')
    }
  }

  // TODO 2: Aggiungi transazione CON email automatica milestone
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

      // TODO 2: Controlla milestone email automatiche
      if (pointsEarned > 0 && (newPoints === 50 || newPoints === 100 || newPoints === 150)) {
        await sendPointsMilestoneEmail(selectedCustomer, newPoints)
      }

      setSelectedCustomer({ ...selectedCustomer, points: newPoints })
      setTransactionAmount('')
      showNotification(`+${pointsEarned} GEMME guadagnate! 🔥`)
      loadTodayStats()
    } catch (error) {
      console.log('Errore transazione:', error)
      showNotification('Errore nella registrazione della transazione', 'error')
    }
  }

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

  // MENU ITEMS CONFIGURATION
  const menuItems = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: '📊',
      description: 'Panoramica generale'
    },
    {
      id: 'customer',
      title: 'Clienti',
      icon: '👥',
      description: 'Gestione clienti e vendite'
    },
    {
      id: 'prizes',
      title: 'Premi',
      icon: '🎁',
      description: 'Catalogo premi'
    },
    {
      id: 'email',
      title: 'Email Marketing',
      icon: '📧',
      description: 'Campagne email'
    },
    {
      id: 'analytics',
      title: 'Analytics',
      icon: '📈',
      description: 'Statistiche avanzate'
    },
    {
      id: 'settings',
      title: 'Impostazioni',
      icon: '⚙️',
      description: 'Configurazione sistema'
    }
  ]

  // RENDER CONTENT BASED ON ACTIVE VIEW
  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />
      case 'customer':
        return <CustomerView />
      case 'prizes':
        return <PrizesView />
      case 'email':
        return <EmailView />
      case 'analytics':
        return <AnalyticsView />
      case 'settings':
        return <SettingsView />
      default:
        return <DashboardView />
    }
  }

  // DASHBOARD VIEW COMPONENT
  const DashboardView = () => (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Panoramica generale del sistema</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-number">{todayStats.customers}</div>
            <div className="stat-label">Clienti Oggi</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <span className="gemma-icon-medium"></span>
          </div>
          <div className="stat-content">
            <div className="stat-number">{todayStats.points}</div>
            <div className="stat-label">GEMME Distribuite</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🎁</div>
          <div className="stat-content">
            <div className="stat-number">{todayStats.redeems}</div>
            <div className="stat-label">Premi Riscattati</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-number">€{todayStats.revenue.toFixed(2)}</div>
            <div className="stat-label">Fatturato Oggi</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>📈 Top Clienti</h3>
          <div className="top-customers">
            {topCustomers.length > 0 ? (
              topCustomers.map((customer, index) => (
                <div key={customer.id} className="customer-rank">
                  <span className="rank-number">{index + 1}</span>
                  <span className="customer-name">{customer.name}</span>
                  <span className="customer-points">
                    <span className="gemma-icon-tiny"></span>{customer.points} GEMME
                  </span>
                </div>
              ))
            ) : (
              <div className="empty-state">Nessun cliente ancora</div>
            )}
          </div>
        </div>

        <div className="dashboard-card">
          <h3>📧 Email Stats</h3>
          <div className="email-stats">
            <div className="email-stat">
              <div className="email-stat-number">{emailStats.sent}</div>
              <div className="email-stat-label">Email Inviate</div>
            </div>
            <div className="email-stat">
              <div className="email-stat-number">{emailStats.opened}</div>
              <div className="email-stat-label">Email Aperte</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // CUSTOMER VIEW COMPONENT
  const CustomerView = () => (
    <div className="customer-container">
      <div className="customer-header">
        <h1>Gestione Clienti</h1>
        <p>Cerca clienti, aggiungi vendite e gestisci GEMME</p>
      </div>

      <div className="customer-search">
        <input
          type="text"
          placeholder="🔍 Cerca cliente per nome o telefono..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {customers.length > 0 && (
        <div className="customers-grid">
          {customers.map((customer) => (
            <div 
              key={customer.id} 
              className={`customer-card ${selectedCustomer?.id === customer.id ? 'selected' : ''}`}
              onClick={() => setSelectedCustomer(customer)}
            >
              <div className="customer-info">
                <h4>{customer.name}</h4>
                <p className="customer-phone">{customer.phone}</p>
                {customer.email && <p className="customer-email">📧 {customer.email}</p>}
              </div>
              <div className="customer-points">
                <span className="gemma-icon-small"></span>
                <span className="points-count">{customer.points}</span>
                <span className="points-label">GEMME</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="new-customer-section">
        <h3>➕ Nuovo Cliente</h3>
        <div className="new-customer-form">
          <input
            type="text"
            placeholder="Nome completo"
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
            placeholder="Email (opzionale - per email automatiche)"
            value={newCustomerEmail}
            onChange={(e) => setNewCustomerEmail(e.target.value)}
          />
          <button onClick={createCustomer} className="btn-primary">
            Crea Cliente
          </button>
        </div>
      </div>

      {selectedCustomer && (
        <div className="selected-customer-section">
          <div className="customer-detail-card">
            <div className="customer-avatar">
              <span className="avatar-initial">{selectedCustomer.name.charAt(0)}</span>
            </div>
            <div className="customer-details">
              <h2>{selectedCustomer.name}</h2>
              <div className="customer-gemme">
                <span className="gemma-icon-large"></span>
                <span className="gemme-count">{selectedCustomer.points}</span>
                <span className="gemme-label">GEMME</span>
              </div>
              {selectedCustomer.email && (
                <p className="customer-contact">📧 {selectedCustomer.email}</p>
              )}
            </div>
          </div>

          <div className="transaction-section">
            <h3>💰 Nuova Vendita</h3>
            <div className="quick-amounts">
              <button onClick={() => setTransactionAmount('2.25')}>Pane 500g - €2,25</button>
              <button onClick={() => setTransactionAmount('4.50')}>Pane 1kg - €4,50</button>
              <button onClick={() => setTransactionAmount('1.80')}>Cornetto - €1,80</button>
              <button onClick={() => setTransactionAmount('3.50')}>Focaccia - €3,50</button>
            </div>
            <div className="amount-input">
              <input
                type="number"
                placeholder="Importo €"
                value={transactionAmount}
                onChange={(e) => setTransactionAmount(e.target.value)}
                step="0.01"
              />
              <button onClick={addTransaction} className="btn-primary">
                Registra Vendita
              </button>
            </div>
          </div>

          <div className="prizes-section">
            <h3>🎁 Riscatta Premi</h3>
            <div className="prizes-grid">
              {prizes.map((prize) => (
                <div key={prize.id} className="prize-card">
                  <div className="prize-info">
                    <h4>{prize.name}</h4>
                    <p>{prize.description}</p>
                    <div className="prize-cost">
                      <span className="gemma-icon-small"></span>
                      {prize.points_cost} GEMME
                    </div>
                  </div>
                  <button 
                    onClick={() => redeemPrize(prize)}
                    className={`btn-redeem ${selectedCustomer.points < prize.points_cost ? 'disabled' : ''}`}
                    disabled={selectedCustomer.points < prize.points_cost}
                  >
                    {selectedCustomer.points >= prize.points_cost ? 'Riscatta' : 'GEMME insufficienti'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="manual-points-section">
        <h3>🔧 Gestione Manuale GEMME</h3>
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
        </div>
        
        {foundCustomers.length > 0 && (
          <div className="found-customers">
            {foundCustomers.map((customer) => (
              <div key={customer.id} className="found-customer-item">
                <div className="customer-info">
                  <strong>{customer.name}</strong>
                  <span className="customer-points">
                    <span className="gemma-icon-tiny"></span>{customer.points} GEMME
                  </span>
                  <small>{customer.phone}</small>
                  {customer.email && <small>• {customer.email}</small>}
                </div>
                <div className="points-controls">
                  <input 
                    type="number" 
                    placeholder="±GEMME"
                    value={manualPoints}
                    onChange={(e) => setManualPoints(e.target.value)}
                  />
                  <button 
                    onClick={() => modifyPoints(customer, manualPoints)}
                    className="btn-primary"
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
  )

  // PRIZES VIEW COMPONENT
  const PrizesView = () => (
    <div className="prizes-container">
      <div className="prizes-header">
        <h1>Gestione Premi</h1>
        <p>Crea e gestisci il catalogo premi</p>
      </div>

      <div className="add-prize-section">
        <h3>➕ Aggiungi Nuovo Premio</h3>
        <div className="add-prize-form">
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
            placeholder="Costo in GEMME"
            value={newPrizeCost}
            onChange={(e) => setNewPrizeCost(e.target.value)}
            min="1"
          />
          <button onClick={addPrize} className="btn-primary">
            Aggiungi Premio
          </button>
        </div>
      </div>

      <div className="current-prizes-section">
        <h3>🎁 Premi Attivi</h3>
        <div className="prizes-management-grid">
          {prizes.map((prize) => (
            <div key={prize.id} className="prize-management-card">
              <div className="prize-content">
                <h4>{prize.name}</h4>
                <p>{prize.description}</p>
                <div className="prize-cost">
                  <span className="gemma-icon-small"></span>
                  {prize.points_cost} GEMME
                </div>
              </div>
              <div className="prize-actions">
                <button 
                  onClick={() => deletePrize(prize.id)}
                  className="btn-danger"
                >
                  Elimina
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // EMAIL VIEW COMPONENT
  const EmailView = () => (
    <div className="email-container">
      <div className="email-header">
        <h1>Email Marketing</h1>
        <p>Campagne email automatiche e manuali</p>
      </div>

      <div className="email-stats-section">
        <div className="email-stats-grid">
          <div className="email-stat-card">
            <div className="stat-icon">📧</div>
            <div className="stat-content">
              <div className="stat-number">{emailStats.sent}</div>
              <div className="stat-label">Email Inviate</div>
            </div>
          </div>
          <div className="email-stat-card">
            <div className="stat-icon">📖</div>
            <div className="stat-content">
              <div className="stat-number">{emailStats.opened}</div>
              <div className="stat-label">Email Aperte</div>
            </div>
          </div>
        </div>
      </div>

      <div className="email-automation-info">
        <h3>✨ Email Automatiche Attive</h3>
        <div className="automation-cards">
          <div className="automation-card">
            <div className="automation-icon">🎉</div>
            <div className="automation-content">
              <h4>Benvenuto</h4>
              <p>Invio automatico alla creazione cliente con email</p>
            </div>
          </div>
          <div className="automation-card">
            <div className="automation-icon">
              <span className="gemma-icon-small"></span>
            </div>
            <div className="automation-content">
              <h4>50 GEMME</h4>
              <p>Email "Congratulazioni" automatica</p>
            </div>
          </div>
          <div className="automation-card">
            <div className="automation-icon">⭐</div>
            <div className="automation-content">
              <h4>100 GEMME</h4>
              <p>Email "Cliente VIP" automatica</p>
            </div>
          </div>
          <div className="automation-card">
            <div className="automation-icon">🚀</div>
            <div className="automation-content">
              <h4>150 GEMME</h4>
              <p>Email "Incredibile" automatica</p>
            </div>
          </div>
        </div>
      </div>

      <div className="email-composer-section">
        <h3>📝 Componi Email Manuale</h3>
        <div className="email-composer">
          <div className="composer-settings">
            <div className="setting-row">
              <label>Template:</label>
              <select 
                value={emailTemplate} 
                onChange={(e) => setEmailTemplate(e.target.value)}
              >
                <option value="welcome">🎉 Benvenuto</option>
                <option value="points">🔥 GEMME Raggiunte</option>
                <option value="promo">🔥 Promozione</option>
              </select>
            </div>
            
            <div className="setting-row">
              <label>Destinatari:</label>
              <select 
                value={emailRecipients} 
                onChange={(e) => {
                  setEmailRecipients(e.target.value)
                  if (e.target.value === 'individual') {
                    setShowIndividualSelection(true)
                    loadAllCustomersForEmail()
                  } else {
                    setShowIndividualSelection(false)
                  }
                }}
              >
                <option value="all">Tutti i Clienti</option>
                <option value="top">Top Clienti (50+ GEMME)</option>
                <option value="active">Clienti Attivi</option>
                <option value="inactive">Clienti Inattivi</option>
                <option value="individual">🆕 Selezione Individuale</option>
              </select>
            </div>
          </div>

          {showIndividualSelection && (
            <div className="individual-selection">
              <h4>🎯 Seleziona Clienti Specifici</h4>
              
              <div className="selection-controls">
                <button 
                  onClick={toggleAllCustomers}
                  className="btn-secondary"
                >
                  {selectedIndividualCustomers.length === allCustomersForEmail.length ? 'Deseleziona Tutti' : 'Seleziona Tutti'}
                </button>
                <span className="selection-count">
                  {selectedIndividualCustomers.length} di {allCustomersForEmail.length} clienti selezionati
                </span>
              </div>
              
              <div className="customers-selection-list">
                {allCustomersForEmail.map((customer) => (
                  <div 
                    key={customer.id}
                    className={`customer-selection-item ${selectedIndividualCustomers.includes(customer.id) ? 'selected' : ''}`}
                    onClick={() => toggleIndividualCustomer(customer.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIndividualCustomers.includes(customer.id)}
                      onChange={() => toggleIndividualCustomer(customer.id)}
                    />
                    <div className="customer-selection-info">
                      <strong>{customer.name}</strong>
                      <span className="customer-points">
                        <span className="gemma-icon-tiny"></span>{customer.points} GEMME
                      </span>
                      <small>{customer.email}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="composer-inputs">
            <input
              type="text"
              placeholder="Oggetto email..."
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="subject-input"
            />

            <textarea
              placeholder="Messaggio personalizzato (opzionale)..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="message-input"
            />

            <button onClick={sendEmail} className="btn-send-email">
              📧 INVIA EMAIL
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ANALYTICS VIEW COMPONENT
  const AnalyticsView = () => (
    <div className="analytics-container">
      <div className="analytics-header">
        <h1>Analytics Avanzate</h1>
        <p>Statistiche dettagliate e insights</p>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <h3>📊 Statistiche Generali</h3>
          <div className="analytics-stats">
            <div className="analytics-stat">
              <span className="stat-label">Clienti Totali</span>
              <span className="stat-value">{topCustomers.length > 0 ? '5+' : '0'}</span>
            </div>
            <div className="analytics-stat">
              <span className="stat-label">GEMME Totali</span>
              <span className="stat-value">
                <span className="gemma-icon-tiny"></span>
                {topCustomers.reduce((sum, c) => sum + c.points, 0)}
              </span>
            </div>
            <div className="analytics-stat">
              <span className="stat-label">Premi Attivi</span>
              <span className="stat-value">{prizes.length}</span>
            </div>
          </div>
        </div>

        <div className="analytics-card">
          <h3>📈 Trend Oggi</h3>
          <div className="trend-stats">
            <div className="trend-item">
              <span className="trend-label">Fatturato</span>
              <span className="trend-value">€{todayStats.revenue.toFixed(2)}</span>
              <span className="trend-change positive">+12%</span>
            </div>
            <div className="trend-item">
              <span className="trend-label">GEMME Distribuite</span>
              <span className="trend-value">
                <span className="gemma-icon-tiny"></span>
                {todayStats.points}
              </span>
              <span className="trend-change positive">+8%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // SETTINGS VIEW COMPONENT
  const SettingsView = () => (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Impostazioni Sistema</h1>
        <p>Configurazione generale</p>
      </div>

      <div className="settings-section">
        <h3>⚙️ Configurazione GEMME</h3>
        <div className="settings-form">
          <div className="setting-item">
            <label>
              <span className="gemma-icon-small"></span>
              GEMME per ogni €1 speso:
            </label>
            <input 
              type="number" 
              value={settings.points_per_euro} 
              onChange={(e) => setSettings({...settings, points_per_euro: parseInt(e.target.value)})}
              min="1" 
              max="10" 
            />
          </div>
          <div className="setting-item">
            <label>
              <span className="gemma-icon-small"></span>
              GEMME necessarie per premio base:
            </label>
            <input 
              type="number" 
              value={settings.points_for_prize} 
              onChange={(e) => setSettings({...settings, points_for_prize: parseInt(e.target.value)})}
              min="5" 
              max="100" 
            />
          </div>
          <button className="btn-primary" onClick={saveSettings}>
            Salva Configurazione
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h3>📧 Configurazione Email</h3>
        <div className="email-config">
          <div className="config-info">
            <p><strong>Service ID:</strong> {EMAIL_CONFIG.serviceId}</p>
            <p><strong>Template ID:</strong> {EMAIL_CONFIG.templateId}</p>
            <p><strong>Status:</strong> <span className="status-active">Attivo ✅</span></p>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>🔄 Azioni Sistema</h3>
        <div className="system-actions">
          <button 
            onClick={() => window.location.reload()}
            className="btn-secondary"
          >
            🔄 Ricarica Dati
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="app-container">
      <NotificationContainer />
      
      {/* SIDEBAR MENU */}
      <div className="sidebar">
        <div className="sidebar-header">
          <img 
            src="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png" 
            alt="Sapori e Colori Logo" 
            className="sidebar-logo"
          />
          <h2>Sapori & Colori</h2>
          <p>Sistema <span className="gemma-icon-small"></span>GEMME</p>
        </div>
        
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeView === item.id ? 'active' : ''}`}
              onClick={() => setActiveView(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <div className="nav-content">
                <span className="nav-title">{item.title}</span>
                <span className="nav-description">{item.description}</span>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* MAIN CONTENT */}
      <div className="main-content">
        {renderContent()}
      </div>
    </div>
  )
}

export default App