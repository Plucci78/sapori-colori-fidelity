import React, { useState, useEffect } from 'react';
import './LandingPagesDashboard.css';

const LandingPagesDashboard = ({ onEditPage, onNewPage }) => {
  const [landingPages, setLandingPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carica tutte le landing pages
  const loadLandingPages = async () => {
    setLoading(true);
    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001/api/landing'
        : '/api/landing';
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Response error:', response.status, errorData);
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }
      
      const data = await response.json();
      console.log('✅ API Response:', data);
      setLandingPages(data.data || []);
    } catch (err) {
      setError(err.message);
      console.error('Errore:', err);
    } finally {
      setLoading(false);
    }
  };

  // Elimina landing page
  const deleteLandingPage = async (id, title) => {
    console.log('🗑️ Tentativo eliminazione:', { id, title });
    
    if (!confirm(`Vuoi eliminare "${title}"?\nQuesta azione non è reversibile.`)) {
      console.log('❌ Eliminazione annullata dall\'utente');
      return;
    }

    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? `http://localhost:3001/api/landing?id=${id}`
        : `/api/landing?id=${id}`;
      
      console.log('🔥 Chiamata DELETE a:', apiUrl);
      
      const response = await fetch(apiUrl, { method: 'DELETE' });
      
      console.log('📡 Risposta DELETE:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Errore sconosciuto' }));
        console.error('❌ Errore API:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Eliminazione riuscita:', result);
      
      alert('Landing page eliminata con successo!');
      loadLandingPages(); // Ricarica la lista
    } catch (err) {
      console.error('❌ Errore eliminazione:', err);
      alert(`Errore: ${err.message}`);
    }
  };

  // Duplica landing page
  const duplicateLandingPage = async (originalPage) => {
    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001/api/landing'
        : '/api/landing';
      
      const newTitle = `${originalPage.title} (Copia)`;
      const newSlug = `landing-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          description: originalPage.description,
          slug: newSlug,
          html_content: originalPage.html_content,
          css_content: originalPage.css_content,
          grapesjs_data: originalPage.grapesjs_data,
          meta_title: newTitle,
          meta_description: originalPage.meta_description,
          is_published: false // Copia come bozza
        })
      });

      if (!response.ok) throw new Error('Errore duplicazione');
      
      alert('Landing page duplicata con successo!');
      loadLandingPages();
    } catch (err) {
      alert(`Errore: ${err.message}`);
    }
  };

  useEffect(() => {
    loadLandingPages();
  }, []);

  if (loading) {
    return (
      <div className="landing-loading">
        <div className="loading-icon">🔄</div>
        <div>Caricamento landing pages...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="landing-error">
        <div className="error-icon">❌</div>
        <div>Errore: {error}</div>
        <button onClick={loadLandingPages} className="landing-retry-btn">
          Riprova
        </button>
      </div>
    );
  }

  return (
    <div className="landing-dashboard">
      {/* Header */}
      <div className="landing-header">
        <div className="landing-header-content">
          <h1>🚀 Landing Pages</h1>
          <p>Gestisci tutte le tue landing pages create</p>
        </div>
        <div className="landing-header-actions">
          <button onClick={onNewPage} className="landing-btn">
            ✨ Crea Nuova
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="landing-stats-grid">
        <div className="landing-stat-card">
          <div className="landing-stat-value">{landingPages.length}</div>
          <div className="landing-stat-label">Totale Pagine</div>
        </div>
        <div className="landing-stat-card">
          <div className="landing-stat-value">{landingPages.filter(p => p.is_published).length}</div>
          <div className="landing-stat-label">Pubblicate</div>
        </div>
        <div className="landing-stat-card">
          <div className="landing-stat-value">{landingPages.filter(p => !p.is_published).length}</div>
          <div className="landing-stat-label">Bozze</div>
        </div>
        <div className="landing-stat-card">
          <div className="landing-stat-value">{landingPages.reduce((sum, p) => sum + (p.view_count || 0), 0)}</div>
          <div className="landing-stat-label">Visualizzazioni</div>
        </div>
      </div>

      {/* Lista Landing Pages */}
      <div className="landing-pages-container">
        {landingPages.length === 0 ? (
          <div className="landing-empty-state">
            <div className="empty-icon">📝</div>
            <h3>Nessuna landing page trovata</h3>
            <p>Crea la tua prima landing page per iniziare!</p>
            <button onClick={onNewPage} className="landing-btn">
              🚀 Crea Prima Landing Page
            </button>
          </div>
        ) : (
          <div className="landing-pages-list">
            {landingPages.map(page => (
              <div key={page.id} className="landing-page-card">
                {/* Thumbnail Preview */}
                <div className="landing-page-thumbnail">
                  <img 
                    src={page.thumbnail_url || '/placeholder-thumbnail.jpg'} 
                    alt={`Preview of ${page.title}`}
                    onError={(e) => {
                      e.target.src = '/placeholder-thumbnail.jpg';
                    }}
                  />
                  <div className="thumbnail-overlay">
                    <button 
                      onClick={() => onEditPage(page)}
                      className="preview-btn"
                      title="Modifica Landing Page"
                    >
                      ✏️ Modifica
                    </button>
                  </div>
                </div>
                
                <div className="landing-page-header">
                  <div className="landing-page-title-section">
                    <div className="landing-page-title">
                      <h3>{page.title}</h3>
                      <span className={`landing-status-badge ${page.is_published ? 'published' : 'draft'}`}>
                        {page.is_published ? '✅ Live' : '📝 Bozza'}
                      </span>
                    </div>
                    
                    <p className="landing-page-description">
                      {page.description}
                    </p>
                    
                    <div className="landing-page-meta">
                      <span>📅 {new Date(page.created_at).toLocaleDateString('it-IT')}</span>
                      <span>👁️ {page.view_count || 0} visualizzazioni</span>
                      <span>🔗 {page.slug}</span>
                    </div>

                    {page.is_published && (
                      <a
                        href={`/api/landing?action=show&slug=${page.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="landing-page-link"
                      >
                        🌐 Visualizza Pagina →
                      </a>
                    )}
                  </div>

                  <div className="landing-page-actions">
                    <button
                      onClick={() => onEditPage(page)}
                      className="landing-action-btn edit"
                    >
                      ✏️ Modifica
                    </button>
                    
                    <button
                      onClick={() => duplicateLandingPage(page)}
                      className="landing-action-btn duplicate"
                    >
                      📋 Duplica
                    </button>
                    
                    <button
                      onClick={() => deleteLandingPage(page.id, page.title)}
                      className="landing-action-btn delete"
                    >
                      🗑️ Elimina
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LandingPagesDashboard;