// Test sistema moltiplicatori referral
import { supabase } from './src/supabase.js';

const pasqualinoId = '7be4655f-e753-4e70-ad79-40266cd3dee6';

// Funzioni dal sistema (duplicate per test)
const getReferralLevel = (count) => {
  if (count >= 20) return 'LEGGENDA';
  if (count >= 10) return 'MAESTRO';
  if (count >= 5) return 'ESPERTO';
  if (count >= 1) return 'AMICO';
  return 'NUOVO';
};

const getReferralPoints = (referralCount) => {
  const level = getReferralLevel(referralCount);
  
  switch (level) {
    case 'LEGGENDA': return 40;  // +100%
    case 'MAESTRO':  return 30;  // +50%
    case 'ESPERTO':  return 25;  // +25%
    case 'AMICO':    return 20;  // Base
    default:         return 20;  // Base
  }
};

const getReferralLevelInfo = (count) => {
  const level = getReferralLevel(count);
  const points = getReferralPoints(count);
  const basePoints = 20;
  const multiplier = points / basePoints;
  const bonusPercent = Math.round((multiplier - 1) * 100);
  
  return {
    level,
    points,
    multiplier,
    bonusPercent,
    isBonus: bonusPercent > 0
  };
};

async function testMultiplierSystem() {
  console.log('🧪 TEST SISTEMA MOLTIPLICATORI REFERRAL');
  console.log('=====================================\n');
  
  // 1. Stato attuale
  console.log('📊 STATO ATTUALE PASQUALINO:');
  const { data: currentReferrals } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', pasqualinoId)
    .eq('status', 'completed');
    
  const currentCount = currentReferrals?.length || 0;
  const currentInfo = getReferralLevelInfo(currentCount);
  
  console.log(`   Referral completati: ${currentCount}`);
  console.log(`   Livello attuale: ${currentInfo.level}`);
  console.log(`   Gemme per nuovo referral: ${currentInfo.points}`);
  if (currentInfo.isBonus) {
    console.log(`   🎉 Bonus attivo: +${currentInfo.bonusPercent}%`);
  }
  
  // 2. Simulazione progressione
  console.log('\n🔮 SIMULAZIONE PROGRESSIONE MOLTIPLICATORI:');
  console.log('Referral | Livello    | Gemme/Referral | Bonus     | Totale Guadagnato');
  console.log('---------|------------|----------------|-----------|------------------');
  
  let totalEarned = currentCount * 20; // Assume che abbia già guadagnato 20 per ognuno
  
  for (let i = currentCount; i <= Math.min(currentCount + 10, 25); i++) {
    const info = getReferralLevelInfo(i);
    const bonusText = info.isBonus ? `+${info.bonusPercent}%` : 'Nessuno';
    
    if (i > currentCount) {
      totalEarned += info.points;
    }
    
    console.log(`${i.toString().padStart(8)} | ${info.level.padEnd(10)} | ${info.points.toString().padStart(14)} | ${bonusText.padEnd(9)} | ${totalEarned.toString().padStart(16)}`);
  }
  
  // 3. Test aggiunta referral
  if (process.argv[2] === 'add') {
    console.log('\n🚀 AGGIUNTA REFERRAL DI TEST...');
    
    try {
      // Crea cliente fittizio
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: `Test Moltiplicatori ${Date.now()}`,
          email: `testmult${Date.now()}@example.com`,
          phone: `+39 000 ${Math.floor(Math.random() * 1000000)}`,
          referred_by: 'PASQU-GIWA'
        })
        .select()
        .single();
        
      if (customerError) throw customerError;
      
      // Calcola punti con nuovo sistema
      const newCount = currentCount + 1;
      const newInfo = getReferralLevelInfo(currentCount); // Usa il count PRIMA dell'aggiunta
      const pointsToAward = newInfo.points;
      
      console.log(`📈 Nuovo referral sarà premiato con: ${pointsToAward} gemme`);
      console.log(`📊 Livello utilizzato per calcolo: ${newInfo.level} (basato su ${currentCount} referral)`);
      
      // Crea referral con punti corretti
      const { error: referralError } = await supabase
        .from('referrals')
        .insert({
          referrer_id: pasqualinoId,
          referred_id: newCustomer.id,
          status: 'completed',
          points_awarded: pointsToAward
        });
        
      if (referralError) throw referralError;
      
      // Aggiorna contatori
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          referral_count: newCount,
          referral_points_earned: totalEarned + pointsToAward
        })
        .eq('id', pasqualinoId);
        
      if (updateError) throw updateError;
      
      const finalInfo = getReferralLevelInfo(newCount);
      
      console.log('✅ REFERRAL AGGIUNTO CON SUCCESSO!');
      console.log(`🎯 Nuovo stato:`);
      console.log(`   - Referral: ${newCount}`);
      console.log(`   - Livello: ${finalInfo.level}`);
      console.log(`   - Gemme totali: ${totalEarned + pointsToAward}`);
      console.log(`   - Prossimo referral varrà: ${finalInfo.points} gemme`);
      
      if (finalInfo.isBonus) {
        console.log(`   🎉 Bonus attivo: +${finalInfo.bonusPercent}%`);
      }
      
      // Controlla se è passato di livello
      if (finalInfo.level !== currentInfo.level) {
        console.log(`🏆 LIVELLO SALITO: ${currentInfo.level} → ${finalInfo.level}!`);
      }
      
    } catch (error) {
      console.error('❌ Errore:', error);
    }
  } else {
    console.log('\n💡 Per aggiungere un referral di test: node test-multipliers.mjs add');
  }
}

testMultiplierSystem();
