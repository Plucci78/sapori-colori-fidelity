// Test rapido referral system
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lnpkmzknjfynmxdxyuzr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucGttemtuamZ5bm14ZHh5dXpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzMTE3MzksImV4cCI6MjA1MDg4NzczOX0.f_YH2TBFQCfGSJBn6KqeAhI3VgwfzNJqnYx0wfXr0gY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testReferralSystem() {
  console.log('🧪 TEST SISTEMA REFERRAL');
  console.log('========================');
  
  const pasqualinoId = '7be4655f-e753-4e70-ad79-40266cd3dee6';
  
  try {
    // Controllo stato attuale
    const { data: referrals } = await supabase
      .from('referrals')
      .select('*, referred:customers!referrals_referred_id_fkey(name)')
      .eq('referrer_id', pasqualinoId);

    console.log(`📊 Referral attuali: ${referrals?.length || 0}`);
    
    if (referrals?.length > 0) {
      referrals.forEach((ref, i) => {
        console.log(`   ${i+1}. ${ref.referred?.name} - ${ref.status} - ${ref.points_awarded || 0} punti`);
      });
    }
    
    // Se vuoi aggiungere un referral di test
    if (process.argv[2] === 'add') {
      console.log('\n🚀 Aggiunta referral di test...');
      
      // Crea cliente fittizio
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: `Test User ${Date.now()}`,
          email: `test${Date.now()}@example.com`,
          phone: `+39 000 ${Math.floor(Math.random() * 1000000)}`,
          referred_by: 'PASQU-GIWA'
        })
        .select()
        .single();
        
      if (customerError) {
        console.error('❌ Errore cliente:', customerError);
        return;
      }
      
      // Crea referral
      const { error: referralError } = await supabase
        .from('referrals')
        .insert({
          referrer_id: pasqualinoId,
          referred_id: newCustomer.id,
          status: 'completed',
          points_awarded: 20
        });
        
      if (referralError) {
        console.error('❌ Errore referral:', referralError);
        return;
      }
      
      // Aggiorna contatori
      const newTotal = (referrals?.length || 0) + 1;
      await supabase
        .from('customers')
        .update({
          referral_count: newTotal,
          referral_points_earned: newTotal * 20
        })
        .eq('id', pasqualinoId);
        
      console.log(`✅ Referral aggiunto! Totale: ${newTotal}`);
      console.log(`💎 Gemme totali: ${newTotal * 20}`);
      
      const level = newTotal >= 20 ? 'LEGGENDA' :
                   newTotal >= 10 ? 'MAESTRO' :
                   newTotal >= 5 ? 'ESPERTO' :
                   newTotal >= 1 ? 'AMICO' : 'NUOVO';
      console.log(`🏆 Livello: ${level}`);
      
      if (newTotal === 5) {
        console.log('🎉 BONUS RAGGIUNTO! Sei passato a livello ESPERTO!');
      }
    } else {
      console.log('\n💡 Per aggiungere un referral di test: node test-referral-quick.js add');
    }
    
  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

testReferralSystem();
