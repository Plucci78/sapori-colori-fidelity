// Test script per verificare il sistema suoni GEMME
// Apri la console del browser e copia/incolla questo codice

console.log('🔊 Testando sistema suoni GEMME...');

// Test delle funzioni disponibili
const testSounds = async () => {
  try {
    // Importa le funzioni
    const { playAddGemmeSound, playRemoveGemmeStandard, playRemoveGemmeAlt, testGemmeSounds } = 
      await import('/src/utils/soundUtils.js');
    
    console.log('✅ Funzioni importate correttamente');
    
    // Test sequenziale
    console.log('▶️ Test suono aggiunta +5 GEMME');
    playAddGemmeSound(5);
    
    setTimeout(() => {
      console.log('▶️ Test suono rimozione -5 GEMME (standard)');
      playRemoveGemmeStandard(-5);
    }, 1500);
    
    setTimeout(() => {
      console.log('▶️ Test suono rimozione -5 GEMME (alternativo)');
      playRemoveGemmeAlt(-5);
    }, 3000);
    
    setTimeout(() => {
      console.log('▶️ Test sequenza completa');
      testGemmeSounds();
    }, 4500);
    
    console.log('✅ Test avviato! Dovresti sentire i suoni');
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error);
  }
};

// Esegui il test
testSounds();

// Crea funzioni globali per test manuali
window.testAddSound = () => {
  import('/src/utils/soundUtils.js').then(({ playAddGemmeSound }) => {
    playAddGemmeSound(10);
    console.log('🔊 Suono aggiunta riprodotto');
  });
};

window.testRemoveSound = () => {
  import('/src/utils/soundUtils.js').then(({ playRemoveGemmeStandard }) => {
    playRemoveGemmeStandard(-10);
    console.log('🔊 Suono rimozione riprodotto');
  });
};

window.testAltRemoveSound = () => {
  import('/src/utils/soundUtils.js').then(({ playRemoveGemmeAlt }) => {
    playRemoveGemmeAlt(-10);
    console.log('🔊 Suono rimozione alternativo riprodotto');
  });
};

console.log('💡 Funzioni di test create:');
console.log('- window.testAddSound() - Testa suono aggiunta');
console.log('- window.testRemoveSound() - Testa suono rimozione standard');
console.log('- window.testAltRemoveSound() - Testa suono rimozione alternativo');
