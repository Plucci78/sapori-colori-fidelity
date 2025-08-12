import React, { useEffect, useRef, useState } from 'react'
import grapesjs from 'grapesjs'
import 'grapesjs/dist/css/grapes.min.css'

const PageBuilder = () => {
  const editorRef = useRef(null)
  const [editor, setEditor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [landingPages, setLandingPages] = useState([])
  const [currentPage, setCurrentPage] = useState(null)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState({ show: false, message: '', type: '' })

  useEffect(() => {
    loadLandingPages()
  }, [])

  useEffect(() => {
    if (!editorRef.current || editor) return

    console.log('🎨 Inizializzazione GrapesJS Page Builder...')

    const grapesEditor = grapesjs.init({
      container: editorRef.current,
      height: '100vh',
      width: '100%',
      
      // Configurazione Sapori & Colori
      projectName: 'Sapori & Colori Landing Pages',
      
      // Storage per salvare le landing
      storageManager: {
        type: 'local',
        autosave: true,
        autoload: true,
        stepsBeforeSave: 3
      },

      // Device responsive
      deviceManager: {
        devices: [
          {
            name: 'Desktop',
            width: '1200px',
            height: '800px'
          },
          {
            name: 'Tablet',
            width: '768px', 
            height: '1024px'
          },
          {
            name: 'Mobile',
            width: '375px',
            height: '667px'
          }
        ]
      },

      // Blocchi personalizzati Sapori & Colori
      blockManager: {
        appendTo: '.blocks-container',
        blocks: [
          {
            id: 'sapori-header',
            label: '🏪 Header Sapori & Colori',
            content: `
              <div style="background: linear-gradient(135deg, #D4AF37 0%, #FFD700 100%); padding: 40px 20px; text-align: center; color: #8B4513;">
                <img src="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png" alt="Sapori & Colori" style="height: 80px; margin-bottom: 20px;">
                <h1 style="margin: 0; font-size: 2.5em; font-weight: bold;">Sapori & Colori</h1>
                <p style="margin: 10px 0 0 0; font-size: 1.2em;">Il sapore autentico della tradizione</p>
              </div>
            `,
            category: 'Sapori & Colori'
          },
          {
            id: 'promo-section',
            label: '🎁 Sezione Promozione',
            content: `
              <div style="padding: 60px 20px; text-align: center; background: #f8f9fa;">
                <h2 style="font-size: 2.5em; color: #D4AF37; margin-bottom: 20px;">🍕 OFFERTA SPECIALE!</h2>
                <p style="font-size: 1.3em; color: #333; margin-bottom: 30px;">La tua pizza preferita con il 30% di sconto</p>
                <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto;">
                  <h3 style="color: #8B4513; margin-bottom: 15px;">Solo oggi!</h3>
                  <p style="font-size: 1.1em; margin-bottom: 25px;">Mostra questa pagina in negozio</p>
                  <a href="tel:+393926568550" style="background: #D4AF37; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">📞 Chiama Ora!</a>
                </div>
              </div>
            `,
            category: 'Sapori & Colori'
          },
          {
            id: 'contact-cta',
            label: '📞 Call to Action Contatti',
            content: `
              <div style="background: #8B4513; color: white; padding: 40px 20px; text-align: center;">
                <h3 style="margin-bottom: 20px;">Contattaci Subito!</h3>
                <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
                  <a href="tel:+393926568550" style="background: #D4AF37; color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; font-weight: bold;">📞 Chiama</a>
                  <a href="https://wa.me/393926568550" style="background: #25D366; color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; font-weight: bold;">💬 WhatsApp</a>
                  <a href="https://maps.google.com/?q=Via+Roma+123+Roma" style="background: #4285F4; color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; font-weight: bold;">🗺️ Indicazioni</a>
                </div>
              </div>
            `,
            category: 'Sapori & Colori'
          }
        ]
      },

      // Panels personalizzati
      panels: {
        defaults: [
          {
            id: 'panel-switcher',
            el: '.panel__switcher',
            buttons: [
              {
                id: 'show-layers',
                label: 'Layers',
                command: 'show-layers',
                togglable: false,
                className: 'fa fa-layer-group'
              },
              {
                id: 'show-styles',
                label: 'Styles', 
                command: 'show-styles',
                togglable: false,
                className: 'fa fa-paint-brush'
              }
            ],
          }
        ]
      },

      // Canvas settings
      canvas: {
        styles: [
          'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
        ],
        scripts: []
      }
    })

    // Aggiungiamo i comandi mancanti per i panel con implementazione semplificata
    grapesEditor.Commands.add('show-layers', {
      run(editor) {
        const lm = editor.LayerManager
        const panelEl = document.querySelector('.panel__right')
        
        if (panelEl) {
          // Pulisci il contenuto esistente
          panelEl.innerHTML = ''
          
          // Crea container per layers
          const layersContainer = document.createElement('div')
          layersContainer.style.padding = '10px'
          
          const title = document.createElement('h4')
          title.textContent = 'Layers'
          title.style.margin = '0 0 10px 0'
          title.style.color = '#333'
          
          layersContainer.appendChild(title)
          
          // Renderizza layer manager
          lm.render(layersContainer)
          panelEl.appendChild(layersContainer)
        }
      }
    })

    grapesEditor.Commands.add('show-styles', {
      run(editor) {
        const sm = editor.StyleManager
        const panelEl = document.querySelector('.panel__right')
        
        if (panelEl) {
          // Pulisci il contenuto esistente
          panelEl.innerHTML = ''
          
          // Crea container per styles
          const stylesContainer = document.createElement('div')
          stylesContainer.style.padding = '10px'
          
          const title = document.createElement('h4')
          title.textContent = 'Styles'
          title.style.margin = '0 0 10px 0'
          title.style.color = '#333'
          
          stylesContainer.appendChild(title)
          
          // Renderizza style manager
          sm.render(stylesContainer)
          panelEl.appendChild(stylesContainer)
        }
      }
    })

    // Inizializza il pannello layers di default
    setTimeout(() => {
      grapesEditor.runCommand('show-layers')
    }, 100)

    setEditor(grapesEditor)
    setLoading(false)

    console.log('✅ GrapesJS inizializzato con comandi personalizzati!')

    return () => {
      if (grapesEditor) {
        grapesEditor.destroy()
      }
    }
  }, [])

  // Carica lista landing pages
  const loadLandingPages = async () => {
    try {
      const response = await fetch('/api/landing-pages')
      const result = await response.json()
      
      if (result.success) {
        setLandingPages(result.data)
        console.log('📋 Landing pages caricate:', result.count)
      }
    } catch (error) {
      console.error('❌ Errore caricamento landing pages:', error)
      showNotification('❌ Errore caricamento pagine', 'error')
    }
  }

  // Salva landing page corrente
  const saveLandingPage = async () => {
    if (!editor) {
      showNotification('❌ Editor non inizializzato', 'error')
      return
    }

    const title = prompt('📝 Nome della landing page:', currentPage?.title || 'Nuova Landing Page')
    if (!title) return

    setSaving(true)
    try {
      const htmlContent = editor.getHtml()
      const cssContent = editor.getCss()
      const grapesData = editor.getProjectData()

      const slug = generateSlug(title)
      
      const payload = {
        title,
        description: `Landing page creata con Page Builder - ${title}`,
        slug,
        html_content: htmlContent,
        css_content: cssContent,
        grapesjs_data: grapesData,
        meta_title: title,
        meta_description: `${title} - Sapori & Colori`,
        is_published: true
      }

      let response
      if (currentPage) {
        // Aggiorna esistente
        response = await fetch('/api/landing-pages', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, id: currentPage.id })
        })
      } else {
        // Crea nuovo
        response = await fetch('/api/landing-pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      const result = await response.json()

      if (result.success) {
        setCurrentPage(result.data)
        await loadLandingPages()
        showNotification(`✅ Landing page ${currentPage ? 'aggiornata' : 'salvata'}: ${result.public_url}`)
      } else {
        showNotification(`❌ Errore: ${result.error}`, 'error')
      }
    } catch (error) {
      console.error('❌ Errore salvataggio:', error)
      showNotification('❌ Errore durante il salvataggio', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Carica landing page esistente
  const loadLandingPage = async (page) => {
    if (!editor) return

    try {
      if (page.grapesjs_data) {
        editor.loadProjectData(page.grapesjs_data)
      } else {
        // Fallback: carica da HTML/CSS
        editor.setComponents(page.html_content)
        editor.setStyle(page.css_content)
      }
      
      setCurrentPage(page)
      showNotification(`📋 Caricata: ${page.title}`)
    } catch (error) {
      console.error('❌ Errore caricamento pagina:', error)
      showNotification('❌ Errore caricamento pagina', 'error')
    }
  }

  // Crea nuova landing page
  const createNewPage = () => {
    if (!editor) return
    
    editor.runCommand('core:canvas-clear')
    setCurrentPage(null)
    showNotification('📄 Nuova landing page creata')
  }

  // Utility functions
  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50)
  }

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type })
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' })
    }, 4000)
  }

  return (
    <div className="page-builder-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Notifiche */}
      {notification.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: notification.type === 'error' ? '#ff6b6b' : '#51cf66',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          zIndex: 9999,
          maxWidth: '400px'
        }}>
          {notification.message}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ 
        background: '#fff', 
        borderBottom: '1px solid #ddd', 
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        flexWrap: 'wrap'
      }}>
        <h2 style={{ margin: '0', color: '#8B4513' }}>🎨 Page Builder</h2>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={createNewPage}
            disabled={loading}
            style={{
              background: '#51cf66',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            📄 Nuova Pagina
          </button>

          <button
            onClick={saveLandingPage}
            disabled={loading || saving || !editor}
            style={{
              background: '#8B4513',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              opacity: (loading || saving || !editor) ? 0.5 : 1
            }}
          >
            {saving ? '💾 Salvando...' : '💾 Salva'}
          </button>

          {currentPage && (
            <span style={{ 
              background: '#e3f2fd', 
              color: '#1976d2', 
              padding: '6px 12px', 
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              📝 {currentPage.title}
            </span>
          )}
        </div>

        {/* Landing Pages List */}
        {landingPages.length > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontSize: '14px', color: '#666' }}>Carica esistente:</label>
            <select
              onChange={(e) => {
                const page = landingPages.find(p => p.id === e.target.value)
                if (page) loadLandingPage(page)
              }}
              style={{
                padding: '6px 10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">Seleziona pagina...</option>
              {landingPages.map(page => (
                <option key={page.id} value={page.id}>
                  {page.title} ({page.is_published ? 'Pubblicata' : 'Bozza'})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h3>🎨 Caricamento Page Builder...</h3>
          <p>Preparazione degli strumenti di creazione...</p>
        </div>
      )}
      
      {!loading && (
        <div style={{ display: 'flex', height: 'calc(100vh - 80px)' }}>
        {/* Sidebar blocchi */}
        <div style={{ width: '300px', background: '#f5f5f5', borderRight: '1px solid #ddd' }}>
          <div style={{ padding: '15px', borderBottom: '1px solid #ddd', background: '#fff' }}>
            <h3 style={{ margin: '0', color: '#333' }}>🧱 Blocchi</h3>
            <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>Trascina per aggiungere</p>
          </div>
          <div className="blocks-container" style={{ padding: '15px' }}></div>
        </div>

        {/* Editor principale */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div ref={editorRef} style={{ flex: 1 }}></div>
        </div>

        {/* Panel destro */}
        <div style={{ width: '300px', background: '#f5f5f5', borderLeft: '1px solid #ddd' }}>
          <div className="panel__switcher" style={{ padding: '10px', borderBottom: '1px solid #ddd', background: '#fff' }}></div>
          <div className="panel__right" style={{ height: 'calc(100% - 60px)', overflow: 'auto' }}></div>
        </div>
        </div>
      )}
    </div>
  )
}

export default PageBuilder