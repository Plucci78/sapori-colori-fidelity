// ===================================
// SAPORI & COLORI - LOGIN FORM
// ===================================

import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

export const LoginForm = ({ onSuccess = null, className = "" }) => {
  const { signIn, loading, isAuthenticated } = useAuth()
  
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
    </div>
  )
}

// Helper function for email validation
const isValidEmail = (email) => {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
  return emailRegex.test(email)
}

export default LoginForm