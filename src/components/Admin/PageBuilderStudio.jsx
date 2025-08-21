import React, { useState, useEffect, useRef } from 'react';
import StudioEditor from '@grapesjs/studio-sdk/react';
import { flexComponent, canvasFullSize, rteProseMirror, tableComponent, swiperComponent, canvasEmptyState, iconifyComponent, accordionComponent, listPagesComponent, fsLightboxComponent, layoutSidebarButtons, youtubeAssetProvider, lightGalleryComponent } from '@grapesjs/studio-sdk-plugins';
import '@grapesjs/studio-sdk/style';

const PageBuilderStudio = ({ editingPage, selectedTemplate, onBackToDashboard }) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState(null);
  const [currentLandingPage, setCurrentLandingPage] = useState(editingPage || null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('light');
  const [editorReady, setEditorReady] = useState(false);
  const editorRef = useRef(null);

  // Carica tema salvato
  useEffect(() => {
    const savedTheme = localStorage.getItem('grapes-theme');
    if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
      setCurrentTheme(savedTheme);
    }
  }, []);

  // Carica template o landing page quando l'editor è pronto
  useEffect(() => {
    if (!editorReady || !editorRef.current) return;

    const editor = editorRef.current;
    
    if (editingPage) {
      console.log('📝 Caricamento landing page esistente:', editingPage.title);
      if (editingPage.html_content) {
        editor.setComponents && editor.setComponents(editingPage.html_content);
      }
      if (editingPage.css_content) {
        editor.setStyle && editor.setStyle(editingPage.css_content);
      }
      setPublishedUrl(`${window.location.origin}/api/landing?action=show&slug=${editingPage.slug}`);
    } else if (selectedTemplate) {
      console.log('🎨 Caricamento template:', selectedTemplate.name);
      if (selectedTemplate.html_content) {
        editor.setComponents && editor.setComponents(selectedTemplate.html_content);
      }
      if (selectedTemplate.css_content) {
        editor.setStyle && editor.setStyle(selectedTemplate.css_content);
      }
    } else {
      console.log('🆕 Nuova landing page');
      // Contenuto di default per nuove pagine
      const defaultContent = `
        <div style="background: linear-gradient(135deg, #fdae4b 0%, #d98a36 100%); padding: 60px 20px; text-align: center; color: white;">
          <img src="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png" alt="Sapori & Colori" style="height: 80px; margin-bottom: 20px;" />
          <h1 style="font-size: 2.5em; margin: 0; margin-bottom: 20px;">Benvenuto nel Studio SDK</h1>
          <p style="font-size: 1.2em; margin: 0;">Trascina i componenti per iniziare a costruire la tua landing page</p>
        </div>
        <div style="padding: 50px 20px; text-align: center;">
          <h2>Inizia a Costruire</h2>
          <p>Usa i componenti nella sidebar per aggiungere contenuti</p>
        </div>
      `;
      editor.setComponents && editor.setComponents(defaultContent);
    }
  }, [editorReady, editingPage, selectedTemplate]);

  // Handler quando l'editor è pronto
  const handleEditorReady = (editor) => {
    console.log('✅ Studio SDK Editor pronto!');
    editorRef.current = editor;
    setEditorReady(true);
  };

  // Cambia tema
  const changeTheme = (theme) => {
    setCurrentTheme(theme);
    localStorage.setItem('grapes-theme', theme);
  };

  // Pubblica landing page
  const handlePublish = async () => {
    if (!editorRef.current) return;

    setIsPublishing(true);
    
    try {
      // Ottieni contenuto dall'editor Studio SDK
      const editor = editorRef.current;
      const html = editor.getHtml ? editor.getHtml() : '';
      const css = editor.getCss ? editor.getCss() : '';
      
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
      alert(`✅ PAGINA ${actionText}!\\n\\nLink: ${fullUrl}\\n\\n🔗 Copiato negli appunti!`);
      
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
      console.log('📝 Inizio salvataggio template:', {
        landing_page_id: currentLandingPage.id,
        template_name: templateName,
        template_description: templateDescription
      });

      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001/api/landing?action=save-template'
        : '/api/landing?action=save-template';

      console.log('🌐 Chiamata API:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landing_page_id: currentLandingPage.id,
          template_name: templateName,
          template_description: templateDescription
        })
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error text:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (parseError) {
          console.error('❌ Errore parsing JSON response:', parseError);
          throw new Error(`HTTP ${response.status}: ${errorText || 'Errore sconosciuto'}`);
        }
        
        console.error('❌ Error data:', errorData);
        throw new Error(errorData.error || errorData.message || 'Errore salvataggio template');
      }

      const result = await response.json();
      console.log('✅ Template salvato con successo:', result);
      
      alert(`✅ Template "${templateName}" salvato con successo!`);

    } catch (error) {
      console.error('❌ Errore completo salvataggio template:', error);
      console.error('❌ Error stack:', error.stack);
      alert(`❌ Errore: ${error.message || 'Errore sconosciuto durante il salvataggio'}`);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      {/* MINI HEADER INTEGRATO */}
      <div style={{
        height: '50px',
        background: 'linear-gradient(135deg, #fdae4b 0%, #d98a36 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        zIndex: 10000,
        color: 'white'
      }}>
        
        {/* PULSANTI SINISTRA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ 
            background: 'rgba(255,255,255,0.2)', 
            padding: '4px 8px', 
            borderRadius: '4px', 
            fontSize: '11px',
            fontWeight: 'bold'
          }}>
            STUDIO SDK ⚡
          </span>
          
          {/* Dashboard Button */}
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.25)'}
              onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.15)'}
            >
              🏠 Dashboard
            </button>
          )}
          
          {/* Publish Button */}
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            style={{
              background: currentLandingPage ? '#28a745' : 'rgba(255,255,255,0.15)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '6px 12px',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: isPublishing ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              opacity: isPublishing ? 0.6 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            {isPublishing 
              ? '🔄 Salvando...' 
              : currentLandingPage 
                ? '💾 Aggiorna' 
                : '🚀 Pubblica'
            }
          </button>
          
          {/* Save as Template Button */}
          {currentLandingPage && (
            <button
              onClick={handleSaveAsTemplate}
              disabled={isSavingTemplate}
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: isSavingTemplate ? 'not-allowed' : 'pointer',
                opacity: isSavingTemplate ? 0.6 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              {isSavingTemplate ? '💾 Salvando...' : '📋 Template'}
            </button>
          )}
        </div>

        {/* INFO CENTRO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* Current page info */}
          {currentLandingPage && (
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '4px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              📝 {currentLandingPage.title || currentLandingPage.slug.split('-')[1]}
            </div>
          )}
          
          {/* Published URL */}
          {publishedUrl && (
            <button
              onClick={() => navigator.clipboard.writeText(publishedUrl)}
              title="Clicca per copiare il link"
              style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.2s ease'
              }}
            >
              🔗 Copia Link
            </button>
          )}
        </div>
        
        {/* CONTROLLI DESTRA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Selettore Temi */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <div 
              style={{
                width: '20px',
                height: '20px',
                border: currentTheme === 'light' ? '2px solid white' : '1px solid rgba(255,255,255,0.5)',
                borderRadius: '50%',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #fff 0%, #f8f9fa 100%)',
                transform: currentTheme === 'light' ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.2s ease'
              }}
              onClick={() => changeTheme('light')}
              title="Tema Chiaro"
            />
            <div 
              style={{
                width: '20px',
                height: '20px',
                border: currentTheme === 'dark' ? '2px solid white' : '1px solid rgba(255,255,255,0.5)',
                borderRadius: '50%',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                transform: currentTheme === 'dark' ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.2s ease'
              }}
              onClick={() => changeTheme('dark')}
              title="Tema Scuro"
            />
          </div>
        </div>
      </div>

      {/* EDITOR AREA - Occupa il resto dello spazio */}
      <div style={{ height: 'calc(100vh - 50px)', width: '100%' }}>
        <StudioEditor
          onReady={handleEditorReady}
          options={{
            licenseKey: '20dcb4e71c5e4edcb01cee40c282732d7e219020ae5646ac97298687dae3b19a',
            theme: currentTheme,
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
              id: currentLandingPage?.id || `project-${Date.now()}`
            },
            identity: {
              id: 'user-sapori-colori'
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
              flexComponent.init({}),
              canvasFullSize.init({}),
              rteProseMirror.init({}),
              tableComponent.init({}),
              swiperComponent.init({}),
              canvasEmptyState.init({}),
              iconifyComponent.init({}),
              accordionComponent.init({}),
              listPagesComponent.init({}),
              fsLightboxComponent.init({}),
              layoutSidebarButtons.init({}),
              youtubeAssetProvider.init({}),
              lightGalleryComponent.init({})
            ]
          }}
        />
      </div>
    </div>
  );
};

export default PageBuilderStudio;