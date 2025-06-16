// components/Common/ClipboardDebug.jsx

import { useState } from 'react'
import { copyToClipboard } from '../../utils/clipboardUtils'

function ClipboardDebug({ showNotification }) {
  const [testResults, setTestResults] = useState([])
  const [isVisible, setIsVisible] = useState(false)

  const runDiagnostics = async () => {
    const results = []
    
    // Test 1: Browser Compatibility
    results.push({
      test: 'Browser Compatibility',
      result: navigator.clipboard ? '✅ Supportato' : '❌ Non supportato',
      details: navigator.clipboard ? 'Clipboard API disponibile' : 'Fallback richiesto'
    })
    
    // Test 2: Secure Context
    results.push({
      test: 'Secure Context',
      result: window.isSecureContext ? '✅ Sicuro' : '❌ Non sicuro',
      details: window.isSecureContext ? 'HTTPS o localhost' : 'Richiede HTTPS'
    })
    
    // Test 3: Permissions
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'clipboard-write' })
      results.push({
        test: 'Clipboard Permissions',
        result: permissionStatus.state === 'granted' ? '✅ Garantiti' : '⚠️ ' + permissionStatus.state,
        details: `Status: ${permissionStatus.state}`
      })
    } catch (err) {
      results.push({
        test: 'Clipboard Permissions',
        result: '❓ Non verificabile',
        details: 'Permissions API non disponibile'
      })
    }
    
    // Test 4: Actual Copy Test
    try {
      const testText = `CLIPBOARD-TEST-${Date.now()}`
      await navigator.clipboard.writeText(testText)
      results.push({
        test: 'Copy Test',
        result: '✅ Successo',
        details: `Copiato: ${testText}`
      })
    } catch (err) {
      results.push({
        test: 'Copy Test',
        result: '❌ Fallito',
        details: err.message
      })
    }
    
    setTestResults(results)
    setIsVisible(true)
    
    if (showNotification) {
      const allPassed = results.every(r => r.result.includes('✅'))
      showNotification(
        allPassed ? '🎉 Tutti i test della clipboard superati!' : '⚠️ Alcuni test della clipboard sono falliti',
        allPassed ? 'success' : 'warning'
      )
    }
  }

  const testCopyFunction = async () => {
    const testText = `REFERRAL-CODE-DEMO-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    await copyToClipboard(testText, showNotification)
  }

  if (!isVisible) {
    return (
      <div className="clipboard-debug-trigger">
        <button 
          onClick={runDiagnostics}
          className="btn btn-outline btn-sm"
          style={{ 
            fontSize: '12px', 
            padding: '4px 8px',
            opacity: 0.7
          }}
        >
          🔧 Debug Clipboard
        </button>
      </div>
    )
  }

  return (
    <div className="clipboard-debug-panel" style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: 'white',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      padding: '16px',
      maxWidth: '400px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
      zIndex: 1000
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>🔧 Clipboard Diagnostics</h4>
        <button 
          onClick={() => setIsVisible(false)}
          style={{ 
            background: 'none', 
            border: 'none', 
            fontSize: '16px', 
            cursor: 'pointer' 
          }}
        >
          ✕
        </button>
      </div>
      
      <div style={{ marginBottom: '12px' }}>
        {testResults.map((result, index) => (
          <div key={index} style={{ 
            marginBottom: '8px', 
            padding: '8px', 
            background: '#f9fafb', 
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
              {result.test}: {result.result}
            </div>
            <div style={{ color: '#6b7280', fontSize: '11px' }}>
              {result.details}
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
        <button 
          onClick={testCopyFunction}
          className="btn btn-primary btn-sm"
          style={{ 
            width: '100%',
            fontSize: '12px',
            padding: '6px 12px'
          }}
        >
          🧪 Test Funzione Copia
        </button>
        <button 
          onClick={runDiagnostics}
          className="btn btn-secondary btn-sm"
          style={{ 
            width: '100%',
            fontSize: '12px',
            padding: '6px 12px',
            marginTop: '4px'
          }}
        >
          🔄 Riesegui Test
        </button>
      </div>
    </div>
  )
}

export default ClipboardDebug
