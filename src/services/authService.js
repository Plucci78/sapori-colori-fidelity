// ===================================
// SAPORI & COLORI - AUTH SERVICE
// ===================================

import { supabase } from '../supabase'

export const authService = {
  // ===================================
  // PROFILE OPERATIONS
  // ===================================

  // Get user profile
  async getProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Get profile error:', error)
      return null
    }
  },

  // Update user profile
  async updateProfile(userId, updates) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          last_activity: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('Error updating profile:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Update profile error:', error)
      throw error
    }
  },

  // Update last login
  async updateLastLogin(userId) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          last_login: new Date().toISOString(),
          last_activity: new Date().toISOString(),
          login_count: supabase.raw('login_count + 1')
        })
        .eq('id', userId)

      if (error) {
        console.error('Error updating last login:', error)
      }
    } catch (error) {
      console.error('Update last login error:', error)
    }
  },

  // ===================================
  // USER MANAGEMENT (ADMIN ONLY)
  // ===================================

  // Get all users (admin only)
  async getAllUsers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching users:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Get all users error:', error)
      throw error
    }
  },

  // Create new user (admin only)
  async createUser(userData) {
    try {
      // First create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          full_name: userData.full_name,
          role: userData.role
        }
      })

      if (authError) {
        console.error('Error creating auth user:', authError)
        throw authError
      }

      // Profile will be created automatically by trigger
      // Wait a bit and fetch the profile
      await new Promise(resolve => setTimeout(resolve, 1000))

      const profile = await this.getProfile(authData.user.id)
      return profile
    } catch (error) {
      console.error('Create user error:', error)
      throw error
    }
  },

  // Update user (admin only)
  async updateUser(userId, updates) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('Error updating user:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Update user error:', error)
      throw error
    }
  },

  // Deactivate user (admin only)
  async deactivateUser(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          active: false,
          last_activity: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('Error deactivating user:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Deactivate user error:', error)
      throw error
    }
  },

  // Activate user (admin only)
  async activateUser(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          active: true,
          last_activity: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('Error activating user:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Activate user error:', error)
      throw error
    }
  },

  // Delete user (admin only)
  async deleteUser(userId) {
    try {
      // First delete from auth (this will cascade to profiles)
      const { error: authError } = await supabase.auth.admin.deleteUser(userId)

      if (authError) {
        console.error('Error deleting auth user:', authError)
        throw authError
      }

      return true
    } catch (error) {
      console.error('Delete user error:', error)
      throw error
    }
  },

  // Reset user password (admin only)
  async resetUserPassword(userId, newPassword) {
    try {
      const { data, error } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword
      })

      if (error) {
        console.error('Error resetting password:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Reset password error:', error)
      throw error
    }
  },

  // ===================================
  // USER STATISTICS
  // ===================================

  // Get user statistics
  async getUserStatistics() {
    try {
      const { data, error } = await supabase
        .from('user_statistics')
        .select('*')

      if (error) {
        console.error('Error fetching user statistics:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Get user statistics error:', error)
      return []
    }
  },

  // Get user sessions (admin only)
  async getUserSessions(userId = null) {
    try {
      let query = supabase
        .from('user_sessions')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            role
          )
        `)
        .eq('active', true)
        .order('created_at', { ascending: false })

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching user sessions:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Get user sessions error:', error)
      return []
    }
  },

  // ===================================
  // SYSTEM SETTINGS
  // ===================================

  // Get system settings
  async getSystemSettings(category = null) {
    try {
      let query = supabase
        .from('system_settings')
        .select('*')
        .order('category, key')

      if (category) {
        query = query.eq('category', category)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching system settings:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Get system settings error:', error)
      return []
    }
  },

  // Update system setting
  async updateSystemSetting(category, key, value, description = null) {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .upsert({
          category,
          key,
          value,
          description,
          updated_by: (await supabase.auth.getUser()).data?.user?.id
        })
        .select()
        .single()

      if (error) {
        console.error('Error updating system setting:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Update system setting error:', error)
      throw error
    }
  },

  // ===================================
  // PERMISSIONS & ROLES
  // ===================================

  // Check if user has permission
  async hasPermission(permission, userId = null) {
    try {
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser()
        userId = user?.id
      }

      if (!userId) return false

      const profile = await this.getProfile(userId)
      if (!profile) return false

      // Admin has all permissions
      if (profile.role === 'admin') return true

      // Check custom permissions
      if (profile.permissions && profile.permissions[permission]) {
        return profile.permissions[permission]
      }

      // Default role-based permissions
      const rolePermissions = {
        'operator': [
          'view_customers',
          'create_customers', 
          'create_transactions',
          'view_own_stats'
        ],
        'manager': [
          'view_customers',
          'create_customers',
          'edit_customers',
          'create_transactions',
          'edit_transactions',
          'view_stats',
          'send_emails',
          'manage_prizes',
          'view_settings'
        ],
        'admin': ['*'] // All permissions
      }

      const userPermissions = rolePermissions[profile.role] || []
      return userPermissions.includes('*') || userPermissions.includes(permission)
    } catch (error) {
      console.error('Check permission error:', error)
      return false
    }
  },

  // Get role hierarchy level
  getRoleLevel(role) {
    const levels = {
      'operator': 1,
      'manager': 2,
      'admin': 3
    }
    return levels[role] || 0
  },

  // Check if user has role or higher
  hasRoleOrHigher(requiredRole, userRole) {
    return this.getRoleLevel(userRole) >= this.getRoleLevel(requiredRole)
  },

  // ===================================
  // VALIDATION HELPERS
  // ===================================

  // Validate email
  isValidEmail(email) {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
    return emailRegex.test(email)
  },

  // Validate password strength
  validatePassword(password) {
    const errors = []
    
    if (password.length < 8) {
      errors.push('Password deve essere di almeno 8 caratteri')
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password deve contenere almeno una lettera maiuscola')
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password deve contenere almeno una lettera minuscola')
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password deve contenere almeno un numero')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  // Generate secure password
  generatePassword(length = 12) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    
    // Ensure at least one of each required character type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]
    password += '0123456789'[Math.floor(Math.random() * 10)]
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)]
    
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)]
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('')
  }
}