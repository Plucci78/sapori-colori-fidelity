import React, { useState, useEffect, memo } from 'react'

console.log('🔧 NFCViewMinimal: Starting')

const NFCViewMinimal = memo(({ showNotification }) => {
  console.log('🔧 NFCViewMinimal: Component rendering started')
  
  const [deviceType, setDeviceType] = useState('unknown')
  const [testStatus, setTestStatus] = useState('loading')
  
  // Test useEffect base
  useEffect(() => {
    console.log('🔧 NFCViewMinimal: useEffect started')
    
    const runTests = async () => {
      try {
        // Test 1: Import supabase
        console.log('🔧 Test 1: Import supabase')
        const { supabase } = await import('../../supabase')
        console.log('✅ Test 1: Supabase OK')
        
        // Test 2: Import TabletNFCReader
        console.log('🔧 Test 2: Import TabletNFCReader')
        await import('./TabletNFCReader')
        console.log('✅ Test 2: TabletNFCReader OK')
        
        // Test 3: Import Trust3700FReader
        console.log('🔧 Test 3: Import Trust3700FReader')
        await import('./Trust3700FReader')
        console.log('✅ Test 3: Trust3700FReader OK')
        
        setDeviceType('desktop')
        setTestStatus('success')
        console.log('✅ All tests passed')
        
      } catch (error) {
        console.error('❌ Test failed:', error)
        setTestStatus(`error: ${error.message}`)
      }
    }
    
    runTests()
  }, [])
  
  console.log('🔧 NFCViewMinimal: Rendering JSX')
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>🔧 NFCView Debug Completo</h1>
      
      <div style={{ background: '#f0f8ff', padding: '15px', margin: '10px 0', borderRadius: '8px' }}>
        <h3>Status Test</h3>
        <p><strong>Test Status:</strong> {testStatus}</p>
        <p><strong>Device Type:</strong> {deviceType}</p>
        <p><strong>Notification:</strong> {showNotification ? '✅ OK' : '❌ Missing'}</p>
      </div>
      
      <div style={{ background: '#d4edda', padding: '15px', margin: '10px 0', borderRadius: '8px' }}>
        <h3>Console Output</h3>
        <p>Controlla la console del browser (F12) per vedere i log dettagliati dei test.</p>
        <button onClick={() => {
          console.log('🔧 Test button clicked')
          if (showNotification) {
            showNotification('🔧 Test notifica OK!', 'success')
          }
        }}>
          Test Notifica
        </button>
      </div>
    </div>
  )
})

NFCViewMinimal.displayName = 'NFCViewMinimal'

console.log('🔧 NFCViewMinimal: Component exported')

export default NFCViewMinimal
