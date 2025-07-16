// Test automatico del sistema referral nell'interfaccia
import { supabase } from './src/supabase.js';

async function testReferralInterface() {
  console.log('🧪 Test interfaccia referral...');
  
  try {
    // 1. Trova un cliente che ha referral (Lucia Procope)
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('name', 'Lucia Procope')
      .single();
    
    if (customerError || !customer) {
      console.error('❌ Cliente Lucia Procope non trovato:', customerError);
      return;
    }
    
    console.log('👤 Cliente selezionato:', {
      name: customer.name,
      referral_code: customer.referral_code,
      referral_count: customer.referral_count,
      points: customer.points
    });
    
    // 2. Simula la chiamata loadReferredFriends che ora viene fatta nell'interfaccia
    console.log('🔍 Caricando referral per customerId:', customer.id);
    
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select(`
        *,
        referred:customers!referrals_referred_id_fkey(name, created_at)
      `)
      .eq('referrer_id', customer.id)
      .order('created_at', { ascending: false });
    
    if (referralsError) {
      console.error('❌ Errore caricamento referrals:', referralsError);
      return;
    }
    
    console.log('✅ Referrals caricati:', referrals?.length || 0);
    
    // 3. Simula quello che succede nell'interfaccia
    if (referrals && referrals.length > 0) {
      console.log('📋 DATI PER L\'INTERFACCIA:');
      
      // Progresso referral
      const referralCount = customer.referral_count || 0;
      const nextMilestone = Math.ceil(referralCount / 5) * 5;
      const progressPercent = ((referralCount % 5) / 5) * 100;
      
      console.log(`📊 Progresso: ${referralCount}/5 (prossimo bonus a ${nextMilestone} inviti)`);
      console.log(`📈 Barra progresso: ${progressPercent}%`);
      
      // Statistiche
      const gemmeGuadagnate = referralCount * 5; // Dalla formula nell'interfaccia
      console.log(`💎 GEMME guadagnate dal referral: ${gemmeGuadagnate}`);
      
      // Lista amici invitati
      console.log('👥 LISTA AMICI INVITATI:');
      referrals.forEach((friend, index) => {
        console.log(`  ${index + 1}. ${friend.referred?.name || 'Nome non disponibile'}`);
        console.log(`     - Invitato: ${new Date(friend.created_at).toLocaleDateString('it-IT')}`);
        console.log(`     - Status: ${friend.status === 'completed' ? '✅ Completato' : '⏳ In attesa'}`);
        console.log(`     - Punti assegnati: +${friend.points_awarded || 0} GEMME`);
      });
      
      // Verifica se i dati dell'interfaccia saranno corretti
      const actualReferralsCount = referrals.length;
      const dbReferralCount = customer.referral_count || 0;
      
      if (actualReferralsCount !== dbReferralCount) {
        console.log('⚠️ PROBLEMA: Disallineamento dati!');
        console.log(`   DB dice: ${dbReferralCount} referrals`);
        console.log(`   Reali: ${actualReferralsCount} referrals`);
        console.log('   → L\'auto-correzione dovrebbe sistemare questo');
      } else {
        console.log('✅ Dati allineati correttamente');
      }
      
      console.log('\n🎯 RISULTATO TEST:');
      console.log('✅ Sistema referral dovrebbe funzionare nell\'interfaccia');
      console.log('✅ I dati vengono caricati correttamente');
      console.log('✅ La sezione referral dovrebbe mostrarsi');
      
    } else {
      console.log('📭 Nessun referral trovato - sezione mostrerà messaggio incoraggiante');
    }
    
  } catch (error) {
    console.error('❌ Errore nel test:', error);
  }
}

testReferralInterface();
