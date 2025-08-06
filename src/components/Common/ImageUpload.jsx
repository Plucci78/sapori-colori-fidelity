import { useState, useRef } from 'react'
import { supabase } from '../../supabase'
import './ImageUpload.css'

const ImageUpload = ({ 
  currentImage, 
  onImageUploaded, 
  customerId, 
  maxSize = 2, // MB
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  bucketName = 'customer-avatars',
  className = ''
}) => {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(currentImage || null)
  const fileInputRef = useRef(null)

  const validateFile = (file) => {
    // Controlla tipo file
    if (!allowedTypes.includes(file.type)) {
      return `Tipo file non supportato. Usa: ${allowedTypes.map(type => type.split('/')[1]).join(', ')}`
    }

    // Controlla dimensione
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > maxSize) {
      return `File troppo grande. Massimo ${maxSize}MB`
    }

    return null
  }

  const handleFileSelect = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Reset errori
    setError('')

    // Valida file
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    // Mostra preview
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(file)

    // Upload file
    await uploadFile(file)
  }

  const uploadFile = async (file) => {
    setUploading(true)
    setError('')

    try {
      // Genera nome file unico
      const fileExt = file.name.split('.').pop()
      const fileName = `${customerId}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      console.log('📤 Uploading file:', fileName)

      // Upload su Supabase Storage
      let { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        console.error('❌ Upload error:', uploadError)
        
        // Se il bucket non esiste, prova a crearlo
        if (uploadError.message?.includes('The resource was not found')) {
          console.log('🪣 Tentando di creare bucket:', bucketName)
          
          const { error: bucketError } = await supabase.storage.createBucket(bucketName, {
            public: true,
            allowedMimeTypes: allowedTypes,
            fileSizeLimit: maxSize * 1024 * 1024
          })
          
          if (bucketError) {
            console.error('❌ Errore creazione bucket:', bucketError)
            throw new Error(`Bucket ${bucketName} non trovato e impossibile crearlo. Contatta l'amministratore.`)
          }
          
          // Riprova upload dopo creazione bucket
          const { data: retryData, error: retryError } = await supabase.storage
            .from(bucketName)
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: true
            })
          
          if (retryError) throw retryError
          data = retryData
        } else {
          throw uploadError
        }
      }

      console.log('✅ File uploaded:', data.path)

      // Ottieni URL pubblico
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath)

      console.log('🔗 Public URL:', publicUrl)

      // Aggiorna database cliente
      const { error: updateError } = await supabase
        .from('customers')
        .update({ avatar_url: publicUrl })
        .eq('id', customerId)

      if (updateError) {
        console.error('❌ Database update error:', updateError)
        throw updateError
      }

      console.log('✅ Cliente aggiornato con nuova immagine')

      // Callback con nuovo URL
      if (onImageUploaded) {
        onImageUploaded(publicUrl)
      }

      setPreview(publicUrl)

    } catch (error) {
      console.error('❌ Errore upload immagine:', error)
      setError(error.message || 'Errore durante l\'upload')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = async () => {
    if (!currentImage) return

    setUploading(true)
    setError('')

    try {
      // Rimuovi da database
      const { error: updateError } = await supabase
        .from('customers')
        .update({ avatar_url: null })
        .eq('id', customerId)

      if (updateError) throw updateError

      // Callback
      if (onImageUploaded) {
        onImageUploaded(null)
      }

      setPreview(null)
      console.log('✅ Immagine rimossa')

    } catch (error) {
      console.error('❌ Errore rimozione immagine:', error)
      setError(error.message || 'Errore durante la rimozione')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={`image-upload ${className}`}>
      <div className="image-upload-container">
        {preview ? (
          <div className="image-preview">
            <img src={preview} alt="Avatar" className="preview-image" />
            <div className="image-overlay">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="overlay-btn change-btn"
                title="Cambia immagine"
              >
                📷
              </button>
              <button
                onClick={handleRemoveImage}
                disabled={uploading}
                className="overlay-btn remove-btn"
                title="Rimuovi immagine"
              >
                🗑️
              </button>
            </div>
          </div>
        ) : (
          <div className="image-placeholder" onClick={() => fileInputRef.current?.click()}>
            <div className="placeholder-icon">
              {uploading ? '⏳' : '📷'}
            </div>
            <div className="placeholder-text">
              {uploading ? 'Caricamento...' : 'Aggiungi foto profilo'}
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={allowedTypes.join(',')}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={uploading}
      />

      {error && (
        <div className="upload-error">
          ⚠️ {error}
        </div>
      )}

      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div className="progress-fill"></div>
          </div>
          <div className="progress-text">Caricamento in corso...</div>
        </div>
      )}

      <div className="upload-info">
        <small>
          📎 Formati supportati: {allowedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')} 
          • Max {maxSize}MB
        </small>
      </div>
    </div>
  )
}

export default ImageUpload