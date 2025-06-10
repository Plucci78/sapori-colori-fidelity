// ===================================
// SAPORI & COLORI - PROTECTED COMPONENT
// ===================================

import { usePermissions } from '../hooks/usePermissions'

// Main Protected Component
export const ProtectedComponent = ({ 
  permission, 
  role = null,
  children, 
  fallback = null,
  showAccessDenied = false,
  className = ""
}) => {
  const { hasPermission, hasRole, isActive } = usePermissions()

  // Check if user is active
  if (!isActive) {
    return fallback || (showAccessDenied ? <AccessDeniedMessage message="Account disattivato" /> : null)
  }

  // Check permission if specified
  if (permission && !hasPermission(permission)) {
    return fallback || (showAccessDenied ? <AccessDeniedMessage message="Permessi insufficienti" /> : null)
  }

  // Check role if specified
  if (role && !hasRole(role)) {
    return fallback || (showAccessDenied ? <AccessDeniedMessage message={`Ruolo '${role}' richiesto`} /> : null)
  }

  return <div className={className}>{children}</div>
}

// Protected Route wrapper
export const ProtectedRoute = ({ 
  permission, 
  role = null, 
  children, 
  redirectTo = '/login' 
}) => {
  const { hasPermission, hasRole, isActive, userRole } = usePermissions()

  // If not active, could redirect to login or show message
  if (!isActive) {
    return <AccessDeniedPage message="Il tuo account è stato disattivato. Contatta l'amministratore." />
  }

  // Check permission
  if (permission && !hasPermission(permission)) {
    return <AccessDeniedPage message="Non hai i permessi necessari per accedere a questa sezione." />
  }

  // Check role
  if (role && !hasRole(role)) {
    return <AccessDeniedPage message={`Accesso riservato ai ruoli: ${role}. Il tuo ruolo: ${userRole}`} />
  }

  return children
}

// Admin Only wrapper
export const AdminOnly = ({ children, fallback = null }) => {
  return (
    <ProtectedComponent 
      role="admin" 
      fallback={fallback}
    >
      {children}
    </ProtectedComponent>
  )
}

// Manager or higher wrapper
export const ManagerOrHigher = ({ children, fallback = null }) => {
  return (
    <ProtectedComponent 
      role="manager" 
      fallback={fallback}
    >
      {children}
    </ProtectedComponent>
  )
}

// Custom permission wrapper
export const RequirePermission = ({ permission, children, fallback = null }) => {
  return (
    <ProtectedComponent 
      permission={permission} 
      fallback={fallback}
    >
      {children}
    </ProtectedComponent>
  )
}

// Protected Button - shows disabled state if no permission
export const ProtectedButton = ({ 
  permission, 
  role = null,
  onClick, 
  children, 
  disabled = false,
  className = "",
  disabledClassName = "btn-disabled",
  showTooltip = true,
  tooltipMessage = "Non hai i permessi per questa azione",
  ...props 
}) => {
  const { hasPermission, hasRole } = usePermissions()

  const hasAccess = (!permission || hasPermission(permission)) && 
                   (!role || hasRole(role))

  const isDisabled = disabled || !hasAccess

  const handleClick = (e) => {
    if (!hasAccess) {
      e.preventDefault()
      if (showTooltip) {
        // You could show a tooltip or notification here
        console.warn(tooltipMessage)
      }
      return
    }
    if (onClick) {
      onClick(e)
    }
  }

  return (
    <button
      {...props}
      className={`${className} ${isDisabled ? disabledClassName : ''}`}
      disabled={isDisabled}
      onClick={handleClick}
      title={!hasAccess && showTooltip ? tooltipMessage : props.title}
    >
      {children}
    </button>
  )
}

// Protected Link - shows as disabled text if no permission
export const ProtectedLink = ({ 
  permission, 
  role = null,
  href, 
  children, 
  className = "",
  disabledClassName = "link-disabled",
  ...props 
}) => {
  const { hasPermission, hasRole } = usePermissions()

  const hasAccess = (!permission || hasPermission(permission)) && 
                   (!role || hasRole(role))

  if (!hasAccess) {
    return (
      <span className={`${className} ${disabledClassName}`} {...props}>
        {children}
      </span>
    )
  }

  return (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  )
}

// Protected Navigation Tab
export const ProtectedTab = ({ 
  permission, 
  role = null,
  isActive = false,
  onClick, 
  children, 
  className = "nav-tab",
  activeClassName = "active",
  ...props 
}) => {
  const { hasPermission, hasRole } = usePermissions()

  const hasAccess = (!permission || hasPermission(permission)) && 
                   (!role || hasRole(role))

  // Don't render tab if no access
  if (!hasAccess) {
    return null
  }

  return (
    <button
      {...props}
      className={`${className} ${isActive ? activeClassName : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

// Protected Section - with loading state
export const ProtectedSection = ({ 
  permission, 
  role = null,
  children, 
  loading = false,
  loadingComponent = <LoadingMessage />,
  title = "",
  className = "protected-section"
}) => {
  const { hasPermission, hasRole } = usePermissions()

  const hasAccess = (!permission || hasPermission(permission)) && 
                   (!role || hasRole(role))

  if (loading) {
    return loadingComponent
  }

  if (!hasAccess) {
    return null // Don't show section at all
  }

  return (
    <div className={className}>
      {title && <h3 className="section-title">{title}</h3>}
      {children}
    </div>
  )
}

// Access Denied Message Component
const AccessDeniedMessage = ({ message = "Accesso negato" }) => (
  <div className="access-denied">
    <span className="access-denied-icon">🔒</span>
    <span className="access-denied-text">{message}</span>
  </div>
)

// Access Denied Page Component
const AccessDeniedPage = ({ message = "Accesso negato" }) => (
  <div className="access-denied-page">
    <div className="access-denied-content">
      <div className="access-denied-icon">🚫</div>
      <h2>Accesso Negato</h2>
      <p>{message}</p>
      <button 
        className="btn btn-primary"
        onClick={() => window.history.back()}
      >
        ← Torna Indietro
      </button>
    </div>
  </div>
)

// Loading Message Component
const LoadingMessage = () => (
  <div className="loading-message">
    <span>⏳ Caricamento...</span>
  </div>
)

// Higher Order Component for protecting entire components
export const withProtection = (permission, role = null) => {
  return (WrappedComponent) => {
    return (props) => (
      <ProtectedComponent permission={permission} role={role}>
        <WrappedComponent {...props} />
      </ProtectedComponent>
    )
  }
}

// Hook for conditional rendering based on permissions
export const useConditionalRender = () => {
  const { hasPermission, hasRole } = usePermissions()

  const renderIf = (condition, component) => {
    return condition ? component : null
  }

  const renderIfPermission = (permission, component) => {
    return hasPermission(permission) ? component : null
  }

  const renderIfRole = (role, component) => {
    return hasRole(role) ? component : null
  }

  const renderIfAdmin = (component) => {
    return hasRole('admin') ? component : null
  }

  const renderIfManager = (component) => {
    return hasRole('manager') ? component : null
  }

  return {
    renderIf,
    renderIfPermission,
    renderIfRole,
    renderIfAdmin,
    renderIfManager,
    hasPermission,
    hasRole
  }
}

export default ProtectedComponent