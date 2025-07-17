// Script per svuotare completamente activity_logs
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jexkalekaofsfcusdfjh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGthbGVrYW9mc2ZjdXNkZmpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYyNjEzNCwiZXhwIjoyMDY0MjAyMTM0fQ.43plaZecrTvbwkr7U7g2Ucogkd0VgKRUg9VkJ--7JCU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function clearActivityLogs() {
  console.log('🗑️ Svuotando la tabella activity_logs...')
  
  try {
    // Prima controlla quanti record ci sono
    const { count: beforeCount } = await supabase
      .from('activity_logs')
      .select('*', { count: 'exact', head: true })
    
    console.log(`📊 Record attuali: ${beforeCount}`)
    
    if (beforeCount === 0) {
      console.log('✅ La tabella è già vuota!')
      return
    }
    
    // Svuota la tabella
    const { error } = await supabase
      .from('activity_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Elimina tutti i record
    
    if (error) {
      console.log('❌ Errore durante lo svuotamento:', error.message)
      return
    }
    
    // Verifica che sia vuota
    const { count: afterCount } = await supabase
      .from('activity_logs')
      .select('*', { count: 'exact', head: true })
    
    console.log(`✅ COMPLETATO! Record rimanenti: ${afterCount}`)
    
    if (afterCount === 0) {
      console.log('🎉 Tabella activity_logs completamente svuotata!')
      console.log('💡 Ora la dashboard mostrerà "Nessuna attività recente" fino a nuove azioni')
    } else {
      console.log(`⚠️ Attenzione: rimangono ancora ${afterCount} record`)
    }
    
  } catch (err) {
    console.error('❌ Errore generale:', err.message)
  }
}

clearActivityLogs()
