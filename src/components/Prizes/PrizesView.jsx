import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabase'
import '../../styles/prizes.css'
import { Gift, Upload, X, Edit2, Trash2, Sparkles, Image as ImageIcon, Award, ShoppingBag } from 'lucide-react'

// COMPONENTE SELETTORE LIVELLO
const LevelSelector = ({ selectedLevel, onLevelChange, levels }) => {
  const getLevelIcon = (levelName) => {
    const level = levels.find(l => l.name === levelName)
    return level?.icon_svg || '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z"/></svg>'
  }
  const getLevelColor = (levelName) => {
    const level = levels.find(l => l.name === levelName)
    return level?.primary_color || '#cd7f32'
  }
  return (
    <div className="level-selector" style={{ marginBottom: 16 }}>
      <label className="block text-sm font-semibold text-brand mb-1">🏆 Livello Richiesto</label>
      <div className="level-dropdown flex items-center gap-3">
        <select 
          value={selectedLevel} 
          onChange={(e) => onLevelChange(e.target.value)}
          className="level-select modern-input"
        >
          {levels.map(level => (
            <option key={level.id} value={level.name}>
              {level.name} ({level.min_gems}+ GEMME)
            </option>
          ))}
        </select>
        <div className="selected-level-preview flex items-center gap-2">
          <div 
            className="level-icon-small"
            style={{ color: getLevelColor(selectedLevel), width: 28, height: 28 }}
            dangerouslySetInnerHTML={{ __html: getLevelIcon(selectedLevel) }}
          />
          <span className="font-semibold">{selectedLevel}</span>
        </div>
      </div>
    </div>
  )
}

// CARD PREMIO CON LIVELLO
const PrizeCard = ({ prize, onDelete, levels, setEditingPrize }) => {
  const prizeLevel = levels.find(l => l.name === prize.required_level)
  return (
    <div className="prize-card-with-level" style={{
      backgroundColor: 'white',
      border: '3px solid #8B4513',
      boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
      borderRadius: 16,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }}>
      {prize.image_url ? (
        <img src={prize.image_url} alt={prize.name} className="prize-image" style={{ borderRadius: 12, width: '100%', maxHeight: 140, objectFit: 'cover' }} />
      ) : (
        <div className="prize-image" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', height: 140, background: '#f3f4f6', borderRadius: 12
        }}>
          <ImageIcon size={64} color="#e5e7eb" />
        </div>
      )}
      <div className="prize-header flex items-center justify-between">
        <h4 className="font-bold text-brand text-lg">{prize.name}</h4>
        {prizeLevel && (
          <div 
            className="prize-level-badge flex items-center gap-1 px-2 py-1 rounded"
            style={{ backgroundColor: prizeLevel.primary_color, color: 'white', fontWeight: 600, fontSize: 13 }}
          >
            <span dangerouslySetInnerHTML={{ __html: prizeLevel.icon_svg }} style={{ width: 18, height: 18 }} />
            {prizeLevel.name}
          </div>
        )}
      </div>
      <p className="prize-description text-secondary text-sm">{prize.description}</p>
      <div className="flex items-center gap-3 mt-2">
        <div className="prize-badge flex items-center gap-1">
          <Sparkles size={16} />
          <span className="font-bold text-red-600">{prize.points_cost} GEMME</span>
        </div>
        {prizeLevel && (
          <span className="prize-level-req text-xs text-purple-700 ml-2">
            Min: {prizeLevel.min_gems} GEMME
          </span>
        )}
      </div>
      <div className="prize-actions flex gap-2 mt-2">
        <button 
          className="action-btn edit-btn"
          onClick={() => setEditingPrize(prize)}
        >
          <Edit2 size={16} /> Modifica
        </button>
        <button 
          className="action-btn delete-btn"
          onClick={() => onDelete(prize.id, prize.image_url)}
        >
          <Trash2 size={16} /> Elimina
        </button>
      </div>
    </div>
  )
}

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

  // Stati livelli
  const [levels, setLevels] = useState([])
  const [selectedLevel, setSelectedLevel] = useState('Bronzo')

  // Stato per la modifica del premio
  const [editingPrize, setEditingPrize] = useState(null)
  const [editingImageFile, setEditingImageFile] = useState(null)

  // Carica livelli da Supabase
  const loadLevels = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('customer_levels')
        .select('*')
        .eq('active', true)
        .order('sort_order')
      if (data) {
        setLevels(data)
        if (data.length > 0) setSelectedLevel(data[0].name)
      }
    } catch (error) {
      console.error('Errore caricamento livelli:', error)
    }
  }, [])

  useEffect(() => {
    loadLevels()
  }, [loadLevels])

  // Caricamento premi
  const loadPrizes = async () => {
    try {
      const { data, error } = await supabase
        .from('prizes')
        .select('*')
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

  useEffect(() => {
    loadPrizes()
    // eslint-disable-next-line
  }, [])

  // Gestione drag & drop immagine
  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true) }
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false) }
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation() }
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false)
    const files = e.dataTransfer.files
    if (files && files[0]) handleImageSelect(files[0])
  }
  const handleImageSelect = (file) => {
    if (file && file.type.startsWith('image/')) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result)
      reader.readAsDataURL(file)
    } else {
      showNotification('Seleziona un file immagine valido', 'error')
    }
  }
  const handleFileInput = (e) => {
    const file = e.target.files[0]
    if (file) handleImageSelect(file)
  }
  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  // Upload immagine su Supabase Storage
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

  // Aggiunta premio con livello
  const addPrizeWithLevel = useCallback(async (imageUrl = null) => {
    if (!newPrizeName || !newPrizeDescription || !newPrizeCost) {
      showNotification('Compila tutti i campi del premio', 'error')
      return
    }
    setIsUploading(true)
    try {
      const { data, error } = await supabase
        .from('prizes')
        .insert([{
          name: newPrizeName,
          description: newPrizeDescription,
          points_cost: parseInt(newPrizeCost),
          required_level: selectedLevel,
          image_url: imageUrl,
          active: true
        }])
        .select()
      if (data) {
        setPrizes([...prizes, data[0]])
        setNewPrizeName('')
        setNewPrizeDescription('')
        setNewPrizeCost('')
        setSelectedLevel(levels[0]?.name || 'Bronzo')
        setImageFile(null)
        setImagePreview(null)
        showNotification('Premio aggiunto con successo!')
      }
    } catch (error) {
      console.log('Errore aggiunta premio:', error)
      showNotification('Errore nell\'aggiunta del premio', 'error')
    } finally {
      setIsUploading(false)
      loadPrizes()
    }
  }, [newPrizeName, newPrizeDescription, newPrizeCost, selectedLevel, prizes, levels, showNotification])

  // Submit form
  const handleCreatePrize = async (e) => {
    e.preventDefault()
    let imageUrl = null
    if (imageFile) imageUrl = await uploadImage()
    addPrizeWithLevel(imageUrl)
  }

  // Eliminazione premio
  const deletePrize = async (id, imageUrl) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo premio?')) return
    try {
      if (imageUrl) {
        const path = imageUrl.split('/').slice(-2).join('/')
        await supabase.storage.from('prize-images').remove([path])
      }
      const { error } = await supabase
        .from('prizes')
        .update({ active: false })
        .eq('id', id)
      if (error) throw error
      // AGGIORNA LO STATO SUBITO DOPO L'ELIMINAZIONE
      setPrizes(prev => prev.filter(p => p.id !== id))
      showNotification('Premio eliminato', 'success')
      // loadPrizes() // opzionale: puoi anche lasciarlo per sicurezza
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
            <form onSubmit={handleCreatePrize}>
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
                    style={{ color: '#222', fontSize: '1rem', background: '#fff' }}
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
                    style={{ color: '#222', fontSize: '1rem', background: '#fff' }}
                  />
                </div>
                {/* SELETTORE LIVELLO */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  {levels.length > 0 && (
                    <LevelSelector 
                      selectedLevel={selectedLevel}
                      onLevelChange={setSelectedLevel}
                      levels={levels}
                    />
                  )}
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
                    style={{ color: '#222', fontSize: '1rem', background: '#fff' }}
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
            {prizes.filter(p => p.active !== false).map((prize) => (
              <PrizeCard 
                key={prize.id} 
                prize={prize} 
                onDelete={deletePrize}
                levels={levels}
                setEditingPrize={setEditingPrize}
              />
            ))}
          </div>
        )}

        {/* MODALE PER MODIFICA PREMIO */}
        {editingPrize && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>Modifica Premio</h3>
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  let imageUrl = editingPrize.image_url
                  if (editingImageFile) {
                    // Upload nuova immagine su Supabase
                    const fileExt = editingImageFile.name.split('.').pop()
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
                    const filePath = `prizes/${fileName}`
                    const { error: uploadError } = await supabase.storage
                      .from('prize-images')
                      .upload(filePath, editingImageFile)
                    if (uploadError) {
                      showNotification('Errore upload immagine', 'error')
                      return
                    }
                    const { data: { publicUrl } } = supabase.storage
                      .from('prize-images')
                      .getPublicUrl(filePath)
                    imageUrl = publicUrl
                  }
                  // Aggiorna il premio su Supabase
                  const { error } = await supabase
                    .from('prizes')
                    .update({
                      name: editingPrize.name,
                      description: editingPrize.description,
                      points_cost: editingPrize.points_cost,
                      required_level: editingPrize.required_level,
                      image_url: imageUrl
                    })
                    .eq('id', editingPrize.id)
                  if (error) {
                    showNotification('Errore nella modifica', 'error')
                  } else {
                    showNotification('Premio modificato!', 'success')
                    setEditingPrize(null)
                    setEditingImageFile(null)
                    loadPrizes()
                  }
                }}
              >
                {/* Mostra anteprima immagine attuale */}
                {editingPrize.image_url && (
                  <img src={editingPrize.image_url} alt="Immagine premio" style={{ maxWidth: 180, marginBottom: 12, borderRadius: 8 }} />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setEditingImageFile(e.target.files[0])}
                  style={{ marginBottom: 12 }}
                />
                <input
                  type="text"
                  value={editingPrize.name}
                  onChange={e => setEditingPrize({ ...editingPrize, name: e.target.value })}
                  placeholder="Nome premio"
                />
                <input
                  type="number"
                  value={editingPrize.points_cost}
                  onChange={e => setEditingPrize({ ...editingPrize, points_cost: e.target.value })}
                  placeholder="Costo in gemme"
                />
                {/* SELETTORE LIVELLO */}
                <select
                  value={editingPrize.required_level}
                  onChange={e => setEditingPrize({ ...editingPrize, required_level: e.target.value })}
                  style={{ marginBottom: 12, width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ddd' }}
                >
                  {levels.map(level => (
                    <option key={level.id} value={level.name}>
                      {level.name} ({level.min_gems}+ GEMME)
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={editingPrize.description}
                  onChange={e => setEditingPrize({ ...editingPrize, description: e.target.value })}
                  placeholder="Descrizione"
                />
                <button type="submit">Salva</button>
                <button type="button" onClick={() => { setEditingPrize(null); setEditingImageFile(null); }}>Annulla</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}



