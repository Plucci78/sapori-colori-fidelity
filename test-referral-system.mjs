// Test script per sistema referral
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hznqwdpnrcvjugktqzxu.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bnd3ZHBucmN2anVna3Rxenh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMyMTI3NjYsImV4cCI6MjA0ODc4ODc2Nn0.HvYkcO9xNxlUg6sP65d1K8I02QXbTEGDHr3x8VrYS1Q'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testReferralSystem() {
  console.log('🔍 Testando sistema referral...')
  
  try {
    // 1. Controlla se esistono clienti con codici referral
    const { data: customersWithReferral, error: customersError } = await supabase
      .from('customers')
      .select('id, name, referral_code, referral_count, referred_by')
      .not('referral_code', 'is', null)
      .limit(5)
    
    if (customersError) {
      console.error('❌ Errore lettura customers:', customersError)
      return
    }
    
    console.log('👥 Clienti con codici referral:', customersWithReferral)
    
    // 2. Controlla i record nella tabella referrals
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select(`
        *,
        referrer:customers!referrals_referrer_id_fkey(name, referral_code),
        referred:customers!referrals_referred_id_fkey(name)
      `)
      .limit(10)
    
    if (referralsError) {
      console.error('❌ Errore lettura referrals:', referralsError)
      return
    }
    
    console.log('🔗 Record referrals trovati:', referrals)
    
    // 3. Controlla schema tabella customers
    const { data: customersSchema, error: schemaError } = await supabase
      .rpc('exec', { 
        sql: "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'customers' AND column_name LIKE '%referral%' ORDER BY ordinal_position;" 
      })
    
    if (!schemaError) {
      console.log('📋 Schema campi referral in customers:', customersSchema)
    }
    
    // 4. Testa un referral code specifico
    if (customersWithReferral && customersWithReferral.length > 0) {
      const testCode = customersWithReferral[0].referral_code
      console.log('🧪 Testando codice:', testCode)
      
      const { data: foundCustomer, error: findError } = await supabase
        .from('customers')
        .select('id, name, referral_code')
        .eq('referral_code', testCode)
        .single()
      
      if (findError) {
        console.error('❌ Errore ricerca per codice:', findError)
      } else {
        console.log('✅ Cliente trovato per codice:', foundCustomer)
      }
    }
    
  } catch (error) {
    console.error('❌ Errore generale:', error)
  }
}

testReferralSystem()
