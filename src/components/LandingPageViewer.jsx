import React, { useState, useEffect } from 'react';

const LandingPageViewer = ({ slug }) => {
  const [landingPage, setLandingPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadLandingPage = async () => {
      try {
        const response = await fetch(`/api/landing-pages?slug=${slug}`);
        const result = await response.json();
        
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Pagina non trovata');
        }
        
        setLandingPage(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      loadLandingPage();
    }
  }, [slug]);

  useEffect(() => {
    if (landingPage) {
      // Incrementa view count
      fetch('/api/landing-pages/track-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landingPageId: landingPage.id,
          elementText: 'page_view',
          elementHref: window.location.href
        })
      }).catch(console.warn);

      // Inject CSS
      if (landingPage.css_content) {
        const style = document.createElement('style');
        style.textContent = landingPage.css_content;
        document.head.appendChild(style);
        
        return () => {
          document.head.removeChild(style);
        };
      }
    }
  }, [landingPage]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div>Caricamento...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'Arial, sans-serif',
        flexDirection: 'column'
      }}>
        <h1>Pagina non trovata</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!landingPage) {
    return null;
  }

  return (
    <div 
      style={{ 
        width: '100%', 
        minHeight: '100vh',
        margin: 0,
        padding: 0
      }}
      dangerouslySetInnerHTML={{ __html: landingPage.html_content }}
    />
  );
};

export default LandingPageViewer;