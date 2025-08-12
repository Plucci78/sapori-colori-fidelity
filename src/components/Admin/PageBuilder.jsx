import { useEffect, useRef, useState } from 'react'
import Frame from 'react-frame-component'
import grapesjs from 'grapesjs'

// Importa i plugin di base per avere dei blocchi da testare
import gjsPresetWebpage from 'grapesjs-preset-webpage'

const PageBuilderMinimal = () => {
  const editorRef = useRef(null)
  const [editor, setEditor] = useState(null)

  // Head per l'iframe, solo con gli stili essenziali di GrapesJS
  const frameHead = (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/grapesjs@0.22.9/dist/css/grapes.min.css"
      />
      <style>{`
        body, html {
          margin: 0;
          height: 100%;
        }
      `}</style>
    </>
  )

  useEffect(() => {
    // Funzione di inizializzazione semplificata
    const initialize = () => {
      if (!editorRef.current) {
        console.log('Ref non pronto, riprovo...');
        setTimeout(initialize, 100);
        return;
      }

      if (editor) {
        return; // Già inizializzato
      }

      console.log('🎨 Inizializzazione GrapesJS in modalità minimale...');

      try {
        const grapesEditor = grapesjs.init({
          // Usa il div come contenitore
          container: editorRef.current,
          height: '100%',
          width: '100%',
          
          // Carica solo i plugin di base per avere i blocchi
          plugins: [gjsPresetWebpage],
          pluginsOpts: {
            [gjsPresetWebpage]: {}
          },

          // Contenuto iniziale per vedere se funziona
          components: `
            <div style="padding: 50px; text-align: center;">
              <h1>Area di Disegno Attiva</h1>
              <p>Se vedi questo, l\'editor funziona. Prova a trascinare i blocchi qui.</p>
            </div>
          `,
          
          // Rimuoviamo la gestione custom di pannelli e blocchi
          // blockManager: { ... },
          // panels: { ... },
        });

        setEditor(grapesEditor);
        console.log('✅ GrapesJS (minimale) inizializzato con successo!');

      } catch (error) {
        console.error('❌ Errore inizializzazione GrapesJS (minimale):', error)
      }
    }

    // Avvia l'inizializzazione
    const timer = setTimeout(initialize, 100);

    // Distruggi l'editor quando il componente viene smontato
    return () => {
        clearTimeout(timer);
        if (editor) {
            editor.destroy()
        }
    }
  }, [editor]) // L'effetto dipende solo dall'editor

  return (
    <Frame
      head={frameHead}
      style={{ width: '100%', height: '100vh', border: '2px dashed blue' }} // Bordo per debug
    >
      {/* L'unica cosa renderizzata è il div per l'editor */}
      <div ref={editorRef} style={{ height: '100%' }}></div>
    </Frame>
  )
}

export default PageBuilderMinimal
