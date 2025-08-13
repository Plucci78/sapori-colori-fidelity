// API Route per mostrare landing pages pubbliche
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://jexkalekaofsfcusdfjh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGthbGVrYW9mc2ZjdXNkZmpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYyNjEzNCwiZXhwIjoyMDY0MjAyMTM0fQ.43plaZecrTvbwkr7U7g2Ucogkd0VgKRUg9VkJ--7JCU'
)

export default async function handler(req, res) {
  const { slug } = req.query
  const { method } = req
  
  // Solo GET supportato
  if (method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  if (!slug) {
    return res.status(400).json({ error: 'Slug obbligatorio' })
  }
  
  try {
    // Carica landing page dal database
    const { data: landingPage, error } = await supabase
      .from('landing_pages')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .eq('is_active', true)
      .single()
    
    if (error || !landingPage) {
      console.log('❌ Landing page non trovata:', slug)
      return res.status(404).json({ error: 'Landing page non trovata' })
    }
    
    // Incrementa view count
    try {
      await supabase
        .from('landing_pages')
        .update({ 
          view_count: (landingPage.view_count || 0) + 1 
        })
        .eq('id', landingPage.id)
    } catch (viewError) {
      console.warn('⚠️ Errore incremento view count:', viewError)
    }
    
    // Genera HTML completo della landing page
    const fullHtml = generateLandingPageHtml(landingPage)
    
    // Imposta headers per HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=300')
    
    return res.status(200).send(fullHtml)
    
  } catch (error) {
    console.error('❌ Errore caricamento landing page:', error)
    return res.status(500).json({ 
      error: 'Errore server',
      details: error.message 
    })
  }
}

function generateLandingPageHtml(landingPage) {
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${landingPage.meta_title || landingPage.title}</title>
  <meta name="description" content="${landingPage.meta_description || landingPage.description || ''}">
  
  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${landingPage.meta_title || landingPage.title}">
  <meta property="og:description" content="${landingPage.meta_description || landingPage.description || ''}">
  <meta property="og:image" content="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png">
  
  <!-- CSS -->
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #fff;
    }
    
    /* CSS della landing page */
    ${landingPage.css_content || ''}
  </style>
</head>
<body>
  <!-- Landing Page Content -->
  ${landingPage.html_content}
  
  <!-- OneSignal -->
  <script>
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    OneSignalDeferred.push(function(OneSignal) {
      OneSignal.init({
        appId: "61a2318f-68f7-4a79-8beb-203c58bf8763",
        notifyButton: { enable: false }
      });
      
      OneSignal.User.addTag("landing_page_visited", "${landingPage.slug}");
    });
  </script>
  <script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
</body>
</html>`
}