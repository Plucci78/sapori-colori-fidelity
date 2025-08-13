import React, { useState, useRef } from 'react';
import StudioEditor from '@grapesjs/studio-sdk/react';
import { flexComponent, canvasFullSize, tableComponent, swiperComponent, iconifyComponent, accordionComponent, listPagesComponent, fsLightboxComponent, youtubeAssetProvider, lightGalleryComponent, rteProseMirror, canvasEmptyState, layoutSidebarButtons, canvasGridMode } from '@grapesjs/studio-sdk-plugins';
import '@grapesjs/studio-sdk/style';



const PageBuilder = () => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState(null);
  const editorRef = useRef(null);
  
  const handlePublish = async () => {
    if (!editorRef.current) {
      alert('Editor non disponibile');
      return;
    }

    setIsPublishing(true);
    
    try {
      const editor = editorRef.current;
      
      // Get HTML and CSS from GrapesJS
      const html = editor.getHtml();
      const css = editor.getCss();
      const projectData = editor.getProjectData();
      
      if (!html || html.trim() === '') {
        alert('Nessun contenuto da pubblicare');
        setIsPublishing(false);
        return;
      }

      // Generate title and slug
      const title = `Landing Page ${new Date().toLocaleDateString('it-IT')} ${new Date().toLocaleTimeString('it-IT')}`;
      const slug = `landing-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      
      // Call API to save landing page
      const response = await fetch('http://localhost:3001/api/landing-pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description: `Landing page creata con GrapesJS il ${new Date().toLocaleDateString('it-IT')}`,
          slug,
          html_content: html,
          css_content: css,
          grapesjs_data: projectData,
          meta_title: title,
          meta_description: `Landing page personalizzata per Sapori & Colori`,
          is_published: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante la pubblicazione');
      }

      const result = await response.json();
      const fullUrl = `${window.location.origin}/api/landing/${result.data.slug}`;
      
      setPublishedUrl(fullUrl);
      
      // Copy to clipboard
      navigator.clipboard.writeText(fullUrl).catch(() => {
        console.warn('Non è stato possibile copiare il link negli appunti');
      });
      
      alert(`✅ Pagina pubblicata con successo!\n\nLink: ${fullUrl}\n\n🔗 Link copiato negli appunti!`);
      
    } catch (error) {
      console.error('Errore pubblicazione:', error);
      alert(`❌ Errore durante la pubblicazione: ${error.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
      {/* Publish Button */}
      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        right: '10px', 
        zIndex: 10000,
        display: 'flex',
        gap: '10px',
        alignItems: 'center'
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
            fontSize: '12px',
            maxWidth: '300px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            ✅ Pubblicato: {publishedUrl}
          </div>
        )}
      </div>
      
      <StudioEditor
        ref={editorRef}
        options={{
        licenseKey: import.meta.env.VITE_GRAPESJS_LICENSE_KEY,
        theme: 'light',
        customTheme: {
          default: {
            colors: {
              global: {
                background1: "rgba(35, 30, 25, 1)",
                background2: "rgba(30, 25, 20, 1)",
                background3: "rgba(25, 20, 15, 1)",
                backgroundHover: "rgba(50, 40, 30, 1)",
                text: "rgba(220, 200, 180, 1)",
                border: "rgba(80, 60, 40, 1)",
                focus: "rgba(230, 150, 80, 0.8)",
                placeholder: "rgba(170, 150, 130, 1)"
              },
              primary: {
                background1: "#fdae4b",
                background3: "#d98a36",
                backgroundHover: "#ffb85c",
                text: "rgba(0, 0, 0, 1)"
              },
              component: {
                background1: "rgba(120, 70, 40, 1)",
                background2: "rgba(100, 60, 30, 1)",
                background3: "rgba(80, 50, 25, 1)",
                text: "rgba(220, 200, 180, 1)"
              },
              selector: {
                background1: "rgba(190, 110, 40, 1)",
                background2: "rgba(220, 140, 60, 1)",
                text: "rgba(255, 255, 255, 1)"
              },
              symbol: {
                background1: "#fdae4b",
                background2: "#e09341",
                background3: "#b87430",
                text: "rgba(255, 255, 255, 1)"
              }
            }
          }
        },
        project: {
          type: 'web',
          id: 'UNIQUE_PROJECT_ID'
        },
        identity: {
          id: 'UNIQUE_END_USER_ID'
        },
        assets: {
          storageType: 'cloud'
        },
        storage: {
          type: 'cloud',
          autosaveChanges: 100,
          autosaveIntervalMs: 10000
        },
        plugins: [
          flexComponent.init({ }),
          canvasFullSize.init({ }),
          tableComponent.init({ }),
          swiperComponent.init({ }),
          iconifyComponent.init({ }),
          accordionComponent.init({ }),
          listPagesComponent.init({ }),
          fsLightboxComponent.init({ }),
          youtubeAssetProvider.init({ }),
          lightGalleryComponent.init({ }),
          rteProseMirror.init({ }),
          canvasEmptyState.init({ }),
          layoutSidebarButtons.init({ }),
          canvasGridMode.init({ })
        ]
        }}
      />
    </div>
  );
};

export default PageBuilder;