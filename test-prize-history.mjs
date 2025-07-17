// Test rapido per verificare se storico premi funziona
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jexkalekaofsfcusdfjh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGthbGVrYW9mc2ZjdXNkZmpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYyNjEzNCwiZXhwIjoyMDY0MjAyMTM0fQ.43plaZecrTvbwkr7U7g2Ucogkd0VgKRUg9VkJ--7JCU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testPrizeHistory() {
  console.log('🧪 Test storico premi...')
  
  try {
    // Cerca premi riscattati
    const { data: prizeActivities, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('action', 'PRIZE_REDEEMED')
      .limit(5)
    
    if (error) {
      console.log('❌ Errore:', error.message)
    } else {
      console.log(`📊 Premi riscattati trovati: ${prizeActivities?.length || 0}`)
      
      if (prizeActivities && prizeActivities.length > 0) {
        prizeActivities.forEach((prize, i) => {
          const details = JSON.parse(prize.details || '{}')
          console.log(`${i+1}. ${details.prize_name || 'Premio'} - ${details.customer_name || 'Cliente'} - ${new Date(prize.timestamp).toLocaleDateString('it-IT')}`)
        })
      } else {
        console.log('📭 Nessun premio ancora riscattato - questo è normale se hai svuotato il database')
      }
    }
    
    // Controlla anche se ci sono clienti
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name')
      .limit(3)
    
    console.log(`👥 Clienti disponibili: ${customers?.length || 0}`)
    customers?.forEach(c => console.log(`   - ${c.name} (${c.id})`))
    
  } catch (err) {
    console.error('❌ Errore generale:', err.message)
  }
}

testPrizeHistory()
