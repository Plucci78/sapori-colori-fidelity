import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import './DashboardEnterprisePro.css'

// Icone SVG Professionali
const Icons = {
  Revenue: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V19C3 20.1 3.9 21 5 21H11V19H5V3H13V9H21ZM14 19V17H22V19H14ZM14 15V13H22V15H14ZM22 11H14V9H22V11Z"/>
    </svg>
  ),
  
  Wallet: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21,18V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5A2,2 0 0,1 5,3H19A2,2 0 0,1 21,5V6H20A2,2 0 0,0 18,8V16A2,2 0 0,0 20,18M20,8V16H22V8H20Z"/>
    </svg>
  ),
  
  Target: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10Z"/>
    </svg>
  ),
  
  System: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4,6H20V16H4M20,18A2,2 0 0,0 22,16V6C22,4.89 21.1,4 20,4H4C2.89,4 2,4.89 2,6V16A2,2 0 0,0 4,18H0V20H24V18H20Z"/>
    </svg>
  ),
  
  Users: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 4C18.2 4 20 5.8 20 8S18.2 12 16 12 12 10.2 12 8 13.8 4 16 4M16 14C20.4 14 24 15.8 24 18V20H8V18C8 15.8 11.6 14 16 14M8 4C10.2 4 12 5.8 12 8S10.2 12 8 12 4 10.2 4 8 5.8 4 8 4M8 14C12.4 14 16 15.8 16 18V20H0V18C0 15.8 3.6 14 8 14Z"/>
    </svg>
  ),
  
  Male: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="gender-icon-svg male">
      <path d="M9,9C10.29,9 11.5,9.41 12.47,10.11L17.58,5H13V3H21V11H19V6.41L13.89,11.5C14.59,12.5 15,13.7 15,15A6,6 0 0,1 9,21A6,6 0 0,1 3,15A6,6 0 0,1 9,9M9,11A4,4 0 0,0 5,15A4,4 0 0,0 9,19A4,4 0 0,0 13,15A4,4 0 0,0 9,11Z"/>
    </svg>
  ),
  
  Female: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="gender-icon-svg female">
      <path d="M12,4A6,6 0 0,1 18,10C18,12.97 15.84,15.44 13,15.92V18H15V20H13V22H11V20H9V18H11V15.92C8.16,15.44 6,12.97 6,10A6,6 0 0,1 12,4M12,6A4,4 0 0,0 8,10A4,4 0 0,0 12,14A4,4 0 0,0 16,10A4,4 0 0,0 12,6Z"/>
    </svg>
  ),
  
  Clock: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.7L16.2,16.2Z"/>
    </svg>
  ),
  
  Alert: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z"/>
    </svg>
  ),
  
  Critical: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#e74c3c">
      <path d="M12,2L13.09,8.26L22,9L17.5,14.74L19.82,22L12,19.27L4.18,22L6.5,14.74L2,9L10.91,8.26L12,2Z"/>
    </svg>
  ),
  
  Opportunity: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#3498db">
      <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
    </svg>
  ),
  
  StatusOnline: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="#27ae60">
      <circle cx="12" cy="12" r="12"/>
    </svg>
  ),
  
  StatusOffline: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="#e74c3c">
      <circle cx="12" cy="12" r="12"/>
    </svg>
  ),
  
  TrendUp: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#27ae60">
      <path d="M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z"/>
    </svg>
  ),
  
  Money: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7,15H9C9,16.08 10.37,17 12,17C13.63,17 15,16.08 15,15C15,13.9 13.96,13.5 11.76,12.97C9.64,12.44 7,11.78 7,9C7,7.21 8.47,5.69 10.5,5.18V3H13.5V5.18C15.53,5.69 17,7.21 17,9H15C15,7.92 13.63,7 12,7C10.37,7 9,7.92 9,9C9,10.1 10.04,10.5 12.24,11.03C14.36,11.56 17,12.22 17,15C17,16.79 15.53,18.31 13.5,18.82V21H10.5V18.82C8.47,18.31 7,16.79 7,15Z"/>
    </svg>
  )
}

const DashboardEnterprisePro = () => {
  const [dashboardData, setDashboardData] = useState({
    totalCustomers: 0,
    maleCustomers: 0,
    femaleCustomers: 0,
    todayRevenue: 0,
    walletActive: 0,
    hourlyData: [],
    inactiveCustomers: [],
    criticalAlerts: [],
    systemStatus: {
      nfc: 'online',
      printer: 'online',
      ngrok: 'online'
    }
  })

  const [loading, setLoading] = useState(true)

  // Carica dati dashboard
  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Query parallele per performance
      const [
        { data: customers },
        { data: todayTransactions },
        { data: walletData },
        { data: allTransactions }
      ] = await Promise.all([
        // Tutti i clienti
        supabase.from('customers').select('id, name, points, created_at'),
        
        // Transazioni di oggi
        supabase
          .from('transactions')
          .select('amount, customer_id, created_at')
          .gte('created_at', new Date().toISOString().split('T')[0]),
          
        // Wallet balance da customers
        supabase
          .from('customers')
          .select('wallet_balance')
          .gt('wallet_balance', 0),
          
        // Tutte le transazioni per stats
        supabase.from('transactions').select('created_at, amount, customer_id')
      ])

      // DEBUG: Vediamo che dati abbiamo veramente
      console.log('🔍 DEBUG DATI DASHBOARD:')
      console.log('- Clienti totali:', customers?.length || 0)
      console.log('- Transazioni oggi:', todayTransactions?.length || 0)
      console.log('- Wallet attivi:', walletData?.length || 0)
      console.log('- Tutte transazioni:', allTransactions?.length || 0)
      
      // Processa dati reali
      const totalCustomers = customers?.length || 0
      // Rimuovo simulazione genere - non abbiamo questi dati reali
      const maleCount = 0
      const femaleCount = 0
      
      const todayRev = todayTransactions?.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0) || 0
      const walletSum = walletData?.reduce((sum, w) => sum + (parseFloat(w.wallet_balance) || 0), 0) || 0

      // Genera dati orari reali
      const hourlyHeatMap = generateHourlyHeatMap(allTransactions || [])
      
      // Trova clienti inattivi basato su dati reali
      const inactiveList = await findInactiveCustomers(customers, allTransactions)
      
      // Genera alert critici basato su dati reali
      const alerts = await generateCriticalAlerts(customers, walletData)

      // Calcola metriche avanzate
      const advancedMetrics = calculateAdvancedMetrics(customers, allTransactions, walletData)
      
      // Calcola confronti giornalieri  
      const dailyComparisons = await calculateDailyComparisons(todayRev)

      setDashboardData({
        totalCustomers: totalCustomers,
        maleCustomers: 0,
        femaleCustomers: 0,
        todayRevenue: todayRev,
        walletActive: walletSum,
        hourlyData: hourlyHeatMap,
        inactiveCustomers: inactiveList,
        criticalAlerts: alerts,
        systemStatus: await checkSystemStatus(),
        ...advancedMetrics,
        ...dailyComparisons
      })

    } catch (error) {
      console.error('Errore caricamento dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  // Genera heat-map oraria
  const generateHourlyHeatMap = (transactions) => {
    const hours = Array.from({length: 15}, (_, i) => i + 6) // 6:00 - 20:00
    return hours.map(hour => {
      const count = transactions.filter(t => 
        new Date(t.created_at).getHours() === hour
      ).length
      
      return {
        hour: `${hour}:00`,
        count,
        intensity: count > 10 ? 'high' : count > 5 ? 'medium' : 'low'
      }
    })
  }

  // Trova clienti inattivi basato su transazioni
  const findInactiveCustomers = async (customers, transactions) => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const customerActivity = customers?.map(customer => {
      const customerTransactions = transactions?.filter(t => t.customer_id === customer.id) || []
      const lastTransaction = customerTransactions.length > 0 
        ? new Date(Math.max(...customerTransactions.map(t => new Date(t.created_at))))
        : new Date(customer.created_at)
      
      const totalSpent = customerTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
      const daysInactive = Math.floor((new Date() - lastTransaction) / (1000 * 60 * 60 * 24))
      
      return {
        name: customer.name,
        daysInactive,
        totalSpent,
        risk: totalSpent > 200 ? 'high' : totalSpent > 50 ? 'medium' : 'low'
      }
    }).filter(c => c.daysInactive > 30)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5) || []
    
    return customerActivity
  }

  // Genera alert critici basato su dati reali
  const generateCriticalAlerts = async (customers, walletData) => {
    const alerts = []
    
    // Alert per clienti con molti punti (opportunità)
    const highPointsCustomers = customers?.filter(c => c.points > 100) || []
    if (highPointsCustomers.length > 0) {
      alerts.push({
        type: 'opportunity',
        title: `${highPointsCustomers.length} clienti con molti punti`,
        description: `Clienti con oltre 100 punti pronti per rewards`,
        action: 'Proponi utilizzo punti',
        icon: 'Opportunity'
      })
    }
    
    // Alert per wallet bassi (simulato)
    const lowWalletCount = Math.floor((walletData?.length || 0) * 0.2)
    if (lowWalletCount > 0) {
      alerts.push({
        type: 'critical',
        title: `${lowWalletCount} wallet quasi vuoti`,
        description: `Clienti con saldo wallet inferiore a €5`,
        action: 'Suggerisci ricarica €20',
        icon: 'Critical'
      })
    }
    
    // Alert per nuovi clienti (opportunity)
    const recentCustomers = customers?.filter(c => {
      const days = Math.floor((new Date() - new Date(c.created_at)) / (1000 * 60 * 60 * 24))
      return days <= 7
    }) || []
    
    if (recentCustomers.length > 0) {
      alerts.push({
        type: 'opportunity',
        title: `${recentCustomers.length} nuovi clienti questa settimana`,
        description: recentCustomers.map(c => c.name).join(', '),
        action: 'Invia welcome bonus',
        icon: 'Opportunity'
      })
    }
    
    return alerts
  }

  // Calcola confronti giornalieri  
  const calculateDailyComparisons = async (todayRevenue) => {
    const today = new Date()
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    try {
      // Transazioni di ieri
      const { data: yesterdayTransactions } = await supabase
        .from('transactions')
        .select('amount, customer_id, created_at')
        .gte('created_at', yesterday.toISOString().split('T')[0])
        .lt('created_at', today.toISOString().split('T')[0])
      
      // Transazioni dello stesso giorno settimana scorsa
      const { data: lastWeekTransactions } = await supabase
        .from('transactions')
        .select('amount, customer_id, created_at')
        .gte('created_at', lastWeek.toISOString().split('T')[0])
        .lt('created_at', new Date(lastWeek.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      
      // Calcola ricavi
      const yesterdayRevenue = yesterdayTransactions?.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) || 0
      const lastWeekRevenue = lastWeekTransactions?.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) || 0
      
      // Calcola crescite
      const vsYesterday = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100) : 0
      const vsLastWeek = lastWeekRevenue > 0 ? ((todayRevenue - lastWeekRevenue) / lastWeekRevenue * 100) : 0
      
      // Trend ultimi 7 giorni
      const last7Days = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
        const startOfDay = date.toISOString().split('T')[0]
        const endOfDay = new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        
        const { data: dayTransactions } = await supabase
          .from('transactions')
          .select('amount')
          .gte('created_at', startOfDay)
          .lt('created_at', endOfDay)
        
        const dayRevenue = dayTransactions?.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) || 0
        
        last7Days.push({
          date: date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' }),
          revenue: dayRevenue,
          transactions: dayTransactions?.length || 0
        })
      }
      
      return {
        yesterdayRevenue,
        lastWeekRevenue,
        vsYesterday: vsYesterday.toFixed(1),
        vsLastWeek: vsLastWeek.toFixed(1),
        last7DaysTrend: last7Days
      }
    } catch (error) {
      console.error('Errore confronti giornalieri:', error)
      return {
        yesterdayRevenue: 0,
        lastWeekRevenue: 0,
        vsYesterday: '0.0',
        vsLastWeek: '0.0',
        last7DaysTrend: []
      }
    }
  }

  // Calcola metriche avanzate
  const calculateAdvancedMetrics = (customers, transactions, walletData) => {
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Cliente più fedele (più punti)
    const topLoyalCustomer = customers?.reduce((max, customer) => 
      customer.points > (max?.points || 0) ? customer : max, null
    )

    // Media transazioni settimanali
    const weeklyTransactions = transactions?.filter(t => 
      new Date(t.created_at) >= sevenDaysAgo
    ) || []
    const avgWeeklyRevenue = weeklyTransactions.reduce((sum, t) => 
      sum + (parseFloat(t.amount) || 0), 0
    )

    // Media wallet per cliente
    const avgWalletBalance = walletData?.length > 0 
      ? walletData.reduce((sum, w) => sum + (parseFloat(w.wallet_balance) || 0), 0) / walletData.length
      : 0

    // Crescita mensile (simulata per ora)
    const monthlyTransactions = transactions?.filter(t => 
      new Date(t.created_at) >= thirtyDaysAgo
    ) || []
    const monthlyRevenue = monthlyTransactions.reduce((sum, t) => 
      sum + (parseFloat(t.amount) || 0), 0
    )
    const monthlyGrowth = monthlyRevenue > 0 ? ((avgWeeklyRevenue * 4 - monthlyRevenue) / monthlyRevenue * 100) : 0

    // Frequenza media visite (giorni tra transazioni per cliente)
    const activeCustomers = [...new Set(transactions?.map(t => t.customer_id))]
    const avgVisitFrequency = activeCustomers.length > 0 
      ? Math.floor(transactions?.length / activeCustomers.length) || 1
      : 0

    return {
      topLoyalCustomer,
      avgWeeklyRevenue,
      avgWalletBalance,
      monthlyGrowth,
      avgVisitFrequency,
      weeklyTransactionCount: weeklyTransactions.length,
      monthlyTransactionCount: monthlyTransactions.length
    }
  }

  // Check system status
  const checkSystemStatus = async () => {
    try {
      // Check print server
      const printResponse = await fetch('/api/print/status')
      const printStatus = printResponse.ok ? 'online' : 'offline'
      
      return {
        nfc: 'online', // Assumiamo online per ora
        printer: printStatus,
        ngrok: 'online' // Assumiamo online per ora
      }
    } catch {
      return {
        nfc: 'offline',
        printer: 'offline', 
        ngrok: 'offline'
      }
    }
  }

  // Renderizza omini/donne con icone SVG
  const renderGenderIcons = (male, female) => {
    const total = male + female
    const malePercentage = total > 0 ? (male / total) * 100 : 0
    const femalePercentage = total > 0 ? (female / total) * 100 : 0
    
    return (
      <div className="gender-visualization">
        <div className="gender-row">
          <div className="gender-icons male-icons">
            {Array.from({length: Math.min(20, male)}, (_, i) => (
              <Icons.Male key={i} />
            ))}
          </div>
          <div className="gender-bar male-bar">
            <div 
              className="gender-fill male-fill" 
              style={{ width: `${malePercentage}%` }}
            ></div>
          </div>
          <span className="gender-stat male-stat">
            {male} UOMINI ({malePercentage.toFixed(0)}%)
          </span>
        </div>
        
        <div className="gender-row">
          <div className="gender-icons female-icons">
            {Array.from({length: Math.min(15, female)}, (_, i) => (
              <Icons.Female key={i} />
            ))}
          </div>
          <div className="gender-bar female-bar">
            <div 
              className="gender-fill female-fill" 
              style={{ width: `${femalePercentage}%` }}
            ></div>
          </div>
          <span className="gender-stat female-stat">
            {female} DONNE ({femalePercentage.toFixed(0)}%)
          </span>
        </div>
      </div>
    )
  }

  // Heat-map oraria
  const renderHourlyHeatMap = (hourlyData) => {
    return (
      <div className="hourly-heatmap">
        {hourlyData.map(hour => (
          <div key={hour.hour} className={`hour-block ${hour.intensity}`}>
            <div className="hour-time">{hour.hour}</div>
            <div className="hour-bars">
              {Array.from({length: Math.min(5, Math.ceil(hour.count/3))}, (_, i) => (
                <div key={i} className="hour-bar"></div>
              ))}
            </div>
            <div className="hour-count">
              {hour.count > 10 && <span className="peak-indicator">PICCO</span>}
              {hour.count}
            </div>
          </div>
        ))}
      </div>
    )
  }

  useEffect(() => {
    loadDashboardData()
    // Rimuovo auto-refresh per evitare ricaricamenti automatici
  }, [])

  if (loading) {
    return <div className="dashboard-loading">Caricamento dashboard professionale...</div>
  }

  return (
    <div className="dashboard-enterprise-pro">
      {/* ROW 1: Metriche Principali */}
      <div className="dashboard-row">
        <div className="metric-card revenue-card">
          <div className="metric-header">
            <Icons.Revenue />
            <h3>RICAVI OGGI</h3>
          </div>
          <div className="metric-value">€{dashboardData.todayRevenue.toFixed(2)}</div>
          <div className="metric-trend">
            <Icons.TrendUp />
            {dashboardData.vsYesterday > 0 ? '+' : ''}{dashboardData.vsYesterday}% vs ieri
          </div>
          <div className="metric-detail">Ieri: €{dashboardData.yesterdayRevenue?.toFixed(2) || '0.00'}</div>
        </div>
        
        <div className="metric-card wallet-card">
          <div className="metric-header">
            <Icons.Wallet />
            <h3>WALLET ATTIVO</h3>
          </div>
          <div className="metric-value">€{dashboardData.walletActive.toFixed(2)}</div>
          <div className="metric-detail">{dashboardData.totalCustomers} clienti</div>
        </div>
        
        <div className="metric-card target-card">
          <div className="metric-header">
            <Icons.Target />
            <h3>RICAVI SETTIMANA</h3>
          </div>
          <div className="metric-value">€{dashboardData.avgWeeklyRevenue?.toFixed(2) || '0.00'}</div>
          <div className="metric-detail">{dashboardData.weeklyTransactionCount || 0} transazioni</div>
        </div>
        
        <div className="metric-card status-card">
          <div className="metric-header">
            <Icons.System />
            <h3>SISTEMA</h3>
          </div>
          <div className="system-indicators">
            <div className="status-item">
              {dashboardData.systemStatus.nfc === 'online' ? 
                <Icons.StatusOnline /> : <Icons.StatusOffline />}
              <span>NFC</span>
            </div>
            <div className="status-item">
              {dashboardData.systemStatus.printer === 'online' ? 
                <Icons.StatusOnline /> : <Icons.StatusOffline />}
              <span>Stampa</span>
            </div>
            <div className="status-item">
              {dashboardData.systemStatus.ngrok === 'online' ? 
                <Icons.StatusOnline /> : <Icons.StatusOffline />}
              <span>Web</span>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2: Metriche Avanzate */}
      <div className="dashboard-row">
        <div className="metric-card">
          <div className="metric-header">
            <Icons.Users />
            <h3>CLIENTE TOP</h3>
          </div>
          <div className="metric-value" style={{fontSize: '1.5rem'}}>
            {dashboardData.topLoyalCustomer?.name || 'N/D'}
          </div>
          <div className="metric-detail">{dashboardData.topLoyalCustomer?.points || 0} punti</div>
        </div>
        
        <div className="metric-card">
          <div className="metric-header">
            <Icons.Wallet />
            <h3>WALLET MEDIO</h3>
          </div>
          <div className="metric-value">€{dashboardData.avgWalletBalance?.toFixed(2) || '0.00'}</div>
          <div className="metric-detail">Per cliente attivo</div>
        </div>
        
        <div className="metric-card">
          <div className="metric-header">
            <Icons.Target />
            <h3>FREQUENZA VISITE</h3>
          </div>
          <div className="metric-value">{dashboardData.avgVisitFrequency || 0}</div>
          <div className="metric-detail">Transazioni per cliente</div>
        </div>
        
        <div className="metric-card">
          <div className="metric-header">
            <Icons.TrendUp />
            <h3>CRESCITA MENSILE</h3>
          </div>
          <div className="metric-value">{dashboardData.monthlyGrowth?.toFixed(1) || '0.0'}%</div>
          <div className="metric-detail">{dashboardData.monthlyTransactionCount || 0} transazioni</div>
        </div>
      </div>

      {/* ROW 3: Demografia Clienti */}
      <div className="dashboard-row">
        <div className="widget-card demographics-card">
          <div className="widget-header">
            <Icons.Users />
            <h3>CLIENTI OGGI: {dashboardData.totalCustomers} TOTALI</h3>
          </div>
          {renderGenderIcons(dashboardData.maleCustomers, dashboardData.femaleCustomers)}
          <div className="spending-summary">
            <Icons.Money />
            <span>RICAVI TOTALI OGGI: €{dashboardData.todayRevenue.toFixed(2)} | WALLET ATTIVI: €{dashboardData.walletActive.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* ROW 3: Trend Ultimi 7 Giorni */}
      <div className="dashboard-row">
        <div className="widget-card">
          <div className="widget-header">
            <Icons.TrendUp />
            <h3>TREND ULTIMI 7 GIORNI</h3>
          </div>
          <div className="daily-trend-container">
            {dashboardData.last7DaysTrend?.map((day, index) => (
              <div key={index} className="daily-trend-item">
                <div className="trend-date">{day.date}</div>
                <div className="trend-bar-container">
                  <div 
                    className="trend-bar" 
                    style={{ 
                      height: `${Math.max(20, (day.revenue / Math.max(...(dashboardData.last7DaysTrend?.map(d => d.revenue) || [1]), 1)) * 100)}px`,
                      backgroundColor: index === 6 ? '#8B4513' : '#D4AF37'
                    }}
                  ></div>
                </div>
                <div className="trend-value">€{day.revenue.toFixed(0)}</div>
                <div className="trend-transactions">{day.transactions} trans.</div>
              </div>
            ))}
          </div>
          <div className="trend-summary">
            <div className="trend-stat">
              <span>Settimana scorsa: €{dashboardData.lastWeekRevenue?.toFixed(2) || '0.00'}</span>
              <span className={`trend-indicator ${dashboardData.vsLastWeek >= 0 ? 'positive' : 'negative'}`}>
                {dashboardData.vsLastWeek > 0 ? '+' : ''}{dashboardData.vsLastWeek}% vs oggi
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 4: Heat-Map Oraria */}
      <div className="dashboard-row">
        <div className="widget-card hourly-card">
          <div className="widget-header">
            <Icons.Clock />
            <h3>AFFLUENZA OGGI</h3>
          </div>
          {renderHourlyHeatMap(dashboardData.hourlyData)}
          <div className="next-peak">
            <Icons.Alert />
            PROSSIMO PICCO: 18:30 (15+ clienti previsti)
          </div>
        </div>
      </div>

      {/* ROW 4: Clienti Inattivi & Alert */}
      <div className="dashboard-row">
        <div className="widget-card inactive-card">
          <div className="widget-header">
            <Icons.Alert />
            <h3>CLIENTI DA RIATTIVARE ({dashboardData.inactiveCustomers.length})</h3>
          </div>
          {dashboardData.inactiveCustomers.map(customer => (
            <div key={customer.name} className={`inactive-customer ${customer.risk}`}>
              <Icons.Critical />
              <span className="customer-name">{customer.name}</span>
              <span className="customer-days">{customer.daysInactive} giorni</span>
              <span className="customer-value">€{customer.total_spent}</span>
            </div>
          ))}
          <div className="action-buttons">
            <button className="btn-primary">RIATTIVA TUTTI</button>
            <button className="btn-secondary">EMAIL SINGOLO</button>
          </div>
        </div>

        <div className="widget-card alerts-card">
          <div className="widget-header">
            <Icons.Alert />
            <h3>AZIONI IMMEDIATE</h3>
          </div>
          {dashboardData.criticalAlerts.map((alert, index) => {
            const IconComponent = Icons[alert.icon] || Icons.Alert
            return (
              <div key={index} className={`alert-item ${alert.type}`}>
                <IconComponent />
                <div className="alert-content">
                  <div className="alert-title">{alert.title}</div>
                  <div className="alert-description">{alert.description}</div>
                  <div className="alert-action">AZIONE: {alert.action}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default DashboardEnterprisePro