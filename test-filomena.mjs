// Test per controllare se Filomena ha fatto un acquisto
import { supabase } from './src/supabase.js';

async function checkFilomenaTransaction() {
  console.log('🔍 Controllando transazioni di FILOMENA MARTORANA...');
  
  try {
    // 1. Trova FILOMENA MARTORANA (potrebbe avere nomi leggermente diversi)
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name, points, created_at')
      .ilike('name', '%FILOMENA%')
      .order('created_at', { ascending: false });
    
    if (!customers || customers.length === 0) {
      console.log('❌ Nessun cliente Filomena trovato');
      return;
    }
    
    console.log('👥 Clienti Filomena trovati:');
    customers.forEach((c, i) => {
      console.log(`  ${i+1}. ${c.name} (ID: ${c.id}) - ${c.points} punti`);
    });
    
    // 2. Per ogni Filomena, controlla le transazioni
    for (const customer of customers) {
      console.log(`\n💰 Transazioni per ${customer.name}:`);
      
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });
      
      if (!transactions || transactions.length === 0) {
        console.log('  📭 Nessuna transazione trovata');
      } else {
        console.log(`  📊 ${transactions.length} transazioni trovate:`);
        transactions.forEach((t, i) => {
          console.log(`    ${i+1}. ${t.type} - €${t.amount} - ${t.points_earned} punti - ${t.created_at}`);
        });
      }
      
      // 3. Controlla se questa Filomena ha un referral pending
      const { data: referrals } = await supabase
        .from('referrals')
        .select(`
          *,
          referrer:customers!referrals_referrer_id_fkey(name, referral_code)
        `)
        .eq('referred_id', customer.id);
      
      if (referrals && referrals.length > 0) {
        console.log(`  🔗 Referral trovati per ${customer.name}:`);
        referrals.forEach((r, i) => {
          console.log(`    ${i+1}. Referrer: ${r.referrer?.name} (${r.referrer?.referral_code})`);
          console.log(`       Status: ${r.status}, Punti: ${r.points_awarded || 0}`);
          console.log(`       Data: ${r.created_at}`);
        });
      } else {
        console.log(`  📭 Nessun referral trovato per ${customer.name}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

checkFilomenaTransaction();
