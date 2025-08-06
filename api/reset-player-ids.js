// API Route per resettare tutti i Player ID OneSignal
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { createClient } = await import('@supabase/supabase-js')
    
    const supabase = createClient(
      'https://jexkalekaofsfcusdfjh.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGthbGVrYW9mc2ZjdXNkZmpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYyNjEzNCwiZXhwIjoyMDY0MjAyMTM0fQ.43plaZecrTvbwkr7U7g2Ucogkd0VgKRUg9VkJ--7JCU'
    )

    console.log('🔧 Resetting tutti i Player IDs...')

    // Reset tutti i player IDs a null
    const { data, error } = await supabase
      .from('customers')
      .update({ onesignal_player_id: null })
      .not('onesignal_player_id', 'is', null)

    if (error) {
      console.error('❌ Errore reset:', error)
      return res.status(500).json({ error: error.message })
    }

    console.log('✅ Player IDs resettati:', data)
    
    return res.status(200).json({ 
      success: true, 
      message: 'Tutti i Player ID sono stati resettati. Gli utenti dovranno ri-accettare le notifiche.'
    })

  } catch (error) {
    console.error('❌ Errore server reset:', error)
    return res.status(500).json({ error: 'Errore interno del server' })
  }
}