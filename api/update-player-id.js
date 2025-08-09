// API Route per aggiornare Player ID OneSignal
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { customerId, newPlayerId } = req.body

    if (!customerId || !newPlayerId) {
      return res.status(400).json({ 
        error: 'Missing customerId or newPlayerId' 
      })
    }

    const { createClient } = await import('@supabase/supabase-js')
    
    const supabase = createClient(
      'https://jexkalekaofsfcusdfjh.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGthbGVrYW9mc2ZjdXNkZmpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYyNjEzNCwiZXhwIjoyMDY0MjAyMTM0fQ.43plaZecrTvbwkr7U7g2Ucogkd0VgKRUg9VkJ--7JCU'
    )

    console.log(`🔧 Aggiornando Player ID per cliente ${customerId} con nuovo ID: ${newPlayerId}`)

    // Aggiorna Player ID nel database
    const { data, error } = await supabase
      .from('customers')
      .update({ onesignal_player_id: newPlayerId })
      .eq('id', customerId)
      .select('name, onesignal_player_id')

    if (error) {
      console.error('❌ Errore database:', error)
      return res.status(500).json({ error: error.message })
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Cliente non trovato' })
    }

    console.log('✅ Player ID aggiornato:', data[0])
    
    return res.status(200).json({ 
      success: true,
      message: `Player ID aggiornato per ${data[0].name}`,
      data: data[0]
    })

  } catch (error) {
    console.error('❌ Errore server:', error)
    return res.status(500).json({ error: 'Errore interno del server' })
  }
}