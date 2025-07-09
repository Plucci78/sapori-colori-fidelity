import { useState, useEffect, memo } from 'react'
import { emailQuotaService } from '../../services/emailQuotaService'

const EmailQuotaWidget = memo(({ 
  showNotification, 
  onQuotaUpdate = null,
  className = '',
  compact = false,
  accordion = false // Nuova prop per modalità accordion
}) => {
  const [quotaData, setQuotaData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState([])
  const [showDetails, setShowDetails] = useState(false)
  const [projection, setProjection] = useState(null)
  const [isExpanded, setIsExpanded] = useState(false) // Per accordion mode

  // Carica dati quota
  const loadQuotaData = async () => {
    try {
      setLoading(true)
      const [usage, quotaAlerts, monthlyProjection] = await Promise.all([
        emailQuotaService.getCurrentUsage(),
        emailQuotaService.getQuotaAlerts(),
        emailQuotaService.getMonthlyProjection()
      ])
      
      setQuotaData(usage)
      setAlerts(quotaAlerts)
      setProjection(monthlyProjection)
      
      // Callback per parent component
      if (onQuotaUpdate) {
        onQuotaUpdate(usage)
      }
      
      // Mostra alert critici
      quotaAlerts.forEach(alert => {
        if (alert.priority === 'high') {
          showNotification?.(alert.message, alert.type)
        }
      })
      
    } catch (error) {
      console.error('Errore caricamento quota email:', error)
      showNotification?.('Errore nel caricamento delle quote email', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh ogni 5 minuti
  useEffect(() => {
    loadQuotaData()
    const interval = setInterval(loadQuotaData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Ottieni colore basato su status
  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return '#dc2626' // Rosso
      case 'warning': return '#f59e0b'  // Arancione
      case 'normal': return '#10b981'   // Verde
      default: return '#6b7280'         // Grigio
    }
  }

  // Ottieni icona basata su status
  const getStatusIcon = (status) => {
    switch (status) {
      case 'critical': return '🚨'
      case 'warning': return '⚠️'
      case 'normal': return '✅'
      default: return '📧'
    }
  }

  // Rendering per versione compatta
  const renderCompactView = () => (
    <div className={`email-quota-compact ${className}`}>
      <div className="quota-summary">
        <div className="quota-icon">
          {getStatusIcon(quotaData.monthly.status)}
        </div>
        <div className="quota-info">
          <div className="quota-remaining">
            {quotaData.monthly.remaining} email rimanenti
          </div>
          <div className="quota-reset">
            Reset: {quotaData.nextReset.daysRemaining}gg
          </div>
        </div>
        <button 
          className="quota-details-btn"
          onClick={() => setShowDetails(!showDetails)}
          title="Mostra dettagli quota"
        >
          📊
        </button>
      </div>
      
      {showDetails && (
        <div className="quota-details-popup">
          <div className="quota-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: `${quotaData.monthly.percentage}%`,
                  backgroundColor: getStatusColor(quotaData.monthly.status)
                }}
              />
            </div>
            <span>{quotaData.monthly.used}/{quotaData.monthly.limit}</span>
          </div>
          <div className="quota-next-reset">
            Rinnovo: {quotaData.nextReset.formatted}
          </div>
        </div>
      )}
    </div>
  )

  // Rendering per versione completa
  const renderFullView = () => (
    <div className={`email-quota-widget ${className}`}>
      <div className="quota-header">
        <h3>📧 Quote Email EmailJS</h3>
        <button 
          className="refresh-btn"
          onClick={loadQuotaData}
          disabled={loading}
          title="Aggiorna dati quota"
        >
          {loading ? '⏳' : '🔄'}
        </button>
      </div>

      {/* Quota Mensile */}
      <div className="quota-section">
        <div className="quota-section-header">
          <h4>
            {getStatusIcon(quotaData.monthly.status)} Quota Mensile
          </h4>
          <span className={`quota-status ${quotaData.monthly.status}`}>
            {quotaData.monthly.percentage}%
          </span>
        </div>
        
        <div className="quota-progress-bar">
          <div 
            className="quota-progress-fill"
            style={{ 
              width: `${Math.min(quotaData.monthly.percentage, 100)}%`,
              backgroundColor: getStatusColor(quotaData.monthly.status)
            }}
          />
        </div>
        
        <div className="quota-details">
          <div className="quota-stat">
            <span className="stat-label">Utilizzate:</span>
            <span className="stat-value">{quotaData.monthly.used}</span>
          </div>
          <div className="quota-stat">
            <span className="stat-label">Rimanenti:</span>
            <span className="stat-value">{quotaData.monthly.remaining}</span>
          </div>
          <div className="quota-stat">
            <span className="stat-label">Limite:</span>
            <span className="stat-value">{quotaData.monthly.limit}</span>
          </div>
        </div>
      </div>

      {/* Quota Giornaliera */}
      <div className="quota-section">
        <div className="quota-section-header">
          <h4>
            {getStatusIcon(quotaData.daily.status)} Quota Giornaliera
          </h4>
          <span className={`quota-status ${quotaData.daily.status}`}>
            {quotaData.daily.percentage}%
          </span>
        </div>
        
        <div className="quota-progress-bar">
          <div 
            className="quota-progress-fill"
            style={{ 
              width: `${Math.min(quotaData.daily.percentage, 100)}%`,
              backgroundColor: getStatusColor(quotaData.daily.status)
            }}
          />
        </div>
        
        <div className="quota-details">
          <div className="quota-stat">
            <span className="stat-label">Utilizzate oggi:</span>
            <span className="stat-value">{quotaData.daily.used}</span>
          </div>
          <div className="quota-stat">
            <span className="stat-label">Rimanenti oggi:</span>
            <span className="stat-value">{quotaData.daily.remaining}</span>
          </div>
        </div>
      </div>

      {/* Prossimo Reset */}
      <div className="quota-reset-info">
        <div className="reset-date">
          <h4>🔄 Prossimo Reset</h4>
          <div className="reset-details">
            <div className="reset-countdown">
              <span className="countdown-number">{quotaData.nextReset.daysRemaining}</span>
              <span className="countdown-label">
                {quotaData.nextReset.daysRemaining === 1 ? 'giorno' : 'giorni'}
              </span>
            </div>
            <div className="reset-date-text">
              {quotaData.nextReset.formatted}
            </div>
          </div>
        </div>
      </div>

      {/* Proiezione Fine Mese */}
      {projection && (
        <div className="quota-projection">
          <h4>📈 Proiezione Fine Mese</h4>
          <div className="projection-details">
            <div className="projection-stat">
              <span>Utilizzo previsto:</span>
              <span className={projection.willExceed ? 'text-warning' : 'text-success'}>
                {projection.projection}/{quotaData.monthly.limit}
                {projection.willExceed && ' ⚠️'}
              </span>
            </div>
            {projection.willExceed && projection.daysToLimit && (
              <div className="projection-warning">
                <span>⚠️ Limite raggiunto in ~{projection.daysToLimit} giorni</span>
              </div>
            )}
            <div className="projection-trend">
              <span>Media giornaliera: {projection.avgPerDay} email/giorno</span>
            </div>
          </div>
        </div>
      )}

      {/* Alert */}
      {alerts.length > 0 && (
        <div className="quota-alerts">
          <h4>⚠️ Avvisi</h4>
          {alerts.map((alert, index) => (
            <div key={index} className={`quota-alert ${alert.type}`}>
              <div className="alert-title">{alert.title}</div>
              <div className="alert-message">{alert.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // Rendering per versione accordion (collassabile)
  const renderAccordionView = () => (
    <div className={`email-quota-accordion ${className}`}>
      <div 
        className="accordion-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="accordion-title">
          <div className="accordion-icon">
            {getStatusIcon(quotaData.monthly.status)}
          </div>
          <h3>📧 Quote Email</h3>
          <div className="accordion-summary">
            <span className="quota-count">
              {quotaData.monthly.remaining} rimanenti
            </span>
            <span className={`quota-percentage ${quotaData.monthly.status}`}>
              {quotaData.monthly.percentage}%
            </span>
          </div>
        </div>
        <div className={`accordion-chevron ${isExpanded ? 'expanded' : ''}`}>
          ⌄
        </div>
      </div>
      
      {isExpanded && (
        <div className="accordion-content">
          <div className="accordion-body">
            {/* Quota Mensile */}
            <div className="quota-section">
              <div className="quota-section-header">
                <h4>Quota Mensile</h4>
                <span className={`quota-status ${quotaData.monthly.status}`}>
                  {quotaData.monthly.used}/{quotaData.monthly.limit}
                </span>
              </div>
              
              <div className="quota-progress-bar">
                <div 
                  className="quota-progress-fill"
                  style={{ 
                    width: `${Math.min(quotaData.monthly.percentage, 100)}%`,
                    backgroundColor: getStatusColor(quotaData.monthly.status)
                  }}
                />
              </div>
            </div>

            {/* Quota Giornaliera */}
            <div className="quota-section">
              <div className="quota-section-header">
                <h4>Quota Giornaliera</h4>
                <span className={`quota-status ${quotaData.daily.status}`}>
                  {quotaData.daily.used}/{quotaData.daily.limit}
                </span>
              </div>
              
              <div className="quota-progress-bar">
                <div 
                  className="quota-progress-fill"
                  style={{ 
                    width: `${Math.min(quotaData.daily.percentage, 100)}%`,
                    backgroundColor: getStatusColor(quotaData.daily.status)
                  }}
                />
              </div>
            </div>

            {/* Reset Info */}
            <div className="accordion-reset-info">
              <div className="reset-summary">
                <span>🔄 Reset tra {quotaData.nextReset.daysRemaining} giorni</span>
                <span className="reset-date">{quotaData.nextReset.formatted}</span>
              </div>
            </div>

            {/* Proiezione (se disponibile) */}
            {projection && (
              <div className="accordion-projection">
                <div className="projection-summary">
                  <span>📈 Proiezione fine mese:</span>
                  <span className={projection.willExceed ? 'text-warning' : 'text-success'}>
                    {projection.projection}/{quotaData.monthly.limit}
                    {projection.willExceed && ' ⚠️'}
                  </span>
                </div>
              </div>
            )}

            {/* Alert critici */}
            {alerts.filter(alert => alert.priority === 'high').map((alert, index) => (
              <div key={index} className={`accordion-alert ${alert.type}`}>
                {alert.title}: {alert.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  if (loading && !quotaData) {
    return (
      <div className={`email-quota-loading ${className}`}>
        <div className="loading-spinner">⏳</div>
        <span>Caricamento quote email...</span>
      </div>
    )
  }

  if (!quotaData) {
    return (
      <div className={`email-quota-error ${className}`}>
        <span>❌ Errore caricamento quote</span>
        <button onClick={loadQuotaData}>Riprova</button>
      </div>
    )
  }

  // Logica di rendering basata sui props
  if (accordion) return renderAccordionView()
  return compact ? renderCompactView() : renderFullView()
})

EmailQuotaWidget.displayName = 'EmailQuotaWidget'

export default EmailQuotaWidget
