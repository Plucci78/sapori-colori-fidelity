// Force redeploy: 1
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
    const initialize = () => {
      if (!editorRef.current) {
        console.log('Ref non pronto, riprovo...');
        setTimeout(initialize, 100);
        return;
      }

      const frameDocument = editorRef.current.ownerDocument
      if (!frameDocument.querySelector('.blocks-container')) {
        console.log('Elementi UI non ancora pronti nel frame, riprovo...');
        setTimeout(initialize, 100);
        return;
      }

      if (editor) {
        return
      }

      const blocksContainer = frameDocument.querySelector('.blocks-container')
      const panelSwitcher = frameDocument.querySelector('.panel__switcher')
      const panelRight = frameDocument.querySelector('.panel__right')

      console.log('🎨 Inizializzazione GrapesJS Page Builder (versione finale)...');

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
              { name: 'Desktop', width: '' },
              { name: 'Tablet', width: '768px', widthMedia: '768px' },
              { name: 'Mobile portrait', width: '320px', widthMedia: '320px' }
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
        commands.add('show-layers', {
          run(editor, sender) {
            if (panelRight) {
              panelRight.innerHTML = '';
              editor.LayerManager.render(panelRight);
            }
          }
        });
        commands.add('show-styles', {
          run(editor, sender) {
            if (panelRight) {
              panelRight.innerHTML = '';
              editor.StyleManager.render(panelRight);
            }
          }
        });
        commands.add('show-traits', {
          run(editor, sender) {
            if (panelRight) {
              panelRight.innerHTML = '';
              editor.TraitManager.render(panelRight);
            }
          }
        });

        const blockManager = grapesEditor.BlockManager;
        blockManager.add('sapori-header', { label: 'Header', content: `<div>...</div>`, category: 'Sapori & Colori' });

        setTimeout(() => {
          grapesEditor.runCommand('show-layers');
          grapesEditor.refresh();
        }, 100);

        setEditor(grapesEditor);
        console.log('✅ GrapesJS (finale) inizializzato con successo!');

      } catch (error) {
        console.error('❌ Errore inizializzazione GrapesJS (finale):', error)
      }
    }

    const timer = setTimeout(initialize, 100);

    return () => {
        clearTimeout(timer);
        if (editor) {
            editor.destroy()
        }
    }
  }, [editor])

  const loadLandingPages = async () => { /* ... */ }
  const saveLandingPage = async () => { /* ... */ }
  const loadLandingPage = async (page) => { /* ... */ }
  const createNewPage = () => { /* ... */ }
  const generateSlug = (title) => { /* ... */ }
  const showNotification = (message, type = 'success') => { /* ... */ }

  const [showSidebar, setShowSidebar] = useState(false)
  const [showPanel, setShowPanel] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    const frameWindow = editorRef.current?.ownerDocument.defaultView;
    if(frameWindow) {
        frameWindow.addEventListener('resize', checkMobile)
        return () => frameWindow.removeEventListener('resize', checkMobile)
    }
  }, [editor]);

  return (
    <Frame
      head={frameHead}
      style={{ width: '100%', height: '100vh', border: 'none' }}
    >
      <div className="page-builder-container" style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, sans-serif',
        position: 'relative'
      }}>

        {/* ... All the original UI JSX ... */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
          {!editor && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(255, 255, 255, 0.8)', zIndex: 10000 }}>
                <h3>Caricamento Page Builder...</h3>
            </div>
          )}
          <div style={{ width: '250px', background: '#f5f5f5', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px', borderBottom: '1px solid #ddd', background: '#fff' }}>
              <h3 style={{ margin: '0', fontSize: '14px' }}>🧱 Blocchi</h3>
            </div>
            <div className="blocks-container" style={{ flex: 1, overflow: 'auto' }}></div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            <div ref={editorRef} style={{ flex: 1, border: '3px solid red' }}></div>
          </div>
          <div style={{ width: '250px', background: '#f5f5f5', borderLeft: '1px solid #ddd', display: 'flex', flexDirection: 'column' }}>
            <div className="panel__switcher" style={{ padding: '8px', borderBottom: '1px solid #ddd', background: '#fff' }}></div>
            <div className="panel__right" style={{ flex: 1, overflow: 'auto' }}></div>
          </div>
        </div>
      </div>
    </Frame>
  )
}

export default PageBuilder