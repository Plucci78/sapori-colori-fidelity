import React, { useEffect, useState, useRef } from 'react';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import './PageBuilderNew.css';

// Plugin imports
import presetWebpage from 'grapesjs-preset-webpage';
import presetNewsletter from 'grapesjs-preset-newsletter';
import blocksBasic from 'grapesjs-blocks-basic';
import pluginForms from 'grapesjs-plugin-forms';
import styleBg from 'grapesjs-style-bg';
import pluginExport from 'grapesjs-plugin-export';
import pluginCountdown from 'grapesjs-component-countdown';
import pluginTabs from 'grapesjs-tabs';
import pluginCustomCode from 'grapesjs-custom-code';
import pluginTouch from 'grapesjs-touch';
import pluginParser from 'grapesjs-parser-postcss';
import pluginTyped from 'grapesjs-typed';

const PageBuilderNew = ({ editingPage, selectedTemplate, onBackToDashboard }) => {
  const editorRef = useRef(null);
  const [editor, setEditor] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState(null);
  const [currentLandingPage, setCurrentLandingPage] = useState(editingPage || null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('light');

  useEffect(() => {
    if (editorRef.current && !editor) {
      console.log('🚀 Inizializzazione GrapesJS Open Source...');
      
      const editorInstance = grapesjs.init({
        container: editorRef.current,
        height: '100vh',
        width: '100%',
        fromElement: false,
        showOffsets: true,
        showBorders: true,
        showGrid: true,
        
        // Plugin configuration - TUTTI I PLUGIN!
        plugins: [
          presetWebpage,
          presetNewsletter,
          blocksBasic,
          pluginForms,
          styleBg,
          pluginExport,
          pluginCountdown,
          pluginTabs,
          pluginCustomCode,
          pluginTouch,
          pluginParser,
          pluginTyped,
        ],
        
        pluginsOpts: {
          [presetWebpage]: {
            modalImportTitle: 'Importa Template',
            modalImportLabel: '<div style="margin-bottom: 10px; font-size: 13px;">Incolla qui il tuo codice HTML/CSS</div>',
            modalImportContent: function(editor) {
              return editor.getHtml() + '<style>' + editor.getCss() + '</style>';
            },
            filestackOpts: false,
            aviaryOpts: false,
            blocksBasicOpts: {
              blocks: ['column1', 'column2', 'column3', 'text', 'link', 'image', 'video'],
              flexGrid: 1,
            },
            customStyleManager: [{
              name: 'Generale',
              buildProps: ['float', 'display', 'position', 'top', 'right', 'left', 'bottom'],
              properties: [{
                name: 'Allineamento',
                property: 'float',
                type: 'radio',
                defaults: 'none',
                list: [
                  { value: 'none', className: 'fa fa-times' },
                  { value: 'left', className: 'fa fa-align-left' },
                  { value: 'right', className: 'fa fa-align-right' }
                ],
              }, {
                property: 'position',
                type: 'select',
              }]
            }, {
              name: 'Dimensioni',
              open: false,
              buildProps: ['width', 'min-height', 'padding'],
              properties: [{
                id: 'flex-width',
                type: 'integer',
                name: 'Larghezza',
                units: ['px', '%'],
                property: 'flex-basis',
                toRequire: 1,
              }, {
                property: 'margin',
                properties: [
                  { name: 'Top', property: 'margin-top' },
                  { name: 'Right', property: 'margin-right' },
                  { name: 'Bottom', property: 'margin-bottom' },
                  { name: 'Left', property: 'margin-left' }
                ],
              }, {
                property: 'padding',
                properties: [
                  { name: 'Top', property: 'padding-top' },
                  { name: 'Right', property: 'padding-right' },
                  { name: 'Bottom', property: 'padding-bottom' },
                  { name: 'Left', property: 'padding-left' }
                ],
              }]
            }, {
              name: 'Tipografia',
              open: false,
              buildProps: ['font-family', 'font-size', 'font-weight', 'letter-spacing', 'color', 'line-height', 'text-align', 'text-decoration', 'text-shadow'],
              properties: [{
                name: 'Font',
                property: 'font-family'
              }, {
                name: 'Peso',
                property: 'font-weight'
              }, {
                name: 'Dimensione font',
                property: 'font-size',
                units: ['px', 'em', 'rem'],
              }, {
                name: 'Spaziatura lettere',
                property: 'letter-spacing',
                units: ['px', 'em'],
              }, {
                name: 'Allineamento testo',
                property: 'text-align'
              }, {
                name: 'Decorazione',
                property: 'text-decoration'
              }, {
                name: 'Colore',
                property: 'color'
              }]
            }, {
              name: 'Decorazioni',
              open: false,
              buildProps: ['opacity', 'background-color', 'border-radius', 'border', 'box-shadow', 'background'],
              properties: [{
                name: 'Opacità',
                property: 'opacity',
                type: 'slider',
                defaults: 1,
                step: 0.01,
                max: 1,
                min: 0,
              }, {
                name: 'Colore sfondo',
                property: 'background-color'
              }, {
                name: 'Raggio bordo',
                property: 'border-radius',
                units: ['px', '%'],
              }, {
                name: 'Bordo',
                property: 'border'
              }, {
                name: 'Ombra',
                property: 'box-shadow'
              }, {
                name: 'Sfondo',
                property: 'background'
              }]
            }]
          },
          [pluginExport]: {
            addExportBtn: true,
            btnLabel: 'Esporta',
            preHtml: '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Landing Page</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>',
            postHtml: '</body></html>',
            inlineCss: true,
          },
          [pluginCountdown]: {
            startTime: '2024-12-31',
            endText: 'Offerta scaduta!',
            dateInputType: 'date',
            defaultStyle: true,
          },
          [pluginTabs]: {},
          [pluginCustomCode]: {},
          [pluginTouch]: {},
          [pluginParser]: {},
          [pluginTyped]: {
            block: {
              category: 'Extra',
              content: {
                type: 'typed',
                'type-speed': 40,
                strings: [
                  'Testo animato 1',
                  'Testo animato 2',
                  'Testo animato 3'
                ],
              }
            }
          },
          [presetNewsletter]: {
            modalLabelImport: 'Incolla il tuo HTML qui',
            modalLabelExport: 'Copia il codice qui sotto',
            codeViewerTheme: 'material',
            tableBasicHtml: `<table style="width:100%; font-family: Arial, sans-serif;"><tr><td style="padding:10px;">Contenuto tabella</td></tr></table>`,
          }
        },
        
        // Storage manager
        storageManager: {
          type: 'local',
          autosave: false,
          autoload: false,
        },
        
        // Asset manager
        assetManager: {
          embedAsBase64: true,
        },
        
        // Canvas settings
        canvas: {
          styles: [
            'https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css'
          ],
          scripts: [],
        },
        
        // UI Settings
        panels: {
          defaults: [{
            id: 'layers',
            el: '.panel__right',
            resizable: {
              maxDim: 350,
              minDim: 200,
              tc: 0,
              cl: 1,
              cr: 0,
              bc: 0,
              keyWidth: 'flex-basis',
            },
          }, {
            id: 'panel-switcher',
            el: '.panel__switcher',
            buttons: [{
              id: 'show-layers',
              active: true,
              label: 'Livelli',
              command: 'show-layers',
              togglable: false,
            }, {
              id: 'show-style',
              active: true,
              label: 'Stili',
              command: 'show-styles',
              togglable: false,
            }, {
              id: 'show-traits',
              active: true,
              label: 'Proprietà',
              command: 'show-traits',
              togglable: false,
            }],
          }]
        },
        
        // Device manager
        deviceManager: {
          devices: [{
            name: 'Desktop',
            width: '',
          }, {
            name: 'Tablet',
            width: '768px',
            widthMedia: '992px',
          }, {
            name: 'Mobile',
            width: '320px',
            widthMedia: '575px',
          }]
        },
        
        // Block manager con molti blocchi
        blockManager: {
          appendTo: '.blocks-container',
          blocks: [
            {
              id: 'section',
              label: '<i class="fa fa-square-o"></i><div>Sezione</div>',
              attributes: { class: 'gjs-block-section' },
              content: '<section style="padding: 50px 20px; margin: 10px 0; background: #f8f9fa;"><h1>Nuova Sezione</h1><p>Inserisci qui il tuo contenuto</p></section>'
            },
            {
              id: 'text',
              label: '<i class="fa fa-text-width"></i><div>Testo</div>',
              content: '<div data-gjs-type="text">Inserisci il tuo testo qui</div>',
            },
            {
              id: 'image',
              label: '<i class="fa fa-picture-o"></i><div>Immagine</div>',
              select: true,
              content: { type: 'image' },
              activate: true,
            },
            {
              id: 'hero-section',
              label: '<i class="fa fa-star"></i><div>Hero</div>',
              category: 'Sezioni',
              content: `
                <section style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 100px 20px; text-align: center;">
                  <h1 style="font-size: 3em; margin-bottom: 20px;">Il Tuo Titolo Qui</h1>
                  <p style="font-size: 1.2em; margin-bottom: 30px;">Sottotitolo o descrizione del tuo servizio</p>
                  <a href="#" style="background: #ff6b6b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Call to Action</a>
                </section>
              `
            },
            {
              id: 'cta-button',
              label: '<i class="fa fa-hand-pointer-o"></i><div>CTA</div>',
              category: 'Elementi',
              content: '<a href="#" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Clicca Qui</a>'
            },
            {
              id: 'testimonial',
              label: '<i class="fa fa-quote-left"></i><div>Testimonianza</div>',
              category: 'Sezioni',
              content: `
                <section style="background: #f8f9fa; padding: 60px 20px; text-align: center;">
                  <div style="max-width: 600px; margin: 0 auto;">
                    <p style="font-size: 1.2em; font-style: italic; margin-bottom: 20px;">"Questa è una testimonianza fantastica del nostro cliente soddisfatto che racconta la sua esperienza positiva."</p>
                    <h4>Nome Cliente</h4>
                    <p>Azienda o Ruolo</p>
                  </div>
                </section>
              `
            },
            {
              id: 'pricing-card',
              label: '<i class="fa fa-credit-card"></i><div>Pricing</div>',
              category: 'Sezioni',
              content: `
                <div style="background: white; border: 1px solid #dee2e6; border-radius: 10px; padding: 30px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 300px; margin: 20px auto;">
                  <h3>Piano Base</h3>
                  <div style="font-size: 2em; color: #007bff; margin: 20px 0;">€29/mese</div>
                  <ul style="list-style: none; padding: 0; margin: 20px 0;">
                    <li>✓ Caratteristica 1</li>
                    <li>✓ Caratteristica 2</li>
                    <li>✓ Caratteristica 3</li>
                  </ul>
                  <a href="#" style="background: #007bff; color: white; padding: 10px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">Scegli Piano</a>
                </div>
              `
            }
          ]
        }
      });

      setEditor(editorInstance);
      
      // Carica template se presente
      if (editingPage) {
        loadLandingPageIntoEditor(editorInstance, editingPage);
      } else if (selectedTemplate) {
        loadTemplateIntoEditor(editorInstance, selectedTemplate);
      } else {
        // Carica contenuto di default
        editorInstance.setComponents(`
          <div style="background: linear-gradient(135deg, #8B4513 0%, #D4AF37 100%); padding: 60px 20px; text-align: center; color: white;">
            <img src="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png" alt="Sapori & Colori" style="height: 80px; margin-bottom: 20px;" />
            <h1 style="font-size: 2.5em; margin: 0; margin-bottom: 20px;">Benvenuto nel Page Builder</h1>
            <p style="font-size: 1.2em; margin: 0;">Trascina i blocchi dalla sidebar per iniziare a costruire la tua landing page</p>
          </div>
          <div style="padding: 50px 20px; text-align: center;">
            <h2>Inizia a Costruire</h2>
            <p>Usa i blocchi sulla sinistra per aggiungere contenuti</p>
          </div>
        `);
      }
      
      console.log('✅ GrapesJS Open Source inizializzato!');
    }

    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, [editingPage, selectedTemplate]);

  // Carica landing page esistente
  const loadLandingPageIntoEditor = (editorInstance, pageData) => {
    console.log('📝 Caricamento landing page:', pageData.title);
    if (pageData.html_content) {
      editorInstance.setComponents(pageData.html_content);
    }
    if (pageData.css_content) {
      editorInstance.setStyle(pageData.css_content);
    }
    setCurrentLandingPage(pageData);
    setPublishedUrl(`${window.location.origin}/api/landing?action=show&slug=${pageData.slug}`);
  };

  // Carica template
  const loadTemplateIntoEditor = (editorInstance, template) => {
    console.log('🎨 Caricamento template:', template.name);
    if (template.html_content) {
      editorInstance.setComponents(template.html_content);
    }
    if (template.css_content) {
      editorInstance.setStyle(template.css_content);
    }
  };

  // Pubblica landing page
  const handlePublish = async () => {
    if (!editor) return;

    setIsPublishing(true);
    
    try {
      const html = editor.getHtml();
      const css = editor.getCss();
      
      if (!html || html.trim() === '') {
        alert('Nessun contenuto da pubblicare');
        setIsPublishing(false);
        return;
      }

      const isUpdate = currentLandingPage && currentLandingPage.id;
      
      let title, slug, apiUrl, requestBody, method;
      
      if (isUpdate) {
        title = currentLandingPage.title;
        slug = currentLandingPage.slug;
        method = 'PUT';
        apiUrl = window.location.hostname === 'localhost' 
          ? 'http://localhost:3001/api/landing'
          : '/api/landing';
        
        requestBody = {
          id: currentLandingPage.id,
          html_content: html,
          css_content: css,
          is_published: true
        };
      } else {
        title = `Landing Page ${new Date().toLocaleDateString('it-IT')} ${new Date().toLocaleTimeString('it-IT')}`;
        slug = `landing-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        method = 'POST';
        apiUrl = window.location.hostname === 'localhost' 
          ? 'http://localhost:3001/api/landing'
          : '/api/landing';
        
        requestBody = {
          title,
          description: `Landing page creata il ${new Date().toLocaleDateString('it-IT')}`,
          slug,
          html_content: html,
          css_content: css,
          meta_title: title,
          meta_description: `Landing page per Sapori & Colori - ${title}`,
          is_published: true
        };
      }
      
      const response = await fetch(apiUrl, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore pubblicazione');
      }

      const result = await response.json();
      const fullUrl = `${window.location.origin}/api/landing?action=show&slug=${result.data.slug}`;
      
      setCurrentLandingPage(result.data);
      setPublishedUrl(fullUrl);
      
      navigator.clipboard.writeText(fullUrl).catch(() => {
        console.warn('Impossibile copiare negli appunti');
      });
      
      const actionText = isUpdate ? 'AGGIORNATA' : 'PUBBLICATA';
      alert(`✅ PAGINA ${actionText}!\n\nLink: ${fullUrl}\n\n🔗 Copiato negli appunti!`);
      
    } catch (error) {
      console.error('Errore:', error);
      alert(`❌ Errore: ${error.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  // Salva come template
  const handleSaveAsTemplate = async () => {
    if (!currentLandingPage || !currentLandingPage.id) {
      alert('Devi prima pubblicare la landing page prima di salvarla come template');
      return;
    }

    const templateName = prompt('Nome del template:', `Template da ${currentLandingPage.title}`);
    if (!templateName) return;

    const templateDescription = prompt('Descrizione del template (opzionale):', '');

    setIsSavingTemplate(true);

    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001/api/landing?action=save-template'
        : '/api/landing?action=save-template';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landing_page_id: currentLandingPage.id,
          template_name: templateName,
          template_description: templateDescription
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore salvataggio template');
      }

      alert(`✅ Template "${templateName}" salvato con successo!`);

    } catch (error) {
      console.error('Errore salvataggio template:', error);
      alert(`❌ Errore: ${error.message}`);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Cambia tema
  const changeTheme = (theme) => {
    setCurrentTheme(theme);
    // Salva preferenza tema nel localStorage
    localStorage.setItem('grapes-theme', theme);
  };

  // Carica tema salvato all'avvio
  useEffect(() => {
    const savedTheme = localStorage.getItem('grapes-theme');
    if (savedTheme && ['light', 'dark', 'professional'].includes(savedTheme)) {
      setCurrentTheme(savedTheme);
    }
  }, []);

  return (
    <div className={`gjs-editor-wrapper theme-${currentTheme}`} style={{ position: 'relative', height: '100vh', width: '100vw' }}>
      {/* Selettore Temi */}
      <div className="theme-selector">
        <div 
          className={`theme-btn light ${currentTheme === 'light' ? 'active' : ''}`}
          onClick={() => changeTheme('light')}
          title="Tema Chiaro"
        />
        <div 
          className={`theme-btn dark ${currentTheme === 'dark' ? 'active' : ''}`}
          onClick={() => changeTheme('dark')}
          title="Tema Scuro"
        />
        <div 
          className={`theme-btn professional ${currentTheme === 'professional' ? 'active' : ''}`}
          onClick={() => changeTheme('professional')}
          title="Tema Professionale"
        />
      </div>
      
      {/* Toolbar Container */}
      <div className="gjs-toolbar-wrapper">
        <div className="panel__switcher"></div>
      </div>
      
      {/* Blocks Panel */}
      <div className="gjs-blocks-wrapper">
        <div className="blocks-container"></div>
      </div>
      
      {/* Canvas Container */}
      <div className="gjs-canvas-wrapper">
        <div ref={editorRef} style={{ height: '100%', width: '100%' }} />
      </div>
      
      {/* Right Panel */}
      <div className="gjs-panels-wrapper">
        <div className="panel__right"></div>
      </div>

      {/* Control Buttons */}
      <div style={{ 
        position: 'absolute', 
        bottom: '20px', 
        right: '20px', 
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'flex-end'
      }}>
        
        {/* Dashboard Button */}
        {onBackToDashboard && (
          <button
            onClick={onBackToDashboard}
            style={{
              background: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            ← Dashboard
          </button>
        )}
        
        {/* Current page info */}
        {currentLandingPage && (
          <div style={{
            background: '#17a2b8',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '11px',
            maxWidth: '250px',
            textAlign: 'center'
          }}>
            📝 Editing: {currentLandingPage.slug.split('-')[1]}
          </div>
        )}
        
        {/* Publish Button */}
        <button
          onClick={handlePublish}
          disabled={isPublishing}
          style={{
            background: currentLandingPage ? '#28a745' : '#fdae4b',
            color: 'white',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: isPublishing ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            opacity: isPublishing ? 0.6 : 1
          }}
        >
          {isPublishing 
            ? '🔄 Salvando...' 
            : currentLandingPage 
              ? '💾 Aggiorna Pagina' 
              : '🚀 Pubblica Nuova'
          }
        </button>
        
        {/* Save as Template Button */}
        {currentLandingPage && (
          <button
            onClick={handleSaveAsTemplate}
            disabled={isSavingTemplate}
            style={{
              background: '#17a2b8',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: isSavingTemplate ? 'not-allowed' : 'pointer',
              opacity: isSavingTemplate ? 0.6 : 1
            }}
          >
            {isSavingTemplate ? '💾 Salvando...' : '📋 Salva come Template'}
          </button>
        )}

        {/* Published URL */}
        {publishedUrl && (
          <div style={{
            background: '#28a745',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '11px',
            maxWidth: '250px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            textAlign: 'center'
          }}
          onClick={() => navigator.clipboard.writeText(publishedUrl)}
          title="Clicca per copiare il link"
          >
            🔗 Copia Link
          </div>
        )}
      </div>

    </div>
  );
};

export default PageBuilderNew;