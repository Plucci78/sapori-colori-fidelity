import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import './StaffMessageModal.css'

const StaffMessageModal = ({ customer, user, onClose, showNotification }) => {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (customer?.id) {
      loadCustomerMessages()
    }
  }, [customer?.id])

  // Carica messaggi per questo cliente
  const loadCustomerMessages = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('staff_messages_with_users')
        .select('*')
        .eq('customer_id', customer.id)
        .eq('status', 'pending')
        .or(`to_user_id.is.null,to_user_id.eq.${user.id}`)
        // .neq('from_user_id', user.id) // Commentato per test - mostra anche i miei messaggi
        .order('created_at', { ascending: false })

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error('Errore caricamento messaggi:', error)
      showNotification?.('Errore nel caricamento dei messaggi', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Marca tutti i messaggi come letti
  const markAllAsRead = async () => {
    try {
      console.log('🔄 Marcando messaggi come letti per cliente:', customer.id)
      console.log('📧 Messaggi attuali da marcare:', messages.map(m => m.id))
      
      // Approccio diretto: aggiorna ogni messaggio individualmente
      for (const message of messages) {
        const { error } = await supabase
          .from('staff_messages')
          .update({ 
            status: 'read',
            read_at: new Date().toISOString()
          })
          .eq('id', message.id)

        if (error) {
          console.error('❌ Errore aggiornamento messaggio:', message.id, error)
        } else {
          console.log('✅ Messaggio aggiornato:', message.id)
        }
      }
      
      console.log('✅ Tutti i messaggi aggiornati, chiudendo modale...')
      
      showNotification?.('Messaggi marcati come letti', 'success')
      
      // Chiudi immediatamente il modale
      setTimeout(() => onClose?.(), 300)
      
    } catch (error) {
      console.error('Errore marcatura messaggi:', error)
      showNotification?.('Errore nel marcare i messaggi come letti', 'error')
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

  if (!customer) return null

  return (
    <div className="staff-message-modal-overlay" onClick={onClose}>
      <div className="staff-message-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            💬 Messaggi Staff per {customer.name}
          </h3>
          <button 
            className="close-button"
            onClick={onClose}
            title="Chiudi"
          >
            ✕
          </button>
        </div>

        <div className="modal-content">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner">⏳</div>
              <p>Caricamento messaggi...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="no-messages-state">
              <div className="no-messages-icon">📭</div>
              <h4>Nessun messaggio</h4>
              <p>Non ci sono comunicazioni staff per questo cliente.</p>
            </div>
          ) : (
            <>
              <div className="messages-header">
                <div className="messages-count">
                  {messages.length} {messages.length === 1 ? 'messaggio' : 'messaggi'} non {messages.length === 1 ? 'letto' : 'letti'}
                </div>
                <button 
                  className="mark-read-button"
                  onClick={markAllAsRead}
                  title="Marca tutti come letti"
                >
                  ✅ Marca tutti come letti
                </button>
              </div>

              <div className="messages-list">
                {messages.map(message => (
                  <div 
                    key={message.id} 
                    className={`message-card ${message.priority}`}
                  >
                    <div className="message-header">
                      <div className="message-priority">
                        <span 
                          style={{ color: getPriorityColor(message.priority) }}
                          title={`Priorità: ${message.priority}`}
                        >
                          {getPriorityIcon(message.priority)}
                        </span>
                      </div>
                      <div className="message-info">
                        <div className="message-from">
                          Da: <strong>{message.from_user_email}</strong>
                        </div>
                        <div className="message-to">
                          {message.to_user_email ? `Per: ${message.to_user_email}` : 'Per: Tutti gli operatori'}
                        </div>
                      </div>
                      <div className="message-date">
                        {formatDate(message.created_at)}
                      </div>
                    </div>
                    <div className="message-content">
                      {message.message}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button 
            className="close-footer-button"
            onClick={onClose}
          >
            🔄 Torna al Cliente
          </button>
        </div>
      </div>
    </div>
  )
}

export default StaffMessageModal