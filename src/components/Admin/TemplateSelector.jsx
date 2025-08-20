import React, { useState, useEffect } from 'react';
import './TemplateSelector.css';

const TemplateSelector = ({ onSelectTemplate, onClose }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Carica tutti i template
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001/api/landing?action=templates'
        : '/api/landing?action=templates';
      
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('Errore caricamento template');
      
      const data = await response.json();
      setTemplates(data.data || []);
    } catch (err) {
      setError(err.message);
      console.error('Errore:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // Filtra template per categoria
  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  // Categorie disponibili
  const categories = [
    { value: 'all', label: 'Tutti i Template', icon: '📋' },
    { value: 'ristorante', label: 'Ristorante', icon: '🍽️' },
    { value: 'promozione', label: 'Promozioni', icon: '🔥' },
    { value: 'evento', label: 'Eventi', icon: '🎉' },
    { value: 'custom', label: 'I Miei Template', icon: '⭐' }
  ];

  if (loading) {
    return (
      <div className="template-selector-overlay">
        <div className="template-selector-modal">
          <div className="template-loading">
            <div className="loading-spinner">🔄</div>
            <p>Caricamento template...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="template-selector-overlay">
        <div className="template-selector-modal">
          <div className="template-error">
            <div className="error-icon">❌</div>
            <p>Errore: {error}</p>
            <button onClick={loadTemplates} className="retry-btn">
              Riprova
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="template-selector-overlay">
      <div className="template-selector-modal">
        {/* Header */}
        <div className="template-selector-header">
          <div className="header-content">
            <h2>🎨 Scegli un Template</h2>
            <p>Inizia con un template predefinito o uno dei tuoi salvati</p>
          </div>
          <button onClick={onClose} className="close-btn">
            ✕
          </button>
        </div>

        {/* Filtri Categoria */}
        <div className="template-categories">
          {categories.map(category => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`category-btn ${selectedCategory === category.value ? 'active' : ''}`}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-label">{category.label}</span>
            </button>
          ))}
        </div>

        {/* Lista Template */}
        <div className="template-grid">
          {/* Opzione "Inizia da Zero" */}
          <div 
            className="template-card blank-template"
            onClick={() => onSelectTemplate(null)}
          >
            <div className="template-preview blank-preview">
              <div className="blank-icon">✨</div>
              <p>Inizia da Zero</p>
            </div>
            <div className="template-info">
              <h3>Pagina Vuota</h3>
              <p>Crea la tua landing page da zero</p>
            </div>
          </div>

          {/* Template disponibili */}
          {filteredTemplates.map(template => (
            <div 
              key={template.id} 
              className="template-card"
              onClick={() => onSelectTemplate(template)}
            >
              <div className="template-preview">
                <div className="preview-content">
                  <div className="mini-preview" dangerouslySetInnerHTML={{ 
                    __html: template.html_content?.substring(0, 200) + '...' 
                  }} />
                </div>
                <div className="template-badge">
                  {template.type === 'predefined' ? '🏷️ Predefinito' : '⭐ Personale'}
                </div>
              </div>
              <div className="template-info">
                <h3>{template.name}</h3>
                <p>{template.description}</p>
                <div className="template-meta">
                  <span className="category-tag">{template.category}</span>
                  {template.created_at && (
                    <span className="created-date">
                      {new Date(template.created_at).toLocaleDateString('it-IT')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredTemplates.length === 0 && (
          <div className="template-empty">
            <div className="empty-icon">📂</div>
            <h3>Nessun template trovato</h3>
            <p>
              {selectedCategory === 'custom' 
                ? 'Non hai ancora salvato template personalizzati'
                : 'Nessun template disponibile per questa categoria'
              }
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="template-selector-footer">
          <p>💡 <strong>Suggerimento:</strong> Puoi salvare qualsiasi landing page come template usando il pulsante "Salva come Template"</p>
        </div>
      </div>
    </div>
  );
};

export default TemplateSelector;