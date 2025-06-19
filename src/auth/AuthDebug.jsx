import { useAuth } from './AuthContext'

export const AuthDebug = () => {
  const { user, profile, loading, isAuthenticated } = useAuth()

  if (!import.meta.env.DEV) return null

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: '#000',
      color: '#fff',
      padding: '10px',
      borderRadius: '4px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '200px'
    }}>
      <div><strong>AUTH DEBUG</strong></div>
      <div>Loading: {loading ? '🔄' : '✅'}</div>
      <div>User: {user ? '✅' : '❌'}</div>
      <div>Profile: {profile ? '✅' : '❌'}</div>
      <div>Authenticated: {isAuthenticated ? '✅' : '❌'}</div>
      {user && <div>Email: {user.email}</div>}
      {profile && <div>Role: {profile.role}</div>}
    </div>
  )
}
