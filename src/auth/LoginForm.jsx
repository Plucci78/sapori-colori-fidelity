// ===================================
// SAPORI & COLORI - LOGIN FORM
// ===================================

import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { useDashboardStats } from '../hooks/useDashboardStats'

export const LoginForm = ({ onSuccess = null, className = "" }) => {
  const { signIn, loading, isAuthenticated } = useAuth()
  const dashboardStats = useDashboardStats()
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  })
  
  // UI state
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(0)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && onSuccess) {
      onSuccess()
    }
  }, [isAuthenticated, onSuccess])

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))

    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }))
    }
  }

  // Validate form
  const validateForm = () => {
    const newErrors = {}

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email richiesta'
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Email non valida'
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password richiesta'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password troppo corta'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    // Check for too many failed attempts
    if (loginAttempts >= 5) {
      setErrors({ general: 'Troppi tentativi falliti. Riprova tra qualche minuto.' })
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const { user, error } = await signIn(formData.email, formData.password)

      if (error) {
        setLoginAttempts(prev => prev + 1)
        
        // Handle specific error types
        if (error.message.includes('Invalid login credentials')) {
          setErrors({ general: 'Email o password non corretti' })
        } else if (error.message.includes('Email not confirmed')) {
          setErrors({ general: 'Conferma la tua email prima di accedere' })
        } else if (error.message.includes('Too many requests')) {
          setErrors({ general: 'Troppi tentativi. Riprova tra qualche minuto.' })
        } else {
          setErrors({ general: error.message })
        }
      } else if (user) {
        // Reset attempts on successful login
        setLoginAttempts(0)
        
        // Call success callback
        if (onSuccess) {
          onSuccess(user)
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      setErrors({ general: 'Errore durante il login. Riprova.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle demo login (for development/testing)
  const handleDemoLogin = async (role) => {
    const demoCredentials = {
      admin: { email: 'admin@saporiecolori.it', password: 'admin123' },
      manager: { email: 'manager@saporiecolori.it', password: 'manager123' },
      operator: { email: 'operatore@saporiecolori.it', password: 'operatore123' }
    }

    const credentials = demoCredentials[role]
    if (credentials) {
      setFormData({
        email: credentials.email,
        password: credentials.password,
        rememberMe: false
      })
    }
  }

  // Handle forgot password
  const handleForgotPassword = () => {
    // You could implement password reset functionality here
    alert('Funzionalità in sviluppo. Contatta l\'amministratore per il reset della password.')
  }

  return (
    <div className={`login-container ${className}`}>
      <div className="login-form-wrapper">
        
        {/* Header */}
        <div className="login-header">
          <img 
            src="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png" 
            alt="Sapori & Colori" 
            className="login-logo"
          />
          <h1 className="login-title">Sapori & Colori</h1>
          <p className="login-subtitle">Sistema Gestionale Fidelity</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          
          {/* General Error */}
          {errors.general && (
            <div className="error-message general-error">
              ❌ {errors.general}
            </div>
          )}

          {/* Email Field */}
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              📧 Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`form-input ${errors.email ? 'error' : ''}`}
              placeholder="mario.rossi@saporiecolori.it"
              disabled={isSubmitting}
              autoComplete="email"
              required
            />
            {errors.email && (
              <div className="error-message field-error">
                {errors.email}
              </div>
            )}
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              🔒 Password
            </label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="••••••••"
                disabled={isSubmitting}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.password && (
              <div className="error-message field-error">
                {errors.password}
              </div>
            )}
          </div>

          {/* Remember Me */}
          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
              <span className="checkbox-text">Ricordami</span>
            </label>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="login-button"
            disabled={isSubmitting || loading}
          >
            {isSubmitting ? (
              <>⏳ Accesso in corso...</>
            ) : (
              <>🚀 Accedi al Sistema</>
            )}
          </button>

          {/* Forgot Password */}
          <div className="forgot-password">
            <button
              type="button"
              className="forgot-password-link"
              onClick={handleForgotPassword}
              disabled={isSubmitting}
            >
              🔑 Password dimenticata?
            </button>
          </div>

        </form>

        {/* Demo Credentials (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="demo-credentials">
            <div className="demo-title">📋 DEMO CREDENTIALS:</div>
            <div className="demo-buttons">
              <button 
                type="button"
                className="demo-button admin"
                onClick={() => handleDemoLogin('admin')}
                disabled={isSubmitting}
              >
                🔴 Admin
              </button>
              <button 
                type="button"
                className="demo-button manager"
                onClick={() => handleDemoLogin('manager')}
                disabled={isSubmitting}
              >
                🟡 Manager
              </button>
              <button 
                type="button"
                className="demo-button operator"
                onClick={() => handleDemoLogin('operator')}
                disabled={isSubmitting}
              >
                🟢 Operatore
              </button>
            </div>
          </div>
        )}

        {/* System Status */}
        <div className="system-status">
          <div className="status-indicator online" title="Sistema Online"></div>
          <span className="status-text">Sistema Online</span>
        </div>

      </div>

      {/* Dashboard Preview per Desktop - BRAND COLORS & PIÙ INFORMAZIONI */}
      <div className="dashboard-preview">
        {dashboardStats.error && (
          <div className="dashboard-error">
            ⚠️ <small>Errore caricamento dati: {dashboardStats.error}</small>
          </div>
        )}
        {/* Sezione 1 - Panoramica Generale */}
        <div className="dashboard-section">
          <div className="section-title">🏪 Panoramica Sapori & Colori</div>
          <div className="info-block">
            <h4>Sistema di Fidelizzazione Clienti</h4>
            <p>Il programma GEMME permette ai clienti di accumulare punti ad ogni acquisto e sbloccare premi esclusivi.</p>
            <div className="quick-stats">
              <div className="stat-row">
                <span className="stat-label">👥 Clienti Registrati:</span>
                <span className="stat-value">
                  {dashboardStats.loading ? '...' : dashboardStats.totalCustomers.toLocaleString()} <small>clienti fedeli</small>
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">💎 GEMME in Circolazione:</span>
                <span className="stat-value">
                  {dashboardStats.loading ? '...' : dashboardStats.totalGemmes.toLocaleString()} <small>punti attivi</small>
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">🎁 Gift Card Attive:</span>
                <span className="stat-value">
                  {dashboardStats.loading ? '...' : dashboardStats.activeGiftCards} <small>carte</small> • <strong>€{dashboardStats.loading ? '...' : dashboardStats.giftCardsValue.toLocaleString()}</strong> <small>valore totale</small>
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">📈 Crescita Mensile:</span>
                <span className="stat-value">
                  {dashboardStats.loading ? '...' : `${dashboardStats.monthlyGrowth > 0 ? '+' : ''}${dashboardStats.monthlyGrowth.toFixed(1)}%`} <small>nuovi iscritti</small>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sezione 2 - Attività di Oggi */}
        <div className="dashboard-section">
          <div className="section-title">📅 Attività di Oggi</div>
          <div className="info-block">
            <h4>Cosa è Successo Oggi</h4>
            <p>Riepilogo delle attività della giornata corrente nel sistema di fidelizzazione.</p>
            <div className="today-activity">
              <div className="activity-item-detailed">
                <div className="activity-number">
                  {dashboardStats.loading ? '...' : `+${dashboardStats.todayNewCustomers}`}
                </div>
                <div className="activity-desc">
                  <strong>Nuovi Iscritti</strong><br />
                  <small>Clienti che si sono registrati oggi al programma fedeltà</small>
                </div>
              </div>
              <div className="activity-item-detailed">
                <div className="activity-number">
                  {dashboardStats.loading ? '...' : dashboardStats.todayGemmes.toLocaleString()}
                </div>
                <div className="activity-desc">
                  <strong>GEMME Distribuite</strong><br />
                  <small>Punti assegnati per gli acquisti di oggi</small>
                </div>
              </div>
              <div className="activity-item-detailed">
                <div className="activity-number">
                  {dashboardStats.loading ? '...' : dashboardStats.todayEmails}
                </div>
                <div className="activity-desc">
                  <strong>Email Automatiche</strong><br />
                  <small>Messaggi di benvenuto e compleanno inviati</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sezione 3 - Stato Sistema */}
        <div className="dashboard-section">
          <div className="section-title">⚙️ Stato del Sistema</div>
          <div className="info-block">
            <h4>Monitoraggio Servizi</h4>
            <p>Verifica dello stato operativo di tutti i componenti del sistema di fidelizzazione.</p>
            <div className="system-status-detailed">
              <div className="status-item-detailed">
                <div className="status-indicator-large online"></div>
                <div className="status-desc">
                  <strong>Database Clienti</strong><br />
                  <small>Connesso e operativo - Ultima sync: 30 sec fa</small>
                </div>
              </div>
              <div className="status-item-detailed">
                <div className="status-indicator-large online"></div>
                <div className="status-desc">
                  <strong>Servizio Email</strong><br />
                  <small>Funzionante - Quota giornaliera: 2.830/5.000</small>
                </div>
              </div>
              <div className="status-item-detailed">
                <div className="status-indicator-large warning"></div>
                <div className="status-desc">
                  <strong>Backup Automatico</strong><br />
                  <small>Ultimo backup: 2 ore fa - Prossimo: tra 22h</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Copyright all'interno della dashboard */}
        <div className="dashboard-footer">
          <small>Software Sapori & Colori Fidelity creato da <strong>Lucci Pasquale (alias Lino Lucci)</strong></small>
        </div>
      </div>
    </div>
  )
}

// Helper function for email validation
const isValidEmail = (email) => {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
  return emailRegex.test(email)
}

export default LoginForm