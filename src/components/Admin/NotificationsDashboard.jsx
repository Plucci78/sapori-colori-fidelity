import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import oneSignalService from '../../services/onesignalService'
import './NotificationsDashboard.css'

const NotificationsDashboard = () => {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState({ show: false, message: '', type: '' })
  
  // Form state per notifica
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    targetType: 'all', // 'all', 'level', 'individual'
    targetLevel: '',
    targetCustomers: [],
    url: '',
    scheduleType: 'now', // 'now', 'scheduled'
    scheduledDate: '',
    scheduledTime: ''
  })

  // Statistiche
  const [stats, setStats] = useState({
    totalSubscribers: 0,
    activeSubscribers: 0,
    sentToday: 0,
    deliveryRate: 0
  })

  const [levels, setLevels] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Debug: Prima carica tutti i clienti
      const { data: allCustomers } = await supabase
        .from('customers')
        .select('id, name, email, onesignal_player_id, is_active')
      
      console.log('🔍 TUTTI i clienti nel database:', allCustomers)
      console.log('🔍 Clienti con player_id:', allCustomers?.filter(c => c.onesignal_player_id))
      
      // Carica clienti attivi con player_id OneSignal (senza join che causa errore 400)
      const { data: customersData } = await supabase
        .from('customers')
        .select('*')
        .eq('is_active', true)
        .not('onesignal_player_id', 'is', null)
        .order('created_at', { ascending: false })
      
      console.log('🔍 Clienti filtrati (attivi + player_id):', customersData)
      setCustomers(customersData || [])

      // Carica livelli clienti
      const { data: levelsData } = await supabase
        .from('customer_levels')
        .select('*')
        .eq('active', true)
        .order('sort_order')
      
      setLevels(levelsData || [])

      // Calcola statistiche
      const totalSubscribers = customersData?.length || 0
      const activeSubscribers = customersData?.filter(c => c.onesignal_player_id)?.length || 0
      
      setStats({
        totalSubscribers,
        activeSubscribers,
        sentToday: 0, // TODO: implementare conteggio dal database
        deliveryRate: activeSubscribers > 0 ? Math.round((activeSubscribers / totalSubscribers) * 100) : 0
      })

      showNotification('✅ Dati caricati con successo')
    } catch (error) {
      console.error('Errore caricamento dati:', error)
      showNotification('❌ Errore nel caricamento dei dati', 'error')
    } finally {
      setLoading(false)
    }
  }

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type })
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' })
    }, 4000)
  }

  const handleInputChange = (field, value) => {
    setNotificationForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const getTargetAudience = () => {
    switch (notificationForm.targetType) {
      case 'all':
        return customers
      case 'level':
        return customers.filter(c => c.current_level === notificationForm.targetLevel)
      case 'individual':
        return customers.filter(c => notificationForm.targetCustomers.includes(c.id))
      default:
        return []
    }
  }

  const verifyPlayerIds = async () => {
    setLoading(true)
    try {
      showNotification('🔍 Verificando Player ID...', 'info')
      
      const response = await fetch('/api/verify-players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (result.success) {
        const { verified, invalid, reregistered } = result.results
        showNotification(
          `✅ Verifica completata: ${verified.length} validi, ${invalid.length} invalidi, ${reregistered.length} ripristinati`
        )
        
        // Ricarica i dati dopo la verifica
        await loadData()
      } else {
        showNotification(`❌ Errore verifica: ${result.error}`, 'error')
      }
    } catch (error) {
      console.error('Errore verifica Player ID:', error)
      showNotification('❌ Errore durante la verifica Player ID', 'error')
    } finally {
      setLoading(false)
    }
  }

  const sendNotification = async () => {
    if (!notificationForm.title.trim() || !notificationForm.message.trim()) {
      showNotification('❌ Titolo e messaggio sono obbligatori', 'error')
      return
    }

    const targetAudience = getTargetAudience()
    if (targetAudience.length === 0) {
      showNotification('❌ Nessun destinatario selezionato', 'error')
      return
    }

    setLoading(true)
    try {
      const playerIds = targetAudience
        .filter(c => c.onesignal_player_id)
        .map(c => c.onesignal_player_id)

      if (playerIds.length === 0) {
        showNotification('❌ Nessun cliente ha le notifiche attive', 'error')
        return
      }

      // Se è programmata, TODO: implementare scheduling
      if (notificationForm.scheduleType === 'scheduled') {
        showNotification('⏰ Programmazione notifiche non ancora implementata', 'error')
        return
      }

      // Invia notifica tramite OneSignal
      const result = await oneSignalService.sendNotification({
        title: notificationForm.title,
        message: notificationForm.message,
        playerIds: playerIds,
        url: notificationForm.url || undefined
      })

      if (result.success) {
        showNotification(`✅ Notifica inviata a ${playerIds.length} clienti`)
        
        // Reset form
        setNotificationForm({
          title: '',
          message: '',
          targetType: 'all',
          targetLevel: '',
          targetCustomers: [],
          url: '',
          scheduleType: 'now',
          scheduledDate: '',
          scheduledTime: ''
        })

        // TODO: Salvare nel database per statistiche
        // await supabase.from('notification_history').insert({...})
        
      } else {
        showNotification(`❌ Errore invio: ${result.error}`, 'error')
      }

    } catch (error) {
      console.error('Errore invio notifica:', error)
      showNotification('❌ Errore durante l\'invio della notifica', 'error')
    } finally {
      setLoading(false)
    }
  }

  const targetAudience = getTargetAudience()

  return (
    <div className="notifications-dashboard">
      {notification.show && (
        <div className={`dashboard-notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="dashboard-header">
        <h1>📱 Dashboard Notifiche Push</h1>
        <p>Gestisci e invia notifiche ai tuoi clienti tramite OneSignal</p>
        
        <div className="header-actions">
          <button
            className="btn-verify-players"
            onClick={verifyPlayerIds}
            disabled={loading}
          >
            {loading ? '🔍 Verificando...' : '🔧 Verifica Player ID'}
          </button>
        </div>
      </div>

      {/* Statistiche */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalSubscribers}</div>
            <div className="stat-label">Clienti Totali</div>
          </div>
        </div>
        <div className="stat-card active">
          <div className="stat-icon">🔔</div>
          <div className="stat-info">
            <div className="stat-value">{stats.activeSubscribers}</div>
            <div className="stat-label">Notifiche Attive</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📤</div>
          <div className="stat-info">
            <div className="stat-value">{stats.sentToday}</div>
            <div className="stat-label">Inviate Oggi</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <div className="stat-value">{stats.deliveryRate}%</div>
            <div className="stat-label">Tasso Attivazione</div>
          </div>
        </div>
      </div>

      {/* Tabella Clienti */}
      <div className="customers-table-card">
        <h2>👥 Lista Clienti</h2>
        
        {customers.length > 0 ? (
          <>
            <div className="customers-summary">
              <div className="summary-item">
                <span className="summary-icon">👥</span>
                <span className="summary-text">Totale: <strong>{customers.length}</strong></span>
              </div>
              <div className="summary-item">
                <span className="summary-icon">👨</span>
                <span className="summary-text">Maschi: <strong>{customers.filter(c => c.gender === 'M' || c.gender === 'male').length}</strong></span>
              </div>
              <div className="summary-item">
                <span className="summary-icon">👩</span>
                <span className="summary-text">Femmine: <strong>{customers.filter(c => c.gender === 'F' || c.gender === 'female').length}</strong></span>
              </div>
              <div className="summary-item">
                <span className="summary-icon">🔔</span>
                <span className="summary-text">Con notifiche: <strong>{customers.filter(c => c.onesignal_player_id).length}</strong></span>
              </div>
            </div>

            <div className="customers-table-container">
              <table className="customers-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Contatto</th>
                    <th>Punti</th>
                    <th>Livello</th>
                    <th>Notifiche</th>
                    <th>Registrato</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(customer => {
                    const gender = customer.gender?.toLowerCase()
                    const isNotificationActive = !!customer.onesignal_player_id
                    const customerLevel = levels.find(l => l.name === customer.current_level)
                    
                    return (
                      <tr key={customer.id}>
                        <td>
                          <div className="customer-info-cell">
                            <div className={`gender-icon ${gender === 'm' || gender === 'male' ? 'male' : gender === 'f' || gender === 'female' ? 'female' : 'neutral'}`}>
                              {gender === 'm' || gender === 'male' ? '👨' : 
                               gender === 'f' || gender === 'female' ? '👩' : '👤'}
                            </div>
                            <div className="customer-details">
                              <div className="customer-name">{customer.name}</div>
                              <div className="customer-id">#{customer.id.substring(0, 8)}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="contact-info">
                            {customer.email && (
                              <div className="contact-item">
                                <span className="contact-icon">📧</span>
                                <span className="contact-text">{customer.email}</span>
                              </div>
                            )}
                            {customer.phone && (
                              <div className="contact-item">
                                <span className="contact-icon">📱</span>
                                <span className="contact-text">{customer.phone}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="points-cell">
                            <img 
                              src="/gemma-rossa.png" 
                              alt="Gemme" 
                              className="points-icon"
                            />
                            <span className="points-value">{customer.points || 0}</span>
                          </div>
                        </td>
                        <td>
                          {customerLevel ? (
                            <div 
                              className="level-badge"
                              style={{ backgroundColor: customerLevel.primary_color }}
                            >
                              <span dangerouslySetInnerHTML={{ __html: customerLevel.icon_svg }} />
                              <span>{customerLevel.name}</span>
                            </div>
                          ) : (
                            <span className="no-level">Nessun livello</span>
                          )}
                        </td>
                        <td>
                          <div className={`notification-status ${isNotificationActive ? 'active' : 'inactive'}`}>
                            <span className="status-icon">
                              {isNotificationActive ? '🔔' : '🔕'}
                            </span>
                            <span className="status-text">
                              {isNotificationActive ? 'Attive' : 'Disattive'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="registration-date">
                            {new Date(customer.created_at).toLocaleDateString('it-IT', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="no-customers">
            <div className="no-customers-icon">👥</div>
            <h3>Nessun cliente trovato</h3>
            <p>I clienti appariranno qui una volta aggiunti al sistema</p>
          </div>
        )}
      </div>

      {/* Form Invio Notifica */}
      <div className="notification-form-card">
        <h2>✉️ Invia Nuova Notifica</h2>
        
        <div className="form-row">
          <div className="form-group">
            <label>Titolo della notifica *</label>
            <input
              type="text"
              value={notificationForm.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Es: Offerta speciale del giorno!"
              maxLength={50}
            />
            <div className="char-count">{notificationForm.title.length}/50</div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Messaggio *</label>
            <textarea
              value={notificationForm.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              placeholder="Es: Scopri la nostra nuova promozione sui prodotti da forno!"
              maxLength={150}
              rows={3}
            />
            <div className="char-count">{notificationForm.message.length}/150</div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>URL di destinazione (opzionale)</label>
            <input
              type="url"
              value={notificationForm.url}
              onChange={(e) => handleInputChange('url', e.target.value)}
              placeholder="https://saporiecolori.net/promozioni"
            />
          </div>
        </div>

        {/* Target Audience */}
        <div className="form-section">
          <h3>🎯 Destinatari</h3>
          
          <div className="target-options">
            <label className="target-option">
              <input
                type="radio"
                value="all"
                checked={notificationForm.targetType === 'all'}
                onChange={(e) => handleInputChange('targetType', e.target.value)}
              />
              <span>Tutti i clienti ({stats.activeSubscribers})</span>
            </label>

            <label className="target-option">
              <input
                type="radio"
                value="level"
                checked={notificationForm.targetType === 'level'}
                onChange={(e) => handleInputChange('targetType', e.target.value)}
              />
              <span>Per livello cliente</span>
            </label>

            <label className="target-option">
              <input
                type="radio"
                value="individual"
                checked={notificationForm.targetType === 'individual'}
                onChange={(e) => handleInputChange('targetType', e.target.value)}
              />
              <span>Clienti specifici</span>
            </label>
          </div>

          {notificationForm.targetType === 'level' && (
            <div className="form-group">
              <label>Seleziona livello</label>
              <select
                value={notificationForm.targetLevel}
                onChange={(e) => handleInputChange('targetLevel', e.target.value)}
              >
                <option value="">Scegli un livello...</option>
                {levels.map(level => (
                  <option key={level.id} value={level.name}>
                    {level.name} ({customers.filter(c => c.current_level === level.name).length} clienti)
                  </option>
                ))}
              </select>
            </div>
          )}

          {notificationForm.targetType === 'individual' && (
            <div className="form-group">
              <label>Seleziona clienti</label>
              <div className="customers-list">
                {customers.slice(0, 20).map(customer => (
                  <label key={customer.id} className="customer-checkbox">
                    <input
                      type="checkbox"
                      checked={notificationForm.targetCustomers.includes(customer.id)}
                      onChange={(e) => {
                        const customerIds = [...notificationForm.targetCustomers]
                        if (e.target.checked) {
                          customerIds.push(customer.id)
                        } else {
                          const index = customerIds.indexOf(customer.id)
                          if (index > -1) customerIds.splice(index, 1)
                        }
                        handleInputChange('targetCustomers', customerIds)
                      }}
                    />
                    <span>{customer.name}</span>
                    {!customer.onesignal_player_id && <small>(non attivo)</small>}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="audience-preview">
            <strong>📊 Anteprima invio:</strong> {targetAudience.filter(c => c.onesignal_player_id).length} clienti riceveranno la notifica
          </div>
        </div>

        {/* Scheduling - TODO per versioni future */}
        <div className="form-section">
          <h3>⏰ Programmazione</h3>
          <div className="schedule-options">
            <label className="target-option">
              <input
                type="radio"
                value="now"
                checked={notificationForm.scheduleType === 'now'}
                onChange={(e) => handleInputChange('scheduleType', e.target.value)}
              />
              <span>Invia subito</span>
            </label>
            <label className="target-option disabled">
              <input
                type="radio"
                value="scheduled"
                disabled
                checked={notificationForm.scheduleType === 'scheduled'}
                onChange={(e) => handleInputChange('scheduleType', e.target.value)}
              />
              <span>Programma per dopo (Coming Soon)</span>
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button
            className="btn-send-notification"
            onClick={sendNotification}
            disabled={loading || !notificationForm.title.trim() || !notificationForm.message.trim()}
          >
            {loading ? '📤 Invio in corso...' : '🚀 Invia Notifica'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Caricamento in corso...</p>
        </div>
      )}
    </div>
  )
}

export default NotificationsDashboard