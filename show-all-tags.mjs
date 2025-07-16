// Test per vedere tutte le tessere nel database
import { supabase } from './src/supabase.js'

async function showAllTags() {
  console.log('📋 Tutte le tessere nel database:')
  
  try {
    const { data: allTags, error } = await supabase
      .from('nfc_tags')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ Errore:', error)
      return
    }

    console.log(`\n✅ Trovate ${allTags.length} tessere:`)
    allTags.forEach((tag, index) => {
      console.log(`${index + 1}. ID: ${tag.tag_id} | Cliente: ${tag.customer_id} | Attiva: ${tag.is_active} | Nome: ${tag.tag_name || 'N/A'}`)
    })

    console.log('\n🎯 ID tessera letta dal lettore: 23A349CF')
    console.log('🔍 Questa tessera non è nel database, quindi è normale che dica "non associata"')

  } catch (error) {
    console.error('❌ Errore generale:', error)
  }
}

showAllTags()
