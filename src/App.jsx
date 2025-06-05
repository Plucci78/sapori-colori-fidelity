import { useState, useEffect, useCallback, memo } from 'react'
import { supabase } from './supabase'
import emailjs from '@emailjs/browser'
import './App.css'

// Import dei componenti
import NotificationContainer from './components/Common/NotificationContainer'
import DashboardView from './components/Dashboard/DashboardView'
import CustomerView from './components/Customers/CustomerView'
import EmailView from './components/Email/EmailView'
import PrizesView from './components/Prizes/PrizesView'
import AnalyticsView from './components/Analytics/AnalyticsView'
import SettingsView from './components/Settings/SettingsView'
import NFCView from './components/NFC/NFCView'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [allCustomers, setAllCustomers] = useState([]) // <-- AGGIUNTO
  const [customers, setCustomers] = useState([])

  useEffect(() => {
    // Carica tutti i clienti solo una volta all'avvio
    const loadAllCustomers = async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
      if (data) {
        setAllCustomers(data)      // <-- AGGIUNTO
        setCustomers(data)         // <-- Mostra tutti i clienti di default
      }
    }
    loadAllCustomers()
  }, [])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerEmail, setNewCustomerEmail] = useState('')
  const [transactionAmount, setTransactionAmount] = useState('')
  const [settings, setSettings] = useState({ points_per_euro: 1, points_for_prize: 10 })
  const [activeView, setActiveView] = useState('dashboard')

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

  // Stati per selezione clienti individuali
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
  const showNotification = useCallback((message, type = 'success') => {
    const id = Date.now()
    const notification = { id, message, type }
    setNotifications(prev => [...prev, notification])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 4000)
  }, [])

  // [... RESTO DELLE FUNZIONI ESISTENTI ...]
  // (Le funzioni email, database, etc. rimangono identiche)

  // MENU ITEMS CONFIGURATION - ICONE SVG PROFESSIONALI
  const menuItems = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      description: 'Panoramica generale'
    },
    {
      id: 'customer',
      title: 'Clienti',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      description: 'Gestione clienti e vendite'
    },
    {
      id: 'prizes',
      title: 'Premi',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      description: 'Catalogo premi'
    },
    {
      id: 'email',
      title: 'Email Marketing',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
        </svg>
      ),
      description: 'Campagne email'
    },
    {
      id: 'analytics',
      title: 'Analytics',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      description: 'Statistiche avanzate'
    },
    {
      id: 'nfc',
      title: 'NFC',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      description: 'Gestione tag NFC'
    },
    {
      id: 'settings',
      title: 'Impostazioni',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      description: 'Configurazione sistema'
    }
  ]

  // [... RESTO DELLE FUNZIONI BUSINESS LOGIC ...]
  // Funzione per salvare statistiche email nel database
  const saveEmailLog = useCallback(async (emailType, recipients, subject, status) => {
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
  }, [])

  // Carica statistiche email dal database
  const loadEmailStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .gte('sent_at', today + 'T00:00:00')
        .lte('sent_at', today + 'T23:59:59')

      if (data) {
        const totalSent = data.reduce((sum, log) => sum + log.recipients_count, 0)
        setEmailStats({
          sent: totalSent,
          opened: 0 // vedi sotto per il tasso di apertura
        })
      }
    } catch (error) {
      console.error('Errore caricamento statistiche email:', error)
    }
  }, [])

  // Template Email HTML AGGIORNATI con GEMME
  const getEmailTemplate = useCallback((type, customerName, customMsg = '') => {
    const templates = {
      welcome: {
        subject: `Benvenuto in Sapori & Colori, ${customerName}!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%);">
            <div style="padding: 40px; text-align: center;">
              <img src="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png" alt="Sapori & Colori" style="max-width: 200px; margin-bottom: 20px;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Benvenuto ${customerName}!</h1>
            </div>
            <div style="background: white; padding: 40px; margin: 0 20px; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
              <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Il tuo viaggio nei sapori inizia qui!</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Grazie per esserti unito alla famiglia Sapori & Colori! Ora fai parte del nostro esclusivo programma fedeltà.
              </p>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #ff7e5f; margin-top: 0;">Come funziona:</h3>
                <ul style="color: #666; line-height: 1.8;">
                  <li><strong>1€ speso = 1 GEMMA guadagnata</strong></li>
                  <li><strong>Accumula GEMME e riscatta premi esclusivi</strong></li>
                  <li><strong>Offerte speciali riservate ai membri VIP</strong></li>
                </ul>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="background: linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">Vieni a trovarci!</a>
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
        subject: `Hai raggiunto ${customMsg} GEMME!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);">
            <div style="padding: 40px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Congratulazioni ${customerName}!</h1>
              <p style="color: #fecaca; font-size: 18px;">Hai raggiunto ${customMsg} GEMME fedeltà!</p>
            </div>
            <div style="background: white; padding: 40px; margin: 0 20px; border-radius: 10px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; width: 120px; height: 120px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold; box-shadow: 0 8px 25px rgba(220, 38, 38, 0.4);">
                  ${customMsg}
                </div>
              </div>
              <h2 style="color: #333; text-align: center;">Le tue GEMME crescono!</h2>
              <p style="color: #666; text-align: center; font-size: 16px;">
                Continua così! Sei sempre più vicino ai nostri premi esclusivi.
              </p>
            </div>
          </div>
        `
      },
      promo: {
        subject: `Offerta Speciale per te, ${customerName}!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
            <div style="padding: 40px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 32px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">OFFERTA SPECIALE</h1>
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
                <a href="#" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 18px; display: inline-block;">Vieni ora!</a>
              </div>
            </div>
          </div>
        `
      }
    }
    return templates[type]
  }, [customMessage])

  // Funzione automatica per email di benvenuto
  const sendWelcomeEmail = useCallback(async (customer) => {
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
      showNotification(`Email di benvenuto inviata a ${customer.name}!`, 'success')
    } catch (error) {
      console.error('Errore invio email benvenuto:', error)
      await saveEmailLog('welcome', [customer], 'Benvenuto', 'failed')
    }
  }, [getEmailTemplate, saveEmailLog, showNotification, EMAIL_CONFIG])

  // Funzione automatica per email milestone gemme
  const sendPointsMilestoneEmail = useCallback(async (customer, points) => {
    if (!customer.email) return

    let milestoneReached = null
    let emailTitle = ''

    if (points === 50) {
      milestoneReached = '50'
      emailTitle = 'Congratulazioni!'
    } else if (points === 100) {
      milestoneReached = '100'
      emailTitle = 'Cliente VIP!'
    } else if (points === 150) {
      milestoneReached = '150'
      emailTitle = 'Incredibile!'
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
  }, [getEmailTemplate, saveEmailLog, showNotification, EMAIL_CONFIG])

  // Carica impostazioni e premi
  useEffect(() => {
    loadSettings()
    loadPrizes()
    loadTodayStats()
    loadTopCustomers()
    loadEmailStats()
  }, [loadEmailStats])

  const loadSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single()

      if (data) setSettings(data)
    } catch (error) {
      console.log('Errore caricamento impostazioni:', error)
    }
  }, [])

  const loadPrizes = useCallback(async () => {
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
  }, [])

  const loadTodayStats = useCallback(async () => {
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
  }, [])

  const loadTopCustomers = useCallback(async () => {
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
  }, [])

  // Carica tutti i clienti per selezione individuale
  const loadAllCustomersForEmail = useCallback(async () => {
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
  }, [])

  // Toggle selezione cliente individuale
  const toggleIndividualCustomer = useCallback((customerId) => {
    setSelectedIndividualCustomers(prev => {
      if (prev.includes(customerId)) {
        return prev.filter(id => id !== customerId)
      } else {
        return [...prev, customerId]
      }
    })
  }, [])

  // Seleziona/Deseleziona tutti i clienti
  const toggleAllCustomers = useCallback(() => {
    if (selectedIndividualCustomers.length === allCustomersForEmail.length) {
      setSelectedIndividualCustomers([])
    } else {
      setSelectedIndividualCustomers(allCustomersForEmail.map(c => c.id))
    }
  }, [selectedIndividualCustomers.length, allCustomersForEmail])

  // Funzione invio email AGGIORNATA con selezione individuale
  const sendEmail = useCallback(async ({ subject, content, template }) => {
    if (!subject.trim()) {
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
          // Sostituzione variabili nel subject e nel content
          let personalizedSubject = subject
            .replace(/{{nome}}/g, customer.name)
            .replace(/{{gemme}}/g, customer.points)
            .replace(/{{email}}/g, customer.email)
            .replace(/{{telefono}}/g, customer.phone || '')
            .replace(/{{negozio}}/g, 'Sapori & Colori')
            .replace(/{{data}}/g, new Date().toLocaleDateString('it-IT'))

          let personalizedContent = content
            .replace(/{{nome}}/g, customer.name)
            .replace(/{{gemme}}/g, customer.points)
            .replace(/{{email}}/g, customer.email)
            .replace(/{{telefono}}/g, customer.phone || '')
            .replace(/{{negozio}}/g, 'Sapori & Colori')
            .replace(/{{data}}/g, new Date().toLocaleDateString('it-IT'))

          const templateParams = {
            to_name: customer.name,
            to_email: customer.email,
            subject: personalizedSubject,
            message_html: personalizedContent,
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

      await saveEmailLog(emailTemplate, recipients, subject, 'sent')
      await loadEmailStats()

      if (successCount === recipients.length) {
        showNotification(`Tutte le ${successCount} email inviate con successo!`, 'success')
      } else {
        showNotification(`${successCount}/${recipients.length} email inviate correttamente`, 'info')
      }

      setEmailSubject('')
      setCustomMessage('')
      setSelectedIndividualCustomers([])

    } catch (error) {
      console.log('Errore invio email:', error)
      await saveEmailLog(emailTemplate, [], subject, 'failed')
      showNotification('Errore nell\'invio delle email', 'error')
    }
  }, [
    emailRecipients,
    selectedIndividualCustomers,
    allCustomersForEmail,
    saveEmailLog,
    loadEmailStats,
    showNotification,
    EMAIL_CONFIG
  ])

  const searchCustomersForManual = useCallback(async (searchName) => {
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
  }, [])

  // Modifica punti manualmente CON email automatica milestone
  const modifyPoints = useCallback(async (customer, pointsToAdd) => {
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
  }, [sendPointsMilestoneEmail, loadTodayStats, loadTopCustomers, searchCustomersForManual, manualCustomerName, selectedCustomer, showNotification])

  const saveSettings = useCallback(async () => {
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
  }, [settings, showNotification])

  const addPrize = useCallback(async () => {
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
        showNotification('Premio aggiunto con successo!')
      }
    } catch (error) {
      console.log('Errore aggiunta premio:', error)
      showNotification('Errore nell\'aggiunta del premio', 'error')
    }
  }, [newPrizeName, newPrizeDescription, newPrizeCost, prizes, showNotification])

  const deletePrize = useCallback(async (prizeId) => {
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
  }, [prizes, showNotification])

  const searchCustomers = useCallback(async () => {
    if (searchTerm.length < 2) {
      setCustomers(allCustomers) // <-- Mostra tutti i clienti se la ricerca è vuota
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
  }, [searchTerm, allCustomers]) // <-- AGGIUNTO allCustomers tra le dipendenze

  useEffect(() => {
    searchCustomers()
  }, [searchCustomers])

  // Crea nuovo cliente CON email benvenuto automatica
  const createCustomer = useCallback(async () => {
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

        // Invia email di benvenuto automatica
        if (data[0].email) {
          await sendWelcomeEmail(data[0])
        }

        showNotification(`Cliente ${data[0].name} creato con successo!`)
      }
      loadTodayStats()
    } catch (error) {
      console.log('Errore creazione cliente:', error)
      showNotification('Errore: probabilmente il telefono è già registrato', 'error')
    }
  }, [newCustomerName, newCustomerPhone, newCustomerEmail, sendWelcomeEmail, loadTodayStats, showNotification])

  // Aggiungi transazione CON email automatica milestone
  const addTransaction = useCallback(async () => {
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

      // Controlla milestone email automatiche
      if (pointsEarned > 0 && (newPoints === 50 || newPoints === 100 || newPoints === 150)) {
        await sendPointsMilestoneEmail(selectedCustomer, newPoints)
      }

      setSelectedCustomer({ ...selectedCustomer, points: newPoints })
      setTransactionAmount('')
      showNotification(`+${pointsEarned} GEMME guadagnate!`)
      loadTodayStats()
    } catch (error) {
      console.log('Errore transazione:', error)
      showNotification('Errore nella registrazione della transazione', 'error')
    }
  }, [selectedCustomer, transactionAmount, settings.points_per_euro, sendPointsMilestoneEmail, loadTodayStats, showNotification])

  const redeemPrize = useCallback(async (prize) => {
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
      showNotification(`${prize.name} riscattato con successo!`)
      loadTodayStats()
    } catch (error) {
      console.log('Errore riscatto:', error)
      showNotification('Errore nel riscatto del premio', 'error')
    }
  }, [selectedCustomer, loadTodayStats, showNotification])

  // RENDER CONTENT BASED ON ACTIVE VIEW
  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView
          todayStats={todayStats}
          topCustomers={topCustomers}
          emailStats={emailStats}
        />
      case 'customer':
        return <CustomerView
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          customers={customers}
          selectedCustomer={selectedCustomer}
          setSelectedCustomer={setSelectedCustomer}
          newCustomerName={newCustomerName}
          setNewCustomerName={setNewCustomerName}
          newCustomerPhone={newCustomerPhone}
          setNewCustomerPhone={setNewCustomerPhone}
          newCustomerEmail={newCustomerEmail}
          setNewCustomerEmail={setNewCustomerEmail}
          createCustomer={createCustomer}
          transactionAmount={transactionAmount}
          setTransactionAmount={setTransactionAmount}
          addTransaction={addTransaction}
          prizes={prizes}
          redeemPrize={redeemPrize}
          manualCustomerName={manualCustomerName}
          setManualCustomerName={setManualCustomerName}
          searchCustomersForManual={searchCustomersForManual}
          foundCustomers={foundCustomers}
          manualPoints={manualPoints}
          setManualPoints={setManualPoints}
          modifyPoints={modifyPoints}
          showNotification={showNotification}
        />
      case 'prizes':
        return <PrizesView
          newPrizeName={newPrizeName}
          setNewPrizeName={setNewPrizeName}
          newPrizeDescription={newPrizeDescription}
          setNewPrizeDescription={setNewPrizeDescription}
          newPrizeCost={newPrizeCost}
          setNewPrizeCost={setNewPrizeCost}
          addPrize={addPrize}
          prizes={prizes}
          deletePrize={deletePrize}
        />
      case 'email':
        return <EmailView
          emailStats={emailStats}
          emailTemplate={emailTemplate}
          setEmailTemplate={setEmailTemplate}
          emailRecipients={emailRecipients}
          setEmailRecipients={setEmailRecipients}
          showIndividualSelection={showIndividualSelection}
          setShowIndividualSelection={setShowIndividualSelection}
          loadAllCustomersForEmail={loadAllCustomersForEmail}
          selectedIndividualCustomers={selectedIndividualCustomers}
          allCustomersForEmail={allCustomersForEmail}
          toggleAllCustomers={toggleAllCustomers}
          toggleIndividualCustomer={toggleIndividualCustomer}
          emailSubject={emailSubject}
          setEmailSubject={setEmailSubject}
          customMessage={customMessage}
          setCustomMessage={setCustomMessage}
          sendEmail={sendEmail}
          showNotification={showNotification}
          supabase={supabase}
          customers={allCustomers} // <-- PASSA allCustomers QUI!
        />
      case 'analytics':
        return <AnalyticsView
          todayStats={todayStats}
          topCustomers={topCustomers}
          prizes={prizes}
        />
      case 'nfc':
        return <NFCView showNotification={showNotification} />
      case 'settings':
        return <SettingsView
          settings={settings}
          setSettings={setSettings}
          saveSettings={saveSettings}
          EMAIL_CONFIG={EMAIL_CONFIG}
        />
      default:
        return <DashboardView
          todayStats={todayStats}
          topCustomers={topCustomers}
          emailStats={emailStats}
        />
    }
  }

  return (
    <div className="app-container">
      <NotificationContainer
        notifications={notifications}
        setNotifications={setNotifications}
      />

      {/* HAMBURGER BUTTON - SOLO MOBILE */}
      <button
        className="hamburger-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Apri menu"
      >
        <span className="hamburger-icon">☰</span>
      </button>

      {/* SIDEBAR MENU CON ICONE SVG PROFESSIONALI */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img
            src="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png"
            alt="Sapori e Colori Logo"
            className="sidebar-logo"
          />
          <h2>Sapori & Colori</h2>
          <p>Sistema GEMME</p>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeView === item.id ? 'active' : ''}`}
              onClick={() => {
                setActiveView(item.id)
                setSidebarOpen(false) // Chiude la sidebar su mobile
              }}
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