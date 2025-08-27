import React, { useState, useEffect } from 'react'
import { campaignService } from '../../services/campaignService'
import { supabase } from '../../supabase'
import CampaignWizard from './CampaignWizard'
import './CampaignManager.css'
import { BarChart3, Rocket, CheckCircle, Send, TrendingUp, FileText, Mail, Clock, Pause, X, HelpCircle } from 'lucide-react'

const CampaignManager = ({ showNotification }) => {
  const [campaigns, setCampaigns] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [showWizard, setShowWizard] = useState(false)
  const [savedTemplates, setSavedTemplates] = useState([])
  const [customers, setCustomers] = useState([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)

  useEffect(() => {
    loadData()
    loadSavedTemplates()
    loadCustomers()
  }, [])

  const loadSavedTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSavedTemplates(data || [])
    } catch (error) {
      console.error('Errore caricamento template:', error)
      setSavedTemplates([])
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      console.log('🔄 Caricamento campagne e ricalcolo statistiche...')
      
      // Carica le campagne
      const campaignsData = await campaignService.getAllCampaigns()
      
      // Ricalcola le metriche per ogni campagna che ha dati di tracking
      console.log(`Ricalcolo metriche per ${campaignsData.length} campagne`)
      for (const campaign of campaignsData) {
        if (campaign.status === 'completed' || campaign.total_sent > 0) {
          await campaignService.calculateCampaignMetrics(campaign.id)
        }
      }
      
      // Ricarica le campagne con le statistiche aggiornate
      const [updatedCampaignsData, statsData] = await Promise.all([
        campaignService.getAllCampaigns(),
        campaignService.getCampaignStats()
      ])
      
      setCampaigns(updatedCampaignsData)
      setStats(statsData)
      console.log('Campagne e statistiche aggiornate')
    } catch (error) {
      console.error('Errore caricamento dati:', error)
      showNotification?.('Errore caricamento campagne', 'error')
    }
    setLoading(false)
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
    const iconMap = {
      draft: <FileText size={16} />,
      scheduled: <Clock size={16} />,
      sending: <Send size={16} />,
      sent: <CheckCircle size={16} style={{color: '#28a745'}} />,
      paused: <Pause size={16} style={{color: '#ffc107'}} />,
      cancelled: <X size={16} style={{color: '#dc3545'}} />
    }
    return iconMap[status] || <HelpCircle size={16} />
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
          <h1 style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <Rocket size={28} />
            Campaign Manager
          </h1>
          <p>Gestisci le tue campagne email professionali</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn-refresh"
            onClick={loadData}
            disabled={loading}
            style={{
              marginRight: '10px',
              padding: '10px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontSize: '14px'
            }}
          >
            {loading ? '🔄 Aggiornamento...' : '🔄 Aggiorna'}
          </button>
          <button 
            className="btn-create-campaign"
            onClick={() => setShowWizard(true)}
          >
            🧙‍♂️ Crea Campagna (Wizard)
          </button>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="campaign-stats-overview">
        <div className="stat-card">
          <div className="stat-icon">
            <BarChart3 size={24} />
          </div>
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
          <div className="stat-icon">
            <Rocket size={24} />
          </div>
          <div className="stat-content">
            <h3>{stats.activeCampaigns || 0}</h3>
            <p>Attive</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <h3>{stats.sentCampaigns || 0}</h3>
            <p>Inviate</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Send size={24} />
          </div>
          <div className="stat-content">
            <h3>{stats.totalSent?.toLocaleString() || 0}</h3>
            <p>Email Inviate</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <TrendingUp size={24} />
          </div>
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
            { id: 'all', name: 'Tutte', icon: <FileText size={16} /> },
            { id: 'draft', name: 'Bozze', icon: <FileText size={16} /> },
            { id: 'scheduled', name: 'Programmate', icon: <Clock size={16} /> },
            { id: 'sent', name: 'Inviate', icon: <CheckCircle size={16} /> }
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
              onClick={() => setShowWizard(true)}
            >
              🧙‍♂️ Crea Prima Campagna
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
                      <FileText size={16} />
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
                  <p className="campaign-subject" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                    <Mail size={16} />
                    {campaign.subject}
                  </p>
                  
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

      {/* Campaign Wizard */}
      {showWizard && (
        <CampaignWizard
          showNotification={showNotification}
          allCustomers={customers}
          savedTemplates={savedTemplates}
          onClose={() => {
            setShowWizard(false)
            loadData() // Ricarica i dati dopo la chiusura del wizard
          }}
        />
      )}
    </div>
  )
}

export default CampaignManager