import React, { useState, useEffect, useRef } from 'react'
import './NotificationSystem.css'
import { emailAutomationService } from '../../services/emailAutomation'

const NotificationSystem = ({ 
  notifications = [], 
  onDismiss, 
  soundEnabled = true, 
  volume = 0.5 
}) => {
  const [visibleNotifications, setVisibleNotifications] = useState([])
  const audioRefs = useRef({})

  // Suoni per diverse tipologie di notifiche
  const sounds = {
    vip: '/sounds/vip-notification.mp3',
    level: '/sounds/notification_level.wav', 
    milestone: '/sounds/milestone.mp3',
    birthday: '/sounds/birthday.mp3',
    default: '/sounds/default.mp3'
  }

  // Inizializza audio refs
  useEffect(() => {
    Object.keys(sounds).forEach(key => {
      audioRefs.current[key] = new Audio(sounds[key])
      audioRefs.current[key].volume = volume
    })
  }, [volume])

  // Gestisce nuove notifiche
  useEffect(() => {
    notifications.forEach(notification => {
      if (!visibleNotifications.find(n => n.id === notification.id)) {
        // Mostra notifica
        setVisibleNotifications(prev => [...prev, notification])
        
        // Riproduci suono
        if (soundEnabled) {
          playNotificationSound(notification.type)
        }
        
        // Invia email di compleanno se necessario
        console.log('🔍 DEBUG NotificationSystem:', {
          type: notification.type,
          skipEmail: notification.skipEmail,
          hasEmail: !!notification.customer?.email,
          customerName: notification.customer?.name
        })
        
        if (notification.type === 'birthday' && !notification.skipEmail && notification.customer?.email) {
          console.log('📧 NotificationSystem: Invio email compleanno per', notification.customer.name)
          sendBirthdayEmail(notification.customer)
        } else if (notification.type === 'birthday' && notification.skipEmail) {
          console.log('📧 NotificationSystem: Skip email per', notification.customer?.name, '(skipEmail=true)')
        }
        
        // Auto-dismiss dopo 15 secondi
        setTimeout(() => {
          dismissNotification(notification.id)
        }, 15000)
      }
    })
  }, [notifications, visibleNotifications, soundEnabled])

  // Invia email di compleanno
  const sendBirthdayEmail = async (customer) => {
    try {
      console.log('📧 Invio email compleanno per:', customer.name)
      await emailAutomationService.init()
      const success = await emailAutomationService.sendBirthdayEmail(customer)
      if (success) {
        console.log('✅ Email compleanno inviata con successo')
      } else {
        console.error('❌ Fallimento invio email compleanno')
      }
    } catch (error) {
      console.error('💥 Errore invio email compleanno:', error)
    }
  }

  const playNotificationSound = (type) => {
    try {
      const sound = audioRefs.current[type] || audioRefs.current.default
      sound.currentTime = 0
      sound.play().catch(e => console.log('Audio play failed:', e))
    } catch (error) {
      console.log('Error playing notification sound:', error)
    }
  }

  const dismissNotification = (id) => {
    setVisibleNotifications(prev => prev.filter(n => n.id !== id))
    if (onDismiss) onDismiss(id)
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'vip': return '🌟'
      case 'level': return '🎉'
      case 'milestone': return '💎'
      case 'birthday': return '🎂'
      default: return '🔔'
    }
  }


  return (
    <>
      {visibleNotifications.map(notification => (
        <div
          key={notification.id}
          className="notification-modal-overlay"
          onClick={() => dismissNotification(notification.id)}
        >
          <div 
            className={`notification-modal notification-${notification.type}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="notification-modal-content">
              <div className="notification-icon">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="notification-text">
                <div className="notification-title">{notification.title}</div>
                <div className="notification-message">{notification.message}</div>
                {notification.level && (
                  <div className={`notification-level-badge ${notification.level.name.toLowerCase()}`}>
                    🏆 <strong>{notification.level.name}</strong>
                  </div>
                )}
                {notification.customer && (
                  <div className="notification-customer">
                    👤 {notification.customer.name} • {notification.customer.points} GEMME
                    {notification.type === 'birthday' && notification.skipEmail && (
                      <div className="skip-email-notice">
                        📧 Email già inviata oggi
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button 
                className="notification-close"
                onClick={() => dismissNotification(notification.id)}
              >
                ×
              </button>
            </div>
            <div className="notification-progress"></div>
            <div className="notification-actions">
              <button 
                className="notification-btn-primary"
                onClick={() => dismissNotification(notification.id)}
              >
                OK, Ho Visto! 👍
              </button>
            </div>
          </div>
        </div>
      ))}
      
      {/* Audio elements */}
      <audio ref={el => audioRefs.current.vip = el} preload="auto">
        <source src="/sounds/scannerqr.mp3" type="audio/mpeg" />
      </audio>
      <audio ref={el => audioRefs.current.level = el} preload="auto">
        <source src="/sounds/notification_level.wav" type="audio/wav" />
      </audio>
      <audio ref={el => audioRefs.current.milestone = el} preload="auto">
        <source src="/sounds/coin.wav" type="audio/wav" />
      </audio>
      <audio ref={el => audioRefs.current.birthday = el} preload="auto">
        <source src="/sounds/happyb.mp3" type="audio/mpeg" />
      </audio>
      <audio ref={el => audioRefs.current.default = el} preload="auto">
        <source src="/sounds/remove.wav" type="audio/wav" />
      </audio>
    </>
  )
}

export default NotificationSystem