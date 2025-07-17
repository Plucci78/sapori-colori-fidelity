// Script rapido per controllare activity_logs dopo test registrazione
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jexkalekaofsfcusdfjh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGthbGVrYW9mc2ZjdXNkZmpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYyNjEzNCwiZXhwIjoyMDY0MjAyMTM0fQ.43plaZecrTvbwkr7U7g2Ucogkd0VgKRUg9VkJ--7JCU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAfterRegistration() {
  console.log('🔍 Checking activity_logs dopo registrazione...')
  
  try {
    const { data: activities, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(10)
    
    if (error) {
      console.log('❌ Errore:', error)
      return
    }
    
    console.log(`📊 Trovate ${activities?.length || 0} attività`)
    
    if (activities && activities.length > 0) {
      activities.forEach((activity, index) => {
        console.log(`\n${index + 1}. ${activity.action}`)
        console.log(`   USER: ${activity.user_name || activity.user_email || 'N/A'}`)
        console.log(`   TIME: ${new Date(activity.timestamp).toLocaleString('it-IT')}`)
        console.log(`   DETAILS: ${activity.details || 'N/A'}`)
      })
    } else {
      console.log('📭 Database ancora vuoto')
    }
    
    // Controlla anche tabella customers
    const { data: customers, error: custError } = await supabase
      .from('customers')
      .select('name, email, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (!custError && customers) {
      console.log(`\n👥 Clienti nel database: ${customers.length}`)
      customers.forEach(c => console.log(`   - ${c.name} (${c.email})`))
    }
    
  } catch (error) {
    console.error('❌ Errore generale:', error)
  }
}

checkAfterRegistration()
