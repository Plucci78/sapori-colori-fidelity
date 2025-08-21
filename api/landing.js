// API Route unificata per tutte le operazioni sulle landing pages
import { createClient } from '@supabase/supabase-js'
const screenshotGenerator = require('../utils/screenshotGenerator.js')

const supabase = createClient(
  'https://jexkalekaofsfcusdfjh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGthbGVrYW9mc2ZjdXNkZmpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYyNjEzNCwiZXhwIjoyMDY0MjAyMTM0fQ.43plaZecrTvbwkr7U7g2Ucogkd0VgKRUg9VkJ--7JCU'
)

// Funzione per generare thumbnail automaticamente
async function generateThumbnailForLandingPage(landingPageId, htmlContent, cssContent) {
  try {
    console.log(`📸 Generando thumbnail per landing page ${landingPageId}...`);
    
    const thumbnail = await screenshotGenerator.createLandingPageThumbnail(
      landingPageId, 
      htmlContent, 
      cssContent,
      {
        width: 400,
        height: 300,
        quality: 80
      }
    );
    
    console.log(`✅ Thumbnail generato: ${thumbnail.publicPath}`);
    return thumbnail.publicPath;
    
  } catch (error) {
    console.warn(`⚠️ Fallback placeholder per thumbnail ${landingPageId}:`, error.message);
    return '/placeholder-thumbnail.jpg'; // Fallback
  }
}

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
    
    // Route per template
    if (action === 'templates') {
      return await handleTemplates(req, res)
    }
    
    // Route per creare template da landing esistente
    if (action === 'save-template') {
      return await handleSaveAsTemplate(req, res)
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
        view_count: 0,
        thumbnail_url: '/placeholder-thumbnail.jpg' // Placeholder iniziale
      })
      .select()
      .single()
    
    if (error) {
      console.error('❌ Errore creazione landing page:', error)
      return res.status(400).json({ error: error.message })
    }
    
    console.log('✅ Landing page creata:', data.id, '-', data.slug)
    
    // Genera thumbnail in background (non bloccante)
    if (html_content && html_content.trim()) {
      generateThumbnailForLandingPage(data.id, html_content, css_content)
        .then(async (thumbnailUrl) => {
          // Aggiorna record con thumbnail URL
          await supabase
            .from('landing_pages')
            .update({ thumbnail_url: thumbnailUrl })
            .eq('id', data.id);
          console.log(`✅ Thumbnail aggiornato per landing page ${data.id}: ${thumbnailUrl}`);
        })
        .catch(error => {
          console.warn(`⚠️ Errore aggiornamento thumbnail ${data.id}:`, error);
        });
    }
    
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
    
    // Rigenera thumbnail se il contenuto HTML/CSS è cambiato
    if (html_content !== undefined || css_content !== undefined) {
      if (data.html_content && data.html_content.trim()) {
        generateThumbnailForLandingPage(data.id, data.html_content, data.css_content)
          .then(async (thumbnailUrl) => {
            // Aggiorna record con nuovo thumbnail URL
            await supabase
              .from('landing_pages')
              .update({ thumbnail_url: thumbnailUrl })
              .eq('id', data.id);
            console.log(`✅ Thumbnail rigenerato per landing page ${data.id}: ${thumbnailUrl}`);
          })
          .catch(error => {
            console.warn(`⚠️ Errore rigenerazione thumbnail ${data.id}:`, error);
          });
      }
    }
    
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

// ===================================
// TEMPLATE FUNCTIONS
// ===================================

// GET templates (predefiniti + salvati dall'utente)
async function handleTemplates(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    // Carica template salvati dall'utente (tabella dedicata)
    const { data: userTemplates, error } = await supabase
      .from('landing_page_templates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.warn('⚠️ Tabella template dedicata non disponibile:', error.message)
    }

    // Carica anche template salvati come landing pages (fallback)
    const { data: landingPageTemplates, error: landingError } = await supabase
      .from('landing_pages')
      .select('*')
      .ilike('title', '[TEMPLATE]%') // Cerca titoli che iniziano con [TEMPLATE]
      .eq('is_active', true)
      // Rimuovi il filtro is_published per permettere template anche se pubblicati
      .order('created_at', { ascending: false })
    
    if (landingError) {
      console.warn('⚠️ Errore caricamento template da landing pages:', landingError.message)
    }

    console.log('📋 Template trovati:', {
      dedicatedTable: userTemplates?.length || 0,
      fromLandingPages: landingPageTemplates?.length || 0
    });
    
    // Template predefiniti
    const predefinedTemplates = getPredefinedTemplates()
    
    // Combina tutti i template
    const allTemplates = [
      ...predefinedTemplates,
      // Template da tabella dedicata
      ...(userTemplates || []).map(t => ({
        ...t,
        type: 'user',
        preview_image: t.thumbnail_url || t.preview_image || '/placeholder-template.png'
      })),
      // Template da landing pages (fallback)
      ...(landingPageTemplates || []).map(t => ({
        id: t.id,
        name: t.title.replace('[TEMPLATE] ', ''), // Rimuovi prefisso dal nome
        description: t.description,
        html_content: t.html_content,
        css_content: t.css_content,
        grapesjs_data: t.grapesjs_data,
        category: 'custom',
        type: 'user',
        created_at: t.created_at,
        preview_image: t.thumbnail_url || '/placeholder-template.png'
      }))
    ]
    
    return res.status(200).json({
      success: true,
      data: allTemplates
    })
    
  } catch (error) {
    console.error('❌ Errore GET templates:', error)
    return res.status(500).json({ error: error.message })
  }
}

// POST salva landing page come template
async function handleSaveAsTemplate(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  const { landing_page_id, template_name, template_description } = req.body
  
  console.log('🔍 Save template request:', {
    landing_page_id,
    template_name,
    template_description
  });
  
  if (!landing_page_id || !template_name) {
    return res.status(400).json({ 
      error: 'landing_page_id e template_name sono obbligatori' 
    })
  }
  
  try {
    // Carica la landing page originale
    console.log('📖 Caricamento landing page originale:', landing_page_id);
    const { data: landingPage, error: landingError } = await supabase
      .from('landing_pages')
      .select('*')
      .eq('id', landing_page_id)
      .single()
    
    if (landingError) {
      console.error('❌ Errore caricamento landing page:', landingError);
      return res.status(404).json({ 
        error: 'Landing page non trovata', 
        details: landingError.message 
      })
    }
    
    if (!landingPage) {
      console.error('❌ Landing page non esistente');
      return res.status(404).json({ error: 'Landing page non trovata' })
    }
    
    console.log('✅ Landing page caricata:', {
      id: landingPage.id,
      title: landingPage.title,
      hasHtml: !!landingPage.html_content,
      hasCss: !!landingPage.css_content
    });

    // Prova prima a creare la tabella templates se non esiste, altrimenti usa approccio alternativo
    try {
      // Crea il template nella tabella dedicata
      console.log('💾 Tentativo creazione template in tabella dedicata...');
      const { data: template, error: templateError } = await supabase
        .from('landing_page_templates')
        .insert({
          name: template_name,
          description: template_description || `Template creato da: ${landingPage.title}`,
          html_content: landingPage.html_content,
          css_content: landingPage.css_content,
          grapesjs_data: landingPage.grapesjs_data,
          category: 'custom',
          is_active: true,
          created_at: new Date().toISOString(),
          thumbnail_url: '/placeholder-thumbnail.jpg' // Placeholder iniziale
        })
        .select()
        .single()
      
      if (templateError) {
        throw templateError;
      }
      
      console.log('✅ Template creato in tabella dedicata:', template.id, '-', template.name);
      
      // Genera thumbnail per template in background
      if (landingPage.html_content && landingPage.html_content.trim()) {
        generateThumbnailForLandingPage(`template_${template.id}`, landingPage.html_content, landingPage.css_content)
          .then(async (thumbnailUrl) => {
            await supabase
              .from('landing_page_templates')
              .update({ thumbnail_url: thumbnailUrl })
              .eq('id', template.id);
            console.log(`✅ Thumbnail template aggiornato ${template.id}: ${thumbnailUrl}`);
          })
          .catch(error => {
            console.warn(`⚠️ Errore thumbnail template ${template.id}:`, error);
          });
      }
      
      return res.status(201).json({
        success: true,
        data: template,
        message: 'Template salvato con successo!',
        type: 'dedicated_table'
      })
      
    } catch (templateTableError) {
      console.warn('⚠️ Tabella templates non disponibile, uso approccio alternativo:', templateTableError.message);
      
      // Approccio alternativo: salva come landing page con flag template
      console.log('💾 Salvataggio come landing page template...');
      
      const templateSlug = `template-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      
      const { data: templatePage, error: templatePageError } = await supabase
        .from('landing_pages')
        .insert({
          title: `[TEMPLATE] ${template_name}`,
          description: template_description || `Template creato da: ${landingPage.title}`,
          slug: templateSlug,
          html_content: landingPage.html_content,
          css_content: landingPage.css_content,
          grapesjs_data: landingPage.grapesjs_data,
          meta_title: `Template: ${template_name}`,
          meta_description: template_description || `Template per landing pages`,
          is_published: false, // I template non sono pubblicati - campo esistente
          is_active: true,     // Campo esistente
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          thumbnail_url: '/placeholder-thumbnail.jpg' // Placeholder iniziale
        })
        .select()
        .single()
      
      if (templatePageError) {
        console.error('❌ Errore creazione template alternativo:', templatePageError);
        return res.status(400).json({ 
          error: 'Errore salvataggio template', 
          details: templatePageError.message 
        })
      }
      
      console.log('✅ Template salvato come landing page:', templatePage.id, '-', templatePage.title);
      
      // Genera thumbnail per template fallback in background
      if (landingPage.html_content && landingPage.html_content.trim()) {
        generateThumbnailForLandingPage(`template_${templatePage.id}`, landingPage.html_content, landingPage.css_content)
          .then(async (thumbnailUrl) => {
            await supabase
              .from('landing_pages')
              .update({ thumbnail_url: thumbnailUrl })
              .eq('id', templatePage.id);
            console.log(`✅ Thumbnail template fallback aggiornato ${templatePage.id}: ${thumbnailUrl}`);
          })
          .catch(error => {
            console.warn(`⚠️ Errore thumbnail template fallback ${templatePage.id}:`, error);
          });
      }
      
      return res.status(201).json({
        success: true,
        data: {
          id: templatePage.id,
          name: template_name,
          description: template_description,
          html_content: templatePage.html_content,
          css_content: templatePage.css_content,
          category: 'custom',
          type: 'user',
          created_at: templatePage.created_at
        },
        message: 'Template salvato con successo!',
        type: 'landing_page_fallback'
      })
    }
    
  } catch (error) {
    console.error('❌ Errore generale save template:', error);
    return res.status(500).json({ 
      error: 'Errore server durante salvataggio template',
      details: error.message 
    })
  }
}

// Template predefiniti
function getPredefinedTemplates() {
  return [
    {
      id: 'template-restaurant',
      name: 'Ristorante Classico',
      description: 'Template per ristoranti con menu e prenotazioni',
      category: 'ristorante',
      type: 'predefined',
      preview_image: '/templates/restaurant-preview.png',
      html_content: `
        <div style="background: linear-gradient(135deg, #8B4513 0%, #D4AF37 100%); padding: 60px 20px; text-align: center; color: white;">
          <img src="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png" alt="Logo" style="height: 100px; margin-bottom: 30px;" />
          <h1 style="font-size: 3em; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">Sapori & Colori</h1>
          <p style="font-size: 1.5em; margin: 20px 0;">Il sapore autentico della tradizione italiana</p>
        </div>
        
        <div style="padding: 80px 20px; background: #f8f9fa;">
          <div style="max-width: 1200px; margin: 0 auto; text-align: center;">
            <h2 style="font-size: 2.5em; color: #8B4513; margin-bottom: 40px;">La Nostra Cucina</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 40px; margin: 60px 0;">
              
              <div style="background: white; padding: 40px; border-radius: 15px; box-shadow: 0 8px 25px rgba(0,0,0,0.1);">
                <div style="font-size: 3em; margin-bottom: 20px;">🍝</div>
                <h3 style="color: #8B4513; margin-bottom: 15px;">Pasta Fresca</h3>
                <p style="color: #666; line-height: 1.6;">Pasta fatta in casa ogni giorno con ingredienti di prima qualità</p>
              </div>
              
              <div style="background: white; padding: 40px; border-radius: 15px; box-shadow: 0 8px 25px rgba(0,0,0,0.1);">
                <div style="font-size: 3em; margin-bottom: 20px;">🍕</div>
                <h3 style="color: #8B4513; margin-bottom: 15px;">Pizza Napoletana</h3>
                <p style="color: #666; line-height: 1.6;">Cotta nel forno a legna secondo la tradizione napoletana</p>
              </div>
              
              <div style="background: white; padding: 40px; border-radius: 15px; box-shadow: 0 8px 25px rgba(0,0,0,0.1);">
                <div style="font-size: 3em; margin-bottom: 20px;">🥩</div>
                <h3 style="color: #8B4513; margin-bottom: 15px;">Carne alla Griglia</h3>
                <p style="color: #666; line-height: 1.6;">Carni selezionate e grigliate alla perfezione</p>
              </div>
              
            </div>
          </div>
        </div>
        
        <div style="background: #8B4513; color: white; padding: 60px 20px; text-align: center;">
          <h2 style="margin-bottom: 30px;">Prenota il Tuo Tavolo</h2>
          <p style="font-size: 1.2em; margin-bottom: 40px;">Chiamaci o scrivici su WhatsApp per prenotare</p>
          <div style="display: flex; justify-content: center; gap: 30px; flex-wrap: wrap;">
            <a href="tel:+393926568550" style="background: #D4AF37; color: white; padding: 20px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 1.1em;">📞 Chiama Ora</a>
            <a href="https://wa.me/393926568550" style="background: #25D366; color: white; padding: 20px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 1.1em;">💬 WhatsApp</a>
          </div>
        </div>`,
      css_content: `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Georgia', serif; line-height: 1.6; }
        @media (max-width: 768px) {
          h1 { font-size: 2em !important; }
          h2 { font-size: 1.8em !important; }
          .grid { grid-template-columns: 1fr !important; }
        }`
    },
    
    {
      id: 'template-promo',
      name: 'Offerta Speciale',
      description: 'Template per promozioni e offerte limitate',
      category: 'promozione',
      type: 'predefined',
      preview_image: '/templates/promo-preview.png',
      html_content: `
        <div style="background: linear-gradient(45deg, #FF6B35 0%, #F7931E 100%); padding: 40px 20px; text-align: center; color: white; position: relative; overflow: hidden;">
          <div style="position: absolute; top: -50px; right: -50px; background: rgba(255,255,255,0.1); width: 200px; height: 200px; border-radius: 50%; animation: pulse 2s infinite;"></div>
          <h1 style="font-size: 3.5em; margin: 0; text-shadow: 3px 3px 6px rgba(0,0,0,0.3);">🔥 OFFERTA LIMITATA!</h1>
          <p style="font-size: 1.8em; margin: 20px 0;">Solo per oggi - Non perdere questa occasione!</p>
        </div>
        
        <div style="padding: 80px 20px; background: white; text-align: center;">
          <div style="max-width: 800px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #FF6B35, #F7931E); color: white; padding: 60px 40px; border-radius: 20px; box-shadow: 0 15px 35px rgba(0,0,0,0.2); margin-bottom: 50px;">
              <div style="font-size: 5em; margin-bottom: 20px;">50%</div>
              <h2 style="font-size: 2.5em; margin-bottom: 20px;">DI SCONTO</h2>
              <p style="font-size: 1.3em; opacity: 0.9;">Su tutti i prodotti selezionati</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 40px; border-radius: 15px; margin-bottom: 40px;">
              <h3 style="color: #333; margin-bottom: 20px; font-size: 1.8em;">⏰ Offerta valida fino a mezzanotte!</h3>
              <p style="color: #666; font-size: 1.2em;">Mostra questa pagina in negozio per ottenere lo sconto</p>
            </div>
            
            <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
              <a href="tel:+393926568550" style="background: #FF6B35; color: white; padding: 20px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 1.2em; box-shadow: 0 5px 15px rgba(255,107,53,0.4);">📞 Chiama Subito</a>
              <a href="https://wa.me/393926568550" style="background: #25D366; color: white; padding: 20px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 1.2em; box-shadow: 0 5px 15px rgba(37,211,102,0.4);">💬 WhatsApp</a>
            </div>
          </div>
        </div>`,
      css_content: `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.1); opacity: 0.1; }
          100% { transform: scale(1); opacity: 0.3; }
        }`
    },
    
    {
      id: 'template-event',
      name: 'Evento Speciale',
      description: 'Template per eventi, feste e celebrazioni',
      category: 'evento',
      type: 'predefined',
      preview_image: '/templates/event-preview.png',
      html_content: `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 80px 20px; text-align: center; color: white;">
          <h1 style="font-size: 3.5em; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">🎉 EVENTO SPECIALE</h1>
          <p style="font-size: 1.8em; margin: 30px 0;">Una serata indimenticabile ti aspetta</p>
          <div style="background: rgba(255,255,255,0.2); padding: 20px; border-radius: 15px; display: inline-block; margin-top: 20px;">
            <p style="font-size: 1.3em; margin: 0;">📅 Sabato 25 Gennaio 2025 - ore 20:00</p>
          </div>
        </div>
        
        <div style="padding: 80px 20px; background: white;">
          <div style="max-width: 1000px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 60px;">
              <h2 style="font-size: 2.5em; color: #667eea; margin-bottom: 20px;">Cosa Ti Aspetta</h2>
              <p style="font-size: 1.2em; color: #666; max-width: 600px; margin: 0 auto;">Una serata magica con musica, buon cibo e divertimento assicurato per tutti</p>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 40px; margin: 60px 0;">
              
              <div style="text-align: center; padding: 30px;">
                <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 2em;">🎵</div>
                <h3 style="color: #333; margin-bottom: 15px;">Musica Live</h3>
                <p style="color: #666;">Band dal vivo con i migliori successi</p>
              </div>
              
              <div style="text-align: center; padding: 30px;">
                <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 2em;">🍽️</div>
                <h3 style="color: #333; margin-bottom: 15px;">Cena Gourmet</h3>
                <p style="color: #666;">Menu speciale preparato dai nostri chef</p>
              </div>
              
              <div style="text-align: center; padding: 30px;">
                <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 2em;">🎊</div>
                <h3 style="color: #333; margin-bottom: 15px;">Intrattenimento</h3>
                <p style="color: #666;">Sorprese e animazione per tutta la serata</p>
              </div>
              
            </div>
            
            <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 50px; border-radius: 20px; text-align: center; margin-top: 60px;">
              <h3 style="font-size: 2em; margin-bottom: 20px;">Prenota Subito!</h3>
              <p style="font-size: 1.2em; margin-bottom: 30px;">Posti limitati - Non perdere l'occasione</p>
              <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
                <a href="tel:+393926568550" style="background: white; color: #667eea; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 1.1em;">📞 Prenota Ora</a>
                <a href="https://wa.me/393926568550" style="background: #25D366; color: white; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 1.1em;">💬 WhatsApp</a>
              </div>
            </div>
          </div>
        </div>`,
      css_content: `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; }
        @media (max-width: 768px) {
          h1 { font-size: 2.5em !important; }
          h2 { font-size: 2em !important; }
        }`
    }
  ]
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