// All'inizio del componente EmailMarketing

useEffect(() => {
  // Forza il tema light per questo componente
  const emailContainer = document.querySelector('.email-marketing-container');
  if (emailContainer) {
    // Salva l'eventuale classe dark mode precedente
    const hadDarkMode = emailContainer.classList.contains('dark-mode');
    
    // Rimuovi tutte le classi relative al tema
    emailContainer.classList.remove('dark-mode', 'light-mode');
    
    // Aggiungi solo light-mode
    emailContainer.classList.add('light-mode');
    
    // Cleanup quando il componente viene smontato
    return () => {
      if (hadDarkMode) {
        emailContainer.classList.remove('light-mode');
        emailContainer.classList.add('dark-mode');
      }
    };
  }
}, []);

// Nel return del componente, aggiungi la classe light-mode
return (
  <div className="email-marketing-container light-mode">
    {/* resto del componente */}
  </div>
);