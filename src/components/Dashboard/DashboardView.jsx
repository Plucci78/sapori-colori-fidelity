import { memo } from 'react'

const DashboardView = memo(({ todayStats, topCustomers, emailStats }) => (
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
))

DashboardView.displayName = 'DashboardView'

export default DashboardView