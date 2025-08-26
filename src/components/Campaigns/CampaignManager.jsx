import React, { useState, useEffect } from 'react'
import { campaignService } from '../../services/campaignService'
import { supabase } from '../../supabase'
import './CampaignManager.css'

const CampaignManager = ({ showNotification }) => {
  const [campaigns, setCampaigns] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [templates, setTemplates] = useState([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [customers, setCustomers] = useState([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [selectedCustomers, setSelectedCustomers] = useState([])
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    subject: '',
    description: '',
    from_name: 'Sapori & Colori',
    reply_to: 'noreply@saporiecolori.net',
    selectedTemplate: null,
    audience_type: 'all',
    audience_filter: {}
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [campaignsData, statsData] = await Promise.all([
        campaignService.getAllCampaigns(),
        campaignService.getCampaignStats()
      ])
      
      setCampaigns(campaignsData)
      setStats(statsData)
    } catch (error) {
      console.error('Errore caricamento dati:', error)
      showNotification?.('Errore caricamento campagne', 'error')
    }
    setLoading(false)
  }

  const loadTemplates = async () => {
    setLoadingTemplates(true)
    try {
      console.log('🔄 Caricamento template...')
      const templatesData = await campaignService.getTemplates()
      console.log('📧 Template caricati RAW:', templatesData)
      console.log('📊 Numero template trovati:', templatesData?.length || 0)
      console.log('📋 Template è array?', Array.isArray(templatesData))
      console.log('📋 Templates state prima:', templates.length)
      
      if (templatesData && Array.isArray(templatesData)) {
        templatesData.forEach((template, index) => {
          console.log(`📧 Template ${index + 1} completo:`, template)
        })
        setTemplates(templatesData)
        console.log('✅ Templates impostati nel state')
      } else {
        console.log('⚠️ Templates data non valido:', typeof templatesData, templatesData)
        setTemplates([])
      }
    } catch (error) {
      console.error('Errore caricamento template:', error)
      showNotification?.('Errore caricamento template', 'error')
      setTemplates([])
    }
    setLoadingTemplates(false)
  }

  const loadCustomers = async () => {
    setLoadingCustomers(true)
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true })
      
      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('Errore caricamento clienti:', error)
      showNotification?.('Errore caricamento clienti', 'error')
    }
    setLoadingCustomers(false)
  }

  // Carica template e clienti quando si apre il modale
  const handleOpenCreateModal = () => {
    console.log('🎯 Apertura modal creazione campagna')
    setShowCreateModal(true)
    setSelectedCustomers([])
    loadTemplates()
    loadCustomers()
  }

  const handleCreateCampaign = async (e) => {
    e.preventDefault()
    
    if (!newCampaign.name.trim() || !newCampaign.subject.trim()) {
      showNotification?.('Nome campagna e oggetto sono obbligatori', 'error')
      return
    }

    try {
      // Prepara i dati della campagna includendo template e audience
      const campaignData = {
        ...newCampaign,
        template_data: newCampaign.selectedTemplate ? {
          template_id: newCampaign.selectedTemplate.id,
          template_name: newCampaign.selectedTemplate.name
        } : {},
        unlayer_design: newCampaign.selectedTemplate ? 
          newCampaign.selectedTemplate.unlayer_design : {},
        html_content: newCampaign.selectedTemplate ? 
          newCampaign.selectedTemplate.html_preview : '',
        audience_count: newCampaign.audience_type === 'all' ? 
          customers.length : 
          selectedCustomers.length,
        audience_filter: newCampaign.audience_type === 'custom' ? {
          selected_customer_ids: selectedCustomers.map(c => c.id)
        } : {}
      }
      
      const created = await campaignService.createCampaign(campaignData)
      if (created) {
        showNotification?.(`Campagna "${created.name}" creata con template!`, 'success')
        setShowCreateModal(false)
        setNewCampaign({
          name: '',
          subject: '',
          description: '',
          from_name: 'Sapori & Colori',
          reply_to: 'noreply@saporiecolori.net',
          selectedTemplate: null,
          audience_type: 'all',
          audience_filter: {}
        })
        setSelectedCustomers([])
        loadData()
      } else {
        showNotification?.('Errore creazione campagna', 'error')
      }
    } catch (error) {
      console.error('Errore creazione:', error)
      showNotification?.('Errore creazione campagna', 'error')
    }
  }

  const handleDeleteCampaign = async (campaignId) => {
    if (!confirm('Sei sicuro di voler eliminare questa campagna?')) return
    
    const success = await campaignService.deleteCampaign(campaignId)
    if (success) {
      showNotification?.('Campagna eliminata', 'success')
      loadData()
    } else {
      showNotification?.('Errore eliminazione campagna', 'error')
    }
  }

  const handleDuplicateCampaign = async (campaignId) => {
    const duplicated = await campaignService.duplicateCampaign(campaignId)
    if (duplicated) {
      showNotification?.('Campagna duplicata', 'success')
      loadData()
    } else {
      showNotification?.('Errore duplicazione campagna', 'error')
    }
  }

  const getStatusIcon = (status) => {
    const icons = {
      draft: '📝',
      scheduled: '⏰',
      sending: '📤',
      sent: '✅',
      paused: '⏸️',
      cancelled: '❌'
    }
    return icons[status] || '❓'
  }

  const getStatusColor = (status) => {
    const colors = {
      draft: '#6c757d',
      scheduled: '#ffc107',
      sending: '#007bff',
      sent: '#28a745',
      paused: '#fd7e14',
      cancelled: '#dc3545'
    }
    return colors[status] || '#6c757d'
  }

  const filteredCampaigns = campaigns.filter(campaign => {
    if (selectedFilter === 'all') return true
    return campaign.status === selectedFilter
  })

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="campaign-manager loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Caricamento campagne...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="campaign-manager">
      {/* Header */}
      <div className="campaign-header">
        <div className="header-content">
          <h1>🚀 Campaign Manager</h1>
          <p>Gestisci le tue campagne email professionali</p>
        </div>
        <button 
          className="btn-create-campaign"
          onClick={handleOpenCreateModal}
        >
          ➕ Nuova Campagna
        </button>
      </div>

      {/* Statistics Overview */}
      <div className="campaign-stats-overview">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>{stats.totalCampaigns || 0}</h3>
            <p>Campagne Totali</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <h3>{stats.draftCampaigns || 0}</h3>
            <p>Bozze</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🚀</div>
          <div className="stat-content">
            <h3>{stats.activeCampaigns || 0}</h3>
            <p>Attive</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{stats.sentCampaigns || 0}</h3>
            <p>Inviate</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📤</div>
          <div className="stat-content">
            <h3>{stats.totalSent?.toLocaleString() || 0}</h3>
            <p>Email Inviate</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <h3>{formatPercentage(stats.avgOpenRate)}</h3>
            <p>Open Rate Medio</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="campaign-filters">
        <div className="filter-tabs">
          {[
            { id: 'all', name: 'Tutte', icon: '📋' },
            { id: 'draft', name: 'Bozze', icon: '📝' },
            { id: 'scheduled', name: 'Programmate', icon: '⏰' },
            { id: 'sent', name: 'Inviate', icon: '✅' }
          ].map(filter => (
            <button
              key={filter.id}
              className={`filter-tab ${selectedFilter === filter.id ? 'active' : ''}`}
              onClick={() => setSelectedFilter(filter.id)}
            >
              <span className="filter-icon">{filter.icon}</span>
              <span className="filter-name">{filter.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns List */}
      <div className="campaigns-list">
        {filteredCampaigns.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>Nessuna campagna trovata</h3>
            <p>Crea la tua prima campagna per iniziare!</p>
            <button 
              className="btn-create-first"
              onClick={handleOpenCreateModal}
            >
              🚀 Crea Prima Campagna
            </button>
          </div>
        ) : (
          <div className="campaigns-grid">
            {filteredCampaigns.map(campaign => (
              <div key={campaign.id} className="campaign-card">
                <div className="campaign-header">
                  <div className="campaign-status">
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(campaign.status) }}
                    >
                      {getStatusIcon(campaign.status)} {campaign.status}
                    </span>
                  </div>
                  <div className="campaign-actions">
                    <button 
                      className="btn-action"
                      onClick={() => {/* TODO: Edit campaign */}}
                      title="Modifica"
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn-action"
                      onClick={() => handleDuplicateCampaign(campaign.id)}
                      title="Duplica"
                    >
                      📋
                    </button>
                    <button 
                      className="btn-action danger"
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      title="Elimina"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="campaign-content">
                  <h3 className="campaign-name">{campaign.name}</h3>
                  <p className="campaign-subject">📧 {campaign.subject}</p>
                  
                  {campaign.description && (
                    <p className="campaign-description">{campaign.description}</p>
                  )}

                  <div className="campaign-meta">
                    <div className="meta-item">
                      <span className="meta-label">Tipo:</span>
                      <span className="meta-value">{campaign.campaign_type}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Creata:</span>
                      <span className="meta-value">{formatDate(campaign.created_at)}</span>
                    </div>
                    {campaign.launched_at && (
                      <div className="meta-item">
                        <span className="meta-label">Lanciata:</span>
                        <span className="meta-value">{formatDate(campaign.launched_at)}</span>
                      </div>
                    )}
                  </div>

                  {campaign.status === 'sent' && (
                    <div className="campaign-metrics">
                      <div className="metric">
                        <span className="metric-value">{campaign.total_sent}</span>
                        <span className="metric-label">Inviate</span>
                      </div>
                      <div className="metric">
                        <span className="metric-value">{formatPercentage(campaign.open_rate)}</span>
                        <span className="metric-label">Aperture</span>
                      </div>
                      <div className="metric">
                        <span className="metric-value">{formatPercentage(campaign.click_rate)}</span>
                        <span className="metric-label">Click</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modale Crea Campagna */}
      {showCreateModal && (
        <div 
          className="create-campaign-modal-overlay"
          onClick={() => setShowCreateModal(false)}
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
            className="create-campaign-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '16px',
              width: '90%',
              maxWidth: '600px',
              maxHeight: '80vh',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <button
              onClick={() => setShowCreateModal(false)}
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

            {/* Header fisso */}
            <div style={{ 
              padding: '30px 30px 0 30px',
              borderBottom: '1px solid #e9ecef',
              flexShrink: 0
            }}>
              <h2 style={{ margin: '0 0 20px 0', color: '#8B4513' }}>
                🚀 Nuova Campagna Email
              </h2>
            </div>

            {/* Contenuto scrollabile */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '20px 30px 30px 30px'
            }}>
              <form onSubmit={handleCreateCampaign}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                  Nome Campagna *
                </label>
                <input
                  type="text"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Es: Promozione Black Friday 2024"
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '14px',
                    transition: 'border-color 0.2s ease'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                  Oggetto Email *
                </label>
                <input
                  type="text"
                  value={newCampaign.subject}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Es: 🔥 Sconti fino al 50% - Black Friday!"
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                  Descrizione
                </label>
                <textarea
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrizione interna della campagna..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Template Selection */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                  📧 Template Email (opzionale)
                </label>
                
                {loadingTemplates ? (
                  <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    border: '2px dashed #e9ecef'
                  }}>
                    ⏳ Caricamento template...
                  </div>
                ) : (templates.length === 0 || !templates) ? (
                  <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    border: '2px dashed #e9ecef',
                    color: '#6c757d'
                  }}>
                    📭 Nessun template disponibile<br />
                    <small>Crea e salva un template nell'editor per usarlo qui</small>
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '12px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    padding: '10px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px'
                  }}>
                    {/* Opzione "Nessun template" */}
                    <div
                      onClick={() => setNewCampaign(prev => ({ ...prev, selectedTemplate: null }))}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: !newCampaign.selectedTemplate ? '2px solid #8B4513' : '2px solid #e9ecef',
                        background: !newCampaign.selectedTemplate ? '#f8f9fa' : 'white',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ fontSize: '24px', marginBottom: '5px' }}>✏️</div>
                      <div style={{ fontWeight: '600', fontSize: '12px' }}>Nessun Template</div>
                      <div style={{ fontSize: '10px', color: '#6c757d' }}>Crea da zero</div>
                    </div>
                    
                    {(() => {
                      console.log('🎨 RENDERING TEMPLATE MAP - Templates:', templates.length, templates)
                      return templates.map((template) => (
                        <div
                        key={template.id}
                        onClick={() => setNewCampaign(prev => ({ ...prev, selectedTemplate: template }))}
                        style={{
                          padding: '12px',
                          borderRadius: '8px',
                          border: newCampaign.selectedTemplate?.id === template.id ? '2px solid #8B4513' : '2px solid #e9ecef',
                          background: newCampaign.selectedTemplate?.id === template.id ? '#f8f9fa' : 'white',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ fontSize: '24px', marginBottom: '5px' }}>📧</div>
                        <div style={{ fontWeight: '600', fontSize: '12px', marginBottom: '2px' }}>
                          {template.name}
                        </div>
                        {template.description && (
                          <div style={{ fontSize: '10px', color: '#6c757d' }}>
                            {template.description.length > 30 ? 
                              template.description.substring(0, 30) + '...' : 
                              template.description
                            }
                          </div>
                        )}
                      </div>
                      ))
                    })()}
                  </div>
                )}
                
                {newCampaign.selectedTemplate && (
                  <div style={{
                    marginTop: '10px',
                    padding: '10px 15px',
                    background: '#e8f5e8',
                    borderRadius: '6px',
                    border: '1px solid #c3e6c3',
                    fontSize: '13px'
                  }}>
                    ✅ <strong>{newCampaign.selectedTemplate.name}</strong> selezionato
                  </div>
                )}
              </div>

              {/* Audience Segmentation */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#495057' }}>
                  🎯 Pubblico Destinatario
                </label>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '15px',
                  marginBottom: '15px'
                }}>
                  {/* Tutti i clienti */}
                  <div
                    onClick={() => setNewCampaign(prev => ({ ...prev, audience_type: 'all' }))}
                    style={{
                      padding: '15px',
                      borderRadius: '10px',
                      border: newCampaign.audience_type === 'all' ? '2px solid #8B4513' : '2px solid #e9ecef',
                      background: newCampaign.audience_type === 'all' ? '#f8f9fa' : 'white',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>👥</div>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>Tutti i Clienti</div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>
                      {loadingCustomers ? 'Caricamento...' : `${customers.length} destinatari`}
                    </div>
                  </div>
                  
                  {/* Clienti selezionati */}
                  <div
                    onClick={() => setNewCampaign(prev => ({ ...prev, audience_type: 'custom' }))}
                    style={{
                      padding: '15px',
                      borderRadius: '10px',
                      border: newCampaign.audience_type === 'custom' ? '2px solid #8B4513' : '2px solid #e9ecef',
                      background: newCampaign.audience_type === 'custom' ? '#f8f9fa' : 'white',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎯</div>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>Selezione Personalizzata</div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>
                      {selectedCustomers.length} clienti selezionati
                    </div>
                  </div>
                </div>
                
                {/* Lista clienti per selezione personalizzata */}
                {newCampaign.audience_type === 'custom' && (
                  <div style={{
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    maxHeight: '250px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      padding: '15px',
                      background: '#f8f9fa',
                      borderBottom: '1px solid #e9ecef',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontWeight: '600', fontSize: '14px' }}>
                        Seleziona Clienti ({selectedCustomers.length}/{customers.length})
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedCustomers([...customers])}
                          style={{
                            padding: '6px 12px',
                            fontSize: '11px',
                            border: '1px solid #8B4513',
                            borderRadius: '4px',
                            background: 'white',
                            color: '#8B4513',
                            cursor: 'pointer'
                          }}
                        >
                          Tutti
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedCustomers([])}
                          style={{
                            padding: '6px 12px',
                            fontSize: '11px',
                            border: '1px solid #6c757d',
                            borderRadius: '4px',
                            background: 'white',
                            color: '#6c757d',
                            cursor: 'pointer'
                          }}
                        >
                          Nessuno
                        </button>
                      </div>
                    </div>
                    
                    {loadingCustomers ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>
                        ⏳ Caricamento clienti...
                      </div>
                    ) : customers.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>
                        📭 Nessun cliente trovato
                      </div>
                    ) : (
                      <div style={{
                        maxHeight: '150px',
                        overflowY: 'auto',
                        background: 'white'
                      }}>
                        {customers.map((customer) => (
                          <div
                            key={customer.id}
                            onClick={() => {
                              const isSelected = selectedCustomers.find(c => c.id === customer.id)
                              if (isSelected) {
                                setSelectedCustomers(prev => prev.filter(c => c.id !== customer.id))
                              } else {
                                setSelectedCustomers(prev => [...prev, customer])
                              }
                            }}
                            style={{
                              padding: '12px 15px',
                              borderBottom: '1px solid #f1f3f4',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              background: selectedCustomers.find(c => c.id === customer.id) ? '#f8f9fa' : 'white',
                              transition: 'background-color 0.2s ease'
                            }}
                            onMouseOver={(e) => e.target.style.background = '#f8f9fa'}
                            onMouseOut={(e) => {
                              e.target.style.background = selectedCustomers.find(c => c.id === customer.id) ? '#f8f9fa' : 'white'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={!!selectedCustomers.find(c => c.id === customer.id)}
                              readOnly
                              style={{ width: '16px', height: '16px' }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: '600', fontSize: '14px', color: '#333' }}>
                                {customer.name}
                              </div>
                              {customer.email && (
                                <div style={{ fontSize: '12px', color: '#6c757d' }}>
                                  {customer.email}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Riepilogo audience */}
                <div style={{
                  marginTop: '15px',
                  padding: '12px 15px',
                  background: '#e8f5e8',
                  borderRadius: '6px',
                  border: '1px solid #c3e6c3',
                  fontSize: '13px'
                }}>
                  📊 <strong>
                    {newCampaign.audience_type === 'all' 
                      ? `Campagna per tutti i ${customers.length} clienti`
                      : `Campagna per ${selectedCustomers.length} clienti selezionati`
                    }
                  </strong>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                    Nome Mittente
                  </label>
                  <input
                    type="text"
                    value={newCampaign.from_name}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, from_name: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      border: '2px solid #e9ecef',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                    Reply-To
                  </label>
                  <input
                    type="email"
                    value={newCampaign.reply_to}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, reply_to: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      border: '2px solid #e9ecef',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #8B4513 0%, #D4AF37 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '14px',
                    boxShadow: '0 2px 8px rgba(139, 69, 19, 0.3)'
                  }}
                >
                  🚀 Crea Campagna
                </button>
              </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CampaignManager