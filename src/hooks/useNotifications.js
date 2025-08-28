import { useState, useCallback } from 'react'

// Hook per gestire il sistema di notifiche
export const useNotifications = () => {
  const [notifications, setNotifications] = useState([])
  const [settings, setSettings] = useState({
    soundEnabled: true,
    volume: 0.5,
    vipEnabled: true,
    levelEnabled: true,
    milestoneEnabled: true,
    birthdayEnabled: true
  })

  // Genera ID unico per notifica
  const generateId = () => `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Aggiungi notifica
  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: generateId(),
      timestamp: new Date(),
      ...notification
    }
    
    setNotifications(prev => [...prev, newNotification])
    
    // Log per debug
    console.log('📢 Nuova notifica:', newNotification)
    
    return newNotification.id
  }, [])

  // Rimuovi notifica
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  // Pulisci tutte le notifiche
  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  // Notifica VIP
  const notifyVIPEntry = useCallback((customer, currentLevel) => {
    if (!settings.vipEnabled) return
    
    return addNotification({
      type: 'vip',
      title: 'Cliente VIP Entrato!',
      message: `${customer.name} (${customer.points} GEMME) è nel negozio`,
      customer: customer,
      level: currentLevel,
      priority: 'high'
    })
  }, [addNotification, settings.vipEnabled])

  // Notifica nuovo livello
  const notifyLevelUp = useCallback((customer, newLevel, oldLevel) => {
    if (!settings.levelEnabled) return
    
    return addNotification({
      type: 'level',
      title: 'Nuovo Livello Raggiunto!',
      message: `${customer.name} è passato da ${oldLevel?.name || 'Bronzo'} a ${newLevel.name}!`,
      customer: customer,
      level: newLevel,
      priority: 'high'
    })
  }, [addNotification, settings.levelEnabled])

  // Notifica milestone
  const notifyMilestone = useCallback((customer, milestone) => {
    if (!settings.milestoneEnabled) return
    
    return addNotification({
      type: 'milestone',
      title: 'Milestone Raggiunta!',
      message: `${customer.name} ha raggiunto ${milestone} GEMME!`,
      customer: customer,
      priority: 'medium'
    })
  }, [addNotification, settings.milestoneEnabled])

  // Notifica compleanno
  const notifyBirthday = useCallback((customer, options = {}) => {
    console.log('🎂 notifyBirthday chiamata per:', customer.name, 'birthdayEnabled:', settings.birthdayEnabled, 'options:', options)
    if (!settings.birthdayEnabled) {
      console.log('❌ Notifiche compleanno disabilitate!')
      return
    }
    
    console.log('🎉 Creazione notifica compleanno per:', customer.name)
    return addNotification({
      type: 'birthday',
      title: 'Compleanno Oggi!',
      message: `È il compleanno di ${customer.name}! 🎉`,
      customer: customer,
      priority: 'medium',
      skipEmail: options.skipEmail || false // Passa l'opzione skipEmail alla notifica
    })
  }, [addNotification, settings.birthdayEnabled])

  // Aggiorna impostazioni
  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }, [])

  // Statistiche notifiche
  const getNotificationStats = useCallback(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    const todayNotifications = notifications.filter(n => 
      new Date(n.timestamp) >= today
    )
    
    return {
      total: notifications.length,
      today: todayNotifications.length,
      byType: {
        vip: notifications.filter(n => n.type === 'vip').length,
        level: notifications.filter(n => n.type === 'level').length,
        milestone: notifications.filter(n => n.type === 'milestone').length,
        birthday: notifications.filter(n => n.type === 'birthday').length
      }
    }
  }, [notifications])

  return {
    notifications,
    settings,
    addNotification,
    removeNotification,
    clearAllNotifications,
    notifyVIPEntry,
    notifyLevelUp,
    notifyMilestone,
    notifyBirthday,
    updateSettings,
    getNotificationStats
  }
}