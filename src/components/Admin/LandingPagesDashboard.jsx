import React, { useState, useEffect } from 'react';

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
      if (!response.ok) throw new Error('Errore caricamento landing pages');
      
      const data = await response.json();
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
    if (!confirm(`Vuoi eliminare "${title}"?\nQuesta azione non è reversibile.`)) {
      return;
    }

    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? `http://localhost:3001/api/landing?id=${id}`
        : `/api/landing?id=${id}`;
      
      const response = await fetch(apiUrl, { method: 'DELETE' });
      if (!response.ok) throw new Error('Errore eliminazione');
      
      alert('Landing page eliminata con successo!');
      loadLandingPages(); // Ricarica la lista
    } catch (err) {
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
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ fontSize: '24px' }}>🔄</div>
        <div>Caricamento landing pages...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        flexDirection: 'column',
        gap: '20px',
        color: '#dc3545'
      }}>
        <div style={{ fontSize: '24px' }}>❌</div>
        <div>Errore: {error}</div>
        <button onClick={loadLandingPages} style={{
          background: '#007bff',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          Riprova
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px',
        borderBottom: '2px solid #eee',
        paddingBottom: '20px'
      }}>
        <div>
          <h1 style={{ margin: 0, color: '#333' }}>🚀 Landing Pages</h1>
          <p style={{ margin: '5px 0 0 0', color: '#666' }}>
            Gestisci tutte le tue landing pages create
          </p>
        </div>
        <button
          onClick={onNewPage}
          style={{
            background: '#28a745',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '14px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          ✨ Crea Nuova
        </button>
      </div>

      {/* Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{ 
          background: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '8px',
          textAlign: 'center',
          border: '1px solid #dee2e6'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
            {landingPages.length}
          </div>
          <div style={{ color: '#666', fontSize: '14px' }}>Totale Pagine</div>
        </div>
        <div style={{ 
          background: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '8px',
          textAlign: 'center',
          border: '1px solid #dee2e6'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
            {landingPages.filter(p => p.is_published).length}
          </div>
          <div style={{ color: '#666', fontSize: '14px' }}>Pubblicate</div>
        </div>
        <div style={{ 
          background: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '8px',
          textAlign: 'center',
          border: '1px solid #dee2e6'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>
            {landingPages.filter(p => !p.is_published).length}
          </div>
          <div style={{ color: '#666', fontSize: '14px' }}>Bozze</div>
        </div>
        <div style={{ 
          background: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '8px',
          textAlign: 'center',
          border: '1px solid #dee2e6'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#17a2b8' }}>
            {landingPages.reduce((sum, p) => sum + (p.view_count || 0), 0)}
          </div>
          <div style={{ color: '#666', fontSize: '14px' }}>Visualizzazioni</div>
        </div>
      </div>

      {/* Lista Landing Pages */}
      {landingPages.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#666'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📝</div>
          <h3>Nessuna landing page trovata</h3>
          <p>Crea la tua prima landing page per iniziare!</p>
          <button
            onClick={onNewPage}
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginTop: '20px'
            }}
          >
            🚀 Crea Prima Landing Page
          </button>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gap: '20px' 
        }}>
          {landingPages.map(page => (
            <div
              key={page.id}
              style={{
                background: 'white',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                padding: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={e => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={e => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, color: '#333' }}>{page.title}</h3>
                    <span style={{
                      background: page.is_published ? '#28a745' : '#ffc107',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {page.is_published ? '✅ Live' : '📝 Bozza'}
                    </span>
                  </div>
                  
                  <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '14px' }}>
                    {page.description}
                  </p>
                  
                  <div style={{ 
                    display: 'flex', 
                    gap: '20px', 
                    fontSize: '12px', 
                    color: '#999',
                    marginBottom: '15px'
                  }}>
                    <span>📅 {new Date(page.created_at).toLocaleDateString('it-IT')}</span>
                    <span>👁️ {page.view_count || 0} visualizzazioni</span>
                    <span>🔗 {page.slug}</span>
                  </div>

                  {page.is_published && (
                    <div style={{ marginBottom: '15px' }}>
                      <a
                        href={`/api/landing?action=show&slug=${page.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#007bff',
                          textDecoration: 'none',
                          fontSize: '14px',
                          fontWeight: 'bold'
                        }}
                      >
                        🌐 Visualizza Pagina →
                      </a>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '20px' }}>
                  <button
                    onClick={() => onEditPage(page)}
                    style={{
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    ✏️ Modifica
                  </button>
                  
                  <button
                    onClick={() => duplicateLandingPage(page)}
                    style={{
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    📋 Duplica
                  </button>
                  
                  <button
                    onClick={() => deleteLandingPage(page.id, page.title)}
                    style={{
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
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
  );
};

export default LandingPagesDashboard;