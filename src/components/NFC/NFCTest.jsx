import { useState, useEffect } from 'react'

const NFCTest = ({ showNotification }) => {
  const [status, setStatus] = useState('Inizializzazione...')

  useEffect(() => {
    setStatus('✅ Componente caricato!')
    showNotification('🧪 Test component loaded', 'success')
  }, [showNotification])

  return (
    <div style={{ 
      padding: '20px', 
      border: '2px solid green', 
      borderRadius: '8px',
      margin: '20px'
    }}>
      <h2>🧪 NFC Test Component</h2>
      <p><strong>Status:</strong> {status}</p>
      <p>Se vedi questo messaggio, il rendering React funziona.</p>
      <button 
        onClick={() => setStatus('🔄 Pulsante cliccato!')}
        style={{
          padding: '10px 20px',
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        🔄 Test Click
      </button>
    </div>
  )
}

export default NFCTest
