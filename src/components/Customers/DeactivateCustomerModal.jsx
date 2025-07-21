import React, { useState } from 'react'
import './DeactivateCustomerModal.css'

const DeactivateCustomerModal = ({ 
  customer, 
  isOpen, 
  onClose, 
  onConfirm, 
  showNotification 
}) => {
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (confirmText !== 'DESELEZIONA') {
      showNotification('Devi scrivere "DESELEZIONA" per confermare', 'error')
      return
    }

    setLoading(true)
    try {
      await onConfirm(customer.id)
      showNotification(`Cliente ${customer.name} deselezionato con successo`, 'success')
      onClose()
      setConfirmText('')
    } catch (error) {
      console.error('Errore deselezione cliente:', error)
      showNotification('Errore nella deselezione del cliente', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setConfirmText('')
    onClose()
  }

  if (!isOpen || !customer) return null

  return (
    <div className="deactivate-modal-overlay" onClick={handleClose}>
      <div className="deactivate-modal" onClick={(e) => e.stopPropagation()}>
        <div className="deactivate-header">
          <h2>⚠️ ATTENZIONE!</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        <div className="deactivate-content">
          <div className="warning-icon">🚨</div>
          
          <h3>Stai per deselezionare il cliente:</h3>
          <div className="customer-info">
            <strong>{customer.name}</strong>
            <div className="customer-details">
              {customer.email && <span>📧 {customer.email}</span>}
              <span>💎 {customer.points} GEMME</span>
            </div>
          </div>

          <div className="consequences">
            <h4>🔒 Il cliente NON potrà più:</h4>
            <ul>
              <li>❌ Fare transazioni</li>
              <li>❌ Riscuotere premi</li>
              <li>❌ Accedere al portale clienti</li>
              <li>❌ Essere selezionato per operazioni</li>
            </ul>
          </div>

          <div className="note">
            <strong>📊 Nota:</strong> Lo storico delle transazioni sarà mantenuto per fini statistici
          </div>

          <div className="confirm-section">
            <label htmlFor="confirm-text">
              <strong>Scrivi "DESELEZIONA" per confermare:</strong>
            </label>
            <input
              type="text"
              id="confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder="DESELEZIONA"
              className={confirmText === 'DESELEZIONA' ? 'valid' : ''}
              autoComplete="off"
            />
          </div>
        </div>

        <div className="deactivate-actions">
          <button 
            type="button" 
            className="btn-cancel"
            onClick={handleClose}
            disabled={loading}
          >
            Annulla
          </button>
          <button 
            type="button" 
            className="btn-deactivate"
            onClick={handleConfirm}
            disabled={loading || confirmText !== 'DESELEZIONA'}
          >
            {loading ? 'Deselezionando...' : '🔒 Deseleziona Cliente'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeactivateCustomerModal