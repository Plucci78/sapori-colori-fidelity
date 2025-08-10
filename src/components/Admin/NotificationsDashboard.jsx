import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import oneSignalService from '../../services/onesignalService'
import './NotificationsDashboard.css'

const NotificationsDashboard = ({ customerLevels }) => {
  console.log('🔍 NotificationsDashboard props:', { customerLevels })
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
  const [notificationHistory, setNotificationHistory] = useState([])

  useEffect(() => {
    loadData()
    loadNotificationHistory()
  }, [])

  // Usa i customerLevels passati come prop dal componente App principale
  useEffect(() => {
    if (customerLevels && customerLevels.length > 0) {
      console.log('📊 Usando customerLevels da App:', customerLevels)
      setLevels(customerLevels)
    }
  }, [customerLevels])

  const loadNotificationHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_history')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(20)

      if (data && !error) {
        setNotificationHistory(data)
      }
    } catch (error) {
      console.error('Errore caricamento storico:', error)
    }
  }


  const loadData = async () => {
    setLoading(true)
    try {
      // Debug: Prima carica tutti i clienti
      const { data: allCustomers } = await supabase
        .from('customers')
        .select('id, name, email, onesignal_player_id, is_active')
      
      console.log('🔍 TUTTI i clienti nel database:', allCustomers)
      console.log('🔍 Clienti con player_id:', allCustomers?.filter(c => c.onesignal_player_id))
      
      // Carica clienti attivi con OneSignal ID (User ID o Subscription ID)
      const { data: customersData } = await supabase
        .from('customers')
        .select('*')
        .eq('is_active', true)
        .or('onesignal_player_id.not.is.null,onesignal_subscription_id.not.is.null')
        .order('created_at', { ascending: false })
      
      console.log('🔍 Clienti filtrati (attivi + player_id):', customersData)
      
      // Debug current_level dei clienti
      console.log('🔍 DEBUG Livelli clienti:', customersData?.map(c => ({ 
        name: c.name, 
        current_level: c.current_level,
        points: c.points
      })))
      
      setCustomers(customersData || [])

      // I livelli vengono caricati tramite useEffect da customerLevels prop
      // Non carichiamo più da customer_levels

      // Calcola statistiche
      const totalSubscribers = customersData?.length || 0
      const activeSubscribers = customersData?.filter(c => c.onesignal_subscription_id)?.length || 0
      
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

  const fixPlayerId = async () => {
    const correctPlayerId = '93b3efb8-3845-46dc-bbe9-23aaa0e7947e' // iPhone Subscription ID
    const customerId = '3a6c6c13-ce52-436d-8d94-c045e8e2c5d6' // PASQUALE LUCCI ID
    
    setLoading(true)
    try {
      showNotification('🔧 Aggiornando Player ID iPhone...', 'info')
      
      const response = await fetch('/api/update-player-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerId,
          newPlayerId: correctPlayerId
        })
      })

      const result = await response.json()

      if (result.success) {
        showNotification(`✅ ${result.message}`)
        await loadData() // Ricarica i dati
      } else {
        showNotification(`❌ Errore: ${result.error}`, 'error')
      }
    } catch (error) {
      console.error('Errore fix Player ID:', error)
      showNotification('❌ Errore aggiornamento Player ID', 'error')
    } finally {
      setLoading(false)
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

  const checkCustomerLink = async () => {
    const subscriptionId = '93b3efb8-3845-46dc-bbe9-23aaa0e7947e' // iPhone Subscription ID
    const externalId = 'dd25f77d-dfab-4e28-8c89-d3a6a9a55b28' // External ID da OneSignal
    
    setLoading(true)
    try {
      showNotification('🔗 Verificando collegamento customer...', 'info')
      
      const response = await fetch('/api/check-customer-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscriptionId,
          externalId
        })
      })

      const result = await response.json()

      if (result.analysis.isLinked) {
        showNotification(
          `✅ Cliente collegato: ${result.database.customerBySubscription.name}`
        )
      } else {
        const issues = result.analysis.issues.join(', ')
        showNotification(`⚠️ Problemi collegamento: ${issues}`, 'error')
      }

      // Mostra dettagli in console per debug
      console.log('🔗 Analisi collegamento customer:', result)
      
    } catch (error) {
      console.error('Errore verifica collegamento:', error)
      showNotification('❌ Errore durante la verifica collegamento', 'error')
    } finally {
      setLoading(false)
    }
  }

  const syncOneSignalIds = async () => {
    setLoading(true)
    try {
      showNotification('🔄 Sincronizzando OneSignal IDs...', 'info')
      
      const response = await fetch('/api/sync-onesignal-ids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (result.success) {
        showNotification(
          `✅ ${result.message}`
        )
        
        // Ricarica i dati dopo la sincronizzazione
        await loadData()
        
        // Mostra dettagli in console
        console.log('🔄 Risultati sincronizzazione:', result.results)
      } else {
        showNotification(`❌ Errore sincronizzazione: ${result.error}`, 'error')
      }
    } catch (error) {
      console.error('Errore sincronizzazione OneSignal IDs:', error)
      showNotification('❌ Errore durante la sincronizzazione OneSignal IDs', 'error')
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
        .filter(c => c.onesignal_subscription_id)
        .map(c => c.onesignal_subscription_id)

      if (playerIds.length === 0) {
        showNotification('❌ Nessun cliente ha le notifiche attive', 'error')
        return
      }

      // Se è programmata, TODO: implementare scheduling
      if (notificationForm.scheduleType === 'scheduled') {
        showNotification('⏰ Programmazione notifiche non ancora implementata', 'error')
        return
      }

      // Invia notifica tramite OneSignal con tracking completo
      const result = await oneSignalService.sendNotification({
        title: notificationForm.title,
        message: notificationForm.message,
        playerIds: playerIds,
        url: notificationForm.url || undefined,
        targetType: notificationForm.targetType,
        targetValue: notificationForm.targetLevel || 'all',
        sentBy: 'Dashboard Operator' // TODO: sostituire con utente loggato
      })

      if (result.success) {
        showNotification(`✅ Notifica inviata a ${playerIds.length} clienti`)
        
        // Ricarica storico per mostrare la nuova notifica
        loadNotificationHistory()
        
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
                <span className="summary-text">Con notifiche: <strong>{customers.filter(c => c.onesignal_subscription_id).length}</strong></span>
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
                    <th>OneSignal IDs</th>
                    <th>Registrato</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(customer => {
                    const gender = customer.gender?.toLowerCase()
                    const isNotificationActive = !!customer.onesignal_subscription_id
                    const customerLevel = levels.find(l => l.name === customer.current_level)
                    
                    // Debug del match livello
                    if (!customerLevel && customer.current_level) {
                      console.log('🔍 DEBUG Level mismatch:', { 
                        customerLevel: customer.current_level,
                        availableLevels: levels.map(l => l.name),
                        customerName: customer.name
                      })
                    }
                    
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
                          <div className="onesignal-ids">
                            {customer.onesignal_player_id && (
                              <div className="onesignal-id">
                                <span className="id-label">👤 User ID:</span>
                                <span className="id-value" title={customer.onesignal_player_id}>
                                  {customer.onesignal_player_id}
                                </span>
                              </div>
                            )}
                            {customer.onesignal_subscription_id && (
                              <div className="onesignal-id">
                                <span className="id-label">📱 Subscription ID:</span>
                                <span className="id-value" title={customer.onesignal_subscription_id}>
                                  {customer.onesignal_subscription_id}
                                </span>
                              </div>
                            )}
                            {!customer.onesignal_player_id && !customer.onesignal_subscription_id && (
                              <span className="no-ids">Nessun ID OneSignal</span>
                            )}
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
                    {!customer.onesignal_subscription_id && <small>(non attivo)</small>}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="audience-preview">
            <strong>📊 Anteprima invio:</strong> {targetAudience.filter(c => c.onesignal_subscription_id).length} clienti riceveranno la notifica
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

      {/* Sezione Storico Notifiche */}
      <div className="notification-history-card">
        <h2>📊 Storico Notifiche Inviate</h2>
        
        {notificationHistory.length > 0 ? (
          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Data/Ora</th>
                  <th>Titolo</th>
                  <th>Destinatari</th>
                  <th>Target</th>
                  <th>Stato</th>
                  <th>Analytics</th>
                </tr>
              </thead>
              <tbody>
                {notificationHistory.map(notification => (
                  <tr key={notification.id}>
                    <td>
                      <div className="datetime-cell">
                        <div className="date">{new Date(notification.sent_at).toLocaleDateString('it-IT')}</div>
                        <div className="time">{new Date(notification.sent_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </td>
                    <td>
                      <div className="notification-details">
                        <div className="notification-title">{notification.title}</div>
                        <div className="notification-preview">{notification.message.substring(0, 50)}...</div>
                      </div>
                    </td>
                    <td>
                      <span className="recipients-count">{notification.recipients_count}</span>
                    </td>
                    <td>
                      <div className="target-info">
                        <span className="target-type">{notification.target_type === 'all' ? '🌐 Tutti' : notification.target_type === 'level' ? `🏆 ${notification.target_value}` : '🎯 Selezionati'}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${notification.status}`}>
                        {notification.status === 'sent' ? '✅ Inviata' : notification.status === 'failed' ? '❌ Errore' : '⏳ In corso'}
                      </span>
                    </td>
                    <td>
                      <div className="analytics-mini">
                        <div className="stat-mini">📤 {notification.delivered_count || 0}</div>
                        <div className="stat-mini">👁️ {notification.opened_count || 0}</div>
                        <div className="stat-mini">👆 {notification.clicked_count || 0}</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-history">
            <div className="no-history-icon">📊</div>
            <h3>Nessuna notifica inviata</h3>
            <p>Quando invierai delle notifiche, appariranno qui con le statistiche complete</p>
          </div>
        )}
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