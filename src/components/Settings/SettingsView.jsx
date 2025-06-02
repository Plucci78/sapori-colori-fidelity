import { memo } from 'react'

const SettingsView = memo(({ settings, setSettings, saveSettings, EMAIL_CONFIG }) => (
  <div className="settings-container">
    <div className="settings-header">
      <h1>Impostazioni Sistema</h1>
      <p>Configurazione generale</p>
    </div>

    <div className="settings-section">
      <h3>⚙️ Configurazione GEMME</h3>
      <div className="settings-form">
        <div className="setting-item">
          <label>
            <span className="gemma-icon-small"></span>
            GEMME per ogni €1 speso:
          </label>
          <input
            type="number"
            value={settings.points_per_euro}
            onChange={(e) => setSettings({ ...settings, points_per_euro: parseInt(e.target.value) })}
            min="1"
            max="10"
          />
        </div>
        <div className="setting-item">
          <label>
            <span className="gemma-icon-small"></span>
            GEMME necessarie per premio base:
          </label>
          <input
            type="number"
            value={settings.points_for_prize}
            onChange={(e) => setSettings({ ...settings, points_for_prize: parseInt(e.target.value) })}
            min="5"
            max="100"
          />
        </div>
        <button className="btn-primary" onClick={saveSettings}>
          Salva Configurazione
        </button>
      </div>
    </div>

    <div className="settings-section">
      <h3>📧 Configurazione Email</h3>
      <div className="email-config">
        <div className="config-info">
          <p><strong>Service ID:</strong> {EMAIL_CONFIG.serviceId}</p>
          <p><strong>Template ID:</strong> {EMAIL_CONFIG.templateId}</p>
          <p><strong>Status:</strong> <span className="status-active">Attivo ✅</span></p>
        </div>
      </div>
    </div>

    <div className="settings-section">
      <h3>🔄 Azioni Sistema</h3>
      <div className="system-actions">
        <button
          onClick={() => window.location.reload()}
          className="btn-secondary"
        >
          🔄 Ricarica Dati
        </button>
      </div>
    </div>
  </div>
))

SettingsView.displayName = 'SettingsView'

export default SettingsView