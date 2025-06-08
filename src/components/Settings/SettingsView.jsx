import { useState } from 'react'
import LevelsConfig from './LevelsConfig'

const SettingsView = ({ settings, setSettings, saveSettings, EMAIL_CONFIG, showNotification }) => {
  const [activeSettingsTab, setActiveSettingsTab] = useState('general')

  const settingsTabs = [
    {
      id: 'general',
      title: '⚙️ Generali',
      description: 'Configurazioni di base del sistema'
    },
    {
      id: 'levels',
      title: '🏆 Livelli',
      description: 'Gestione livelli e icone clienti'
    },
    {
      id: 'email',
      title: '📧 Email',
      description: 'Configurazioni email marketing'
    },
    {
      id: 'reset',
      title: '🧹 Azzera Gemme',
      description: 'Azzera tutte le gemme clienti'
    }
  ]

  // --- AZZERA GEMME LOGIC ---
  const [resetDate, setResetDate] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [resetMode, setResetMode] = useState('manuale') // 'manuale' o 'data'

  const handleResetGemme = async () => {
    // Qui azzera tutte le gemme nel database
    await window.supabase.from('customers').update({ points: 0 })
    setShowConfirm(false)
    if (showNotification) showNotification('Tutte le gemme sono state azzerate!', 'success')
  }

  // --- RENDER CONTENUTO TAB ---
  const renderSettingsContent = () => {
    switch (activeSettingsTab) {
      case 'general':
        return (
          <div className="settings-general">
            <h3>⚙️ Configurazioni Generali</h3>
            <div className="settings-section">
              <h4>💎 Sistema GEMME</h4>
              <div className="settings-grid">
                <div className="setting-field">
                  <label>GEMME per Euro:</label>
                  <input
                    type="number"
                    value={settings.points_per_euro}
                    onChange={(e) => setSettings({
                      ...settings,
                      points_per_euro: parseInt(e.target.value) || 1
                    })}
                    className="setting-input"
                    min="1"
                    max="10"
                  />
                  <p className="setting-description">
                    Quante GEMME guadagna il cliente per ogni euro speso
                  </p>
                </div>
                <div className="setting-field">
                  <label>GEMME base per premio:</label>
                  <input
                    type="number"
                    value={settings.points_for_prize}
                    onChange={(e) => setSettings({
                      ...settings,
                      points_for_prize: parseInt(e.target.value) || 10
                    })}
                    className="setting-input"
                    min="5"
                    max="100"
                  />
                  <p className="setting-description">
                    Costo base in GEMME per i premi standard
                  </p>
                </div>
              </div>
            </div>
            <div className="settings-actions">
              <button onClick={saveSettings} className="save-settings-btn">
                💾 Salva Configurazioni
              </button>
            </div>
          </div>
        )
      case 'levels':
        return <LevelsConfig showNotification={showNotification} />
      case 'email':
        return (
          <div className="settings-email">
            <h3>📧 Configurazioni Email</h3>
            <div className="settings-section">
              <h4>📮 EmailJS Configuration</h4>
              <div className="email-config-display">
                <div className="config-item">
                  <label>Service ID:</label>
                  <code>{EMAIL_CONFIG.serviceId}</code>
                </div>
                <div className="config-item">
                  <label>Template ID:</label>
                  <code>{EMAIL_CONFIG.templateId}</code>
                </div>
                <div className="config-item">
                  <label>Public Key:</label>
                  <code>{EMAIL_CONFIG.publicKey}</code>
                </div>
              </div>
              <p className="email-config-note">
                ⚠️ Per modificare la configurazione email, aggiorna i valori nel codice sorgente
              </p>
            </div>
            <div className="settings-section">
              <h4>📬 Email Automatiche</h4>
              <div className="email-automations">
                <div className="automation-item">
                  <div className="automation-info">
                    <h5>🎉 Email Benvenuto</h5>
                    <p>Inviata automaticamente alla registrazione di nuovi clienti con email</p>
                  </div>
                  <span className="automation-status active">✅ Attiva</span>
                </div>
                <div className="automation-item">
                  <div className="automation-info">
                    <h5>🏆 Email Milestone GEMME</h5>
                    <p>Inviate automaticamente al raggiungimento di 50, 100 e 150 GEMME</p>
                  </div>
                  <span className="automation-status active">✅ Attiva</span>
                </div>
              </div>
            </div>
          </div>
        )
      case 'reset':
        return (
          <div className="settings-panel">
            <h3>Azzera tutte le GEMME</h3>
            <p className="text-danger mb-4">
              Questa operazione è <b>irreversibile</b>! Tutti i clienti perderanno le gemme accumulate.
            </p>
            <div className="mb-4">
              <label>
                <input
                  type="radio"
                  name="resetMode"
                  value="manuale"
                  checked={resetMode === 'manuale'}
                  onChange={() => setResetMode('manuale')}
                />
                Azzera subito
              </label>
              <label className="ml-4">
                <input
                  type="radio"
                  name="resetMode"
                  value="data"
                  checked={resetMode === 'data'}
                  onChange={() => setResetMode('data')}
                />
                Azzera in una data specifica
              </label>
            </div>
            {resetMode === 'data' && (
              <div className="mb-4">
                <input
                  type="date"
                  value={resetDate}
                  onChange={e => setResetDate(e.target.value)}
                  className="input"
                />
              </div>
            )}
            <button
              className="btn btn-danger"
              onClick={() => setShowConfirm(true)}
              disabled={resetMode === 'data' && !resetDate}
            >
              Azzera GEMME
            </button>
            {showConfirm && (
              <div className="modal-overlay">
                <div className="modal">
                  <h4>Sei sicuro?</h4>
                  <p>
                    Questa azione azzererà <b>tutte le gemme</b> dei clienti e non potrà essere annullata.<br />
                    Vuoi continuare?
                  </p>
                  <div className="flex gap-4 mt-4">
                    <button className="btn btn-danger" onClick={handleResetGemme}>Conferma e azzera</button>
                    <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>Annulla</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="settings-view">
      {/* TAB NAVIGATION */}
      <div className="settings-tabs">
        {settingsTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSettingsTab(tab.id)}
            className={`settings-tab ${activeSettingsTab === tab.id ? 'active' : ''}`}
          >
            <span className="tab-title">{tab.title}</span>
            <span className="tab-description">{tab.description}</span>
          </button>
        ))}
      </div>
      {/* TAB CONTENT */}
      <div className="settings-content">
        {renderSettingsContent()}
      </div>
    </div>
  )
}

export default SettingsView