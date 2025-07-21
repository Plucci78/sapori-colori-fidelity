import React from 'react'
import './NotificationSettings.css'

const NotificationSettings = ({ settings, onUpdateSettings, stats }) => {
  const handleToggle = (setting) => {
    onUpdateSettings({
      [setting]: !settings[setting]
    })
  }

  const handleVolumeChange = (e) => {
    onUpdateSettings({
      volume: parseFloat(e.target.value)
    })
  }

  const testNotification = (type) => {
    // Questa funzione sarà chiamata dal componente parent
    console.log(`Test notifica ${type}`)
  }

  return (
    <div className="notification-settings">
      <div className="settings-header">
        <h3>🔔 Impostazioni Notifiche</h3>
        <p>Personalizza le notifiche automatiche del sistema</p>
      </div>

      {/* Statistiche */}
      <div className="settings-stats">
        <div className="stat-item">
          <span className="stat-label">Oggi</span>
          <span className="stat-value">{stats.today}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Totali</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">VIP</span>
          <span className="stat-value">{stats.byType.vip}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Livelli</span>
          <span className="stat-value">{stats.byType.level}</span>
        </div>
      </div>

      {/* Controlli Audio */}
      <div className="settings-section">
        <h4>🔊 Audio</h4>
        <div className="setting-item">
          <label className="setting-label">
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={() => handleToggle('soundEnabled')}
            />
            <span>Abilita suoni notifiche</span>
          </label>
        </div>
        
        <div className="setting-item">
          <label className="setting-label">
            <span>Volume: {Math.round(settings.volume * 100)}%</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.volume}
              onChange={handleVolumeChange}
              disabled={!settings.soundEnabled}
            />
          </label>
        </div>
      </div>

      {/* Tipi di Notifiche */}
      <div className="settings-section">
        <h4>📢 Tipi di Notifiche</h4>
        
        <div className="setting-item">
          <label className="setting-label">
            <input
              type="checkbox"
              checked={settings.vipEnabled}
              onChange={() => handleToggle('vipEnabled')}
            />
            <span>🌟 Clienti VIP (100+ GEMME)</span>
          </label>
          <button 
            className="test-btn"
            onClick={() => testNotification('vip')}
            disabled={!settings.vipEnabled}
          >
            Test
          </button>
        </div>

        <div className="setting-item">
          <label className="setting-label">
            <input
              type="checkbox"
              checked={settings.levelEnabled}
              onChange={() => handleToggle('levelEnabled')}
            />
            <span>🎉 Nuovi Livelli</span>
          </label>
          <button 
            className="test-btn"
            onClick={() => testNotification('level')}
            disabled={!settings.levelEnabled}
          >
            Test
          </button>
        </div>

        <div className="setting-item">
          <label className="setting-label">
            <input
              type="checkbox"
              checked={settings.milestoneEnabled}
              onChange={() => handleToggle('milestoneEnabled')}
            />
            <span>💎 Milestone GEMME</span>
          </label>
          <button 
            className="test-btn"
            onClick={() => testNotification('milestone')}
            disabled={!settings.milestoneEnabled}
          >
            Test
          </button>
        </div>

        <div className="setting-item">
          <label className="setting-label">
            <input
              type="checkbox"
              checked={settings.birthdayEnabled}
              onChange={() => handleToggle('birthdayEnabled')}
            />
            <span>🎂 Compleanni</span>
          </label>
          <button 
            className="test-btn"
            onClick={() => testNotification('birthday')}
            disabled={!settings.birthdayEnabled}
          >
            Test
          </button>
        </div>
      </div>

      {/* Azioni */}
      <div className="settings-actions">
        <button 
          className="btn-secondary"
          onClick={() => window.location.reload()}
        >
          🔄 Ricarica Pagina
        </button>
        <button 
          className="btn-primary"
          onClick={() => onUpdateSettings({})}
        >
          💾 Salva Impostazioni
        </button>
      </div>
    </div>
  )
}

export default NotificationSettings