import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase'
import { automaticTemplates } from './emailTemplates'

const AutomaticTemplatesEditor = ({ showNotification }) => {
  const [templates, setTemplates] = useState(automaticTemplates)
  const [selectedTemplate, setSelectedTemplate] = useState('welcome')
  const [milestones, setMilestones] = useState([
    { threshold: 50, message: 'Sei un cliente speciale! Continua così per sbloccare premi esclusivi.', enabled: true },
    { threshold: 100, message: 'Incredibile! Sei entrato nel club VIP. Ti aspettano premi fantastici!', enabled: true },
    { threshold: 150, message: 'Sei una leggenda! Hai raggiunto un traguardo straordinario.', enabled: true }
  ])
  const [isSaving, setIsSaving] = useState(false)
  const editorRef = useRef(null)
  const [isEditorReady, setIsEditorReady] = useState(false)

  // Inizializza TinyMCE per il template selezionato
  useEffect(() => {
    if (window.tinymce && editorRef.current && !isEditorReady) {
      window.tinymce.init({
        target: editorRef.current,
        height: 400,
        menubar: false,
        plugins: [
          'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
          'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
          'insertdatetime', 'media', 'table', 'help', 'wordcount'
        ],
        toolbar: 'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help',
        content_style: 'body { font-family: Arial, sans-serif; font-size: 14px }',
        setup: function(editor) {
          editor.on('init', function() {
            setIsEditorReady(true)
            // Carica il contenuto del template selezionato
            editor.setContent(templates[selectedTemplate]?.html || '')
          })
          
          editor.on('change', function() {
            const content = editor.getContent()
            setTemplates(prev => ({
              ...prev,
              [selectedTemplate]: {
                ...prev[selectedTemplate],
                html: content
              }
            }))
          })
        }
      })
    }

    return () => {
      if (window.tinymce && editorRef.current) {
        window.tinymce.remove(`#${editorRef.current.id}`)
        setIsEditorReady(false)
      }
    }
  }, [selectedTemplate])

  // Aggiorna editor quando cambia template
  useEffect(() => {
    if (isEditorReady && window.tinymce) {
      const editor = window.tinymce.get(editorRef.current?.id)
      if (editor) {
        editor.setContent(templates[selectedTemplate]?.html || '')
      }
    }
  }, [selectedTemplate, isEditorReady])

  // Carica milestone dal database
  useEffect(() => {
    loadMilestones()
  }, [])

  const loadMilestones = async () => {
    try {
      const { data, error } = await supabase
        .from('email_milestones')
        .select('*')
        .order('threshold', { ascending: true })

      if (!error && data && data.length > 0) {
        setMilestones(data)
      }
    } catch (error) {
      console.error('Errore caricamento milestone:', error)
    }
  }

  const handleTemplateChange = (templateId) => {
    setSelectedTemplate(templateId)
  }

  const handleSubjectChange = (value) => {
    setTemplates(prev => ({
      ...prev,
      [selectedTemplate]: {
        ...prev[selectedTemplate],
        subject: value
      }
    }))
  }

  const handleMilestoneChange = (index, field, value) => {
    setMilestones(prev => prev.map((milestone, i) => 
      i === index ? { ...milestone, [field]: value } : milestone
    ))
  }

  const addMilestone = () => {
    setMilestones(prev => [...prev, {
      threshold: 200,
      message: 'Nuovo traguardo raggiunto!',
      enabled: true
    }])
  }

  const removeMilestone = (index) => {
    setMilestones(prev => prev.filter((_, i) => i !== index))
  }

  const saveTemplates = async () => {
    setIsSaving(true)
    try {
      // Salva i template nel database (se la tabella esiste)
      const { error: templateError } = await supabase
        .from('automatic_templates')
        .upsert([
          { id: 'welcome', subject: templates.welcome.subject, html: templates.welcome.html },
          { id: 'birthday', subject: templates.birthday.subject, html: templates.birthday.html },
          { id: 'milestone', subject: templates.milestone.subject, html: templates.milestone.html }
        ])

      // Salva le milestone
      const { error: milestoneError } = await supabase
        .from('email_milestones')
        .delete()
        .neq('id', 0) // Cancella tutti i record esistenti

      if (!milestoneError) {
        const { error: insertError } = await supabase
          .from('email_milestones')
          .insert(milestones.map((m, index) => ({
            threshold: m.threshold,
            message: m.message,
            enabled: m.enabled,
            order_index: index
          })))

        if (insertError) throw insertError
      }

      showNotification('✅ Template automatici salvati con successo!', 'success')
      
      // Aggiorna anche il file locale (per ora)
      console.log('Template salvati:', templates)
      console.log('Milestone salvate:', milestones)

    } catch (error) {
      console.error('Errore salvataggio:', error)
      showNotification('❌ Errore nel salvataggio dei template', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const templateOptions = [
    { id: 'welcome', name: 'Benvenuto', icon: '👋', color: 'bg-green-500' },
    { id: 'birthday', name: 'Compleanno', icon: '🎂', color: 'bg-pink-500' },
    { id: 'milestone', name: 'Milestone', icon: '💎', color: 'bg-purple-500' }
  ]

  return (
    <div className="automatic-templates-editor" style={{ padding: '15px', height: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 10px 0' }}>📧 Template Automatici</h3>
        <p style={{ fontSize: '12px', color: '#666', margin: '0' }}>
          Modifica template email automatiche
        </p>
      </div>

      {/* Selector Template */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
          Template da Modificare
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {templateOptions.map(option => (
            <button
              key={option.id}
              onClick={() => handleTemplateChange(option.id)}
              style={{
                padding: '10px',
                borderRadius: '6px',
                border: selectedTemplate === option.id ? '2px solid #3b82f6' : '1px solid #d1d5db',
                backgroundColor: selectedTemplate === option.id ? '#eff6ff' : 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              <span style={{ fontSize: '16px' }}>{option.icon}</span>
              <span style={{ fontWeight: selectedTemplate === option.id ? 'bold' : 'normal' }}>
                {option.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Editor Template */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>
          Subject Email
        </label>
        <input
          type="text"
          value={templates[selectedTemplate]?.subject || ''}
          onChange={(e) => handleSubjectChange(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '12px'
          }}
          placeholder="Oggetto dell'email..."
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>
          HTML Template
        </label>
        <div style={{ border: '1px solid #d1d5db', borderRadius: '4px' }}>
          <textarea
            ref={editorRef}
            id={`tinymce-${selectedTemplate}`}
            style={{ width: '100%', height: '300px', fontSize: '11px' }}
          />
        </div>
        <div style={{ marginTop: '5px', fontSize: '10px', color: '#666' }}>
          Variabili: {'{{nome}}'}, {'{{email}}'}, {'{{gemme}}'}, {'{{message}}'}
        </div>
      </div>

      {/* Configurazione Milestone */}
      {selectedTemplate === 'milestone' && (
        <div style={{ marginBottom: '15px' }}>
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '15px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>⚙️ Milestone GEMME</h4>
            
            {milestones.map((milestone, index) => (
              <div key={index} style={{ backgroundColor: '#f9fafb', padding: '10px', borderRadius: '4px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ flex: '0 0 80px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>
                        GEMME
                      </label>
                      <input
                        type="number"
                        value={milestone.threshold}
                        onChange={(e) => handleMilestoneChange(index, 'threshold', parseInt(e.target.value))}
                        style={{ width: '100%', padding: '4px', border: '1px solid #d1d5db', borderRadius: '3px', fontSize: '11px' }}
                      />
                    </div>
                    
                    <div style={{ flex: '1' }}>
                      <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>
                        Messaggio
                      </label>
                      <input
                        type="text"
                        value={milestone.message}
                        onChange={(e) => handleMilestoneChange(index, 'message', e.target.value)}
                        style={{ width: '100%', padding: '4px', border: '1px solid #d1d5db', borderRadius: '3px', fontSize: '11px' }}
                        placeholder="Messaggio milestone..."
                      />
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', fontSize: '10px' }}>
                        <input
                          type="checkbox"
                          checked={milestone.enabled}
                          onChange={(e) => handleMilestoneChange(index, 'enabled', e.target.checked)}
                          style={{ marginRight: '4px' }}
                        />
                        Attiva
                      </label>
                      
                      <button
                        onClick={() => removeMilestone(index)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}
                        title="Rimuovi milestone"
                      >
                        ❌
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            <button
              onClick={addMilestone}
              style={{
                width: '100%',
                border: '2px dashed #d1d5db',
                borderRadius: '4px',
                padding: '8px',
                fontSize: '11px',
                color: '#6b7280',
                background: 'none',
                cursor: 'pointer'
              }}
            >
              ➕ Aggiungi Milestone
            </button>
          </div>
        </div>
      )}

      {/* Pulsanti Azione */}
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <button
          onClick={saveTemplates}
          disabled={isSaving}
          style={{
            padding: '10px 20px',
            borderRadius: '4px',
            border: 'none',
            fontSize: '12px',
            fontWeight: 'bold',
            color: 'white',
            backgroundColor: isSaving ? '#9ca3af' : '#3b82f6',
            cursor: isSaving ? 'not-allowed' : 'pointer'
          }}
        >
          {isSaving ? '⏳ Salvando...' : '💾 Salva Template'}
        </button>
      </div>
    </div>
  )
}

export default AutomaticTemplatesEditor