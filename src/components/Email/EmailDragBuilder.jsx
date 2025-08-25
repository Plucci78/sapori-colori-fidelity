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
        <h1>Email Builder Pro</h1>
        <div className="builder-actions">
          <button className="btn-preview">Anteprima</button>
          <button className="btn-save" onClick={() => onSave?.(generateHTML())}>
            Salva Design
          </button>
        </div>
      </div>

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
    </div>
  )
}

export default EmailDragBuilder