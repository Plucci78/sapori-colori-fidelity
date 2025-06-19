import { useState, useEffect, memo, useCallback } from 'react'
import { supabase } from '../../supabase'
import TabletNFCReader from './TabletNFCReader'
import Trust3700FReaderFull from './Trust3700FReaderFull'

console.log('🔧 NFCViewProgressive: All imports loaded successfully')

const NFCViewProgressive = memo(({ showNotification }) => {
  console.log('🔧 NFCViewProgressive: Component starting')
  
  // Stati base (come nel componente originale)
  const [isDemoMode, setIsDemoMode] = useState(true)
  const [isReading, setIsReading] = useState(false)
  const [nfcTags, setNfcTags] = useState([])
  const [customers, setCustomers] = useState([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [tagName, setTagName] = useState('')
  const [lastReadTag, setLastReadTag] = useState(null)
  const [nfcLogs, setNfcLogs] = useState([])
  const [deviceType, setDeviceType] = useState('unknown')

  console.log('🔧 NFCViewProgressive: States initialized')

  // Funzione detect device type semplificata
  const detectDeviceType = useCallback(() => {
    console.log('🔧 NFCViewProgressive: Detecting device type')
    const userAgent = navigator.userAgent.toLowerCase()
    const hasTouch = 'ontouchstart' in window
    const screenWidth = window.screen.width

    if (hasTouch && screenWidth >= 768 && screenWidth <= 1920) {
      return 'tablet'
    } else if (hasTouch && screenWidth < 768) {
      return 'mobile'
    } else {
      return 'desktop'
    }
  }, [])

  // useEffect per inizializzazione
  useEffect(() => {
    console.log('🔧 NFCViewProgressive: useEffect started')
    try {
      const detected = detectDeviceType()
      setDeviceType(detected)
      console.log('🔧 NFCViewProgressive: Device type set to:', detected)
    } catch (error) {
      console.error('❌ NFCViewProgressive: Error in useEffect:', error)
    }
  }, [detectDeviceType])

  console.log('🔧 NFCViewProgressive: Rendering JSX')

  return (
    <div style={{ padding: '20px' }}>
      <h1>🔧 NFCView Progressive Test</h1>
      
      <div style={{ background: '#f0f8ff', padding: '15px', margin: '10px 0', borderRadius: '8px' }}>
        <h3>✅ Imports Success</h3>
        <p>Tutti gli import funzionano correttamente</p>
        <p><strong>Device Type:</strong> {deviceType}</p>
        <p><strong>Demo Mode:</strong> {isDemoMode ? 'ON' : 'OFF'}</p>
      </div>
      
      <div style={{ background: '#fff3cd', padding: '15px', margin: '10px 0', borderRadius: '8px' }}>
        <h3>📊 States</h3>
        <p>NFC Tags: {nfcTags.length}</p>
        <p>Customers: {customers.length}</p>
        <p>Last Read Tag: {lastReadTag ? 'Present' : 'None'}</p>
      </div>
      
      <div style={{ background: '#d4edda', padding: '15px', margin: '10px 0', borderRadius: '8px' }}>
        <h3>🧪 Test Components - Safe Mode</h3>
        <p>Ora testiamo i componenti NFC in modalità sicura:</p>
        <p><strong>Device Type:</strong> {deviceType}</p>
        
        {deviceType === 'desktop' && (
          <div style={{ margin: '10px 0', padding: '10px', background: 'white', border: '1px solid #ccc' }}>
            <h4>Trust 3700F Reader Safe Test:</h4>
            <Trust3700FReaderFull 
              onTagRead={(tagId) => console.log('Trust tag read:', tagId)}
              onError={(error) => console.log('Trust error:', error)}
              onCustomerFound={(customer) => console.log('Trust customer:', customer)}
              showNotification={showNotification}
            />
          </div>
        )}
        
        {deviceType === 'tablet' && (
          <div style={{ margin: '10px 0', padding: '10px', background: 'white', border: '1px solid #ccc' }}>
            <h4>Tablet NFC Reader Component Test:</h4>
            <TabletNFCReader 
              onCustomerFound={(customer) => console.log('Tablet customer:', customer)}
              showNotification={showNotification}
            />
          </div>
        )}
      </div>
    </div>
  )
})

NFCViewProgressive.displayName = 'NFCViewProgressive'

console.log('🔧 NFCViewProgressive: Component exported')

export default NFCViewProgressive
