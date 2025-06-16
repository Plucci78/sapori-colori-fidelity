import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://jexkalekaofsfcusdfjh.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGthbGVrYW9mc2ZjdXNkZmpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYyNjEzNCwiZXhwIjoyMDY0MjAyMTM0fQ.43plaZecrTvbwkr7U7g2Ucogkd0VgKRUg9VkJ--7JCU'
)

console.log('🔍 VERIFICA STRUTTURA TABELLA PRIZES')
console.log('=====================================')

try {
  // Verifica struttura tabella prizes
  const { data: prizes, error } = await supabase
    .from('prizes')
    .select('*')
    .limit(5)

  if (error) {
    console.log('❌ Errore:', error.message)
    console.log('   Codice:', error.code)
  } else {
    console.log('✅ Tabella prizes accessibile')
    console.log('Numero premi:', prizes.length)
    
    if (prizes.length > 0) {
      console.log('\n📋 COLONNE DISPONIBILI:')
      Object.keys(prizes[0]).forEach(col => {
        console.log('  -', col)
      })
      
      console.log('\n🏆 PRIMI PREMI:')
      prizes.forEach(prize => {
        const levelReq = prize.level_required || 'nessuno'
        console.log(`  ${prize.name}: costo=${prize.points_cost}, livello=${levelReq}`)
      })
      
      // Verifica premi con livelli
      const prizesWithLevels = prizes.filter(p => p.level_required)
      console.log(`\n✅ Premi con requisiti di livello: ${prizesWithLevels.length}/${prizes.length}`)
    }
  }
  
  // Verifica anche la tabella customers
  console.log('\n🔍 VERIFICA STRUTTURA TABELLA CUSTOMERS')
  console.log('=====================================')
  
  const { data: customers, error: custError } = await supabase
    .from('customers')
    .select('*')
    .limit(2)

  if (custError) {
    console.log('❌ Errore customers:', custError.message)
  } else {
    console.log('✅ Tabella customers accessibile')
    if (customers.length > 0) {
      console.log('\n📋 COLONNE CUSTOMERS:')
      Object.keys(customers[0]).forEach(col => {
        console.log('  -', col)
      })
    }
  }

} catch (error) {
  console.error('❌ Errore generale:', error.message)
}

process.exit(0)
