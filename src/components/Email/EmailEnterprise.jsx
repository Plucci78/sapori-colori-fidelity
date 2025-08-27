import React, { useRef, useCallback, useState } from 'react'
import EmailEditor from 'react-email-editor'
import { emailTrackingService } from '../../services/emailTrackingService'
import { supabase } from '../../supabase'
import EmailStatsDashboard from './EmailStatsDashboard'
import CampaignManager from '../Campaigns/CampaignManager'
import './EmailEnterprise.css'

const EmailEnterprise = ({ 
  onSave, 
  onSendEmail, 
  emailSubject, 
  setEmailSubject,
  allCustomers = [],
  showNotification,
  sidebarMinimized = false,
  onLoadTemplate, // Nuovo: per caricare template
  savedTemplates = [] // Nuovo: lista template salvati
}) => {
  const emailEditorRef = useRef(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showEmailConfig, setShowEmailConfig] = useState(false)
  const [emailRecipients, setEmailRecipients] = useState('all')
  const [showTemplates, setShowTemplates] = useState(false)
  const [selectedCustomers, setSelectedCustomers] = useState([])
  const [showCustomerSelector, setShowCustomerSelector] = useState(false)
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [showCampaignsModal, setShowCampaignsModal] = useState(false)
  const [showTemplateSaveModal, setShowTemplateSaveModal] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  
  // Calcola dinamicamente le dimensioni in base allo stato sidebar
  const sidebarWidth = sidebarMinimized ? 70 : 280
  const containerStyles = {
    width: `calc(100vw - ${sidebarWidth}px)`,
    left: `${sidebarWidth}px`
  }
  
  // Configurazione Unlayer
  const onReady = useCallback(() => {
    console.log('🎨 Unlayer Editor pronto!')
    showNotification?.('Editor email caricato!', 'success')
    
    // Controlla se c'è un template da caricare da sessionStorage
    const templateToLoad = sessionStorage.getItem('templateToLoad')
    if (templateToLoad) {
      try {
        const template = JSON.parse(templateToLoad)
        console.log('📋 Caricamento template automatico:', template.name)
        
        // Carica il design nell'editor
        if (template.unlayer_design && emailEditorRef.current) {
          emailEditorRef.current.editor.loadDesign(template.unlayer_design)
          showNotification?.(`Template "${template.name}" caricato automaticamente!`, 'success')
        }
        
        // Rimuovi il template dal sessionStorage
        sessionStorage.removeItem('templateToLoad')
      } catch (error) {
        console.error('❌ Errore caricamento template automatico:', error)
        sessionStorage.removeItem('templateToLoad')
      }
    }
  }, [showNotification])

  // Salva design come template
  const handleSave = useCallback(() => {
    if (!emailEditorRef.current) return
    
    // Reset del form e apertura modale
    setTemplateName('')
    setTemplateDescription('')
    setShowTemplateSaveModal(true)
  }, [])
  
  // Conferma salvataggio template
  const handleConfirmTemplateSave = useCallback(() => {
    if (!emailEditorRef.current || !templateName.trim()) return
    
    setIsLoading(true)
    try {
      // Salva sia design JSON che HTML
      emailEditorRef.current.editor.saveDesign((design) => {
        emailEditorRef.current.editor.exportHtml(async (data) => {
          try {
            // Genera screenshot con Machine
            console.log('📸 Generando screenshot con Machine...')
            console.log('📧 HTML da convertire (primi 200 chars):', data.html.substring(0, 200))
            const thumbnailUrl = await generateScreenshot(data.html)
            console.log('✅ Screenshot generato URL:', thumbnailUrl)
            
            const templateData = {
              name: templateName.trim(),
              description: templateDescription.trim(),
              unlayer_design: design, // Design Unlayer (per modificare) - CORRETTO!
              html_preview: data.html, // HTML per anteprima - CORRETTO!
              thumbnail_url: thumbnailUrl, // Screenshot da Machine
              category: 'custom',
              created_at: new Date().toISOString()
            }
            
            console.log('💾 Salvataggio template con screenshot:')
            console.log('- Nome:', templateData.name)
            console.log('- Thumbnail URL:', templateData.thumbnail_url)
            console.log('- HTML length:', templateData.html.length)
            
            onSave?.(templateData)
            showNotification?.(`Template "${templateName}" salvato con anteprima!`, 'success')
            
          } catch (error) {
            console.warn('⚠️ Errore screenshot, salvo senza:', error)
            
            const templateData = {
              name: templateName.trim(),
              description: templateDescription.trim(),
              unlayer_design: design, // CORRETTO!
              html_preview: data.html, // CORRETTO!
              thumbnail_url: null,
              category: 'custom',
              created_at: new Date().toISOString()
            }
            
            onSave?.(templateData)
            showNotification?.(`Template "${templateName}" salvato!`, 'success')
          } finally {
            setIsLoading(false)
            setShowTemplateSaveModal(false)
          }
        })
      })
    } catch (error) {
      console.error('❌ Errore salvataggio:', error)
      showNotification?.('Errore salvataggio template', 'error')
      setIsLoading(false)
    }
  }, [templateName, templateDescription, onSave, showNotification])

  // Genera screenshot con servizio alternativo
  const generateScreenshot = async (html) => {
    try {
      console.log('📸 Generando screenshot con Screenshot API...')
      console.log('📧 HTML length:', html.length)
      
      // Prova con Screenshot Machine API
      const response = await fetch('https://api.screenshotmachine.com', {
        method: 'GET',
        params: new URLSearchParams({
          key: 'demo', // Chiave demo gratuita
          url: `data:text/html;base64,${btoa(html)}`,
          dimension: '600x800'
        })
      })
      
      if (!response.ok) {
        throw new Error(`Screenshot API error: ${response.status}`)
      }
      
      const imageUrl = response.url
      console.log('✅ Screenshot generato:', imageUrl)
      return imageUrl
      
    } catch (error) {
      console.error('❌ Errore screenshot:', error)
      
      // Fallback: usa servizio image placeholder con dimensioni corrette
      const placeholderUrl = `https://via.placeholder.com/600x800/8B4513/ffffff?text=${encodeURIComponent('📧 Email\nTemplate')}`
      console.log('🔄 Uso placeholder migliorato:', placeholderUrl)
      return placeholderUrl
    }
  }

  // Rigenera anteprime per template senza thumbnail_url
  const regenerateThumbnails = async () => {
    try {
      const templatesNeedingThumbnails = savedTemplates.filter(t => !t.thumbnail_url && t.html_preview)
      console.log(`🔄 Rigenerando anteprime per ${templatesNeedingThumbnails.length} template...`)
      
      for (const template of templatesNeedingThumbnails) {
        try {
          console.log(`📸 Generando anteprima per: ${template.name}`)
          const thumbnailUrl = await generateScreenshot(template.html_preview)
          console.log(`✅ Anteprima generata per ${template.name}: ${thumbnailUrl}`)
          
          // Aggiorna il template nel database
          const updatedTemplate = { ...template, thumbnail_url: thumbnailUrl }
          onSave?.(updatedTemplate) // Questo dovrebbe aggiornare il template esistente
          
        } catch (error) {
          console.error(`❌ Errore anteprima per ${template.name}:`, error)
        }
      }
      
      showNotification?.('Anteprime rigenerate!', 'success')
      
    } catch (error) {
      console.error('❌ Errore rigenerazione anteprime:', error)
      showNotification?.('Errore rigenerazione anteprime', 'error')
    }
  }

  // Pulisce template duplicati (mantiene solo il più recente per nome)
  const cleanDuplicateTemplates = async () => {
    try {
      console.log('🧹 Iniziando pulizia duplicati...')
      
      if (!savedTemplates || savedTemplates.length === 0) {
        alert('Nessun template da pulire')
        return
      }

      // Raggruppa per nome e trova duplicati
      const templatesByName = savedTemplates.reduce((acc, template) => {
        if (!acc[template.name]) {
          acc[template.name] = []
        }
        acc[template.name].push(template)
        return acc
      }, {})

      const duplicates = []
      const toKeep = []

      Object.entries(templatesByName).forEach(([name, templates]) => {
        if (templates.length > 1) {
          // Ordina per data creazione (più recente prima)
          templates.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          toKeep.push(templates[0]) // Mantieni il più recente
          duplicates.push(...templates.slice(1)) // Elimina gli altri
          console.log(`📋 ${name}: mantengo 1, elimino ${templates.length - 1}`)
        } else {
          toKeep.push(templates[0])
        }
      })

      console.log(`🗑️ Eliminerò ${duplicates.length} duplicati, manterrò ${toKeep.length}`)
      
      if (duplicates.length === 0) {
        alert('✅ Nessun duplicato trovato!')
        return
      }

      const confirmDelete = confirm(`Eliminare ${duplicates.length} template duplicati? (Mantieni ${toKeep.length})`)
      if (!confirmDelete) return

      console.log('🗑️ Eliminando duplicati dal database...')
      
      // Elimina i duplicati dal database
      const idsToDelete = duplicates.map(t => t.id)
      
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .in('id', idsToDelete)

      if (error) {
        console.error('❌ Errore eliminazione database:', error)
        alert('❌ Errore eliminazione dal database')
        return
      }

      console.log(`✅ Eliminati ${duplicates.length} template dal database`)
      
      // Aggiorna la lista locale (rimuovi i duplicati eliminati)
      showNotification?.(`✅ Eliminati ${duplicates.length} duplicati!`, 'success')
      
      // Ricarica i template per aggiornare la UI
      window.location.reload() // Modo rapido per aggiornare tutto
      
    } catch (error) {
      console.error('❌ Errore pulizia duplicati:', error)
      alert('❌ Errore durante la pulizia')
    }
  }

  // Elimina template corrotti (senza unlayer_design)
  const deleteCorruptedTemplates = async () => {
    try {
      const corruptedTemplates = savedTemplates.filter(t => !t.unlayer_design)
      
      if (corruptedTemplates.length === 0) {
        alert('✅ Nessun template corrotto trovato!')
        return
      }
      
      const confirmDelete = confirm(`Eliminare ${corruptedTemplates.length} template corrotti? (Non hanno design utilizzabile)`)
      if (!confirmDelete) return
      
      console.log('🗑️ Eliminando template corrotti...')
      
      const idsToDelete = corruptedTemplates.map(t => t.id)
      
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .in('id', idsToDelete)
        
      if (error) {
        console.error('❌ Errore eliminazione:', error)
        alert('❌ Errore eliminazione dal database')
        return
      }
      
      console.log(`✅ Eliminati ${corruptedTemplates.length} template corrotti`)
      showNotification?.(`✅ Eliminati ${corruptedTemplates.length} template corrotti!`, 'success')
      
      // Ricarica la pagina
      window.location.reload()
      
    } catch (error) {
      console.error('❌ Errore eliminazione corrotti:', error)
      alert('❌ Errore durante l\'eliminazione')
    }
  }

  // Invia email
  const handleSendEmail = useCallback(async () => {
    if (!emailSubject?.trim()) {
      showNotification?.('Inserisci l\'oggetto dell\'email', 'error')
      return
    }

    if (!emailEditorRef.current) {
      showNotification?.('Editor non caricato correttamente', 'error')
      return
    }

    setIsLoading(true)
    try {
      console.log('🚀 Avvio export HTML da Unlayer...')
      console.log('📋 Metodi disponibili:', Object.getOwnPropertyNames(emailEditorRef.current))
      
      // Proviamo con il metodo corretto di react-email-editor
      emailEditorRef.current.editor.exportHtml((data) => {
        console.log('📧 HTML generato da Unlayer:')
        console.log('- Lunghezza:', data.html.length, 'caratteri')
        console.log('- Preview:', data.html.substring(0, 200) + '...')
        console.log('- Design JSON:', data.design)
        
        if (!data.html || data.html.trim().length === 0) {
          throw new Error('HTML vuoto generato da Unlayer')
        }
        
        console.log('📤 Invio tramite sendEmail con parametri:')
        console.log('- subject:', emailSubject)
        console.log('- template: unlayer')
        console.log('- segments:', emailRecipients === 'all' ? [] : [emailRecipients])
        console.log('- selectedCustomers for custom:', selectedCustomers)
        
        // Determina destinatari in base alla selezione
        let recipients = []
        if (emailRecipients === 'custom') {
          recipients = selectedCustomers // Array di ID clienti selezionati
        } else if (emailRecipients !== 'all') {
          recipients = [emailRecipients] // Segmento specifico
        }
        
        // Determina destinatari per tracking
        let targetCustomers = []
        if (emailRecipients === 'custom') {
          targetCustomers = allCustomers.filter(c => selectedCustomers.includes(c.id))
        } else if (emailRecipients !== 'all') {
          const segmentCustomers = segments[emailRecipients] || []
          targetCustomers = segmentCustomers
        } else {
          targetCustomers = allCustomers
        }

        console.log('🎯 Target customers per tracking:', targetCustomers.length)

        // Invio asincrono con tracking
        onSendEmail?.({
          subject: emailSubject,
          content: data.html,
          template: 'unlayer',
          segments: recipients,
          customCustomers: emailRecipients === 'custom' ? selectedCustomers : undefined,
          enableTracking: true,
          targetCustomers: targetCustomers
        }).then(() => {
          setShowEmailConfig(false)
          showNotification?.('Email inviata con successo!', 'success')
          setIsLoading(false)
        }).catch((sendError) => {
          console.error('❌ Errore durante sendEmail:', sendError)
          showNotification?.('Errore invio email: ' + sendError.message, 'error')
          setIsLoading(false)
        })
      })
    } catch (error) {
      console.error('❌ Errore invio completo:', error)
      showNotification?.('Errore invio email: ' + error.message, 'error')
      setIsLoading(false)
    }
  }, [emailSubject, emailRecipients, onSendEmail, showNotification])

  // Anteprima
  const handlePreview = useCallback(() => {
    if (!emailEditorRef.current) return
    
    try {
      emailEditorRef.current.editor.exportHtml((data) => {
        // Apri anteprima in nuova finestra
        const previewWindow = window.open('', '_blank')
        previewWindow.document.write(data.html)
        previewWindow.document.close()
      })
    } catch (error) {
      console.error('❌ Errore anteprima:', error)
      showNotification?.('Errore caricamento anteprima', 'error')
    }
  }, [showNotification])

  // Carica template in Unlayer
  const handleLoadTemplate = useCallback((template) => {
    console.log('🔍 DEBUG Template da caricare:', {
      name: template.name,
      hasDesign: !!template.design,
      hasUnlayerDesign: !!template.unlayer_design,
      designKeys: Object.keys(template)
    })
    
    // Controlla se c'è un design valido (può essere in design o unlayer_design)
    const designData = template.design || template.unlayer_design
    if (!designData) {
      showNotification?.('Template non valido: manca il design', 'error')
      console.error('❌ Template senza design:', template)
      return
    }
    
    // Verifica che l'editor sia completamente pronto
    if (!emailEditorRef.current || !emailEditorRef.current.editor) {
      console.log('⏳ Editor non ancora pronto, tentativo tra 1 secondo...')
      setTimeout(() => handleLoadTemplate(template), 1000)
      return
    }
    
    try {
      console.log('🎨 Caricamento template:', template.name)
      console.log('📋 Design template:', designData)
      
      emailEditorRef.current.editor.loadDesign(designData)
      showNotification?.(`Template "${template.name}" caricato!`, 'success')
      setShowTemplates(false)
    } catch (error) {
      console.error('❌ Errore caricamento template:', error)
      showNotification?.('Errore caricamento template: ' + error.message, 'error')
    }
  }, [showNotification])

  // Funzioni per segmentazione avanzata
  const getCustomerSegments = useCallback(() => {
    if (!allCustomers.length) return {}

    const now = new Date()
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

    return {
      all: allCustomers,
      
      // Segmentazione per livello/gemme
      bronze: allCustomers.filter(c => c.points < 100),
      silver: allCustomers.filter(c => c.points >= 100 && c.points < 300), 
      gold: allCustomers.filter(c => c.points >= 300 && c.points < 500),
      platinum: allCustomers.filter(c => c.points >= 500),
      
      // Segmentazione per spesa (assumendo campo totalSpent)
      lowSpenders: allCustomers.filter(c => (c.totalSpent || 0) < 50),
      mediumSpenders: allCustomers.filter(c => (c.totalSpent || 0) >= 50 && (c.totalSpent || 0) < 200),
      highSpenders: allCustomers.filter(c => (c.totalSpent || 0) >= 200),
      
      // Segmentazione temporale
      newCustomers: allCustomers.filter(c => {
        const createdAt = new Date(c.created_at || c.createdAt)
        return createdAt >= thirtyDaysAgo
      }),
      activeCustomers: allCustomers.filter(c => {
        const lastPurchase = new Date(c.last_purchase || c.lastPurchase || c.created_at)
        return lastPurchase >= sixtyDaysAgo
      }),
      dormantCustomers: allCustomers.filter(c => {
        const lastPurchase = new Date(c.last_purchase || c.lastPurchase || c.created_at)
        return lastPurchase < sixtyDaysAgo
      }),
      historicalCustomers: allCustomers.filter(c => {
        const createdAt = new Date(c.created_at || c.createdAt)
        return createdAt < oneYearAgo
      })
    }
  }, [allCustomers])

  const segments = getCustomerSegments()

  // Filtra clienti per ricerca manuale
  const filteredCustomers = allCustomers.filter(customer => {
    if (!customerSearchTerm) return true
    
    const searchLower = customerSearchTerm.toLowerCase()
    return (
      customer.name?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="email-builder-unlayer" style={containerStyles}>
      {/* Header Toolbar */}
      <div className="unlayer-toolbar">
        <div className="toolbar-left">
          <h1>🚀 Email Enterprise</h1>
          <span className="powered-by">Professional Email Builder</span>
        </div>
        
        <div className="toolbar-actions">
          <button 
            className="btn-templates" 
            onClick={() => setShowTemplates(!showTemplates)}
          >
            🎨 Template
          </button>
          
          <button 
            className="btn-preview" 
            onClick={handlePreview}
            disabled={isLoading}
          >
            👁️ Anteprima
          </button>
          
          <button 
            className="btn-save" 
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? '⏳ Salvando...' : '💾 Salva'}
          </button>
          
          <button 
            className="btn-config" 
            onClick={() => setShowEmailConfig(!showEmailConfig)}
          >
            📤 Configura & Invia
          </button>
          
          <button 
            className="btn-campaigns" 
            onClick={() => setShowCampaignsModal(true)}
          >
            🚀 Campagne
          </button>
          
          <button 
            className="btn-stats" 
            onClick={() => setShowStatsModal(true)}
          >
            📊 Statistiche
          </button>
        </div>
      </div>

      {/* Modale Template */}
      {showTemplates && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={() => setShowTemplates(false)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '16px',
              width: '90vw',
              height: '80vh',
              maxWidth: '1200px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header modale */}
            <div style={{
              background: 'linear-gradient(135deg, #8B4513 0%, #D4AF37 100%)',
              color: 'white',
              padding: '20px 30px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{margin: 0, fontSize: '24px', fontWeight: '700'}}>🎨 I Tuoi Template</h2>
              <button 
                onClick={() => setShowTemplates(false)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  fontSize: '20px',
                  cursor: 'pointer'
                }}
              >×</button>
            </div>
            
            {/* Contenuto modale */}
            <div 
              style={{
                flex: 1,
                padding: '30px',
                overflowY: 'auto',
                background: '#f8f9fa'
              }}
            >
            
            {/* Debug template data */}
            <div style={{background: '#e3f2fd', padding: '15px', marginBottom: '20px', borderRadius: '8px', fontSize: '12px'}}>
              <strong>🔍 Debug Template Data:</strong><br/>
              Totale: {savedTemplates?.length || 0}<br/>
              {savedTemplates?.[0] && (
                <>
                  Primo template:<br/>
                  - Nome: {savedTemplates[0].name}<br/>
                  - thumbnail_url: {savedTemplates[0].thumbnail_url ? '✅ PRESENTE' : '❌ MANCANTE'}<br/>
                  - html_preview: {savedTemplates[0].html_preview ? '✅ PRESENTE' : '❌ MANCANTE'}<br/>
                  {savedTemplates[0].thumbnail_url && (
                    <>
                    - URL: {savedTemplates[0].thumbnail_url}<br/>
                    </>
                  )}
                </>
              )}
              <div style={{display: 'flex', gap: '8px', marginTop: '10px'}}>
                <button 
                  onClick={() => alert('Funzione temporaneamente disabilitata per evitare duplicati')}
                  style={{
                    background: '#f44336',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'not-allowed'
                  }}
                  disabled
                >
                  🚫 DISABILITATO
                </button>
                <button 
                  onClick={cleanDuplicateTemplates}
                  style={{
                    background: '#2196F3',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  🧹 Pulisci Duplicati
                </button>
                <button 
                  onClick={deleteCorruptedTemplates}
                  style={{
                    background: '#f44336',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  🗑️ Elimina Corrotti
                </button>
              </div>
            </div>
            
            {!savedTemplates || savedTemplates.length === 0 ? (
              <div className="no-templates" style={{textAlign: 'center', padding: '40px 20px', color: '#6c757d'}}>
                <p style={{margin: '10px 0', fontSize: '16px'}}>Nessun template salvato ancora.</p>
                <p style={{margin: '10px 0', fontSize: '14px'}}>Crea il tuo primo design e clicca "💾 Salva"!</p>
                <div style={{marginTop: '20px', fontSize: '12px', opacity: '0.7'}}>
                  Debug: {savedTemplates ? `Array vuoto (${savedTemplates.length})` : 'savedTemplates è null/undefined'}
                </div>
              </div>
            ) : (
              <div 
                className="templates-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '24px',
                  maxHeight: '600px',
                  overflowY: 'auto',
                  padding: '15px 8px 15px 0'
                }}
              >
                {savedTemplates.map((template, index) => (
                  <div 
                    key={index} 
                    className="template-card"
                    style={{
                      border: '1px solid #e9ecef',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      background: 'white',
                      display: 'flex',
                      flexDirection: 'column',
                      height: '480px',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#8B4513'
                      e.currentTarget.style.transform = 'translateY(-8px)'
                      e.currentTarget.style.boxShadow = '0 16px 40px rgba(139, 69, 19, 0.15)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e9ecef'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'
                    }}
                  >
                    <div 
                      className="template-preview"
                      style={{
                        background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                        height: '300px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        borderBottom: '1px solid #e9ecef'
                      }}
                    >
                      {template.thumbnail_url ? (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          background: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '10px'
                        }}>
                          <img 
                            src={template.thumbnail_url} 
                            alt={`Preview ${template.name}`}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '100%',
                              objectFit: 'contain',
                              borderRadius: '4px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                          />
                        </div>
                      ) : template.html_preview ? (
                        <div 
                          style={{
                            background: 'linear-gradient(135deg, #8B4513 0%, #D4AF37 100%)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            textAlign: 'center',
                            padding: '20px',
                            height: '100%',
                            position: 'relative'
                          }}
                        >
                          <div style={{fontSize: '64px', marginBottom: '12px', opacity: 0.9}}>📧</div>
                          <h4 style={{margin: '0 0 6px 0', fontSize: '18px', fontWeight: '700'}}>
                            {template.name}
                          </h4>
                          <p style={{margin: '0 0 12px 0', fontSize: '12px', opacity: 0.8, lineHeight: '1.3'}}>
                            {template.description || 'Email Template'}
                          </p>
                          <div style={{
                            background: 'rgba(255,255,255,0.15)',
                            padding: '6px 12px',
                            borderRadius: '16px',
                            fontSize: '10px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '8px'
                          }}>
                            HTML: {Math.round(template.html_preview.length / 1024)}KB
                          </div>
                          <div style={{
                            fontSize: '9px',
                            opacity: 0.6,
                            position: 'absolute',
                            bottom: '8px',
                            right: '8px'
                          }}>
                            {new Date(template.created_at).toLocaleDateString('it-IT')}
                          </div>
                        </div>
                      ) : (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '16px',
                          color: '#8B4513',
                          textAlign: 'center',
                          padding: '30px'
                        }}>
                          <div style={{
                            fontSize: '48px',
                            opacity: '0.6'
                          }}>🎨</div>
                          <span style={{
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#6c757d'
                          }}>Anteprima in preparazione...</span>
                        </div>
                      )}
                    </div>
                    <div style={{
                      padding: '20px',
                      background: 'white',
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <h4 style={{
                        color: '#333',
                        fontSize: '16px',
                        fontWeight: '700',
                        margin: '0 0 8px 0',
                        lineHeight: '1.3'
                      }}>
                        {template.name || 'Template Personalizzato'}
                      </h4>
                      <p style={{
                        color: '#6c757d',
                        fontSize: '13px',
                        lineHeight: '1.4',
                        margin: '0 0 12px 0',
                        flex: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {template.description || 'Un design email personalizzato per le tue campagne'}
                      </p>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '15px'
                      }}>
                        <small style={{
                          color: '#8B4513',
                          fontSize: '11px',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {template.created_at ? new Date(template.created_at).toLocaleDateString('it-IT') : 'Recente'}
                        </small>
                        <small style={{
                          color: '#28a745',
                          fontSize: '11px',
                          fontWeight: '600',
                          background: '#e8f5e8',
                          padding: '4px 8px',
                          borderRadius: '12px'
                        }}>
                          Pronto
                        </small>
                      </div>
                    </div>
                    <div style={{
                      padding: '0 20px 20px 20px'
                    }}>
                      <button 
                        style={{
                          width: '100%',
                          background: 'linear-gradient(135deg, #8B4513 0%, #D4AF37 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '12px 20px',
                          borderRadius: '12px',
                          fontSize: '14px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          boxShadow: '0 4px 12px rgba(139, 69, 19, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)'
                          e.currentTarget.style.boxShadow = '0 8px 20px rgba(139, 69, 19, 0.4)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 69, 19, 0.3)'
                        }}
                        onClick={() => {
                          console.log('🖱️ Caricando template:', template.name)
                          handleLoadTemplate(template)
                          setShowTemplates(false)
                        }}
                      >
                        🚀 Usa Template
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* Pannello configurazione email */}
      {showEmailConfig && (
        <div className="email-config-panel">
          <div className="config-content">
            <h3>⚙️ Configurazione Email</h3>
            
            <div className="config-row">
              <label>📝 Oggetto Email:</label>
              <input
                type="text"
                value={emailSubject || ''}
                onChange={(e) => setEmailSubject?.(e.target.value)}
                placeholder="Inserisci l'oggetto dell'email"
                className="config-input"
              />
            </div>
            
            <div className="config-row">
              <label>👥 Destinatari:</label>
              <select
                value={emailRecipients}
                onChange={(e) => setEmailRecipients(e.target.value)}
                className="config-select"
              >
                <optgroup label="📊 Tutti">
                  <option value="all">Tutti i clienti ({segments.all?.length || 0})</option>
                </optgroup>
                
                <optgroup label="💎 Per Livello Gemme">
                  <option value="bronze">🥉 Bronze - meno di 100 gemme ({segments.bronze?.length || 0})</option>
                  <option value="silver">🥈 Silver - 100-299 gemme ({segments.silver?.length || 0})</option>
                  <option value="gold">🥇 Gold - 300-499 gemme ({segments.gold?.length || 0})</option>
                  <option value="platinum">💎 Platinum - 500+ gemme ({segments.platinum?.length || 0})</option>
                </optgroup>
                
                <optgroup label="💰 Per Spesa">
                  <option value="lowSpenders">💸 Spesa Bassa - meno di 50€ ({segments.lowSpenders?.length || 0})</option>
                  <option value="mediumSpenders">💵 Spesa Media - 50-200€ ({segments.mediumSpenders?.length || 0})</option>
                  <option value="highSpenders">💎 Spesa Alta - oltre 200€ ({segments.highSpenders?.length || 0})</option>
                </optgroup>
                
                <optgroup label="📅 Per Attività">
                  <option value="newCustomers">🆕 Nuovi - ultimi 30gg ({segments.newCustomers?.length || 0})</option>
                  <option value="activeCustomers">✅ Attivi - acquisto &lt; 60gg ({segments.activeCustomers?.length || 0})</option>
                  <option value="dormantCustomers">😴 Dormienti - nessun acquisto &gt; 60gg ({segments.dormantCustomers?.length || 0})</option>
                  <option value="historicalCustomers">🏛️ Storici - oltre 1 anno ({segments.historicalCustomers?.length || 0})</option>
                </optgroup>
                
                <optgroup label="👤 Personalizzato">
                  <option value="custom">🎯 Selezione Manuale</option>
                </optgroup>
              </select>
            </div>
            
            {emailRecipients === 'custom' && (
              <div className="config-row">
                <button 
                  className="btn-select-customers"
                  onClick={() => setShowCustomerSelector(!showCustomerSelector)}
                >
                  {showCustomerSelector ? 'Chiudi Selezione' : `Seleziona Clienti (${selectedCustomers.length} selezionati)`}
                </button>
              </div>
            )}
            
            <div className="config-actions">
              <button 
                className="btn-send" 
                onClick={handleSendEmail}
                disabled={isLoading || !emailSubject?.trim()}
              >
                {isLoading ? '📤 Invio...' : '🚀 Invia Email'}
              </button>
              <button 
                className="btn-cancel" 
                onClick={() => setShowEmailConfig(false)}
              >
                ❌ Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pannello Selezione Clienti */}
      {showCustomerSelector && emailRecipients === 'custom' && (
        <div 
          className="customer-selector-modal" 
          onClick={() => setShowCustomerSelector(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(5px)'
          }}>
          <div 
            className="customer-selector-content" 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '30px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              position: 'relative'
            }}>
            <button
              onClick={() => setShowCustomerSelector(false)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6c757d',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
            <h3 style={{marginTop: 0, color: '#8B4513'}}>👥 Selezione Manuale Clienti</h3>
            <div className="customer-search">
              <input
                type="text"
                value={customerSearchTerm}
                onChange={(e) => setCustomerSearchTerm(e.target.value)}
                placeholder="🔍 Cerca cliente per nome o email..."
                className="customer-search-input"
              />
            </div>
            
            <div className="customer-stats">
              <span>Clienti selezionati: <strong>{selectedCustomers.length}</strong> di <strong>{filteredCustomers.length}</strong> ({allCustomers.length} totali)</span>
            </div>
            
            <div className="customer-actions">
              <button 
                className="btn-select-all"
                onClick={() => setSelectedCustomers(prev => [
                  ...new Set([...prev, ...filteredCustomers.map(c => c.id)])
                ])}
              >
                Seleziona Filtrati
              </button>
              <button 
                className="btn-deselect-all"
                onClick={() => setSelectedCustomers([])}
              >
                Deseleziona Tutti
              </button>
            </div>
            
            <div className="customers-list">
              {filteredCustomers.length === 0 && customerSearchTerm ? (
                <div className="customer-item" style={{justifyContent: 'center', fontStyle: 'italic', color: '#6c757d'}}>
                  Nessun cliente trovato per "{customerSearchTerm}"
                </div>
              ) : (
                filteredCustomers.map(customer => (
                <div key={customer.id} className="customer-item">
                  <input
                    type="checkbox"
                    checked={selectedCustomers.includes(customer.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCustomers(prev => [...prev, customer.id])
                      } else {
                        setSelectedCustomers(prev => prev.filter(id => id !== customer.id))
                      }
                    }}
                  />
                  <div className="customer-info">
                    <strong>{customer.name}</strong>
                    <small>{customer.email} • {customer.points} 💎</small>
                  </div>
                </div>
                ))
              )}
            </div>
            
            <div style={{
              marginTop: '20px',
              paddingTop: '20px',
              borderTop: '1px solid #e9ecef',
              textAlign: 'center'
            }}>
              <button
                onClick={() => setShowCustomerSelector(false)}
                style={{
                  background: 'linear-gradient(135deg, #8B4513 0%, #D4AF37 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 30px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ✅ Conferma Selezione ({selectedCustomers.length} clienti)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Unlayer */}
      <div className="unlayer-container">
        <EmailEditor
          ref={emailEditorRef}
          onReady={onReady}
          options={{
            displayMode: 'email',
            locale: 'it-IT',
            appearance: {
              theme: 'light',
              panels: {
                tools: {
                  dock: 'left'
                }
              }
            },
            features: {
              preview: true,
              imageEditor: true,
              stockImages: false
            },
            tools: {
              // Componenti base sempre disponibili
              text: { enabled: true },
              image: { enabled: true }, 
              button: { enabled: true },
              heading: { enabled: true },
              html: { enabled: true },
              divider: { enabled: true },
              
              // Componenti layout
              columns: { enabled: true },
              
              // Componenti che potrebbero essere Pro/Premium
              video: { enabled: true },
              social: { enabled: true }
              
              // Rimuoviamo questi che potrebbero non essere disponibili:
              // menu: { enabled: true },
              // timer: { enabled: true }
            },
            editor: {
              minRows: 1,
              maxRows: 25
            }
          }}
          style={{ 
            height: 'calc(100vh - 140px)',
            width: '100%'
          }}
        />
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>⏳ Elaborazione in corso...</p>
          </div>
        </div>
      )}

      {/* Modale Statistiche */}
      {showStatsModal && (
        <div 
          className="stats-modal-overlay"
          onClick={() => setShowStatsModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
            backdropFilter: 'blur(5px)'
          }}
        >
          <div 
            className="stats-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '16px',
              width: '95%',
              maxWidth: '1200px',
              height: '90vh',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              position: 'relative'
            }}
          >
            <button
              onClick={() => setShowStatsModal(false)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6c757d',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}
            >
              ✕
            </button>
            <div style={{ height: '100%', overflow: 'auto' }}>
              <EmailStatsDashboard />
            </div>
          </div>
        </div>
      )}

      {/* Modale Campagne */}
      {showCampaignsModal && (
        <div 
          className="campaigns-modal-overlay"
          onClick={() => setShowCampaignsModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10002,
            backdropFilter: 'blur(5px)'
          }}
        >
          <div 
            className="campaigns-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '16px',
              width: '98%',
              maxWidth: '1400px',
              height: '95vh',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              position: 'relative'
            }}
          >
            <button
              onClick={() => setShowCampaignsModal(false)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6c757d',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}
            >
              ✕
            </button>
            <div style={{ height: '100%', overflow: 'auto' }}>
              <CampaignManager showNotification={showNotification} />
            </div>
          </div>
        </div>
      )}
      
      {/* Template Save Modal */}
      {showTemplateSaveModal && (
        <div 
          className="modal-overlay"
          onClick={() => setShowTemplateSaveModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(5px)'
          }}
        >
          <div 
            className="template-save-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '16px',
              width: '90%',
              maxWidth: '500px',
              padding: '30px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              position: 'relative'
            }}
          >
            <button
              onClick={() => setShowTemplateSaveModal(false)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#6c757d',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
            
            <h3 style={{
              margin: '0 0 25px 0',
              color: '#8B4513',
              fontSize: '24px',
              fontWeight: '700'
            }}>
              💾 Salva Template
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#495057'
              }}>
                Nome Template *
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Es: Newsletter Natale 2024"
                style={{
                  width: '100%',
                  padding: '12px 15px',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  fontSize: '14px',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#8B4513'}
                onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
              />
            </div>
            
            <div style={{ marginBottom: '30px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#495057'
              }}>
                Descrizione (opzionale)
              </label>
              <textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Breve descrizione del template..."
                rows="3"
                style={{
                  width: '100%',
                  padding: '12px 15px',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  fontSize: '14px',
                  transition: 'border-color 0.2s ease',
                  resize: 'vertical'
                }}
                onFocus={(e) => e.target.style.borderColor = '#8B4513'}
                onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
              />
            </div>
            
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowTemplateSaveModal(false)}
                style={{
                  padding: '12px 24px',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  background: 'white',
                  color: '#6c757d',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#f8f9fa'
                  e.target.style.borderColor = '#d6d9dc'
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'white'
                  e.target.style.borderColor = '#e9ecef'
                }}
              >
                Annulla
              </button>
              
              <button
                onClick={handleConfirmTemplateSave}
                disabled={!templateName.trim() || isLoading}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  background: templateName.trim() && !isLoading ? 
                    'linear-gradient(135deg, #8B4513 0%, #D4AF37 100%)' : '#6c757d',
                  color: 'white',
                  fontWeight: '600',
                  cursor: templateName.trim() && !isLoading ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s ease',
                  opacity: isLoading ? 0.7 : 1
                }}
                onMouseOver={(e) => {
                  if (templateName.trim() && !isLoading) {
                    e.target.style.transform = 'translateY(-2px)'
                    e.target.style.boxShadow = '0 6px 20px rgba(139, 69, 19, 0.3)'
                  }
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = 'none'
                }}
              >
                {isLoading ? '💾 Salvataggio...' : '💾 Salva Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmailEnterprise