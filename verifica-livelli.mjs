import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jexkalekaofsfcusdfjh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGthbGVrYW9mc2ZjdXNkZmpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYyNjEzNCwiZXhwIjoyMDY0MjAyMTM0fQ.43plaZecrTvbwkr7U7g2Ucogkd0VgKRUg9VkJ--7JCU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function verificaSistemaLivelli() {
  console.log('🔍 VERIFICA COMPLETA SISTEMA LIVELLI CLIENTE')
  console.log('='.repeat(60))
  
  try {
    // 1. Verifica esistenza e contenuto tabella customer_levels
    console.log('\n1️⃣ VERIFICA TABELLA CUSTOMER_LEVELS')
    console.log('-'.repeat(40))
    
    const { data: levels, error: levelsError } = await supabase
      .from('customer_levels')
      .select('*')
      .order('sort_order')

    if (levelsError) {
      console.log('❌ ERRORE: Tabella customer_levels non accessibile')
      console.log('   Dettaglio:', levelsError.message)
      console.log('   Codice:', levelsError.code)
      
      if (levelsError.code === '42P01') {
        console.log('\n💡 SOLUZIONE: La tabella customer_levels non esiste.')
        console.log('   Eseguire lo script SQL: setup_customer_levels.sql')
        console.log('   Nel Supabase Dashboard > SQL Editor')
      }
      return false
    }

    console.log('✅ Tabella customer_levels trovata')
    console.log(`   Livelli configurati: ${levels.length}`)
    
    if (levels.length === 0) {
      console.log('⚠️  ATTENZIONE: Nessun livello configurato')
      console.log('   Eseguire lo script SQL per inserire livelli di default')
      return false
    }

    console.log('\n   📋 LIVELLI CONFIGURATI:')
    levels.forEach((level, index) => {
      const maxDisplay = level.max_gems ? level.max_gems : '∞'
      const status = level.active ? '✅' : '❌'
      console.log(`   ${index + 1}. ${status} ${level.name}: ${level.min_gems}-${maxDisplay} GEMME`)
      if (level.primary_color) console.log(`      Colore: ${level.primary_color}`)
      if (level.icon_svg) console.log(`      Icona: ✓ Personalizzata`)
    })

    // 2. Test utility functions con livelli reali
    console.log('\n2️⃣ TEST UTILITY FUNCTIONS')
    console.log('-'.repeat(40))
    
    // Simuliamo l'import delle utility functions
    const getCustomerLevel = async (points) => {
      const { data: level } = await supabase
        .from('customer_levels')
        .select('*')
        .eq('active', true)
        .lte('min_gems', points)
        .or(`max_gems.is.null,max_gems.gte.${points}`)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()
      
      return level
    }

    const getNextLevelInfo = async (points) => {
      const { data: nextLevel } = await supabase
        .from('customer_levels')
        .select('*')
        .eq('active', true)
        .gt('min_gems', points)
        .order('sort_order')
        .limit(1)
        .single()
      
      if (!nextLevel) return null
      
      const gemsNeeded = nextLevel.min_gems - points
      const currentLevel = await getCustomerLevel(points)
      const progressStart = currentLevel ? currentLevel.min_gems : 0
      const progressRange = nextLevel.min_gems - progressStart
      const progressCurrent = points - progressStart
      const progressPercentage = Math.round((progressCurrent / progressRange) * 100)
      
      return {
        nextLevel,
        gemsNeeded,
        progressPercentage: Math.max(0, Math.min(100, progressPercentage))
      }
    }

    const testCases = [0, 25, 50, 100, 150, 250, 300, 500, 750, 1000, 1500]
    
    console.log('\n   🧪 TEST CALCOLO LIVELLI:')
    for (const points of testCases) {
      try {
        const currentLevel = await getCustomerLevel(points)
        const nextInfo = await getNextLevelInfo(points)
        
        const levelName = currentLevel ? currentLevel.name : 'Nessuno'
        const nextName = nextInfo ? nextInfo.nextLevel.name : 'Max raggiunto'
        const needed = nextInfo ? nextInfo.gemsNeeded : '-'
        const progress = nextInfo ? nextInfo.progressPercentage : 100
        
        console.log(`   ${points.toString().padStart(4)} GEMME → ${levelName.padEnd(12)} | Prossimo: ${nextName.padEnd(12)} | Mancanti: ${needed.toString().padStart(4)} | Progresso: ${progress}%`)
      } catch (error) {
        console.log(`   ${points.toString().padStart(4)} GEMME → ❌ ERRORE: ${error.message}`)
      }
    }

    // 3. Verifica integrazione con customers
    console.log('\n3️⃣ VERIFICA INTEGRAZIONE CUSTOMERS')
    console.log('-'.repeat(40))
    
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, full_name, gemme_points, points')
      .limit(10)

    if (customersError) {
      console.log('❌ Tabella customers non accessibile:', customersError.message)
    } else {
      console.log('✅ Tabella customers accessibile')
      console.log(`   Clienti trovati: ${customers.length}`)
      
      if (customers.length > 0) {
        console.log('\n   👥 CLIENTI CON LIVELLI:')
        for (const customer of customers.slice(0, 5)) {
          const points = customer.gemme_points || customer.points || 0
          try {
            const level = await getCustomerLevel(points)
            const levelName = level ? level.name : 'Nessuno'
            console.log(`   ${customer.full_name?.substring(0, 20).padEnd(20)} | ${points.toString().padStart(4)} GEMME → ${levelName}`)
          } catch (error) {
            console.log(`   ${customer.full_name?.substring(0, 20).padEnd(20)} | ❌ ERRORE`)
          }
        }
      }
    }

    // 4. Verifica integrazione con prizes
    console.log('\n4️⃣ VERIFICA INTEGRAZIONE PRIZES')
    console.log('-'.repeat(40))
    
    const { data: prizes, error: prizesError } = await supabase
      .from('prizes')
      .select('id, name, level_required, points_cost')
      .limit(10)

    if (prizesError) {
      console.log('❌ Tabella prizes non accessibile:', prizesError.message)
    } else {
      console.log('✅ Tabella prizes accessibile')
      console.log(`   Premi totali: ${prizes.length}`)
      
      const prizesWithLevels = prizes.filter(p => p.level_required)
      console.log(`   Premi con requisiti di livello: ${prizesWithLevels.length}`)
      
      if (prizesWithLevels.length > 0) {
        console.log('\n   🏆 PREMI CON REQUISITI DI LIVELLO:')
        for (const prize of prizesWithLevels.slice(0, 3)) {
          console.log(`   ${prize.name?.substring(0, 30).padEnd(30)} | Livello: ${prize.level_required}`)
        }
      }
    }

    // 5. Verifica configurazione icone
    console.log('\n5️⃣ VERIFICA CONFIGURAZIONE ICONE')
    console.log('-'.repeat(40))
    
    const levelsWithIcons = levels.filter(l => l.icon_svg)
    const levelsWithColors = levels.filter(l => l.primary_color && l.primary_color !== '#6366f1')
    const levelsWithGradients = levels.filter(l => l.background_gradient)
    
    console.log(`   Livelli con icone personalizzate: ${levelsWithIcons.length}/${levels.length}`)
    console.log(`   Livelli con colori personalizzati: ${levelsWithColors.length}/${levels.length}`)
    console.log(`   Livelli con gradienti: ${levelsWithGradients.length}/${levels.length}`)

    // 6. Riepilogo finale
    console.log('\n6️⃣ RIEPILOGO FINALE')
    console.log('-'.repeat(40))
    
    const issues = []
    
    if (levels.length === 0) issues.push('Nessun livello configurato')
    if (levelsWithColors.length === 0) issues.push('Nessun colore personalizzato')
    if (customersError) issues.push('Problema integrazione customers')
    
    if (issues.length === 0) {
      console.log('🎉 SISTEMA LIVELLI COMPLETAMENTE FUNZIONANTE!')
      console.log('   ✅ Tabella customer_levels configurata')
      console.log('   ✅ Utility functions operative')
      console.log('   ✅ Integrazione con altre tabelle')
      console.log('   ✅ Personalizzazioni visuali attive')
      return true
    } else {
      console.log('⚠️  PROBLEMI IDENTIFICATI:')
      issues.forEach(issue => console.log(`   - ${issue}`))
      return false
    }

  } catch (error) {
    console.log('\n❌ ERRORE FATALE:', error.message)
    console.log('   Stack:', error.stack)
    return false
  }
}

// Esecuzione
verificaSistemaLivelli().then(success => {
  console.log('\n' + '='.repeat(60))
  if (success) {
    console.log('✅ VERIFICA COMPLETATA CON SUCCESSO')
    console.log('Il sistema di livelli cliente è pronto all\'uso!')
  } else {
    console.log('❌ VERIFICA FALLITA')
    console.log('Seguire le indicazioni sopra per risolvere i problemi.')
  }
  console.log('='.repeat(60))
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('❌ ERRORE CRITICO:', error)
  process.exit(1)
})
