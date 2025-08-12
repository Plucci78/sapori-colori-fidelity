import { useEffect, useRef, useState } from 'react'
import Frame from 'react-frame-component'
import grapesjs from 'grapesjs'

// Import key GrapesJS plugins
import gjsPresetWebpage from 'grapesjs-preset-webpage'
import gjsBlocksBasic from 'grapesjs-blocks-basic'
import gjsPluginForms from 'grapesjs-plugin-forms'

const PageBuilder = () => {
  const editorRef = useRef(null)
  const [editor, setEditor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [landingPages, setLandingPages] = useState([])
  const [currentPage, setCurrentPage] = useState(null)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState({ show: false, message: '', type: '' })

  const frameHead = (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/grapesjs@0.22.9/dist/css/grapes.min.css"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <style>{`
        body {
          margin: 0;
          font-family: 'Inter', sans-serif;
        }
      `}</style>
    </>
  )

  useEffect(() => {
    loadLandingPages()
  }, [])

  useEffect(() => {
    if (loading) return // Attendi che il frame sia montato

    const initialize = () => {
      if (!editorRef.current) {
        console.log('Ref non pronto, riprovo...');
        setTimeout(initialize, 100);
        return;
      }

      const frameDocument = editorRef.current.ownerDocument
      if (!frameDocument) {
        console.log('Documento del frame non pronto, riprovo...');
        setTimeout(initialize, 100);
        return;
      }

      const blocksContainer = frameDocument.querySelector('.blocks-container')
      const panelSwitcher = frameDocument.querySelector('.panel__switcher')
      const panelRight = frameDocument.querySelector('.panel__right')

      if (!blocksContainer || !panelSwitcher || !panelRight) {
        console.log('Elementi UI non trovati nel frame, riprovo...');
        setTimeout(initialize, 100);
        return;
      }
      
      if (editor) {
        console.log('✅ Editor già esistente, skip')
        return
      }

      console.log('🎨 Inizializzazione GrapesJS Page Builder...');

      try {
        const grapesEditor = grapesjs.init({
          container: editorRef.current,
          height: '100%',
          width: '100%',
          plugins: [gjsPresetWebpage, gjsBlocksBasic, gjsPluginForms],
          pluginsOpts: {
            [gjsPresetWebpage]: {
              modalImportTitle: 'Importa Template',
              modalImportLabel: 'Incolla qui il tuo HTML/CSS',
              blocksBasicOpts: {
                blocks: ['column1', 'column2', 'column3', 'text', 'link', 'image', 'video'],
                flexGrid: true
              }
            },
            [gjsBlocksBasic]: { flexGrid: true },
            [gjsPluginForms]: {
              blocks: ['form', 'input', 'textarea', 'select', 'button', 'label', 'checkbox', 'radio']
            }
          },
          fromElement: false,
          showOffsets: true,
          noticeOnUnload: false,
          canvas: {
            styles: [
              'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
              'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css'
            ],
            scripts: []
          },
          projectName: 'Sapori & Colori Landing Pages',
          components: `
            <div class="container-fluid p-0">
              <section style="background: linear-gradient(135deg, #D4AF37, #FFD700); padding: 60px 20px; text-align: center; color: #8B4513;">
                <div class="container">
                  <img src="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png" alt="Sapori & Colori" style="height: 80px; margin-bottom: 20px;">
                  <h1 class="display-4 fw-bold mb-3">Page Builder Professionale</h1>
                  <p class="lead mb-4">Drag & Drop • Forms • Responsive • Bootstrap Ready</p>
                  <button class="btn btn-lg" style="background: #8B4513; color: white; border: none; border-radius: 25px; padding: 12px 30px;">🚀 Inizia a Creare</button>
                </div>
              </section>
            </div>
          `,
          storageManager: {
            type: 'local',
            autosave: true,
            autoload: true,
            stepsBeforeSave: 3
          },
          deviceManager: {
            devices: [
              { name: 'Desktop', width: '', priority: 1 },
              { name: 'Tablet', width: '768px', widthMedia: '768px', priority: 2 },
              { name: 'Mobile portrait', width: '320px', widthMedia: '320px', priority: 3 }
            ]
          },
          blockManager: {
            appendTo: blocksContainer
          },
          panels: {
            defaults: [{
              id: 'panel-switcher',
              el: panelSwitcher,
              buttons: [
                { id: 'show-layers', active: true, label: '🏗️', command: 'show-layers', togglable: false, tooltip: 'Layers' },
                { id: 'show-style', label: '🎨', command: 'show-styles', togglable: false, tooltip: 'Style Manager' },
                { id: 'show-traits', label: '⚙️', command: 'show-traits', togglable: false, tooltip: 'Settings' }
              ]
            }]
          }
        });

        const commands = grapesEditor.Commands;
        const createPanelCommand = (panelId, renderFn) => {
            commands.add(panelId, {
                run(editor) {
                    if (panelRight) {
                        panelRight.innerHTML = '';
                        const container = document.createElement('div');
                        container.style.height = '100%';
                        container.style.overflow = 'auto';
                        renderFn(editor, container);
                        panelRight.appendChild(container);
                    }
                }
            });
        };

        createPanelCommand('show-layers', (editor, container) => editor.LayerManager.render(container));
        createPanelCommand('show-styles', (editor, container) => editor.StyleManager.render(container));
        createPanelCommand('show-traits', (editor, container) => editor.TraitManager.render(container));

        // Aggiungi blocchi personalizzati...
        const blockManager = grapesEditor.BlockManager;
        blockManager.add('sapori-header', { /* ... content ... */ category: 'Sapori & Colori' });
        blockManager.add('promo-section', { /* ... content ... */ category: 'Sapori & Colori' });
        blockManager.add('contact-cta', { /* ... content ... */ category: 'Sapori & Colori' });


        setTimeout(() => {
          grapesEditor.runCommand('show-layers');
          grapesEditor.refresh();
        }, 100);

        setEditor(grapesEditor);
        console.log('✅ GrapesJS inizializzato con successo!');

      } catch (error) {
        console.error('❌ Errore inizializzazione GrapesJS:', error)
      }
    }

    const timer = setTimeout(initialize, 100); // Dà tempo al frame di renderizzare

    return () => {
        clearTimeout(timer);
        if (editor) {
            editor.destroy()
        }
    }
  }, [loading, editor])

  // ... (le altre funzioni come loadLandingPages, saveLandingPage, etc. rimangono invariate)
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
        response = await fetch('/api/landing-pages', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, id: currentPage.id })
        })
      } else {
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

  const loadLandingPage = async (page) => {
    if (!editor) return

    try {
      if (page.grapesjs_data) {
        editor.loadProjectData(page.grapesjs_data)
      } else {
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

  const createNewPage = () => {
    if (!editor) return
    
    editor.runCommand('core:canvas-clear')
    setCurrentPage(null)
    showNotification('📄 Nuova landing page creata')
  }

  const generateSlug = (title) => {
    return title.toLowerCase().replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e').replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o').replace(/[ùúûü]/g, 'u').replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 50)
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

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <Frame
      head={frameHead}
      style={{ width: '100%', height: '100vh', border: 'none' }}
      onLoad={() => setLoading(false)} // Attiva l'inizializzazione solo quando il frame è caricato
    >
      <div className="page-builder-container" style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, sans-serif',
        position: 'relative'
      }}>

        {notification.show && (
          <div style={{
            position: 'fixed', top: '20px', right: '20px',
            background: notification.type === 'error' ? '#ff6b6b' : '#51cf66',
            color: 'white', padding: '12px 20px', borderRadius: '8px',
            zIndex: 9999, maxWidth: '90vw', fontSize: '14px'
          }}>
            {notification.message}
          </div>
        )}

        <div style={{
          background: '#fff', borderBottom: '1px solid #ddd', padding: isMobile ? '8px' : '10px 15px',
          display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '15px',
          flexWrap: 'wrap', minHeight: isMobile ? '50px' : '60px',
          position: 'relative', zIndex: 1000
        }}>
          {isMobile && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowSidebar(!showSidebar)} style={{ background: showSidebar ? '#8B4513' : '#ddd', color: showSidebar ? 'white' : '#333', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                🧱
              </button>
              <button onClick={() => setShowPanel(!showPanel)} style={{ background: showPanel ? '#8B4513' : '#ddd', color: showPanel ? 'white' : '#333', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                ⚙️
              </button>
            </div>
          )}

          <h2 style={{ margin: '0', color: '#8B4513', fontSize: isMobile ? '14px' : '18px', flex: isMobile ? 1 : 'initial' }}>
            {isMobile ? '🎨 Builder' : '🎨 Page Builder'}
          </h2>
          
          <div style={{ display: 'flex', gap: isMobile ? '6px' : '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={createNewPage} disabled={loading} style={{ background: '#51cf66', color: 'white', border: 'none', padding: isMobile ? '4px 8px' : '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: isMobile ? '11px' : '13px', whiteSpace: 'nowrap' }}>
              {isMobile ? '📄' : '📄 Nuova'}
            </button>
            <button onClick={saveLandingPage} disabled={loading || saving || !editor} style={{ background: '#8B4513', color: 'white', border: 'none', padding: isMobile ? '4px 8px' : '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: isMobile ? '11px' : '13px', opacity: (loading || saving || !editor) ? 0.5 : 1, whiteSpace: 'nowrap' }}>
              {saving ? (isMobile ? '💾' : '💾 Salva...') : (isMobile ? '💾' : '💾 Salva')}
            </button>
          </div>

          {!isMobile && landingPages.length > 0 && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', minWidth: '200px' }}>
              <label style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap' }}>Carica:</label>
              <select
                onChange={(e) => {
                  const page = landingPages.find(p => p.id === e.target.value)
                  if (page) loadLandingPage(page)
                }}
                style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', flex: 1, minWidth: '120px' }}
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

          {currentPage && (
            <span style={{ background: '#e3f2fd', color: '#1976d2', padding: isMobile ? '2px 6px' : '4px 8px', borderRadius: '4px', fontSize: isMobile ? '10px' : '12px', maxWidth: isMobile ? '100px' : '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              📝 {isMobile ? currentPage.title.substring(0, 8) + '...' : currentPage.title}
            </span>
          )}
        </div>

        {loading && (
          <div style={{ padding: '40px', textAlign: 'center', background: '#f9f9f9' }}>
            <h3 style={{ color: '#8B4513', marginBottom: '10px' }}>🎨 Caricamento Page Builder...</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>Preparazione ambiente isolato...</p>
          </div>
        )}
        
        <div style={{ display: loading ? 'flex' : 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
          {isMobile && showSidebar && (
            <>
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1001 }} onClick={() => setShowSidebar(false)} />
              <div style={{ position: 'fixed', top: isMobile ? '50px' : '60px', left: 0, bottom: 0, width: '280px', background: '#f5f5f5', borderRight: '1px solid #ddd', zIndex: 1002, display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '12px', borderBottom: '1px solid #ddd', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: '0', color: '#333', fontSize: '14px' }}>🧱 Blocchi</h3>
                  <button onClick={() => setShowSidebar(false)} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer' }}>✕</button>
                </div>
                <div className="blocks-container" style={{ padding: '8px', flex: 1, overflow: 'auto' }}></div>
              </div>
            </>
          )}

          {!isMobile && (
            <div style={{ width: '250px', background: '#f5f5f5', borderRight: '1px solid #ddd', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '12px', borderBottom: '1px solid #ddd', background: '#fff', flexShrink: 0 }}>
                <h3 style={{ margin: '0', color: '#333', fontSize: '14px' }}>🧱 Blocchi</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#666' }}>Trascina per aggiungere</p>
              </div>
              <div className="blocks-container" style={{ padding: '8px', flex: 1, overflow: 'auto' }}></div>
            </div>
          )}

          <div style={{ flex: 1, background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', minWidth: 0 }}>
            <div ref={editorRef} style={{ flex: 1, width: '100%', height: '100%', background: '#ffffff', overflow: 'hidden' }}></div>
          </div>

          {isMobile && showPanel && (
            <>
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1001 }} onClick={() => setShowPanel(false)} />
              <div style={{ position: 'fixed', top: isMobile ? '50px' : '60px', right: 0, bottom: 0, width: '280px', background: '#f5f5f5', borderLeft: '1px solid #ddd', zIndex: 1002, display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '8px', borderBottom: '1px solid #ddd', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="panel__switcher" style={{ flex: 1 }}></div>
                  <button onClick={() => setShowPanel(false)} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer' }}>✕</button>
                </div>
                <div className="panel__right" style={{ flex: 1, overflow: 'auto' }}></div>
              </div>
            </>
          )}

          {!isMobile && (
            <div style={{ width: '250px', background: '#f5f5f5', borderLeft: '1px solid #ddd', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
              <div className="panel__switcher" style={{ padding: '8px', borderBottom: '1px solid #ddd', background: '#fff', flexShrink: 0 }}></div>
              <div className="panel__right" style={{ flex: 1, overflow: 'auto' }}></div>
            </div>
          )}
        </div>
      </div>
    </Frame>
  )
}

export default PageBuilder
