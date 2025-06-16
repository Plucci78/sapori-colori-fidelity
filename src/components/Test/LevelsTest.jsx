import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { getCustomerLevel, getNextLevelInfo } from '../../utils/levelsUtils'

const LevelsTest = () => {
  const [testResults, setTestResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    runTests()
  }, [])

  const runTests = async () => {
    const results = []
    
    try {
      results.push({ test: 'Inizializzazione test', status: 'info', message: 'Avvio verifica sistema livelli...' })
      
      // Test 1: Verifica esistenza tabella customer_levels
      results.push({ test: 'Test 1', status: 'info', message: 'Controllo tabella customer_levels...' })
      
      const { data: levels, error: levelsError } = await supabase
        .from('customer_levels')
        .select('*')
        .order('sort_order')

      if (levelsError) {
        results.push({ 
          test: 'Test 1', 
          status: 'error', 
          message: `Tabella customer_levels non trovata: ${levelsError.message}`,
          details: 'La tabella customer_levels potrebbe non esistere nel database.'
        })
      } else {
        results.push({ 
          test: 'Test 1', 
          status: 'success', 
          message: `Tabella customer_levels trovata! Livelli configurati: ${levels.length}`,
          details: levels.map(l => `${l.name}: ${l.min_gems}-${l.max_gems || '∞'} GEMME`).join(', ')
        })

        // Test 2: Verifica utility functions
        results.push({ test: 'Test 2', status: 'info', message: 'Test utility functions...' })
        
        const testScores = [0, 50, 150, 300, 500, 1000]
        let utilityErrors = 0
        
        for (const score of testScores) {
          try {
            const currentLevel = await getCustomerLevel(score)
            const nextLevelInfo = await getNextLevelInfo(score)
            
            results.push({
              test: 'Test 2',
              status: 'success',
              message: `${score} GEMME → ${currentLevel ? currentLevel.name : 'Nessun livello'}`,
              details: nextLevelInfo ? 
                `Prossimo: ${nextLevelInfo.nextLevel.name}, Mancanti: ${nextLevelInfo.gemsNeeded}, Progresso: ${nextLevelInfo.progressPercentage}%` :
                'Livello massimo raggiunto'
            })
          } catch (err) {
            utilityErrors++
            results.push({
              test: 'Test 2',
              status: 'error',
              message: `Errore per ${score} GEMME: ${err.message}`
            })
          }
        }

        if (utilityErrors === 0) {
          results.push({
            test: 'Test 2',
            status: 'success',
            message: 'Tutte le utility functions funzionano correttamente!'
          })
        }
      }

      // Test 3: Verifica integrazione con customers
      results.push({ test: 'Test 3', status: 'info', message: 'Verifica integrazione con clienti...' })
      
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id, full_name, gemme_points')
        .limit(5)

      if (customersError) {
        results.push({
          test: 'Test 3',
          status: 'error',
          message: `Errore accesso tabella customers: ${customersError.message}`
        })
      } else {
        results.push({
          test: 'Test 3',
          status: 'success',
          message: `Tabella customers accessibile. Clienti trovati: ${customers.length}`
        })

        // Test livelli per clienti reali (solo se abbiamo i livelli)
        if (levels && levels.length > 0 && customers.length > 0) {
          for (const customer of customers.slice(0, 3)) {
            try {
              const level = await getCustomerLevel(customer.gemme_points || 0)
              results.push({
                test: 'Test 3',
                status: 'success',
                message: `Cliente: ${customer.full_name}`,
                details: `${customer.gemme_points || 0} GEMME → ${level ? level.name : 'Nessun livello'}`
              })
            } catch (err) {
              results.push({
                test: 'Test 3',
                status: 'error',
                message: `Errore per cliente ${customer.full_name}: ${err.message}`
              })
            }
          }
        }
      }

      // Test 4: Verifica integrazione con prizes
      results.push({ test: 'Test 4', status: 'info', message: 'Verifica integrazione con premi...' })
      
      const { data: prizes, error: prizesError } = await supabase
        .from('prizes')
        .select('id, name, level_required')
        .limit(10)

      if (prizesError) {
        results.push({
          test: 'Test 4',
          status: 'warning',
          message: `Accesso limitato alla tabella prizes: ${prizesError.message}`
        })
      } else {
        const prizesWithLevels = prizes.filter(p => p.level_required)
        results.push({
          test: 'Test 4',
          status: 'success',
          message: `Tabella prizes accessibile. Premi con requisiti di livello: ${prizesWithLevels.length}/${prizes.length}`
        })
      }

      results.push({ test: 'Completamento', status: 'success', message: '🎉 Test completato!' })
      
    } catch (err) {
      results.push({
        test: 'Errore generale',
        status: 'error',
        message: `Errore fatale: ${err.message}`
      })
      setError(err.message)
    }

    setTestResults(results)
    setLoading(false)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50'
      case 'error': return 'text-red-600 bg-red-50'
      case 'warning': return 'text-yellow-600 bg-yellow-50'
      case 'info': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅'
      case 'error': return '❌'
      case 'warning': return '⚠️'
      case 'info': return '🔍'
      default: return '📋'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-lg font-medium">Esecuzione test sistema livelli...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🔍 Test Sistema Livelli Cliente
          </h1>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium">Errore generale: {error}</p>
            </div>
          )}

          <div className="space-y-4">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.status === 'success' ? 'border-green-200' :
                  result.status === 'error' ? 'border-red-200' :
                  result.status === 'warning' ? 'border-yellow-200' :
                  'border-blue-200'
                }`}
              >
                <div className={`flex items-start space-x-3 p-3 rounded ${getStatusColor(result.status)}`}>
                  <span className="text-xl">{getStatusIcon(result.status)}</span>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{result.test}</span>
                      <span className="text-sm">•</span>
                      <span>{result.message}</span>
                    </div>
                    {result.details && (
                      <div className="mt-2 text-sm opacity-75">
                        {result.details}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">📋 Riassunto Test</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {testResults.filter(r => r.status === 'success').length}
                </div>
                <div className="text-green-700">Successi</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">
                  {testResults.filter(r => r.status === 'error').length}
                </div>
                <div className="text-red-700">Errori</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-600">
                  {testResults.filter(r => r.status === 'warning').length}
                </div>
                <div className="text-yellow-700">Avvisi</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {testResults.filter(r => r.status === 'info').length}
                </div>
                <div className="text-blue-700">Info</div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={runTests}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔄 Ripeti Test
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LevelsTest
