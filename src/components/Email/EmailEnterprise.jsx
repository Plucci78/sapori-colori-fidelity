import React, { useRef, useCallback, useState } from 'react'
import EmailEditor from 'react-email-editor'
import { emailTrackingService } from '../../services/emailTrackingService'
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
        emailEditorRef.current.editor.exportHtml((data) => {
          const templateData = {
            name: templateName.trim(),
            description: templateDescription.trim(),
            design: design, // Design Unlayer (per modificare)
            html: data.html, // HTML finale (per invio)
            created_at: new Date().toISOString()
          }
          
          console.log('💾 Salvataggio template:', templateData)
          onSave?.(templateData)
          showNotification?.(`Template "${templateName}" salvato!`, 'success')
          setIsLoading(false)
          setShowTemplateSaveModal(false)
        })
      })
    } catch (error) {
      console.error('❌ Errore salvataggio:', error)
      showNotification?.('Errore salvataggio template', 'error')
      setIsLoading(false)
    }
  }, [templateName, templateDescription, onSave, showNotification])

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
    if (!emailEditorRef.current || !template.design) {
      showNotification?.('Template non valido o editor non pronto', 'error')
      return
    }
    
    try {
      console.log('🎨 Caricamento template:', template.name)
      emailEditorRef.current.editor.loadDesign(template.design)
      showNotification?.(`Template "${template.name}" caricato!`, 'success')
      setShowTemplates(false)
    } catch (error) {
      console.error('❌ Errore caricamento template:', error)
      showNotification?.('Errore caricamento template', 'error')
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

      {/* Pannello Template */}
      {showTemplates && (
        <div className="template-panel">
          <div className="template-content">
            <h3>🎨 I Tuoi Template</h3>
            
            {savedTemplates.length === 0 ? (
              <div className="no-templates">
                <p>Nessun template salvato ancora.</p>
                <p>Crea il tuo primo design e clicca "💾 Salva"!</p>
              </div>
            ) : (
              <div className="templates-grid">
                {savedTemplates.map((template, index) => (
                  <div key={index} className="template-card">
                    <div className="template-preview">
                      <div className="template-icon">📧</div>
                    </div>
                    <div className="template-info">
                      <h4>{template.name}</h4>
                      <small>
                        {new Date(template.created_at).toLocaleDateString()}
                      </small>
                    </div>
                    <div className="template-actions">
                      <button 
                        className="btn-load-template"
                        onClick={() => handleLoadTemplate(template)}
                      >
                        Carica
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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