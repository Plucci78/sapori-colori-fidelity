// Script semplice per controllare activity_logs
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jexkalekaofsfcusdfjh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGthbGVrYW9mc2ZjdXNkZmpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYyNjEzNCwiZXhwIjoyMDY0MjAyMTM0fQ.43plaZecrTvbwkr7U7g2Ucogkd0VgKRUg9VkJ--7JCU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function quickCheck() {
  console.log('🔍 Controllo rapido activity_logs...')
  
  try {
    const { data, error, count } = await supabase
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .limit(3)

    if (error) {
      console.log('❌ Errore:', error.message)
    } else {
      console.log(`📊 Record totali: ${count}`)
      console.log(`� Record mostrati: ${data?.length || 0}`)
      
      if (data && data.length > 0) {
        data.forEach((item, i) => {
          console.log(`${i+1}. ${item.action} - ${item.user_name} - ${new Date(item.timestamp).toLocaleString('it-IT')}`)
        })
      }
    }
  } catch (err) {
    console.error('❌ Errore:', err.message)
  }
  
  // Prova anche customers
  try {
    const { data: customers, error: custError } = await supabase
      .from('customers')
      .select('name, email, created_at')
      .limit(3)
    
    if (!custError) {
      console.log(`\n� Clienti: ${customers?.length || 0}`)
      customers?.forEach(c => console.log(`   - ${c.name} (${c.email})`))
    }
  } catch (err) {
    console.log('❌ Errore customers:', err.message)
  }
}

quickCheck()
