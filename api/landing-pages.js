// API Route per gestire landing pages create con GrapesJS  
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://jexkalekaofsfcusdfjh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGthbGVrYW9mc2ZjdXNkZmpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYyNjEzNCwiZXhwIjoyMDY0MjAyMTM0fQ.43plaZecrTvbwkr7U7g2Ucogkd0VgKRUg9VkJ--7JCU'
)

export default async function handler(req, res) {
  const { method } = req
  
  try {
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
    console.error('❌ Errore API landing pages:', error)
    return res.status(500).json({ 
      error: 'Errore server',
      details: error.message 
    })
  }
}

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
      public_url: `/landing/${data.slug}`
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
      public_url: `/landing/${data.slug}`
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