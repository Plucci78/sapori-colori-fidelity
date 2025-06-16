// Test di rilevamento dispositivo - Debug immediato
console.log('🔍 DEBUG RILEVAMENTO DISPOSITIVO:')
console.log('Touch support:', 'ontouchstart' in window)
console.log('Screen width:', window.screen.width)
console.log('Screen height:', window.screen.height)
console.log('Window width:', window.innerWidth)
console.log('Window height:', window.innerHeight)
console.log('User Agent:', navigator.userAgent)
console.log('Platform:', navigator.platform)

// Test logica rilevamento attuale
const hasTouch = 'ontouchstart' in window
const screenWidth = window.screen.width

let deviceType = 'unknown'
if (hasTouch && screenWidth >= 768 && screenWidth <= 1024) {
  deviceType = 'tablet'
} else if (hasTouch && screenWidth < 768) {
  deviceType = 'mobile'  
} else {
  deviceType = 'desktop'
}

console.log('🎯 RISULTATO RILEVAMENTO:', deviceType)
console.log('Condizioni:')
console.log('- hasTouch:', hasTouch)
console.log('- screenWidth >= 768:', screenWidth >= 768)
console.log('- screenWidth <= 1024:', screenWidth <= 1024)
console.log('- screenWidth < 768:', screenWidth < 768)

// Forza modalità tablet per test
console.log('🧪 FORZANDO MODALITÀ TABLET...')
if (window.forceTabletMode) {
  window.forceTabletMode()
} else {
  console.log('Funzione forceTabletMode non disponibile')
}

export {}
