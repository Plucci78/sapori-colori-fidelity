// Test script per verificare il sistema di livelli cliente
import { supabase } from './src/supabase.js'
import { getCustomerLevel, getNextLevelInfo } from './src/utils/levelsUtils.js'

async function testLevelsSystem() {
  console.log('🔍 Verifica del sistema di livelli cliente...\n')

  try {
    // 1. Verifica esistenza tabella customer_levels
    console.log('1. Controllo esistenza tabella customer_levels...')
    const { data: levels, error: levelsError } = await supabase
      .from('customer_levels')
      .select('*')
      .order('sort_order')

    if (levelsError) {
      console.error('❌ Errore nella query della tabella customer_levels:', levelsError)
      console.log('La tabella customer_levels potrebbe non esistere ancora.')
      return false
    }

    console.log('✅ Tabella customer_levels trovata!')
    console.log(`   Livelli configurati: ${levels.length}`)
    
    if (levels.length > 0) {
      console.log('   Livelli esistenti:')
      levels.forEach(level => {
        console.log(`   - ${level.name}: ${level.min_gems}-${level.max_gems || '∞'} GEMME`)
      })
    }

    // 2. Test delle utility functions
    console.log('\n2. Test delle utility functions...')
    
    // Test con diversi punteggi
    const testScores = [0, 50, 150, 300, 500, 1000]
    
    for (const score of testScores) {
      console.log(`\n   Test con ${score} GEMME:`)
      
      try {
        const currentLevel = await getCustomerLevel(score)
        console.log(`   - Livello attuale: ${currentLevel ? currentLevel.name : 'Nessuno'}`)
        
        const nextLevelInfo = await getNextLevelInfo(score)
        if (nextLevelInfo) {
          console.log(`   - Prossimo livello: ${nextLevelInfo.nextLevel.name}`)
          console.log(`   - GEMME mancanti: ${nextLevelInfo.gemsNeeded}`)
          console.log(`   - Progresso: ${nextLevelInfo.progressPercentage}%`)
        } else {
          console.log('   - Livello massimo raggiunto!')
        }
      } catch (error) {
        console.error(`   ❌ Errore nel calcolo del livello per ${score} GEMME:`, error)
      }
    }

    // 3. Verifica integrazione con altre tabelle
    console.log('\n3. Verifica integrazione con altre tabelle...')
    
    // Check customers table
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, full_name, gemme_points')
      .limit(5)

    if (customersError) {
      console.error('❌ Errore nella query della tabella customers:', customersError)
    } else {
      console.log('✅ Tabella customers accessibile')
      console.log(`   Clienti trovati: ${customers.length}`)
      
      // Test livello per clienti reali
      if (customers.length > 0) {
        console.log('\n   Test livelli per clienti reali:')
        for (const customer of customers.slice(0, 3)) {
          try {
            const level = await getCustomerLevel(customer.gemme_points || 0)
            console.log(`   - ${customer.full_name}: ${customer.gemme_points || 0} GEMME → ${level ? level.name : 'Nessun livello'}`)
          } catch (error) {
            console.error(`   ❌ Errore per cliente ${customer.full_name}:`, error)
          }
        }
      }
    }

    // 4. Check prizes integration
    const { data: prizes, error: prizesError } = await supabase
      .from('prizes')
      .select('id, name, level_required')
      .limit(5)

    if (prizesError) {
      console.error('❌ Errore nella query della tabella prizes:', prizesError)
    } else {
      console.log('\n✅ Tabella prizes accessibile')
      console.log(`   Premi con requisiti di livello: ${prizes.filter(p => p.level_required).length}`)
    }

    console.log('\n🎉 Test completato con successo!')
    return true

  } catch (error) {
    console.error('❌ Errore generale nel test:', error)
    return false
  }
}

// Funzione per creare la tabella customer_levels se non esiste
async function createCustomerLevelsTable() {
  console.log('🔨 Creazione tabella customer_levels...')
  
  try {
    // Nota: Questa query SQL dovrebbe essere eseguita tramite Supabase Dashboard
    // o tramite uno script di migrazione appropriato
    console.log(`
📋 SQL per creare la tabella customer_levels:

CREATE TABLE IF NOT EXISTS customer_levels (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  min_gems INTEGER NOT NULL DEFAULT 0,
  max_gems INTEGER NULL,
  primary_color VARCHAR(7) NOT NULL DEFAULT '#6366f1',
  background_gradient TEXT NULL,
  icon_svg TEXT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_levels_sort ON customer_levels(sort_order);
CREATE INDEX IF NOT EXISTS idx_customer_levels_active ON customer_levels(active);
CREATE INDEX IF NOT EXISTS idx_customer_levels_gems ON customer_levels(min_gems, max_gems);

-- Livelli di esempio
INSERT INTO customer_levels (name, min_gems, max_gems, primary_color, sort_order) VALUES
  ('Bronzo', 0, 99, '#CD7F32', 1),
  ('Argento', 100, 299, '#C0C0C0', 2),
  ('Oro', 300, 599, '#FFD700', 3),
  ('Platino', 600, NULL, '#E5E4E2', 4)
ON CONFLICT (sort_order) DO NOTHING;
`)

    console.log('⚠️  Esegui questo SQL nel Supabase Dashboard per creare la tabella.')
    
  } catch (error) {
    console.error('❌ Errore nella preparazione dello script SQL:', error)
  }
}

// Esecuzione del test
testLevelsSystem().then(success => {
  if (!success) {
    console.log('\n💡 Se la tabella customer_levels non esiste, eseguire:')
    createCustomerLevelsTable()
  }
}).catch(error => {
  console.error('❌ Errore fatale:', error)
  createCustomerLevelsTable()
})
