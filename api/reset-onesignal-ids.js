import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://jexkalekaofsfcusdfjh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGthbGVrYW9mc2ZjdXNkZmpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYyNjEzNCwiZXhwIjoyMDY0MjAyMTM0fQ.43plaZecrTvbwkr7U7g2Ucogkd0VgKRUg9VkJ--7JCU'
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    console.log('🧹 Avvio reset OneSignal IDs...')
    
    // 1. Reset tutti gli OneSignal IDs nella tabella customers
    const { data: resetData, error: resetError } = await supabase
      .from('customers')
      .update({ 
        onesignal_player_id: null,
        onesignal_subscription_id: null 
      })
      .or('onesignal_player_id.not.is.null,onesignal_subscription_id.not.is.null')
      .select()
    
    if (resetError) {
      throw new Error(`Errore reset customers: ${resetError.message}`)
    }
    
    console.log(`🧹 Reset completato per ${resetData?.length || 0} clienti`)
    
    // 2. Pulisci anche la tabella onesignal_subscriptions se esiste
    const { error: deleteError } = await supabase
      .from('onesignal_subscriptions')
      .delete()
      .neq('id', 'impossibile_match') // Cancella tutto
    
    if (deleteError && !deleteError.message.includes('does not exist')) {
      console.warn('⚠️ Errore pulizia tabella subscriptions (potrebbe non esistere):', deleteError.message)
    }
    
    // 3. Conta i risultati finali
    const { data: finalCount, error: countError } = await supabase
      .from('customers')
      .select('id, name, onesignal_player_id, onesignal_subscription_id')
      .eq('is_active', true)
      .or('onesignal_player_id.not.is.null,onesignal_subscription_id.not.is.null')
    
    const remainingWithIds = finalCount?.length || 0
    
    res.json({
      success: true,
      message: `✅ Reset completato: ${resetData?.length || 0} clienti aggiornati, ${remainingWithIds} ancora con IDs`,
      details: {
        resetCount: resetData?.length || 0,
        remainingWithIds,
        subscriptionsCleared: !deleteError
      }
    })
    
  } catch (error) {
    console.error('❌ Errore reset OneSignal IDs:', error)
    res.status(500).json({ 
      error: error.message,
      success: false
    })
  }
}