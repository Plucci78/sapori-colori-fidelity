// Test semplice del sistema referral
import { supabase } from './src/supabase.js';

async function testReferralSystem() {
  console.log('🔍 Testing referral system...')
  
  try {
    // 1. Test connessione base
    const { data, error } = await supabase
      .from('customers')
      .select('count', { count: 'exact', head: true })
    
    if (error) {
      console.error('❌ Errore connessione:', error)
      return
    }
    
    console.log('✅ Connesso al database. Clienti totali:', data?.count || 0)
    
    // 2. Cerca clienti con referral_code
    const { data: customersWithCode, error: codeError } = await supabase
      .from('customers')
      .select('id, name, referral_code, referral_count, referred_by')
      .not('referral_code', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (codeError) {
      console.error('❌ Errore ricerca codici referral:', codeError)
      return
    }
    
    console.log('👥 Clienti con codici referral:', customersWithCode?.length || 0)
    if (customersWithCode && customersWithCode.length > 0) {
      customersWithCode.forEach(customer => {
        console.log(`  - ${customer.name}: ${customer.referral_code} (inviti: ${customer.referral_count || 0})`)
      })
    }
    
    // 3. Controlla tabella referrals e trova chi ha referral
    const { data: referralsData, error: refError } = await supabase
      .from('referrals')
      .select(`
        *,
        referrer:customers!referrals_referrer_id_fkey(name, referral_code),
        referred:customers!referrals_referred_id_fkey(name)
      `)
      .limit(10)
    
    if (refError) {
      console.error('❌ Errore tabella referrals:', refError)
    } else {
      console.log('🔗 Record in tabella referrals:', referralsData?.length || 0)
      if (referralsData && referralsData.length > 0) {
        console.log('\n📋 DETTAGLI REFERRALS:')
        referralsData.forEach((ref, index) => {
          console.log(`${index + 1}. ${ref.referrer?.name} (${ref.referrer?.referral_code}) → ${ref.referred?.name}`)
          console.log(`   Status: ${ref.status}, Punti: ${ref.points_awarded || 0}, Data: ${ref.created_at}`)
        })
        
        // Trova chi ha più referral
        const referrerCounts = {}
        referralsData.forEach(ref => {
          const referrerId = ref.referrer_id
          const referrerName = ref.referrer?.name || 'Sconosciuto'
          if (!referrerCounts[referrerId]) {
            referrerCounts[referrerId] = { name: referrerName, count: 0, code: ref.referrer?.referral_code }
          }
          referrerCounts[referrerId].count++
        })
        
        console.log('\n🏆 CLASSIFICA REFERRERS:')
        Object.values(referrerCounts)
          .sort((a, b) => b.count - a.count)
          .forEach((referrer, index) => {
            console.log(`${index + 1}. ${referrer.name} (${referrer.code}): ${referrer.count} inviti`)
          })
      }
    }
    
    // 4. Test specifico su codice referral
    if (customersWithCode && customersWithCode.length > 0) {
      const testCode = customersWithCode[0].referral_code
      console.log('🧪 Test validazione codice:', testCode)
      
      const { data: validation, error: valError } = await supabase
        .from('customers')
        .select('id, name')
        .eq('referral_code', testCode)
        .single()
      
      if (valError) {
        console.error('❌ Validazione fallita:', valError)
      } else {
        console.log('✅ Codice valido, trovato:', validation.name)
      }
    }
    
  } catch (error) {
    console.error('❌ Errore generale nel test:', error)
  }
}

testReferralSystem()
