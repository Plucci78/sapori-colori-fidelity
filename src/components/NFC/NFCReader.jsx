import React, { useState, useEffect } from 'react'
import { useNFC } from '../../hooks/useNFC'
import './NFCReader.css'

export const NFCReader = ({ 
  onCardRead = null, 
  onError = null,
  autoStart = false,
  className = '',
  title = 'Lettore NFC'
}) => {
  const {
    isNFCAvailable,
    isScanning,
    lastScannedData,
    error,
    nfcMethod,
    readNFC,
    detectNFCCapability
  } = useNFC()

  const [isActive, setIsActive] = useState(false)

  // Auto-start se richiesto
  useEffect(() => {
    if (autoStart && isNFCAvailable && !isActive) {
      handleStartReading()
    }
  }, [autoStart, isNFCAvailable])

  // Callback quando viene letta una carta
  useEffect(() => {
    if (lastScannedData && onCardRead) {
      onCardRead(lastScannedData)
    }
  }, [lastScannedData, onCardRead])

  // Callback per errori
  useEffect(() => {
    if (error && onError) {
      onError(error)
    }
  }, [error, onError])

  const handleStartReading = async () => {
    setIsActive(true)
    try {
      await readNFC()
    } catch (err) {
      console.error('Errore lettura NFC:', err)
    } finally {
      setIsActive(false)
    }
  }

  const handleStopReading = () => {
    setIsActive(false)
  }

  const getStatusIcon = () => {
    if (!isNFCAvailable) return '❌'
    if (isScanning || isActive) return '🔄'
    return '📱'
  }

  const getStatusText = () => {
    if (!isNFCAvailable) return 'NFC non disponibile'
    if (isScanning) return 'Avvicina la carta NFC...'
    if (isActive) return 'In attesa di lettura...'
    return 'Pronto per la lettura'
  }

  const getMethodBadge = () => {
    if (nfcMethod === 'web-nfc') return 'Web NFC'
    if (nfcMethod === 'raspberry-bridge') return 'Raspberry'
    return 'Non disponibile'
  }

  return (
    <div className={`nfc-reader ${className}`}>
      
      {/* Header */}
      <div className=\"nfc-reader-header\">
        <h3 className=\"nfc-title\">{title}</h3>
        <div className={`nfc-method-badge ${nfcMethod || 'unavailable'}`}>
          {getMethodBadge()}
        </div>
      </div>

      {/* Status Display */}
      <div className={`nfc-status ${isNFCAvailable ? 'available' : 'unavailable'}`}>
        <div className=\"nfc-status-icon\">
          {getStatusIcon()}
        </div>
        <div className=\"nfc-status-text\">
          {getStatusText()}
        </div>
      </div>

      {/* Errori */}
      {error && (
        <div className=\"nfc-error\">
          ⚠️ {error}
        </div>
      )}

      {/* Controlli */}
      <div className=\"nfc-controls\">
        {!isNFCAvailable ? (
          <button 
            onClick={detectNFCCapability}
            className=\"nfc-button retry\"
            disabled={isScanning}
          >
            🔄 Rileva NFC
          </button>
        ) : (
          <>
            {!isActive && !isScanning && (
              <button 
                onClick={handleStartReading}
                className=\"nfc-button start\"
              >
                📱 Leggi Carta NFC
              </button>
            )}
            
            {(isActive || isScanning) && (
              <button 
                onClick={handleStopReading}
                className=\"nfc-button stop\"
              >
                ⏹️ Interrompi
              </button>
            )}
          </>
        )}
      </div>

      {/* Ultimo dato letto */}
      {lastScannedData && (
        <div className=\"nfc-last-read\">
          <div className=\"nfc-last-read-header\">
            ✅ Ultima lettura:
          </div>
          <div className=\"nfc-data\">
            <div className=\"nfc-data-row\">
              <span className=\"nfc-data-label\">Dati:</span>
              <span className=\"nfc-data-value\">{
                typeof lastScannedData.data === 'string' 
                  ? lastScannedData.data 
                  : JSON.stringify(lastScannedData.data)
              }</span>
            </div>
            {lastScannedData.uid && (
              <div className=\"nfc-data-row\">
                <span className=\"nfc-data-label\">UID:</span>
                <span className=\"nfc-data-value\">{lastScannedData.uid}</span>
              </div>
            )}
            <div className=\"nfc-data-row\">
              <span className=\"nfc-data-label\">Metodo:</span>
              <span className=\"nfc-data-value\">{lastScannedData.method}</span>
            </div>
            <div className=\"nfc-data-row\">
              <span className=\"nfc-data-label\">Timestamp:</span>
              <span className=\"nfc-data-value\">
                {new Date(lastScannedData.timestamp).toLocaleString('it-IT')}
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default NFCReader