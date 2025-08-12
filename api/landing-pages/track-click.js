// API Route per tracciare click sulle landing pages
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://jexkalekaofsfcusdfjh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGthbGVrYW9mc2ZjdXNkZmpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYyNjEzNCwiZXhwIjoyMDY0MjAyMTM0fQ.43plaZecrTvbwkr7U7g2Ucogkd0VgKRUg9VkJ--7JCU'
)

export default async function handler(req, res) {
  // Solo POST supportato
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    const { landingPageId, elementText, elementHref } = req.body
    
    if (!landingPageId) {
      return res.status(400).json({ error: 'Landing page ID richiesto' })
    }
    
    // Incrementa click count nella landing page
    const { error: updateError } = await supabase
      .from('landing_pages')
      .update({ 
        click_count: supabase.raw('click_count + 1')
      })
      .eq('id', landingPageId)
    
    if (updateError) {
      console.error('❌ Errore incremento click count:', updateError)
    }
    
    // Log del click per analytics avanzate (opzionale)
    try {
      await supabase
        .from('landing_page_clicks')
        .insert({
          landing_page_id: landingPageId,
          element_text: elementText?.substring(0, 100),
          element_href: elementHref?.substring(0, 500),
          clicked_at: new Date().toISOString(),
          user_agent: req.headers['user-agent']?.substring(0, 500),
          ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress
        })
    } catch (logError) {
      console.warn('⚠️ Errore log click (non critico):', logError)
    }
    
    return res.status(200).json({ success: true })
    
  } catch (error) {
    console.error('❌ Errore track click:', error)
    return res.status(500).json({ 
      error: 'Errore server',
      details: error.message 
    })
  }
}