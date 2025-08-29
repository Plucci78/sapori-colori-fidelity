// Questo script contiene una chiamata diretta al servizio NFC
// per simulare una scansione esattamente come farebbe un utente reale
// ma senza aver bisogno di un lettore fisico NFC

import { createClient } from '@supabase/supabase-js';

// Carica le variabili d'ambiente dal file .env
import dotenv from 'dotenv';
dotenv.config();

// Ottieni le credenziali di Supabase dalle variabili d'ambiente
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://your-supabase-url.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function listAvailableTags() {
  console.log('📋 Ricerca tag NFC attivi nel database...');
  
  try {
    // Trova tutti i tag attivi
    const { data: tags, error } = await supabase
      .from('nfc_tags')
      .select('tag_id, customer_id')
      .eq('is_active', true)
      .order('tag_id', { ascending: true });
    
    if (error) {
      throw error;
    }
    
    if (!tags || tags.length === 0) {
      console.log('❌ Nessun tag NFC attivo trovato nel database.');
      return null;
    }
    
    console.log(`✅ Trovati ${tags.length} tag attivi:`);
    
    // Per ogni tag, ottieni informazioni sul cliente
    for (let i = 0; i < Math.min(tags.length, 5); i++) {
      const tag = tags[i];
      const { data: customer } = await supabase
        .from('customers')
        .select('name')
        .eq('id', tag.customer_id)
        .single();
      
      console.log(`${i+1}. Tag ID: ${tag.tag_id} - Cliente: ${customer?.name || 'Sconosciuto'}`);
    }
    
    if (tags.length > 5) {
      console.log(`... e altri ${tags.length - 5} tag`);
    }
    
    // Ritorna il primo tag come esempio
    return tags[0].tag_id;
    
  } catch (error) {
    console.error('❌ Errore durante la ricerca dei tag:', error);
    return null;
  }
}

async function simulateNFCScan(tagId) {
  if (!tagId) {
    console.log('❌ Nessun tag ID fornito per la simulazione.');
    return;
  }
  
  console.log(`\n🔍 Simulazione scansione NFC per tag: ${tagId}`);
  
  try {
    // Normalizza il tag ID
    const normalizedTagId = tagId.replace(/:/g, '').toLowerCase();
    
    // Prima cerchiamo il tag
    const { data: tagData, error: tagError } = await supabase
      .from('nfc_tags')
      .select('tag_id, customer_id')
      .eq('tag_id', normalizedTagId)
      .eq('is_active', true)
      .single();

    if (tagError || !tagData) {
      console.error(`❌ Tessera ${normalizedTagId.slice(-6)} non registrata`);
      return;
    }

    // Poi cerchiamo il cliente
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('id, name, phone, email, points, wallet_balance, created_at, avatar_url, birth_date')
      .eq('id', tagData.customer_id)
      .single();

    if (customerError || !customerData) {
      console.error(`❌ Cliente non trovato per tessera ${normalizedTagId.slice(-6)}`);
      return;
    }

    // Log dell'accesso
    await supabase
      .from('nfc_logs')
      .insert([{
        tag_id: normalizedTagId,
        customer_id: customerData.id,
        action_type: 'console_simulation',
        created_at: new Date().toISOString()
      }]);
    
    console.log('✅ Accesso NFC simulato con successo!');
    console.log(`📊 Cliente: ${customerData.name}`);
    console.log(`💎 Punti: ${customerData.points || 0} GEMME`);
    
    // Invoca trigger nfc_scan manualmente
    console.log('📲 Verifica workflow di notifica...');
    
    // Controlla se ci sono configurazioni di workflow per nfc_scan
    const { data: workflows } = await supabase
      .from('workflow_configurations')
      .select('*')
      .eq('trigger_type', 'nfc_scan')
      .eq('is_active', true);
      
    console.log(`📋 Workflow trovati: ${workflows?.length || 0}`);
    
    // Verifica sottoscrizioni OneSignal per il cliente
    const { data: subscriptions } = await supabase
      .from('onesignal_subscriptions')
      .select('*')
      .eq('customer_id', customerData.id);
      
    console.log(`📱 Dispositivi registrati: ${subscriptions?.length || 0}`);
    
    console.log('✅ Simulazione completata');
    
    // Aggiungi trigger manuale per simulare visivamente la notifica
    const { error: triggerError } = await supabase
      .from('activity_logs')
      .insert([{
        customer_id: customerData.id,
        activity_type: 'nfc_scan_simulation',
        description: `Simulazione scansione NFC via console`,
        metadata: {
          tag_id: normalizedTagId,
          points: customerData.points,
          test_mode: true
        },
        created_at: new Date().toISOString()
      }]);
      
    if (triggerError) {
      console.error('❌ Errore nel trigger di attività:', triggerError);
    } else {
      console.log('✅ Log attività registrato');
    }

  } catch (error) {
    console.error('❌ Errore durante la simulazione:', error);
  }
}

// Esegui il programma principale
async function main() {
  console.log('🚀 Avvio simulatore NFC...');
  
  // Prima ottieni un tag valido dal database
  const validTagId = await listAvailableTags();
  
  // Poi simula una scansione con quel tag
  if (validTagId) {
    await simulateNFCScan(validTagId);
  } else {
    console.log('\n❌ Impossibile simulare la scansione: nessun tag valido trovato.');
    console.log('💡 Suggerimento: Verifica che ci siano tag attivi nel database.');
  }
}

main();
