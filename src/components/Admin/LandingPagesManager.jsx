import React, { useState } from 'react';
import PageBuilder from './PageBuilder';
import LandingPagesDashboard from './LandingPagesDashboard';

const LandingPagesManager = () => {
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'builder'
  const [editingPage, setEditingPage] = useState(null);

  // Naviga alla dashboard
  const goToDashboard = () => {
    setCurrentView('dashboard');
    setEditingPage(null);
  };

  // Naviga al builder per creare una nuova pagina
  const goToNewPage = () => {
    setCurrentView('builder');
    setEditingPage(null);
  };

  // Naviga al builder per modificare una pagina esistente
  const goToEditPage = (pageData) => {
    setCurrentView('builder');
    setEditingPage(pageData);
  };

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      {currentView === 'dashboard' ? (
        <LandingPagesDashboard 
          onEditPage={goToEditPage}
          onNewPage={goToNewPage}
        />
      ) : (
        <PageBuilder 
          editingPage={editingPage}
          onBackToDashboard={goToDashboard}
        />
      )}
    </div>
  );
};

export default LandingPagesManager;