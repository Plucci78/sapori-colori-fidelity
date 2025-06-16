// Demo script per testare il sistema di suoni GEMME
// Esegui nel browser console quando sei nella sezione Gestione Manuale GEMME

// Test suoni base
console.log('🔊 Testando sistema suoni GEMME...');

// Importa il sound manager
import('../../utils/soundUtils.js').then(soundUtils => {
  const { playGemmeSound, playAddGemmeSound, playRemoveGemmeSound, testGemmeSounds } = soundUtils;
  
  // Test sequenziale
  setTimeout(() => {
    console.log('▶️ Test suono aggiunta +10 GEMME');
    playAddGemmeSound(10);
  }, 1000);
  
  setTimeout(() => {
    console.log('▶️ Test suono aggiunta +5 GEMME');
    playAddGemmeSound(5);
  }, 2000);
  
  setTimeout(() => {
    console.log('▶️ Test suono rimozione -5 GEMME');
    playRemoveGemmeSound(-5);
  }, 3000);
  
  setTimeout(() => {
    console.log('▶️ Test suono rimozione -10 GEMME');
    playRemoveGemmeSound(-10);
  }, 4000);
  
  setTimeout(() => {
    console.log('▶️ Test automatico con playGemmeSound');
    playGemmeSound(15);  // Positivo
  }, 5000);
  
  setTimeout(() => {
    playGemmeSound(-8);  // Negativo
  }, 6000);
  
  setTimeout(() => {
    console.log('✅ Test completato!');
  }, 7000);
}).catch(err => {
  console.error('❌ Errore caricamento soundUtils:', err);
});

// Funzione per test manuale
window.testGemmeSoundsManual = () => {
  import('../../utils/soundUtils.js').then(soundUtils => {
    soundUtils.testGemmeSounds();
  });
};

console.log('💡 Usa window.testGemmeSoundsManual() per test manuale');

// Test caricamento file audio
const testAudioFiles = async () => {
  const files = ['/sounds/coin.wav', '/sounds/remove.wav'];
  
  for (const file of files) {
    const audio = new Audio(file);
    
    audio.addEventListener('canplaythrough', () => {
      console.log(`✅ ${file} caricato correttamente`);
    });
    
    audio.addEventListener('error', (e) => {
      console.error(`❌ Errore caricamento ${file}:`, e);
    });
    
    // Prova a caricare
    audio.preload = 'auto';
  }
};

testAudioFiles();
