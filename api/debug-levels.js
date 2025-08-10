import { supabase } from '../src/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    // Carica i livelli
    const { data: levels, error: levelsError } = await supabase
      .from('customer_levels')
      .select('*')
      .order('min_gems')
    
    // Carica alcuni clienti con i loro livelli
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, name, current_level, points')
      .limit(10)
    
    if (levelsError || customersError) {
      return res.status(500).json({ 
        error: 'Database error',
        levelsError,
        customersError
      })
    }
    
    res.json({
      success: true,
      levels,
      customers,
      debug: {
        levelCount: levels?.length || 0,
        customerCount: customers?.length || 0,
        customersWithLevel: customers?.filter(c => c.current_level)?.length || 0
      }
    })
    
  } catch (error) {
    console.error('Debug error:', error)
    res.status(500).json({ error: error.message })
  }
}