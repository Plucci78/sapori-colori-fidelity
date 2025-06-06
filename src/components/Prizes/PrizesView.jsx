import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import '../../styles/prizes.css'
import { 
  Gift, 
  Upload, 
  X, 
  Edit2, 
  Trash2, 
  Sparkles, 
  Image as ImageIcon,
  Award,
  ShoppingBag
} from 'lucide-react'

export default function PrizesView({ showNotification }) {
  const [prizes, setPrizes] = useState([])
  const [newPrizeName, setNewPrizeName] = useState('')
  const [newPrizeDescription, setNewPrizeDescription] = useState('')
  const [newPrizeCost, setNewPrizeCost] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPrizes()
  }, [])

  const loadPrizes = async () => {
    try {
      const { data, error } = await supabase
        .from('prizes')
        .select('*')
        .eq('active', true)
        .order('points_cost', { ascending: true })

      if (error) throw error
      setPrizes(data || [])
    } catch (error) {
      console.error('Errore caricamento premi:', error)
      showNotification('Errore nel caricamento dei premi', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleImageSelect(files[0])
    }
  }

  const handleImageSelect = (file) => {
    if (file && file.type.startsWith('image/')) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    } else {
      showNotification('Seleziona un file immagine valido', 'error')
    }
  }

  const handleFileInput = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleImageSelect(file)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  const uploadImage = async () => {
    if (!imageFile) return null

    const fileExt = imageFile.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `prizes/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('prize-images')
      .upload(filePath, imageFile)

    if (uploadError) {
      console.error('Errore upload immagine:', uploadError)
      throw uploadError
    }

    const { data: { publicUrl } } = supabase.storage
      .from('prize-images')
      .getPublicUrl(filePath)

    return publicUrl
  }

  const createPrize = async (e) => {
    e.preventDefault()

    if (!newPrizeName || !newPrizeCost) {
      showNotification('Compila tutti i campi obbligatori', 'error')
      return
    }

    setIsUploading(true)

    try {
      let imageUrl = null
      
      if (imageFile) {
        imageUrl = await uploadImage()
      }

      const { error } = await supabase
        .from('prizes')
        .insert([{
          name: newPrizeName,
          description: newPrizeDescription,
          points_cost: parseInt(newPrizeCost),
          image_url: imageUrl,
          active: true
        }])

      if (error) throw error

      showNotification('Premio creato con successo! 🎉', 'success')
      
      // Reset form
      setNewPrizeName('')
      setNewPrizeDescription('')
      setNewPrizeCost('')
      setImageFile(null)
      setImagePreview(null)
      
      loadPrizes()
    } catch (error) {
      console.error('Errore creazione premio:', error)
      showNotification('Errore nella creazione del premio', 'error')
    } finally {
      setIsUploading(false)
    }
  }

  const deletePrize = async (id, imageUrl) => {
    if (!confirm('Sei sicuro di voler eliminare questo premio?')) return

    try {
      // Elimina immagine da storage se esiste
      if (imageUrl) {
        const path = imageUrl.split('/').slice(-2).join('/')
        await supabase.storage
          .from('prize-images')
          .remove([path])
      }

      const { error } = await supabase
        .from('prizes')
        .update({ active: false })
        .eq('id', id)

      if (error) throw error

      showNotification('Premio eliminato', 'success')
      loadPrizes()
    } catch (error) {
      console.error('Errore eliminazione premio:', error)
      showNotification('Errore nell\'eliminazione del premio', 'error')
    }
  }

  return (
    <div className="main-content" style={{ backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      <div className="prizes-container" style={{ padding: '2rem' }}>
      {/* Form creazione premio */}
      <div className="prize-form-card">
        <div className="prize-form-inner">
          <div className="prize-form-header">
            <Gift size={32} />
            <h2>Aggiungi Nuovo Premio</h2>
          </div>

          <form onSubmit={createPrize}>
            {/* Area upload immagine */}
            {!imagePreview ? (
              <div
                className={`upload-area ${isDragging ? 'dragging' : ''}`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input').click()}
              >
                <input
                  id="file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  style={{ display: 'none' }}
                />
                <Upload className="upload-icon" />
                <p className="upload-text">
                  Trascina qui l'immagine del premio
                </p>
                <p className="upload-hint">
                  oppure clicca per selezionare
                </p>
              </div>
            ) : (
              <div className="image-preview">
                <img src={imagePreview} alt="Preview premio" />
                <div className="image-preview-overlay">
                  <button
                    type="button"
                    className="remove-image-btn"
                    onClick={removeImage}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Form inputs */}
            <div className="prize-form-grid">
              <div className="form-group">
                <label>
                  <ShoppingBag size={16} />
                  Nome Premio
                </label>
                <input
                  type="text"
                  className="modern-input"
                  value={newPrizeName}
                  onChange={(e) => setNewPrizeName(e.target.value)}
                  placeholder="es. Cornetto Gratis"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  <Sparkles size={16} />
                  Costo in GEMME
                </label>
                <input
                  type="number"
                  className="modern-input"
                  value={newPrizeCost}
                  onChange={(e) => setNewPrizeCost(e.target.value)}
                  placeholder="es. 10"
                  min="1"
                  required
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>
                  <Edit2 size={16} />
                  Descrizione (opzionale)
                </label>
                <input
                  type="text"
                  className="modern-input"
                  value={newPrizeDescription}
                  onChange={(e) => setNewPrizeDescription(e.target.value)}
                  placeholder="es. Un cornetto della casa a tua scelta"
                />
              </div>

              <button
                type="submit"
                className="submit-btn"
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <div className="spinner" />
                    Creazione in corso...
                  </>
                ) : (
                  <>
                    <Gift size={20} />
                    Aggiungi Premio
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Griglia premi */}
      {loading ? (
        <div className="upload-loading">
          <div className="spinner" />
          <span>Caricamento premi...</span>
        </div>
      ) : prizes.length === 0 ? (
        <div className="empty-prizes">
          <Award className="empty-icon" />
          <h3 className="empty-title">Nessun premio ancora</h3>
          <p>Crea il tuo primo premio per iniziare!</p>
        </div>
      ) : (
        <div className="prizes-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginTop: '2rem'
        }}>
          {prizes.map((prize, index) => (
            <div key={prize.id} className="prize-card" style={{
              backgroundColor: 'white',
              border: '3px solid #8B4513',
              boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
            }}>
              {prize.image_url ? (
                <img 
                  src={prize.image_url} 
                  alt={prize.name}
                  className="prize-image"
                />
              ) : (
                <div className="prize-image" style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ImageIcon size={64} color="#e5e7eb" />
                </div>
              )}
              
              <div className="prize-badge">
                <Sparkles size={16} />
                {prize.points_cost} GEMME
              </div>

              <div className="prize-content">
                <h3 className="prize-title">{prize.name}</h3>
                {prize.description && (
                  <p className="prize-description">{prize.description}</p>
                )}

                <div className="prize-actions">
                  <button 
                    className="action-btn edit-btn"
                    onClick={() => showNotification('Modifica premio in arrivo!', 'info')}
                  >
                    <Edit2 size={16} />
                    Modifica
                  </button>
                  <button 
                    className="action-btn delete-btn"
                    onClick={() => deletePrize(prize.id, prize.image_url)}
                  >
                    <Trash2 size={16} />
                    Elimina
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}