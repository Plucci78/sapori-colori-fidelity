import '../../App.css'
import { useState, useEffect, memo } from 'react'
import { supabase } from '../../supabase'
import { LineChart, Line, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const AdvancedAnalytics = memo(({ showNotification }) => {
  const [timeFrame, setTimeFrame] = useState('week')
  const [salesData, setSalesData] = useState([])
  const [gemmeData, setGemmeData] = useState([])
  const [customerStats, setCustomerStats] = useState([])
  const [topCustomers, setTopCustomers] = useState([])
  const [kpiData, setKpiData] = useState({})
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    loadAllAnalytics()
    // eslint-disable-next-line
  }, [timeFrame, dateRange])

  // Funzione principale per caricare tutti i dati
  const loadAllAnalytics = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadSalesData(),
        loadGemmeDistribution(),
        loadCustomerAnalytics(),
        loadKPIData()
      ])
    } catch (error) {
      console.error('Errore caricamento analytics:', error)
      showNotification('Errore nel caricamento delle statistiche', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Carica dati vendite per periodo
  const loadSalesData = async () => {
    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount, points_earned, created_at, customer_id')
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)
        .order('created_at')

      if (error) throw error

      // Aggrega dati per periodo
      const aggregatedData = aggregateByTimeFrame(transactions, timeFrame)
      setSalesData(aggregatedData)

    } catch (error) {
      console.error('Errore caricamento vendite:', error)
    }
  }

  // Carica distribuzione GEMME
  const loadGemmeDistribution = async () => {
    try {
      const { data: customers, error } = await supabase
        .from('customers')
        .select('points, created_at')

      if (error) throw error

      // Crea distribuzione per fasce
      const distribution = [
        { range: '0-49', count: customers.filter(c => c.points >= 0 && c.points < 50).length, color: '#FF6B6B' },
        { range: '50-99', count: customers.filter(c => c.points >= 50 && c.points < 100).length, color: '#4ECDC4' },
        { range: '100-199', count: customers.filter(c => c.points >= 100 && c.points < 200).length, color: '#45B7D1' },
        { range: '200-499', count: customers.filter(c => c.points >= 200 && c.points < 500).length, color: '#96CEB4' },
        { range: '500+', count: customers.filter(c => c.points >= 500).length, color: '#FFEAA7' }
      ]

      setGemmeData(distribution)

    } catch (error) {
      console.error('Errore distribuzione GEMME:', error)
    }
  }

  // Carica analytics clienti
  const loadCustomerAnalytics = async () => {
    try {
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id, name, points, created_at')

      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('customer_id, amount, created_at')
        .gte('created_at', dateRange.start)

      if (customersError || transactionsError) throw customersError || transactionsError

      // Calcola statistiche per ogni cliente
      const customerAnalytics = customers.map(customer => {
        const customerTransactions = transactions.filter(t => t.customer_id === customer.id)
        const totalSpent = customerTransactions.reduce((sum, t) => sum + Number(t.amount), 0)
        const transactionCount = customerTransactions.length
        const avgOrderValue = transactionCount > 0 ? totalSpent / transactionCount : 0
        
        return {
          ...customer,
          totalSpent,
          transactionCount,
          avgOrderValue,
          lastTransaction: customerTransactions.length > 0 
            ? new Date(Math.max(...customerTransactions.map(t => new Date(t.created_at))))
            : null
        }
      })

      // Top 10 clienti per valore
      const top10 = customerAnalytics
        .filter(c => c.totalSpent > 0)
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10)

      setTopCustomers(top10)
      setCustomerStats(customerAnalytics)

    } catch (error) {
      console.error('Errore analytics clienti:', error)
    }
  }

  // Carica KPI principali
  const loadKPIData = async () => {
    try {
      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('amount, points_earned, created_at, customer_id')
        .gte('created_at', dateRange.start)

      const { data: customers, error: custError } = await supabase
        .from('customers')
        .select('id, points, created_at')

      if (transError || custError) throw transError || custError

      // Calcola KPI
      const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.amount), 0)
      const totalTransactions = transactions.length
      const avgOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0
      const totalGemmeDistributed = transactions.reduce((sum, t) => sum + t.points_earned, 0)
      const activeCustomers = new Set(transactions.map(t => t.customer_id)).size
      const newCustomersInPeriod = customers.filter(c => 
        c.created_at >= dateRange.start && c.created_at <= dateRange.end
      ).length

      // Confronto periodo precedente
      const periodLength = new Date(dateRange.end) - new Date(dateRange.start)
      const previousStart = new Date(new Date(dateRange.start) - periodLength)
      const previousEnd = new Date(dateRange.start)

      const { data: previousTransactions } = await supabase
        .from('transactions')
        .select('amount')
        .gte('created_at', previousStart.toISOString())
        .lt('created_at', previousEnd.toISOString())

      const previousRevenue = previousTransactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0
      const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue * 100) : 0

      setKpiData({
        totalRevenue,
        totalTransactions,
        avgOrderValue,
        totalGemmeDistributed,
        activeCustomers,
        newCustomersInPeriod,
        revenueGrowth: revenueGrowth.toFixed(1),
        customerRetention: activeCustomers > 0 ? ((activeCustomers - newCustomersInPeriod) / activeCustomers * 100).toFixed(1) : 0
      })

    } catch (error) {
      console.error('Errore KPI:', error)
    }
  }

  // Aggrega dati per timeframe
  const aggregateByTimeFrame = (transactions, frame) => {
    const grouped = {}
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.created_at)
      let key

      switch (frame) {
        case 'week':
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay()))
          key = weekStart.toISOString().split('T')[0]
          break
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
        case 'quarter':
          const quarter = Math.floor(date.getMonth() / 3) + 1
          key = `Q${quarter} ${date.getFullYear()}`
          break
        case 'year':
          key = date.getFullYear().toString()
          break
        default:
          key = date.toISOString().split('T')[0]
      }

      if (!grouped[key]) {
        grouped[key] = {
          period: key,
          revenue: 0,
          transactions: 0,
          gemme: 0,
          customers: new Set()
        }
      }

      grouped[key].revenue += Number(transaction.amount)
      grouped[key].transactions += 1
      grouped[key].gemme += transaction.points_earned
      grouped[key].customers.add(transaction.customer_id)
    })

    return Object.values(grouped).map(item => ({
      ...item,
      customers: item.customers.size,
      avgOrderValue: item.transactions > 0 ? item.revenue / item.transactions : 0
    })).sort((a, b) => a.period.localeCompare(b.period))
  }

  // Export dati
  const exportData = (format) => {
    if (format === 'csv') {
      const csvData = salesData.map(item => 
        `${item.period},${item.revenue},${item.transactions},${item.gemme},${item.customers}`
      ).join('\n')
      
      const blob = new Blob([`Periodo,Revenue,Transazioni,GEMME,Clienti\n${csvData}`], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics_${timeFrame}_${Date.now()}.csv`
      a.click()
    }
    
    showNotification(`📊 Dati esportati in formato ${format.toUpperCase()}`, 'success')
  }

  useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons()
    }
  })

  if (loading) {
    return (
      <div className="dashboard-section">
        <div className="loading-spinner"></div>
        <p>Caricamento statistiche avanzate...</p>
      </div>
    )
  }

  return (
    <div className="dashboard-section">
      {/* Header */}
      <div className="card mb-6">
        <div className="card-header">
          <h2 className="card-title">📊 Statistiche Avanzate</h2>
          <p className="card-subtitle">Dashboard completa per analisi business e performance</p>
        </div>
        <div className="card-body flex flex-wrap gap-4 items-end">
          <div>
            <label className="block mb-1 font-semibold">Periodo</label>
            <select
              value={timeFrame}
              onChange={e => setTimeFrame(e.target.value)}
              className="input"
            >
              <option value="week">Settimanale</option>
              <option value="month">Mensile</option>
              <option value="quarter">Trimestrale</option>
              <option value="year">Annuale</option>
            </select>
          </div>
          <div>
            <label className="block mb-1 font-semibold">Da</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold">A</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
              className="input"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => exportData('csv')} className="btn btn-secondary">
              📄 Esporta CSV
            </button>
            <button onClick={loadAllAnalytics} className="btn btn-primary">
              🔄 Aggiorna
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-4 gap-4 mb-6">
        <div className="card kpi-card">
          <div className="kpi-icon text-3xl mb-2">
            <span data-lucide="credit-card"></span>
          </div>
          <div className="kpi-content">
            <h3 className="kpi-title">Revenue Totale</h3>
            <div className="kpi-value">€{kpiData.totalRevenue?.toFixed(2)}</div>
            <div className={`kpi-change ${kpiData.revenueGrowth >= 0 ? 'positive' : 'negative'}`}>
              <span data-lucide={kpiData.revenueGrowth >= 0 ? "trending-up" : "trending-down"} className="lucide-icon-small"></span>
              {kpiData.revenueGrowth}% vs periodo precedente
            </div>
          </div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-icon text-3xl mb-2">
            <span data-lucide="shopping-bag"></span>
          </div>
          <div className="kpi-content">
            <h3 className="kpi-title">Transazioni</h3>
            <div className="kpi-value">{kpiData.totalTransactions}</div>
            <div className="kpi-subtext">AOV: €{kpiData.avgOrderValue?.toFixed(2)}</div>
          </div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-icon text-3xl mb-2">
            <span data-lucide="gem"></span>
          </div>
          <div className="kpi-content">
            <h3 className="kpi-title">GEMME Distribuite</h3>
            <div className="kpi-value">{kpiData.totalGemmeDistributed}</div>
            <div className="kpi-subtext">Sistema fidelizzazione</div>
          </div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-icon text-3xl mb-2">
            <span data-lucide="users"></span>
          </div>
          <div className="kpi-content">
            <h3 className="kpi-title">Clienti Attivi</h3>
            <div className="kpi-value">{kpiData.activeCustomers}</div>
            <div className="kpi-subtext">Retention: {kpiData.customerRetention}%</div>
          </div>
        </div>
      </div>

      {/* Grafici principali */}
      <div className="grid grid-2 gap-6 mb-6">
        <div className="card chart-container">
          <h3 className="card-title mb-2">📈 Trend Revenue & Transazioni</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip formatter={(value, name) => [
                name === 'revenue' ? `€${value.toFixed(2)}` : value,
                name === 'revenue' ? 'Revenue' : name === 'transactions' ? 'Transazioni' : 'AOV'
              ]} />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} name="Revenue" />
              <Line yAxisId="right" type="monotone" dataKey="transactions" stroke="#82ca9d" strokeWidth={3} name="Transazioni" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card chart-container">
          <h3 className="card-title mb-2">💎 Distribuzione GEMME per Cliente</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={gemmeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ range, count, percent }) => `${range}: ${count} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {gemmeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Clienti */}
      <div className="card mb-6">
        <h3 className="card-title mb-4">Top 10 Clienti per Valore</h3>
        <div className="top-customers-list">
          {topCustomers.map((customer, index) => (
            <div key={customer.id} className={`top-customer-row-better ${index < 3 ? 'podium' : ''}`}>
              <div className={`customer-rank-badge-better ${index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : ''}`}>
                <span className="rank-num-better">{index + 1}</span>
              </div>
              <div className="customer-info-better">
                <div className="customer-name-better">{customer.name}</div>
                <div className="customer-stats-row-better">
                  <span className="stat">Totale speso: €{customer.totalSpent.toFixed(2)}</span>
                  <span className="stat">Ordini: {customer.transactionCount}</span>
                  <span className="stat">Gemme: {customer.points}</span>
                  <span className="stat">AOV: €{customer.avgOrderValue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Analisi dettagliata */}
      <div className="card">
        <h3 className="card-title mb-4">📊 Analisi Dettagliata per Periodo</h3>
        <div className="analytics-table">
          <table>
            <thead>
              <tr>
                <th>Periodo</th>
                <th>Revenue</th>
                <th>Transazioni</th>
                <th>GEMME</th>
                <th>Clienti Unici</th>
                <th>AOV</th>
              </tr>
            </thead>
            <tbody>
              {salesData.map((period, index) => (
                <tr key={index}>
                  <td>{period.period}</td>
                  <td>€{period.revenue.toFixed(2)}</td>
                  <td>{period.transactions}</td>
                  <td>{period.gemme}</td>
                  <td>{period.customers}</td>
                  <td>€{period.avgOrderValue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
})

AdvancedAnalytics.displayName = 'AdvancedAnalytics'

export default AdvancedAnalytics