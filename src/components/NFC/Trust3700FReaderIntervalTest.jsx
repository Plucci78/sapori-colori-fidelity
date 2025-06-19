import { useState, useRef, memo, useCallback, useEffect } from 'react'

const Trust3700FReaderIntervalTest = memo(({ showNotification }) => {
  const [isReading, setIsReading] = useState(false)
  const [debugInfo, setDebugInfo] = useState('')
  const readerInterval = useRef(null)
  const [readCount, setReadCount] = useState(0)

  // Debug log
  const addDebug = useCallback((message) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugInfo(prev => `${timestamp}: ${message}\n${prev}`)
    console.log(`🔧 INTERVAL TEST: ${message}`)
  }, [])

  // *** QUESTA FUNZIONE SIMULA readNFCTag del componente originale ***
  const readNFCTag = async () => {
    // Simula operazioni USB che potrebbero fallire
    try {
      // Simula delay USB
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Simula probabilità di errore (come USB che non risponde)
      if (Math.random() < 0.1) { // 10% di probabilità di errore
        throw new Error('USB communication error')
      }
      
      // Simula probabilità di tag trovato
      if (Math.random() < 0.3) { // 30% di probabilità di tag
        return {
          id: 'TAG' + Math.random().toString(36).substr(2, 8).toUpperCase(),
          timestamp: new Date().toISOString()
        }
      }
      
      return null
    } catch (error) {
      // Errori USB silenti (come nel componente originale)
      console.debug('USB error:', error.message)
      return null
    }
  }

  // *** FUNZIONE PROBLEMATICA - NON useCallback (come nell'originale) ***
  const startReading = () => {
    if (readerInterval.current) return

    setIsReading(true)
    addDebug('🔄 Lettura automatica avviata')
    
    // *** QUESTO POTREBBE ESSERE IL PROBLEMA ***
    readerInterval.current = setInterval(async () => {
      try {
        const tag = await readNFCTag()
        setReadCount(prev => prev + 1)
        
        if (tag) {
          addDebug(`📱 Tag simulato letto: ${tag.id}`)
          
          // Simula lookup database
          addDebug(`🔍 Lookup cliente per ${tag.id}...`)
          
          // Simula delay database
          await new Promise(resolve => setTimeout(resolve, 200))
          
          addDebug(`✅ Lookup completato per ${tag.id}`)
          
          if (showNotification) {
            showNotification(`Tag letto: ${tag.id}`, 'success')
          }
        }
      } catch (error) {
        addDebug(`❌ Errore in interval: ${error.message}`)
        console.error('Interval error:', error)
      }
    }, 800) // Stessa frequenza dell'originale
  }

  // *** QUESTA E' useCallback (come nell'originale) ***
  const stopReading = useCallback(() => {
    if (readerInterval.current) {
      clearInterval(readerInterval.current)
      readerInterval.current = null
    }
    setIsReading(false)
    addDebug('⏹️ Lettura fermata')
    setReadCount(0)
  }, [addDebug])

  // *** QUESTO CLEANUP POTREBBE CAUSARE PROBLEMI ***
  useEffect(() => {
    return () => {
      addDebug('🗑️ Cleanup: stopping reading...')
      stopReading()
    }
  }, [stopReading, addDebug])

  return (
    <div className="interval-test-container">
      <div className="test-header">
        <h3>🔄 Trust 3700F Interval Test</h3>
        <div className="status-info">
          <div>Reading: {isReading ? '🔄' : '⏸️'}</div>
          <div>Read Count: {readCount}</div>
        </div>
      </div>

      <div className="test-controls">
        <button onClick={startReading} disabled={isReading}>
          ▶️ Start Reading (Simulated)
        </button>
        
        <button onClick={stopReading} disabled={!isReading}>
          ⏹️ Stop Reading
        </button>
        
        <button onClick={() => setDebugInfo('')}>
          🗑️ Clear Log
        </button>
      </div>

      <div className="test-status">
        <div className="status-grid">
          <div>Interval Active: {readerInterval.current ? '✅' : '❌'}</div>
          <div>Is Reading: {isReading ? '✅' : '❌'}</div>
          <div>Read Attempts: {readCount}</div>
        </div>
      </div>

      <div className="debug-info">
        <h4>Debug Log:</h4>
        <pre className="debug-log">
          {debugInfo || 'Nessun log disponibile...'}
        </pre>
      </div>

      <div className="warning-box">
        <h4>⚠️ Test Focus:</h4>
        <p>Questo componente testa il pattern problematico del Trust3700FReader:</p>
        <ul>
          <li><strong>setInterval con async operations</strong></li>
          <li><strong>startReading() non è useCallback</strong></li>
          <li><strong>stopReading() è useCallback</strong></li>
          <li><strong>useEffect cleanup che chiama stopReading</strong></li>
          <li><strong>Operazioni USB simulate che possono fallire</strong></li>
        </ul>
        <p>Se questo causa crash o problemi, abbiamo trovato il problema!</p>
      </div>

      <style jsx>{`
        .interval-test-container {
          padding: 20px;
          border: 2px solid #f39c12;
          border-radius: 8px;
          background: #fdf6e3;
          margin: 10px 0;
        }

        .test-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .status-info {
          display: flex;
          gap: 15px;
        }

        .test-controls {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .test-controls button {
          padding: 8px 16px;
          background: #f39c12;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .test-controls button:disabled {
          background: #bdc3c7;
          cursor: not-allowed;
        }

        .test-controls button:not(:disabled):hover {
          background: #e67e22;
        }

        .test-status {
          background: white;
          padding: 15px;
          border-radius: 4px;
          border: 1px solid #ddd;
          margin-bottom: 15px;
        }

        .status-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .status-grid > div {
          padding: 8px;
          background: #f8f9fa;
          border-radius: 4px;
          text-align: center;
        }

        .debug-log {
          background: #1e1e1e;
          color: #d4d4d4;
          padding: 15px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
          max-height: 200px;
          overflow-y: auto;
          white-space: pre-wrap;
        }

        .warning-box {
          background: #fff8dc;
          border: 1px solid #f39c12;
          border-radius: 4px;
          padding: 15px;
          margin-top: 15px;
        }

        .warning-box ul {
          margin: 10px 0;
          padding-left: 20px;
        }

        .warning-box li {
          margin: 5px 0;
        }
      `}</style>
    </div>
  )
})

Trust3700FReaderIntervalTest.displayName = 'Trust3700FReaderIntervalTest'

export default Trust3700FReaderIntervalTest
