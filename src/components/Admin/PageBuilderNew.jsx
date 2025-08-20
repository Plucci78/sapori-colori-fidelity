import React, { useEffect, useState, useRef } from 'react';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';

// Plugin imports
import presetWebpage from 'grapesjs-preset-webpage';
import blocksBasic from 'grapesjs-blocks-basic';
import pluginForms from 'grapesjs-plugin-forms';
import styleBg from 'grapesjs-style-bg';
import pluginExport from 'grapesjs-plugin-export';

const PageBuilderNew = ({ editingPage, selectedTemplate, onBackToDashboard }) => {
  const editorRef = useRef(null);
  const [editor, setEditor] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState(null);
  const [currentLandingPage, setCurrentLandingPage] = useState(editingPage || null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  useEffect(() => {
    if (editorRef.current && !editor) {
      console.log('🚀 Inizializzazione GrapesJS Open Source...');
      
      const editorInstance = grapesjs.init({
        container: editorRef.current,
        height: '100vh',
        width: '100%',
        
        // Plugin configuration
        plugins: [
          presetWebpage,
          blocksBasic,
          pluginForms,
          styleBg,
          pluginExport,
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
        
        // Block manager
        blockManager: {
          appendTo: '.blocks-container',
          blocks: [
            {
              id: 'section',
              label: '<i class="fa fa-square-o"></i><div>Sezione</div>',
              attributes: { class: 'gjs-block-section' },
              content: '<section style="padding: 50px 20px; margin: 10px 0;"><h1>Nuova Sezione</h1><p>Inserisci qui il tuo contenuto</p></section>'
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

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw' }}>
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

      {/* GrapesJS Editor Container */}
      <div ref={editorRef} style={{ height: '100vh', width: '100%' }} />
    </div>
  );
};

export default PageBuilderNew;