// Test script per verificare la tabella consent_records e le firme digitali
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xhlruxzhcqwksymkhhde.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhobHJ1eHpoY3F3a3N5bWtoaGRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU1MzI4NzcsImV4cCI6MjA0MTEwODg3N30.9cxCVSeFYgBV0-wW5R7ufnJO6Y8p6LPJnJf7sLbBRYQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConsentRecords() {
  console.log('🔍 Verifico la struttura della tabella consent_records...\n')
  
  try {
    // Test 1: Verifica se la tabella esiste e ha record
    const { data: allRecords, error: allError } = await supabase
      .from('consent_records')
      .select('*')
      .limit(5)
    
    if (allError) {
      console.log('❌ Errore accesso consent_records:', allError.message)
      return
    }
    
    console.log(`✅ Tabella consent_records trovata con ${allRecords?.length || 0} record (primi 5):`)
    if (allRecords && allRecords.length > 0) {
      allRecords.forEach((record, index) => {
        console.log(`   ${index + 1}. Customer ID: ${record.customer_id}`)
        console.log(`      - Consent Type: ${record.consent_type}`)
        console.log(`      - Consent Given: ${record.consent_given}`)
        console.log(`      - Has Signature: ${record.digital_signature ? '✅ Sì' : '❌ No'}`)
        console.log(`      - Date: ${record.consent_date}`)
        console.log('      ---')
      })
    }
    
    // Test 2: Conta record con firma digitale
    const { data: signedRecords, error: signedError } = await supabase
      .from('consent_records')
      .select('customer_id, consent_date, digital_signature')
      .not('digital_signature', 'is', null)
    
    if (!signedError && signedRecords) {
      console.log(`\n📝 Record con firma digitale: ${signedRecords.length}`)
      if (signedRecords.length > 0) {
        signedRecords.forEach((record, index) => {
          const signatureSize = record.digital_signature ? record.digital_signature.length : 0
          console.log(`   ${index + 1}. Customer ${record.customer_id} - Firma: ${signatureSize} caratteri - Data: ${record.consent_date}`)
        })
      }
    }
    
    // Test 3: Verifica clienti con consent records
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, name, phone')
      .limit(3)
    
    if (!customersError && customers) {
      console.log(`\n👥 Primi 3 clienti nel database:`)
      for (const customer of customers) {
        console.log(`   ${customer.name} (ID: ${customer.id})`)
        
        // Cerca consent records per questo cliente
        const { data: customerConsents } = await supabase
          .from('consent_records')
          .select('consent_type, consent_given, digital_signature')
          .eq('customer_id', customer.id)
        
        if (customerConsents && customerConsents.length > 0) {
          const hasSignature = customerConsents.some(c => c.digital_signature)
          console.log(`      - Consensi: ${customerConsents.length}`)
          console.log(`      - Firma digitale: ${hasSignature ? '✅ Presente' : '❌ Assente'}`)
        } else {
          console.log(`      - Nessun consent record`)
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Errore generale:', error)
  }
}

// Esegui test
testConsentRecords()
  .then(() => {
    console.log('\n✅ Test completato!')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Errore test:', error)
    process.exit(1)
  })
