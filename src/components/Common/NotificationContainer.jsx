import { memo } from 'react'

const NotificationContainer = memo(({ notifications, setNotifications }) => (
  <div style={{
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  }}>
    {notifications.map(notification => (
      <div
        key={notification.id}
        style={{
          background: notification.type === 'success' ?
            'linear-gradient(135deg, #4CAF50, #45a049)' :
            notification.type === 'error' ?
              'linear-gradient(135deg, #f44336, #da190b)' :
              'linear-gradient(135deg, #2196F3, #1976D2)',
          color: 'white',
          padding: '16px 20px',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          fontSize: '14px',
          fontWeight: '500',
          maxWidth: '350px',
          animation: 'slideIn 0.3s ease-out',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        <span style={{ fontSize: '18px' }}>
          {notification.type === 'success' ? '✅' :
            notification.type === 'error' ? '❌' : '📧'}
        </span>
        {notification.message}
        <button
          onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: 'white',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            marginLeft: 'auto',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>
      </div>
    ))}
  </div>
))

NotificationContainer.displayName = 'NotificationContainer'

export default NotificationContainer