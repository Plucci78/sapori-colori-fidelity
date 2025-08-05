import React, { useEffect } from 'react'
import QRCodeGenerator from '../Common/QRCodeGenerator'
import './QRModal.css'

const QRModal = ({ isOpen, onClose, customer, customerLevel }) => {
  // Close modal con ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.keyCode === 27) onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'auto'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="qr-modal-overlay" onClick={onClose}>
      <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="qr-modal-header">
          <h2>
            <img 
              src="/gemma-rossa.png" 
              alt="Gemma" 
              style={{ width: '24px', height: '24px', marginRight: '8px', verticalAlign: 'middle' }}
            />
            Codice Riconoscimento
          </h2>
          <button className="qr-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* QR Code Central */}
        <div className="qr-modal-body">
          <div className="qr-code-container">
            <div className="qr-code-wrapper">
              <QRCodeGenerator
                value={`CUSTOMER:${customer.id}`}
                size={240}
                backgroundColor="#ffffff"
                foregroundColor={customerLevel?.primary_color || "#8B4513"}
                className="modal-qr-code"
              />
            </div>
            
            {/* Customer Info */}
            <div className="qr-customer-details">
              <div className="customer-avatar">
                <span className="avatar-icon">👤</span>
              </div>
              <div className="customer-info">
                <h3>{customer.name}</h3>
                <p>ID: #{customer.id.substring(0,8)}</p>
                <div 
                  className="customer-level-badge"
                  style={{ backgroundColor: customerLevel?.primary_color || '#8B4513' }}
                >
                  {customerLevel?.icon_svg ? (
                    <span dangerouslySetInnerHTML={{ __html: customerLevel.icon_svg }} />
                  ) : (
                    <img 
                      src="/gemma-rossa.png" 
                      alt="Gemma" 
                      style={{ width: '12px', height: '12px' }}
                    />
                  )}
                  <span>{customerLevel?.name || 'Cliente'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="qr-instructions">
            <h4>📱 Come utilizzare:</h4>
            <div className="instruction-steps">
              <div className="instruction-step">
                <span className="step-number">1</span>
                <span>Mostra questo codice al personale</span>
              </div>
              <div className="instruction-step">
                <span className="step-number">2</span>
                <span>Verrai riconosciuto automaticamente</span>
              </div>
              <div className="instruction-step">
                <span className="step-number">3</span>
                <span>Accumula GEMME con i tuoi acquisti</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="qr-modal-footer">
          <button className="qr-close-button" onClick={onClose}>
            ✅ Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}

export default QRModal