// API Route per visualizzare landing pages pubbliche tramite slug
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://jexkalekaofsfcusdfjh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGthbGVrYW9mc2ZjdXNkZmpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYyNjEzNCwiZXhwIjoyMDY0MjAyMTM0fQ.43plaZecrTvbwkr7U7g2Ucogkd0VgKRUg9VkJ--7JCU'
)

export default async function handler(req, res) {
  const { slug } = req.query
  const { method } = req
  
  // Solo GET supportato per la visualizzazione pubblica
  if (method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
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
    
    // Genera HTML completo della landing page con SEO e analytics
    const fullHtml = generateLandingPageHtml(landingPage)
    
    // Imposta headers per SEO
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=300') // Cache 5 minuti
    
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
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${landingPage.meta_title || landingPage.title}">
  <meta property="og:description" content="${landingPage.meta_description || landingPage.description || ''}">
  <meta property="og:image" content="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png">
  <meta property="og:url" content="${process.env.SITE_URL || 'https://saporiecolori.net'}/landing/${landingPage.slug}">
  
  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:title" content="${landingPage.meta_title || landingPage.title}">
  <meta property="twitter:description" content="${landingPage.meta_description || landingPage.description || ''}">
  <meta property="twitter:image" content="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png">
  
  <!-- Favicon -->
  <link rel="icon" href="/favicon.ico">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  
  <!-- Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  
  <!-- CSS Custom -->
  <style>
    /* Reset CSS base */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #fff;
    }
    
    /* Responsive utilities */
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    @media (max-width: 768px) {
      .container {
        padding: 0 15px;
      }
    }
    
    /* Click tracking */
    .track-click {
      cursor: pointer;
      transition: transform 0.2s ease;
    }
    
    .track-click:hover {
      transform: translateY(-2px);
    }
    
    /* CSS della landing page */
    ${landingPage.css_content || ''}
  </style>
  
  <!-- Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=UA-XXXXXXX-X"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'UA-XXXXXXX-X');
    
    // Landing page view tracking
    gtag('event', 'page_view', {
      'page_title': '${landingPage.title}',
      'page_location': window.location.href,
      'content_group1': 'Landing Page'
    });
  </script>
</head>
<body>
  <!-- Landing Page Content -->
  ${landingPage.html_content}
  
  <!-- Click Tracking Script -->
  <script>
    // Track clicks su link e bottoni
    document.addEventListener('click', function(e) {
      const element = e.target.closest('a, button, .track-click');
      if (element) {
        // Analytics tracking
        if (typeof gtag !== 'undefined') {
          gtag('event', 'click', {
            'event_category': 'Landing Page',
            'event_label': element.textContent?.trim() || element.getAttribute('aria-label') || 'Unknown',
            'landing_page': '${landingPage.slug}'
          });
        }
        
        // Increment click count nel database
        fetch('/api/landing-pages/track-click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            landingPageId: '${landingPage.id}',
            elementText: element.textContent?.trim(),
            elementHref: element.href
          })
        }).catch(console.warn);
      }
    });
    
    // Track scroll depth
    let maxScroll = 0;
    window.addEventListener('scroll', function() {
      const scrollPercent = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        if (maxScroll >= 25 && maxScroll < 50) {
          gtag('event', 'scroll', { 'event_category': 'Landing Page', 'event_label': '25%' });
        } else if (maxScroll >= 50 && maxScroll < 75) {
          gtag('event', 'scroll', { 'event_category': 'Landing Page', 'event_label': '50%' });
        } else if (maxScroll >= 75) {
          gtag('event', 'scroll', { 'event_category': 'Landing Page', 'event_label': '75%' });
        }
      }
    });
    
    // OneSignal Web Push per re-engagement
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    OneSignalDeferred.push(function(OneSignal) {
      OneSignal.init({
        appId: "61a2318f-68f7-4a79-8beb-203c58bf8763",
        notifyButton: { enable: false },
        promptOptions: {
          slidedown: {
            prompts: [
              {
                type: "push",
                autoPrompt: false
              }
            ]
          }
        }
      });
      
      // Tag per identificare traffico da landing page
      OneSignal.User.addTag("landing_page_visited", "${landingPage.slug}");
      OneSignal.User.addTag("last_landing_page", "${landingPage.title}");
    });
  </script>
  
  <!-- OneSignal SDK -->
  <script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
  
  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "${landingPage.title}",
    "description": "${landingPage.description || ''}",
    "url": "${process.env.SITE_URL || 'https://saporiecolori.net'}/landing/${landingPage.slug}",
    "mainEntity": {
      "@type": "LocalBusiness",
      "name": "Sapori & Colori",
      "image": "https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png",
      "url": "https://saporiecolori.net",
      "telephone": "+393926568550",
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "IT"
      }
    }
  }
  </script>
</body>
</html>`
}