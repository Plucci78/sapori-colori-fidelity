import { supabase } from './src/supabase.js'

// Verifica struttura consent_records
const checkConsentRecords = async () => {
  console.log('🔍 Controllo struttura consent_records')
  console.log('=====================================')

  try {
    // Prendi un record di esempio per vedere le colonne
    const { data, error } = await supabase
      .from('consent_records')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ Errore:', error)
      return
    }

    if (data && data.length > 0) {
      console.log('✅ Struttura consent_records:')
      console.log('Colonne disponibili:')
      Object.keys(data[0]).forEach(key => {
        console.log(`   - ${key}: ${typeof data[0][key]} (${data[0][key]})`)
      })
    } else {
      console.log('❌ Nessun record trovato')
    }

    // Mostra tutti i record
    const { data: allRecords, error: allError } = await supabase
      .from('consent_records')
      .select('*')

    if (!allError && allRecords) {
      console.log(`\n📊 Totale record: ${allRecords.length}`)
      allRecords.forEach((record, index) => {
        console.log(`\n${index + 1}. Record ID: ${record.id}`)
        console.log(`   Customer ID: ${record.customer_id}`)
        console.log(`   Consent Date: ${record.consent_date}`)
        console.log(`   Digital Signature: ${record.digital_signature ? 'Present' : 'None'}`)
        // Mostra tutte le altre colonne
        Object.keys(record).forEach(key => {
          if (!['id', 'customer_id', 'consent_date', 'digital_signature'].includes(key)) {
            console.log(`   ${key}: ${record[key]}`)
          }
        })
      })
    }

  } catch (error) {
    console.error('❌ Errore durante controllo:', error)
  }
}

checkConsentRecords()
