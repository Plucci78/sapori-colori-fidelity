import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import './ChatView.css'

const ChatView = ({ showNotification, user }) => {
  const [message, setMessage] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [selectedOperator, setSelectedOperator] = useState('all')
  const [priority, setPriority] = useState('normal')
  const [customers, setCustomers] = useState([])
  const [operators, setOperators] = useState([])
  const [recentMessages, setRecentMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [activeTab, setActiveTab] = useState('recent') // 'recent' o 'inbox'
  const [operatorMessages, setOperatorMessages] = useState([])
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [showMessageModal, setShowMessageModal] = useState(false)

  // Carica dati iniziali
  useEffect(() => {
    loadCustomers()
    loadOperators()
    loadRecentMessages()
    loadUnreadCount()
    loadOperatorMessages()
  }, [])

  // Carica lista clienti
  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email')
        .order('name')

      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('Errore caricamento clienti:', error)
    }
  }

  // Carica lista operatori (users)
  const loadOperators = async () => {
    try {
      // Questa query potrebbe richiedere permessi admin
      const { data, error } = await supabase.auth.admin.listUsers()
      
      if (error) {
        // Fallback: usa solo l'utente corrente
        setOperators([{ id: user.id, email: user.email }])
        return
      }
      
      setOperators(data.users || [])
    } catch (error) {
      console.error('Errore caricamento operatori:', error)
      // Fallback
      setOperators([{ id: user.id, email: user.email }])
    }
  }

  // Carica messaggi recenti
  const loadRecentMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_messages_with_users')
        .select('*')
        .limit(20)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRecentMessages(data || [])
    } catch (error) {
      console.error('Errore caricamento messaggi recenti:', error)
    }
  }

  // Carica conteggio messaggi non letti
  const loadUnreadCount = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_unread_messages_count')

      if (error) throw error
      setUnreadCount(data || 0)
    } catch (error) {
      console.error('Errore caricamento messaggi non letti:', error)
    }
  }

  // Carica messaggi per operatori (senza cliente)
  const loadOperatorMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_messages_with_users')
        .select('*')
        .is('customer_id', null) // Solo messaggi senza cliente
        .or(`to_user_id.is.null,to_user_id.eq.${user.id}`) // Per me o per tutti
        // .neq('from_user_id', user.id) // Commentato per test - mostra anche i miei messaggi
        .order('created_at', { ascending: false })

      if (error) throw error
      setOperatorMessages(data || [])
    } catch (error) {
      console.error('Errore caricamento messaggi operatori:', error)
    }
  }

  // Marca messaggio come letto/non letto
  const toggleMessageStatus = async (messageId, newStatus) => {
    try {
      console.log('Aggiornamento messaggio:', messageId, 'nuovo status:', newStatus)
      
      const updateData = {
        status: newStatus,
        read_at: newStatus === 'read' ? new Date().toISOString() : null
      }

      const { error } = await supabase
        .from('staff_messages')
        .update(updateData)
        .eq('id', messageId)

      if (error) {
        console.error('Errore database:', error)
        throw error
      }

      // Aggiorna stato locale
      setOperatorMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, status: newStatus, read_at: updateData.read_at }
            : msg
        )
      )

      // Ricarica anche i messaggi per essere sicuri
      loadOperatorMessages()

      showNotification(`Messaggio marcato come ${newStatus === 'read' ? 'letto' : 'non letto'}`, 'success')
      setShowMessageModal(false)
    } catch (error) {
      console.error('Errore aggiornamento stato messaggio:', error)
      showNotification('Errore nell\'aggiornamento del messaggio', 'error')
    }
  }

  // Invia messaggio
  const sendMessage = async () => {
    if (!message.trim()) {
      showNotification('Inserisci un messaggio', 'error')
      return
    }

    if (!selectedCustomer) {
      showNotification('Seleziona destinatario', 'error')
      return
    }

    setLoading(true)
    try {
      // Determina se è un messaggio per operatori o clienti
      const isOperatorMessage = selectedCustomer === 'operators' || selectedCustomer.startsWith('operator-')
      const targetOperatorId = selectedCustomer.startsWith('operator-') 
        ? selectedCustomer.replace('operator-', '') 
        : null

      const messageData = {
        message: message.trim(),
        customer_id: isOperatorMessage ? null : selectedCustomer,
        from_user_id: user.id,
        to_user_id: isOperatorMessage 
          ? targetOperatorId 
          : (selectedOperator === 'all' ? null : selectedOperator),
        priority,
        status: 'pending'
      }

      const { error } = await supabase
        .from('staff_messages')
        .insert([messageData])

      if (error) throw error

      showNotification('Messaggio inviato con successo!', 'success')
      
      // Reset form
      setMessage('')
      setSelectedCustomer('')
      setSelectedOperator('all')
      setPriority('normal')
      
      // Ricarica messaggi
      loadRecentMessages()
      loadOperatorMessages()
      
    } catch (error) {
      console.error('Errore invio messaggio:', error)
      showNotification('Errore nell\'invio del messaggio', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Formatta data
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Ottieni icona priorità
  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'urgent': return '🚨'
      case 'high': return '⚠️'
      case 'normal': return '💬'
      case 'low': return '💭'
      default: return '💬'
    }
  }

  // Ottieni colore priorità
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return '#dc2626'
      case 'high': return '#f59e0b'
      case 'normal': return '#3b82f6'
      case 'low': return '#6b7280'
      default: return '#3b82f6'
    }
  }

  return (
    <div className="chat-view">
      <div className="chat-header">
        <h2>💬 Chat Staff - Comunicazioni Interne</h2>
        {unreadCount > 0 && (
          <div className="unread-badge">
            {unreadCount} messaggi non letti
          </div>
        )}
      </div>

      <div className="chat-content">
        {/* Form Nuovo Messaggio */}
        <div className="chat-compose">
          <h3>✍️ Nuovo Messaggio</h3>
          
          <div className="compose-form">
            {/* Selezione Cliente / Operatore */}
            <div className="form-group">
              <label htmlFor="customer-select">👤 Cliente / Operatore:</label>
              <select
                id="customer-select"
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="form-select"
              >
                <option value="">Seleziona destinatario...</option>
                <optgroup label="👥 OPERATORI">
                  <option value="operators">Tutti gli Operatori</option>
                  {operators.map(operator => (
                    <option key={`op-${operator.id}`} value={`operator-${operator.id}`}>
                      👤 {operator.email}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="👤 CLIENTI">
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ({customer.email})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Selezione Operatore - Solo se cliente selezionato */}
            {selectedCustomer && selectedCustomer !== 'operators' && !selectedCustomer.startsWith('operator-') && (
              <div className="form-group">
                <label htmlFor="operator-select">👥 Destinatario:</label>
                <select
                  id="operator-select"
                  value={selectedOperator}
                  onChange={(e) => setSelectedOperator(e.target.value)}
                  className="form-select"
                >
                  <option value="all">🌐 Tutti gli operatori</option>
                  {operators.map(operator => (
                    <option key={operator.id} value={operator.id}>
                      👤 {operator.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Priorità */}
            <div className="form-group">
              <label htmlFor="priority-select">🔥 Priorità:</label>
              <select
                id="priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="form-select"
              >
                <option value="low">💭 Bassa</option>
                <option value="normal">💬 Normale</option>
                <option value="high">⚠️ Alta</option>
                <option value="urgent">🚨 Urgente</option>
              </select>
            </div>

            {/* Area Messaggio */}
            <div className="form-group">
              <label htmlFor="message-text">💭 Messaggio:</label>
              <textarea
                id="message-text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Scrivi qui la tua comunicazione per il team..."
                className="message-textarea"
                rows={6}
                maxLength={1000}
              />
              <div className="char-count">
                {message.length}/1000 caratteri
              </div>
            </div>

            {/* Bottone Invio */}
            <button
              onClick={sendMessage}
              disabled={loading || !message.trim() || !selectedCustomer}
              className="send-button"
            >
              {loading ? '⏳ Invio...' : '📤 Invia Messaggio'}
            </button>
          </div>
        </div>

        {/* Lista Messaggi con Tabs */}
        <div className="chat-history">
          <div className="chat-history-header">
            <div className="chat-tabs">
              <button
                className={`tab-button ${activeTab === 'recent' ? 'active' : ''}`}
                onClick={() => setActiveTab('recent')}
              >
                📋 Messaggi Recenti
              </button>
              <button
                className={`tab-button ${activeTab === 'inbox' ? 'active' : ''}`}
                onClick={() => setActiveTab('inbox')}
              >
                📬 Inbox Operatori
              </button>
            </div>
          </div>
          
          {activeTab === 'recent' ? (
            // Tab Messaggi Recenti (Clienti)
            recentMessages.length === 0 ? (
              <div className="no-messages">
                <p>Nessun messaggio ancora. Inizia a comunicare con il team!</p>
              </div>
            ) : (
              <div className="messages-list">
                {recentMessages.map(msg => (
                  <div 
                    key={msg.id} 
                    className={`message-item ${msg.status}`}
                  >
                    <div className="message-header">
                      <div className="message-priority">
                        <span 
                          style={{ color: getPriorityColor(msg.priority) }}
                          title={`Priorità: ${msg.priority}`}
                        >
                          {getPriorityIcon(msg.priority)}
                        </span>
                      </div>
                      <div className="message-info">
                        <strong>{msg.customer_name}</strong>
                        <span className="message-meta">
                          da {msg.from_user_email} 
                          {msg.to_user_email ? ` → ${msg.to_user_email}` : ' → Tutti'}
                        </span>
                      </div>
                      <div className="message-date">
                        {formatDate(msg.created_at)}
                      </div>
                    </div>
                    <div className="message-content">
                      {msg.message}
                    </div>
                    <div className="message-status">
                      {msg.status === 'pending' && <span className="status-pending">📬 Da leggere</span>}
                      {msg.status === 'read' && <span className="status-read">✅ Letto</span>}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            // Tab Inbox Operatori
            operatorMessages.length === 0 ? (
              <div className="no-messages">
                <p>Nessun messaggio tra operatori. Il primo sarà qui!</p>
              </div>
            ) : (
              <div className="operator-messages-table">
                <table className="messages-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Da</th>
                      <th>Messaggio</th>
                      <th>Data</th>
                      <th>Priorità</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operatorMessages.map(msg => (
                      <tr 
                        key={msg.id}
                        className={`message-row ${msg.status}`}
                        onClick={() => {
                          setSelectedMessage(msg)
                          setShowMessageModal(true)
                        }}
                      >
                        <td className="status-indicator">
                          <div className={`status-dot ${msg.status}`}></div>
                        </td>
                        <td className="from-user">
                          {msg.from_user_email?.split('@')[0] || 'Sconosciuto'}
                        </td>
                        <td className="message-preview">
                          {msg.message.length > 50 ? `${msg.message.substring(0, 50)}...` : msg.message}
                        </td>
                        <td className="message-date">
                          {formatDate(msg.created_at)}
                        </td>
                        <td className="message-priority">
                          <span 
                            style={{ color: getPriorityColor(msg.priority) }}
                            title={`Priorità: ${msg.priority}`}
                          >
                            {getPriorityIcon(msg.priority)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

        {/* Modale Dettaglio Messaggio Operatore */}
        {showMessageModal && selectedMessage && (
          <div className="message-modal-overlay" onClick={() => setShowMessageModal(false)}>
            <div className="message-modal" onClick={(e) => e.stopPropagation()}>
              <div className="message-modal-header">
                <h3>💬 Messaggio da {selectedMessage.from_user_email}</h3>
                <button onClick={() => setShowMessageModal(false)}>✕</button>
              </div>
              <div className="message-modal-content">
                <div className="message-modal-meta">
                  <div><strong>Da:</strong> {selectedMessage.from_user_email}</div>
                  <div><strong>Per:</strong> {selectedMessage.to_user_email || 'Tutti gli operatori'}</div>
                  <div><strong>Data:</strong> {formatDate(selectedMessage.created_at)}</div>
                  <div><strong>Priorità:</strong> {selectedMessage.priority}</div>
                </div>
                <div className="message-modal-text">
                  {selectedMessage.message}
                </div>
              </div>
              <div className="message-modal-actions">
                <button 
                  className="btn-read"
                  onClick={() => toggleMessageStatus(selectedMessage.id, 'read')}
                  disabled={selectedMessage.status === 'read'}
                >
                  ✅ Marca Letto
                </button>
                <button 
                  className="btn-unread"
                  onClick={() => toggleMessageStatus(selectedMessage.id, 'pending')}
                  disabled={selectedMessage.status === 'pending'}
                >
                  📬 Marca Non Letto
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatView