import React, { useState, useEffect } from 'react'
import './EditCustomerModal.css'

const EditCustomerModal = ({ 
  customer, 
  isOpen, 
  onClose, 
  onSave, 
  showNotification 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birth_date: '',
    notes: ''
  })
  const [loading, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (customer && isOpen) {
      setFormData({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        birth_date: customer.birth_date || '',
        notes: customer.notes || ''
      })
      setErrors({})
    }
  }, [customer, isOpen])

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nome è obbligatorio'
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email non valida'
    }
    
    if (formData.phone && !/^[\d\s+\-()]+$/.test(formData.phone)) {
      newErrors.phone = 'Numero di telefono non valido'
    }
    
    if (formData.birth_date && new Date(formData.birth_date) > new Date()) {
      newErrors.birth_date = 'Data di nascita non può essere futura'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      showNotification('Correggi gli errori nel form', 'error')
      return
    }
    
    setSaving(true)
    
    try {
      await onSave(customer.id, formData)
      showNotification('Dati cliente aggiornati con successo', 'success')
      onClose()
    } catch (error) {
      console.error('Errore salvataggio cliente:', error)
      showNotification('Errore nel salvataggio dei dati', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Rimuovi errore quando l'utente inizia a correggere
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="edit-customer-modal-overlay" onClick={onClose}>
      <div className="edit-customer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="edit-customer-header">
          <h2>✏️ Modifica Dati Cliente</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="edit-customer-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name">Nome *</label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={errors.name ? 'error' : ''}
                placeholder="Nome completo"
                required
              />
              {errors.name && <span className="error-message">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={errors.email ? 'error' : ''}
                placeholder="email@esempio.com"
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="phone">Telefono</label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className={errors.phone ? 'error' : ''}
                placeholder="+39 123 456 7890"
              />
              {errors.phone && <span className="error-message">{errors.phone}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="birth_date">Data di Nascita</label>
              <input
                type="date"
                id="birth_date"
                value={formData.birth_date}
                onChange={(e) => handleChange('birth_date', e.target.value)}
                className={errors.birth_date ? 'error' : ''}
              />
              {errors.birth_date && <span className="error-message">{errors.birth_date}</span>}
            </div>

            <div className="form-group full-width">
              <label htmlFor="notes">Note</label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Note aggiuntive..."
                rows="3"
              />
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Annulla
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Salvando...' : '💾 Salva Modifiche'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditCustomerModal