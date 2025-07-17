// ===================================
// SAPORI & COLORI - ACTIVITY SERVICE
// ===================================

import { supabase } from '../supabase'

export const activityService = {
  // ===================================
  // LOG ACTIVITY
  // ===================================

  // Main function to log any activity
  async logActivity({
    action,
    entityType = null,
    entityId = null,
    details = null,
    oldValues = null,
    newValues = null,
    category = 'system',
    severity = 'low'
  }, options = {}) {
    try {
      // Get current user info (skip if specified)
      let userInfo = null
      if (!options.skipAuth) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name, role')
            .eq('id', user.id)
            .single()

          userInfo = {
            user_id: user.id,
            user_email: profile?.email || user.email,
            user_name: profile?.full_name || 'Unknown',
            user_role: profile?.role || 'unknown'
          }
        }
      }

      // Get client info
      const clientInfo = this.getClientInfo()

      // Create log entry
      const logEntry = {
        ...userInfo,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details: details ? JSON.stringify(details) : null,
        old_values: oldValues ? JSON.stringify(oldValues) : null,
        new_values: newValues ? JSON.stringify(newValues) : null,
        category,
        severity,
        ip_address: clientInfo.ip,
        user_agent: clientInfo.userAgent,
        timestamp: new Date().toISOString()
      }

      const { error } = await supabase
        .from('activity_logs')
        .insert(logEntry)

      if (error) {
        console.error('Error logging activity:', error)
        // Don't throw error to avoid breaking main functionality
      }
    } catch (error) {
      console.error('Activity logging error:', error)
      // Silent fail for logging
    }
  },

  // ===================================
  // SPECIFIC ACTIVITY LOGGERS
  // ===================================

  // Log authentication activities
  async logAuth(action, details = {}) {
    await this.logActivity({
      action,
      category: 'auth',
      severity: action.includes('FAILED') ? 'medium' : 'low',
      details
    })
  },

  // Log customer activities
  async logCustomer(action, customerId, customerData = null, oldData = null) {
    await this.logActivity({
      action,
      entityType: 'customer',
      entityId: customerId,
      category: 'customer',
      severity: 'low',
      newValues: customerData,
      oldValues: oldData,
      details: {
        customer_name: customerData?.name || oldData?.name,
        timestamp: new Date().toISOString()
      }
    })
  },

  // Log transaction activities
  async logTransaction(action, transactionId, transactionData = null) {
    await this.logActivity({
      action,
      entityType: 'transaction',
      entityId: transactionId,
      category: 'transaction',
      severity: 'low',
      newValues: transactionData,
      details: {
        amount: transactionData?.amount,
        customer_id: transactionData?.customer_id,
        points_earned: transactionData?.points_earned,
        timestamp: new Date().toISOString(),
        // Include tutti i dati aggiuntivi passati (per premi, referral, etc.)
        ...(transactionData || {})
      }
    })
  },

  // Log email activities
  async logEmail(action, details = {}) {
    await this.logActivity({
      action,
      category: 'email',
      severity: 'low',
      details: {
        ...details,
        timestamp: new Date().toISOString()
      }
    })
  },

  // Log user management activities
  async logUserManagement(action, targetUserId, userData = null, oldData = null) {
    await this.logActivity({
      action,
      entityType: 'user',
      entityId: targetUserId,
      category: 'user_management',
      severity: action.includes('DELETE') ? 'high' : 'medium',
      newValues: userData,
      oldValues: oldData,
      details: {
        target_user_email: userData?.email || oldData?.email,
        target_user_name: userData?.full_name || oldData?.full_name,
        target_user_role: userData?.role || oldData?.role,
        timestamp: new Date().toISOString()
      }
    })
  },

  // Log system activities
  async logSystem(action, details = {}) {
    await this.logActivity({
      action,
      category: 'system',
      severity: details.severity || 'medium',
      details: {
        ...details,
        timestamp: new Date().toISOString()
      }
    })
  },

  // ===================================
  // RETRIEVE ACTIVITY LOGS
  // ===================================

  // Get activity logs with filters
  async getActivityLogs(filters = {}) {
    try {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('timestamp', { ascending: false })

      // Apply filters
      if (filters.userId) {
        query = query.eq('user_id', filters.userId)
      }

      if (filters.category) {
        query = query.eq('category', filters.category)
      }

      if (filters.action) {
        query = query.eq('action', filters.action)
      }

      if (filters.severity) {
        query = query.eq('severity', filters.severity)
      }

      if (filters.entityType) {
        query = query.eq('entity_type', filters.entityType)
      }

      if (filters.entityId) {
        query = query.eq('entity_id', filters.entityId)
      }

      if (filters.dateFrom) {
        query = query.gte('timestamp', filters.dateFrom)
      }

      if (filters.dateTo) {
        query = query.lte('timestamp', filters.dateTo)
      }

      if (filters.search) {
        query = query.or(`action.ilike.%${filters.search}%,details.ilike.%${filters.search}%,user_name.ilike.%${filters.search}%`)
      }

      // Pagination
      if (filters.limit) {
        query = query.limit(filters.limit)
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching activity logs:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Get activity logs error:', error)
      throw error
    }
  },

  // Get activity summary statistics
  async getActivitySummary(dateRange = 30) {
    try {
      const dateFrom = new Date()
      dateFrom.setDate(dateFrom.getDate() - dateRange)

      const { data, error } = await supabase
        .from('activity_logs')
        .select('category, action, severity, timestamp')
        .gte('timestamp', dateFrom.toISOString())

      if (error) {
        console.error('Error fetching activity summary:', error)
        throw error
      }

      // Process data into summary
      const summary = {
        totalActivities: data.length,
        byCategory: {},
        bySeverity: {},
        byDay: {},
        topActions: {},
        activeUsers: new Set()
      }

      data.forEach(log => {
        // By category
        summary.byCategory[log.category] = (summary.byCategory[log.category] || 0) + 1

        // By severity
        summary.bySeverity[log.severity] = (summary.bySeverity[log.severity] || 0) + 1

        // By day
        const day = new Date(log.timestamp).toISOString().split('T')[0]
        summary.byDay[day] = (summary.byDay[day] || 0) + 1

        // Top actions
        summary.topActions[log.action] = (summary.topActions[log.action] || 0) + 1
      })

      // Convert activeUsers Set to count
      summary.activeUsers = summary.activeUsers.size

      return summary
    } catch (error) {
      console.error('Get activity summary error:', error)
      throw error
    }
  },

  // Get user-specific activity
  async getUserActivity(userId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching user activity:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Get user activity error:', error)
      throw error
    }
  },

  // Get daily activity view
  async getDailyActivity(days = 7) {
    try {
      const { data, error } = await supabase
        .from('daily_activity')
        .select('*')
        .limit(days)

      if (error) {
        console.error('Error fetching daily activity:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Get daily activity error:', error)
      throw error
    }
  },

  // ===================================
  // EXPORT & REPORTING
  // ===================================

  // Export activity logs to CSV
  async exportActivityLogs(filters = {}) {
    try {
      const logs = await this.getActivityLogs({
        ...filters,
        limit: null // Get all matching records
      })

      // Convert to CSV format
      const headers = [
        'Timestamp',
        'User',
        'Email', 
        'Role',
        'Action',
        'Category',
        'Severity',
        'Entity Type',
        'Entity ID',
        'Details',
        'IP Address'
      ]

      const csvData = logs.map(log => [
        new Date(log.timestamp).toLocaleString(),
        log.user_name || 'System',
        log.user_email || '',
        log.user_role || '',
        log.action,
        log.category,
        log.severity,
        log.entity_type || '',
        log.entity_id || '',
        this.formatDetailsForExport(log.details),
        log.ip_address || ''
      ])

      return {
        headers,
        data: csvData,
        filename: `activity_logs_${new Date().toISOString().split('T')[0]}.csv`
      }
    } catch (error) {
      console.error('Export activity logs error:', error)
      throw error
    }
  },

  // ===================================
  // UTILITY FUNCTIONS
  // ===================================

  // Get client information
  getClientInfo() {
    return {
      ip: this.getClientIP(),
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    }
  },

  // Get client IP (approximation)
  getClientIP() {
    // This is a simplified approach - in production you might want to use a service
    return null // Non passare mai 'unknown' a una colonna inet
  },

  // Format details for export
  formatDetailsForExport(details) {
    if (!details) return ''
    try {
      const parsed = typeof details === 'string' ? JSON.parse(details) : details
      return Object.entries(parsed)
        .map(([key, value]) => `${key}: ${value}`)
        .join('; ')
    } catch {
      return String(details)
    }
  },

  // Clean old logs (maintenance function)
  async cleanOldLogs(daysToKeep = 90) {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      const { error } = await supabase
        .from('activity_logs')
        .delete()
        .lt('timestamp', cutoffDate.toISOString())

      if (error) {
        console.error('Error cleaning old logs:', error)
        throw error
      }

      await this.logSystem('LOGS_CLEANED', {
        cutoff_date: cutoffDate.toISOString(),
        days_kept: daysToKeep
      })

      return true
    } catch (error) {
      console.error('Clean old logs error:', error)
      throw error
    }
  },

  // ===================================
  // BATCH OPERATIONS
  // ===================================

  // Log multiple activities at once
  async logBatch(activities) {
    try {
      const userInfo = await this.getCurrentUserInfo()
      const clientInfo = this.getClientInfo()

      const logEntries = activities.map(activity => ({
        ...userInfo,
        ...activity,
        ip_address: clientInfo.ip,
        user_agent: clientInfo.userAgent,
        timestamp: new Date().toISOString(),
        details: activity.details ? JSON.stringify(activity.details) : null,
        old_values: activity.oldValues ? JSON.stringify(activity.oldValues) : null,
        new_values: activity.newValues ? JSON.stringify(activity.newValues) : null
      }))

      const { error } = await supabase
        .from('activity_logs')
        .insert(logEntries)

      if (error) {
        console.error('Error logging batch activities:', error)
      }
    } catch (error) {
      console.error('Batch activity logging error:', error)
    }
  },

  // Get current user info for logging
  async getCurrentUserInfo() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return {}

      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name, role')
        .eq('id', user.id)
        .single()

      return {
        user_id: user.id,
        user_email: profile?.email || user.email,
        user_name: profile?.full_name || 'Unknown',
        user_role: profile?.role || 'unknown'
      }
    } catch (error) {
      console.error('Get current user info error:', error)
      return {}
    }
  }
}