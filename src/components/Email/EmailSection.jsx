import React, { useState, useEffect } from 'react'
import EmailEnterprise from './EmailEnterprise'
import EmailStatsDashboard from './EmailStatsDashboard'
import CampaignManager from '../Campaigns/CampaignManager'
import { supabase } from '../../supabase'
import './EmailStatsDashboard.css'
import './EmailSection.css'

const EmailSection = ({ 
  onSave, 
  onSendEmail, 
  emailSubject, 
  setEmailSubject, 
  allCustomers, 
  showNotification, 
  sidebarMinimized 
}) => {
  const [activeTab, setActiveTab] = useState('composer')
  const [savedTemplates, setSavedTemplates] = useState([])

  // Carica i template salvati
  useEffect(() => {
    loadSavedTemplates()
  }, [])

  const loadSavedTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Errore caricamento template:', error)
        return
      }

      setSavedTemplates(data || [])
      console.log('✅ Template caricati:', data?.length || 0)
      console.log('📋 Template data:', data)
    } catch (error) {
      console.error('Errore caricamento template:', error)
    }
  }

  const tabs = [
    { id: 'composer', name: '✉️ Composer', icon: '✏️' },
    { id: 'campaigns', name: '🚀 Campagne', icon: '📋' },
    { id: 'statistics', name: '📊 Statistiche', icon: '📈' }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'composer':
        return (
          <EmailEnterprise
            onSave={onSave}
            onSendEmail={onSendEmail}
            emailSubject={emailSubject}
            setEmailSubject={setEmailSubject}
            allCustomers={allCustomers}
            showNotification={showNotification}
            sidebarMinimized={sidebarMinimized}
            savedTemplates={savedTemplates}
            onLoadTemplate={loadSavedTemplates} // Refresh dopo salvataggio
          />
        )
      case 'campaigns':
        return <CampaignManager showNotification={showNotification} />
      case 'statistics':
        return <EmailStatsDashboard />
      default:
        return null
    }
  }

  return (
    <div className="email-section">
      {/* Tab Navigation */}
      <div className="email-tabs-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`email-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-name">{tab.name}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="email-tab-content">
        {renderTabContent()}
      </div>
    </div>
  )
}

export default EmailSection