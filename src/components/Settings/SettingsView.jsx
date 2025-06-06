import { memo, useState } from 'react'

const SettingsView = memo(({ settings, setSettings, saveSettings, EMAIL_CONFIG }) => {
  const [activeTab, setActiveTab] = useState('generale')
  const [resetDate, setResetDate] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [resetMode, setResetMode] = useState('manuale') // 'manuale' o 'data'

  const handleResetGemme = async () => {
    // Qui azzera tutte le gemme nel database
    // Esempio con Supabase:
    await supabase.from('customers').update({ points: 0 })
    setShowConfirm(false)
    // Mostra notifica di successo
  }

  return (
    <div className="settings-container">
      <div className="settings-tabs">
        <button onClick={() => setActiveTab('generale')}>Generale</button>
        <button onClick={() => setActiveTab('azzera-gemme')}>Azzera Gemme</button>
      </div>

      {activeTab === 'azzera-gemme' && (
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
      )}

      {/* Configurazione generale */}
      {activeTab === 'generale' && (
        <div className="p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-brand mb-2">Impostazioni Sistema</h1>
            <p className="text-secondary">Configurazione generale</p>
          </div>

          {/* Configurazione GEMME */}
          <div className="card mb-6">
            <div className="card-header">
              <h2 className="card-title flex items-center gap-3">
                <span className="gemma-icon-small"></span>
                Configurazione GEMME
              </h2>
            </div>
            <div className="card-body">
              <div className="space-y-4 max-w-md">
                <div className="setting-item">
                  <label className="font-semibold mb-1 block">
                    GEMME per ogni €1 speso:
                  </label>
                  <input
                    type="number"
                    value={settings.points_per_euro}
                    onChange={(e) => setSettings({ ...settings, points_per_euro: parseInt(e.target.value) })}
                    min="1"
                    max="10"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand focus:outline-none transition-colors"
                  />
                </div>
                <div className="setting-item">
                  <label className="font-semibold mb-1 block">
                    GEMME necessarie per premio base:
                  </label>
                  <input
                    type="number"
                    value={settings.points_for_prize}
                    onChange={(e) => setSettings({ ...settings, points_for_prize: parseInt(e.target.value) })}
                    min="5"
                    max="100"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand focus:outline-none transition-colors"
                  />
                </div>
                <button className="btn btn-primary w-full py-3" onClick={saveSettings}>
                  Salva Configurazione
                </button>
              </div>
            </div>
          </div>

          {/* Configurazione Email */}
          <div className="card mb-6">
            <div className="card-header">
              <h2 className="card-title flex items-center gap-3">
                <span role="img" aria-label="email">📧</span>
                Configurazione Email
              </h2>
            </div>
            <div className="card-body">
              <div className="email-config space-y-2">
                <div><strong>Service ID:</strong> {EMAIL_CONFIG.serviceId}</div>
                <div><strong>Template ID:</strong> {EMAIL_CONFIG.templateId}</div>
                <div><strong>Status:</strong> <span className="status-active">Attivo ✅</span></div>
              </div>
            </div>
          </div>

          {/* Azioni Sistema */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title flex items-center gap-3">
                <span role="img" aria-label="reload">🔄</span>
                Azioni Sistema
              </h2>
            </div>
            <div className="card-body">
              <button
                onClick={() => window.location.reload()}
                className="btn btn-secondary w-full py-3"
              >
                🔄 Ricarica Dati
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

SettingsView.displayName = 'SettingsView'

export default SettingsView