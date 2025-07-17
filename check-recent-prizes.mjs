// Controllo DETTAGLI premi riscattati
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jexkalekaofsfcusdfjh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGthbGVrYW9mc2ZjdXNkZmpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYyNjEzNCwiZXhwIjoyMDY0MjAyMTM0fQ.43plaZecrTvbwkr7U7g2Ucogkd0VgKRUg9VkJ--7JCU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function detailedPrizeCheck() {
  console.log('🔍 Controllo DETTAGLI premi...')
  
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('action', 'PRIZE_REDEEMED')
    .order('timestamp', { ascending: false })
    .limit(3)
  
  if (error) {
    console.log('❌', error.message)
  } else {
    console.log(`📊 Premi: ${data?.length || 0}`)
    data?.forEach((p, i) => {
      console.log(`\n${i+1}. PREMIO #${i+1}:`)
      console.log(`   ⏰ Timestamp: ${p.timestamp}`)
      console.log(`   👤 User: ${p.user_name || p.user_email || 'N/A'}`)
      console.log(`   📄 Raw Details: ${p.details}`)
      
      try {
        const details = JSON.parse(p.details || '{}')
        console.log(`   🎁 Prize Name: ${details.prize_name || 'N/A'}`)
        console.log(`   👤 Customer Name: ${details.customer_name || 'N/A'}`)
        console.log(`   🆔 Customer ID: ${details.customer_id || 'N/A'}`)
        console.log(`   💎 Points Cost: ${details.points_cost || 'N/A'}`)
        console.log(`   💰 Amount: ${details.amount || 'N/A'}`)
        console.log(`   📋 All Keys: ${Object.keys(details).join(', ')}`)
      } catch (e) {
        console.log(`   ❌ Parse Error: ${e.message}`)
      }
    })
  }
  
  // Controlla anche un cliente per ID
  const { data: customers } = await supabase
    .from('customers')
    .select('id, name')
    .limit(1)
  
  if (customers?.[0]) {
    console.log(`\n🔍 Test filtro per cliente: ${customers[0].name} (${customers[0].id})`)
  }
}

detailedPrizeCheck()
