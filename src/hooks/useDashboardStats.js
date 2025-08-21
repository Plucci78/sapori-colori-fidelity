import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export const useDashboardStats = () => {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalGemmes: 0,
    activeGiftCards: 0,
    giftCardsValue: 0,
    monthlyGrowth: 0,
    todayNewCustomers: 0,
    todayGemmes: 0,
    todayEmails: 0,
    loading: true,
    error: null
  })

  const fetchDashboardStats = async () => {
    try {
      setStats(prev => ({ ...prev, loading: true, error: null }))

      // Fetch total customers
      const { count: totalCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })

      // Fetch total GEMME points
      const { data: gemmeData } = await supabase
        .from('customers')
        .select('punti_gemme')
      
      const totalGemmes = gemmeData?.reduce((sum, customer) => sum + (customer.punti_gemme || 0), 0) || 0

      // Fetch active gift cards
      const { data: giftCardStats } = await supabase
        .from('gift_card_stats')
        .select('*')
        .single()

      // Calculate monthly growth (customers created in the last 30 days vs previous 30 days)
      const today = new Date()
      const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000))
      const sixtyDaysAgo = new Date(today.getTime() - (60 * 24 * 60 * 60 * 1000))

      const { count: recentCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString())

      const { count: previousCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sixtyDaysAgo.toISOString())
        .lt('created_at', thirtyDaysAgo.toISOString())

      const monthlyGrowth = previousCustomers > 0 
        ? ((recentCustomers - previousCustomers) / previousCustomers * 100)
        : 0

      // Fetch today's stats
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      
      const { count: todayNewCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString())

      // Estimate today's GEMME (could be from transactions table if available)
      const estimatedTodayGemmes = Math.floor(todayNewCustomers * 28.3) // Average GEMME per new customer

      // Estimate today's emails (welcome emails + birthday emails)
      const estimatedTodayEmails = Math.floor(todayNewCustomers * 1.2) // New customer emails + some birthday emails

      // DEBUG: Log per capire cosa sta succedendo
      console.log('📊 Dashboard Stats DEBUG:', {
        totalCustomers,
        todayNewCustomers,
        todayStart: todayStart.toISOString(),
        giftCardStats,
        monthlyGrowth
      })

      setStats({
        totalCustomers: totalCustomers || 0,
        totalGemmes,
        activeGiftCards: giftCardStats?.active_cards || 0,
        giftCardsValue: giftCardStats?.total_balance_remaining || 0,
        monthlyGrowth,
        todayNewCustomers: todayNewCustomers || 0,
        todayGemmes: estimatedTodayGemmes,
        todayEmails: estimatedTodayEmails,
        loading: false,
        error: null
      })

    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      setStats(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }))
    }
  }

  useEffect(() => {
    fetchDashboardStats()
    
    // Refresh stats every 5 minutes
    const interval = setInterval(fetchDashboardStats, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  return { ...stats, refetch: fetchDashboardStats }
}