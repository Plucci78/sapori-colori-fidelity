import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabase'
import { validateSVG, sanitizeSVG, PREDEFINED_ICONS, generateLevelGradient } from '../../utils/levelsUtils'

const LevelsConfig = ({ showNotification }) => {
  const [levels, setLevels] = useState([])
  const [editingLevel, setEditingLevel] = useState(null)
  const [showIconLibrary, setShowIconLibrary] = useState(false)
  const [svgInput, setSvgInput] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadLevels()
  }, [])

  const loadLevels = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('customer_levels')
        .select('*')
        .eq('active', true)
        .order('sort_order')

      if (data) {
        setLevels(data)
      }
    } catch (error) {
      console.error('Errore caricamento livelli:', error)
      showNotification('Errore nel caricamento dei livelli', 'error')
    }
  }, [showNotification])

  const handleSaveLevel = useCallback(async (levelData) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('customer_levels')
        .update({
          name: levelData.name,
          min_gems: parseInt(levelData.min_gems),
          max_gems: levelData.max_gems ? parseInt(levelData.max_gems) : null,
          primary_color: levelData.primary_color,
          background_gradient: levelData.background_gradient,
          icon_svg: levelData.icon_svg
        })
        .eq('id', levelData.id)

      if (!error) {
        await loadLevels()
        setEditingLevel(null)
        showNotification('Livello aggiornato con successo!', 'success')
      }
    } catch (error) {
      console.error('Errore salvataggio livello:', error)
      showNotification('Errore nel salvataggio del livello', 'error')
    } finally {
      setLoading(false)
    }
  }, [loadLevels, showNotification])

  const handleIconUpload = useCallback(async (event, levelId) => {
    const file = event.target.files[0]
    if (!file || !file.name.endsWith('.svg')) {
      showNotification('Seleziona un file SVG valido', 'error')
      return
    }

    try {
      const svgContent = await file.text()
      if (validateSVG(svgContent)) {
        const sanitizedSVG = sanitizeSVG(svgContent)
        updateLevelIcon(levelId, sanitizedSVG)
      } else {
        showNotification('File SVG non sicuro o non valido', 'error')
      }
    } catch (error) {
      showNotification('Errore nella lettura del file', 'error')
    }
  }, [showNotification])

  const handleSVGPaste = useCallback((levelId) => {
    if (validateSVG(svgInput)) {
      const sanitizedSVG = sanitizeSVG(svgInput)
      updateLevelIcon(levelId, sanitizedSVG)
      setSvgInput('')
    } else {
      showNotification('Codice SVG non valido o non sicuro', 'error')
    }
  }, [svgInput, showNotification])

  const updateLevelIcon = useCallback((levelId, iconSvg) => {
    setLevels(prev => prev.map(level => 
      level.id === levelId 
        ? { ...level, icon_svg: iconSvg }
        : level
    ))
  }, [])

  const generateCustomGradient = useCallback((color) => {
    return generateLevelGradient(color, 1)
  }, [])

  const LevelEditor = ({ level }) => {
    const [localLevel, setLocalLevel] = useState(level)

    const updateLocalLevel = (field, value) => {
      setLocalLevel(prev => ({ ...prev, [field]: value }))
    }

    const updateGradient = () => {
      const newGradient = generateCustomGradient(localLevel.primary_color)
      updateLocalLevel('background_gradient', newGradient)
    }

    return (
      <div className="level-editor">
        <div className="level-header">
          <h4>Modifica Livello: {level.name}</h4>
          <button 
            onClick={() => setEditingLevel(null)}
            className="close-editor-btn"
          >
            ✕
          </button>
        </div>

        <div className="level-editor-content">
          {/* PREVIEW LIVELLO */}
          <div className="level-preview" style={{ background: localLevel.background_gradient }}>
            <div className="level-icon" style={{ color: localLevel.primary_color }}>
              <div dangerouslySetInnerHTML={{ __html: localLevel.icon_svg }} />
            </div>
            <span className="level-name">{localLevel.name}</span>
          </div>

          {/* CONFIGURAZIONE BASE */}
          <div className="editor-section">
            <h5>📝 Informazioni Base</h5>
            <div className="form-grid">
              <div className="form-field">
                <label>Nome Livello:</label>
                <input
                  type="text"
                  value={localLevel.name}
                  onChange={(e) => updateLocalLevel('name', e.target.value)}
                  className="level-input"
                />
              </div>
              <div className="form-field">
                <label>GEMME Minime:</label>
                <input
                  type="number"
                  value={localLevel.min_gems}
                  onChange={(e) => updateLocalLevel('min_gems', e.target.value)}
                  className="level-input"
                />
              </div>
              <div className="form-field">
                <label>GEMME Massime:</label>
                <input
                  type="number"
                  value={localLevel.max_gems || ''}
                  onChange={(e) => updateLocalLevel('max_gems', e.target.value)}
                  placeholder="Illimitato"
                  className="level-input"
                />
              </div>
            </div>
          </div>

          {/* CONFIGURAZIONE COLORI */}
          <div className="editor-section">
            <h5>🎨 Colori e Sfumature</h5>
            <div className="form-grid">
              <div className="form-field">
                <label>Colore Primario:</label>
                <div className="color-input-container">
                  <input
                    type="color"
                    value={localLevel.primary_color}
                    onChange={(e) => updateLocalLevel('primary_color', e.target.value)}
                    className="color-picker"
                  />
                  <input
                    type="text"
                    value={localLevel.primary_color}
                    onChange={(e) => updateLocalLevel('primary_color', e.target.value)}
                    className="color-text"
                  />
                  <button onClick={updateGradient} className="generate-gradient-btn">
                    🔄 Genera Sfumatura
                  </button>
                </div>
              </div>
              <div className="form-field">
                <label>Sfumatura Background:</label>
                <textarea
                  value={localLevel.background_gradient}
                  onChange={(e) => updateLocalLevel('background_gradient', e.target.value)}
                  className="gradient-input"
                  rows="2"
                />
              </div>
            </div>
          </div>

          {/* CONFIGURAZIONE ICONA */}
          <div className="editor-section">
            <h5>🎯 Icona Livello</h5>
            
            {/* Upload SVG */}
            <div className="icon-upload-section">
              <label className="upload-btn">
                📁 Carica File SVG
                <input
                  type="file"
                  accept=".svg"
                  onChange={(e) => handleIconUpload(e, level.id)}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {/* Paste SVG */}
            <div className="icon-paste-section">
              <textarea
                value={svgInput}
                onChange={(e) => setSvgInput(e.target.value)}
                placeholder="Incolla qui il codice SVG..."
                className="svg-input"
                rows="3"
              />
              <button 
                onClick={() => handleSVGPaste(level.id)}
                className="paste-svg-btn"
                disabled={!svgInput.trim()}
              >
                📋 Applica SVG
              </button>
            </div>

            {/* Libreria Icone */}
            <div className="icon-library-section">
              <button 
                onClick={() => setShowIconLibrary(!showIconLibrary)}
                className="library-toggle-btn"
              >
                📚 {showIconLibrary ? 'Nascondi' : 'Mostra'} Libreria Icone
              </button>
              
              {showIconLibrary && (
                <div className="icon-library">
                  {Object.entries(PREDEFINED_ICONS).map(([key, svg]) => (
                    <button
                      key={key}
                      onClick={() => updateLevelIcon(level.id, svg)}
                      className="icon-library-item"
                      title={key}
                    >
                      <div dangerouslySetInnerHTML={{ __html: svg }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* PULSANTI AZIONE */}
          <div className="editor-actions">
            <button 
              onClick={() => handleSaveLevel(localLevel)}
              className="save-level-btn"
              disabled={loading}
            >
              {loading ? '💾 Salvando...' : '💾 Salva Modifiche'}
            </button>
            <button 
              onClick={() => setEditingLevel(null)}
              className="cancel-level-btn"
            >
              ❌ Annulla
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="levels-config">
      <div className="levels-config-header">
        <h3>🏆 Configurazione Livelli Clienti</h3>
        <p>Personalizza i livelli, i colori e le icone per il sistema di fidelizzazione</p>
      </div>

      {editingLevel ? (
        <LevelEditor level={editingLevel} />
      ) : (
        <div className="levels-grid">
          {levels.map(level => (
            <div key={level.id} className="level-card">
              <div 
                className="level-card-header"
                style={{ background: level.background_gradient }}
              >
                <div className="level-icon" style={{ color: level.primary_color }}>
                  <div dangerouslySetInnerHTML={{ __html: level.icon_svg }} />
                </div>
                <div className="level-info">
                  <h4>{level.name}</h4>
                  <p>
                    {level.min_gems} - {level.max_gems || '∞'} GEMME
                  </p>
                </div>
              </div>
              <div className="level-card-actions">
                <button 
                  onClick={() => setEditingLevel(level)}
                  className="edit-level-btn"
                >
                  ✏️ Modifica
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default LevelsConfig