import { memo } from 'react'

const AnalyticsView = memo(({ todayStats, topCustomers, prizes }) => (
  <div className="p-6">
    {/* Dashboard Header */}
    <div className="dashboard-header flex items-center gap-4 mb-8 p-6 rounded-xl bg-gradient-to-r from-blue-100 to-cyan-100 shadow">
      <div className="text-5xl">📊</div>
      <div>
        <h1 className="text-3xl font-extrabold text-brand mb-1">Analytics Avanzate</h1>
        <p className="text-secondary">Statistiche dettagliate e insights</p>
      </div>
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
))

AnalyticsView.displayName = 'AnalyticsView'

export default AnalyticsView