import { supabase } from './src/supabase.js'

const testUpsertProblem = async () => {
  console.log('🔍 Test problema upsert consent_records')
  console.log('=====================================')

  const testCustomerId = '3a6c6c13-ce52-436d-8d94-c045e8e2c5d6'
  const testConsentType = 'email_marketing'

  try {
    console.log('📝 Tentativo di upsert...')
    
    // Questo è il codice che viene eseguito nel componente
    const { data, error } = await supabase.from('consent_records').upsert({
      customer_id: testCustomerId,
      consent_type: testConsentType,
      consent_given: true,
      consent_date: new Date().toISOString(),
      source: 'operator_update'
    }, { onConflict: 'customer_id, consent_type' })

    if (error) {
      console.error('❌ Errore durante upsert:', error)
      console.error('   - Codice errore:', error.code)
      console.error('   - Messaggio:', error.message)
      console.error('   - Dettagli:', error.details)
      console.error('   - Hint:', error.hint)
    } else {
      console.log('✅ Upsert riuscito:', data)
    }

    // Controlla quanti record ci sono per questo cliente e tipo
    const { data: existingRecords, error: selectError } = await supabase
      .from('consent_records')
      .select('*')
      .eq('customer_id', testCustomerId)
      .eq('consent_type', testConsentType)
      .order('created_at', { ascending: false })

    if (selectError) {
      console.error('❌ Errore durante select:', selectError)
    } else {
      console.log(`📊 Record esistenti per ${testConsentType}: ${existingRecords.length}`)
      existingRecords.forEach((record, index) => {
        console.log(`   ${index + 1}. ID: ${record.id}, Consent: ${record.consent_given}, Created: ${record.created_at}`)
      })
    }

  } catch (error) {
    console.error('❌ Errore generale:', error)
  }
}

testUpsertProblem()
