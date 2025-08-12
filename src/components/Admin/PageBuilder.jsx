import React, { useEffect, useRef, useState } from 'react'
import grapesjs from 'grapesjs'
import 'grapesjs/dist/css/grapes.min.css'

const PageBuilder = () => {
  const editorRef = useRef(null)
  const [editor, setEditor] = useState(null)
  const [loading, setLoading] = useState(true)

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
            id: 'layers',
            el: '.panel__right',
            resizable: {
              maxDim: 350,
              minDim: 200,
              tc: 0,
              cl: 1,
              cr: 0,
              bc: 0,
            },
          },
          {
            id: 'panel-switcher',
            el: '.panel__switcher',
            buttons: [
              {
                id: 'show-layers',
                active: true,
                label: 'Layers',
                command: 'show-layers',
                togglable: false,
              },
              {
                id: 'show-style',
                active: true,
                label: 'Styles',
                command: 'show-styles',
                togglable: false,
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

    setEditor(grapesEditor)
    setLoading(false)

    console.log('✅ GrapesJS inizializzato con successo!')

    return () => {
      if (grapesEditor) {
        grapesEditor.destroy()
      }
    }
  }, [])

  return (
    <div className="page-builder-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {loading && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h3>🎨 Caricamento Page Builder...</h3>
          <p>Preparazione degli strumenti di creazione...</p>
        </div>
      )}
      
      <div style={{ display: 'flex', height: '100vh' }}>
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
    </div>
  )
}

export default PageBuilder