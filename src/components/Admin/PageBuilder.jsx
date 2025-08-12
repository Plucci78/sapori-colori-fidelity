import { useEffect, useRef, useState } from 'react'
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
    console.log('🔍 UseEffect PageBuilder chiamato')
    
    // Prima mostra l'editor (rimuovi loading)
    setLoading(false)
    
    // Poi aspetta un momento per l'inizializzazione
    setTimeout(() => {
      let attempts = 0
      const maxAttempts = 50 // Max 5 secondi
      
      const initializeEditor = () => {
        console.log('📍 editorRef.current:', editorRef.current)
        console.log('📍 editor esistente:', editor)
        console.log('🔢 Tentativo:', attempts + 1)
        
        attempts++
        
        if (!editorRef.current) {
          if (attempts >= maxAttempts) {
            console.error('❌ Timeout: editorRef non disponibile dopo 5 secondi')
            return
          }
          console.log('❌ editorRef.current è null, riprovo in 100ms...')
          setTimeout(initializeEditor, 100)
          return
        }
    
    if (editor) {
      console.log('✅ Editor già esistente, skip')
      return
    }

    console.log('🎨 Inizializzazione GrapesJS Page Builder...')
    
    // Controllo se GrapesJS è caricato
    if (!grapesjs) {
      console.error('❌ GrapesJS non caricato!')
      setLoading(false)
      return
    }
    
    console.log('✅ GrapesJS importato correttamente')
    
    try {

    const grapesEditor = grapesjs.init({
      container: editorRef.current,
      height: '100%',
      width: '100%',
      
      // Configurazione responsive
      showOffsets: true,
      noticeOnUnload: false,
      
      // Canvas responsive 
      canvas: {
        styles: [
          'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
        ],
        scripts: []
      },
      
      // Configurazione Sapori & Colori
      projectName: 'Sapori & Colori Landing Pages',
      
      // Contenuto iniziale di base
      components: `
        <div class="container" style="max-width: 1200px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; padding: 40px 20px; background: #f8f9fa; border-radius: 10px; margin-bottom: 20px;">
            <h1 style="color: #D4AF37; margin-bottom: 15px;">Benvenuto nel Page Builder</h1>
            <p style="color: #666; font-size: 18px;">Trascina i blocchi dalla sidebar sinistra per iniziare a creare la tua landing page</p>
          </div>
        </div>
      `,
      
      // Storage per salvare le landing
      storageManager: {
        type: 'local',
        autosave: true,
        autoload: true,
        stepsBeforeSave: 3
      },

      // Device responsive con resize automatico
      deviceManager: {
        devices: [
          {
            name: 'Desktop',
            width: '',
            height: '',
            widthMedia: '1200px'
          },
          {
            name: 'Tablet',
            width: '768px', 
            height: '',
            widthMedia: '768px'
          },
          {
            name: 'Mobile',
            width: '375px',
            height: '',
            widthMedia: '320px'
          }
        ]
      },

      // Configurazione block manager 
      blockManager: {
        appendTo: '.blocks-container'
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

    // Aggiungi blocchi di base comuni
    const blockManager = grapesEditor.BlockManager
    
    // Blocchi di base essenziali
    blockManager.add('text', {
      label: '📝 Testo',
      content: '<div data-gjs-type="text">Inserisci il tuo testo qui</div>',
      category: 'Basic'
    })
    
    blockManager.add('image', {
      label: '🖼️ Immagine',
      content: { type: 'image' },
      category: 'Basic'
    })
    
    blockManager.add('video', {
      label: '🎥 Video',
      content: { type: 'video', src: 'img/video2.webm' },
      category: 'Basic'
    })
    
    blockManager.add('section', {
      label: '📦 Sezione',
      content: `
        <section style="padding: 40px 20px; background: #f9f9f9;">
          <div style="max-width: 1200px; margin: 0 auto;">
            <h2>Titolo Sezione</h2>
            <p>Contenuto della sezione...</p>
          </div>
        </section>
      `,
      category: 'Basic'
    })
    
    blockManager.add('columns', {
      label: '📊 2 Colonne',
      content: `
        <div style="display: flex; gap: 20px; padding: 20px;">
          <div style="flex: 1; padding: 20px; background: #f5f5f5;">
            <h3>Colonna 1</h3>
            <p>Contenuto della prima colonna</p>
          </div>
          <div style="flex: 1; padding: 20px; background: #f5f5f5;">
            <h3>Colonna 2</h3>
            <p>Contenuto della seconda colonna</p>
          </div>
        </div>
      `,
      category: 'Layout'
    })
    
    blockManager.add('button', {
      label: '🔘 Bottone',
      content: `
        <a href="#" style="display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Clicca qui
        </a>
      `,
      category: 'Basic'
    })
    
    // Blocchi personalizzati Sapori & Colori
    blockManager.add('sapori-header', {
      label: '🏪 Header Sapori & Colori',
      content: `
        <div style="background: linear-gradient(135deg, #D4AF37 0%, #FFD700 100%); padding: 40px 20px; text-align: center; color: #8B4513;">
          <img src="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png" alt="Sapori & Colori" style="height: 80px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 2.5em; font-weight: bold;">Sapori & Colori</h1>
          <p style="margin: 10px 0 0 0; font-size: 1.2em;">Il sapore autentico della tradizione</p>
        </div>
      `,
      category: 'Sapori & Colori'
    })
    
    blockManager.add('promo-section', {
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
    })
    
    blockManager.add('contact-cta', {
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
    })

    // Listener per il resize della finestra
    const handleResize = () => {
      if (grapesEditor) {
        grapesEditor.refresh()
      }
    }
    
    window.addEventListener('resize', handleResize)

    // Inizializza il pannello layers di default
    setTimeout(() => {
      grapesEditor.runCommand('show-layers')
      // Forza il refresh dell'editor per le dimensioni
      grapesEditor.refresh()
    }, 100)

    setEditor(grapesEditor)
    setLoading(false)

    console.log('✅ GrapesJS inizializzato con comandi personalizzati!')
    console.log('📋 Editor pronto, caricamento landing pages...')

    } catch (error) {
      console.error('❌ Errore inizializzazione GrapesJS:', error)
      setLoading(false)
      return
    }

    return () => {
      if (grapesEditor) {
        grapesEditor.destroy()
      }
      window.removeEventListener('resize', handleResize)
    }
      }
      
      // Inizia il processo di inizializzazione
      initializeEditor()
    }, 100) // Aspetta 100ms per il rendering
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

  const [showSidebar, setShowSidebar] = useState(false)
  const [showPanel, setShowPanel] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div className="page-builder-container" style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, sans-serif',
      position: 'relative'
    }}>

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
          maxWidth: '90vw',
          fontSize: '14px'
        }}>
          {notification.message}
        </div>
      )}

      {/* Mobile Toolbar */}
      <div style={{ 
        background: '#fff', 
        borderBottom: '1px solid #ddd', 
        padding: isMobile ? '8px' : '10px 15px',
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? '8px' : '15px',
        flexWrap: 'wrap',
        minHeight: isMobile ? '50px' : '60px',
        position: 'relative',
        zIndex: 1000
      }}>
        {/* Mobile Menu Buttons */}
        {isMobile && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              style={{
                background: showSidebar ? '#8B4513' : '#ddd',
                color: showSidebar ? 'white' : '#333',
                border: 'none',
                padding: '6px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              🧱
            </button>
            <button
              onClick={() => setShowPanel(!showPanel)}
              style={{
                background: showPanel ? '#8B4513' : '#ddd',
                color: showPanel ? 'white' : '#333',
                border: 'none',
                padding: '6px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ⚙️
            </button>
          </div>
        )}

        <h2 style={{ 
          margin: '0', 
          color: '#8B4513', 
          fontSize: isMobile ? '14px' : '18px',
          flex: isMobile ? 1 : 'initial'
        }}>
          {isMobile ? '🎨 Builder' : '🎨 Page Builder'}
        </h2>
        
        <div style={{ 
          display: 'flex', 
          gap: isMobile ? '6px' : '8px', 
          alignItems: 'center', 
          flexWrap: 'wrap'
        }}>
          <button
            onClick={createNewPage}
            disabled={loading}
            style={{
              background: '#51cf66',
              color: 'white',
              border: 'none',
              padding: isMobile ? '4px 8px' : '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: isMobile ? '11px' : '13px',
              whiteSpace: 'nowrap'
            }}
          >
            {isMobile ? '📄' : '📄 Nuova'}
          </button>

          <button
            onClick={saveLandingPage}
            disabled={loading || saving || !editor}
            style={{
              background: '#8B4513',
              color: 'white',
              border: 'none',
              padding: isMobile ? '4px 8px' : '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: isMobile ? '11px' : '13px',
              opacity: (loading || saving || !editor) ? 0.5 : 1,
              whiteSpace: 'nowrap'
            }}
          >
            {saving ? (isMobile ? '💾' : '💾 Salva...') : (isMobile ? '💾' : '💾 Salva')}
          </button>
        </div>

        {/* Landing Pages List - Hidden on mobile */}
        {!isMobile && landingPages.length > 0 && (
          <div style={{ 
            marginLeft: 'auto', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            minWidth: '200px'
          }}>
            <label style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap' }}>Carica:</label>
            <select
              onChange={(e) => {
                const page = landingPages.find(p => p.id === e.target.value)
                if (page) loadLandingPage(page)
              }}
              style={{
                padding: '4px 8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '12px',
                flex: 1,
                minWidth: '120px'
              }}
            >
              <option value="">Seleziona...</option>
              {landingPages.map(page => (
                <option key={page.id} value={page.id}>
                  {page.title.substring(0, 25)}{page.title.length > 25 ? '...' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Current page indicator */}
        {currentPage && (
          <span style={{ 
            background: '#e3f2fd', 
            color: '#1976d2', 
            padding: isMobile ? '2px 6px' : '4px 8px', 
            borderRadius: '4px',
            fontSize: isMobile ? '10px' : '12px',
            maxWidth: isMobile ? '100px' : '150px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            📝 {isMobile ? currentPage.title.substring(0, 8) + '...' : currentPage.title}
          </span>
        )}
      </div>

      {loading && (
        <div style={{ padding: '40px', textAlign: 'center', background: '#f9f9f9' }}>
          <h3 style={{ color: '#8B4513', marginBottom: '10px' }}>🎨 Caricamento Page Builder...</h3>
          <p style={{ color: '#666', fontSize: '14px' }}>Preparazione strumenti di creazione...</p>
        </div>
      )}
      
      {/* Main Layout */}
      <div style={{ 
        display: loading ? 'none' : 'flex', 
        flex: 1,
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Mobile Sidebar Overlay */}
        {isMobile && showSidebar && (
          <>
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 1001
              }}
              onClick={() => setShowSidebar(false)}
            />
            <div style={{
              position: 'fixed',
              top: isMobile ? '50px' : '60px',
              left: 0,
              bottom: 0,
              width: '280px',
              background: '#f5f5f5',
              borderRight: '1px solid #ddd',
              zIndex: 1002,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ 
                padding: '12px', 
                borderBottom: '1px solid #ddd', 
                background: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{ margin: '0', color: '#333', fontSize: '14px' }}>🧱 Blocchi</h3>
                <button
                  onClick={() => setShowSidebar(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '16px',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>
              <div className="blocks-container" style={{ 
                padding: '8px',
                flex: 1,
                overflow: 'auto'
              }}></div>
            </div>
          </>
        )}

        {/* Desktop Sidebar */}
        {!isMobile && (
          <div style={{ 
            width: '250px',
            background: '#f5f5f5', 
            borderRight: '1px solid #ddd',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ 
              padding: '12px', 
              borderBottom: '1px solid #ddd', 
              background: '#fff',
              flexShrink: 0
            }}>
              <h3 style={{ margin: '0', color: '#333', fontSize: '14px' }}>🧱 Blocchi</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#666' }}>Trascina per aggiungere</p>
            </div>
            <div className="blocks-container" style={{ 
              padding: '8px',
              flex: 1,
              overflow: 'auto'
            }}></div>
          </div>
        )}

        {/* Editor Principale */}
        <div style={{ 
          flex: 1,
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          minWidth: 0
        }}>
          <div ref={editorRef} style={{ 
            flex: 1, 
            width: '100%',
            height: '100%',
            background: '#ffffff',
            overflow: 'hidden'
          }}></div>
        </div>

        {/* Mobile Panel Overlay */}
        {isMobile && showPanel && (
          <>
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 1001
              }}
              onClick={() => setShowPanel(false)}
            />
            <div style={{
              position: 'fixed',
              top: isMobile ? '50px' : '60px',
              right: 0,
              bottom: 0,
              width: '280px',
              background: '#f5f5f5',
              borderLeft: '1px solid #ddd',
              zIndex: 1002,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ 
                padding: '8px', 
                borderBottom: '1px solid #ddd', 
                background: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div className="panel__switcher" style={{ flex: 1 }}></div>
                <button
                  onClick={() => setShowPanel(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '16px',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>
              <div className="panel__right" style={{ 
                flex: 1,
                overflow: 'auto' 
              }}></div>
            </div>
          </>
        )}

        {/* Desktop Panel */}
        {!isMobile && (
          <div style={{ 
            width: '250px',
            background: '#f5f5f5', 
            borderLeft: '1px solid #ddd',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div className="panel__switcher" style={{ 
              padding: '8px', 
              borderBottom: '1px solid #ddd', 
              background: '#fff',
              flexShrink: 0
            }}></div>
            <div className="panel__right" style={{ 
              flex: 1,
              overflow: 'auto' 
            }}></div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PageBuilder