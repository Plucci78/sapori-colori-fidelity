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
      console.log('🔍 EmailTemplateManager - Caricamento template...')
      
      // Prima prova con la tabella unificata email_templates
      const { data: unifiedData, error: unifiedError } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false })

      console.log('📊 Dati dal database:', { unifiedData, unifiedError })
      
      if (!unifiedError && unifiedData) {
        console.log('📊 Template trovati nel DB:', unifiedData.length)
        
        // FORZA sempre la creazione per debug - rimuovi dopo test
        if (unifiedData.length === 0) {
          console.log('📝 DB vuoto, creazione template di esempio...')
          await createSampleTemplates()
          // Ricarica dopo aver creato i template
          const { data: newData } = await supabase
            .from('email_templates')
            .select('*')
            .order('created_at', { ascending: false })
          
          if (newData && newData.length > 0) {
            console.log('✅ Template creati e ricaricati:', newData.length)
            const convertedTemplates = newData.map(template => ({
              ...template,
              blocks: template.unlayer_design?.blocks ? 
                JSON.stringify(template.unlayer_design.blocks) :
                JSON.stringify([{
                  id: Date.now(),
                  type: 'html',
                  props: { content: template.html_preview || 'Template Unlayer' }
                }]),
              preview_html: template.html_preview || `<div>Template: ${template.name}</div>`
            }))
            setSavedTemplates(convertedTemplates)
            return
          } else {
            console.log('❌ Nessun template dopo la creazione!')
          }
        }

        // Converti i template esistenti in formato compatibile
        console.log('🔄 Conversione template existenti:', unifiedData.length)
        
        const convertedTemplates = unifiedData.map(template => {
          console.log('🔧 Conversione template:', template.name, template)
          return {
            ...template,
            blocks: template.unlayer_design?.blocks ? 
              JSON.stringify(template.unlayer_design.blocks) :
              JSON.stringify([{
                id: Date.now(),
                type: 'html',
                props: { content: template.html_preview || 'Template Unlayer' }
              }]),
            preview_html: template.html_preview || `<div>Template: ${template.name}</div>`
          }
        })
        
        console.log('✅ Template convertiti:', convertedTemplates)
        setSavedTemplates(convertedTemplates)
        return
      }

      // Fallback alla tabella legacy
      const { data, error } = await supabase
        .from('email_custom_templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        // Se nessuna tabella esiste, usa template vuoti
        if (error.code === '42P01') {
          console.log('Nessuna tabella template trovata, usando template vuoti')
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
        showNotification('Template non disponibili', 'warning')
      }
    } finally {
      setLoading(false)
    }
  }

  // Crea template di esempio se non esistono
  const createSampleTemplates = async () => {
    try {
      console.log('📝 Creazione template di esempio...')
      
      const sampleTemplates = [
        {
          name: 'Benvenuto Nuovo Cliente',
          description: 'Template di benvenuto per nuovi clienti registrati',
          category: 'welcome',
          unlayer_design: {
            "counters": {"u_column": 1, "u_row": 1, "u_content_text": 1, "u_content_heading": 1, "u_content_button": 1},
            "body": {
              "id": "body",
              "rows": [{
                "id": "row-1",
                "cells": [{
                  "id": "column-1",
                  "contents": [
                    {
                      "id": "heading-1",
                      "type": "heading", 
                      "values": {
                        "containerPadding": "10px",
                        "headingType": "h1",
                        "fontSize": "32px",
                        "fontWeight": 700,
                        "textAlign": "center",
                        "text": "<p><span style=\"color: #8b4513;\">Benvenuto {{nome}}!</span></p>"
                      }
                    },
                    {
                      "id": "text-1", 
                      "type": "text",
                      "values": {
                        "containerPadding": "10px",
                        "fontSize": "14px",
                        "textAlign": "center", 
                        "text": "<p>Ti diamo il benvenuto nella famiglia Sapori & Colori. Da oggi ogni tuo acquisto ti farà guadagnare preziose GEMME!</p>"
                      }
                    },
                    {
                      "id": "button-1",
                      "type": "button",
                      "values": {
                        "containerPadding": "10px",
                        "fontSize": "14px", 
                        "textAlign": "center",
                        "padding": "15px 25px",
                        "buttonColors": {"color": "#FFFFFF", "backgroundColor": "#8B4513"},
                        "borderRadius": "8px",
                        "text": "Inizia Subito",
                        "href": "#"
                      }
                    }
                  ]
                }]
              }]
            }
          },
          html_preview: '<div style="text-align:center;padding:20px;"><h1 style="color:#8B4513;">Benvenuto {{nome}}!</h1><p>Ti diamo il benvenuto nella famiglia Sapori & Colori. Da oggi ogni tuo acquisto ti farà guadagnare preziose GEMME!</p><a href="#" style="display:inline-block;padding:15px 25px;background:#8B4513;color:white;text-decoration:none;border-radius:8px;">Inizia Subito</a></div>'
        },
        {
          name: 'Newsletter Mensile', 
          description: 'Template per newsletter con novità e promozioni',
          category: 'newsletter',
          unlayer_design: {"type": "newsletter", "version": 1},
          html_preview: '<div style="padding:20px;"><h2 style="color:#8B4513;text-align:center;">Newsletter Sapori & Colori</h2><p><strong>Ciao {{nome}},</strong></p><p>Ecco le novità di questo mese dal nostro ristorante:</p><ul><li>Nuovi piatti della tradizione siciliana</li><li>Menu degustazione primaverile</li><li>Eventi speciali del weekend</li></ul></div>'
        },
        {
          name: 'Promozione Speciale',
          description: 'Template per offerte e promozioni limitate', 
          category: 'promotions',
          unlayer_design: {"type": "promotion", "version": 1},
          html_preview: '<div style="text-align:center;padding:20px;background:linear-gradient(135deg,#f8f9fa,#e9ecef);"><h1 style="color:#D4AF37;margin:0;">OFFERTA SPECIALE!</h1><h3 style="color:#333;margin:10px 0;">Solo per te, {{nome}}</h3><p style="font-size:16px;"><strong>Sconto del 20%</strong> su tutti i piatti del menu. Offerta valida fino al {{data_scadenza}}.</p><a href="#" style="display:inline-block;padding:20px 40px;background:#D4AF37;color:white;text-decoration:none;border-radius:12px;font-weight:700;">Prenota Ora</a></div>'
        }
      ]

      const { data, error } = await supabase
        .from('email_templates')
        .insert(sampleTemplates)
        .select()

      if (error) {
        console.error('Errore creazione template di esempio:', error)
      } else {
        console.log('✅ Template di esempio creati:', data.length)
      }
      
    } catch (error) {
      console.error('Errore creazione template di esempio:', error)
    }
  }

  // Salva il design attuale come template
  const saveCurrentTemplate = async () => {
    if (!supabase || !templateName.trim()) return
    
    setLoading(true)
    try {
      // Genera anteprima HTML per preview
      const previewHtml = generatePreviewHtml(currentBlocks)
      
      // Salva nella tabella unificata email_templates
      // Metti i blocks nel campo unlayer_design per mantenerli
      const { data, error } = await supabase
        .from('email_templates')
        .insert([{
          name: templateName.trim(),
          description: templateDescription.trim(),
          category: 'drag_drop',
          unlayer_design: { blocks: currentBlocks }, // Salva i blocks qui
          html_preview: previewHtml
        }])
        .select()

      if (error) {
        if (error.code === '42P01') {
          showNotification('Tabella template non trovata. Contattare l\'amministratore.', 'error')
          return
        }
        throw error
      }
      
      // Converti per compatibilità locale
      const convertedTemplate = {
        ...data[0],
        blocks: JSON.stringify(currentBlocks),
        preview_html: previewHtml
      }
      
      // Aggiorna la lista locale
      setSavedTemplates(prev => [convertedTemplate, ...prev])
      
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

  // Carica un template nel drag-and-drop builder
  const loadTemplate = (template) => {
    try {
      // Se template.blocks è già un array (template predefiniti), usalo direttamente
      // Se è una stringa (template salvati), parsificalo
      const blocks = Array.isArray(template.blocks) 
        ? template.blocks 
        : JSON.parse(template.blocks)
      
      onLoadTemplate?.(blocks)
      
      if (showNotification) {
        showNotification(`Template "${template.name}" caricato nel Drag & Drop Builder!`, 'success')
      }
    } catch (error) {
      console.error('Errore caricamento template:', error)
      if (showNotification) {
        showNotification('Errore caricamento template', 'error')
      }
    }
  }

  // Carica un template nell'editor Unlayer
  const loadTemplateInUnlayer = (template) => {
    try {
      if (template.unlayer_design && Object.keys(template.unlayer_design).length > 1) {
        // Ha un design Unlayer valido - reindirizza alla sezione Email
        if (showNotification) {
          showNotification(`Caricamento template "${template.name}" nell'Editor Unlayer...`, 'info')
        }
        
        // Salva il template da caricare e reindirizza
        sessionStorage.setItem('templateToLoad', JSON.stringify(template))
        window.location.hash = '#email'
        
      } else {
        // Non ha design Unlayer - solo messaggio
        if (showNotification) {
          showNotification(`Template "${template.name}" non compatibile con Unlayer (creato con Drag & Drop)`, 'warning')
        }
      }
    } catch (error) {
      console.error('Errore caricamento template Unlayer:', error)
      if (showNotification) {
        showNotification('Errore caricamento template in Unlayer', 'error')
      }
    }
  }

  // Elimina un template
  const deleteTemplate = async (templateId, templateName) => {
    if (!confirm(`Sei sicuro di voler eliminare il template "${templateName}"?`)) return
    
    try {
      // Elimina dalla tabella unificata
      const { error } = await supabase
        .from('email_templates')
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
      {console.log('🎯 COMPONENT RENDER - Loading:', loading, 'Templates:', savedTemplates.length, 'Supabase:', !!supabase)}
      <div className="template-manager-header">
        <h3>I Miei Template</h3>
        {!supabase && <p style={{color: 'red'}}>⚠️ Supabase non connesso</p>}
        <p style={{background: '#e3f2fd', padding: '8px', borderRadius: '4px', fontSize: '12px'}}>
          Debug: Loading={loading ? 'true' : 'false'}, Templates={savedTemplates.length}
        </p>
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
          {console.log('🎨 RENDERING - Loading:', loading, 'SavedTemplates:', savedTemplates.length, savedTemplates)}
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
                        title="Carica nel Drag & Drop Builder"
                      >
                        📦 Drag & Drop
                      </button>
                      <button 
                        className="btn-load"
                        onClick={() => loadTemplateInUnlayer(template)}
                        style={{ background: '#D4AF37', marginLeft: '8px' }}
                        title="Carica nell'Editor Unlayer"
                      >
                        🎨 Unlayer
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