import React from 'react'

const NFCViewDebug = ({ showNotification }) => {
  console.log('🔧 NFCViewDebug: Rendering started')
  
  try {
    return (
      <div style={{ padding: '20px' }}>
        <h1>🔧 Debug NFC Module</h1>
        <p>✅ React component rendering OK</p>
        <p>✅ Props received: {showNotification ? 'showNotification OK' : 'showNotification missing'}</p>
        <p>📱 Device info: {navigator.userAgent}</p>
        
        <div style={{ 
          background: '#f0f8ff', 
          padding: '15px', 
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <h3>Stato Test</h3>
          <p>Se vedi questo messaggio, il componente NFCView può essere renderizzato correttamente.</p>
          <p>Il problema era probabilmente in una dipendenza o import specifico.</p>
        </div>
      </div>
    )
  } catch (error) {
    console.error('❌ Errore in NFCViewDebug:', error)
    return (
      <div style={{ padding: '20px', background: '#ffe6e6' }}>
        <h2>❌ Errore di rendering</h2>
        <p>Errore: {error.message}</p>
        <pre>{error.stack}</pre>
      </div>
    )
  }
}

export default NFCViewDebug
