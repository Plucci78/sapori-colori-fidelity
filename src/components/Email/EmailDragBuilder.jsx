import React, { useState, useRef, useCallback } from 'react'
import './EmailDragBuilder.css'

// Tipi di blocchi disponibili
const BLOCK_TYPES = {
  HEADER: 'header',
  TEXT: 'text',
  IMAGE: 'image',
  BUTTON: 'button',
  SPACER: 'spacer',
  DIVIDER: 'divider',
  COLUMNS: 'columns',
  QUOTE: 'quote',
  LIST: 'list',
  SOCIAL: 'social',
  FOOTER: 'footer'
}

// Componente blocco trascinabile
const DraggableBlock = ({ type, icon, label, onDragStart }) => {
  const getIconClass = (blockType) => {
    const iconMap = {
      [BLOCK_TYPES.HEADER]: 'icon-header',
      [BLOCK_TYPES.TEXT]: 'icon-text',
      [BLOCK_TYPES.IMAGE]: 'icon-image',
      [BLOCK_TYPES.BUTTON]: 'icon-button',
      [BLOCK_TYPES.SPACER]: 'icon-spacer',
      [BLOCK_TYPES.DIVIDER]: 'icon-divider',
      [BLOCK_TYPES.COLUMNS]: 'icon-columns',
      [BLOCK_TYPES.QUOTE]: 'icon-quote',
      [BLOCK_TYPES.LIST]: 'icon-list',
      [BLOCK_TYPES.SOCIAL]: 'icon-social',
      [BLOCK_TYPES.FOOTER]: 'icon-footer'
    }
    return iconMap[blockType] || ''
  }

  return (
    <div
      className="draggable-block"
      draggable
      onDragStart={(e) => onDragStart(e, type)}
    >
      <div className={`block-icon ${getIconClass(type)}`}></div>
      <span className="block-label">{label}</span>
    </div>
  )
}

// Componente blocco nell'editor
const EditableBlock = ({ block, index, onSelect, onUpdate, onDelete, isSelected }) => {
  const renderBlockContent = () => {
    switch (block.type) {
      case BLOCK_TYPES.HEADER:
        const headerStyle = {
          background: block.props.backgroundImage 
            ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${block.props.backgroundImage})` 
            : block.props.background || '#8B4513',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: block.props.color || 'white',
          padding: block.props.height ? `${parseInt(block.props.height)/2}px 20px` : '40px 20px',
          textAlign: block.props.align || 'center',
          minHeight: block.props.height || '80px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }
        
        return (
          <div className="block-header" style={headerStyle}>
            <h1 style={{ 
              margin: 0, 
              fontSize: block.props.titleSize || '32px',
              fontFamily: block.props.titleFont || 'Arial, sans-serif'
            }}>
              {block.props.title || 'Inserisci titolo'}
            </h1>
            {block.props.subtitle && (
              <p style={{ 
                margin: '15px 0 0 0', 
                fontSize: '18px', 
                opacity: 0.9,
                fontFamily: block.props.titleFont || 'Arial, sans-serif'
              }}>
                {block.props.subtitle}
              </p>
            )}
          </div>
        )
      
      case BLOCK_TYPES.TEXT:
        return (
          <div className="block-text" style={{ 
            padding: '20px',
            textAlign: block.props.align || 'left'
          }}>
            {block.props.title && (
              <h2 style={{ 
                color: block.props.titleColor || '#333',
                fontSize: block.props.titleSize || '24px'
              }}>
                {block.props.title}
              </h2>
            )}
            <p style={{ 
              color: block.props.textColor || '#666',
              fontSize: block.props.textSize || '16px',
              lineHeight: '1.6'
            }}>
              {block.props.content || 'Inserisci il tuo testo qui...'}
            </p>
          </div>
        )
      
      case BLOCK_TYPES.IMAGE:
        return (
          <div className="block-image" style={{ 
            padding: '20px',
            textAlign: block.props.align || 'center'
          }}>
            {block.props.src ? (
              <img 
                src={block.props.src} 
                alt={block.props.alt || 'Immagine'} 
                style={{ 
                  maxWidth: '100%',
                  borderRadius: block.props.borderRadius || '0px'
                }} 
              />
            ) : (
              <div style={{ 
                background: '#f8f9fa',
                padding: '60px',
                borderRadius: '8px',
                color: '#6c757d',
                textAlign: 'center'
              }}>
                Clicca per aggiungere immagine
              </div>
            )}
          </div>
        )
      
      case BLOCK_TYPES.BUTTON:
        return (
          <div className="block-button" style={{ 
            padding: '30px',
            textAlign: block.props.align || 'center'
          }}>
            <button style={{
              background: block.props.background || '#8B4513',
              color: block.props.color || 'white',
              border: 'none',
              padding: '15px 35px',
              borderRadius: block.props.borderRadius || '8px',
              fontSize: block.props.fontSize || '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}>
              {block.props.text || 'Call to Action'}
            </button>
          </div>
        )
      
      case BLOCK_TYPES.SPACER:
        return (
          <div className="block-spacer" style={{ 
            height: block.props.height || '40px',
            background: 'transparent'
          }}>
          </div>
        )
      
      case BLOCK_TYPES.DIVIDER:
        return (
          <div className="block-divider" style={{ padding: '20px' }}>
            <hr style={{
              border: 'none',
              borderTop: `${block.props.thickness || 1}px solid ${block.props.color || '#ddd'}`,
              margin: 0
            }} />
          </div>
        )
      
      case BLOCK_TYPES.COLUMNS:
        return (
          <div className="block-columns" style={{ 
            padding: '20px',
            display: 'flex',
            gap: '20px'
          }}>
            <div style={{ flex: 1, background: '#f8f9fa', padding: '20px', borderRadius: '4px' }}>
              <h4>Colonna 1</h4>
              <p>{block.props.leftContent || 'Contenuto colonna sinistra'}</p>
            </div>
            <div style={{ flex: 1, background: '#f8f9fa', padding: '20px', borderRadius: '4px' }}>
              <h4>Colonna 2</h4>
              <p>{block.props.rightContent || 'Contenuto colonna destra'}</p>
            </div>
          </div>
        )

      case BLOCK_TYPES.QUOTE:
        return (
          <div className="block-quote" style={{ 
            padding: '30px',
            background: '#f8f9fa',
            borderLeft: '4px solid #8B4513',
            fontStyle: 'italic'
          }}>
            <p style={{ fontSize: '18px', margin: 0, color: '#555' }}>
              "{block.props.quote || 'Inserisci la tua citazione qui'}"
            </p>
            {block.props.author && (
              <p style={{ marginTop: '10px', fontWeight: 'bold', color: '#8B4513' }}>
                - {block.props.author}
              </p>
            )}
          </div>
        )

      case BLOCK_TYPES.LIST:
        return (
          <div className="block-list" style={{ padding: '20px' }}>
            <h3 style={{ color: '#333', marginBottom: '15px' }}>
              {block.props.title || 'Lista'}
            </h3>
            <ul style={{ paddingLeft: '20px' }}>
              {(block.props.items || ['Elemento 1', 'Elemento 2', 'Elemento 3']).map((item, i) => (
                <li key={i} style={{ marginBottom: '8px', color: '#666' }}>{item}</li>
              ))}
            </ul>
          </div>
        )

      case BLOCK_TYPES.SOCIAL:
        return (
          <div className="block-social" style={{ 
            padding: '30px',
            textAlign: 'center'
          }}>
            <p style={{ marginBottom: '15px', color: '#666' }}>
              {block.props.socialText || 'Seguici sui social'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
              <a href={block.props.facebookUrl || '#'} style={{ width: '40px', height: '40px', background: '#3b5998', borderRadius: '50%', display: 'block' }}></a>
              <a href="#" style={{ width: '40px', height: '40px', background: '#1da1f2', borderRadius: '50%', display: 'block' }}></a>
              <a href={block.props.instagramUrl || '#'} style={{ width: '40px', height: '40px', background: '#e1306c', borderRadius: '50%', display: 'block' }}></a>
            </div>
          </div>
        )

      case BLOCK_TYPES.FOOTER:
        return (
          <div className="block-footer" style={{ 
            background: '#2c3e50',
            color: 'white',
            padding: '30px',
            textAlign: 'center'
          }}>
            <h4 style={{ margin: '0 0 15px 0' }}>
              {block.props.companyName || 'Sapori & Colori'}
            </h4>
            <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
              {block.props.address || 'Via Example 123, 00100 Roma'}
            </p>
            <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>
              {block.props.unsubscribe || 'Clicca qui per disiscriverti'}
            </p>
          </div>
        )
      
      default:
        return <div>Blocco sconosciuto</div>
    }
  }

  return (
    <div 
      className={`editable-block ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(index)}
    >
      {renderBlockContent()}
      
      {/* Overlay controlli quando selezionato */}
      {isSelected && (
        <div className="block-controls">
          <button className="control-btn edit" title="Modifica">✎</button>
          <button className="control-btn delete" onClick={() => onDelete(index)} title="Elimina">×</button>
        </div>
      )}
    </div>
  )
}

// Pannello proprietà per blocco selezionato
const PropertiesPanel = ({ selectedBlock, onUpdateBlock }) => {
  if (!selectedBlock) {
    return (
      <div className="properties-panel">
        <h3>Proprietà</h3>
        <p>Seleziona un blocco per modificarne le proprietà</p>
      </div>
    )
  }

  const handlePropertyChange = (property, value) => {
    onUpdateBlock({
      ...selectedBlock,
      props: {
        ...selectedBlock.props,
        [property]: value
      }
    })
  }

  const renderProperties = () => {
    switch (selectedBlock.type) {
      case BLOCK_TYPES.HEADER:
        return (
          <>
            <div className="property-group">
              <label>Titolo:</label>
              <input
                type="text"
                value={selectedBlock.props.title || ''}
                onChange={(e) => handlePropertyChange('title', e.target.value)}
              />
            </div>
            <div className="property-group">
              <label>Sottotitolo:</label>
              <input
                type="text"
                value={selectedBlock.props.subtitle || ''}
                onChange={(e) => handlePropertyChange('subtitle', e.target.value)}
              />
            </div>
            <div className="property-group">
              <label>Colore sfondo:</label>
              <input
                type="color"
                value={selectedBlock.props.background || '#8B4513'}
                onChange={(e) => handlePropertyChange('background', e.target.value)}
              />
            </div>
            <div className="property-group">
              <label>Colore testo:</label>
              <input
                type="color"
                value={selectedBlock.props.color || '#ffffff'}
                onChange={(e) => handlePropertyChange('color', e.target.value)}
              />
            </div>
            <div className="property-group">
              <label>Dimensione titolo:</label>
              <input
                type="text"
                value={selectedBlock.props.titleSize || '32px'}
                onChange={(e) => handlePropertyChange('titleSize', e.target.value)}
                placeholder="32px"
              />
            </div>
            <div className="property-group">
              <label>Font titolo:</label>
              <select
                value={selectedBlock.props.titleFont || 'Arial'}
                onChange={(e) => handlePropertyChange('titleFont', e.target.value)}
              >
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Georgia">Georgia</option>
                <option value="Verdana">Verdana</option>
                <option value="Helvetica">Helvetica</option>
              </select>
            </div>
            <div className="property-group">
              <label>Altezza blocco:</label>
              <input
                type="text"
                value={selectedBlock.props.height || '80px'}
                onChange={(e) => handlePropertyChange('height', e.target.value)}
                placeholder="80px"
              />
            </div>
            <div className="property-group">
              <label>Immagine di sfondo:</label>
              <input
                type="text"
                value={selectedBlock.props.backgroundImage || ''}
                onChange={(e) => handlePropertyChange('backgroundImage', e.target.value)}
                placeholder="URL immagine"
              />
            </div>
            <div className="property-group">
              <button 
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'image/*'
                  input.onchange = (e) => {
                    const file = e.target.files[0]
                    if (file) {
                      const url = URL.createObjectURL(file)
                      handlePropertyChange('backgroundImage', url)
                    }
                  }
                  input.click()
                }}
                style={{ 
                  background: '#8B4513', 
                  color: 'white', 
                  border: 'none', 
                  padding: '8px 16px', 
                  borderRadius: '4px',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Carica Immagine Sfondo
              </button>
            </div>
            <div className="property-group">
              <label>Allineamento:</label>
              <select
                value={selectedBlock.props.align || 'center'}
                onChange={(e) => handlePropertyChange('align', e.target.value)}
              >
                <option value="left">Sinistra</option>
                <option value="center">Centro</option>
                <option value="right">Destra</option>
              </select>
            </div>
          </>
        )
      
      case BLOCK_TYPES.TEXT:
        return (
          <>
            <div className="property-group">
              <label>Titolo:</label>
              <input
                type="text"
                value={selectedBlock.props.title || ''}
                onChange={(e) => handlePropertyChange('title', e.target.value)}
              />
            </div>
            <div className="property-group">
              <label>Testo:</label>
              <textarea
                value={selectedBlock.props.content || ''}
                onChange={(e) => handlePropertyChange('content', e.target.value)}
                rows={4}
              />
            </div>
            <div className="property-group">
              <label>Allineamento:</label>
              <select
                value={selectedBlock.props.align || 'left'}
                onChange={(e) => handlePropertyChange('align', e.target.value)}
              >
                <option value="left">Sinistra</option>
                <option value="center">Centro</option>
                <option value="right">Destra</option>
              </select>
            </div>
          </>
        )

      case BLOCK_TYPES.IMAGE:
        return (
          <>
            <div className="property-group">
              <label>URL Immagine:</label>
              <input
                type="text"
                value={selectedBlock.props.src || ''}
                onChange={(e) => handlePropertyChange('src', e.target.value)}
                placeholder="https://esempio.com/immagine.jpg"
              />
            </div>
            <div className="property-group">
              <button 
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'image/*'
                  input.onchange = (e) => {
                    const file = e.target.files[0]
                    if (file) {
                      const url = URL.createObjectURL(file)
                      handlePropertyChange('src', url)
                    }
                  }
                  input.click()
                }}
                style={{ 
                  background: '#8B4513', 
                  color: 'white', 
                  border: 'none', 
                  padding: '8px 16px', 
                  borderRadius: '4px',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Carica Immagine dal PC
              </button>
            </div>
            <div className="property-group">
              <label>Testo alternativo:</label>
              <input
                type="text"
                value={selectedBlock.props.alt || ''}
                onChange={(e) => handlePropertyChange('alt', e.target.value)}
                placeholder="Descrizione immagine"
              />
            </div>
            <div className="property-group">
              <label>Larghezza:</label>
              <input
                type="text"
                value={selectedBlock.props.width || '100%'}
                onChange={(e) => handlePropertyChange('width', e.target.value)}
                placeholder="100% o 300px"
              />
            </div>
            <div className="property-group">
              <label>Altezza:</label>
              <input
                type="text"
                value={selectedBlock.props.height || 'auto'}
                onChange={(e) => handlePropertyChange('height', e.target.value)}
                placeholder="auto o 200px"
              />
            </div>
            <div className="property-group">
              <label>Bordo arrotondato:</label>
              <input
                type="text"
                value={selectedBlock.props.borderRadius || '0px'}
                onChange={(e) => handlePropertyChange('borderRadius', e.target.value)}
                placeholder="0px o 10px"
              />
            </div>
            <div className="property-group">
              <label>Allineamento:</label>
              <select
                value={selectedBlock.props.align || 'center'}
                onChange={(e) => handlePropertyChange('align', e.target.value)}
              >
                <option value="left">Sinistra</option>
                <option value="center">Centro</option>
                <option value="right">Destra</option>
              </select>
            </div>
          </>
        )
      
      case BLOCK_TYPES.BUTTON:
        return (
          <>
            <div className="property-group">
              <label>Testo bottone:</label>
              <input
                type="text"
                value={selectedBlock.props.text || ''}
                onChange={(e) => handlePropertyChange('text', e.target.value)}
              />
            </div>
            <div className="property-group">
              <label>Colore sfondo:</label>
              <input
                type="color"
                value={selectedBlock.props.background || '#8B4513'}
                onChange={(e) => handlePropertyChange('background', e.target.value)}
              />
            </div>
            <div className="property-group">
              <label>Colore testo:</label>
              <input
                type="color"
                value={selectedBlock.props.color || '#ffffff'}
                onChange={(e) => handlePropertyChange('color', e.target.value)}
              />
            </div>
          </>
        )

      case BLOCK_TYPES.COLUMNS:
        return (
          <>
            <div className="property-group">
              <label>Contenuto Colonna Sinistra:</label>
              <textarea
                value={selectedBlock.props.leftContent || ''}
                onChange={(e) => handlePropertyChange('leftContent', e.target.value)}
                rows={3}
              />
            </div>
            <div className="property-group">
              <label>Contenuto Colonna Destra:</label>
              <textarea
                value={selectedBlock.props.rightContent || ''}
                onChange={(e) => handlePropertyChange('rightContent', e.target.value)}
                rows={3}
              />
            </div>
          </>
        )

      case BLOCK_TYPES.QUOTE:
        return (
          <>
            <div className="property-group">
              <label>Citazione:</label>
              <textarea
                value={selectedBlock.props.quote || ''}
                onChange={(e) => handlePropertyChange('quote', e.target.value)}
                rows={3}
              />
            </div>
            <div className="property-group">
              <label>Autore:</label>
              <input
                type="text"
                value={selectedBlock.props.author || ''}
                onChange={(e) => handlePropertyChange('author', e.target.value)}
              />
            </div>
          </>
        )

      case BLOCK_TYPES.LIST:
        return (
          <>
            <div className="property-group">
              <label>Titolo Lista:</label>
              <input
                type="text"
                value={selectedBlock.props.title || ''}
                onChange={(e) => handlePropertyChange('title', e.target.value)}
              />
            </div>
            <div className="property-group">
              <label>Elementi (uno per riga):</label>
              <textarea
                value={(selectedBlock.props.items || []).join('\n')}
                onChange={(e) => handlePropertyChange('items', e.target.value.split('\n').filter(item => item.trim()))}
                rows={4}
                placeholder="Elemento 1&#10;Elemento 2&#10;Elemento 3"
              />
            </div>
          </>
        )

      case BLOCK_TYPES.SOCIAL:
        return (
          <>
            <div className="property-group">
              <label>Testo Social:</label>
              <input
                type="text"
                value={selectedBlock.props.socialText || 'Seguici sui social'}
                onChange={(e) => handlePropertyChange('socialText', e.target.value)}
              />
            </div>
            <div className="property-group">
              <label>Link Facebook:</label>
              <input
                type="text"
                value={selectedBlock.props.facebookUrl || '#'}
                onChange={(e) => handlePropertyChange('facebookUrl', e.target.value)}
              />
            </div>
            <div className="property-group">
              <label>Link Instagram:</label>
              <input
                type="text"
                value={selectedBlock.props.instagramUrl || '#'}
                onChange={(e) => handlePropertyChange('instagramUrl', e.target.value)}
              />
            </div>
          </>
        )

      case BLOCK_TYPES.FOOTER:
        return (
          <>
            <div className="property-group">
              <label>Nome Azienda:</label>
              <input
                type="text"
                value={selectedBlock.props.companyName || 'Sapori & Colori'}
                onChange={(e) => handlePropertyChange('companyName', e.target.value)}
              />
            </div>
            <div className="property-group">
              <label>Indirizzo:</label>
              <input
                type="text"
                value={selectedBlock.props.address || 'Via Example 123, 00100 Roma'}
                onChange={(e) => handlePropertyChange('address', e.target.value)}
              />
            </div>
            <div className="property-group">
              <label>Testo Disiscrizione:</label>
              <input
                type="text"
                value={selectedBlock.props.unsubscribe || 'Clicca qui per disiscriverti'}
                onChange={(e) => handlePropertyChange('unsubscribe', e.target.value)}
              />
            </div>
          </>
        )

      case BLOCK_TYPES.SPACER:
        return (
          <>
            <div className="property-group">
              <label>Altezza Spazio:</label>
              <input
                type="text"
                value={selectedBlock.props.height || '40px'}
                onChange={(e) => handlePropertyChange('height', e.target.value)}
                placeholder="40px"
              />
            </div>
          </>
        )

      case BLOCK_TYPES.DIVIDER:
        return (
          <>
            <div className="property-group">
              <label>Colore Divisore:</label>
              <input
                type="color"
                value={selectedBlock.props.color || '#dddddd'}
                onChange={(e) => handlePropertyChange('color', e.target.value)}
              />
            </div>
            <div className="property-group">
              <label>Spessore:</label>
              <input
                type="number"
                value={selectedBlock.props.thickness || 1}
                onChange={(e) => handlePropertyChange('thickness', parseInt(e.target.value))}
                min="1"
                max="10"
              />
            </div>
          </>
        )
      
      default:
        return <p>Nessuna proprietà disponibile per questo blocco</p>
    }
  }

  return (
    <div className="properties-panel">
      <h3>Proprietà - {selectedBlock.type}</h3>
      {renderProperties()}
    </div>
  )
}

// Componente principale Email Builder
const EmailDragBuilder = ({ 
  onSave, 
  initialBlocks = [], 
  onSendEmail,
  emailSubject,
  setEmailSubject,
  emailRecipients,
  setEmailRecipients,
  allCustomers = [],
  showNotification 
}) => {
  const [blocks, setBlocks] = useState(initialBlocks)
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(null)
  const [draggedBlockType, setDraggedBlockType] = useState(null)
  const [showEmailConfig, setShowEmailConfig] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewDevice, setPreviewDevice] = useState('desktop')
  const canvasRef = useRef(null)

  const handleDragStart = useCallback((e, blockType) => {
    setDraggedBlockType(blockType)
    e.dataTransfer.effectAllowed = 'copy'
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    
    if (!draggedBlockType) return

    const newBlock = {
      id: Date.now(),
      type: draggedBlockType,
      props: {}
    }

    setBlocks(prev => [...prev, newBlock])
    setDraggedBlockType(null)
  }, [draggedBlockType])

  const handleBlockSelect = useCallback((index) => {
    setSelectedBlockIndex(index)
  }, [])

  const handleBlockUpdate = useCallback((updatedBlock) => {
    if (selectedBlockIndex === null) return
    
    setBlocks(prev => prev.map((block, index) => 
      index === selectedBlockIndex ? updatedBlock : block
    ))
  }, [selectedBlockIndex])

  const handleBlockDelete = useCallback((index) => {
    setBlocks(prev => prev.filter((_, i) => i !== index))
    setSelectedBlockIndex(null)
  }, [])

  const generateHTML = useCallback(() => {
    // Genera HTML email dal design
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto;">
    ${blocks.map(block => {
      switch (block.type) {
        case BLOCK_TYPES.HEADER:
          const headerStyle = {
            background: block.props.backgroundImage 
              ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${block.props.backgroundImage})` 
              : block.props.background || '#8B4513',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            color: block.props.color || 'white',
            padding: block.props.height ? `${parseInt(block.props.height)/2}px 20px` : '40px 20px',
            textAlign: block.props.align || 'center',
            minHeight: block.props.height || '80px',
            fontFamily: block.props.fontFamily || 'Arial, sans-serif'
          }
          return `<div style="${Object.entries(headerStyle).map(([k,v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v}`).join('; ')}">
            <h1 style="margin: 0 0 10px 0; font-size: ${block.props.titleSize || '28px'};">${block.props.title || 'Header'}</h1>
            ${block.props.subtitle ? `<p style="margin: 0; font-size: ${block.props.subtitleSize || '16px'}; opacity: 0.9;">${block.props.subtitle}</p>` : ''}
          </div>`
          
        case BLOCK_TYPES.TEXT:
          return `<div style="padding: 20px; text-align: ${block.props.align || 'left'}; color: ${block.props.color || '#333'}; font-family: ${block.props.fontFamily || 'Arial, sans-serif'};">
            ${block.props.title ? `<h3 style="margin: 0 0 15px 0; font-size: ${block.props.titleSize || '20px'};">${block.props.title}</h3>` : ''}
            <p style="margin: 0; font-size: ${block.props.fontSize || '14px'}; line-height: 1.6;">${block.props.content || 'Testo esempio'}</p>
          </div>`
          
        case BLOCK_TYPES.IMAGE:
          return `<div style="padding: 20px; text-align: ${block.props.align || 'center'};">
            ${block.props.src ? `<img src="${block.props.src}" alt="${block.props.alt || 'Immagine'}" style="width: ${block.props.width || '100%'}; height: ${block.props.height || 'auto'}; border-radius: ${block.props.borderRadius || '0px'}; max-width: 100%;" />` : '<div style="background: #f0f0f0; padding: 40px; border-radius: 8px; color: #666;">Carica un\'immagine</div>'}
          </div>`
          
        case BLOCK_TYPES.BUTTON:
          return `<div style="padding: 20px; text-align: ${block.props.align || 'center'};">
            <a href="${block.props.url || '#'}" style="display: inline-block; background: ${block.props.background || '#8B4513'}; color: ${block.props.color || 'white'}; padding: ${block.props.padding || '15px 30px'}; border-radius: ${block.props.borderRadius || '8px'}; text-decoration: none; font-weight: 600; font-size: ${block.props.fontSize || '16px'}; font-family: ${block.props.fontFamily || 'Arial, sans-serif'};">${block.props.text || 'Bottone'}</a>
          </div>`
          
        case BLOCK_TYPES.SPACER:
          return `<div style="height: ${block.props.height || '40px'};"></div>`
          
        case BLOCK_TYPES.DIVIDER:
          return `<div style="padding: 20px;">
            <hr style="border: none; border-top: ${block.props.thickness || '2px'} ${block.props.style || 'solid'} ${block.props.color || '#ddd'}; margin: 0;" />
          </div>`
          
        default:
          return `<div style="padding: 20px; background: #f9f9f9; text-align: center; color: #666;">Blocco ${block.type}</div>`
      }
    }).join('\n')}
  </div>
</body>
</html>`
    
    return html
  }, [blocks])

  const handleSendEmail = async () => {
    if (!emailSubject?.trim()) {
      showNotification?.('Inserisci l\'oggetto dell\'email', 'error')
      return
    }
    
    if (blocks.length === 0) {
      showNotification?.('Aggiungi almeno un blocco all\'email', 'error')
      return
    }

    const htmlContent = generateHTML()
    
    try {
      await onSendEmail?.({
        subject: emailSubject,
        content: htmlContent,
        template: 'custom',
        segments: []
      })
      
      setShowEmailConfig(false)
      showNotification?.('Email inviata con successo!', 'success')
    } catch (error) {
      showNotification?.('Errore invio email: ' + error.message, 'error')
    }
  }

  const selectedBlock = selectedBlockIndex !== null ? blocks[selectedBlockIndex] : null

  return (
    <div className="email-drag-builder">
      {/* Header */}
      <div className="builder-header">
        <h1>Email Builder Pro</h1>
        <div className="builder-actions">
          <button className="btn-preview" onClick={() => setShowPreview(true)}>Anteprima</button>
          <button 
            className="btn-config" 
            onClick={() => setShowEmailConfig(!showEmailConfig)}
          >
            Configura & Invia
          </button>
          <button className="btn-save" onClick={() => onSave?.(generateHTML())}>
            Salva Design
          </button>
        </div>
      </div>

      {/* Pannello configurazione email */}
      {showEmailConfig && (
        <div className="email-config-panel">
          <div className="config-section">
            <h3>Configurazione Email</h3>
            <div className="config-row">
              <label>Oggetto Email:</label>
              <input
                type="text"
                value={emailSubject || ''}
                onChange={(e) => setEmailSubject?.(e.target.value)}
                placeholder="Inserisci l'oggetto dell'email"
                style={{ 
                  flex: 1, 
                  padding: '8px 12px', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  marginLeft: '10px'
                }}
              />
            </div>
            <div className="config-row">
              <label>Destinatari:</label>
              <select
                value={emailRecipients || 'all'}
                onChange={(e) => setEmailRecipients?.(e.target.value)}
                style={{ 
                  flex: 1, 
                  padding: '8px 12px', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  marginLeft: '10px'
                }}
              >
                <option value="all">Tutti i clienti ({allCustomers.length})</option>
                <option value="active">Solo clienti attivi</option>
                <option value="vip">Solo clienti VIP</option>
              </select>
            </div>
            <div className="config-actions">
              <button className="btn-send" onClick={handleSendEmail}>
                Invia Email
              </button>
              <button className="btn-cancel" onClick={() => setShowEmailConfig(false)}>
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="builder-layout">
        {/* Sidebar blocchi */}
        <div className="blocks-sidebar">
          <h3>Elementi</h3>
          <div className="blocks-grid">
            <DraggableBlock
              type={BLOCK_TYPES.HEADER}
              icon="H"
              label="Header"
              onDragStart={handleDragStart}
            />
            <DraggableBlock
              type={BLOCK_TYPES.TEXT}
              icon="T"
              label="Testo"
              onDragStart={handleDragStart}
            />
            <DraggableBlock
              type={BLOCK_TYPES.IMAGE}
              icon="IMG"
              label="Immagine"
              onDragStart={handleDragStart}
            />
            <DraggableBlock
              type={BLOCK_TYPES.BUTTON}
              icon="BTN"
              label="Bottone"
              onDragStart={handleDragStart}
            />
            <DraggableBlock
              type={BLOCK_TYPES.SPACER}
              icon="SPC"
              label="Spazio"
              onDragStart={handleDragStart}
            />
            <DraggableBlock
              type={BLOCK_TYPES.DIVIDER}
              icon="HR"
              label="Divisore"
              onDragStart={handleDragStart}
            />
            <DraggableBlock
              type={BLOCK_TYPES.COLUMNS}
              icon="COL"
              label="Colonne"
              onDragStart={handleDragStart}
            />
            <DraggableBlock
              type={BLOCK_TYPES.QUOTE}
              icon="Q"
              label="Citazione"
              onDragStart={handleDragStart}
            />
            <DraggableBlock
              type={BLOCK_TYPES.LIST}
              icon="LIST"
              label="Lista"
              onDragStart={handleDragStart}
            />
            <DraggableBlock
              type={BLOCK_TYPES.SOCIAL}
              icon="SOC"
              label="Social"
              onDragStart={handleDragStart}
            />
            <DraggableBlock
              type={BLOCK_TYPES.FOOTER}
              icon="FTR"
              label="Footer"
              onDragStart={handleDragStart}
            />
          </div>
        </div>

        {/* Canvas centrale */}
        <div className="email-canvas">
          <div className="canvas-header">
            <h3>Canvas Editor</h3>
          </div>
          <div
            ref={canvasRef}
            className="canvas-dropzone"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {blocks.length === 0 ? (
              <div className="canvas-empty">
                <p>Trascina gli elementi qui per iniziare</p>
              </div>
            ) : (
              blocks.map((block, index) => (
                <EditableBlock
                  key={block.id}
                  block={block}
                  index={index}
                  isSelected={selectedBlockIndex === index}
                  onSelect={handleBlockSelect}
                  onUpdate={handleBlockUpdate}
                  onDelete={handleBlockDelete}
                />
              ))
            )}
          </div>
        </div>

        {/* Pannello proprietà */}
        <div className="properties-sidebar">
          <PropertiesPanel
            selectedBlock={selectedBlock}
            onUpdateBlock={handleBlockUpdate}
          />
        </div>
      </div>

      {/* Modal Anteprima */}
      {showPreview && (
        <div className="preview-modal-overlay">
          <div className="preview-modal">
            <div className="preview-header">
              <h3>Anteprima Email</h3>
              <div className="device-selector">
                <button 
                  className={`device-btn ${previewDevice === 'mobile' ? 'active' : ''}`}
                  onClick={() => setPreviewDevice('mobile')}
                >
                  📱 Mobile
                </button>
                <button 
                  className={`device-btn ${previewDevice === 'tablet' ? 'active' : ''}`}
                  onClick={() => setPreviewDevice('tablet')}
                >
                  📟 Tablet  
                </button>
                <button 
                  className={`device-btn ${previewDevice === 'desktop' ? 'active' : ''}`}
                  onClick={() => setPreviewDevice('desktop')}
                >
                  💻 Desktop
                </button>
              </div>
              <button 
                className="close-btn" 
                onClick={() => setShowPreview(false)}
              >
                ✕
              </button>
            </div>
            <div className="preview-body">
              <div className={`preview-frame ${previewDevice}`}>
                <iframe 
                  srcDoc={generateHTML()}
                  title="Email Preview"
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    border: 'none',
                    borderRadius: '8px'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmailDragBuilder