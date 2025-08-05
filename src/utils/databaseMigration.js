import { supabase } from '../supabase'

// Script per aggiungere colonne mancanti alla tabella customers
export const addMissingColumns = async () => {
  const migrations = []

  try {
    console.log('🔧 === INIZIO MIGRAZIONE DATABASE ===')
    
    // 1. Aggiunge colonna avatar_url
    console.log('📸 Aggiungendo colonna avatar_url...')
    try {
      const { error: avatarError } = await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE customers 
          ADD COLUMN IF NOT EXISTS avatar_url TEXT;
          
          COMMENT ON COLUMN customers.avatar_url IS 'URL dell''immagine profilo del cliente';
        `
      })
      
      if (avatarError) {
        console.error('❌ Errore aggiunta avatar_url:', avatarError)
        migrations.push({ column: 'avatar_url', success: false, error: avatarError.message })
      } else {
        console.log('✅ Colonna avatar_url aggiunta con successo')
        migrations.push({ column: 'avatar_url', success: true })
      }
    } catch (error) {
      console.error('❌ Errore aggiunta avatar_url:', error)
      migrations.push({ column: 'avatar_url', success: false, error: error.message })
    }

    // 2. Aggiunge colonna onesignal_player_id
    console.log('🔔 Aggiungendo colonna onesignal_player_id...')
    try {
      const { error: onesignalError } = await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE customers 
          ADD COLUMN IF NOT EXISTS onesignal_player_id TEXT;
          
          COMMENT ON COLUMN customers.onesignal_player_id IS 'ID player OneSignal per le notifiche push';
        `
      })
      
      if (onesignalError) {
        console.error('❌ Errore aggiunta onesignal_player_id:', onesignalError)
        migrations.push({ column: 'onesignal_player_id', success: false, error: onesignalError.message })
      } else {
        console.log('✅ Colonna onesignal_player_id aggiunta con successo')
        migrations.push({ column: 'onesignal_player_id', success: true })
      }
    } catch (error) {
      console.error('❌ Errore aggiunta onesignal_player_id:', error)
      migrations.push({ column: 'onesignal_player_id', success: false, error: error.message })
    }

    console.log('🔧 === MIGRAZIONE COMPLETATA ===')
    
    // Riepilogo
    console.log('📋 Riepilogo migrazioni:')
    migrations.forEach(migration => {
      console.log(`  ${migration.success ? '✅' : '❌'} ${migration.column}${migration.error ? ` - ${migration.error}` : ''}`)
    })

    const allSuccess = migrations.every(m => m.success)
    console.log(`\n🎯 Risultato: ${allSuccess ? '✅ TUTTE LE MIGRAZIONI RIUSCITE' : '❌ ALCUNE MIGRAZIONI FALLITE'}`)

    return {
      success: allSuccess,
      migrations
    }

  } catch (error) {
    console.error('❌ Errore generale durante la migrazione:', error)
    return {
      success: false,
      error: error.message,
      migrations
    }
  }
}

// Migrazione alternativa tramite SQL diretto (se RPC non funziona)
export const addMissingColumnsAlternative = async () => {
  console.log('🔧 === MIGRAZIONE ALTERNATIVA ===')
  
  const results = {
    avatar_url: false,
    onesignal_player_id: false
  }

  // Test per avatar_url
  try {
    console.log('📸 Testando colonna avatar_url...')
    const { data, error } = await supabase
      .from('customers')
      .update({ avatar_url: null })
      .eq('id', 'test-nonexistent-id')
    
    if (error && error.message.includes('column "avatar_url" does not exist')) {
      console.log('❌ Colonna avatar_url non esiste - deve essere aggiunta manualmente')
      results.avatar_url = false
    } else {
      console.log('✅ Colonna avatar_url già presente')
      results.avatar_url = true
    }
  } catch (error) {
    console.log('⚠️ Test avatar_url non conclusivo:', error.message)
  }

  // Test per onesignal_player_id
  try {
    console.log('🔔 Testando colonna onesignal_player_id...')
    const { data, error } = await supabase
      .from('customers')
      .update({ onesignal_player_id: null })
      .eq('id', 'test-nonexistent-id')
    
    if (error && error.message.includes('column "onesignal_player_id" does not exist')) {
      console.log('❌ Colonna onesignal_player_id non esiste - deve essere aggiunta manualmente')
      results.onesignal_player_id = false
    } else {
      console.log('✅ Colonna onesignal_player_id già presente')
      results.onesignal_player_id = true
    }
  } catch (error) {
    console.log('⚠️ Test onesignal_player_id non conclusivo:', error.message)
  }

  return results
}

// Genera SQL per aggiunta manuale delle colonne
export const generateMigrationSQL = () => {
  const sql = `
-- Migrazione database per sistema upload immagini e notifiche
-- Eseguire nel pannello SQL di Supabase

-- 1. Aggiunge colonna per URL avatar cliente
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN customers.avatar_url IS 'URL dell''immagine profilo del cliente';

-- 2. Aggiunge colonna per OneSignal Player ID  
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS onesignal_player_id TEXT;

COMMENT ON COLUMN customers.onesignal_player_id IS 'ID player OneSignal per le notifiche push';

-- 3. Verifica colonne aggiunte
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'customers' 
  AND column_name IN ('avatar_url', 'onesignal_player_id')
ORDER BY column_name;
  `.trim()

  console.log('📝 === SQL PER MIGRAZIONE MANUALE ===')
  console.log(sql)
  console.log('📝 === FINE SQL ===')

  return sql
}

// Verifica se le migrazioni sono necessarie
export const checkMigrationsNeeded = async () => {
  console.log('🔍 Verificando se sono necessarie migrazioni...')
  
  const checks = {
    avatar_url: false,
    onesignal_player_id: false
  }

  // Controlla avatar_url
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('avatar_url')
      .limit(1)
    
    checks.avatar_url = !error
  } catch (error) {
    checks.avatar_url = false
  }

  // Controlla onesignal_player_id
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('onesignal_player_id')
      .limit(1)
    
    checks.onesignal_player_id = !error
  } catch (error) {
    checks.onesignal_player_id = false
  }

  const migrationsNeeded = Object.entries(checks).filter(([key, exists]) => !exists)
  
  console.log('📋 Stato colonne:')
  Object.entries(checks).forEach(([column, exists]) => {
    console.log(`  ${exists ? '✅' : '❌'} ${column}`)
  })

  if (migrationsNeeded.length > 0) {
    console.log('\n🛠️ Migrazioni necessarie:')
    migrationsNeeded.forEach(([column]) => {
      console.log(`  - Aggiungere colonna ${column}`)
    })
  } else {
    console.log('\n✅ Nessuna migrazione necessaria - database già aggiornato!')
  }

  return {
    checks,
    migrationsNeeded: migrationsNeeded.map(([column]) => column),
    isUpToDate: migrationsNeeded.length === 0
  }
}