// ===================================
// SAPORI & COLORI - ACTIVITY LOG
// ===================================

import { useState, useEffect } from 'react'
import { activityService } from '../../services/activityService'
import { authService } from '../../services/authService'
import { useAuth } from '../../auth/AuthContext'

const ActivityLog = ({ showNotification }) => {
  // State
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    userId: '',
    category: '',
    action: '',
    severity: '',
    dateFrom: '',
    dateTo: '',
    limit: 50
  })
  const [users, setUsers] = useState([])
  const [summary, setSummary] = useState({})
  const [showFilters, setShowFilters] = useState(false)

  const { profile: currentUser } = useAuth()

  // Load data on component mount
  useEffect(() => {
    loadActivityLogs()
    loadActivitySummary()
    loadUsers()
  }, [])

  // Reload logs when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadActivityLogs()
    }, 500) // Debounce search

    return () => clearTimeout(timeoutId)
  }, [filters])

  // Load activity logs
  const loadActivityLogs = async () => {
    try {
      setLoading(true)
      
      // Prepare filters for API
      const apiFilters = { ...filters }
      
      // Remove empty filters
      Object.keys(apiFilters).forEach(key => {
        if (!apiFilters[key]) {
          delete apiFilters[key]
        }
      })

      const logsData = await activityService.getActivityLogs(apiFilters)
      setLogs(logsData || [])
    } catch (error) {
      console.error('Error loading activity logs:', error)
      showNotification('❌ Errore nel caricamento log', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Load activity summary
  const loadActivitySummary = async () => {
    try {
      const summaryData = await activityService.getActivitySummary(30)
      setSummary(summaryData || {})
    } catch (error) {
      console.error('Error loading activity summary:', error)
    }
  }

  // Load users for filter
  const loadUsers = async () => {
    try {
      const usersData = await authService.getAllUsers()
      setUsers(usersData || [])
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      search: '',
      userId: '',
      category: '',
      action: '',
      severity: '',
      dateFrom: '',
      dateTo: '',
      limit: 50
    })
  }

  // Export logs
  const handleExportLogs = async () => {
    try {
      setLoading(true)
      const exportData = await activityService.exportActivityLogs(filters)
      
      // Create CSV content
      const csvContent = [
        exportData.headers.join(','),
        ...exportData.data.map(row => 
          row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        )
      ].join('\n')

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = exportData.filename
      link.click()

      showNotification('✅ Log esportati con successo!', 'success')
    } catch (error) {
      console.error('Error exporting logs:', error)
      showNotification('❌ Errore nell\'esportazione log', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Get action color/style
  const getActionStyle = (action) => {
    const styles = {
      // Auth actions
      'LOGIN': { color: 'action-login', icon: '🔑' },
      'LOGOUT': { color: 'action-login', icon: '🔓' },
      'LOGIN_FAILED': { color: 'action-delete', icon: '🚫' },
      
      // Customer actions  
      'CUSTOMER_CREATED': { color: 'action-create', icon: '👤' },
      'CUSTOMER_UPDATED': { color: 'action-update', icon: '✏️' },
      'CUSTOMER_DELETED': { color: 'action-delete', icon: '🗑️' },
      
      // Transaction actions
      'TRANSACTION_CREATED': { color: 'action-create', icon: '💰' },
      'TRANSACTION_UPDATED': { color: 'action-update', icon: '🔄' },
      'POINTS_ADDED': { color: 'action-create', icon: '💎' },
      'POINTS_REDEEMED': { color: 'action-update', icon: '🏆' },
      
      // Email actions
      'EMAIL_SENT': { color: 'action-email', icon: '📧' },
      'EMAIL_CAMPAIGN': { color: 'action-email', icon: '📬' },
      
      // User management
      'USER_CREATED': { color: 'action-create', icon: '👥' },
      'USER_UPDATED': { color: 'action-update', icon: '✏️' },
      'USER_DELETED': { color: 'action-delete', icon: '🗑️' },
      'USER_ACTIVATED': { color: 'action-create', icon: '✅' },
      'USER_DEACTIVATED': { color: 'action-delete', icon: '🚫' },
      'PASSWORD_RESET': { color: 'action-update', icon: '🔑' },
      
      // System actions
      'SETTINGS_UPDATED': { color: 'action-update', icon: '⚙️' },
      'BACKUP_CREATED': { color: 'action-create', icon: '💾' },
      'SYSTEM_MAINTENANCE': { color: 'action-update', icon: '🔧' },
      'RESET_ALL_POINTS': { color: 'action-delete', icon: '🧹' }
    }
    
    return styles[action] || { color: 'action-update', icon: '📋' }
  }

  // Get severity color
  const getSeverityColor = (severity) => {
    const colors = {
      low: 'severity-low',
      medium: 'severity-medium', 
      high: 'severity-high',
      critical: 'severity-critical'
    }
    return colors[severity] || 'severity-low'
  }

  // Format details for display
  const formatDetails = (details) => {
    if (!details) return ''
    
    try {
      const parsed = typeof details === 'string' ? JSON.parse(details) : details
      
      // Extract key information
      const keyInfo = []
      
      if (parsed.customer_name) keyInfo.push(`Cliente: ${parsed.customer_name}`)
      if (parsed.amount) keyInfo.push(`Importo: €${parsed.amount}`)
      if (parsed.points_earned) keyInfo.push(`GEMME: +${parsed.points_earned}`)
      if (parsed.email_count) keyInfo.push(`Email: ${parsed.email_count}`)
      if (parsed.target_user_name) keyInfo.push(`Utente: ${parsed.target_user_name}`)
      
      return keyInfo.join(' • ') || JSON.stringify(parsed, null, 2)
    } catch {
      return String(details)
    }
  }

  // Get user display name
  const getUserDisplayName = (log) => {
    return log.user_name || log.user_email || 'Sistema'
  }

  // Get user avatar
  const getUserAvatar = (log) => {
    if (!log.user_name && !log.user_email) {
      return { initials: '🤖', class: 'system-avatar' }
    }
    
    const initials = log.user_name 
      ? log.user_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : log.user_email[0].toUpperCase()
    
    const roleClass = {
      admin: 'admin-avatar',
      manager: 'manager-avatar',
      operator: 'operator-avatar'
    }[log.user_role] || 'operator-avatar'

    return { initials, class: roleClass }
  }

  return (
    <div className="activity-log">
      
      {/* HEADER CON STATISTICHE */}
      <div className="activity-stats-grid">
        <div className="stat-card stat-total">
          <div className="stat-number">{summary.totalActivities || 0}</div>
          <div className="stat-label">Attività (30gg)</div>
        </div>
        <div className="stat-card stat-active">
          <div className="stat-number">{Object.keys(summary.byCategory || {}).length}</div>
          <div className="stat-label">Categorie</div>
        </div>
        <div className="stat-card stat-warning">
          <div className="stat-number">{(summary.bySeverity?.high || 0) + (summary.bySeverity?.critical || 0)}</div>
          <div className="stat-label">Priorità Alta</div>
        </div>
        <div className="stat-card stat-info">
          <div className="stat-number">{logs.length}</div>
          <div className="stat-label">Log Filtrati</div>
        </div>
      </div>

      {/* HEADER CON AZIONI */}
      <div className="activity-header">
        <h3>📋 Activity Log Sistema</h3>
        <div className="activity-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            🔍 {showFilters ? 'Nascondi' : 'Mostra'} Filtri
          </button>
          <button
            className="btn btn-primary"
            onClick={handleExportLogs}
            disabled={loading || logs.length === 0}
          >
            📊 Esporta Log
          </button>
        </div>
      </div>

      {/* FILTRI */}
      {showFilters && (
        <div className="activity-filters">
          <div className="filters-grid">
            
            {/* Search */}
            <div className="filter-group">
              <label className="filter-label">🔍 Ricerca</label>
              <input
                type="text"
                className="filter-input"
                placeholder="Cerca nelle attività..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>

            {/* User */}
            <div className="filter-group">
              <label className="filter-label">👤 Utente</label>
              <select
                className="filter-input"
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
              >
                <option value="">Tutti gli utenti</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div className="filter-group">
              <label className="filter-label">📂 Categoria</label>
              <select
                className="filter-input"
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <option value="">Tutte le categorie</option>
                <option value="auth">🔑 Autenticazione</option>
                <option value="customer">👥 Clienti</option>
                <option value="transaction">💰 Transazioni</option>
                <option value="email">📧 Email</option>
                <option value="user_management">👥 Gestione Utenti</option>
                <option value="system">⚙️ Sistema</option>
              </select>
            </div>

            {/* Severity */}
            <div className="filter-group">
              <label className="filter-label">⚠️ Priorità</label>
              <select
                className="filter-input"
                value={filters.severity}
                onChange={(e) => handleFilterChange('severity', e.target.value)}
              >
                <option value="">Tutte le priorità</option>
                <option value="low">🟢 Bassa</option>
                <option value="medium">🟡 Media</option>
                <option value="high">🟠 Alta</option>
                <option value="critical">🔴 Critica</option>
              </select>
            </div>

            {/* Date From */}
            <div className="filter-group">
              <label className="filter-label">📅 Da Data</label>
              <input
                type="date"
                className="filter-input"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>

            {/* Date To */}
            <div className="filter-group">
              <label className="filter-label">📅 A Data</label>
              <input
                type="date"
                className="filter-input"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>

          </div>

          <div className="filters-actions">
            <button
              className="btn btn-secondary"
              onClick={clearFilters}
            >
              🧹 Pulisci Filtri
            </button>
            <button
              className="btn btn-primary"
              onClick={loadActivityLogs}
              disabled={loading}
            >
              🔄 Aggiorna
            </button>
          </div>
        </div>
      )}

      {/* LOADING */}
      {loading && logs.length === 0 && (
        <div className="loading-container">
          <div className="loading-spinner">⏳</div>
          <p>Caricamento log attività...</p>
        </div>
      )}

      {/* LOG TABLE */}
      {!loading && logs.length === 0 ? (
        <div className="no-logs">
          <div className="no-logs-icon">📭</div>
          <h4>Nessun log trovato</h4>
          <p>Non ci sono attività che corrispondono ai filtri selezionati.</p>
        </div>
      ) : (
        <div className="logs-container">
          <div className="logs-table-wrapper">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>📅 Data/Ora</th>
                  <th>👤 Utente</th>
                  <th>🎯 Azione</th>
                  <th>📄 Dettagli</th>
                  <th>⚠️ Priorità</th>
                  <th>🌐 IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => {
                  const actionStyle = getActionStyle(log.action)
                  const avatar = getUserAvatar(log)
                  
                  return (
                    <tr key={log.id || index} className="log-row">
                      
                      {/* Timestamp */}
                      <td className="log-timestamp">
                        <div className="timestamp-display">
                          {new Date(log.timestamp).toLocaleDateString('it-IT')}
                          <br />
                          <small>{new Date(log.timestamp).toLocaleTimeString('it-IT')}</small>
                        </div>
                      </td>

                      {/* User */}
                      <td className="log-user">
                        <div className="user-display">
                          <div className={`user-avatar-small ${avatar.class}`}>
                            {avatar.initials}
                          </div>
                          <div className="user-info">
                            <div className="user-name">{getUserDisplayName(log)}</div>
                            {log.user_role && (
                              <small className="user-role">{log.user_role}</small>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="log-action">
                        <span className={`action-badge ${actionStyle.color}`}>
                          {actionStyle.icon} {log.action}
                        </span>
                      </td>

                      {/* Details */}
                      <td className="log-details">
                        <div className="details-content">
                          {formatDetails(log.details)}
                          {log.entity_type && log.entity_id && (
                            <div className="entity-info">
                              <small>
                                {log.entity_type} #{log.entity_id}
                              </small>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Severity */}
                      <td className="log-severity">
                        <span className={`severity-badge ${getSeverityColor(log.severity)}`}>
                          {log.severity || 'low'}
                        </span>
                      </td>

                      {/* IP */}
                      <td className="log-ip">
                        <code className="ip-address">
                          {log.ip_address || 'N/A'}
                        </code>
                      </td>

                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* PAGINATION INFO */}
          {logs.length >= filters.limit && (
            <div className="pagination-info">
              <p>
                Mostrati {logs.length} log. 
                <button 
                  className="btn-link"
                  onClick={() => handleFilterChange('limit', filters.limit + 50)}
                >
                  Carica altri 50 →
                </button>
              </p>
            </div>
          )}
        </div>
      )}

      {/* LOADING OVERLAY */}
      {loading && logs.length > 0 && (
        <div className="loading-overlay">
          <div className="loading-spinner">⏳</div>
        </div>
      )}

    </div>
  )
}

export default ActivityLog