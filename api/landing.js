// API Route unificata per tutte le operazioni sulle landing pages
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://jexkalekaofsfcusdfjh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGthbGVrYW9mc2ZjdXNkZmpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYyNjEzNCwiZXhwIjoyMDY0MjAyMTM0fQ.43plaZecrTvbwkr7U7g2Ucogkd0VgKRUg9VkJ--7JCU'
)

export default async function handler(req, res) {
  const { action, slug } = req.query
  const { method } = req
  
  try {
    // Route per mostrare landing page pubblica
    if (action === 'show' || slug) {
      return await handleShowPage(req, res)
    }
    
    // Route per tracciare click
    if (action === 'track') {
      return await handleTrackClick(req, res)
    }
    
    // Route CRUD standard per landing pages
    switch (method) {
      case 'GET':
        return await handleGet(req, res)
      case 'POST':
        return await handlePost(req, res)
      case 'PUT':
        return await handlePut(req, res)
      case 'DELETE':
        return await handleDelete(req, res)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('❌ Errore API landing:', error)
    return res.status(500).json({ 
      error: 'Errore server',
      details: error.message 
    })
  }
}

// ===================================
// SHOW PAGE (ex /api/show-page.js)
// ===================================
async function handleShowPage(req, res) {
  const { slug } = req.query
  
  // Solo GET supportato
  if (req.method !== 'GET') {
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

// ===================================
// TRACK CLICK (ex /api/landing-pages/track-click.js)
// ===================================
async function handleTrackClick(req, res) {
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

// ===================================
// CRUD OPERATIONS (ex /api/landing-pages.js)
// ===================================

// GET: Lista tutte le landing pages o una specifica
async function handleGet(req, res) {
  const { id, slug } = req.query
  
  try {
    let query = supabase
      .from('landing_pages')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    
    if (id) {
      query = query.eq('id', id).single()
    } else if (slug) {
      query = query.eq('slug', slug).single()
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('❌ Errore caricamento landing pages:', error)
      return res.status(400).json({ error: error.message })
    }
    
    return res.status(200).json({ 
      success: true, 
      data: data || [],
      count: Array.isArray(data) ? data.length : (data ? 1 : 0)
    })
    
  } catch (error) {
    console.error('❌ Errore GET landing pages:', error)
    return res.status(500).json({ error: error.message })
  }
}

// POST: Crea nuova landing page
async function handlePost(req, res) {
  const { 
    title, 
    description, 
    slug, 
    html_content, 
    css_content, 
    grapesjs_data,
    meta_title,
    meta_description,
    is_published = false 
  } = req.body
  
  // Validazione
  if (!title || !slug || !html_content) {
    return res.status(400).json({ 
      error: 'Campi obbligatori: title, slug, html_content' 
    })
  }
  
  try {
    // Genera slug automatico se non fornito
    const finalSlug = slug || generateSlugFromTitle(title)
    
    // Verifica che lo slug sia unico
    const { data: existing } = await supabase
      .from('landing_pages')
      .select('id')
      .eq('slug', finalSlug)
      .single()
    
    if (existing) {
      return res.status(400).json({ 
        error: 'Slug già esistente. Scegli un nome diverso.' 
      })
    }
    
    const { data, error } = await supabase
      .from('landing_pages')
      .insert({
        title,
        description,
        slug: finalSlug,
        html_content,
        css_content: css_content || '',
        grapesjs_data: grapesjs_data || {},
        meta_title: meta_title || title,
        meta_description: meta_description || description,
        is_published,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        view_count: 0
      })
      .select()
      .single()
    
    if (error) {
      console.error('❌ Errore creazione landing page:', error)
      return res.status(400).json({ error: error.message })
    }
    
    console.log('✅ Landing page creata:', data.id, '-', data.slug)
    
    return res.status(201).json({ 
      success: true, 
      data,
      public_url: `/api/landing?action=show&slug=${data.slug}`
    })
    
  } catch (error) {
    console.error('❌ Errore POST landing page:', error)
    return res.status(500).json({ error: error.message })
  }
}

// PUT: Aggiorna landing page esistente
async function handlePut(req, res) {
  const { 
    id,
    title, 
    description, 
    slug, 
    html_content, 
    css_content, 
    grapesjs_data,
    meta_title,
    meta_description,
    is_published 
  } = req.body
  
  if (!id) {
    return res.status(400).json({ error: 'ID obbligatorio per aggiornamento' })
  }
  
  try {
    // Se viene cambiato lo slug, verifica unicità
    if (slug) {
      const { data: existing } = await supabase
        .from('landing_pages')
        .select('id')
        .eq('slug', slug)
        .neq('id', id)
        .single()
      
      if (existing) {
        return res.status(400).json({ 
          error: 'Slug già esistente. Scegli un nome diverso.' 
        })
      }
    }
    
    const updateData = {
      updated_at: new Date().toISOString()
    }
    
    // Aggiorna solo i campi forniti
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (slug !== undefined) updateData.slug = slug
    if (html_content !== undefined) updateData.html_content = html_content
    if (css_content !== undefined) updateData.css_content = css_content
    if (grapesjs_data !== undefined) updateData.grapesjs_data = grapesjs_data
    if (meta_title !== undefined) updateData.meta_title = meta_title
    if (meta_description !== undefined) updateData.meta_description = meta_description
    if (is_published !== undefined) updateData.is_published = is_published
    
    const { data, error } = await supabase
      .from('landing_pages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('❌ Errore aggiornamento landing page:', error)
      return res.status(400).json({ error: error.message })
    }
    
    console.log('✅ Landing page aggiornata:', data.id, '-', data.slug)
    
    return res.status(200).json({ 
      success: true, 
      data,
      public_url: `/api/landing?action=show&slug=${data.slug}`
    })
    
  } catch (error) {
    console.error('❌ Errore PUT landing page:', error)
    return res.status(500).json({ error: error.message })
  }
}

// DELETE: Elimina landing page (soft delete)
async function handleDelete(req, res) {
  const { id } = req.query
  
  if (!id) {
    return res.status(400).json({ error: 'ID obbligatorio per eliminazione' })
  }
  
  try {
    const { data, error } = await supabase
      .from('landing_pages')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('❌ Errore eliminazione landing page:', error)
      return res.status(400).json({ error: error.message })
    }
    
    console.log('✅ Landing page eliminata (soft delete):', data.id)
    
    return res.status(200).json({ 
      success: true, 
      message: 'Landing page eliminata con successo'
    })
    
  } catch (error) {
    console.error('❌ Errore DELETE landing page:', error)
    return res.status(500).json({ error: error.message })
  }
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

function generateLandingPageHtml(landingPage) {
  // Controlla se l'HTML content è vuoto o troppo corto
  const hasValidContent = landingPage.html_content && landingPage.html_content.trim().length > 50;
  
  // Genera HTML di fallback per landing pages con contenuto vuoto
  const fallbackContent = `
    <div style="background: linear-gradient(135deg, #D4AF37 0%, #FFD700 100%); padding: 40px 20px; text-align: center; color: #8B4513; min-height: 100vh; display: flex; flex-direction: column; justify-content: center;">
      <img src="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png" alt="Sapori & Colori" style="height: 80px; margin-bottom: 20px;" />
      <h1 style="margin: 0; font-size: 2.5em; font-weight: bold; margin-bottom: 20px;">${landingPage.title || 'Sapori & Colori'}</h1>
      <p style="margin: 10px 0 0 0; font-size: 1.2em; margin-bottom: 40px;">${landingPage.description || 'Landing page in costruzione'}</p>
      
      <div style="background: rgba(255,255,255,0.9); padding: 30px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto;">
        <h3 style="color: #8B4513; margin-bottom: 15px;">🚧 Contenuto in aggiornamento</h3>
        <p style="font-size: 1.1em; margin-bottom: 25px; color: #666;">Questa landing page è stata creata ma il contenuto non è ancora disponibile.</p>
        
        <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap; margin-top: 20px;">
          <a href="tel:+393926568550" style="background: #D4AF37; color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; font-weight: bold;">📞 Chiamaci</a>
          <a href="https://wa.me/393926568550" style="background: #25D366; color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; font-weight: bold;">💬 WhatsApp</a>
        </div>
      </div>
      
      <div style="margin-top: 40px; font-size: 0.9em; opacity: 0.8;">
        <p>📧 Creato il: ${new Date(landingPage.created_at).toLocaleDateString('it-IT')}</p>
      </div>
    </div>`;
  
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
  ${hasValidContent ? landingPage.html_content : fallbackContent}
  
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

// Utility: Genera slug da titolo
function generateSlugFromTitle(title) {
  return title
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
}