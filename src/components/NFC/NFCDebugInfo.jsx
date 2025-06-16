// NFCDebugInfo - Componente per debug compatibilità NFC/WebUSB
import { useState, useEffect } from 'react'

const NFCDebugInfo = () => {
  const [debugInfo, setDebugInfo] = useState({})

  useEffect(() => {
    const checkCompatibility = async () => {
      const info = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        webUSBSupported: !!navigator.usb,
        webNFCSupported: 'NDEFReader' in window,
        isSecureContext: window.isSecureContext,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        touchSupported: 'ontouchstart' in window,
        timestamp: new Date().toLocaleString()
      }

      // Controlla dispositivi USB se supportato
      if (navigator.usb) {
        try {
          const devices = await navigator.usb.getDevices()
          info.existingUSBDevices = devices.length
          info.usbDevicesInfo = devices.map(device => ({
            vendorId: device.vendorId,
            productId: device.productId,
            productName: device.productName,
            manufacturerName: device.manufacturerName
          }))
        } catch (error) {
          info.usbError = error.message
        }
      }

      setDebugInfo(info)
    }

    checkCompatibility()
  }, [])

  return (
    <div className="nfc-debug-info" style={{
      background: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '8px',
      padding: '15px',
      margin: '10px 0',
      fontSize: '12px',
      fontFamily: 'monospace'
    }}>
      <h4 style={{ marginTop: 0, color: '#495057' }}>🔍 Debug Info - Compatibilità NFC/USB</h4>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <strong>Browser & Sistema:</strong><br/>
          <span style={{ color: debugInfo.webUSBSupported ? 'green' : 'red' }}>
            WebUSB: {debugInfo.webUSBSupported ? '✅ Supportato' : '❌ Non supportato'}
          </span><br/>
          <span style={{ color: debugInfo.webNFCSupported ? 'green' : 'red' }}>
            WebNFC: {debugInfo.webNFCSupported ? '✅ Supportato' : '❌ Non supportato'}
          </span><br/>
          <span style={{ color: debugInfo.isSecureContext ? 'green' : 'red' }}>
            HTTPS: {debugInfo.isSecureContext ? '✅ Sicuro' : '❌ Non sicuro'}
          </span><br/>
          Schermo: {debugInfo.screenWidth}x{debugInfo.screenHeight}<br/>
          Touch: {debugInfo.touchSupported ? '✅' : '❌'}<br/>
        </div>
        
        <div>
          <strong>Dispositivi USB:</strong><br/>
          {debugInfo.webUSBSupported ? (
            <>
              Trovati: {debugInfo.existingUSBDevices || 0}<br/>
              {debugInfo.usbDevicesInfo?.map((device, index) => (
                <div key={index} style={{ fontSize: '10px', color: '#6c757d' }}>
                  {device.manufacturerName} {device.productName}<br/>
                  VID: 0x{device.vendorId.toString(16).padStart(4, '0').toUpperCase()}, 
                  PID: 0x{device.productId.toString(16).padStart(4, '0').toUpperCase()}
                </div>
              ))}
              {debugInfo.usbError && (
                <div style={{ color: 'red' }}>Errore: {debugInfo.usbError}</div>
              )}
            </>
          ) : (
            <span style={{ color: 'red' }}>WebUSB non disponibile</span>
          )}
        </div>
      </div>
      
      <details style={{ marginTop: '10px' }}>
        <summary style={{ cursor: 'pointer', color: '#495057' }}>
          📱 User Agent (clicca per espandere)
        </summary>
        <div style={{ 
          marginTop: '5px', 
          padding: '5px', 
          background: '#e9ecef', 
          borderRadius: '4px',
          wordBreak: 'break-all',
          fontSize: '10px'
        }}>
          {debugInfo.userAgent}
        </div>
      </details>
      
      <div style={{ marginTop: '10px', fontSize: '10px', color: '#6c757d' }}>
        Aggiornato: {debugInfo.timestamp}
      </div>
    </div>
  )
}

export default NFCDebugInfo
