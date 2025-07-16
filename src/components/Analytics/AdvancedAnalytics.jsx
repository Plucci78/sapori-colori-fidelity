import './AdvancedAnalytics.css'
import { useState, useEffect, memo } from 'react'

const timeFrameOptions = [
  { value: 'week', label: 'Settimanale' },
  { value: 'month', label: 'Mensile' },
  { value: 'quarter', label: 'Trimestrale' },
  { value: 'year', label: 'Annuale' },
];

const comparisonTimeFrameOptions = [
  { value: 'none', label: 'Nessuno' },
  { value: 'previous_period', label: 'Periodo Precedente' },
  { value: 'same_period_last_year', label: 'Stesso Periodo Anno Scorso' },
];
import { supabase } from '../../supabase'
import { AreaChart, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area } from 'recharts'

// Tooltip Personalizzato per un look premium
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="analytics-custom-tooltip">
        <p className="tooltip-label">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="tooltip-item">
            <span className="tooltip-color-swatch" style={{ backgroundColor: p.color || p.stroke }}></span>
            <span className="tooltip-name">{p.name}:</span>
            <span className="tooltip-value">{p.name === 'Revenue' ? `€${p.value.toFixed(2)}` : p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const AdvancedAnalytics = memo(({ showNotification }) => {
  const [timeFrame, setTimeFrame] = useState('week')
  const [salesData, setSalesData] = useState([])
  const [comparisonTimeFrame, setComparisonTimeFrame] = useState('none') // 'none', 'previous_period', 'same_period_last_year'
  const [comparisonSalesData, setComparisonSalesData] = useState([])
  const [gemmeData, setGemmeData] = useState([])
  // const [customerStats, setCustomerStats] = useState([]) // Non utilizzato
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
  }, [timeFrame, dateRange, comparisonTimeFrame])

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

      // Carica dati per il confronto se richiesto
      if (comparisonTimeFrame !== 'none') {
        const compDateRange = getComparisonDateRange(dateRange, timeFrame, comparisonTimeFrame);
        const { data: compTransactions, error: compError } = await supabase
          .from('transactions')
          .select('amount, points_earned, created_at, customer_id')
          .gte('created_at', compDateRange.start)
          .lte('created_at', compDateRange.end)
          .order('created_at')
        
        if (compError) throw compError;
        const aggregatedCompData = aggregateByTimeFrame(compTransactions, timeFrame);
        setComparisonSalesData(aggregatedCompData);
      } else {
        setComparisonSalesData([]);
      }

    } catch (error) {
      console.error('Errore caricamento vendite:', error)
    }
  }

  // Funzione per ottenere il range di date per il confronto
  const getComparisonDateRange = (currentRange, currentFrame, comparisonFrame) => {
    const start = new Date(currentRange.start);
    const end = new Date(currentRange.end);
    let compStart, compEnd;

    const diffTime = Math.abs(end.getTime() - start.getTime());

    if (comparisonFrame === 'previous_period') {
      compEnd = new Date(start.getTime() - (1000 * 60 * 60 * 24)); // Giorno prima dell'inizio del periodo corrente
      compStart = new Date(compEnd.getTime() - diffTime);
    } else if (comparisonFrame === 'same_period_last_year') {
      // Clona gli oggetti Date per evitare mutazioni dirette dello stato
      const tempStart = new Date(start);
      const tempEnd = new Date(end);
      compStart = new Date(tempStart.setFullYear(tempStart.getFullYear() - 1));
      compEnd = new Date(tempEnd.setFullYear(tempEnd.getFullYear() - 1));
    }

    return {
      start: compStart.toISOString().split('T')[0],
      end: compEnd.toISOString().split('T')[0]
    };
  };

  // Carica distribuzione GEMME
  const loadGemmeDistribution = async () => {
    try {
      const { data: customers, error } = await supabase
        .from('customers')
        .select('points, created_at')

      if (error) throw error

      // Crea distribuzione per fasce
      const distribution = [
        { range: '0-49', count: customers.filter(c => c.points >= 0 && c.points < 50).length, color: '#D4AF37' }, // Oro
        { range: '50-99', count: customers.filter(c => c.points >= 50 && c.points < 100).length, color: '#CD853F' }, // Marrone chiaro
        { range: '100-199', count: customers.filter(c => c.points >= 100 && c.points < 200).length, color: '#A0522D' }, // Siena
        { range: '200-499', count: customers.filter(c => c.points >= 200 && c.points < 500).length, color: '#8B4513' }, // Marrone pane
        { range: '500+', count: customers.filter(c => c.points >= 500).length, color: '#7A3E0F' } // Marrone scuro
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
      // setCustomerStats(customerAnalytics) // Non utilizzato

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
        case 'week': {
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay()))
          key = weekStart.toISOString().split('T')[0]
          break
        }
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
        case 'quarter': {
          const quarter = Math.floor(date.getMonth() / 3) + 1
          key = `Q${quarter} ${date.getFullYear()}`
          break
        }
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
      <div className="analytics-loading">
        <div className="analytics-loading-spinner"></div>
        <p>Caricamento statistiche avanzate...</p>
      </div>
    )
  }

  return (
    <div className="analytics-dashboard analytics-fade-in">
      {console.log('Rendering AdvancedAnalytics. timeFrame:', timeFrame, 'comparisonTimeFrame:', comparisonTimeFrame)}
      {/* Header */}
      <div className="analytics-header">
        <div className="card-header">
          <h2 className="card-title">📊 Statistiche Avanzate</h2>
          <p className="card-subtitle">Dashboard completa per analisi business e performance</p>
        </div>
        <div className="analytics-controls">
          <div className="analytics-control-group">
            <label className="analytics-control-label">Periodo</label>
            <select
              value={timeFrame}
              onChange={e => setTimeFrame(e.target.value)}
              className="analytics-select"
            >
              {timeFrameOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="analytics-control-group">
            <label className="analytics-control-label">Da</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
              className="analytics-input"
            />
          </div>
          <div className="analytics-control-group">
            <label className="analytics-control-label">A</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
              className="analytics-input"
            />
          </div>
          <div className="analytics-control-group">
            <label className="analytics-control-label">Confronta con</label>
            <select
              value={comparisonTimeFrame}
              onChange={e => setComparisonTimeFrame(e.target.value)}
              className="analytics-select"
            >
              {comparisonTimeFrameOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="analytics-controls-actions">
            <button onClick={() => exportData('csv')} className="analytics-btn secondary">
              📄 Esporta CSV
            </button>
            <button onClick={loadAllAnalytics} className="analytics-btn primary">
              🔄 Aggiorna
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="analytics-kpi-grid analytics-slide-up">
        <div className="analytics-kpi-card">
          <div className="analytics-kpi-icon">
            <span data-lucide="credit-card"></span>
          </div>
          <div className="analytics-kpi-content">
            <h3>Revenue Totale</h3>
            <div className="analytics-kpi-value">€{kpiData.totalRevenue?.toFixed(2)}</div>
            <div className={`analytics-kpi-change ${kpiData.revenueGrowth >= 0 ? 'positive' : 'negative'}`}>
              <span data-lucide={kpiData.revenueGrowth >= 0 ? "trending-up" : "trending-down"}></span>
              {kpiData.revenueGrowth}% vs periodo precedente
            </div>
          </div>
        </div>
        <div className="analytics-kpi-card">
          <div className="analytics-kpi-icon">
            <span data-lucide="shopping-bag"></span>
          </div>
          <div className="analytics-kpi-content">
            <h3>Transazioni</h3>
            <div className="analytics-kpi-value">{kpiData.totalTransactions}</div>
            <div className="analytics-kpi-subtext">AOV: €{kpiData.avgOrderValue?.toFixed(2)}</div>
          </div>
        </div>
        <div className="analytics-kpi-card">
          <div className="analytics-kpi-icon">
            <span data-lucide="gem"></span>
          </div>
          <div className="analytics-kpi-content">
            <h3>GEMME Distribuite</h3>
            <div className="analytics-kpi-value">{kpiData.totalGemmeDistributed}</div>
            <div className="analytics-kpi-subtext">Sistema fidelizzazione</div>
          </div>
        </div>
        <div className="analytics-kpi-card">
          <div className="analytics-kpi-icon">
            <span data-lucide="users"></span>
          </div>
          <div className="analytics-kpi-content">
            <h3>Clienti Attivi</h3>
            <div className="analytics-kpi-value">{kpiData.activeCustomers}</div>
            <div className="analytics-kpi-subtext">Retention: {kpiData.customerRetention}%</div>
          </div>
        </div>
      </div>

      {/* Grafici principali - Layout a 2 pannelli per massima chiarezza */}
      <div className="analytics-charts-grid">
        {/* Pannello Revenue */}
        <div className="analytics-chart-container">
          <h3 className="analytics-chart-title">📈 Trend Revenue</h3>
          <div className="analytics-chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} syncId="trends">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200, #e5e7eb)" />
                <XAxis dataKey="period" tick={{ fill: 'var(--text-secondary, #4b5563)' }} />
                <YAxis tickFormatter={(value) => `€${value}`} tick={{ fill: 'var(--text-secondary, #4b5563)' }} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--gray-400, #9ca3af)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="revenue" strokeWidth={2} stroke="var(--brand-primary, #8B4513)" fill="var(--brand-primary, #8B4513)" fillOpacity={0.2} name="Revenue" />
                {comparisonSalesData.length > 0 && (
                  <Area type="monotone" dataKey="revenue" strokeWidth={1} stroke="var(--gray-500, #6B7280)" fill="var(--gray-500, #6B7280)" fillOpacity={0.1} name="Revenue (Confronto)" data={comparisonSalesData} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pannello Transazioni */}
        <div className="analytics-chart-container">
          <h3 className="analytics-chart-title">🛍️ Trend Transazioni</h3>
          <div className="analytics-chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData} syncId="trends">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200, #e5e7eb)" />
                <XAxis dataKey="period" tick={{ fill: 'var(--text-secondary, #4b5563)' }} />
                <YAxis tick={{ fill: 'var(--text-secondary, #4b5563)' }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(212, 175, 55, 0.1)' }} />
                <Bar dataKey="transactions" name="Transazioni" fill="var(--brand-secondary, #D4AF37)" radius={[4, 4, 0, 0]} />
                {comparisonSalesData.length > 0 && (
                  <Bar dataKey="transactions" name="Transazioni (Confronto)" fill="var(--gray-500, #6B7280)" radius={[4, 4, 0, 0]} data={comparisonSalesData} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Distribuzione GEMME e Top Clienti... */}
      <div className="analytics-secondary-grid">
        <div className="analytics-chart-container">
          <h3 className="analytics-chart-title">💎 Distribuzione GEMME per Cliente</h3>
          <div className="analytics-chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gemmeData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label
                  outerRadius={90}
                  dataKey="count"
                  labelStyle={{ fill: 'var(--text-primary)', fontWeight: '500' }}
                >
                  {gemmeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Clienti - HALL OF FAME */}
      <div className="analytics-top-customers">
        <h3>🏆 Hall of Fame: Top 10 Clienti</h3>
        <div className="analytics-customer-list">
          {topCustomers.map((customer, index) => {
            const topSpent = topCustomers[0]?.totalSpent || customer.totalSpent;
            const spendPercentage = topSpent > 0 ? (customer.totalSpent / topSpent) * 100 : 0;

            const getStatus = (c) => {
              if (c.points > 500) return { text: 'Cliente Oro', className: 'gold' };
              if (c.points > 200) return { text: 'Fedelissimo', className: 'silver' };
              const joinDate = new Date(c.created_at);
              const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
              if (joinDate > oneMonthAgo) return { text: 'Nuova Promessa', className: 'new' };
              return { text: 'Cliente Standard', className: 'standard' };
            };

            const timeSince = (date) => {
              if (!date) return 'N/D';
              const seconds = Math.floor((new Date() - new Date(date)) / 1000);
              let interval = seconds / 31536000;
              if (interval > 1) return Math.floor(interval) + " anni fa";
              interval = seconds / 2592000;
              if (interval > 1) return Math.floor(interval) + " mesi fa";
              interval = seconds / 86400;
              if (interval > 1) return Math.floor(interval) + " giorni fa";
              interval = seconds / 3600;
              if (interval > 1) return Math.floor(interval) + " ore fa";
              interval = seconds / 60;
              if (interval > 1) return Math.floor(interval) + " minuti fa";
              return "Poco fa";
            }

            const status = getStatus(customer);

            return (
              <div key={customer.id} className={`analytics-customer-row ${index < 3 ? 'podium' : ''}`}>
                <div className={`analytics-customer-rank ${index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : ''}`}>
                  <span>{index + 1}</span>
                </div>
                <div className="analytics-customer-details">
                  <div className="analytics-customer-header">
                    <span className="analytics-customer-name">{customer.name}</span>
                    <span className={`analytics-customer-status-badge ${status.className}`}>{status.text}</span>
                  </div>
                  <div className="analytics-customer-spend-bar-container">
                    <div 
                      className="analytics-customer-spend-bar"
                      style={{ width: `${spendPercentage}%` }}
                    ></div>
                  </div>
                  <div className="analytics-customer-stats">
                    <span className="analytics-customer-stat">💰 <strong>€{customer.totalSpent.toFixed(2)}</strong></span>
                    <span className="analytics-customer-stat">🛍️ <strong>{customer.transactionCount}</strong> ordini</span>
                    <span className="analytics-customer-stat">💎 <strong>{customer.points}</strong> GEMME</span>
                    <span className="analytics-customer-stat">🕒 Ultima visita: <strong>{timeSince(customer.lastTransaction)}</strong></span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Analisi dettagliata - HEATMAP */}
      <div className="analytics-detailed-table">
        <h3>Heatmap Dettagliata per Periodo</h3>
        <div className="analytics-table-wrapper">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Periodo</th>
                <th>Revenue</th>
                <th>Transazioni</th>
                <th>Crescita Revenue</th>
                <th>Clienti Unici</th>
                <th>AOV</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const maxRevenue = Math.max(...salesData.map(p => p.revenue), 0);
                const maxTransactions = Math.max(...salesData.map(p => p.transactions), 0);

                return salesData.map((period, index) => {
                  const prevPeriod = salesData[index - 1];
                  const growth = prevPeriod && prevPeriod.revenue > 0 
                    ? ((period.revenue - prevPeriod.revenue) / prevPeriod.revenue) * 100
                    : null;

                  const revenuePercentage = maxRevenue > 0 ? (period.revenue / maxRevenue) * 100 : 0;
                  const transactionsPercentage = maxTransactions > 0 ? (period.transactions / maxTransactions) * 100 : 0;

                  return (
                    <tr key={index}>
                      <td><strong>{period.period}</strong></td>
                      <td>
                        <div className="data-bar-cell">
                          <span>€{period.revenue.toFixed(2)}</span>
                          <div className="data-bar-container">
                            <div className="data-bar revenue" style={{ width: `${revenuePercentage}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="data-bar-cell">
                          <span>{period.transactions}</span>
                          <div className="data-bar-container">
                            <div className="data-bar transactions" style={{ width: `${transactionsPercentage}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {growth !== null ? (
                          <span className={`growth-indicator ${growth >= 0 ? 'positive' : 'negative'}`}>
                            <span data-lucide={growth >= 0 ? 'trending-up' : 'trending-down'}></span>
                            {growth.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="growth-indicator neutral">-</span>
                        )}
                      </td>
                      <td>{period.customers}</td>
                      <td>€{period.avgOrderValue.toFixed(2)}</td>
                    </tr>
                  )
                })
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
})

AdvancedAnalytics.displayName = 'AdvancedAnalytics'

export default AdvancedAnalytics