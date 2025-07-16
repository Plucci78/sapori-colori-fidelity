import { useState } from 'react'
import LevelsConfig from './LevelsConfig'
import UserManagement from './UserManagement'
import ActivityLog from './ActivityLog'
import { ProtectedComponent } from '../../auth/ProtectedComponent'

const SettingsView = ({ settings, setSettings, saveSettings, EMAIL_CONFIG, showNotification, assignMissingReferralCodes, customerLevels, loadCustomerLevels }) => {
  const [activeSettingsTab, setActiveSettingsTab] = useState('general')

  const settingsTabs = [
    {
      id: 'general',
      title: '⚙️ Generali',
      description: 'Configurazioni di base del sistema',
      permission: null // Tutti possono vedere
    },
    {
      id: 'levels',
      title: '🏆 Livelli',
      description: 'Gestione livelli e icone clienti',
      permission: 'canManageSettings'
    },
    {
      id: 'email',
      title: '📧 Email',
      description: 'Configurazioni email marketing',
      permission: 'canViewSettings'
    },
    {
      id: 'users',
      title: '👥 Utenti',
      description: 'Gestione utenti sistema',
      permission: 'canViewUsers', // Solo admin
      role: 'admin'
    },
    {
      id: 'logs',
      title: '📋 Activity Log',
      description: 'Log attività sistema',
      permission: 'canViewLogs', // Solo admin
      role: 'admin'
    },
    {
      id: 'reset',
      title: '🧹 Azzera Gemme',
      description: 'Azzera tutte le gemme clienti',
      permission: 'canManageSettings'
    }
  ]

  // --- AZZERA GEMME LOGIC ---
  const [resetDate, setResetDate] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [resetMode, setResetMode] = useState('manuale') // 'manuale' o 'data'

  const handleResetGemme = async () => {
    try {
      // Qui azzera tutte le gemme nel database
      await window.supabase.from('customers').update({ points: 0 })
      setShowConfirm(false)
      if (showNotification) showNotification('✅ Tutte le gemme sono state azzerate!', 'success')
      
      // Log dell'operazione
      if (window.activityService) {
        await window.activityService.logSystem('RESET_ALL_POINTS', {
          severity: 'high',
          details: {
            reset_mode: resetMode,
            reset_date: resetDate || 'immediate',
            timestamp: new Date().toISOString()
          }
        })
      }
    } catch (error) {
      console.error('Errore nell\'azzeramento gemme:', error)
      if (showNotification) showNotification('❌ Errore nell\'azzeramento gemme', 'error')
    }
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
            <div className="settings-section">
              <h4>📡 Server NFC</h4>
              <div className="settings-grid">
                <div className="setting-field">
                  <label>URL Server NFC:</label>
                  <input
                    type="text"
                    value={settings.nfc_server_url || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      nfc_server_url: e.target.value
                    })}
                    className="setting-input"
                    placeholder="es. http://192.168.1.6:3001"
                  />
                  <p className="setting-description">
                    Indirizzo del server che gestisce il lettore NFC (es. Raspberry Pi)
                  </p>
                </div>
              </div>
            </div>
            <div className="settings-section">
              <h4>🎁 Sistema Referral</h4>
              <div className="settings-grid">
                <div className="setting-field">
                  <label>Gestione Codici Referral:</label>
                  <button 
                    onClick={() => assignMissingReferralCodes && assignMissingReferralCodes()}
                    className="btn btn-secondary"
                    style={{ marginTop: '8px' }}
                  >
                    🔗 Genera Codici Mancanti
                  </button>
                  <p className="setting-description">
                    Assegna automaticamente codici referral ai clienti che non ne hanno uno
                  </p>
                </div>
                <div className="setting-field">
                  <label>Moltiplicatore Weekend:</label>
                  <span className="status-indicator">
                    🔥 ATTIVO (Sabato & Domenica 2x bonus)
                  </span>
                  <p className="setting-description">
                    Durante i weekend il bonus referral viene raddoppiato da 20 a 40 gemme
                  </p>
                </div>
                <div className="setting-field">
                  <label>Test Clipboard:</label>
                  <button 
                    onClick={async () => {
                      const testText = 'TEST-COPY-123';
                      if (navigator.clipboard && window.isSecureContext) {
                        try {
                          await navigator.clipboard.writeText(testText);
                          showNotification(`✅ Test riuscito! Clipboard API funziona`, 'success');
                        } catch (err) {
                          showNotification(`❌ Test fallito: ${err.message}`, 'error');
                        }
                      } else {
                        showNotification('⚠️ Clipboard API non disponibile (servono HTTPS o localhost)', 'warning');
                      }
                    }}
                    className="btn btn-outline"
                    style={{ marginTop: '8px' }}
                  >
                    🧪 Testa Copia/Incolla
                  </button>
                  <p className="setting-description">
                    Verifica che la funzione di copia negli appunti funzioni correttamente
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
        return (
          <ProtectedComponent permission="canManageSettings">
            <LevelsConfig showNotification={showNotification} customerLevels={customerLevels} loadCustomerLevels={loadCustomerLevels} />
          </ProtectedComponent>
        )
        
      case 'email':
        return (
          <ProtectedComponent permission="canViewSettings">
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
                      <h5>🏆 Email Livelli Dinamiche</h5>
                      <p>Inviate automaticamente quando un cliente raggiunge un nuovo livello configurato</p>
                      <small className="text-secondary">
                        Basate sui livelli nella sezione "Livelli" - si adattano automaticamente alle tue configurazioni
                      </small>
                    </div>
                    <span className="automation-status active">✅ Attiva</span>
                  </div>
                </div>
              </div>
            </div>
          </ProtectedComponent>
        )

      case 'users':
        return (
          <ProtectedComponent role="admin" showAccessDenied={true}>
            <UserManagement showNotification={showNotification} />
          </ProtectedComponent>
        )

      case 'logs':
        return (
          <ProtectedComponent role="admin" showAccessDenied={true}>
            <ActivityLog showNotification={showNotification} />
          </ProtectedComponent>
        )
        
      case 'reset':
        return (
          <ProtectedComponent permission="canManageSettings">
            <div className="settings-panel">
              <h3>🧹 Azzera tutte le GEMME</h3>
              <div className="warning-box">
                <p className="text-danger">
                  ⚠️ <strong>ATTENZIONE:</strong> Questa operazione è <b>irreversibile</b>! 
                  Tutti i clienti perderanno le gemme accumulate.
                </p>
              </div>
              
              <div className="reset-options">
                <h4>Modalità Reset:</h4>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="resetMode"
                      value="manuale"
                      checked={resetMode === 'manuale'}
                      onChange={() => setResetMode('manuale')}
                    />
                    <span className="radio-label">🔄 Azzera immediatamente</span>
                    <p className="radio-description">Azzera tutte le gemme adesso</p>
                  </label>
                  
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="resetMode"
                      value="data"
                      checked={resetMode === 'data'}
                      onChange={() => setResetMode('data')}
                    />
                    <span className="radio-label">📅 Programmato per data</span>
                    <p className="radio-description">Imposta una data specifica per il reset</p>
                  </label>
                </div>
              </div>

              {resetMode === 'data' && (
                <div className="date-selector">
                  <label>📅 Data Reset:</label>
                  <input
                    type="date"
                    value={resetDate}
                    onChange={e => setResetDate(e.target.value)}
                    className="date-input"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}

              <div className="reset-actions">
                <button
                  className="btn btn-danger reset-btn"
                  onClick={() => setShowConfirm(true)}
                  disabled={resetMode === 'data' && !resetDate}
                >
                  🗑️ {resetMode === 'manuale' ? 'Azzera Ora' : 'Programma Reset'}
                </button>
              </div>

              {/* MODAL CONFERMA */}
              {showConfirm && (
                <div className="modal-overlay">
                  <div className="modal confirm-modal">
                    <div className="modal-header">
                      <h4>⚠️ Conferma Reset GEMME</h4>
                    </div>
                    <div className="modal-body">
                      <p>
                        Sei sicuro di voler {resetMode === 'manuale' ? 'azzerare immediatamente' : `programmare il reset per il ${resetDate}`} <strong>tutte le GEMME</strong> dei clienti?
                      </p>
                      <div className="warning-details">
                        <p>🚨 <strong>Questa azione:</strong></p>
                        <ul>
                          <li>❌ NON può essere annullata</li>
                          <li>🗑️ Azzererà TUTTE le gemme di TUTTI i clienti</li>
                          <li>📋 Verrà registrata nel log sistema</li>
                          <li>📧 Potresti voler avvisare i clienti</li>
                        </ul>
                      </div>
                    </div>
                    <div className="modal-actions">
                      <button 
                        className="btn btn-danger" 
                        onClick={handleResetGemme}
                      >
                        ✅ Confermo il Reset
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => setShowConfirm(false)}
                      >
                        ❌ Annulla
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ProtectedComponent>
        )
        
      default:
        return (
          <div className="settings-fallback">
            <p>Tab non trovato: {activeSettingsTab}</p>
          </div>
        )
    }
  }

  return (
    <div className="settings-view">
      {/* TAB NAVIGATION */}
      <div className="settings-tabs">
        {settingsTabs.map(tab => (
          <ProtectedComponent
            key={tab.id}
            permission={tab.permission}
            role={tab.role}
          >
            <button
              onClick={() => setActiveSettingsTab(tab.id)}
              className={`settings-tab ${activeSettingsTab === tab.id ? 'active' : ''}`}
            >
              <span className="tab-title">{tab.title}</span>
              <span className="tab-description">{tab.description}</span>
            </button>
          </ProtectedComponent>
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