import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://jexkalekaofsfcusdfjh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGthbGVrYW9mc2ZjdXNkZmpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYyNjEzNCwiZXhwIjoyMDY0MjAyMTM0fQ.43plaZecrTvbwkr7U7g2Ucogkd0VgKRUg9VkJ--7JCU'
)

const ONESIGNAL_APP_ID = 'fec6e3b5-c8e9-4c96-ac42-84cac7f4b5ab'
const ONESIGNAL_API_KEY = 'OTk5NmRmNDEtNTgzMS00ZjE5LWI4M2EtYjc4ODkwYWJjZGE5' // REST API Key

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    console.log('🔄 Avvio sincronizzazione OneSignal subscriptions...')
    
    // Test semplice: restituisci solo i clienti per debug
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, name, email, onesignal_player_id, onesignal_subscription_id')
      .eq('is_active', true)
      .limit(5) // Limita per debug
    
    if (customersError) {
      throw new Error(`Errore caricamento clienti: ${customersError.message}`)
    }
    
    console.log(`📊 Trovati ${customers.length} clienti attivi`)
    
    // Per ora, restituisci solo i dati per debug
    res.json({
      success: true,
      message: `Debug: caricati ${customers.length} clienti`,
      customers: customers.map(c => ({
        name: c.name,
        hasSubscription: !!c.onesignal_subscription_id,
        hasPlayerId: !!c.onesignal_player_id
      })),
      debug: true
    })
    
  } catch (error) {
    console.error('❌ Errore sincronizzazione OneSignal:', error)
    res.status(500).json({ 
      error: error.message,
      success: false
    })
  }
}