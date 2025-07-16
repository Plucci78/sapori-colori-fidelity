// Test veloce per verificare che i referral si caricano correttamente
import { supabase } from './src/supabase.js'

async function testReferralLoading() {
  console.log('🧪 Test caricamento referral...')
  
  try {
    // Prendi un cliente che abbia un referral_code
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, name, referral_code, referral_count')
      .not('referral_code', 'is', null)
      .limit(1)
      .single()
    
    if (customersError || !customers) {
      console.error('❌ Errore o nessun cliente trovato:', customersError)
      return
    }
    
    console.log('👤 Cliente test:', customers)
    
    // Simula la chiamata loadReferredFriends dall'App.jsx
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select(`
        *,
        referred:customers!referrals_referred_id_fkey(name, created_at)
      `)
      .eq('referrer_id', customers.id)
      .order('created_at', { ascending: false })
    
    if (referralsError) {
      console.error('❌ Errore caricamento referrals:', referralsError)
      return
    }
    
    console.log('🔗 Referrals trovati:', referrals?.length || 0)
    if (referrals && referrals.length > 0) {
      referrals.forEach((ref, index) => {
        console.log(`📋 Referral #${index + 1}:`, {
          status: ref.status,
          referred_name: ref.referred?.name,
          points_awarded: ref.points_awarded,
          created_at: ref.created_at
        })
      })
    } else {
      console.log('📭 Nessun referral trovato per questo cliente')
    }
    
    // Verifica se il count nel database corrisponde ai referrals effettivi
    const actualReferralsCount = referrals?.length || 0
    const dbReferralCount = customers.referral_count || 0
    
    if (actualReferralsCount !== dbReferralCount) {
      console.log('⚠️ DISALLINEAMENTO DATI:', {
        actual: actualReferralsCount,
        database: dbReferralCount,
        diff: actualReferralsCount - dbReferralCount
      })
    } else {
      console.log('✅ Dati allineati correttamente')
    }
    
  } catch (error) {
    console.error('❌ Errore generale:', error)
  }
}

testReferralLoading()
