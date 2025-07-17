import { supabase } from './src/supabase.js'

const testFixedConsent = async () => {
  console.log('🔍 Test consensi dopo correzione')
  console.log('===============================')

  const testCustomerId = '3a6c6c13-ce52-436d-8d94-c045e8e2c5d6'
  const testConsentType = 'email_marketing'

  try {
    // Simula la nuova logica del componente
    console.log('1️⃣ Controllo record esistente...')
    
    const { data: existingRecord, error: selectError } = await supabase
      .from('consent_records')
      .select('*')
      .eq('customer_id', testCustomerId)
      .eq('consent_type', testConsentType)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      throw selectError;
    }

    let result;
    if (existingRecord) {
      console.log('✅ Record esistente trovato, aggiorno...')
      console.log(`   ID: ${existingRecord.id}`)
      console.log(`   Consenso attuale: ${existingRecord.consent_given}`)
      
      // Aggiorna il record esistente
      result = await supabase
        .from('consent_records')
        .update({
          consent_given: !existingRecord.consent_given, // Inverto per testare
          consent_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRecord.id);
        
      console.log(`   Nuovo consenso: ${!existingRecord.consent_given}`)
    } else {
      console.log('🆕 Nessun record esistente, creo nuovo...')
      
      // Crea un nuovo record
      result = await supabase
        .from('consent_records')
        .insert({
          customer_id: testCustomerId,
          consent_type: testConsentType,
          consent_given: true,
          consent_date: new Date().toISOString(),
          operator_id: 'current_user'
        });
    }

    if (result.error) {
      console.error('❌ Errore operazione:', result.error)
    } else {
      console.log('✅ Operazione completata con successo!')
    }

    // Verifica finale
    console.log('\n2️⃣ Verifica finale...')
    const { data: finalRecords, error: finalError } = await supabase
      .from('consent_records')
      .select('*')
      .eq('customer_id', testCustomerId)
      .eq('consent_type', testConsentType)
      .order('updated_at', { ascending: false })

    if (finalError) {
      console.error('❌ Errore verifica finale:', finalError)
    } else {
      console.log(`📊 Record finali per ${testConsentType}: ${finalRecords.length}`)
      finalRecords.forEach((record, index) => {
        const updatedTime = record.updated_at ? new Date(record.updated_at).toLocaleString('it-IT') : 'N/A'
        console.log(`   ${index + 1}. ID: ${record.id}, Consent: ${record.consent_given}, Updated: ${updatedTime}`)
      })
    }

  } catch (error) {
    console.error('❌ Errore generale:', error)
  }
}

testFixedConsent()
