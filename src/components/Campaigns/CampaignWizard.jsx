import React, { useState, useCallback, useEffect } from 'react'
import { supabase } from '../../supabase'
import { emailService } from '../../services/emailService'
import './CampaignWizard.css'

const CampaignWizard = ({ 
  showNotification, 
  allCustomers = [], 
  savedTemplates = [],
  onClose 
}) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [wizardData, setWizardData] = useState({
    // Step 1: Template
    selectedTemplate: null,
    templateType: 'existing', // 'existing' or 'blank'
    
    // Step 2: Content
    subject: '',
    previewText: '',
    emailContent: '',
    personalizations: [],
    
    // Dati promozione
    expiryDate: '',
    discount: '20%',
    promoCode: 'WELCOME20',
    
    // Step 3: Recipients
    recipientType: 'all', // 'all', 'segment', 'custom', 'uploaded'
    selectedSegment: '',
    selectedCustomers: [],
    uploadedContacts: [],
    
    // Step 4: Schedule
    sendType: 'now', // 'now' or 'scheduled'
    scheduledDate: '',
    scheduledTime: '',
    timezone: 'Europe/Rome',
    
    // Step 5: Review
    testEmails: [],
    enableTracking: true,
    enableFollowUp: false
  })

  const totalSteps = 5

  // Inizializza il servizio email
  useEffect(() => {
    emailService.init()
  }, [])
  
  const stepTitles = {
    1: '🎨 Scegli Template',
    2: '✏️ Crea Contenuto', 
    3: '👥 Seleziona Destinatari',
    4: '⏰ Programma Invio',
    5: '👁️ Revisiona & Invia'
  }

  // Navigazione wizard
  const goToStep = (step) => {
    if (step >= 1 && step <= totalSteps) {
      setCurrentStep(step)
    }
  }

  const nextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps))
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  // Aggiorna dati wizard
  const updateWizardData = (updates) => {
    setWizardData(prev => ({ ...prev, ...updates }))
  }

  // Validazione step
  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1: // Template
        if (wizardData.templateType === 'existing' && !wizardData.selectedTemplate) {
          showNotification('Seleziona un template', 'error')
          return false
        }
        return true
      
      case 2: // Content
        if (!wizardData.subject.trim()) {
          showNotification('Inserisci l\'oggetto dell\'email', 'error')
          return false
        }
        return true
      
      case 3: // Recipients
        if (wizardData.recipientType === 'custom' && wizardData.selectedCustomers.length === 0) {
          showNotification('Seleziona almeno un destinatario', 'error')
          return false
        }
        return true
      
      case 4: // Schedule
        if (wizardData.sendType === 'scheduled') {
          if (!wizardData.scheduledDate || !wizardData.scheduledTime) {
            showNotification('Inserisci data e ora programmata', 'error')
            return false
          }
        }
        return true
      
      default:
        return true
    }
  }

  // Segmenti predefiniti
  const getSegments = () => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    return {
      all: { 
        name: 'Tutti i Clienti', 
        count: allCustomers.length,
        description: 'Invia a tutti i clienti registrati'
      },
      bronze: { 
        name: 'Livello Bronze', 
        count: allCustomers.filter(c => c.points < 100).length,
        description: 'Clienti con meno di 100 GEMME'
      },
      silver: { 
        name: 'Livello Silver', 
        count: allCustomers.filter(c => c.points >= 100 && c.points < 300).length,
        description: 'Clienti con 100-299 GEMME'
      },
      gold: { 
        name: 'Livello Gold', 
        count: allCustomers.filter(c => c.points >= 300 && c.points < 500).length,
        description: 'Clienti con 300-499 GEMME'
      },
      platinum: { 
        name: 'Livello Platinum', 
        count: allCustomers.filter(c => c.points >= 500).length,
        description: 'Clienti con 500+ GEMME'
      },
      new: { 
        name: 'Nuovi Clienti', 
        count: allCustomers.filter(c => new Date(c.created_at) >= thirtyDaysAgo).length,
        description: 'Clienti registrati negli ultimi 30 giorni'
      },
      active: { 
        name: 'Clienti Attivi', 
        count: allCustomers.filter(c => new Date(c.last_purchase || c.created_at) >= sixtyDaysAgo).length,
        description: 'Clienti con acquisto negli ultimi 60 giorni'
      },
      dormant: { 
        name: 'Clienti Dormienti', 
        count: allCustomers.filter(c => new Date(c.last_purchase || c.created_at) < sixtyDaysAgo).length,
        description: 'Clienti senza acquisti da oltre 60 giorni'
      }
    }
  }

  // Invio campagna finale
  const sendCampaign = async () => {
    try {
      showNotification('🚀 Invio campagna in corso...', 'info')
      
      // Debug: verifica i dati del wizard
      console.log('🔍 Debug wizard data:', {
        recipientType: wizardData.recipientType,
        selectedSegment: wizardData.selectedSegment,
        selectedCustomers: wizardData.selectedCustomers,
        allCustomersCount: allCustomers.length
      })

      // Determina destinatari
      let targetCustomers = []
      if (wizardData.recipientType === 'all') {
        targetCustomers = allCustomers
        console.log('👥 Targeting: Tutti i clienti (' + allCustomers.length + ')')
      } else if (wizardData.recipientType === 'segment') {
        const segments = getSegments()
        const segmentFilter = wizardData.selectedSegment
        
        console.log('🎯 Targeting: Segmento ' + segmentFilter)
        
        if (segmentFilter === 'bronze') {
          targetCustomers = allCustomers.filter(c => c.points < 100)
        } else if (segmentFilter === 'silver') {
          targetCustomers = allCustomers.filter(c => c.points >= 100 && c.points < 300)
        } else if (segmentFilter === 'gold') {
          targetCustomers = allCustomers.filter(c => c.points >= 300 && c.points < 500)
        } else if (segmentFilter === 'platinum') {
          targetCustomers = allCustomers.filter(c => c.points >= 500)
        } else if (segmentFilter === 'new') {
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          targetCustomers = allCustomers.filter(c => new Date(c.created_at) >= thirtyDaysAgo)
        } else if (segmentFilter === 'active') {
          const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
          targetCustomers = allCustomers.filter(c => new Date(c.last_purchase || c.created_at) >= sixtyDaysAgo)
        } else if (segmentFilter === 'dormant') {
          const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
          targetCustomers = allCustomers.filter(c => new Date(c.last_purchase || c.created_at) < sixtyDaysAgo)
        }
        
        console.log('📊 Clienti trovati nel segmento:', targetCustomers.length)
      } else if (wizardData.recipientType === 'custom') {
        targetCustomers = allCustomers.filter(c => wizardData.selectedCustomers.includes(c.id))
        console.log('🎯 Targeting: Selezione personalizzata (' + targetCustomers.length + ')')
      }

      console.log('✅ Target clienti finali:', targetCustomers.length, targetCustomers.map(c => c.name))

      // Controllo di sicurezza
      if (targetCustomers.length === 0) {
        showNotification('❌ Nessun destinatario trovato! Controlla la selezione.', 'error')
        return
      }

      // Salva campagna nel database (adatta allo schema esistente)
      const campaignData = {
        name: `Campagna ${wizardData.subject}`,
        description: `Campagna creata con wizard - ${targetCustomers.length} destinatari`,
        campaign_type: 'wizard',
        subject: wizardData.subject,
        preview_text: wizardData.previewText,
        from_name: 'Sapori & Colori',
        reply_to: 'noreply@saporiecolori.net',
        html_content: wizardData.emailContent,
        template_data: wizardData.selectedTemplate ? {
          template_id: wizardData.selectedTemplate.id,
          template_name: wizardData.selectedTemplate.name
        } : {},
        unlayer_design: wizardData.selectedTemplate?.unlayer_design || {},
        audience_type: wizardData.recipientType,
        audience_filter: wizardData.recipientType === 'segment' ? 
          { segment: wizardData.selectedSegment } :
          wizardData.recipientType === 'custom' ?
          { selected_customer_ids: wizardData.selectedCustomers } : {},
        audience_count: targetCustomers.length,
        schedule_type: wizardData.sendType,
        scheduled_at: wizardData.sendType === 'scheduled' ? 
          `${wizardData.scheduledDate}T${wizardData.scheduledTime}:00` : null,
        status: wizardData.sendType === 'now' ? 'sent' : 'scheduled',
        timezone: 'Europe/Rome'
      }

      // Salva nel database
      const { data: campaign, error: campaignError } = await supabase
        .from('email_campaigns')
        .insert([campaignData])
        .select()
        .single()

      if (campaignError) {
        console.error('Errore database:', campaignError)
        throw campaignError
      }

      console.log('✅ Campagna salvata:', campaign)

      // Se invio immediato, procedi con l'invio
      if (wizardData.sendType === 'now') {
        try {
          console.log('🚀 Invio campagna in corso...')
          
          const emailResult = await emailService.sendCampaignEmail({
            subject: wizardData.subject,
            content: wizardData.emailContent,
            targetCustomers: targetCustomers,
            campaignId: campaign.id,
            selectedTemplate: wizardData.selectedTemplate,
            campaignData: {
              expiryDate: wizardData.expiryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('it-IT'),
              discount: wizardData.discount || '20%',
              promoCode: wizardData.promoCode || 'WELCOME20'
            }
          })

          if (emailResult.success) {
            // Aggiorna statistiche campagna
            await supabase
              .from('email_campaigns')
              .update({
                total_sent: emailResult.totalSent,
                status: 'sent'
              })
              .eq('id', campaign.id)

            showNotification(`✅ Campagna inviata con successo a ${emailResult.totalSent} destinatari!`, 'success')
          } else {
            showNotification(`⚠️ Campagna parzialmente inviata: ${emailResult.totalSent} successo, ${emailResult.totalFailed} errori`, 'warning')
          }
        } catch (emailError) {
          console.error('❌ Errore invio email:', emailError)
          showNotification('❌ Errore durante l\'invio delle email: ' + emailError.message, 'error')
        }
      } else {
        showNotification(`📅 Campagna programmata per ${wizardData.scheduledDate} alle ${wizardData.scheduledTime}`, 'success')
      }

      // Chiudi wizard
      onClose?.()
      
    } catch (error) {
      console.error('Errore invio campagna:', error)
      showNotification('❌ Errore invio campagna: ' + error.message, 'error')
    }
  }

  // Render step corrente
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <TemplateStep 
          wizardData={wizardData} 
          updateWizardData={updateWizardData}
          savedTemplates={savedTemplates}
        />
      case 2:
        return <ContentStep 
          wizardData={wizardData} 
          updateWizardData={updateWizardData}
        />
      case 3:
        return <RecipientsStep 
          wizardData={wizardData} 
          updateWizardData={updateWizardData}
          allCustomers={allCustomers}
          segments={getSegments()}
        />
      case 4:
        return <ScheduleStep 
          wizardData={wizardData} 
          updateWizardData={updateWizardData}
        />
      case 5:
        return <ReviewStep 
          wizardData={wizardData} 
          updateWizardData={updateWizardData}
          segments={getSegments()}
          allCustomers={allCustomers}
        />
      default:
        return null
    }
  }

  return (
    <div className="campaign-wizard-overlay">
      <div className="campaign-wizard">
        {/* Header */}
        <div className="wizard-header">
          <div className="wizard-title">
            <h2>🚀 Creazione Campagna Email</h2>
            <button className="close-wizard" onClick={onClose}>✕</button>
          </div>
          
          {/* Progress Bar */}
          <div className="wizard-progress">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div 
                key={i + 1}
                className={`progress-step ${i + 1 <= currentStep ? 'active' : ''} ${i + 1 === currentStep ? 'current' : ''}`}
                onClick={() => goToStep(i + 1)}
              >
                <div className="step-number">{i + 1}</div>
                <div className="step-title">{stepTitles[i + 1]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="wizard-content">
          {renderCurrentStep()}
        </div>

        {/* Footer */}
        <div className="wizard-footer">
          <div className="wizard-actions">
            {currentStep > 1 && (
              <button className="btn-prev" onClick={prevStep}>
                ← Indietro
              </button>
            )}
            
            <div className="step-indicator">
              Step {currentStep} di {totalSteps}
            </div>
            
            {currentStep < totalSteps ? (
              <button className="btn-next" onClick={nextStep}>
                Avanti →
              </button>
            ) : (
              <button className="btn-send" onClick={sendCampaign}>
                🚀 {wizardData.sendType === 'now' ? 'Invia Ora' : 'Programma Invio'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Step Components
const TemplateStep = ({ wizardData, updateWizardData, savedTemplates }) => (
  <div className="wizard-step">
    <h3>🎨 Scegli il Template</h3>
    <p>Seleziona un template esistente o inizia da zero</p>
    
    <div className="template-options">
      <div 
        className={`template-option ${wizardData.templateType === 'blank' ? 'selected' : ''}`}
        onClick={() => updateWizardData({ templateType: 'blank', selectedTemplate: null })}
      >
        <div className="template-preview blank">
          <div className="blank-icon">📝</div>
        </div>
        <h4>Template Vuoto</h4>
        <p>Inizia da zero con un editor completo</p>
      </div>
      
      {savedTemplates.map(template => (
        <div 
          key={template.id}
          className={`template-option ${wizardData.selectedTemplate?.id === template.id ? 'selected' : ''}`}
          onClick={() => updateWizardData({ templateType: 'existing', selectedTemplate: template })}
        >
          <div className="template-preview">
            <div className="template-icon">📧</div>
          </div>
          <h4>{template.name}</h4>
          <p>{template.description || 'Template personalizzato'}</p>
          <small>{new Date(template.created_at).toLocaleDateString()}</small>
        </div>
      ))}
    </div>
  </div>
)

const ContentStep = ({ wizardData, updateWizardData }) => (
  <div className="wizard-step">
    <h3>✏️ Crea il Contenuto</h3>
    <p>Definisci oggetto e anteprima della tua email</p>
    
    {wizardData.selectedTemplate && (
      <div style={{
        background: 'linear-gradient(135deg, #e8f5e8 0%, #f0f8ff 100%)',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #c3e6c3'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>🎨</span>
          <div>
            <strong>Template selezionato: {wizardData.selectedTemplate.name}</strong>
            <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
              Il contenuto HTML del template verrà usato per l'email. 
              Il testo qui sotto è opzionale e sarà sostituito dal template.
            </p>
          </div>
        </div>
      </div>
    )}
    
    <div className="content-form">
      <div className="form-group">
        <label>📝 Oggetto Email *</label>
        <input
          type="text"
          value={wizardData.subject}
          onChange={(e) => updateWizardData({ subject: e.target.value })}
          placeholder="Es: Offerta speciale solo per te!"
          maxLength={100}
        />
        <small>{wizardData.subject.length}/100 caratteri</small>
      </div>
      
      <div className="form-group">
        <label>👁️ Testo Anteprima</label>
        <input
          type="text"
          value={wizardData.previewText}
          onChange={(e) => updateWizardData({ previewText: e.target.value })}
          placeholder="Breve anteprima che appare nell'email..."
          maxLength={140}
        />
        <small>{wizardData.previewText.length}/140 caratteri</small>
      </div>
      
      <div className="form-group">
        <label>📧 Contenuto Email</label>
        <textarea
          value={wizardData.emailContent}
          onChange={(e) => updateWizardData({ emailContent: e.target.value })}
          placeholder="Scrivi il contenuto della tua email qui..."
          rows={8}
        />
      </div>
      
      {/* Configurazione Promozione */}
      <div className="form-group">
        <h4 style={{ color: '#8B4513', marginBottom: '15px' }}>🎁 Dati Promozione</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
          <div>
            <label>📅 Data Scadenza</label>
            <input
              type="date"
              value={wizardData.expiryDate}
              onChange={(e) => updateWizardData({ expiryDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #e9ecef',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
          <div>
            <label>💰 Sconto</label>
            <input
              type="text"
              value={wizardData.discount}
              onChange={(e) => updateWizardData({ discount: e.target.value })}
              placeholder="Es: 20%, €10"
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #e9ecef',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
          <div>
            <label>🏷️ Codice Sconto</label>
            <input
              type="text"
              value={wizardData.promoCode}
              onChange={(e) => updateWizardData({ promoCode: e.target.value.toUpperCase() })}
              placeholder="Es: WELCOME20"
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #e9ecef',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>
      </div>

      <div className="personalization-help">
        <h4>🎯 Personalizzazione Disponibile:</h4>
        <div className="personalization-tags">
          <span className="tag">{'{{nome}}'}</span>
          <span className="tag">{'{{email}}'}</span>
          <span className="tag">{'{{gemme}}'}</span>
          <span className="tag">{'{{livello}}'}</span>
          <span className="tag">{'{{data_scadenza}}'}</span>
          <span className="tag">{'{{sconto}}'}</span>
          <span className="tag">{'{{codice_sconto}}'}</span>
        </div>
      </div>
    </div>
  </div>
)

const RecipientsStep = ({ wizardData, updateWizardData, segments, allCustomers }) => (
  <div className="wizard-step">
    <h3>👥 Seleziona i Destinatari</h3>
    <p>Scegli chi riceverà la tua campagna</p>
    
    <div className="recipients-options">
      {Object.entries(segments).map(([key, segment]) => (
        <div 
          key={key}
          className={`recipient-option ${wizardData.recipientType === 'segment' && wizardData.selectedSegment === key ? 'selected' : ''}`}
          onClick={() => updateWizardData({ recipientType: 'segment', selectedSegment: key })}
        >
          <div className="recipient-info">
            <h4>{segment.name}</h4>
            <p>{segment.description}</p>
            <div className="recipient-count">{segment.count} destinatari</div>
          </div>
        </div>
      ))}
      
      <div 
        className={`recipient-option ${wizardData.recipientType === 'custom' ? 'selected' : ''}`}
        onClick={() => updateWizardData({ recipientType: 'custom' })}
      >
        <div className="recipient-info">
          <h4>🎯 Selezione Personalizzata</h4>
          <p>Scegli manualmente i destinatari</p>
          <div className="recipient-count">{wizardData.selectedCustomers.length} selezionati</div>
        </div>
      </div>
    </div>
    
    {wizardData.recipientType === 'custom' && (
      <div className="custom-recipients">
        <h4>Seleziona Clienti:</h4>
        <div className="customers-grid">
          {allCustomers.map(customer => (
            <div 
              key={customer.id}
              className={`customer-item ${wizardData.selectedCustomers.includes(customer.id) ? 'selected' : ''}`}
              onClick={() => {
                const selected = wizardData.selectedCustomers.includes(customer.id)
                const newSelection = selected
                  ? wizardData.selectedCustomers.filter(id => id !== customer.id)
                  : [...wizardData.selectedCustomers, customer.id]
                updateWizardData({ selectedCustomers: newSelection })
              }}
            >
              <div className="customer-name">{customer.name}</div>
              <div className="customer-details">{customer.email} • {customer.points} 💎</div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
)

const ScheduleStep = ({ wizardData, updateWizardData }) => {
  const now = new Date()
  const minDate = now.toISOString().split('T')[0]
  const minTime = now.toTimeString().slice(0, 5)
  
  return (
    <div className="wizard-step">
      <h3>⏰ Programma l'Invio</h3>
      <p>Scegli quando inviare la campagna</p>
      
      <div className="schedule-options">
        <div 
          className={`schedule-option ${wizardData.sendType === 'now' ? 'selected' : ''}`}
          onClick={() => updateWizardData({ sendType: 'now' })}
        >
          <div className="schedule-icon">🚀</div>
          <h4>Invia Subito</h4>
          <p>La campagna verrà inviata immediatamente</p>
        </div>
        
        <div 
          className={`schedule-option ${wizardData.sendType === 'scheduled' ? 'selected' : ''}`}
          onClick={() => updateWizardData({ sendType: 'scheduled' })}
        >
          <div className="schedule-icon">📅</div>
          <h4>Programma Invio</h4>
          <p>Scegli data e ora per l'invio automatico</p>
        </div>
      </div>
      
      {wizardData.sendType === 'scheduled' && (
        <div className="schedule-form">
          <div className="form-row">
            <div className="form-group">
              <label>📅 Data</label>
              <input
                type="date"
                value={wizardData.scheduledDate}
                onChange={(e) => updateWizardData({ scheduledDate: e.target.value })}
                min={minDate}
              />
            </div>
            
            <div className="form-group">
              <label>🕐 Ora</label>
              <input
                type="time"
                value={wizardData.scheduledTime}
                onChange={(e) => updateWizardData({ scheduledTime: e.target.value })}
                min={wizardData.scheduledDate === minDate ? minTime : '00:00'}
              />
            </div>
          </div>
          
          <div className="timezone-info">
            🌍 Fuso orario: {wizardData.timezone}
          </div>
        </div>
      )}
    </div>
  )
}

const ReviewStep = ({ wizardData, segments, allCustomers }) => {
  const getRecipientCount = () => {
    if (wizardData.recipientType === 'segment') {
      return segments[wizardData.selectedSegment]?.count || 0
    }
    if (wizardData.recipientType === 'custom') {
      return wizardData.selectedCustomers.length
    }
    return allCustomers.length
  }
  
  return (
    <div className="wizard-step">
      <h3>👁️ Revisiona la Campagna</h3>
      <p>Controlla tutti i dettagli prima dell'invio</p>
      
      <div className="review-summary">
        <div className="review-section">
          <h4>📧 Contenuto</h4>
          <div className="review-item">
            <strong>Oggetto:</strong> {wizardData.subject || 'Non specificato'}
          </div>
          {wizardData.previewText && (
            <div className="review-item">
              <strong>Anteprima:</strong> {wizardData.previewText}
            </div>
          )}
          <div className="review-item">
            <strong>Template:</strong> {wizardData.selectedTemplate?.name || 'Template personalizzato'}
          </div>
        </div>
        
        <div className="review-section">
          <h4>👥 Destinatari</h4>
          <div className="review-item">
            <strong>Tipo:</strong> {
              wizardData.recipientType === 'segment' ? segments[wizardData.selectedSegment]?.name :
              wizardData.recipientType === 'custom' ? 'Selezione personalizzata' :
              'Tutti i clienti'
            }
          </div>
          <div className="review-item">
            <strong>Totale destinatari:</strong> {getRecipientCount()}
          </div>
        </div>
        
        <div className="review-section">
          <h4>⏰ Programmazione</h4>
          <div className="review-item">
            <strong>Invio:</strong> {
              wizardData.sendType === 'now' ? 'Immediato' :
              `Programmato per ${wizardData.scheduledDate} alle ${wizardData.scheduledTime}`
            }
          </div>
        </div>
        
        <div className="review-section">
          <h4>⚙️ Opzioni</h4>
          <div className="review-item">
            <strong>Tracking:</strong> {wizardData.enableTracking ? '✅ Attivo' : '❌ Disattivo'}
          </div>
          <div className="review-item">
            <strong>Follow-up:</strong> {wizardData.enableFollowUp ? '✅ Attivo' : '❌ Disattivo'}
          </div>
        </div>
      </div>
      
      <div className="final-checks">
        <div className="check-item">
          <input type="checkbox" id="confirm-content" />
          <label htmlFor="confirm-content">Ho controllato il contenuto dell'email</label>
        </div>
        <div className="check-item">
          <input type="checkbox" id="confirm-recipients" />
          <label htmlFor="confirm-recipients">Ho verificato i destinatari selezionati</label>
        </div>
        <div className="check-item">
          <input type="checkbox" id="confirm-schedule" />
          <label htmlFor="confirm-schedule">Ho confermato la programmazione</label>
        </div>
      </div>
    </div>
  )
}

export default CampaignWizard