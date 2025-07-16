// Test sistema referral - Simulazione bonus progressivi
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lnpkmzknjfynmxdxyuzr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucGttemtuamZ5bm14ZHh5dXpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzMTE3MzksImV4cCI6MjA1MDg4NzczOX0.f_YH2TBFQCfGSJBn6KqeAhI3VgwfzNJqnYx0wfXr0gY';
const supabase = createClient(supabaseUrl, supabaseKey);

const pasqualinoId = '7be4655f-e753-4e70-ad79-40266cd3dee6';

// Nomi fittizi per test
const testFriends = [
  'Marco Rossi',
  'Laura Bianchi', 
  'Andrea Verdi',
  'Sofia Neri',
  'Luca Ferrari'
];

console.log('🧪 SIMULAZIONE SISTEMA REFERRAL');
console.log('================================');

// Funzione per calcolare il livello
const getReferralLevel = (count) => {
  if (count >= 20) return 'LEGGENDA';
  if (count >= 10) return 'MAESTRO';
  if (count >= 5) return 'ESPERTO';
  if (count >= 1) return 'AMICO';
  return 'NUOVO';
};

// 1. Stato attuale
console.log('\n📊 STATO ATTUALE:');
const { data: currentReferrals } = await supabase
  .from('referrals')
  .select('*, referred:customers!referrals_referred_id_fkey(name)')
  .eq('referrer_id', pasqualinoId);

console.log(`   Referral attuali: ${currentReferrals?.length || 0}`);
currentReferrals?.forEach((ref, i) => {
  console.log(`   ${i+1}. ${ref.referred?.name} - ${ref.status} - ${ref.points_awarded || 0} punti`);
});

const currentLevel = getReferralLevel(currentReferrals?.length || 0);
console.log(`   Livello attuale: ${currentLevel}`);

// 2. Simulazione aggiunta referral
console.log('\n🔮 SIMULAZIONE - Cosa succede se aggiungi referral:');

for (let i = 1; i <= 5; i++) {
  const totalReferrals = (currentReferrals?.length || 0) + i;
  const totalPoints = totalReferrals * 20;
  const level = getReferralLevel(totalReferrals);
  const progressToNext = totalReferrals < 5 ? `${totalReferrals}/5 verso ESPERTO` : 
                        totalReferrals < 10 ? `${totalReferrals}/10 verso MAESTRO` :
                        totalReferrals < 20 ? `${totalReferrals}/20 verso LEGGENDA` : 'MASSIMO LIVELLO!';
  
  console.log(`   Con ${totalReferrals} referral: ${totalPoints} gemme - Livello ${level} - ${progressToNext}`);
}

// 3. Test creazione referral fittizio (SOLO PER TEST)
console.log('\n❓ Vuoi testare aggiungendo un referral fittizio?');
console.log('   Esegui: node test-referral-bonus.mjs add');

if (process.argv[2] === 'add') {
  console.log('\n🚀 AGGIUNTA REFERRAL FITTIZIO...');
  
  // Crea customer fittizio
  const { data: newCustomer, error: customerError } = await supabase
    .from('customers')
    .insert({
      name: testFriends[Math.floor(Math.random() * testFriends.length)],
      email: `test${Date.now()}@example.com`,
      phone: `+39 000 ${Math.floor(Math.random() * 1000000)}`,
      referred_by: 'PASQU-GIWA'
    })
    .select()
    .single();
    
  if (customerError) {
    console.error('❌ Errore creazione customer:', customerError);
    process.exit(1);
  }
  
  console.log(`✅ Cliente creato: ${newCustomer.name}`);
  
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
    console.error('❌ Errore creazione referral:', referralError);
  } else {
    console.log('✅ Referral creato e completato!');
    
    // Aggiorna contatori
    const newTotal = (currentReferrals?.length || 0) + 1;
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        referral_count: newTotal,
        referral_points_earned: newTotal * 20
      })
      .eq('id', pasqualinoId);
      
    if (!updateError) {
      console.log(`🎯 Pasqualino ora ha ${newTotal} referral e ${newTotal * 20} gemme!`);
      console.log(`🏆 Nuovo livello: ${getReferralLevel(newTotal)}`);
    }
  }
}

console.log('\n💡 Per testare nell\'interfaccia, ricarica la pagina dopo aver aggiunto referral.');
