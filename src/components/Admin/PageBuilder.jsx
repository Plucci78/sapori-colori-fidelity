// Force redeploy: 1
import { useEffect, useRef, useState } from 'react';
import Frame from 'react-frame-component';
import grapesjs from 'grapesjs';

// Import dei plugin di GrapesJS
import gjsPresetWebpage from 'grapesjs-preset-webpage';
import gjsBlocksBasic from 'grapesjs-blocks-basic';
import gjsPluginForms from 'grapesjs-plugin-forms';

const PageBuilder = () => {
  // Il ref rimane lo stesso, ma ora lo useremo in modo più sicuro
  const editorRef = useRef(null);
  const [editor, setEditor] = useState(null);

  // Le altre dichiarazioni di stato rimangono invariate
  const [landingPages, setLandingPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  const frameHead = (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/grapesjs@0.21.10/dist/css/grapes.min.css" // Ho aggiornato a una versione stabile recente
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
        /* Aggiunta per evitare il flash di contenuto non stilizzato */
        .gjs-editor-cont {
          opacity: 0;
          transition: opacity 0.3s;
        }
        .gjs-editor-cont.gjs-loaded {
          opacity: 1;
        }
      `}</style>
    </>
  );

  // --- MODIFICA CHIAVE #1: Abbiamo rimosso il vecchio useEffect di inizializzazione ---
  // Tutta la logica di inizializzazione è ora in questa funzione.
  const initializeEditor = () => {
    // Se l'editor è già inizializzato o il ref non è pronto, non fare nulla.
    if (editor || !editorRef.current) {
      return;
    }

    // Poiché questa funzione viene chiamata da contentDidMount,
    // sappiamo che ownerDocument e tutti i selettori esisteranno.
    const frameDocument = editorRef.current.ownerDocument;
    const blocksContainer = frameDocument.querySelector('.blocks-container');
    const panelSwitcher = frameDocument.querySelector('.panel__switcher');
    const panelRight = frameDocument.querySelector('.panel__right');

    console.log(' Inizializzazione GrapesJS Page Builder...');

    try {
      const grapesEditor = grapesjs.init({
        container: editorRef.current,
        height: '100%',
        width: 'auto',
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
        storageManager: {
            type: 'local',
            autosave: true,
            autoload: false, // Meglio disabilitare per il debug iniziale
            stepsBeforeSave: 3
        },
        deviceManager: {
            devices: [
              { name: 'Desktop', width: '' },
              { name: 'Tablet', width: '768px', widthMedia: '992px' },
              { name: 'Mobile', width: '375px', widthMedia: '575px' }
            ]
        },
        blockManager: {
          appendTo: blocksContainer,
        },
        layerManager: {
          appendTo: panelRight,
        },
        styleManager: {
          appendTo: panelRight,
        },
        traitManager: {
          appendTo: panelRight,
        },
        panels: {
          defaults: [{
            id: 'panel-switcher',
            el: panelSwitcher,
            buttons: [
              { id: 'show-layers', active: true, label: '️', command: 'show-layers', togglable: false, tooltip: 'Livelli' },
              { id: 'show-style', label: '', command: 'show-styles', togglable: false, tooltip: 'Stili' },
              { id: 'show-traits', label: '⚙️', command: 'show-traits', togglable: false, tooltip: 'Impostazioni' }
            ]
          }]
        }
      });
      
      // I comandi per mostrare i pannelli
      grapesEditor.Commands.add('show-layers', {
        run: editor => editor.runCommand('core:component-select'),
        stop: editor => editor.stopCommand('core:component-select'),
      });
      grapesEditor.on('run:show-layers', () => {
          grapesEditor.StyleManager.hide();
          grapesEditor.TraitManager.hide();
          grapesEditor.LayerManager.show();
      });
      grapesEditor.on('run:show-styles', () => {
          grapesEditor.LayerManager.hide();
          grapesEditor.TraitManager.hide();
          grapesEditor.StyleManager.show();
      });
      grapesEditor.on('run:show-traits', () => {
          grapesEditor.LayerManager.hide();
          grapesEditor.StyleManager.hide();
          grapesEditor.TraitManager.show();
      });

      // Carica il contenuto iniziale
      grapesEditor.setComponents(`
        <div class="container-fluid p-0">
          <section style="background: linear-gradient(135deg, #D4AF37, #FFD700); padding: 60px 20px; text-align: center; color: #8B4513;">
            <div class="container">
              <img src="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png" alt="Sapori & Colori" style="height: 80px; margin-bottom: 20px;">
              <h1 class="display-4 fw-bold mb-3">Page Builder Professionale</h1>
              <p class="lead mb-4">Drag & Drop • Forms • Responsive • Bootstrap Ready</p>
              <button class="btn btn-lg" style="background: #8B4513; color: white; border: none; border-radius: 25px; padding: 12px 30px;"> Inizia a Creare</button>
            </div>
          </section>
        </div>
      `);

      // Imposta il pannello iniziale e aggiunge la classe per la transizione di opacità
      grapesEditor.on('load', () => {
        grapesEditor.runCommand('show-layers');
        const editorContainer = grapesEditor.getContainer();
        editorContainer.classList.add('gjs-loaded');
      });

      setEditor(grapesEditor);
      console.log('✅ GrapesJS inizializzato con successo!');

    } catch (error) {
      console.error('❌ Errore durante l'inizializzazione di GrapesJS:', error);
    }
  };

  // --- MODIFICA CHIAVE #2: useEffect per la pulizia ---
  // Questo hook ora si occupa solo di distruggere l'istanza di GrapesJS quando il componente viene smontato.
  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, [editor]); // Dipende da 'editor' per sapere quando pulire

  return (
    // --- MODIFICA CHIAVE #3: Utilizzo di contentDidMount ---
    <Frame
      head={frameHead}
      contentDidMount={initializeEditor} // <-- LA MODIFICA PIÙ IMPORTANTE!
      style={{ width: '100%', height: '100vh', border: 'none' }}
    >
      <div className="page-builder-container" style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, sans-serif',
        position: 'relative'
      }}>

        {/* Il resto del tuo JSX rimane identico */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
          {/* Indicatore di caricamento finché l'editor non è pronto */}
          {!editor && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(255, 255, 255, 0.8)', zIndex: 10000 }}>
                <h3>Caricamento Page Builder...</h3>
            </div>
          )}
          <div style={{ width: '250px', background: '#f5f5f5', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px', borderBottom: '1px solid #ddd', background: '#fff' }}>
              <h3 style={{ margin: '0', fontSize: '14px' }}> Blocchi</h3>
            </div>
            <div className="blocks-container" style={{ flex: 1, overflow: 'auto' }}></div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            {/* Il nostro ref è qui. GrapesJS verrà montato in questo div. */}
            <div ref={editorRef} style={{ height: '600px', width: '800px', border: '5px solid lime' }}></div>
          </div>
          <div style={{ width: '250px', background: '#f5f5f5', borderLeft: '1px solid #ddd', display: 'flex', flexDirection: 'column' }}>
            <div className="panel__switcher" style={{ padding: '8px', borderBottom: '1px solid #ddd', background: '#fff' }}></div>
            <div className="panel__right" style={{ flex: 1, overflow: 'auto' }}></div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

export default PageBuilder;
