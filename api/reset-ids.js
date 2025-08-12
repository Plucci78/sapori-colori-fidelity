import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://jexkalekaofsfcusdfjh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGthbGVrYW9mc2ZjdXNkZmpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYyNjEzNCwiZXhwIjoyMDY0MjAyMTM0fQ.43plaZecrTvbwkr7U7g2Ucogkd0VgKRUg9VkJ--7JCU'
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { type } = req.body // 'onesignal', 'players', or 'all'
  
  try {
    let updateData = {}
    let message = ''
    
    switch (type) {
      case 'onesignal':
        updateData = { 
          onesignal_player_id: null,
          onesignal_subscription_id: null 
        }
        message = 'OneSignal IDs resettati'
        break
        
      case 'players':
        updateData = { onesignal_player_id: null }
        message = 'Player IDs resettati'
        break
        
      case 'all':
      default:
        updateData = { 
          onesignal_player_id: null,
          onesignal_subscription_id: null 
        }
        message = 'Tutti gli IDs resettati'
        break
    }
    
    console.log(`🧹 Avvio reset ${type}...`)
    
    // Reset nella tabella customers
    const { data: resetData, error: resetError } = await supabase
      .from('customers')
      .update(updateData)
      .or('onesignal_player_id.not.is.null,onesignal_subscription_id.not.is.null')
      .select()
    
    if (resetError) {
      throw new Error(`Errore reset customers: ${resetError.message}`)
    }
    
    console.log(`🧹 Reset completato per ${resetData?.length || 0} clienti`)
    
    // Se reset OneSignal, pulisci anche la tabella subscriptions
    if (type === 'onesignal' || type === 'all') {
      const { error: deleteError } = await supabase
        .from('onesignal_subscriptions')
        .delete()
        .neq('id', 'impossibile_match')
      
      if (deleteError && !deleteError.message.includes('does not exist')) {
        console.warn('⚠️ Errore pulizia subscriptions:', deleteError.message)
      }
    }
    
    // Conta risultati finali
    const { data: finalCount } = await supabase
      .from('customers')
      .select('id')
      .eq('is_active', true)
      .or('onesignal_player_id.not.is.null,onesignal_subscription_id.not.is.null')
    
    res.json({
      success: true,
      message: `✅ ${message}: ${resetData?.length || 0} clienti aggiornati`,
      details: {
        resetCount: resetData?.length || 0,
        remainingWithIds: finalCount?.length || 0,
        type
      }
    })
    
  } catch (error) {
    console.error('❌ Errore reset:', error)
    res.status(500).json({ 
      error: error.message,
      success: false
    })
  }
}