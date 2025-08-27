import React, { useState, useEffect } from 'react'
import { emailTrackingService } from '../../services/emailTrackingService'
import { BarChart3, Send, Target, TrendingUp } from 'lucide-react'

const EmailStatsDashboard = () => {
  const [stats, setStats] = useState({
    totalSent: 0,
    totalOpened: 0,
    totalClicked: 0,
    avgOpenRate: 0,
    avgClickRate: 0
  })
  const [topEmails, setTopEmails] = useState([])
  const [recentCampaigns, setRecentCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState(30)

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // Carica statistiche generali
      const dashboardStats = await emailTrackingService.getDashboardStats(selectedPeriod)
      setStats(dashboardStats)

      // Carica top email
      const topPerforming = await emailTrackingService.getTopPerformingEmails(5)
      setTopEmails(topPerforming)

      // Carica campagne recenti
      const endDate = new Date().toISOString()
      const startDate = new Date(Date.now() - selectedPeriod * 24 * 60 * 60 * 1000).toISOString()
      const recent = await emailTrackingService.getStatsForPeriod(startDate, endDate)
      setRecentCampaigns(recent.slice(0, 10))

    } catch (error) {
      console.error('Errore caricamento statistiche:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadDashboardData()
  }, [selectedPeriod])

  const formatPercentage = (value) => {
    return `${value.toFixed(1)}%`
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
      <div className="email-stats-dashboard loading">
        <div className="stats-spinner">
          <div className="spinner"></div>
          <p>Caricamento statistiche...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="email-stats-dashboard">
      {/* Header con filtri periodo */}
      <div className="stats-header">
        <h2 style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <BarChart3 size={24} />
          Statistiche Email
        </h2>
        <div className="header-controls">
          <div className="period-selector">
            <label>Periodo:</label>
            <select 
              value={selectedPeriod} 
              onChange={(e) => setSelectedPeriod(Number(e.target.value))}
              className="period-select"
            >
              <option value={7}>Ultimi 7 giorni</option>
              <option value={30}>Ultimi 30 giorni</option>
              <option value={90}>Ultimi 3 mesi</option>
              <option value={365}>Ultimo anno</option>
            </select>
          </div>
          <button 
            onClick={loadDashboardData} 
            disabled={loading}
            className="refresh-btn"
            style={{
              marginLeft: '15px',
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '🔄 Aggiornamento...' : '🔄 Aggiorna'}
          </button>
        </div>
      </div>

      {/* Statistiche principali */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon">
            <Send size={24} />
          </div>
          <div className="stat-content">
            <h3>{stats.totalSent.toLocaleString()}</h3>
            <p>Email Inviate</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📖</div>
          <div className="stat-content">
            <h3>{stats.totalOpened.toLocaleString()}</h3>
            <p>Email Aperte</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🖱️</div>
          <div className="stat-content">
            <h3>{stats.totalClicked.toLocaleString()}</h3>
            <p>Link Cliccati</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <h3>{formatPercentage(stats.avgOpenRate)}</h3>
            <p>Tasso Apertura Medio</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Target size={24} />
          </div>
          <div className="stat-content">
            <h3>{formatPercentage(stats.avgClickRate)}</h3>
            <p>Tasso Click Medio</p>
          </div>
        </div>
      </div>

      <div className="stats-content">
        {/* Top Email Performance */}
        <div className="stats-section">
          <h3>🏆 Top Email Performance</h3>
          {topEmails.length === 0 ? (
            <div className="no-data">
              <p>Nessuna email con statistiche disponibile.</p>
            </div>
          ) : (
            <div className="top-emails-list">
              {topEmails.map((email, index) => (
                <div key={email.id} className="email-performance-item">
                  <div className="performance-rank">#{index + 1}</div>
                  <div className="performance-content">
                    <h4>{email.email_logs?.subject || email.campaign_name}</h4>
                    <p className="email-date">
                      {formatDate(email.email_logs?.sent_at || email.created_at)}
                    </p>
                    <div className="performance-metrics">
                      <span className="metric">
                        <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                          <Send size={16} />
                          {email.total_sent} inviate
                        </span>
                      </span>
                      <span className="metric">
                        📖 {formatPercentage(email.open_rate)} aperture
                      </span>
                      <span className="metric">
                        🖱️ {formatPercentage(email.click_rate)} click
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Campagne Recenti */}
        <div className="stats-section">
          <h3>📅 Campagne Recenti</h3>
          {recentCampaigns.length === 0 ? (
            <div className="no-data">
              <p>Nessuna campagna recente trovata.</p>
            </div>
          ) : (
            <div className="recent-campaigns-table">
              <div className="table-header">
                <span>Oggetto</span>
                <span>Data</span>
                <span>Inviate</span>
                <span>Aperte</span>
                <span>Click</span>
              </div>
              {recentCampaigns.map((campaign) => {
                const stats = campaign.email_campaign_stats?.[0]
                return (
                  <div key={campaign.id} className="table-row">
                    <span className="campaign-subject">
                      {campaign.subject || 'Email senza oggetto'}
                    </span>
                    <span className="campaign-date">
                      {formatDate(campaign.sent_at)}
                    </span>
                    <span className="campaign-sent">
                      {campaign.recipients_count || 0}
                    </span>
                    <span className="campaign-opened">
                      {stats ? formatPercentage(stats.open_rate) : '0%'}
                    </span>
                    <span className="campaign-clicked">
                      {stats ? formatPercentage(stats.click_rate) : '0%'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EmailStatsDashboard