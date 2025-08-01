import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import NFCQuickReaderHybrid from '../NFC/NFCQuickReaderHybrid'
import './SubscriptionManager.css'

// Icone SVG Premium per Abbonamenti
const SubscriptionIcons = {
  Pizza: () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12,15L7.5,10.5L12,6L16.5,10.5L12,15M12,1L21,5V10.5L12,15.5L3,10.5V5L12,1M5.14,7L12,10.5L18.86,7L12,3.5L5.14,7Z"/>
    </svg>
  ),
  Coffee: () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2,21V19H20V21H2M20,8V5H18V8H20M20,3A2,2 0 0,1 22,5V8A2,2 0 0,1 20,10H18V13A4,4 0 0,1 14,17H8A4,4 0 0,1 4,13V3H20M16,5H6V13A2,2 0 0,0 8,15H14A2,2 0 0,0 16,13V5Z"/>
    </svg>
  ),
  Lunch: () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8.1,13.34L3.91,2.76C3.66,2.09 4.06,1.5 4.75,1.5H6.85C7.66,1.5 8.35,2.18 8.35,2.98V8.99C8.35,9.54 8.8,9.98 9.35,9.98H14.65C15.2,9.98 15.65,9.54 15.65,8.99V2.98C15.65,2.18 16.34,1.5 17.15,1.5H19.25C19.94,1.5 20.34,2.09 20.09,2.76L15.9,13.34C15.64,14.09 14.89,14.5 14.11,14.5H9.89C9.11,14.5 8.36,14.09 8.1,13.34M2,15.5V17.5H22V15.5H2M2,19.5V21.5H22V19.5H2Z"/>
    </svg>
  ),
  Family: () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16,4C18.2,4 20,5.8 20,8S18.2,12 16,12 12,10.2 12,8 13.8,4 16,4M16,14C20.4,14 24,15.8 24,18V20H8V18C8,15.8 11.6,14 16,14M8,4C10.2,4 12,5.8 12,8S10.2,12 8,12 4,10.2 4,8 5.8,4 8,4M8,14C12.4,14 16,15.8 16,18V20H0V18C0,15.8 3.6,14 8,14Z"/>
    </svg>
  ),
  Active: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#22c55e">
      <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
    </svg>
  ),
  Expiring: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b">
      <path d="M13,3A9,9 0 0,0 4,12H1L4.96,16.03L9,12H6A7,7 0 0,1 13,5A7,7 0 0,1 20,12A7,7 0 0,1 13,19C11.07,19 9.32,18.21 8.06,16.94L6.64,18.36C8.27,20 10.5,21 13,21A9,9 0 0,0 22,12A9,9 0 0,0 13,3Z"/>
    </svg>
  ),
  Expired: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#ef4444">
      <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
    </svg>
  )
}

const SubscriptionManager = ({ showNotification }) => {
  const [subscriptionPlans, setSubscriptionPlans] = useState([])
  const [customerSubscriptions, setCustomerSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [subscriptionToCancel, setSubscriptionToCancel] = useState(null)
  const [customers, setCustomers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  
  // Form per nuovo abbonamento
  const [newPlan, setNewPlan] = useState({
    name: '',
    description: '',
    price: '',
    duration_days: 30,
    max_usage: 1,
    icon: 'Pizza',
    savings_amount: ''
  })

  // Modal conferma attivazione
  const [showActivationModal, setShowActivationModal] = useState(false)
  const [activationData, setActivationData] = useState({
    planId: null,
    customerId: '',
    paymentMethod: 'cash',
    printReceipt: false
  })

  // Modal NFC Usa Abbonamento
  const [showNFCUseModal, setShowNFCUseModal] = useState(false)
  const [nfcFoundSubscription, setNfcFoundSubscription] = useState(null)
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState(null)

  // Piani abbonamento predefiniti (later from database)
  const defaultPlans = [
    {
      id: 'pizza-month',
      name: 'Pizza del Mese',
      description: '4 Pizze Grandi + 4 Bibite',
      price: 34.90,
      duration_days: 30,
      max_usage: 4,
      gradient: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
      icon: 'Pizza',
      savings: '€15.10',
      popular: true
    },
    {
      id: 'coffee-daily',
      name: 'Coffee Daily',
      description: 'Caffè + Brioche ogni giorno',
      price: 39.90,
      duration_days: 30,
      max_usage: 30,
      gradient: 'linear-gradient(135deg, #8b4513, #d2691e)',
      icon: 'Coffee',
      savings: '€20.10'
    },
    {
      id: 'lunch-business', 
      name: 'Lunch Business',
      description: 'Pranzo Lun-Ven completo',
      price: 79.90,
      duration_days: 30,
      max_usage: 22,
      gradient: 'linear-gradient(135deg, #2d3748, #4a5568)',
      icon: 'Lunch',
      savings: '€40.10',
      premium: true
    },
    {
      id: 'weekend-family',
      name: 'Weekend Family',
      description: 'Menu famiglia x4 weekend',
      price: 24.90,
      duration_days: 7,
      max_usage: 2,
      gradient: 'linear-gradient(135deg, #667eea, #764ba2)',
      icon: 'Family',
      savings: '€10.10'
    }
  ]

  useEffect(() => {
    loadSubscriptions()
  }, [])

  // Funzione per stampare ricevuta abbonamento
  const printSubscriptionReceipt = async (subscriptionData) => {
    const receiptData = {
      receiptType: 'subscription',
      orderId: `SUB-${subscriptionData.subscription.id}`,
      customer: subscriptionData.customer.name,
      operator: 'Sistema Abbonamenti',
      paymentMethod: subscriptionData.paymentMethod === 'cash' ? 'Contanti' : 'Bancomat/Carta',
      total: subscriptionData.plan.price.toFixed(2),
      subtotal: (subscriptionData.plan.price / 1.1).toFixed(2), // Assumendo IVA 10%
      tax: (subscriptionData.plan.price - (subscriptionData.plan.price / 1.1)).toFixed(2),
      items: [{
        name: `Abbonamento: ${subscriptionData.plan.name}`,
        quantity: 1,
        price: subscriptionData.plan.price.toFixed(2),
        description: subscriptionData.plan.description
      }],
      subscriptionDetails: {
        planName: subscriptionData.plan.name,
        description: subscriptionData.plan.description,
        maxUsage: subscriptionData.plan.max_usage,
        startDate: subscriptionData.subscription.start_date,
        endDate: subscriptionData.subscription.end_date,
        remainingUsage: subscriptionData.subscription.remaining_usage
      }
    }

    // Chiamata all'API di stampa
    const response = await fetch('/api/print/receipt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(receiptData)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Errore stampa ricevuta')
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || 'Stampa fallita')
    }

    return result
  }

  const loadSubscriptions = async () => {
    try {
      setLoading(true)
      
      // Load subscription plans from database
      const { data: plansData } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      
      if (plansData && plansData.length > 0) {
        // Convert database data to component format
        const formattedPlans = plansData.map(plan => ({
          id: plan.id,
          name: plan.name,
          description: plan.description,
          price: parseFloat(plan.price),
          duration_days: plan.duration_days,
          max_usage: plan.max_usage,
          gradient: plan.gradient_colors,
          icon: plan.icon_name,
          savings: `€${parseFloat(plan.savings_amount).toFixed(2)}`,
          popular: plan.is_popular,
          premium: plan.is_premium
        }))
        setSubscriptionPlans(formattedPlans)
      } else {
        // Use default plans if none in database
        setSubscriptionPlans(defaultPlans)
      }
      
      // Load customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name')
        .eq('is_active', true)
      
      console.log('Customers loaded:', customersData)
      if (customersError) console.error('Customers error:', customersError)
      
      setCustomers(customersData || [])
      
      // Load customer subscriptions from database
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('customer_subscriptions')
        .select(`
          id, start_date, end_date, status, remaining_usage, total_used, total_amount_paid, customer_id,
          customers(name),
          subscription_plans(name, description, max_usage, price)
        `)
        .eq('status', 'active')
        .order('start_date', { ascending: false })
      
      console.log('Subscriptions loaded:', subscriptionsData)
      console.log('Subscriptions error:', subscriptionsError)
      
      if (subscriptionsData && subscriptionsData.length > 0) {
        const formattedSubscriptions = subscriptionsData.map(sub => ({
          id: sub.id,
          customer_id: sub.customer_id,
          customer_name: sub.customers?.name || 'Cliente',
          plan: {
            name: sub.subscription_plans?.name || 'Piano',
            description: sub.subscription_plans?.description || '',
            price: parseFloat(sub.total_amount_paid || sub.subscription_plans?.price || 0),
            max_usage: sub.subscription_plans?.max_usage || 1,
            gradient: 'linear-gradient(135deg, #8B4513, #D4AF37)'
          },
          start_date: sub.start_date,
          end_date: sub.end_date,
          status: sub.status,
          remaining_usage: sub.remaining_usage,
          used_count: sub.total_used
        }))
        setCustomerSubscriptions(formattedSubscriptions)
      } else {
        // Se non ci sono dati dalla view, prova query diretta
        const { data: directSubscriptions } = await supabase
          .from('customer_subscriptions')
          .select(`
            id, start_date, end_date, status, remaining_usage, total_used, total_amount_paid,
            customers(name),
            subscription_plans(name, description, max_usage, price)
          `)
          .eq('status', 'active')
          .order('start_date', { ascending: false })
        
        console.log('Direct subscriptions:', directSubscriptions)
        
        if (directSubscriptions && directSubscriptions.length > 0) {
          const formattedDirectSubs = directSubscriptions.map(sub => ({
            id: sub.id,
            customer_name: sub.customers?.name || 'Cliente',
            plan: {
              name: sub.subscription_plans?.name || 'Piano',
              description: sub.subscription_plans?.description || '',
              price: parseFloat(sub.total_amount_paid || sub.subscription_plans?.price || 0),
              max_usage: sub.subscription_plans?.max_usage || 1,
              gradient: 'linear-gradient(135deg, #8B4513, #D4AF37)'
            },
            start_date: sub.start_date,
            end_date: sub.end_date,
            status: sub.status,
            remaining_usage: sub.remaining_usage,
            used_count: sub.total_used
          }))
          setCustomerSubscriptions(formattedDirectSubs)
        }
      }
    } catch (error) {
      console.error('Errore caricamento abbonamenti:', error)
      showNotification?.('Errore nel caricamento abbonamenti', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Crea nuovo piano abbonamento
  const createPlan = async () => {
    if (!newPlan.name || !newPlan.price) {
      showNotification?.('Nome e prezzo sono obbligatori', 'error')
      return
    }

    try {
      // Insert into database
      const { data, error } = await supabase
        .from('subscription_plans')
        .insert([{
          name: newPlan.name,
          description: newPlan.description,
          price: parseFloat(newPlan.price),
          duration_days: newPlan.duration_days,
          max_usage: newPlan.max_usage,
          gradient_colors: 'linear-gradient(135deg, #8B4513, #D4AF37)',
          icon_name: newPlan.icon,
          savings_amount: parseFloat(newPlan.savings_amount) || 0,
          is_popular: false,
          is_premium: false,
          is_active: true
        }])
        .select()

      if (error) throw error

      // Add to local state
      const planToAdd = {
        id: data[0].id,
        name: newPlan.name,
        description: newPlan.description,
        price: parseFloat(newPlan.price),
        duration_days: newPlan.duration_days,
        max_usage: newPlan.max_usage,
        gradient: 'linear-gradient(135deg, #8B4513, #D4AF37)',
        icon: newPlan.icon,
        savings: `€${parseFloat(newPlan.savings_amount) || 0}`,
        popular: false,
        premium: false
      }

      setSubscriptionPlans(prev => [...prev, planToAdd])
      setShowCreateModal(false)
      setNewPlan({
        name: '',
        description: '',
        price: '',
        duration_days: 30,
        max_usage: 1,
        icon: 'Pizza',
        savings_amount: ''
      })
      
      showNotification?.('✅ Piano abbonamento creato con successo!', 'success')
    } catch (error) {
      console.error('Errore creazione piano:', error)
      showNotification?.('Errore nella creazione del piano', 'error')
    }
  }

  // Apri modal conferma attivazione
  const openActivationModal = (planId) => {
    if (!selectedCustomer) {
      showNotification?.('Seleziona prima un cliente', 'error')
      return
    }

    setActivationData({
      planId: planId,
      customerId: selectedCustomer,
      paymentMethod: 'cash',
      printReceipt: false
    })
    setShowActivationModal(true)
  }

  // Conferma attivazione abbonamento
  const confirmActivation = async () => {
    try {
      const plan = subscriptionPlans.find(p => p.id === activationData.planId)
      const customer = customers.find(c => c.id === activationData.customerId)
      
      const startDate = new Date().toISOString().split('T')[0]
      const endDate = new Date(Date.now() + plan.duration_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      // Insert into database
      const { data, error } = await supabase
        .from('customer_subscriptions')
        .insert([{
          customer_id: activationData.customerId,
          plan_id: activationData.planId,
          start_date: startDate,
          end_date: endDate,
          status: 'active',
          remaining_usage: plan.max_usage,
          total_used: 0,
          total_amount_paid: plan.price,
          payment_method: activationData.paymentMethod
        }])
        .select()

      if (error) throw error

      // Add to local state
      const newSubscription = {
        id: data[0].id,
        customer_name: customer.name,
        plan: {
          name: plan.name,
          description: plan.description,
          price: plan.price,
          max_usage: plan.max_usage,
          gradient: plan.gradient
        },
        start_date: startDate,
        end_date: endDate,
        status: 'active',
        remaining_usage: plan.max_usage,
        used_count: 0
      }

      setCustomerSubscriptions(prev => [...prev, newSubscription])
      
      // Chiudi modal
      setShowActivationModal(false)
      setActivationData({
        planId: null,
        customerId: '',
        paymentMethod: 'cash',
        printReceipt: false
      })

      // Messaggio successo
      showNotification?.(`🎉 Abbonamento ${plan.name} attivato per ${customer.name}!`, 'success')

      // Gestione ricevuta
      if (activationData.printReceipt) {
        try {
          await printSubscriptionReceipt({
            customer: customer,
            plan: plan,
            subscription: newSubscription,
            paymentMethod: activationData.paymentMethod
          })
          showNotification?.('📄 Ricevuta stampata con successo!', 'success')
        } catch (printError) {
          console.error('Errore stampa ricevuta:', printError)
          showNotification?.('⚠️ Abbonamento attivato ma errore stampa ricevuta', 'warning')
        }
      } else {
        showNotification?.('📋 Ricevuta disponibile nella tabella ricevute', 'info')
      }

    } catch (error) {
      console.error('Errore attivazione abbonamento:', error)
      showNotification?.('Errore nell\'attivazione dell\'abbonamento', 'error')
    }
  }

  const getStatusIcon = (status) => {
    switch(status) {
      case 'active': return <SubscriptionIcons.Active />
      case 'expiring': return <SubscriptionIcons.Expiring />
      case 'expired': return <SubscriptionIcons.Expired />
      default: return <SubscriptionIcons.Active />
    }
  }

  const getDaysRemaining = (endDate) => {
    const end = new Date(endDate)
    const now = new Date()
    const diffTime = end - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  // Usa abbonamento (decrementa utilizzi)
  const handleUseSubscription = async (subscriptionId) => {
    try {
      const subscription = customerSubscriptions.find(s => s.id === subscriptionId)
      
      if (!subscription) {
        showNotification?.('Abbonamento non trovato', 'error')
        return
      }

      if (subscription.remaining_usage <= 0) {
        showNotification?.('❌ Abbonamento esaurito! Nessun utilizzo rimanente', 'error')
        return
      }

      if (subscription.status !== 'active') {
        showNotification?.('❌ Abbonamento non attivo', 'error')
        return
      }

      // Effetto accensione LED quando si usa abbonamento
      const cardElement = document.querySelector(`[data-subscription-id="${subscriptionId}"]`)
      if (cardElement) {
        // Trova il bollino che si sta per accendere
        const usedCount = subscription.used_count
        const bollini = cardElement.querySelectorAll('.bollino')
        if (bollini[usedCount]) {
          bollini[usedCount].classList.add('bollino-lighting-up')
          setTimeout(() => {
            bollini[usedCount].classList.remove('bollino-lighting-up')
          }, 1500)
        }
      }

      const statusMessage = subscription.remaining_usage - 1 > 0 
        ? `💡 Bollino acceso! Rimangono ${subscription.remaining_usage - 1} utilizzi`
        : '🔥 Tutti i bollini sono accesi!'

      // Insert usage record in database
      const { error: usageError } = await supabase
        .from('subscription_usage')
        .insert([{
          subscription_id: subscriptionId,
          used_date: new Date().toISOString().split('T')[0],
          product_used: subscription.plan.name,
          original_price: subscription.plan.price / subscription.plan.max_usage,
          amount_saved: subscription.plan.price / subscription.plan.max_usage,
          staff_member: 'Staff',
          notes: 'Utilizzo abbonamento dal sistema'
        }])

      if (usageError) throw usageError

      // Update local state
      setCustomerSubscriptions(prev => 
        prev.map(sub => 
          sub.id === subscriptionId 
            ? { 
                ...sub, 
                remaining_usage: sub.remaining_usage - 1,
                used_count: sub.used_count + 1,
                status: sub.remaining_usage - 1 <= 0 ? 'expired' : sub.status
              }
            : sub
        )
      )

      showNotification?.(statusMessage, 'success')
      
      // Reload data to sync with database
      setTimeout(() => {
        loadSubscriptions()
      }, 500)
    } catch (error) {
      console.error('Errore utilizzo abbonamento:', error)
      showNotification?.('Errore nell\'utilizzo dell\'abbonamento', 'error')
    }
  }

  // Funzione per cancellare abbonamento con conferma
  const handleCancelSubscription = (subscription) => {
    setSubscriptionToCancel(subscription)
    setShowCancelModal(true)
  }

  // Conferma cancellazione abbonamento
  const confirmCancelSubscription = async () => {
    if (!subscriptionToCancel) return
    
    try {
      setLoading(true)
      
      // Imposta lo stato dell'abbonamento come 'cancelled' invece di eliminarlo
      const { error } = await supabase
        .from('customer_subscriptions')
        .update({ 
          status: 'cancelled'
        })
        .eq('id', subscriptionToCancel.id)

      if (error) throw error

      // Aggiorna lo stato locale rimuovendo l'abbonamento dalla vista attivi
      setCustomerSubscriptions(prev => 
        prev.filter(sub => sub.id !== subscriptionToCancel.id)
      )

      showNotification?.(`Abbonamento di ${subscriptionToCancel.customer_name} cancellato con successo`, 'success')
      
      // Chiudi modal e resetta stato
      setShowCancelModal(false)
      setSubscriptionToCancel(null)
      
      // Ricarica dati
      setTimeout(() => {
        loadSubscriptions()
      }, 500)
      
    } catch (error) {
      console.error('Errore cancellazione abbonamento:', error)
      showNotification?.('Errore nella cancellazione dell\'abbonamento', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Gestisce cliente trovato via NFC per uso abbonamento
  const handleNFCCustomerForUse = async (customer) => {
    try {
      // Trova abbonamenti attivi per questo cliente
      const activeSubscriptions = customerSubscriptions.filter(sub => 
        sub.customer_id === customer.id && 
        sub.status === 'active' && 
        sub.remaining_usage > 0
      )

      if (activeSubscriptions.length === 0) {
        showNotification(`${customer.name} non ha abbonamenti attivi`, 'error')
        return
      }

      // Se ha un solo abbonamento, mostra conferma
      if (activeSubscriptions.length === 1) {
        setNfcFoundSubscription({
          customer,
          subscription: activeSubscriptions[0]
        })
        setShowNFCUseModal(true)
      } else {
        // Se ha più abbonamenti, mostra una lista per la scelta
        setNfcFoundSubscription({
          customer,
          subscriptions: activeSubscriptions // Array di abbonamenti
        })
        setShowNFCUseModal(true)
        showNotification(`${customer.name} ha ${activeSubscriptions.length} abbonamenti attivi. Scegli quale usare.`, 'info')
      }
    } catch (error) {
      console.error('Errore gestione NFC uso abbonamento:', error)
      showNotification('Errore nella ricerca abbonamenti', 'error')
    }
  }

  // Conferma uso abbonamento da NFC
  const confirmNFCUseSubscription = async () => {
    if (nfcFoundSubscription) {
      let subscriptionToUse = null
      
      if (nfcFoundSubscription.subscription) {
        // Caso singolo abbonamento
        subscriptionToUse = nfcFoundSubscription.subscription
      } else if (nfcFoundSubscription.subscriptions && selectedSubscriptionId) {
        // Caso multipli abbonamenti
        subscriptionToUse = nfcFoundSubscription.subscriptions.find(s => s.id === selectedSubscriptionId)
      }
      
      if (subscriptionToUse) {
        await handleUseSubscription(subscriptionToUse.id)
        setShowNFCUseModal(false)
        setNfcFoundSubscription(null)
        setSelectedSubscriptionId(null)
      } else {
        showNotification('Seleziona un abbonamento da usare', 'error')
      }
    }
  }

  if (loading) {
    return <div className="subscription-loading">Caricamento abbonamenti...</div>
  }

  return (
    <div className="subscription-manager">
      {/* Header */}
      <div className="subscription-header">
        <div className="header-content">
          <h2 className="header-title">💎 Gestione Abbonamenti Premium</h2>
          <p className="header-subtitle">Piani ricorrenti per massimizzare la fidelizzazione clienti</p>
        </div>
        <div className="header-controls">
          <div className="customer-selector">
            <label>Cliente per abbonamento:</label>
            <div className="customer-selector-hybrid">
              <div className="nfc-selector">
                <NFCQuickReaderHybrid 
                  onCustomerFound={(customer) => {
                    setSelectedCustomer(customer.id)
                    showNotification?.(`Cliente trovato: ${customer.name}`, 'success')
                  }}
                  showNotification={showNotification}
                />
              </div>
              <select 
                value={selectedCustomer || ''} 
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="customer-select"
              >
                <option value="">Seleziona cliente...</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>{customer.name}</option>
                ))}
              </select>
            </div>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="create-plan-btn"
          >
            ➕ Crea Piano
          </button>
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-number">{customerSubscriptions.filter(s => s.status === 'active').length}</span>
            <span className="stat-label">Attivi</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">€{(customerSubscriptions.reduce((sum, s) => sum + s.plan.price, 0)).toFixed(0)}</span>
            <span className="stat-label">Ricavi Mese</span>
          </div>
        </div>
      </div>

      {/* Piani Abbonamento */}
      <div className="subscription-plans">
        <h3 className="section-title">📋 Piani Disponibili</h3>
        <div className="plans-grid">
          {subscriptionPlans.map(plan => {
            const IconComponent = SubscriptionIcons[plan.icon]
            return (
              <div key={plan.id} className={`plan-card ${plan.popular ? 'popular' : ''} ${plan.premium ? 'premium' : ''}`}>
                {plan.popular && <div className="popular-badge">🔥 POPOLARE</div>}
                {plan.premium && <div className="premium-badge">👑 PREMIUM</div>}
                
                <div className="plan-header" style={{ background: plan.gradient }}>
                  <div className="plan-icon">
                    <IconComponent />
                  </div>
                  <div className="plan-info">
                    <h4 className="plan-name">{plan.name}</h4>
                    <p className="plan-description">{plan.description}</p>
                  </div>
                </div>
                
                <div className="plan-body">
                  <div className="plan-price">
                    <span className="price-amount">€{plan.price.toFixed(2)}</span>
                    <span className="price-period">/{plan.duration_days <= 7 ? 'settimana' : 'mese'}</span>
                  </div>
                  
                  <div className="plan-features">
                    <div className="feature-item">
                      <span className="feature-icon">🎯</span>
                      <span>{plan.max_usage} utilizzi inclusi</span>
                    </div>
                    <div className="feature-item">
                      <span className="feature-icon">💰</span>
                      <span>Risparmi {plan.savings}</span>
                    </div>
                    <div className="feature-item">
                      <span className="feature-icon">🔄</span>
                      <span>Rinnovo automatico</span>
                    </div>
                  </div>
                  
                  <button 
                    className="subscribe-btn" 
                    style={{ background: plan.gradient }}
                    onClick={() => openActivationModal(plan.id)}
                    disabled={!selectedCustomer}
                  >
                    {selectedCustomer ? 'Attiva Abbonamento' : 'Seleziona Cliente'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Abbonamenti Clienti Attivi - CARD CON BOLLINI */}
      <div className="active-subscriptions">
        <div className="subscriptions-header">
          <h3 className="section-title">🎯 Abbonamenti Attivi - Vista Operatori</h3>
          <div className="header-actions">
            <div className="search-container">
              <input
                type="text"
                placeholder="🔍 Cerca cliente..."
                value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            </div>
            <div className="nfc-use-section">
              <label>📱 Usa abbonamento con NFC:</label>
              <NFCQuickReaderHybrid 
                onCustomerFound={handleNFCCustomerForUse}
                showNotification={showNotification}
              />
            </div>
          </div>
        </div>
        <div className="subscription-cards-grid">
          {customerSubscriptions
            .filter(sub => sub.status === 'active')
            .filter(sub => sub.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))
            .length === 0 && searchTerm ? (
            <div className="no-results">
              <p>🔍 Nessun abbonamento trovato per "{searchTerm}"</p>
            </div>
          ) : (
            customerSubscriptions
              .filter(sub => sub.status === 'active')
              .filter(sub => sub.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(subscription => {
            const daysRemaining = getDaysRemaining(subscription.end_date)
            const IconComponent = SubscriptionIcons[subscription.plan.icon || 'Pizza']
            
            return (
              <div key={subscription.id} className="subscription-visual-card" data-subscription-id={subscription.id}>
                {/* Header Card */}
                <div className="card-header" style={{ background: subscription.plan.gradient }}>
                  <div className="card-icon">
                    <IconComponent />
                  </div>
                  <div className="card-customer-info">
                    <h4 className="card-customer-name">{subscription.customer_name}</h4>
                    <span className="card-plan-name">{subscription.plan.name}</span>
                  </div>
                  <div className="card-status">
                    {getStatusIcon(subscription.status)}
                  </div>
                </div>

                {/* Bollini Utilizzi */}
                <div className="bollini-container">
                  <div className="bollini-header">
                    <span className="bollini-title">Utilizzi ({subscription.used_count}/{subscription.plan.max_usage})</span>
                    <span className="bollini-remaining">{subscription.remaining_usage} rimasti</span>
                  </div>
                  
                  <div className="bollini-grid" data-max-usage={subscription.plan.max_usage}>
                    {Array.from({ length: subscription.plan.max_usage }, (_, index) => {
                      const isUsed = index < subscription.used_count
                      return (
                        <div 
                          key={index}
                          className={`bollino ${isUsed ? 'bollino-used' : 'bollino-available'}`}
                          style={{
                            background: isUsed 
                              ? subscription.plan.gradient 
                              : 'linear-gradient(135deg, #e5e7eb, #f3f4f6)'
                          }}
                        >
                          {isUsed ? '✓' : (index + 1)}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Footer Card */}
                <div className="card-footer">
                  <div className="card-time-info">
                    <span className={`card-days-remaining ${daysRemaining <= 3 ? 'expiring' : ''}`}>
                      ⏰ {daysRemaining} giorni
                    </span>
                    <span className="card-expiry">
                      Scade: {new Date(subscription.end_date).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                  
                  <div className="card-actions">
                    <button 
                      className="card-use-btn"
                      onClick={() => handleUseSubscription(subscription.id)}
                      disabled={subscription.remaining_usage <= 0}
                      style={{ background: subscription.plan.gradient }}
                    >
                      {subscription.remaining_usage <= 0 ? '🔒 ESAURITO' : '🎯 USA ABBONAMENTO'}
                    </button>
                    
                    <button 
                      className="card-cancel-btn"
                      onClick={() => handleCancelSubscription(subscription)}
                      title="Cancella abbonamento"
                    >
                      🗑️ CANCELLA
                    </button>
                  </div>
                </div>
              </div>
            )
          })
          )}
        </div>

        {/* Sezione Abbonamenti Scaduti/In Scadenza */}
        {customerSubscriptions.filter(sub => sub.status !== 'active').length > 0 && (
          <div className="expired-subscriptions-section">
            <h4 className="section-subtitle">📋 Abbonamenti Non Attivi</h4>
            <div className="expired-subscriptions-list">
              {customerSubscriptions.filter(sub => sub.status !== 'active').map(subscription => {
                const daysRemaining = getDaysRemaining(subscription.end_date)
                
                return (
                  <div key={subscription.id} className={`expired-subscription-card ${subscription.status}`}>
                    <div className="expired-info">
                      <span className="expired-customer">{subscription.customer_name}</span>
                      <span className="expired-plan">{subscription.plan.name}</span>
                      <span className={`expired-status ${subscription.status}`}>
                        {subscription.status === 'expired' ? '❌ SCADUTO' : '⚠️ IN SCADENZA'}
                      </span>
                    </div>
                    <div className="expired-actions">
                      <button className="renew-btn">🔄 Rinnova</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal Overlay per Creare Piano */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🆕 Crea Nuovo Piano Abbonamento</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nome Piano *</label>
                  <input
                    type="text"
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({...newPlan, name: e.target.value})}
                    placeholder="es. Aperitivo Settimanale"
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label>Descrizione</label>
                  <input
                    type="text"
                    value={newPlan.description}
                    onChange={(e) => setNewPlan({...newPlan, description: e.target.value})}
                    placeholder="es. 2 Aperitivi + 2 Stuzzichini"
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label>Prezzo €*</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPlan.price}
                    onChange={(e) => setNewPlan({...newPlan, price: e.target.value})}
                    placeholder="0.00"
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label>Durata (giorni)</label>
                  <select
                    value={newPlan.duration_days}
                    onChange={(e) => setNewPlan({...newPlan, duration_days: parseInt(e.target.value)})}
                    className="form-select"
                  >
                    <option value={7}>7 giorni (1 settimana)</option>
                    <option value={14}>14 giorni (2 settimane)</option>
                    <option value={30}>30 giorni (1 mese)</option>
                    <option value={90}>90 giorni (3 mesi)</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Max Utilizzi</label>
                  <input
                    type="number"
                    value={newPlan.max_usage}
                    onChange={(e) => setNewPlan({...newPlan, max_usage: parseInt(e.target.value)})}
                    placeholder="1"
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label>Icona</label>
                  <select
                    value={newPlan.icon}
                    onChange={(e) => setNewPlan({...newPlan, icon: e.target.value})}
                    className="form-select"
                  >
                    <option value="Pizza">🍕 Pizza</option>
                    <option value="Coffee">☕ Coffee</option>
                    <option value="Lunch">🍽️ Lunch</option>
                    <option value="Family">👨‍👩‍👧‍👦 Family</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Risparmio €</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPlan.savings_amount}
                    onChange={(e) => setNewPlan({...newPlan, savings_amount: e.target.value})}
                    placeholder="0.00"
                    className="form-input"
                  />
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-secondary" 
                onClick={() => setShowCreateModal(false)}
              >
                Annulla
              </button>
              <button 
                className="btn-primary" 
                onClick={createPlan}
                disabled={!newPlan.name || !newPlan.price}
              >
                🚀 Crea Piano
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Conferma Attivazione Abbonamento */}
      {showActivationModal && (() => {
        const plan = subscriptionPlans.find(p => p.id === activationData.planId)
        const customer = customers.find(c => c.id === activationData.customerId)
        
        return (
          <div className="modal-overlay" onClick={() => setShowActivationModal(false)}>
            <div className="modal-content activation-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>🎯 Conferma Attivazione Abbonamento</h3>
                <button className="modal-close" onClick={() => setShowActivationModal(false)}>✕</button>
              </div>
              
              <div className="modal-body">
                <div className="activation-summary">
                  <div className="summary-card">
                    <div className="summary-header">
                      <h4>📋 Riepilogo Acquisto</h4>
                    </div>
                    
                    <div className="summary-details">
                      <div className="detail-row">
                        <span className="detail-label">Cliente:</span>
                        <span className="detail-value customer-name">{customer?.name}</span>
                      </div>
                      
                      <div className="detail-row">
                        <span className="detail-label">Piano:</span>
                        <span className="detail-value plan-name">{plan?.name}</span>
                      </div>
                      
                      <div className="detail-row">
                        <span className="detail-label">Descrizione:</span>
                        <span className="detail-value">{plan?.description}</span>
                      </div>
                      
                      <div className="detail-row">
                        <span className="detail-label">Utilizzi inclusi:</span>
                        <span className="detail-value">{plan?.max_usage}</span>
                      </div>
                      
                      <div className="detail-row">
                        <span className="detail-label">Durata:</span>
                        <span className="detail-value">
                          {plan?.duration_days <= 7 ? `${plan?.duration_days} giorni` 
                           : plan?.duration_days <= 30 ? '1 mese' 
                           : `${Math.round(plan?.duration_days / 30)} mesi`}
                        </span>
                      </div>
                      
                      <div className="detail-row total-row">
                        <span className="detail-label">Totale:</span>
                        <span className="detail-value total-price">€{plan?.price?.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="payment-section">
                  <h4>💳 Metodo di Pagamento</h4>
                  <div className="payment-options">
                    <label className="payment-option">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cash"
                        checked={activationData.paymentMethod === 'cash'}
                        onChange={(e) => setActivationData({...activationData, paymentMethod: e.target.value})}
                      />
                      <span className="payment-label">💵 Contanti</span>
                    </label>
                    
                    <label className="payment-option">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="card"
                        checked={activationData.paymentMethod === 'card'}
                        onChange={(e) => setActivationData({...activationData, paymentMethod: e.target.value})}
                      />
                      <span className="payment-label">💳 Bancomat/Carta</span>
                    </label>
                  </div>
                </div>

                <div className="receipt-section">
                  <h4>🧾 Ricevuta</h4>
                  <label className="receipt-option">
                    <input
                      type="checkbox"
                      checked={activationData.printReceipt}
                      onChange={(e) => setActivationData({...activationData, printReceipt: e.target.checked})}
                    />
                    <span className="receipt-label">Stampa ricevuta adesso</span>
                    <small className="receipt-note">
                      {activationData.printReceipt 
                        ? "La ricevuta verrà stampata immediatamente" 
                        : "La ricevuta sarà disponibile nella tabella ricevute"}
                    </small>
                  </label>
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  className="btn-secondary" 
                  onClick={() => setShowActivationModal(false)}
                >
                  Annulla
                </button>
                <button 
                  className="btn-primary activation-confirm-btn" 
                  onClick={confirmActivation}
                >
                  🚀 Conferma e Attiva
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal Conferma Uso Abbonamento NFC */}
      {showNFCUseModal && nfcFoundSubscription && (
        <div className="modal-overlay" onClick={() => setShowNFCUseModal(false)}>
          <div className="modal-content nfc-use-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📱 Conferma Uso Abbonamento</h3>
              <button className="modal-close" onClick={() => setShowNFCUseModal(false)}>✕</button>
            </div>
            
            <div className="modal-body">
              <div className="nfc-confirmation-card">
                <div className="customer-info">
                  <h4>🧑‍💼 Cliente: {nfcFoundSubscription.customer.name}</h4>
                  <p>💳 Tessera rilevata via NFC</p>
                </div>
                
                {nfcFoundSubscription.subscription ? (
                  // Caso singolo abbonamento
                  <div className="subscription-info">
                    <h4>🎯 Abbonamento: {nfcFoundSubscription.subscription.plan.name}</h4>
                    <p>{nfcFoundSubscription.subscription.plan.description}</p>
                    <div className="usage-info">
                      <span className="usage-remaining">
                        📊 Utilizzi rimanenti: <strong>{nfcFoundSubscription.subscription.remaining_usage}</strong>
                      </span>
                    </div>
                  </div>
                ) : (
                  // Caso multipli abbonamenti
                  <div className="subscription-selection">
                    <h4>🎯 Scegli abbonamento da usare:</h4>
                    <div className="subscription-options">
                      {nfcFoundSubscription.subscriptions?.map(sub => (
                        <label key={sub.id} className="subscription-option">
                          <input
                            type="radio"
                            name="subscriptionChoice"
                            value={sub.id}
                            checked={selectedSubscriptionId === sub.id}
                            onChange={(e) => setSelectedSubscriptionId(e.target.value)}
                          />
                          <div className="subscription-details">
                            <strong>{sub.plan.name}</strong>
                            <span>{sub.plan.description}</span>
                            <span className="usage-info">
                              📊 Utilizzi rimanenti: <strong>{sub.remaining_usage}</strong>
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="confirmation-question">
                <p>❓ Vuoi scalare un utilizzo da questo abbonamento?</p>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowNFCUseModal(false)}
              >
                ❌ Annulla
              </button>
              <button 
                className="btn btn-primary"
                onClick={confirmNFCUseSubscription}
              >
                ✅ Conferma Utilizzo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Conferma Cancellazione */}
      {showCancelModal && subscriptionToCancel && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal-content cancel-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ Conferma Cancellazione</h3>
            </div>
            
            <div className="modal-body">
              <div className="cancel-warning">
                <p>Sei sicuro di voler cancellare l'abbonamento?</p>
                <div className="subscription-details">
                  <strong>Cliente:</strong> {subscriptionToCancel.customer_name}<br/>
                  <strong>Piano:</strong> {subscriptionToCancel.plan.name}<br/>
                  <strong>Utilizzi rimanenti:</strong> {subscriptionToCancel.remaining_usage}<br/>
                  <strong>Scadenza:</strong> {new Date(subscriptionToCancel.end_date).toLocaleDateString('it-IT')}
                </div>
                <p className="warning-text">
                  ⚠️ <strong>Attenzione:</strong> Questa azione non può essere annullata. 
                  L'abbonamento sarà contrassegnato come cancellato e non potrà più essere utilizzato.
                </p>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowCancelModal(false)}
              >
                ❌ Annulla
              </button>
              <button 
                className="btn btn-danger"
                onClick={confirmCancelSubscription}
                disabled={loading}
              >
                🗑️ {loading ? 'Cancellazione...' : 'Conferma Cancellazione'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SubscriptionManager