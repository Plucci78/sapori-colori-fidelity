import React, { useState, useRef, useCallback } from 'react'
import './EmailDragBuilder.css'

// Tipi di blocchi disponibili
const BLOCK_TYPES = {
  HEADER: 'header',
  TEXT: 'text',
  IMAGE: 'image',
  BUTTON: 'button',
  SPACER: 'spacer',
  DIVIDER: 'divider'
}

// Componente blocco trascinabile
const DraggableBlock = ({ type, icon, label, onDragStart }) => {
  return (
    <div
      className="draggable-block"
      draggable
      onDragStart={(e) => onDragStart(e, type)}
    >
      <div className="block-icon">{icon}</div>
      <span className="block-label">{label}</span>
    </div>
  )
}

// Componente blocco nell'editor
const EditableBlock = ({ block, index, onSelect, onUpdate, onDelete, isSelected }) => {
  const renderBlockContent = () => {
    switch (block.type) {
      case BLOCK_TYPES.HEADER:
        return (
          <div className="block-header" style={{ 
            background: block.props.background || '#8B4513',
            color: block.props.color || 'white',
            padding: '40px 20px',
            textAlign: block.props.align || 'center'
          }}>
            <h1 style={{ margin: 0, fontSize: '32px' }}>
              {block.props.title || 'Inserisci titolo'}
            </h1>
            {block.props.subtitle && (
              <p style={{ margin: '15px 0 0 0', fontSize: '18px', opacity: 0.9 }}>
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
                color: '#6c757d'
              }}>
                📷 Clicca per aggiungere immagine
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
          <button className="control-btn edit" title="Modifica">✏️</button>
          <button className="control-btn delete" onClick={() => onDelete(index)} title="Elimina">🗑️</button>
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
const EmailDragBuilder = ({ onSave, initialBlocks = [] }) => {
  const [blocks, setBlocks] = useState(initialBlocks)
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(null)
  const [draggedBlockType, setDraggedBlockType] = useState(null)
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
      // Converte ogni blocco in HTML
      // Implementation per ogni tipo di blocco
      return `<!-- Block: ${block.type} -->`
    }).join('\n')}
  </div>
</body>
</html>`
    
    return html
  }, [blocks])

  const selectedBlock = selectedBlockIndex !== null ? blocks[selectedBlockIndex] : null

  return (
    <div className="email-drag-builder">
      {/* Header */}
      <div className="builder-header">
        <h1>📧 Email Builder Pro</h1>
        <div className="builder-actions">
          <button className="btn-preview">👁️ Preview</button>
          <button className="btn-save" onClick={() => onSave?.(generateHTML())}>
            💾 Salva
          </button>
        </div>
      </div>

      <div className="builder-layout">
        {/* Sidebar blocchi */}
        <div className="blocks-sidebar">
          <h3>📦 Blocchi</h3>
          <div className="blocks-grid">
            <DraggableBlock
              type={BLOCK_TYPES.HEADER}
              icon="📰"
              label="Header"
              onDragStart={handleDragStart}
            />
            <DraggableBlock
              type={BLOCK_TYPES.TEXT}
              icon="📝"
              label="Testo"
              onDragStart={handleDragStart}
            />
            <DraggableBlock
              type={BLOCK_TYPES.IMAGE}
              icon="🖼️"
              label="Immagine"
              onDragStart={handleDragStart}
            />
            <DraggableBlock
              type={BLOCK_TYPES.BUTTON}
              icon="🔘"
              label="Bottone"
              onDragStart={handleDragStart}
            />
            <DraggableBlock
              type={BLOCK_TYPES.SPACER}
              icon="📏"
              label="Spazio"
              onDragStart={handleDragStart}
            />
            <DraggableBlock
              type={BLOCK_TYPES.DIVIDER}
              icon="➖"
              label="Divisore"
              onDragStart={handleDragStart}
            />
          </div>
        </div>

        {/* Canvas centrale */}
        <div className="email-canvas">
          <div className="canvas-header">
            <h3>📱 Canvas (600px)</h3>
          </div>
          <div
            ref={canvasRef}
            className="canvas-dropzone"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {blocks.length === 0 ? (
              <div className="canvas-empty">
                <p>🎨 Trascina i blocchi qui per iniziare</p>
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
    </div>
  )
}

export default EmailDragBuilder