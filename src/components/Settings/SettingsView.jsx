import { memo } from 'react'

const SettingsView = memo(({ settings, setSettings, saveSettings, EMAIL_CONFIG }) => (
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
))

SettingsView.displayName = 'SettingsView'

export default SettingsView