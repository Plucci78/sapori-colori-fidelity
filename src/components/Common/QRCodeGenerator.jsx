import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

const QRCodeGenerator = ({ 
  value, 
  size = 200, 
  className = '',
  title = '',
  backgroundColor = '#ffffff',
  foregroundColor = '#000000'
}) => {
  const canvasRef = useRef(null)

  useEffect(() => {
    const generateQR = async () => {
      try {
        await QRCode.toCanvas(canvasRef.current, value, {
          width: size,
          margin: 2,
          color: {
            dark: foregroundColor,
            light: backgroundColor,
          },
          errorCorrectionLevel: 'M'
        })
      } catch (error) {
        console.error('Errore generazione QR code:', error)
      }
    }

    if (value && canvasRef.current) {
      generateQR()
    }
  }, [value, size, backgroundColor, foregroundColor])

  const downloadQR = () => {
    if (canvasRef.current) {
      const link = document.createElement('a')
      link.download = `qr-code-${Date.now()}.png`
      link.href = canvasRef.current.toDataURL()
      link.click()
    }
  }

  if (!value) {
    return (
      <div className={`qr-placeholder ${className}`} style={{ width: size, height: size }}>
        <p>Nessun valore da codificare</p>
      </div>
    )
  }

  return (
    <div className={`qr-generator ${className}`}>
      {title && <h4 className="qr-title">{title}</h4>}
      <div className="qr-canvas-container">
        <canvas 
          ref={canvasRef}
          style={{ 
            border: '2px solid #e2e8f0', 
            borderRadius: '8px',
            maxWidth: '100%',
            height: 'auto'
          }}
        />
      </div>
      <div className="qr-actions">
        <button 
          onClick={downloadQR}
          className="btn-download-qr"
          title="Scarica QR Code"
        >
          📥 Scarica QR
        </button>
      </div>
    </div>
  )
}

export default QRCodeGenerator