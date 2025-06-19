import React, { memo } from 'react'

const Trust3700FReaderSafe = memo(({ onTagRead, onError, onCustomerFound, showNotification }) => {
  console.log('🔧 Trust3700FReaderSafe: Component starting safely')
  
  return (
    <div style={{ padding: '15px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '8px' }}>
      <h3>🔧 Trust 3700F Reader - Safe Mode</h3>
      <p>✅ Componente caricato senza errori</p>
      <p>Props ricevute:</p>
      <ul>
        <li>onTagRead: {onTagRead ? '✅' : '❌'}</li>
        <li>onError: {onError ? '✅' : '❌'}</li>  
        <li>onCustomerFound: {onCustomerFound ? '✅' : '❌'}</li>
        <li>showNotification: {showNotification ? '✅' : '❌'}</li>
      </ul>
      
      <div style={{ marginTop: '10px' }}>
        <button 
          onClick={() => {
            console.log('🔧 Test button clicked')
            if (showNotification) {
              showNotification('🔧 Trust 3700F test OK!', 'success')
            }
          }}
          style={{
            padding: '8px 16px',
            background: '#007bff',
            color: 'white', 
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test Safe Mode
        </button>
      </div>
      
      <div style={{ marginTop: '10px', padding: '10px', background: '#fff3cd', borderRadius: '4px' }}>
        <p><strong>Nota:</strong> Questa è una versione sicura del Trust3700FReader che non esegue operazioni USB/WebUSB che potrebbero causare errori.</p>
      </div>
    </div>
  )
})

Trust3700FReaderSafe.displayName = 'Trust3700FReaderSafe'

export default Trust3700FReaderSafe
