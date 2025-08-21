// ===================================
// SAPORI & COLORI - USE PERMISSIONS HOOK
// ===================================

import { useMemo } from 'react'
import { useAuth } from '../auth/AuthContext'

export const usePermissions = () => {
  const { profile, user } = useAuth()

  // Calculate all permissions for current user
  const permissions = useMemo(() => {
    if (!profile || !user) {
      return {
        // No permissions if not authenticated
        canViewCustomers: false,
        canCreateCustomers: false,
        canEditCustomers: false,
        canDeleteCustomers: false,
        canViewTransactions: false,
        canCreateTransactions: false,
        canEditTransactions: false,
        canDeleteTransactions: false,
        canViewStats: false,
        canExportData: false,
        canSendEmails: false,
        canManagePrizes: false,
        canViewSettings: false,
        canManageSettings: false,
        canViewUsers: false,
        canCreateUsers: false,
        canEditUsers: false,
        canDeleteUsers: false,
        canViewLogs: false,
        canExportLogs: false,
        canViewSystemSettings: false,
        canEditSystemSettings: false,
        canBackupSystem: false,
        canMaintenanceMode: false,
        canManageCoupons: false // Added coupon management permission
      }
    }

    const { role } = profile
    const isActive = profile.active

    // If user is inactive, no permissions
    if (!isActive) {
      return Object.fromEntries(
        Object.keys(getDefaultPermissions()).map(key => [key, false])
      )
    }

    // Admin has all permissions
    if (role === 'admin') {
      return Object.fromEntries(
        Object.keys(getDefaultPermissions()).map(key => [key, true])
      )
    }

    // Role-based permissions
    const rolePermissions = {
      operator: {
        // Customer management
        canViewCustomers: true,
        canCreateCustomers: true,
        canEditCustomers: false,
        canDeleteCustomers: false,
        
        // Transaction management
        canViewTransactions: true,
        canCreateTransactions: true,
        canEditTransactions: false,
        canDeleteTransactions: false,
        
        // Statistics & Reports
        canViewStats: false,
        canExportData: false,
        
        // Email & Marketing
        canSendEmails: false,
        
        // Prizes
        canManagePrizes: false,
        
        // Settings & Admin
        canViewSettings: false,
        canManageSettings: false,
        canViewUsers: false,
        canCreateUsers: false,
        canEditUsers: false,
        canDeleteUsers: false,
        canViewLogs: false,
        canExportLogs: false,
        canViewSystemSettings: false,
        canEditSystemSettings: false,
        canBackupSystem: false,
        canMaintenanceMode: false,
        canManageCoupons: true // Added coupon management permission for admin
      },
      
      manager: {
        // Customer management
        canViewCustomers: true,
        canCreateCustomers: true,
        canEditCustomers: true,
        canDeleteCustomers: false, // Only admin can delete
        
        // Transaction management
        canViewTransactions: true,
        canCreateTransactions: true,
        canEditTransactions: true,
        canDeleteTransactions: false, // Only admin can delete
        
        // Statistics & Reports
        canViewStats: true,
        canExportData: true,
        
        // Email & Marketing
        canSendEmails: true,
        
        // Prizes
        canManagePrizes: true,
        
        // Settings (limited)
        canViewSettings: true,
        canManageSettings: false, // Only view, not edit
        canViewUsers: false, // Can't see user management
        canCreateUsers: false,
        canEditUsers: false,
        canDeleteUsers: false,
        canViewLogs: false, // Can't see activity logs
        canExportLogs: false,
        canViewSystemSettings: false,
        canEditSystemSettings: false,
        canBackupSystem: false,
        canMaintenanceMode: false,
        canManageCoupons: true // Added coupon management permission for manager
      },
    }

    // Get base permissions for role
    const basePermissions = rolePermissions[role] || rolePermissions.operator

    // Merge with custom permissions from profile
    const customPermissions = profile.permissions || {}
    
    return {
      ...basePermissions,
      ...customPermissions
    }
  }, [profile, user])

  // Helper functions
  const hasPermission = (permission) => {
    return permissions[permission] || false
  }

  const hasAnyPermission = (permissionList) => {
    return permissionList.some(permission => hasPermission(permission))
  }

  const hasAllPermissions = (permissionList) => {
    return permissionList.every(permission => hasPermission(permission))
  }

  const hasRole = (requiredRole) => {
    if (!profile?.role) return false
    
    const roleHierarchy = {
      'operator': 1,
      'manager': 2,
      'admin': 3
    }
    
    const userLevel = roleHierarchy[profile.role] || 0
    const requiredLevel = roleHierarchy[requiredRole] || 0
    
    return userLevel >= requiredLevel
  }

  const hasRoleExact = (exactRole) => {
    return profile?.role === exactRole
  }

  // Check if user can access a specific module
  const canAccessModule = (module) => {
    const modulePermissions = {
      customers: ['canViewCustomers'],
      transactions: ['canViewTransactions'],
      statistics: ['canViewStats'],
      email: ['canSendEmails'],
      prizes: ['canManagePrizes'],
      settings: ['canViewSettings'],
      users: ['canViewUsers'],
      logs: ['canViewLogs'],
      coupons: ['canManageCoupons']
    }

    const requiredPermissions = modulePermissions[module] || []
    return hasAnyPermission(requiredPermissions)
  }

  // Get permission level for an action
  const getPermissionLevel = (action) => {
    const actionLevels = {
      'view': 1,
      'create': 2,
      'edit': 3,
      'delete': 4,
      'admin': 5
    }

    const userRoleLevel = {
      'operator': 2,
      'manager': 3,
      'admin': 5
    }

    const actionLevel = actionLevels[action] || 1
    const userLevel = userRoleLevel[profile?.role] || 0

    return userLevel >= actionLevel
  }

  return {
    // All permissions object
    permissions,
    
    // Helper functions
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasRoleExact,
    canAccessModule,
    getPermissionLevel,
    
    // Quick access to common checks
    isAdmin: hasRoleExact('admin'),
    isManager: hasRoleExact('manager'),
    isOperator: hasRoleExact('operator'),
    isActive: profile?.active || false,
    
    // User info
    userRole: profile?.role || null,
    userName: profile?.full_name || user?.email?.split('@')[0] || user?.email || 'Utente',
    userEmail: profile?.email || '',
    
    // Module access shortcuts
    canAccessCustomers: canAccessModule('customers'),
    canAccessTransactions: canAccessModule('transactions'),
    canAccessStatistics: canAccessModule('statistics'),
    canAccessEmail: canAccessModule('email'),
    canAccessPrizes: canAccessModule('prizes'),
    canAccessSettings: canAccessModule('settings'),
    canAccessUsers: canAccessModule('users'),
    canAccessLogs: canAccessModule('logs'),
    canAccessCoupons: canAccessModule('coupons')
  }
}

// Default permissions structure
function getDefaultPermissions() {
  return {
    // Customer management
    canViewCustomers: false,
    canCreateCustomers: false,
    canEditCustomers: false,
    canDeleteCustomers: false,
    
    // Transaction management
    canViewTransactions: false,
    canCreateTransactions: false,
    canEditTransactions: false,
    canDeleteTransactions: false,
    
    // Statistics & Reports
    canViewStats: false,
    canExportData: false,
    
    // Email & Marketing
    canSendEmails: false,
    
    // Prizes
    canManagePrizes: false,
    canManageCoupons: false,
    
    // Settings & Admin
    canViewSettings: false,
    canManageSettings: false,
    canViewUsers: false,
    canCreateUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canViewLogs: false,
    canExportLogs: false,
    canViewSystemSettings: false,
    canEditSystemSettings: false,
    canBackupSystem: false,
    canMaintenanceMode: false
  }
}

// Hook for protected actions
export const useProtectedAction = () => {
  const { hasPermission } = usePermissions()

  const executeProtectedAction = (requiredPermission, action, onDenied = null) => {
    if (!hasPermission(requiredPermission)) {
      if (onDenied) {
        onDenied()
      } else {
        console.warn(`Access denied: Missing permission '${requiredPermission}'`)
        // You could show a notification here
      }
      return false
    }

    try {
      action()
      return true
    } catch (error) {
      console.error('Error executing protected action:', error)
      return false
    }
  }

  return {
    executeProtectedAction,
    hasPermission
  }
}

export default usePermissions