import React, { useState } from 'react';
import PageBuilderNew from './PageBuilderNew';
import LandingPagesDashboard from './LandingPagesDashboard';
import TemplateSelector from './TemplateSelector';

const LandingPagesManager = () => {
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'builder' | 'template-selector'
  const [editingPage, setEditingPage] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Naviga alla dashboard
  const goToDashboard = () => {
    setCurrentView('dashboard');
    setEditingPage(null);
    setSelectedTemplate(null);
  };

  // Mostra il selettore template per nuova pagina
  const goToNewPage = () => {
    setCurrentView('template-selector');
    setEditingPage(null);
  };

  // Naviga al builder per modificare una pagina esistente
  const goToEditPage = (pageData) => {
    setCurrentView('builder');
    setEditingPage(pageData);
    setSelectedTemplate(null);
  };

  // Gestisce la selezione di un template
  const handleTemplateSelected = (template) => {
    setSelectedTemplate(template);
    setCurrentView('builder');
    setEditingPage(null);
  };

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      {currentView === 'dashboard' && (
        <LandingPagesDashboard 
          onEditPage={goToEditPage}
          onNewPage={goToNewPage}
        />
      )}
      
      {currentView === 'template-selector' && (
        <TemplateSelector 
          onSelectTemplate={handleTemplateSelected}
          onClose={goToDashboard}
        />
      )}
      
      {currentView === 'builder' && (
        <PageBuilderNew 
          editingPage={editingPage}
          selectedTemplate={selectedTemplate}
          onBackToDashboard={goToDashboard}
        />
      )}
    </div>
  );
};

export default LandingPagesManager;