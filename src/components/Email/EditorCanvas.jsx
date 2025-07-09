import { memo, useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react'; // Importa icona
import grapesjs from 'grapesjs';
import grapesjsNewsletter from 'grapesjs-preset-newsletter'; // Importa l'oggetto del plugin

const EditorCanvas = memo(({ onBackToTemplates, setEditor, setEmailContent, showNotification }) => {
  const editorContainerRef = useRef(null);

  useEffect(() => {
    let grapesEditorInstance;
    console.log('EditorCanvas useEffect triggered.');

    if (editorContainerRef.current) {
      console.log('Editor container ref is available.');
      try {
        grapesEditorInstance = grapesjs.init({
          container: editorContainerRef.current,
          height: 'calc(100vh - 250px)',
          width: 'auto',
          plugins: [grapesjsNewsletter],
          pluginsOpts: { 'gjs-preset-newsletter': {} },
          storageManager: false,
          // Riabilita alcuni pannelli per debug
          panels: {
            defaults: [
              {
                id: 'basic-actions',
                buttons: [
                  { id: 'visibility', active: true, className: 'btn-toggle-borders', label: 'Borders' },
                  { id: 'export-template', className: 'btn-open-export', label: 'Export' },
                  { id: 'undo', className: 'fa fa-undo', command: 'undo' },
                  { id: 'redo', className: 'fa fa-repeat', command: 'redo' }
                ],
              },
              {
                id: 'views',
                buttons: [
                  { id: 'open-blocks', className: 'fa fa-th-large', command: 'open-blocks', active: true },
                  { id: 'open-layers', className: 'fa fa-bars', command: 'open-layers' },
                  { id: 'open-styles', className: 'fa fa-paint-brush', command: 'open-styles' }
                ],
              }
            ],
          },
          blockManager: { appendTo: '#blocks' }, // Assicurati che ci sia un elemento con id='blocks'
          styleManager: { appendTo: '#styles' }, // Assicurati che ci sia un elemento con id='styles'
          layerManager: { appendTo: '#layers' }, // Assicurati che ci sia un elemento con id='layers'
          traitManager: { appendTo: '#traits' } // Assicurati che ci sia un elemento con id='traits'
        });

        console.log('GrapesJS instance initialized:', grapesEditorInstance);

        grapesEditorInstance.on('update', () => {
          const html = grapesEditorInstance.getHtml();
          const css = grapesEditorInstance.getCss();
          setEmailContent(css ? `<style>${css}</style>${html}` : html);
        });

        setEditor(grapesEditorInstance);
        console.log('setEditor called with instance.');
        showNotification('🎨 Editor pronto!', 'success');

      } catch (error) {
        console.error("Errore durante l'inizializzazione di GrapesJS:", error);
        showNotification('❌ Errore caricamento editor', 'error');
      }
    }

    return () => {
      if (grapesEditorInstance) {
        console.log('Destroying GrapesJS instance.');
        grapesEditorInstance.destroy();
      }
    };
  }, [setEditor, setEmailContent, showNotification]); // Dipendenze: esegui solo quando queste funzioni cambiano

  return (
    <div className="editor-canvas-wrapper">
      <div className="editor-toolbar">
        <button onClick={onBackToTemplates} className="editor-back-button">
          <ArrowLeft size={16} />
          <span>Torna ai Template</span>
        </button>
      </div>
      <div className="editor-main-area">
        <div className="editor-sidebar-left">
          <div id="blocks" className="gjs-blocks"></div>
        </div>
        <div ref={editorContainerRef} className="grapesjs-editor"></div>
        <div className="editor-sidebar-right">
          <div id="styles" className="gjs-styles"></div>
          <div id="layers" className="gjs-layers"></div>
          <div id="traits" className="gjs-traits"></div>
        </div>
      </div>
    </div>
  );
});

EditorCanvas.displayName = 'EditorCanvas';
export default EditorCanvas;