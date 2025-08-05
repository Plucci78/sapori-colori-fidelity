import { supabase } from '../supabase'

// Funzione per verificare se una colonna esiste in una tabella
export const checkColumnExists = async (tableName, columnName) => {
  try {
    console.log(`🔍 Verificando se la colonna '${columnName}' esiste nella tabella '${tableName}'...`)
    
    // Prova a fare una query che include la colonna
    const { data, error } = await supabase
      .from(tableName)
      .select(columnName)
      .limit(1)
    
    if (error) {
      // Se l'errore contiene "column does not exist", la colonna non esiste
      if (error.message?.includes('column') && error.message?.includes('does not exist')) {
        console.log(`❌ Colonna '${columnName}' NON esiste nella tabella '${tableName}'`)
        return false
      }
      // Altri errori potrebbero essere dovuti a permessi, ecc.
      console.log(`⚠️ Errore durante la verifica:`, error.message)
      return false
    }
    
    console.log(`✅ Colonna '${columnName}' esiste nella tabella '${tableName}'`)
    return true
  } catch (error) {
    console.error(`❌ Errore durante la verifica della colonna:`, error)
    return false
  }
}

// Funzione per verificare la struttura della tabella customers
export const checkCustomersTable = async () => {
  try {
    console.log('🔍 Verificando struttura tabella customers...')
    
    // Lista delle colonne che dovrebbero esistere per il sistema completo
    const requiredColumns = [
      'avatar_url',
      'onesignal_player_id',
      'wallet_balance',
      'referral_code'
    ]
    
    const results = {}
    
    for (const column of requiredColumns) {
      results[column] = await checkColumnExists('customers', column)
    }
    
    console.log('📋 Risultati verifica colonne:')
    Object.entries(results).forEach(([column, exists]) => {
      console.log(`  ${exists ? '✅' : '❌'} ${column}`)
    })
    
    return results
  } catch (error) {
    console.error('❌ Errore durante la verifica della tabella:', error)
    return {}
  }
}

// Funzione per ottenere un esempio di record dalla tabella customers
export const getCustomerSample = async () => {
  try {
    console.log('🔍 Ottenendo esempio di record dalla tabella customers...')
    
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('❌ Errore durante il recupero del record:', error)
      return null
    }
    
    if (data && data.length > 0) {
      console.log('📄 Struttura record customers:')
      const customer = data[0]
      Object.keys(customer).forEach(key => {
        console.log(`  ${key}: ${typeof customer[key]} ${customer[key] !== null ? '(valorizzato)' : '(null)'}`)
      })
      return customer
    } else {
      console.log('⚠️ Nessun record trovato nella tabella customers')
      return null
    }
  } catch (error) {
    console.error('❌ Errore durante il recupero del record:', error)
    return null
  }
}

// Funzione per verificare l'esistenza e configurazione del bucket storage
export const checkStorageBucket = async (bucketName = 'customer-avatars') => {
  try {
    console.log(`🪣 Verificando bucket storage '${bucketName}'...`)
    
    // Lista tutti i bucket
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Errore durante la lista dei bucket:', listError)
      return false
    }
    
    const bucket = buckets.find(b => b.name === bucketName)
    
    if (bucket) {
      console.log(`✅ Bucket '${bucketName}' esiste`)
      console.log(`  - Pubblico: ${bucket.public}`)
      console.log(`  - Creato: ${bucket.created_at}`)
      return true
    } else {
      console.log(`❌ Bucket '${bucketName}' NON esiste`)
      console.log('📋 Bucket esistenti:')
      buckets.forEach(b => console.log(`  - ${b.name} (pubblico: ${b.public})`))
      return false
    }
  } catch (error) {
    console.error('❌ Errore durante la verifica del bucket:', error)
    return false
  }
}

// Funzione per creare il bucket se non esiste
export const createStorageBucket = async (bucketName = 'customer-avatars') => {
  try {
    console.log(`🪣 Creando bucket '${bucketName}'...`)
    
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      fileSizeLimit: 3 * 1024 * 1024 // 3MB
    })
    
    if (error) {
      console.error('❌ Errore durante la creazione del bucket:', error)
      return false
    }
    
    console.log(`✅ Bucket '${bucketName}' creato con successo`)
    return true
  } catch (error) {
    console.error('❌ Errore durante la creazione del bucket:', error)
    return false
  }
}

// Funzione completa per verificare tutto il sistema
export const checkImageUploadSystem = async () => {
  console.log('🔍 === VERIFICA SISTEMA UPLOAD IMMAGINI ===')
  
  // 1. Verifica struttura tabella
  const tableCheck = await checkCustomersTable()
  
  // 2. Verifica bucket storage
  const bucketExists = await checkStorageBucket()
  
  // 3. Ottieni esempio record
  await getCustomerSample()
  
  // 4. Riepilogo
  console.log('\n📋 === RIEPILOGO ===')
  console.log(`Avatar URL: ${tableCheck.avatar_url ? '✅' : '❌'} ${!tableCheck.avatar_url ? '(RICHIESTO per upload immagini)' : ''}`)
  console.log(`OneSignal ID: ${tableCheck.onesignal_player_id ? '✅' : '❌'}`)
  console.log(`Wallet Balance: ${tableCheck.wallet_balance ? '✅' : '❌'}`)
  console.log(`Referral Code: ${tableCheck.referral_code ? '✅' : '❌'}`)
  console.log(`Storage Bucket: ${bucketExists ? '✅' : '❌'} ${!bucketExists ? '(RICHIESTO per upload immagini)' : ''}`)
  
  const isReady = tableCheck.avatar_url && bucketExists
  console.log(`\n🎯 Sistema upload immagini: ${isReady ? '✅ PRONTO' : '❌ NON PRONTO'}`)
  
  if (!isReady) {
    console.log('\n🛠️ AZIONI NECESSARIE:')
    if (!tableCheck.avatar_url) {
      console.log('1. Aggiungere colonna avatar_url alla tabella customers')
    }
    if (!bucketExists) {
      console.log('2. Creare bucket storage customer-avatars')
    }
  }
  
  return {
    columns: tableCheck,
    bucketExists,
    isReady
  }
}