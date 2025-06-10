// ===================================
// SAPORI & COLORI - USER MANAGEMENT
// ===================================

import { useState, useEffect } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { authService } from '../../services/authService'
import { activityService } from '../../services/activityService'

const UserManagement = ({ showNotification }) => {
  // State
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [userStats, setUserStats] = useState({})
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)

  const { profile: currentUser } = useAuth()

  // Add User Form State
  const [newUser, setNewUser] = useState({
    full_name: '',
    email: '',
    role: 'operator',
    password: '',
    generatePassword: true
  })

  // Edit User State
  const [editUser, setEditUser] = useState({
    full_name: '',
    email: '',
    role: '',
    active: true,
    notes: ''
  })

  // Load data on component mount
  useEffect(() => {
    loadUsers()
    loadUserStats()
  }, [])

  // Load all users
  const loadUsers = async () => {
    try {
      setLoading(true)
      const usersData = await authService.getAllUsers()
      setUsers(usersData || [])
    } catch (error) {
      console.error('Error loading users:', error)
      showNotification('❌ Errore nel caricamento utenti', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Load user statistics
  const loadUserStats = async () => {
    try {
      const stats = await authService.getUserStatistics()
      const statsObj = {}
      stats.forEach(stat => {
        statsObj[stat.role] = stat
      })
      setUserStats(statsObj)
    } catch (error) {
      console.error('Error loading user stats:', error)
    }
  }

  // Handle add user form
  const handleAddUser = async (e) => {
    e.preventDefault()

    try {
      // Validate form
      if (!newUser.full_name.trim() || !newUser.email.trim()) {
        showNotification('❌ Nome e email sono obbligatori', 'error')
        return
      }

      if (!authService.isValidEmail(newUser.email)) {
        showNotification('❌ Email non valida', 'error')
        return
      }

      // Generate password if needed
      let password = newUser.password
      if (newUser.generatePassword) {
        password = authService.generatePassword(12)
      }

      if (!password || password.length < 8) {
        showNotification('❌ Password deve essere di almeno 8 caratteri', 'error')
        return
      }

      setLoading(true)

      // Create user
      const userData = {
        full_name: newUser.full_name.trim(),
        email: newUser.email.toLowerCase().trim(),
        role: newUser.role,
        password: password
      }

      const createdUser = await authService.createUser(userData)

      if (createdUser) {
        // Log activity
        await activityService.logUserManagement('USER_CREATED', createdUser.id, createdUser)

        // Refresh users list
        await loadUsers()
        await loadUserStats()

        // Reset form
        setNewUser({
          full_name: '',
          email: '',
          role: 'operator',
          password: '',
          generatePassword: true
        })
        setShowAddUserModal(false)

        showNotification(`✅ Utente ${createdUser.full_name} creato con successo!`, 'success')

        // Show generated password if applicable
        if (newUser.generatePassword) {
          alert(`Password generata per ${createdUser.full_name}: ${password}\n\nComunica questa password all'utente in modo sicuro.`)
        }
      }
    } catch (error) {
      console.error('Error creating user:', error)
      showNotification(`❌ Errore nella creazione utente: ${error.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Handle edit user
  const handleEditUser = async (e) => {
    e.preventDefault()

    try {
      if (!selectedUser || !editUser.full_name.trim() || !editUser.email.trim()) {
        showNotification('❌ Dati utente non validi', 'error')
        return
      }

      setLoading(true)

      const oldData = { ...selectedUser }
      const updates = {
        full_name: editUser.full_name.trim(),
        email: editUser.email.toLowerCase().trim(),
        role: editUser.role,
        active: editUser.active,
        notes: editUser.notes?.trim() || null
      }

      const updatedUser = await authService.updateUser(selectedUser.id, updates)

      if (updatedUser) {
        // Log activity
        await activityService.logUserManagement('USER_UPDATED', selectedUser.id, updatedUser, oldData)

        // Refresh users list
        await loadUsers()
        
        setShowEditModal(false)
        setSelectedUser(null)

        showNotification(`✅ Utente ${updatedUser.full_name} aggiornato con successo!`, 'success')
      }
    } catch (error) {
      console.error('Error updating user:', error)
      showNotification(`❌ Errore nell'aggiornamento utente: ${error.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Open edit modal
  const openEditModal = (user) => {
    setSelectedUser(user)
    setEditUser({
      full_name: user.full_name || '',
      email: user.email || '',
      role: user.role || 'operator',
      active: user.active !== false,
      notes: user.notes || ''
    })
    setShowEditModal(true)
  }

  // Handle user activation/deactivation
  const handleToggleUserStatus = async (user) => {
    try {
      if (user.id === currentUser?.id) {
        showNotification('❌ Non puoi disattivare il tuo stesso account', 'error')
        return
      }

      setLoading(true)

      const newStatus = !user.active
      const updatedUser = newStatus 
        ? await authService.activateUser(user.id)
        : await authService.deactivateUser(user.id)

      if (updatedUser) {
        // Log activity
        await activityService.logUserManagement(
          newStatus ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', 
          user.id, 
          updatedUser
        )

        await loadUsers()
        await loadUserStats()

        const statusText = newStatus ? 'attivato' : 'disattivato'
        showNotification(`✅ Utente ${user.full_name} ${statusText} con successo!`, 'success')
      }
    } catch (error) {
      console.error('Error toggling user status:', error)
      showNotification(`❌ Errore nel cambio stato utente: ${error.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Handle delete user
  const handleDeleteUser = async (user) => {
    if (user.id === currentUser?.id) {
      showNotification('❌ Non puoi eliminare il tuo stesso account', 'error')
      return
    }

    const confirmed = window.confirm(
      `⚠️ ATTENZIONE!\n\nSei sicuro di voler eliminare l'utente "${user.full_name}"?\n\nQuesta azione è IRREVERSIBILE e cancellerà:\n- L'account utente\n- Tutti i dati associati\n- Lo storico delle attività\n\nDigita "ELIMINA" per confermare:`
    )

    if (confirmed !== 'ELIMINA') {
      showNotification('❌ Eliminazione annullata - testo di conferma non corretto', 'info')
      return
    }

    try {
      setLoading(true)

      await authService.deleteUser(user.id)

      // Log activity
      await activityService.logUserManagement('USER_DELETED', user.id, null, user)

      await loadUsers()
      await loadUserStats()

      showNotification(`✅ Utente ${user.full_name} eliminato con successo!`, 'success')
    } catch (error) {
      console.error('Error deleting user:', error)
      showNotification(`❌ Errore nell'eliminazione utente: ${error.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Handle reset password
  const handleResetPassword = async (user) => {
    const newPassword = authService.generatePassword(12)
    
    const confirmed = window.confirm(
      `Vuoi resettare la password per "${user.full_name}"?\n\nNuova password: ${newPassword}\n\nAnnota la password prima di procedere!`
    )

    if (!confirmed) return

    try {
      setLoading(true)

      await authService.resetUserPassword(user.id, newPassword)

      // Log activity
      await activityService.logUserManagement('PASSWORD_RESET', user.id, { email: user.email })

      showNotification(`✅ Password resettata per ${user.full_name}!`, 'success')
      
      // Show password again
      alert(`Password resettata per ${user.full_name}: ${newPassword}\n\nComunica questa password all'utente in modo sicuro.`)
    } catch (error) {
      console.error('Error resetting password:', error)
      showNotification(`❌ Errore nel reset password: ${error.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Get role display info
  const getRoleInfo = (role) => {
    const roles = {
      admin: { label: '👑 ADMIN', color: 'role-admin', description: 'Accesso completo' },
      manager: { label: '🟡 MANAGER', color: 'role-manager', description: 'Gestione operativa' },
      operator: { label: '🟢 OPERATORE', color: 'role-operator', description: 'Solo vendite' }
    }
    return roles[role] || roles.operator
  }

  // Get user avatar
  const getUserAvatar = (user) => {
    const initials = user.full_name
      ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : user.email[0].toUpperCase()
    
    const roleClass = {
      admin: 'admin-avatar',
      manager: 'manager-avatar', 
      operator: 'operator-avatar'
    }[user.role] || 'operator-avatar'

    return { initials, class: roleClass }
  }

  if (loading && users.length === 0) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">⏳</div>
        <p>Caricamento utenti...</p>
      </div>
    )
  }

  return (
    <div className="user-management">
      
      {/* HEADER CON STATISTICHE */}
      <div className="user-stats-grid">
        <div className="stat-card stat-total">
          <div className="stat-number">{users.length}</div>
          <div className="stat-label">Utenti Totali</div>
        </div>
        <div className="stat-card stat-active">
          <div className="stat-number">{users.filter(u => u.active !== false).length}</div>
          <div className="stat-label">Utenti Attivi</div>
        </div>
        <div className="stat-card stat-inactive">
          <div className="stat-number">{users.filter(u => u.active === false).length}</div>
          <div className="stat-label">Utenti Inattivi</div>
        </div>
        <div className="stat-card stat-admin">
          <div className="stat-number">{users.filter(u => u.role === 'admin').length}</div>
          <div className="stat-label">Amministratori</div>
        </div>
      </div>

      {/* HEADER CON AZIONI */}
      <div className="user-management-header">
        <h3>👥 Gestione Utenti Sistema</h3>
        <button 
          className="add-user-btn"
          onClick={() => setShowAddUserModal(true)}
          disabled={loading}
        >
          ➕ Aggiungi Utente
        </button>
      </div>

      {/* LISTA UTENTI */}
      <div className="users-grid">
        {users.map(user => {
          const avatar = getUserAvatar(user)
          const roleInfo = getRoleInfo(user.role)
          
          return (
            <div key={user.id} className="user-card">
              
              {/* Header Card */}
              <div className="user-header">
                <div className={`user-avatar ${avatar.class}`}>
                  {avatar.initials}
                </div>
                <div className={`user-status ${user.active !== false ? 'status-active' : 'status-inactive'}`}>
                  {user.active !== false ? 'ATTIVO' : 'INATTIVO'}
                </div>
              </div>

              {/* Info Utente */}
              <div className="user-info-section">
                <div className="user-name">{user.full_name || 'Nome non specificato'}</div>
                <div className="user-email">{user.email}</div>
                <div className={`user-role ${roleInfo.color}`}>
                  {roleInfo.label}
                </div>
                <div className="user-meta">
                  Creato: {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  {user.last_login && (
                    <>
                      <br />Ultimo accesso: {new Date(user.last_login).toLocaleString()}
                    </>
                  )}
                  <br />Login totali: {user.login_count || 0}
                </div>
                {user.notes && (
                  <div className="user-notes">
                    📝 {user.notes}
                  </div>
                )}
              </div>

              {/* Azioni */}
              <div className="user-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => openEditModal(user)}
                  disabled={loading}
                >
                  ✏️ Modifica
                </button>
                
                <button
                  className="btn btn-secondary"
                  onClick={() => handleResetPassword(user)}
                  disabled={loading || user.id === currentUser?.id}
                >
                  🔑 Reset Password
                </button>

                {user.id !== currentUser?.id && (
                  <button
                    className={`btn ${user.active !== false ? 'btn-warning' : 'btn-success'}`}
                    onClick={() => handleToggleUserStatus(user)}
                    disabled={loading}
                  >
                    {user.active !== false ? '🚫 Disattiva' : '✅ Attiva'}
                  </button>
                )}

                {user.id !== currentUser?.id && user.active === false && (
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDeleteUser(user)}
                    disabled={loading}
                  >
                    🗑️ Elimina
                  </button>
                )}
              </div>

            </div>
          )
        })}
      </div>

      {/* MODAL AGGIUNGI UTENTE */}
      {showAddUserModal && (
        <div className="modal-overlay">
          <div className="modal modal-large">
            <div className="modal-header">
              <h4>➕ Aggiungi Nuovo Utente</h4>
              <button 
                className="close-btn"
                onClick={() => setShowAddUserModal(false)}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAddUser} className="modal-body">
              <div className="form-group">
                <label className="form-label">👤 Nome Completo *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  placeholder="Mario Rossi"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">📧 Email *</label>
                <input
                  type="email"
                  className="form-input"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="mario.rossi@saporiecolori.it"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">👥 Ruolo</label>
                <select
                  className="form-input"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="operator">🟢 Operatore - Solo vendite</option>
                  <option value="manager">🟡 Manager - Gestione operativa</option>
                  <option value="admin">👑 Admin - Accesso completo</option>
                </select>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={newUser.generatePassword}
                    onChange={(e) => setNewUser({ ...newUser, generatePassword: e.target.checked })}
                  />
                  <span>🎲 Genera password automaticamente (consigliato)</span>
                </label>
              </div>

              {!newUser.generatePassword && (
                <div className="form-group">
                  <label className="form-label">🔒 Password *</label>
                  <input
                    type="password"
                    className="form-input"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Minimo 8 caratteri"
                    minLength="8"
                    required={!newUser.generatePassword}
                  />
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? '⏳ Creazione...' : '✅ Crea Utente'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddUserModal(false)}
                  disabled={loading}
                >
                  ❌ Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MODIFICA UTENTE */}
      {showEditModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal modal-large">
            <div className="modal-header">
              <h4>✏️ Modifica Utente: {selectedUser.full_name}</h4>
              <button 
                className="close-btn"
                onClick={() => setShowEditModal(false)}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleEditUser} className="modal-body">
              <div className="form-group">
                <label className="form-label">👤 Nome Completo *</label>
                <input
                  type="text"
                  className="form-input"
                  value={editUser.full_name}
                  onChange={(e) => setEditUser({ ...editUser, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">📧 Email *</label>
                <input
                  type="email"
                  className="form-input"
                  value={editUser.email}
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">👥 Ruolo</label>
                <select
                  className="form-input"
                  value={editUser.role}
                  onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                  disabled={selectedUser.id === currentUser?.id}
                >
                  <option value="operator">🟢 Operatore - Solo vendite</option>
                  <option value="manager">🟡 Manager - Gestione operativa</option>
                  <option value="admin">👑 Admin - Accesso completo</option>
                </select>
                {selectedUser.id === currentUser?.id && (
                  <p className="form-help">Non puoi modificare il tuo stesso ruolo</p>
                )}
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={editUser.active}
                    onChange={(e) => setEditUser({ ...editUser, active: e.target.checked })}
                    disabled={selectedUser.id === currentUser?.id}
                  />
                  <span>✅ Account attivo</span>
                </label>
                {selectedUser.id === currentUser?.id && (
                  <p className="form-help">Non puoi disattivare il tuo stesso account</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">📝 Note</label>
                <textarea
                  className="form-input"
                  value={editUser.notes}
                  onChange={(e) => setEditUser({ ...editUser, notes: e.target.value })}
                  placeholder="Note opzionali sull'utente..."
                  rows="3"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? '⏳ Salvataggio...' : '💾 Salva Modifiche'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                  disabled={loading}
                >
                  ❌ Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

export default UserManagement