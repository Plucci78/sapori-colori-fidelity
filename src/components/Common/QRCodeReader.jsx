import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/library'
import { playQRScanSound } from '../../utils/soundUtils'

const QRCodeReader = ({ 
  onScan, 
  onError, 
  className = '',
  width = 300,
  height = 200
}) => {
  const videoRef = useRef(null)
  const readerRef = useRef(null)
  const [isScanning, setIsScanning] = useState(false)
  const [devices, setDevices] = useState([])
  const [selectedDevice, setSelectedDevice] = useState('')
  const [error, setError] = useState(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initReader = async () => {
      try {
        console.log('🎥 Inizializzazione QR Reader...')
        setIsLoading(true)
        setError(null)
        
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
          throw new Error('La webcam richiede HTTPS o localhost')
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('MediaDevices non supportato dal browser')
        }

        readerRef.current = new BrowserMultiFormatReader()
        
        const videoDevices = await readerRef.current.listVideoInputDevices()
        console.log('📱 Dispositivi video disponibili:', videoDevices.length)
        setDevices(videoDevices)
        
        if (videoDevices.length === 0) {
          throw new Error('Nessuna fotocamera trovata')
        }
        
        const rearCamera = videoDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        )
        
        if (rearCamera) {
          console.log('📸 Camera posteriore selezionata:', rearCamera.label)
          setSelectedDevice(rearCamera.deviceId)
        } else if (videoDevices.length > 0) {
          console.log('📸 Prima camera disponibile selezionata:', videoDevices[0].label)
          setSelectedDevice(videoDevices[0].deviceId)
        }
        
        setIsInitialized(true)
        setIsLoading(false)
        console.log('✅ Inizializzazione completata!')
        
      } catch (err) {
        console.error('❌ Errore inizializzazione scanner:', err)
        setError(err.message || 'Impossibile accedere alla fotocamera')
        setIsLoading(false)
        setIsInitialized(false)
        onError?.(err)
      }
    }

    const timer = setTimeout(initReader, 100)
    
    return () => {
      clearTimeout(timer)
      if (readerRef.current) {
        readerRef.current.reset()
      }
    }
  }, [onError])

  const startScanning = async () => {
    console.log('🎬 startScanning chiamato...')
    
    if (!readerRef.current || !videoRef.current) {
      setError('Componenti scanner non inizializzati')
      return
    }

    if (!isInitialized) {
      setError('Scanner non inizializzato. Clicca "Inizializza Webcam"')
      return
    }

    try {
      console.log('🎬 Avvio scansione QR...')
      
      setIsScanning(true)
      setError(null)

      await readerRef.current.decodeFromVideoDevice(
        selectedDevice || undefined,
        videoRef.current,
        (result, error) => {
          if (result) {
            console.log('✅ QR Code scansionato:', result.getText())
            playQRScanSound()
            onScan?.(result.getText())
            setIsScanning(false)
          }
          if (error && error.name !== 'NotFoundException') {
            console.error('⚠️ Errore scansione:', error)
          }
        }
      )

      console.log('✅ Webcam attivata con successo!')
    } catch (err) {
      console.error('❌ Errore avvio scansione:', err)
      
      let errorMessage = 'Errore nell\'avvio della scansione'
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Permessi webcam negati. Consenti l\'accesso alla fotocamera.'
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'Nessuna fotocamera trovata.'
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'Fotocamera non supportata.'
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Fotocamera in uso da un\'altra applicazione.'
      }
      
      setError(errorMessage)
      setIsScanning(false)
      setIsInitialized(false)
      onError?.(err)
    }
  }

  const stopScanning = () => {
    if (readerRef.current) {
      readerRef.current.reset()
    }
    setIsScanning(false)
  }

  const retryInit = async () => {
    setError(null)
    setIsLoading(true)
    setIsInitialized(false)
    
    try {
      readerRef.current = new BrowserMultiFormatReader()
      const videoDevices = await readerRef.current.listVideoInputDevices()
      setDevices(videoDevices)
      
      const rearCamera = videoDevices.find(device => 
        device.label.toLowerCase().includes('back') ||
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      )
      
      if (rearCamera) {
        setSelectedDevice(rearCamera.deviceId)
      } else if (videoDevices.length > 0) {
        setSelectedDevice(videoDevices[0].deviceId)
      }
      
      setIsInitialized(true)
      setIsLoading(false)
      
    } catch (err) {
      setError('Impossibile accedere alla fotocamera')
      setIsLoading(false)
      setIsInitialized(false)
      onError?.(err)
    }
  }

  const testWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach(track => track.stop())
      alert('✅ Permessi webcam OK! Riprova ora.')
      retryInit()
    } catch (err) {
      alert('❌ Errore permessi: ' + err.message)
    }
  }

  if (isLoading) {
    return (
      <div className={`qr-reader-loading ${className}`}>
        <div className="loading-message">
          <span className="loading-icon">📷⏳</span>
          <p>Inizializzazione webcam in corso...</p>
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`qr-reader-error ${className}`}>
        <div className="error-message">
          <span className="error-icon">📷❌</span>
          <p>{error}</p>
          <div className="error-buttons">
            <button onClick={retryInit} className="btn-retry">
              🔄 Riprova
            </button>
            <button onClick={testWebcam} className="btn-test">
              🧪 Test Webcam
            </button>
          </div>
          <div className="help-text">
            <small>
              💡 <strong>Problemi comuni:</strong><br/>
              • Consenti l'accesso alla fotocamera nel browser<br/>
              • Verifica che nessun'altra app stia usando la webcam<br/>
              • Su Safari: Impostazioni → Privacy → Fotocamera
            </small>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`qr-reader ${className}`}>
      <div className="qr-reader-container">
        <video
          ref={videoRef}
          style={{
            width: width,
            height: height,
            border: '2px solid #8B4513',
            borderRadius: '8px',
            backgroundColor: '#f3f4f6'
          }}
        />
        
        {!isScanning && (
          <div className="qr-overlay">
            <div className="qr-target">
              <div className="corner top-left"></div>
              <div className="corner top-right"></div>
              <div className="corner bottom-left"></div>
              <div className="corner bottom-right"></div>
            </div>
          </div>
        )}
      </div>

      <div className="qr-controls">
        {devices.length > 1 && (
          <select 
            value={selectedDevice} 
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="camera-select"
          >
            {devices.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId.substring(0, 5)}...`}
              </option>
            ))}
          </select>
        )}

        <div className="scan-buttons">
          {!isInitialized ? (
            <button onClick={retryInit} className="btn-init">
              🔄 Inizializza Webcam
            </button>
          ) : !isScanning ? (
            <button onClick={startScanning} className="btn-start-scan">
              📷 Avvia Scansione
            </button>
          ) : (
            <button onClick={stopScanning} className="btn-stop-scan">
              ⏹️ Ferma Scansione
            </button>
          )}
        </div>
      </div>

      {isScanning && (
        <div className="scanning-status">
          <div className="scanning-indicator">📱 Inquadra il QR code...</div>
        </div>
      )}
    </div>
  )
}

export default QRCodeReader
