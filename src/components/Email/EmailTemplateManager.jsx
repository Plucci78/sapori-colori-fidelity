import React, { useState, useEffect } from 'react'
import './EmailTemplateManager.css'

const EmailTemplateManager = ({ 
  supabase, 
  onLoadTemplate, 
  onSaveCurrentDesign, 
  currentBlocks = [],
  showNotification 
}) => {
  const [savedTemplates, setSavedTemplates] = useState([])
  const [loading, setLoading] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')

  // Carica template salvati dal database
  useEffect(() => {
    loadSavedTemplates()
  }, [])

  const loadSavedTemplates = async () => {
    if (!supabase) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('email_custom_templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        // Se la tabella non esiste, usa template vuoti
        if (error.code === '42P01') {
          console.log('Tabella email_custom_templates non trovata, usando template vuoti')
          setSavedTemplates([])
          return
        }
        throw error
      }
      
      setSavedTemplates(data || [])
    } catch (error) {
      console.error('Errore caricamento template:', error)
      setSavedTemplates([])
      if (showNotification) {
        showNotification('Template personalizzati non disponibili (tabella non trovata)', 'warning')
      }
    } finally {
      setLoading(false)
    }
  }

  // Salva il design attuale come template
  const saveCurrentTemplate = async () => {
    if (!supabase || !templateName.trim()) return
    
    setLoading(true)
    try {
      // Genera anteprima HTML per preview
      const previewHtml = generatePreviewHtml(currentBlocks)
      
      const { data, error } = await supabase
        .from('email_custom_templates')
        .insert([{
          name: templateName.trim(),
          description: templateDescription.trim(),
          blocks: JSON.stringify(currentBlocks),
          preview_html: previewHtml,
          created_at: new Date().toISOString()
        }])
        .select()

      if (error) {
        if (error.code === '42P01') {
          showNotification('Tabella template non trovata. Contattare l\'amministratore.', 'error')
          return
        }
        throw error
      }
      
      // Aggiorna la lista locale
      setSavedTemplates(prev => [data[0], ...prev])
      
      // Reset form
      setTemplateName('')
      setTemplateDescription('')
      setShowSaveDialog(false)
      
      if (showNotification) {
        showNotification(`Template "${templateName}" salvato con successo!`, 'success')
      }
      
    } catch (error) {
      console.error('Errore salvataggio template:', error)
      if (showNotification) {
        showNotification('Errore salvataggio template: ' + error.message, 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  // Carica un template esistente
  const loadTemplate = (template) => {
    try {
      // Se template.blocks è già un array (template predefiniti), usalo direttamente
      // Se è una stringa (template salvati), parsificalo
      const blocks = Array.isArray(template.blocks) 
        ? template.blocks 
        : JSON.parse(template.blocks)
      
      onLoadTemplate?.(blocks)
      
      if (showNotification) {
        showNotification(`Template "${template.name}" caricato!`, 'success')
      }
    } catch (error) {
      console.error('Errore caricamento template:', error)
      if (showNotification) {
        showNotification('Errore caricamento template', 'error')
      }
    }
  }

  // Elimina un template
  const deleteTemplate = async (templateId, templateName) => {
    if (!confirm(`Sei sicuro di voler eliminare il template "${templateName}"?`)) return
    
    try {
      const { error } = await supabase
        .from('email_custom_templates')
        .delete()
        .eq('id', templateId)

      if (error) throw error
      
      // Rimuovi dalla lista locale
      setSavedTemplates(prev => prev.filter(t => t.id !== templateId))
      
      if (showNotification) {
        showNotification(`Template "${templateName}" eliminato`, 'success')
      }
      
    } catch (error) {
      console.error('Errore eliminazione template:', error)
      if (showNotification) {
        showNotification('Errore eliminazione template', 'error')
      }
    }
  }

  // Genera HTML anteprima semplificato
  const generatePreviewHtml = (blocks) => {
    return blocks.map(block => {
      switch (block.type) {
        case 'header':
          return `<div style="background:${block.props.background||'#8B4513'};color:${block.props.color||'white'};padding:20px;text-align:center;"><h1>${block.props.title||'Header'}</h1></div>`
        case 'text':
          return `<div style="padding:20px;"><h3>${block.props.title||''}</h3><p>${block.props.content||'Testo'}</p></div>`
        case 'button':
          return `<div style="padding:20px;text-align:center;"><button style="background:${block.props.background||'#8B4513'};color:${block.props.color||'white'};border:none;padding:15px 30px;border-radius:8px;">${block.props.text||'Button'}</button></div>`
        default:
          return `<div style="padding:10px;background:#f9f9f9;text-align:center;">${block.type}</div>`
      }
    }).join('')
  }

  // Template predefiniti
  const defaultTemplates = [
    {
      id: 'welcome',
      name: 'Benvenuto',
      description: 'Template di benvenuto per nuovi clienti',
      isDefault: true,
      blocks: [
        {
          id: Date.now() + 1,
          type: 'header',
          props: {
            title: 'Benvenuto {{nome}}!',
            subtitle: 'Ti diamo il benvenuto nella famiglia Sapori & Colori',
            background: '#8B4513',
            color: 'white'
          }
        },
        {
          id: Date.now() + 2,
          type: 'text',
          props: {
            title: 'Il tuo viaggio inizia ora',
            content: 'Caro {{nome}}, siamo entusiasti di averti con noi! Da oggi ogni tuo acquisto ti farà guadagnare preziose GEMME.',
            align: 'left'
          }
        },
        {
          id: Date.now() + 3,
          type: 'button',
          props: {
            text: 'Inizia Subito',
            background: '#8B4513',
            color: 'white',
            align: 'center'
          }
        }
      ]
    },
    {
      id: 'promo',
      name: 'Promozione',
      description: 'Template per offerte speciali',
      isDefault: true,
      blocks: [
        {
          id: Date.now() + 4,
          type: 'header',
          props: {
            title: 'Solo per te, {{nome}}!',
            subtitle: 'OFFERTA LIMITATA',
            background: '#D4AF37',
            color: 'white'
          }
        },
        {
          id: Date.now() + 5,
          type: 'text',
          props: {
            title: 'Sconto Esclusivo',
            content: 'Approfitta subito del nostro sconto speciale riservato solo per te!',
            align: 'center'
          }
        },
        {
          id: Date.now() + 6,
          type: 'button',
          props: {
            text: 'Approfitta Ora',
            background: '#D4AF37',
            color: 'white',
            align: 'center'
          }
        }
      ]
    }
  ]

  return (
    <div className="template-manager">
      <div className="template-manager-header">
        <h3>I Miei Template</h3>
        <button 
          className="btn-save-template"
          onClick={() => setShowSaveDialog(true)}
          disabled={currentBlocks.length === 0}
        >
          Salva Design Attuale
        </button>
      </div>

      {/* Dialog salvataggio template */}
      {showSaveDialog && (
        <div className="save-dialog-overlay">
          <div className="save-dialog">
            <h4>Salva Template</h4>
            <div className="form-group">
              <label>Nome Template:</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Es. Newsletter Natale 2024"
                maxLength={50}
              />
            </div>
            <div className="form-group">
              <label>Descrizione (opzionale):</label>
              <textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Breve descrizione del template..."
                rows={3}
                maxLength={200}
              />
            </div>
            <div className="dialog-actions">
              <button 
                className="btn-cancel"
                onClick={() => setShowSaveDialog(false)}
              >
                Annulla
              </button>
              <button 
                className="btn-confirm"
                onClick={saveCurrentTemplate}
                disabled={!templateName.trim() || loading}
              >
                {loading ? 'Salvando...' : 'Salva Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista template */}
      <div className="templates-grid">
        {/* Template predefiniti */}
        <div className="templates-section">
          <h4>Template Predefiniti</h4>
          <div className="templates-list">
            {defaultTemplates.map((template) => (
              <div key={template.id} className="template-card default">
                <div className="template-preview">
                  <div className="preview-icon">TPL</div>
                </div>
                <div className="template-info">
                  <h5>{template.name}</h5>
                  <p>{template.description}</p>
                  <button 
                    className="btn-load"
                    onClick={() => loadTemplate(template)}
                  >
                    Usa Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Template personalizzati */}
        <div className="templates-section">
          <h4>I Tuoi Template</h4>
          <div className="templates-list">
            {loading ? (
              <div className="loading">Caricamento template...</div>
            ) : savedTemplates.length === 0 ? (
              <div className="empty-state">
                <p>Nessun template personalizzato ancora.</p>
                <p>Crea il tuo primo design e salvalo come template!</p>
              </div>
            ) : (
              savedTemplates.map((template) => (
                <div key={template.id} className="template-card custom">
                  <div className="template-preview">
                    {template.preview_html ? (
                      <div 
                        className="html-preview"
                        dangerouslySetInnerHTML={{ 
                          __html: template.preview_html.substring(0, 200) + '...' 
                        }}
                      />
                    ) : (
                      <div className="preview-icon">MAIL</div>
                    )}
                  </div>
                  <div className="template-info">
                    <h5>{template.name}</h5>
                    {template.description && (
                      <p>{template.description}</p>
                    )}
                    <div className="template-meta">
                      <small>
                        Creato: {new Date(template.created_at).toLocaleDateString()}
                      </small>
                    </div>
                    <div className="template-actions">
                      <button 
                        className="btn-load"
                        onClick={() => loadTemplate(template)}
                      >
                        Carica
                      </button>
                      <button 
                        className="btn-delete"
                        onClick={() => deleteTemplate(template.id, template.name)}
                      >
                        Elimina
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmailTemplateManager