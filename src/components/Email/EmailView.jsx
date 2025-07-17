import { memo, useState, useEffect, useRef } from 'react'
import EmailQuotaWidget from './EmailQuotaWidget'
import { emailAutomationService } from '../../services/emailAutomation'
import { supabase } from '../../supabase'

const EmailView = memo(({
  emailStats,
  loadAllCustomersForEmail,
  sendEmail,
  showNotification,
  customers
}) => {
  // Stati locali per l'editor professionale
  const [activePanel, setActivePanel] = useState('templates')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [emailContent, setEmailContent] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [previewDevice, setPreviewDevice] = useState('desktop')
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [selectedSegments, setSelectedSegments] = useState([])
  const [customFilters, setCustomFilters] = useState([])
  const [isTesting, setIsTesting] = useState(false)
  const [savedTemplates, setSavedTemplates] = useState([])
  const [isEditorReady, setIsEditorReady] = useState(false)
  const [birthdayCount, setBirthdayCount] = useState(0)
  const editorRef = useRef(null)

  // Template professionali predefiniti
  const defaultTemplates = [
    {
      id: 'welcome',
      name: 'Benvenuto Premium',
      category: 'onboarding',
      icon: 'user-plus',
      thumbnail: '/template-welcome.png',
      subject: 'Benvenuto in Sapori & Colori, {{nome}}!',
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #8B4513 0%, #D4AF37 100%); padding: 40px; text-align: center;">
            <img src="https://saporiecolori.net/logo.png" alt="Logo" style="max-width: 150px;">
            <h1 style="color: white; margin-top: 20px;">Benvenuto {{nome}}!</h1>
          </div>
          <div style="padding: 40px; background: #ffffff;">
            <p>Caro {{nome}},</p>
            <p>Siamo felici di averti nella famiglia Sapori & Colori!</p>
            <p>Da oggi inizi a guadagnare GEMME con ogni acquisto:</p>
            <ul>
              <li>1€ = 1 GEMMA</li>
              <li>Premi esclusivi</li>
              <li>Offerte personalizzate</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="background: #D4AF37; color: #8B4513; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">Scopri i Premi</a>
            </div>
          </div>
        </div>
      `
    },
    {
      id: 'milestone',
      name: 'Traguardo GEMME',
      category: 'engagement',
      icon: 'trophy',
      thumbnail: '/template-milestone.png',
      subject: 'Congratulazioni {{nome}}! Hai raggiunto {{gemme}} GEMME!',
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); padding: 40px; text-align: center;">
            <h1 style="color: white; font-size: 36px;">{{gemme}} GEMME!</h1>
            <p style="color: #FEE2E2; font-size: 18px;">Sei incredibile, {{nome}}!</p>
          </div>
          <div style="padding: 40px; background: #ffffff;">
            <h2 style="color: #DC2626; text-align: center;">Traguardo Raggiunto!</h2>
            <p>Con {{gemme}} GEMME hai sbloccato nuovi vantaggi esclusivi!</p>
            <div style="background: #FEE2E2; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <h3 style="color: #DC2626;">I tuoi nuovi privilegi:</h3>
              <ul style="color: #991B1B;">
                <li>Sconto 10% su tutti i prodotti</li>
                <li>Accesso anticipato alle novità</li>
                <li>Regalo speciale al prossimo acquisto</li>
              </ul>
            </div>
          </div>
        </div>
      `
    },
    {
      id: 'promo',
      name: 'Promozione Speciale',
      category: 'marketing',
      icon: 'tag',
      thumbnail: '/template-promo.png',
      subject: '{{nome}}, offerta esclusiva solo per te!',
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #FEF3C7; padding: 20px; text-align: center;">
            <span style="background: #F59E0B; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold;">OFFERTA LIMITATA</span>
          </div>
          <div style="padding: 40px; background: #ffffff;">
            <h1 style="color: #F59E0B; text-align: center;">Sconto 20% Solo Oggi!</h1>
            <p>Ciao {{nome}},</p>
            <p>Abbiamo riservato per te un'offerta speciale valida solo per oggi!</p>
            <div style="border: 2px dashed #F59E0B; padding: 20px; margin: 20px 0; text-align: center;">
              <h2 style="color: #F59E0B; margin: 0;">CODICE: SPECIAL20</h2>
              <p style="color: #666;">Valido fino alle 23:59 di oggi</p>
            </div>
          </div>
        </div>
      `
    },
    // Template Automatici
    {
      id: 'auto-welcome',
      name: '🤖 Benvenuto Automatico',
      category: 'automatic',
      icon: 'user-plus',
      thumbnail: '/template-auto-welcome.png',
      subject: 'Benvenuto in Sapori & Colori, {{nome}}! 🎉',
      content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 40px 30px; text-align: center;">
              <img src="https://jexkalekaofsfcusdfjh.supabase.co/storage/v1/object/public/tinymce-images//saporiecolorilogo2.png" alt="Sapori & Colori" style="height: 60px; margin-bottom: 10px;" />
              <h1 style="margin: 0; color: #ffffff; font-size: 32px;">Benvenuto {{nome}}!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px;">
                Siamo felici di averti nella famiglia Sapori & Colori!
              </p>
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 30px 0;">
                <h3 style="margin: 0 0 10px 0; color: #dc2626; font-size: 18px;">Come funziona:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #4a4a4a;">
                  <li>🛍️ 1€ speso = 1 GEMMA guadagnata</li>
                  <li>💎 Accumula GEMME per premi esclusivi</li>
                  <li>🎁 Offerte speciali solo per te</li>
                </ul>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
    },
    {
      id: 'auto-birthday',
      name: '🤖 Compleanno Automatico',
      category: 'automatic',
      icon: 'gift',
      thumbnail: '/template-auto-birthday.png',
      subject: 'Tanti auguri {{nome}}! 🎉',
      content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 60px 30px; text-align: center;">
              <div style="font-size: 80px; margin-bottom: 20px;">🎂</div>
              <h1 style="margin: 0 0 10px 0; color: #ffffff; font-size: 36px;">Buon Compleanno {{nome}}!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 30px 0; color: #4a4a4a; font-size: 18px; text-align: center;">
                In questo giorno speciale, Sapori & Colori vuole festeggiare con te!
              </p>
              <div style="background-color: #fef2f2; border: 2px dashed #dc2626; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0;">
                <h2 style="margin: 0 0 10px 0; color: #dc2626; font-size: 24px;">🎁 Il Nostro Regalo</h2>
                <p style="margin: 0 0 20px 0; color: #dc2626; font-size: 36px; font-weight: bold;">30% SCONTO</p>
                <p style="margin: 0; color: #4a4a4a; font-size: 16px;">Su tutto il tuo ordine di oggi!</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
    },
    {
      id: 'auto-milestone',
      name: '🤖 Milestone Automatica',
      category: 'automatic',
      icon: 'trophy',
      thumbnail: '/template-auto-milestone.png',
      subject: '🎉 Hai raggiunto {{gemme}} GEMME!',
      content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #1a1a1a;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #1a1a1a; padding: 20px 0;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #2a2a2a; border-radius: 8px; border: 1px solid #3a3a3a;">
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 60px 30px; text-align: center;">
              <div style="font-size: 60px; margin-bottom: 20px;">💎</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 32px;">Fantastico {{nome}}!</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 20px;">Hai {{gemme}} GEMME!</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 30px 0; color: #e0e0e0; font-size: 16px; text-align: center;">
                Congratulazioni! Ecco i tuoi nuovi vantaggi:
              </p>
              <div style="background-color: #1a1a1a; border-radius: 8px; padding: 30px;">
                <h3 style="margin: 0 0 15px 0; color: #dc2626; font-size: 18px; text-align: center;">🎁 I tuoi privilegi:</h3>
                <ul style="color: #e0e0e0; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>🥖 Sconto 10% su tutti i prodotti da forno</li>
                  <li>☕ Caffè gratis con ogni acquisto superiore a 15€</li>
                  <li>🍰 Accesso prioritario alle nuove ricette</li>
                  <li>📞 Possibilità di prenotare prodotti speciali</li>
                  <li>🎂 Sconto compleanno del 30% per tutto il mese</li>
                </ul>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
    }
  ]

  // Segmenti cliente predefiniti
  const segments = [
    { id: 'all', name: 'Tutti i clienti', icon: 'user-round', count: customers?.length || 0 },
    { id: 'vip', name: 'VIP (100+ GEMME)', icon: 'star', count: customers?.filter(c => c.points >= 100).length || 0 },
    { id: 'active', name: 'Attivi (ultimi 30gg)', icon: 'activity', count: customers?.filter(c => c.points > 0).length || 0 },
    { id: 'new', name: 'Nuovi (ultimi 7gg)', icon: 'user-check', count: customers?.filter(c => {
      const created = new Date(c.created_at)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return created > weekAgo
    }).length || 0 },
    { id: 'inactive', name: 'Inattivi', icon: 'user-x', count: customers?.filter(c => c.points === 0).length || 0 },
    { id: 'birthday', name: 'Compleanno questo mese', icon: 'gift', count: birthdayCount },
  ]

  // Variabili disponibili
  const variables = [
    { key: 'nome', label: 'Nome Cliente', icon: 'user' },
    { key: 'gemme', label: 'GEMME Attuali', icon: 'gem' },
    { key: 'email', label: 'Email', icon: 'mail' },
    { key: 'telefono', label: 'Telefono', icon: 'phone' },
    { key: 'data', label: 'Data Oggi', icon: 'calendar' },
    { key: 'negozio', label: 'Nome Negozio', icon: 'home' },
  ]

  // Carica conteggio compleanni
  useEffect(() => {
    const loadBirthdayCount = async () => {
      try {
        const birthdayCustomers = await emailAutomationService.getThisMonthBirthdays()
        setBirthdayCount(birthdayCustomers.length)
      } catch (error) {
        console.error('Errore caricamento compleanni:', error)
        setBirthdayCount(0)
      }
    }
    
    loadBirthdayCount()
  }, [customers])

  // Inizializza TinyMCE e Lucide Icons
  useEffect(() => {
    // Inizializza Lucide Icons
    if (window.lucide) {
      window.lucide.createIcons()
    }
    
    // Inizializza TinyMCE
    if (window.tinymce && editorRef.current && !isEditorReady) {
      window.tinymce.init({
        target: editorRef.current,
        height: 500,
        menubar: false,
        plugins: [
          'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
          'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
          'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
        ],
        toolbar: 'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help',
        content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
        setup: (editor) => {
          editor.on('change', () => {
            setEmailContent(editor.getContent())
          })
        }
      }).then(() => {
        setIsEditorReady(true)
      })
    }

    return () => {
      if (window.tinymce) {
        window.tinymce.remove()
      }
    }
  }, [])

  // Re-inizializza Lucide Icons quando cambiano i componenti
  useEffect(() => {
    if (window.lucide) {
      setTimeout(() => window.lucide.createIcons(), 100)
    }
  }, [activePanel, selectedTemplate, selectedSegments])

  // Inserisci variabile nell'editor
  const insertVariable = (variable) => {
    if (window.tinymce && window.tinymce.activeEditor) {
      window.tinymce.activeEditor.insertContent(`{{${variable.key}}}`)
    }
  }

  // Carica template nell'editor
  const loadTemplate = (template) => {
    setSelectedTemplate(template)
    setEmailSubject(template.subject)
    
    // Per i template automatici, usa il contenuto completo
    const templateContent = template.content || template.html || ''
    
    if (window.tinymce && window.tinymce.activeEditor) {
      window.tinymce.activeEditor.setContent(templateContent)
    }
    setEmailContent(templateContent)
  }

  // Toggle selezione segmento
  const toggleSegment = (segmentId) => {
    setSelectedSegments(prev => 
      prev.includes(segmentId) 
        ? prev.filter(id => id !== segmentId)
        : [...prev, segmentId]
    )
  }

  // Anteprima email con variabili sostituite
  const getPreviewContent = () => {
    let preview = emailContent
    preview = preview.replace(/{{nome}}/g, 'Mario Rossi')
    preview = preview.replace(/{{gemme}}/g, '150')
    preview = preview.replace(/{{email}}/g, 'mario.rossi@email.com')
    preview = preview.replace(/{{telefono}}/g, '+39 123 456 7890')
    preview = preview.replace(/{{data}}/g, new Date().toLocaleDateString('it-IT'))
    preview = preview.replace(/{{negozio}}/g, 'Sapori & Colori')
    return preview
  }

  // Invia email test
  const sendTestEmail = async () => {
    if (!emailSubject || !emailContent) {
      showNotification('Compila oggetto e contenuto prima di inviare il test', 'error')
      return
    }
    
    setIsTesting(true)
    
  try {
  // Invia email di test all'admin
  await sendEmail({
    subject: `[TEST] ${emailSubject}`,
    content: emailContent,
    template: selectedTemplate?.id || 'test',
    segments: selectedSegments // <--- AGGIUNGI QUESTA RIGA!
  })
    } catch (error) {
      console.error('Errore test email:', error)
      showNotification('Errore nell\'invio dell\'email di test', 'error')
    } finally {
      setIsTesting(false)
    }
  }

  // Salva template
  const saveTemplate = async () => {
    // Se è un template automatico, aggiorna quello
    if (selectedTemplate && selectedTemplate.category === 'automatic') {
      try {
        // Aggiorna il template automatico nel database
        const { error } = await supabase
          .from('automatic_templates')
          .upsert({
            id: selectedTemplate.id.replace('auto-', ''),
            subject: emailSubject,
            html: emailContent,
            updated_at: new Date().toISOString()
          })

        if (error) throw error

        showNotification('✅ Template automatico aggiornato!', 'success')
        
        // Il template sarà aggiornato nel database, ricarica la pagina per vedere le modifiche
        
      } catch (error) {
        console.error('Errore aggiornamento template automatico:', error)
        showNotification('❌ Errore aggiornamento template automatico', 'error')
      }
    } else {
      // Template custom normale
      const newTemplate = {
        id: Date.now(),
        name: prompt('Nome del template:'),
        category: 'custom',
        icon: 'file-text',
        subject: emailSubject,
        content: emailContent,
        created_at: new Date().toISOString()
      }
      setSavedTemplates(prev => [...prev, newTemplate])
      showNotification('Template salvato con successo!', 'success')
    }
  }

  return (
    <div className="email-editor-container">
      {/* Header */}
      <div className="email-editor-header">
        <div className="header-left">
          <h1>Email Marketing Studio</h1>
          <p>Crea e invia campagne email professionali</p>
        </div>
        <div className="header-stats">
          <div className="stat-mini">
            <span className="stat-mini-label">Inviate Oggi</span>
            <span className="stat-mini-value">{emailStats.sent}</span>
          </div>
          <div className="stat-mini">
            <span className="stat-mini-label">Tasso Apertura</span>
            <span className="stat-mini-value">{emailStats.opened}%</span>
          </div>
        </div>
        <div className="header-quota">
          <EmailQuotaWidget 
            showNotification={showNotification}
            compact={true}
          />
        </div>
      </div>

      {/* WIDGET QUOTA EMAIL ACCORDION (sostituisce la versione completa) */}
      <EmailQuotaWidget 
        showNotification={showNotification}
        accordion={true}
      />

      {/* Layout a 3 pannelli */}
      <div className="email-editor-panels">
        {/* Pannello Sinistro - Template Gallery */}
        <div className="email-panel-left">
          <div className="panel-tabs">
            <button 
              className={`panel-tab ${activePanel === 'templates' ? 'active' : ''}`}
              onClick={() => setActivePanel('templates')}
            >
              Template
            </button>
            <button 
              className={`panel-tab ${activePanel === 'saved' ? 'active' : ''}`}
              onClick={() => setActivePanel('saved')}
            >
              Salvati ({savedTemplates.length})
            </button>
          </div>

          <div className="template-gallery">
            {activePanel === 'templates' ? (
              <>
                <h3>Template Predefiniti</h3>
                <div className="template-grid">
                  {defaultTemplates.map(template => (
                    <div 
                      key={template.id}
                      className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                      onClick={() => loadTemplate(template)}
                    >
                      <div className="template-icon">
                        <span className={`icon icon-${template.icon}`}></span>
                      </div>
                      <div className="template-info">
                        <h4>{template.name}</h4>
                        <span className="template-category">{template.category}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : activePanel === 'saved' ? (
              <>
                <h3>Template Salvati</h3>
                {savedTemplates.length === 0 ? (
                  <div className="empty-templates">
                    <p>Nessun template salvato</p>
                    <small>I template che salvi appariranno qui</small>
                  </div>
                ) : (
                  <div className="template-grid">
                    {savedTemplates.map(template => (
                      <div 
                        key={template.id}
                        className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                        onClick={() => loadTemplate(template)}
                      >
                        <div className="template-icon">
                          <span className={`icon icon-${template.icon || 'file-text'}`}></span>
                        </div>
                        <div className="template-info">
                          <h4>{template.name}</h4>
                          <span className="template-category">{template.category}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <h3>Template Salvati</h3>
                {savedTemplates.length === 0 ? (
                  <div className="empty-templates">
                    <p>Nessun template salvato</p>
                    <small>I template che salvi appariranno qui</small>
                  </div>
                ) : (
                  <div className="template-grid">
                    {savedTemplates.map(template => (
                      <div 
                        key={template.id}
                        className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                        onClick={() => loadTemplate(template)}
                      >
                        <div className="template-icon">
                          <span className={`icon icon-${template.icon || 'file-text'}`}></span>
                        </div>
                        <div className="template-info">
                          <h4>{template.name}</h4>
                          <span className="template-category">{template.category}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Pannello Centrale - Editor */}
        <div className="email-panel-center">
          <div className="editor-toolbar">
            <button className="btn-toolbar" onClick={saveTemplate}>
              <span className="icon-small icon-save"></span>
              {selectedTemplate?.category === 'automatic' ? 'Aggiorna Template 🤖' : 'Salva Template'}
            </button>
            <button className="btn-toolbar" onClick={sendTestEmail} disabled={isTesting}>
              <span className="icon-small icon-send"></span>
              {isTesting ? 'Invio in corso...' : 'Test Email'}
            </button>
          </div>

          <div className="editor-subject">
            <label>Oggetto Email</label>
            <input
              type="text"
              placeholder="Inserisci l'oggetto dell'email..."
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="subject-input-pro"
            />
          </div>

          <div className="variables-bar">
            <span className="variables-label">Variabili:</span>
            {variables.map(variable => (
              <button
                key={variable.key}
                className="variable-chip"
                onClick={() => insertVariable(variable)}
                title={variable.label}
              >
                <span className={`icon-small icon-${variable.icon}`}></span>
                {variable.label}
              </button>
            ))}
          </div>

          <div className="editor-container">
            <textarea ref={editorRef} id="email-editor"></textarea>
          </div>
        </div>

        {/* Pannello Destro - Preview & Settings */}
        <div className="email-panel-right">
          <div className="preview-controls">
            <h3>Anteprima</h3>
            <div className="device-toggle">
              <button 
                className={`device-btn ${previewDevice === 'desktop' ? 'active' : ''}`}
                onClick={() => setPreviewDevice('desktop')}
              >
                <span className="icon-small icon-monitor"></span>
                Desktop
              </button>
              <button 
                className={`device-btn ${previewDevice === 'mobile' ? 'active' : ''}`}
                onClick={() => setPreviewDevice('mobile')}
              >
                <span className="icon-small icon-smartphone"></span>
                Mobile
              </button>
            </div>
          </div>

          <div className={`email-preview-device ${previewDevice}`}>
            <div className="preview-header">
              <small>Da: Sapori & Colori</small>
              <h4>{emailSubject || 'Oggetto email...'}</h4>
            </div>
            <div 
              className="preview-content"
              dangerouslySetInnerHTML={{ __html: getPreviewContent() }}
            />
          </div>

          <div className="recipients-section">
            <h3>Destinatari</h3>
            <div className="segments-grid">
              {segments.map(segment => (
                <div 
                  key={segment.id}
                  className={`segment-card ${selectedSegments.includes(segment.id) ? 'selected' : ''}`}
                  onClick={() => toggleSegment(segment.id)}
                >
                  <span className="segment-icon">
                    <span className={`icon icon-${segment.icon}`}></span>
                  </span>
                  <div className="segment-info">
                    <h4>{segment.name}</h4>
                    <small>{segment.count} clienti</small>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={selectedSegments.includes(segment.id)}
                    onChange={() => {}}
                    className="segment-checkbox"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="schedule-section">
            <label className="schedule-toggle">
              <input 
                type="checkbox"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
              />
              <span className="icon-small icon-clock"></span>
              <span>Programma invio</span>
            </label>
            {isScheduled && (
              <input 
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="schedule-input"
              />
            )}
          </div>

          <div className="send-section">
            <div className="recipients-summary">
              <h4>Riepilogo Invio</h4>
              <p>
                {selectedSegments.length === 0 
                  ? 'Seleziona almeno un segmento' 
                  : `${segments.filter(s => selectedSegments.includes(s.id)).reduce((acc, s) => acc + s.count, 0)} destinatari selezionati`
                }
              </p>
            </div>
            <button 
              className="btn-send-campaign"
              onClick={() => sendEmail({
                subject: emailSubject,
                content: emailContent,
                segments: selectedSegments,
                template: selectedTemplate?.id || 'custom',
              })}
              disabled={selectedSegments.length === 0 || !emailSubject || !emailContent}
            >
              <span className={`icon icon-${isScheduled ? 'clock' : 'send'}`}></span>
              {isScheduled ? 'Programma Invio' : 'Invia Campagna'}
            </button>
          </div>
        </div>
      </div>

    </div>
  )
})

EmailView.displayName = 'EmailView'

export default EmailView

