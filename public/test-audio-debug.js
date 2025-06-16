console.log('🧪 Testing Audio System...')

// Test se i file audio esistono
const testSounds = async () => {
  const soundFiles = [
    '/sounds/coin.wav',
    '/sounds/lose.wav', 
    '/sounds/remove.wav'
  ]

  for (const soundFile of soundFiles) {
    try {
      const audio = new Audio(soundFile)
      audio.addEventListener('canplaythrough', () => {
        console.log(`✅ ${soundFile} loaded successfully`)
      })
      audio.addEventListener('error', (e) => {
        console.error(`❌ Error loading ${soundFile}:`, e)
      })
      
      // Test immediato
      audio.volume = 0.1
      const playPromise = audio.play()
      if (playPromise) {
        playPromise
          .then(() => console.log(`🎵 ${soundFile} played successfully`))
          .catch(error => console.log(`⚠️ ${soundFile} play blocked:`, error.message))
      }
    } catch (error) {
      console.error(`❌ Failed to create audio for ${soundFile}:`, error)
    }
  }
}

// Test sound manager
const testSoundManager = async () => {
  try {
    const { soundManager, playAddGemmeSound } = await import('./src/utils/soundUtils.js')
    
    console.log('🔧 SoundManager:', soundManager)
    console.log('📋 Available sounds:', soundManager.getSoundsList())
    
    // Test function
    setTimeout(() => {
      console.log('🎵 Testing playAddGemmeSound...')
      playAddGemmeSound(50)
    }, 1000)
    
  } catch (error) {
    console.error('❌ Error importing sound utils:', error)
  }
}

// Avvia test
testSounds()
testSoundManager()

console.log('🏁 Audio test completed. Check console for results.')
