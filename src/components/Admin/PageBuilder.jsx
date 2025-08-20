import React, { useEffect, useState, lazy, Suspense } from 'react';

// LAZY LOAD componenti pesanti - caricati solo quando necessari
const StudioEditor = lazy(() => import('@grapesjs/studio-sdk/react'));

// Hook per lazy loading di GrapesJS plugins
const useGrapesJSPlugins = () => {
  const [plugins, setPlugins] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadPlugins = async () => {
      try {
        // Carica CSS di GrapesJS
        await import('@grapesjs/studio-sdk/style');
        
        // Carica tutti i plugin in parallelo
        const [
          rendererReact,
          grapesjsBlocksBasic,
          grapesjsPluginForms,
          grapesjsCustomCode,
          grapesjsPluginExport,
          grapesjsTabs
        ] = await Promise.all([
          import('@grapesjs/studio-sdk-plugins/dist/rendererReact'),
          import('grapesjs-blocks-basic'),
          import('grapesjs-plugin-forms'),
          import('grapesjs-custom-code'),
          import('grapesjs-plugin-export'),
          import('grapesjs-tabs')
        ]);
        
        setPlugins({
          rendererReact: rendererReact.default,
          grapesjsBlocksBasic: grapesjsBlocksBasic.default,
          grapesjsPluginForms: grapesjsPluginForms.default,
          grapesjsCustomCode: grapesjsCustomCode.default,
          grapesjsPluginExport: grapesjsPluginExport.default,
          grapesjsTabs: grapesjsTabs.default
        });
      } catch (error) {
        console.error('Errore caricamento plugins GrapesJS:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadPlugins();
  }, []);
  
  return { plugins, loading };
};

// Define your custom React components for GrapesJS blocks
// These are simplified versions based on your original HTML content
const SaporiHeader = ({ title, subtitle, logoSrc }) => (
  <div style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #FFD700 100%)', padding: '40px 20px', textAlign: 'center', color: '#8B4513' }}>
    {logoSrc && <img src={logoSrc} alt="Sapori & Colori" style={{ height: '80px', marginBottom: '20px' }} />}
    <h1 style={{ margin: '0', fontSize: '2.5em', fontWeight: 'bold' }}>{title}</h1>
    <p style={{ margin: '10px 0 0 0', fontSize: '1.2em' }}>{subtitle}</p>
  </div>
);

const PromoSection = ({ offer, description, buttonText, buttonLink }) => (
  <div style={{ padding: '60px 20px', textAlign: 'center', background: '#f8f9fa' }}>
    <h2 style={{ fontSize: '2.5em', color: '#D4AF37', marginBottom: '20px' }}>{offer}</h2>
    <p style={{ fontSize: '1.3em', color: '#333', marginBottom: '30px' }}>{description}</p>
    <div style={{ background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', maxWidth: '400px', margin: '0 auto' }}>
      <h3 style={{ color: '#8B4513', marginBottom: '15px' }}>Solo oggi!</h3>
      <p style={{ fontSize: '1.1em', marginBottom: '25px' }}>Mostra questa pagina in negozio</p>
      <a href={buttonLink} style={{ background: '#D4AF37', color: 'white', padding: '15px 30px', textDecoration: 'none', borderRadius: '25px', fontWeight: 'bold', display: 'inline-block' }}>{buttonText}</a>
    </div>
  </div>
);

const ContactCta = ({ phone, whatsapp, mapLink }) => (
  <div style={{ background: '#8B4513', color: 'white', padding: '40px 20px', textAlign: 'center' }}>
    <h3 style={{ marginBottom: '20px' }}>Contattaci Subito!</h3>
    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
      <a href={`tel:${phone}`} style={{ background: '#D4AF37', color: 'white', padding: '12px 25px', textDecoration: 'none', borderRadius: '25px', fontWeight: 'bold' }}>📞 Chiama</a>
      <a href={`https://wa.me/${whatsapp}`} style={{ background: '#25D366', color: 'white', padding: '12px 25px', textDecoration: 'none', borderRadius: '25px', fontWeight: 'bold' }}>💬 WhatsApp</a>
      <a href={mapLink} style={{ background: '#4285F4', color: 'white', padding: '12px 25px', textDecoration: 'none', borderRadius: '25px', fontWeight: 'bold' }}>🗺️ Indicazioni</a>
    </div>
  </div>
);


const PageBuilder = ({ editingPage, selectedTemplate, onBackToDashboard }) => {
  // Publish state - NON tocchiamo l'editor!
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState(null);
  const [editorInstance, setEditorInstance] = useState(null);
  
  // NUOVO: Stato per tracciare landing page esistente
  const [currentLandingPage, setCurrentLandingPage] = useState(editingPage || null);
  
  // Stato per salvataggio template
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  
  // Lazy load dei plugins
  const { plugins, loading: pluginsLoading } = useGrapesJSPlugins();

  // Carica una landing page esistente nell'editor
  const loadLandingPageIntoEditor = (pageData) => {
    if (window.grapesjs && window.grapesjs.editors && window.grapesjs.editors.length > 0) {
      const editor = window.grapesjs.editors[0];
      
      try {
        // Carica i dati del progetto GrapesJS se disponibili
        if (pageData.grapesjs_data && Object.keys(pageData.grapesjs_data).length > 0) {
          editor.loadProjectData(pageData.grapesjs_data);
          console.log('✅ Dati GrapesJS caricati nell\'editor');
        } else if (pageData.html_content) {
          // Fallback: carica solo HTML
          editor.setComponents(pageData.html_content);
          if (pageData.css_content) {
            editor.setStyle(pageData.css_content);
          }
          console.log('✅ HTML/CSS caricati nell\'editor (fallback)');
        }
        
        setCurrentLandingPage(pageData);
        setPublishedUrl(`${window.location.origin}/api/landing?action=show&slug=${pageData.slug}`);
        
      } catch (error) {
        console.error('Errore caricamento landing page:', error);
        alert('Errore nel caricamento della landing page. Prova a ricaricare la pagina.');
      }
    }
  };

  // Carica template selezionato nell'editor
  const loadTemplateIntoEditor = (template) => {
    console.log('🔧 loadTemplateIntoEditor chiamata con:', template.name);
    console.log('🔧 Editor disponibile:', !!(window.grapesjs && window.grapesjs.editors && window.grapesjs.editors.length > 0));
    
    if (window.grapesjs && window.grapesjs.editors && window.grapesjs.editors.length > 0) {
      const editor = window.grapesjs.editors[0];
      console.log('🔧 Editor ottenuto:', !!editor);
      
      try {
        // Prima pulisci l'editor
        console.log('🧹 Pulizia editor...');
        editor.setComponents('');
        editor.setStyle('');
        
        // Poi carica il template
        if (template.grapesjs_data && Object.keys(template.grapesjs_data).length > 0) {
          // Prima priorità: dati GrapesJS completi
          console.log('📋 Caricamento dati GrapesJS completi...');
          editor.loadProjectData(template.grapesjs_data);
          console.log('✅ Dati GrapesJS template caricati:', template.name);
        } else {
          // Seconda priorità: HTML/CSS separati
          console.log('🎨 Caricamento HTML/CSS separati...');
          console.log('📄 HTML length:', template.html_content?.length || 0);
          console.log('🎨 CSS length:', template.css_content?.length || 0);
          
          if (template.html_content) {
            console.log('📄 Impostando componenti HTML...');
            editor.setComponents(template.html_content);
            console.log('✅ HTML template caricato:', template.name, template.html_content.length, 'chars');
          }
          if (template.css_content) {
            console.log('🎨 Impostando CSS...');
            editor.setStyle(template.css_content);
            console.log('✅ CSS template caricato:', template.name);
          }
        }
        
        // Forza refresh dell'editor
        console.log('🔄 Forzando refresh dell\'editor...');
        editor.refresh();
        
        console.log('✅ Template caricato completamente:', template.name);
      } catch (error) {
        console.error('❌ Errore caricamento template:', error);
        alert('Errore nel caricamento del template. Prova a ricaricare la pagina.');
      }
    } else {
      console.error('❌ Editor GrapesJS non disponibile!');
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

      const result = await response.json();
      alert(`✅ Template "${templateName}" salvato con successo!\n\nPotrai riutilizzarlo creando nuove landing pages.`);

    } catch (error) {
      console.error('Errore salvataggio template:', error);
      alert(`❌ Errore: ${error.message}`);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Effetto per caricare contenuti dopo l'inizializzazione di GrapesJS
  useEffect(() => {
    console.log('🎯 useEffect triggered - plugins:', !!plugins, 'editingPage:', !!editingPage, 'selectedTemplate:', !!selectedTemplate);
    console.log('🎯 selectedTemplate data:', selectedTemplate);
    
    if (plugins) {
      // Funzione per aspettare che l'editor sia completamente inizializzato
      const waitForEditor = (attempt = 1, maxAttempts = 10) => {
        console.log(`⏳ Tentativo ${attempt}/${maxAttempts} - controllo editor...`);
        
        if (window.grapesjs && window.grapesjs.editors && window.grapesjs.editors.length > 0) {
          const editor = window.grapesjs.editors[0];
          console.log('✅ Editor trovato, controllo inizializzazione...');
          
          // Aspetta che l'editor sia completamente inizializzato
          setTimeout(() => {
            const loadContent = () => {
              console.log('🔄 loadContent called');
              if (editingPage) {
                // Modifica landing page esistente (se non caricata già tramite project)
                if (!editingPage.grapesjs_data) {
                  console.log('📝 Caricamento landing page esistente senza dati GrapesJS');
                  loadLandingPageIntoEditor(editingPage);
                } else {
                  console.log('📝 Landing page ha già dati GrapesJS, saltando caricamento useEffect');
                }
              } else if (selectedTemplate) {
                // Nuovo da template (se non caricato già tramite project) 
                console.log('🎨 Template ricevuto:', selectedTemplate.name, 'ha grapesjs_data:', !!selectedTemplate.grapesjs_data);
                if (!selectedTemplate.grapesjs_data) {
                  console.log('🎨 Caricamento template senza dati GrapesJS:', selectedTemplate.name);
                  loadTemplateIntoEditor(selectedTemplate);
                } else {
                  console.log('🎨 Template ha già dati GrapesJS, saltando caricamento useEffect');
                }
              } else {
                console.log('❌ Nessun template o editingPage da caricare');
              }
            };
            
            loadContent();
          }, 500 + (attempt * 300)); // Timeout crescente per ogni tentativo
          
        } else if (attempt < maxAttempts) {
          console.log(`⏳ Editor non ancora disponibile, riprovo tra ${attempt * 500}ms...`);
          setTimeout(() => waitForEditor(attempt + 1, maxAttempts), attempt * 500);
        } else {
          console.log('❌ Editor non disponibile dopo tutti i tentativi');
        }
      };
      
      // Inizia il processo di attesa
      waitForEditor();
    } else {
      console.log('❌ Plugins non ancora disponibili');
    }
  }, [editingPage, selectedTemplate, plugins]);

  // Funzione di pubblicazione SICURA
  const handlePublish = async () => {
    // Prova ad accedere all'editor tramite il DOM
    const editorElement = document.querySelector('.gjs-editor');
    if (!editorElement) {
      alert('Editor non trovato. Attendi che si carichi completamente.');
      return;
    }

    setIsPublishing(true);
    
    try {
      // Prova diversi modi per accedere all'editor
      let html = '';
      let css = '';
      let projectData = {};
      
      // METODO MIGLIORATO: Estrai HTML dai React components di GrapesJS
      if (window.grapesjs && window.grapesjs.editors && window.grapesjs.editors.length > 0) {
        const editor = window.grapesjs.editors[0];
        css = editor.getCss();
        projectData = editor.getProjectData();
        
        // Per React components, usa getHtml() che gestisce meglio i componenti
        html = editor.getHtml();
        console.log('✅ HTML estratto da GrapesJS API:', html.substring(0, 200) + '...');
        
        // Se l'HTML è ancora vuoto, prova ad accedere ai componenti direttamente
        if (!html || html.trim().length < 50) {
          try {
            const wrapper = editor.getWrapper();
            const components = wrapper.find('*');
            
            // Costruisci HTML dai componenti React
            const reactHtml = components.map(comp => {
              const view = comp.getView();
              if (view && view.el) {
                return view.el.outerHTML;
              }
              return '';
            }).join('');
            
            if (reactHtml && reactHtml.length > 50) {
              html = reactHtml;
              console.log('✅ HTML estratto dai componenti React:', html.substring(0, 200) + '...');
            }
          } catch (reactError) {
            console.warn('⚠️ Errore estrazione componenti React:', reactError);
          }
        }
      }
      
      // Fallback: prova canvas DOM come ultima risorsa
      // Metodo alternativo: converti i React components in HTML statico
      if (!html || html.trim().length < 50) {
        try {
          if (window.grapesjs && window.grapesjs.editors && window.grapesjs.editors.length > 0) {
            const editor = window.grapesjs.editors[0];
            const wrapper = editor.getWrapper();
            
            // Renderizza manualmente i componenti React come HTML
            const renderComponent = (component) => {
              const type = component.get('type');
              const props = component.get('props') || {};
              
              switch (type) {
                case 'SaporiHeader':
                  return `
                    <div style="background: linear-gradient(135deg, #D4AF37 0%, #FFD700 100%); padding: 40px 20px; text-align: center; color: #8B4513;">
                      ${props.logoSrc ? `<img src="${props.logoSrc}" alt="Sapori & Colori" style="height: 80px; margin-bottom: 20px;" />` : ''}
                      <h1 style="margin: 0; font-size: 2.5em; font-weight: bold;">${props.title || 'Sapori & Colori'}</h1>
                      <p style="margin: 10px 0 0 0; font-size: 1.2em;">${props.subtitle || 'Il sapore autentico della tradizione'}</p>
                    </div>`;
                
                case 'PromoSection':
                  return `
                    <div style="padding: 60px 20px; text-align: center; background: #f8f9fa;">
                      <h2 style="font-size: 2.5em; color: #D4AF37; margin-bottom: 20px;">${props.offer || '🍕 OFFERTA SPECIALE!'}</h2>
                      <p style="font-size: 1.3em; color: #333; margin-bottom: 30px;">${props.description || 'La tua pizza preferita con il 30% di sconto'}</p>
                      <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto;">
                        <h3 style="color: #8B4513; margin-bottom: 15px;">Solo oggi!</h3>
                        <p style="font-size: 1.1em; margin-bottom: 25px;">Mostra questa pagina in negozio</p>
                        <a href="${props.buttonLink || '#'}" style="background: #D4AF37; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">${props.buttonText || '📞 Chiama Ora!'}</a>
                      </div>
                    </div>`;
                
                case 'ContactCta':
                  return `
                    <div style="background: #8B4513; color: white; padding: 40px 20px; text-align: center;">
                      <h3 style="margin-bottom: 20px;">Contattaci Subito!</h3>
                      <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
                        <a href="tel:${props.phone || '+393926568550'}" style="background: #D4AF37; color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; font-weight: bold;">📞 Chiama</a>
                        <a href="https://wa.me/${props.whatsapp || '393926568550'}" style="background: #25D366; color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; font-weight: bold;">💬 WhatsApp</a>
                        <a href="${props.mapLink || '#'}" style="background: #4285F4; color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; font-weight: bold;">🗺️ Indicazioni</a>
                      </div>
                    </div>`;
                
                default:
                  // Per componenti standard, usa il contenuto esistente
                  const view = component.getView();
                  return view && view.el ? view.el.outerHTML : '';
              }
            };
            
            const components = wrapper.find('*');
            const staticHtml = components.map(renderComponent).join('');
            
            if (staticHtml && staticHtml.length > 50) {
              html = staticHtml;
              console.log('✅ HTML convertito da React components:', html.substring(0, 200) + '...');
            }
          }
        } catch (conversionError) {
          console.warn('⚠️ Errore conversione React components:', conversionError);
        }
      }
      
      // Ultimo fallback: canvas DOM
      if (!html || html.trim().length < 50) {
        const canvas = document.querySelector('#gjs .gjs-cv-canvas');
        if (canvas && canvas.contentDocument && canvas.contentDocument.body) {
          html = canvas.contentDocument.body.innerHTML;
          console.log('🔄 HTML estratto dal canvas DOM (ultimo fallback):', html.substring(0, 200) + '...');
        }
      }
      
      if (!html) {
        throw new Error('Impossibile accedere al contenuto dell\'editor');
      }
      
      if (!html || html.trim() === '') {
        alert('Nessun contenuto da pubblicare');
        setIsPublishing(false);
        return;
      }

      // Determina se è un aggiornamento o una nuova creazione
      const isUpdate = currentLandingPage && currentLandingPage.id;
      
      let title, slug, apiUrl, requestBody, method;
      
      if (isUpdate) {
        // AGGIORNAMENTO: Mantieni titolo e slug esistenti
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
          grapesjs_data: projectData,
          is_published: true
        };
        
        console.log(`🔄 Aggiornamento landing page esistente: ${slug}`);
      } else {
        // NUOVA CREAZIONE: Genera nuovi titolo e slug
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
          grapesjs_data: projectData,
          meta_title: title,
          meta_description: `Landing page per OneSignal - ${title}`,
          is_published: true
        };
        
        console.log(`✨ Creazione nuova landing page: ${slug}`);
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
      
      // Aggiorna lo stato della landing page corrente
      setCurrentLandingPage(result.data);
      setPublishedUrl(fullUrl);
      
      // Copia negli appunti
      navigator.clipboard.writeText(fullUrl).catch(() => {
        console.warn('Impossibile copiare negli appunti');
      });
      
      const actionText = isUpdate ? 'AGGIORNATA' : 'PUBBLICATA';
      const successMessage = isUpdate 
        ? `✅ PAGINA ${actionText}!\n\nLe modifiche sono state salvate al link esistente:\n${fullUrl}\n\n🔗 Copiato negli appunti!`
        : `✅ PAGINA ${actionText}!\n\nLink pubblico:\n${fullUrl}\n\n🔗 Copiato negli appunti!\n\nPuoi usare questo link per condividere la pagina.`;
      
      alert(successMessage);
      
    } catch (error) {
      console.error('Errore:', error);
      alert(`❌ Errore: ${error.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  // No need for editorRef, editor state, or complex useEffects for initialization
  // StudioEditor handles its own lifecycle

  // Define the React components GrapesJS will use
  const reactRendererConfig = {
    components: {
      SaporiHeader: {
        component: SaporiHeader,
        props: () => [
          { type: 'text', name: 'title', label: 'Titolo', value: 'Sapori & Colori' },
          { type: 'text', name: 'subtitle', label: 'Sottotitolo', value: 'Il sapore autentico della tradizione' },
          { type: 'text', name: 'logoSrc', label: 'URL Logo', value: 'https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png' },
        ],
      },
      PromoSection: {
        component: PromoSection,
        props: () => [
          { type: 'text', name: 'offer', label: 'Offerta', value: '🍕 OFFERTA SPECIALE!' },
          { type: 'text', name: 'description', label: 'Descrizione', value: 'La tua pizza preferita con il 30% di sconto' },
          { type: 'text', name: 'buttonText', label: 'Testo Bottone', value: '📞 Chiama Ora!' },
          { type: 'text', name: 'buttonLink', label: 'Link Bottone', value: 'tel:+393926568550' },
        ],
      },
      ContactCta: {
        component: ContactCta,
        props: () => [
          { type: 'text', name: 'phone', label: 'Telefono', value: '+393926568550' },
          { type: 'text', name: 'whatsapp', label: 'WhatsApp', value: '393926568550' },
          { type: 'text', name: 'mapLink', label: 'Link Mappa', value: 'https://maps.google.com/?q=Via+Roma+123+Roma' },
        ],
      },
    },
  };

  // Loading state mentre i plugins si caricano
  if (pluginsLoading || !plugins) {
    return (
      <div style={{ 
        height: '100vh',
        background: 'linear-gradient(135deg, #8B4513 0%, #D4AF37 50%, #FFD700 100%)',
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background Pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.1,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.3"%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          backgroundSize: '60px 60px'
        }} />
        
        {/* Main Content */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '20px',
          padding: '60px 40px',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
          textAlign: 'center',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          maxWidth: '500px',
          width: '90%'
        }}>
          {/* Logo */}
          <div style={{ marginBottom: '30px' }}>
            <img 
              src="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png" 
              alt="Sapori & Colori" 
              style={{ 
                height: '80px', 
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' 
              }} 
            />
          </div>
          
          {/* Title */}
          <h1 style={{
            color: '#8B4513',
            fontSize: '2.2em',
            fontWeight: '800',
            margin: '0 0 10px 0',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            Page Builder
          </h1>
          
          <p style={{
            color: '#666',
            fontSize: '1.1em',
            margin: '0 0 40px 0',
            opacity: 0.8
          }}>
            Preparazione dell'ambiente di creazione
          </p>
          
          {/* Loading Animation */}
          <div style={{
            position: 'relative',
            width: '60px',
            height: '60px',
            margin: '0 auto 30px auto'
          }}>
            <div style={{
              position: 'absolute',
              width: '60px',
              height: '60px',
              border: '4px solid #E5E5E5',
              borderTop: '4px solid #D4AF37',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '24px'
            }}>
              🎨
            </div>
          </div>
          
          {/* Progress Steps */}
          <div style={{ textAlign: 'left', maxWidth: '300px', margin: '0 auto' }}>
            <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: '#4CAF50' 
              }} />
              <span style={{ fontSize: '14px', color: '#4CAF50' }}>✓ Caricamento librerie</span>
            </div>
            <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: '#D4AF37',
                animation: 'pulse 1.5s ease-in-out infinite alternate' 
              }} />
              <span style={{ fontSize: '14px', color: '#666' }}>Inizializzazione plugins...</span>
            </div>
            <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: '#E5E5E5' 
              }} />
              <span style={{ fontSize: '14px', color: '#999' }}>Preparazione editor</span>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div style={{
          position: 'absolute',
          bottom: '30px',
          color: 'rgba(255, 255, 255, 0.8)',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '5px' }}>💡 Powered by GrapesJS Studio</div>
          <div>Sapori & Colori - Landing Page Builder</div>
        </div>
        
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            from { opacity: 1; transform: scale(1); }
            to { opacity: 0.5; transform: scale(1.2); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw' }}>
      {/* BOTTONI CONTROLLO - in basso a destra */}
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
        
        {/* Pulsante Dashboard */}
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
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ← Dashboard
          </button>
        )}
        
        {/* Info landing page corrente */}
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
        
        {/* Bottone principale */}
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
        
        {/* Pulsante salva come template */}
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

        {/* Pulsante nuova sessione */}
        {currentLandingPage && (
          <button
            onClick={() => {
              if (confirm('Vuoi iniziare una nuova landing page? Le modifiche non salvate verranno perse.')) {
                setCurrentLandingPage(null);
                setPublishedUrl(null);
                // Opzionalmente, resetta l'editor
                if (window.grapesjs && window.grapesjs.editors && window.grapesjs.editors.length > 0) {
                  const editor = window.grapesjs.editors[0];
                  editor.runCommand('core:canvas-clear');
                }
              }
            }}
            style={{
              background: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            ✨ Nuova Pagina
          </button>
        )}
        
        {/* Link copiato */}
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

      <Suspense fallback={
        <div style={{ 
          height: '100vh',
          background: 'linear-gradient(135deg, #8B4513 0%, #D4AF37 50%, #FFD700 100%)',
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '20px',
            padding: '40px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
            textAlign: 'center',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid #E5E5E5',
              borderTop: '4px solid #D4AF37',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px auto'
            }} />
            <div style={{ fontSize: '18px', color: '#8B4513', fontWeight: '600' }}>
              Inizializzazione editor...
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
              Un momento, stiamo caricando l'interfaccia
            </div>
          </div>
        </div>
      }>
        <StudioEditor
          options={{
            licenseKey: import.meta.env.VITE_GRAPESJS_LICENSE_KEY,
            
            // The React Renderer plugin
            plugins: [
              plugins.rendererReact.init(reactRendererConfig),
              plugins.grapesjsBlocksBasic,
              plugins.grapesjsPluginForms,
              plugins.grapesjsCustomCode,
              plugins.grapesjsPluginExport,
              plugins.grapesjsTabs,
              // Add blocks for your custom React components
              (editor) => {
                editor.Blocks.add('sapori-header', {
                  label: 'Header Sapori & Colori',
                  category: 'Sapori & Colori',
                  content: { type: 'SaporiHeader', props: { title: 'Sapori & Colori', subtitle: 'Il sapore autentico della tradizione', logoSrc: 'https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png' } },
                });
                editor.Blocks.add('promo-section', {
                  label: 'Sezione Promozione',
                  category: 'Sapori & Colori',
                  content: { type: 'PromoSection', props: { offer: '🍕 OFFERTA SPECIALE!', description: 'La tua pizza preferita con il 30% di sconto', buttonText: '📞 Chiama Ora!', buttonLink: 'tel:+393926568550' } },
                });
                editor.Blocks.add('contact-cta', {
                  label: 'Call to Action Contatti',
                  category: 'Sapori & Colori',
                  content: { type: 'ContactCta', props: { phone: '+393926568550', whatsapp: '393926568550', mapLink: 'https://maps.google.com/?q=Via+Roma+123+Roma' } },
                });
              }
            ],
            // Initial project content
            project: (() => {
              // Se stiamo modificando una landing page esistente, carica i suoi dati
              if (editingPage && editingPage.grapesjs_data) {
                return editingPage.grapesjs_data;
              }
              
              // Se abbiamo un template selezionato con dati GrapesJS completi, usa quello
              if (selectedTemplate && selectedTemplate.grapesjs_data) {
                return selectedTemplate.grapesjs_data;
              }
              
              // Se abbiamo un template ma senza dati GrapesJS, inizia vuoto (verrà caricato dal useEffect)
              if (selectedTemplate) {
                return undefined; // Nessun progetto iniziale, GrapesJS inizia completamente vuoto
              }
              
              // Altrimenti usa il progetto di benvenuto
              return {
                type: 'react',
                default: {
                  pages: [
                    {
                      name: 'Pagina Iniziale',
                      component: (
                        <>
                          <SaporiHeader title="Benvenuto nel Page Builder" subtitle="Crea le tue landing page con facilità" logoSrc="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png" />
                          <PromoSection offer="Offerta di Benvenuto!" description="Trascina i blocchi per iniziare a costruire!" buttonText="Scopri di più" buttonLink="#" />
                        </>
                      )
                    },
                  ]
                }
              };
            })(),
            // Other GrapesJS options (optional)
            height: '100%',
            width: '100%',
            showOffsets: true,
            noticeOnUnload: false,
            storageManager: {
              type: 'local',
              autosave: true,
              autoload: true,
              stepsBeforeSave: 3
            },
            deviceManager: {
              devices: [
                { name: 'Desktop', width: '' },
                { name: 'Tablet', width: '768px', widthMedia: '992px' },
                { name: 'Mobile', width: '375px', widthMedia: '575px' }
              ]
            },
          }}
        />
      </Suspense>
    </div>
  );
};

export default PageBuilder;