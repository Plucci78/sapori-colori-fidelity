import { memo, useState } from 'react'
import './EmailViewPro.css'

const EmailViewProFixed = memo(({
  emailStats,
  showNotification,
  customers,
  supabase
}) => {
  console.log('✅ EmailViewProFixed: Rendering...')

  const [emailSubject, setEmailSubject] = useState('Test Email Subject')

  const handleTest = () => {
    if (showNotification) {
      showNotification('EmailViewProFixed funziona!', 'success')
    }
  }

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      background: '#f0f0f0',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      {/* Header Fisso */}
      <div style={{
        background: 'linear-gradient(135deg, #8B4513 0%, #D4AF37 100%)',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        color: 'white'
      }}>
        <h1 style={{ margin: '0 0 10px 0' }}>📧 Email Marketing - FIXED</h1>
        <p style={{ margin: 0 }}>Versione funzionante per test</p>
      </div>

      {/* Controls */}
      <div style={{
        background: 'white',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        display: 'flex',
        gap: '15px',
        alignItems: 'center'
      }}>
        <label>
          <strong>Oggetto:</strong>
          <input
            type="text"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            style={{
              marginLeft: '10px',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              minWidth: '300px'
            }}
          />
        </label>
        
        <button
          onClick={handleTest}
          style={{
            background: '#8B4513',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          🧪 Test
        </button>
      </div>

      {/* Editor Area */}
      <div style={{
        display: 'flex',
        gap: '20px',
        height: 'calc(100% - 200px)'
      }}>
        {/* Canvas */}
        <div style={{
          flex: '1',
          background: 'white',
          borderRadius: '8px',
          padding: '20px',
          border: '1px solid #ddd',
          overflow: 'auto'
        }}>
          <h3>📧 Email Canvas</h3>
          <div style={{
            background: 'linear-gradient(135deg, #8B4513 0%, #D4AF37 100%)',
            color: 'white',
            padding: '30px',
            textAlign: 'center',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h2>Ciao {{nome}}!</h2>
            <p>Benvenuto in Sapori & Colori</p>
          </div>
          
          <div style={{
            padding: '20px',
            background: '#f9f9f9',
            borderRadius: '8px'
          }}>
            <h3>Il tuo messaggio</h3>
            <p>Caro {{nome}}, grazie per essere parte della famiglia! Hai {{punti}} gemme.</p>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{
          width: '300px',
          background: 'white',
          borderRadius: '8px',
          padding: '20px',
          border: '1px solid #ddd'
        }}>
          <h4>📦 Aggiungi Blocchi</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button style={{
              padding: '12px',
              background: '#f8f9fa',
              border: '2px solid #e9ecef',
              borderRadius: '8px',
              cursor: 'pointer'
            }}>
              📰 Header
            </button>
            <button style={{
              padding: '12px',
              background: '#f8f9fa', 
              border: '2px solid #e9ecef',
              borderRadius: '8px',
              cursor: 'pointer'
            }}>
              📝 Testo
            </button>
            <button style={{
              padding: '12px',
              background: '#f8f9fa',
              border: '2px solid #e9ecef',
              borderRadius: '8px',
              cursor: 'pointer'
            }}>
              🔘 Bottone
            </button>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      <div style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '4px',
        fontSize: '12px'
      }}>
        ✅ EmailViewProFixed caricato<br/>
        Customers: {customers?.length || 0}<br/>
        Supabase: {supabase ? '✅' : '❌'}
      </div>
    </div>
  )
})

export default EmailViewProFixed