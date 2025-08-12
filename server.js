import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'

const app = express()
const PORT = 3001

// Middleware
app.use(cors())
app.use(express.json())

// Supabase client
const supabase = createClient(
  'https://jexkalekaofsfcusdfjh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGthbGVrYW9mc2ZjdXNkZmpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYyNjEzNCwiZXhwIjoyMDY0MjAyMTM0fQ.43plaZecrTvbwkr7U7g2Ucogkd0VgKRUg9VkJ--7JCU'
)

// Routes
app.get('/api/landing-pages', async (req, res) => {
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
      console.error('L Errore caricamento landing pages:', error)
      return res.status(400).json({ error: error.message })
    }
    
    return res.status(200).json({ 
      success: true, 
      data: data || [],
      count: Array.isArray(data) ? data.length : (data ? 1 : 0)
    })
    
  } catch (error) {
    console.error('L Errore GET landing pages:', error)
    return res.status(500).json({ error: error.message })
  }
})

app.post('/api/landing-pages', async (req, res) => {
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
  
  if (!title || !slug || !html_content) {
    return res.status(400).json({ 
      error: 'Campi obbligatori: title, slug, html_content' 
    })
  }
  
  try {
    const finalSlug = slug || generateSlugFromTitle(title)
    
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
      console.error('L Errore creazione landing page:', error)
      return res.status(400).json({ error: error.message })
    }
    
    console.log(' Landing page creata:', data.id, '-', data.slug)
    
    return res.status(201).json({ 
      success: true, 
      data,
      public_url: `/landing/${data.slug}`
    })
    
  } catch (error) {
    console.error('L Errore POST landing page:', error)
    return res.status(500).json({ error: error.message })
  }
})

app.put('/api/landing-pages', async (req, res) => {
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
      console.error('L Errore aggiornamento landing page:', error)
      return res.status(400).json({ error: error.message })
    }
    
    console.log(' Landing page aggiornata:', data.id, '-', data.slug)
    
    return res.status(200).json({ 
      success: true, 
      data,
      public_url: `/landing/${data.slug}`
    })
    
  } catch (error) {
    console.error('L Errore PUT landing page:', error)
    return res.status(500).json({ error: error.message })
  }
})

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

app.listen(PORT, () => {
  console.log(`=€ Server API in esecuzione su http://localhost:${PORT}`)
  console.log(`=Ë Endpoint disponibili:`)
  console.log(`   GET    /api/landing-pages`)
  console.log(`   POST   /api/landing-pages`)
  console.log(`   PUT    /api/landing-pages`)
})