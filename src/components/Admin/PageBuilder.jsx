import React, { useEffect, useState } from 'react';
import StudioEditor from '@grapesjs/studio-sdk/react';
import '@grapesjs/studio-sdk/style';
import rendererReact from '@grapesjs/studio-sdk-plugins/dist/rendererReact';
import grapesjsBlocksBasic from 'grapesjs-blocks-basic';
import grapesjsPluginForms from 'grapesjs-plugin-forms';
import grapesjsCustomCode from 'grapesjs-custom-code';
import grapesjsPluginExport from 'grapesjs-plugin-export';
import grapesjsTabs from 'grapesjs-tabs';

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


const PageBuilder = () => {
  // Publish state - NON tocchiamo l'editor!
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState(null);
  const [editorInstance, setEditorInstance] = useState(null);

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

      // Genera title e slug
      const title = `Landing Page ${new Date().toLocaleDateString('it-IT')} ${new Date().toLocaleTimeString('it-IT')}`;
      const slug = `landing-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      
      // Chiama API - usa URL dinamico per produzione/locale
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001/api/landing'
        : '/api/landing';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: `Landing page creata il ${new Date().toLocaleDateString('it-IT')}`,
          slug,
          html_content: html,
          css_content: css,
          grapesjs_data: projectData,
          meta_title: title,
          meta_description: `Landing page per OneSignal - ${title}`,
          is_published: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore pubblicazione');
      }

      const result = await response.json();
      const fullUrl = `${window.location.origin}/api/landing?action=show&slug=${result.data.slug}`;
      
      setPublishedUrl(fullUrl);
      
      // Copia negli appunti
      navigator.clipboard.writeText(fullUrl).catch(() => {
        console.warn('Impossibile copiare negli appunti');
      });
      
      alert(`✅ PAGINA PUBBLICATA!\n\nLink pubblico:\n${fullUrl}\n\n🔗 Copiato negli appunti!\n\nPuoi usare questo link per condividere la pagina.`);
      
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

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw' }}>
      {/* BOTTONE SICURO - in basso a destra */}
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
        <button
          onClick={handlePublish}
          disabled={isPublishing}
          style={{
            background: '#fdae4b',
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
          {isPublishing ? '🔄 Pubblicando...' : '🚀 Pubblica Pagina'}
        </button>
        
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
            ✅ Link copiato
          </div>
        )}
      </div>

      <StudioEditor
        options={{
          licenseKey: import.meta.env.VITE_GRAPESJS_LICENSE_KEY,
          
          // The React Renderer plugin
          plugins: [
            rendererReact.init(reactRendererConfig),
            grapesjsBlocksBasic,
            grapesjsPluginForms,
            grapesjsCustomCode,
            grapesjsPluginExport,
            grapesjsTabs,
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
          // Initial project content using React components
          project: {
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
          },
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
    </div>
  );
};

export default PageBuilder;