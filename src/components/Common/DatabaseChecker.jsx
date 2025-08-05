import { useState } from 'react'
import { checkImageUploadSystem, createStorageBucket } from '../../utils/databaseCheck'
import './DatabaseChecker.css'

const DatabaseChecker = () => {
  const [checking, setChecking] = useState(false)
  const [results, setResults] = useState(null)
  const [creating, setCreating] = useState(false)

  const runCheck = async () => {
    setChecking(true)
    setResults(null)
    
    try {
      const checkResults = await checkImageUploadSystem()
      setResults(checkResults)
    } catch (error) {
      console.error('Errore durante la verifica:', error)
      setResults({ error: error.message })
    } finally {
      setChecking(false)
    }
  }

  const createBucket = async () => {
    setCreating(true)
    
    try {
      await createStorageBucket()
      // Ri-esegui il check dopo la creazione
      await runCheck()
    } catch (error) {
      console.error('Errore durante la creazione del bucket:', error)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="database-checker">
      <div className="checker-header">
        <h3>🔍 Verifica Sistema Upload Immagini</h3>
        <p>Controlla se il database e storage sono pronti per l'upload delle immagini</p>
      </div>

      <div className="checker-actions">
        <button 
          onClick={runCheck} 
          disabled={checking}
          className="check-btn"
        >
          {checking ? '🔄 Verificando...' : '🔍 Verifica Sistema'}
        </button>
      </div>

      {results && (
        <div className="checker-results">
          {results.error ? (
            <div className="result-error">
              ❌ Errore: {results.error}
            </div>
          ) : (
            <>
              <div className="result-section">
                <h4>📋 Colonne Database</h4>
                <div className="columns-grid">
                  {Object.entries(results.columns).map(([column, exists]) => (
                    <div key={column} className={`column-item ${exists ? 'exists' : 'missing'}`}>
                      <span className="column-status">{exists ? '✅' : '❌'}</span>
                      <span className="column-name">{column}</span>
                      {column === 'avatar_url' && !exists && (
                        <span className="column-required">RICHIESTO</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="result-section">
                <h4>🪣 Storage</h4>
                <div className={`storage-item ${results.bucketExists ? 'exists' : 'missing'}`}>
                  <span className="storage-status">{results.bucketExists ? '✅' : '❌'}</span>
                  <span className="storage-name">customer-avatars bucket</span>
                  {!results.bucketExists && (
                    <>
                      <span className="storage-required">RICHIESTO</span>
                      <button 
                        onClick={createBucket}
                        disabled={creating}
                        className="create-bucket-btn"
                      >
                        {creating ? '⏳ Creando...' : '🪣 Crea Bucket'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className={`result-summary ${results.isReady ? 'ready' : 'not-ready'}`}>
                <h4>
                  {results.isReady ? '✅ Sistema Pronto' : '❌ Sistema Non Pronto'}
                </h4>
                {results.isReady ? (
                  <p>Il sistema di upload immagini è completamente configurato!</p>
                ) : (
                  <div>
                    <p>Configurazione incompleta. Azioni necessarie:</p>
                    <ul>
                      {!results.columns.avatar_url && (
                        <li>Aggiungere colonna <code>avatar_url</code> alla tabella <code>customers</code></li>
                      )}
                      {!results.bucketExists && (
                        <li>Creare bucket storage <code>customer-avatars</code></li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <div className="checker-info">
        <h4>ℹ️ Informazioni</h4>
        <ul>
          <li><strong>avatar_url:</strong> Campo per memorizzare URL dell'immagine profilo</li>
          <li><strong>customer-avatars:</strong> Bucket storage per le immagini dei clienti</li>
          <li><strong>Verifica:</strong> Controlla configurazione database e storage</li>
        </ul>
      </div>
    </div>
  )
}

export default DatabaseChecker