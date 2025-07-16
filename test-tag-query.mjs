// Test per verificare query Supabase
import { supabase } from './src/supabase.js'

async function testTagQuery() {
  console.log('🔍 Test ricerca tessera 23A349CF...')
  
  try {
    // Test 1: Query base senza filtri
    console.log('\n1. Test query base (tutte le tessere):')
    const { data: allTags, error: allError } = await supabase
      .from('nfc_tags')
      .select('*')
      .limit(5)
    
    if (allError) {
      console.error('❌ Errore query base:', allError)
    } else {
      console.log('✅ Query base OK, trovate', allTags.length, 'tessere')
      console.log('Esempi:', allTags.map(t => ({ id: t.tag_id, active: t.is_active })))
    }

    // Test 2: Cerca tessera specifica
    console.log('\n2. Test ricerca tessera specifica:')
    const { data: specificTag, error: specificError } = await supabase
      .from('nfc_tags')
      .select('tag_id, customer_id, is_active')
      .eq('tag_id', '23A349CF')
    
    if (specificError) {
      console.error('❌ Errore ricerca specifica:', specificError)
    } else {
      console.log('✅ Ricerca specifica OK:', specificTag)
    }

    // Test 3: Cerca con filtro is_active
    console.log('\n3. Test con filtro is_active:')
    const { data: activeTag, error: activeError } = await supabase
      .from('nfc_tags')
      .select('tag_id, customer_id, is_active')
      .eq('tag_id', '23A349CF')
      .eq('is_active', true)
    
    if (activeError) {
      console.error('❌ Errore con filtro is_active:', activeError)
    } else {
      console.log('✅ Con filtro is_active OK:', activeTag)
    }

    // Test 4: Cerca tutte le tessere con questo pattern
    console.log('\n4. Test ricerca pattern:')
    const { data: patternTags, error: patternError } = await supabase
      .from('nfc_tags')
      .select('tag_id, customer_id, is_active')
      .like('tag_id', '%23A349CF%')
    
    if (patternError) {
      console.error('❌ Errore pattern:', patternError)
    } else {
      console.log('✅ Pattern search OK:', patternTags)
    }

  } catch (error) {
    console.error('❌ Errore generale:', error)
  }
}

testTagQuery()
