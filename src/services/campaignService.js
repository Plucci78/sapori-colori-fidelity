import { supabase } from '../supabase'

class CampaignService {
  // Crea una nuova campagna
  async createCampaign(campaignData) {
    try {
      const { data, error } = await supabase
        .from('email_campaigns')
        .insert([{
          name: campaignData.name,
          description: campaignData.description,
          campaign_type: campaignData.campaign_type || 'regular',
          subject: campaignData.subject,
          preview_text: campaignData.preview_text,
          from_name: campaignData.from_name,
          reply_to: campaignData.reply_to,
          template_data: campaignData.template_data || {},
          unlayer_design: campaignData.unlayer_design || {},
          html_content: campaignData.html_content,
          audience_type: campaignData.audience_type || 'all',
          audience_filter: campaignData.audience_filter || {},
          audience_count: campaignData.audience_count || 0,
          schedule_type: campaignData.schedule_type || 'now',
          scheduled_at: campaignData.scheduled_at,
          timezone: campaignData.timezone || 'Europe/Rome'
        }])
        .select()
        .single()

      if (error) {
        console.error('Errore creazione campagna:', error)
        return null
      }

      console.log('✅ Campagna creata:', data.name)
      return data
    } catch (error) {
      console.error('Errore creazione campagna:', error)
      return null
    }
  }

  // Ottieni tutte le campagne
  async getAllCampaigns(limit = 50) {
    try {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Errore caricamento campagne:', error)
        return []
      }

      return data
    } catch (error) {
      console.error('Errore caricamento campagne:', error)
      return []
    }
  }

  // Ottieni campagna per ID
  async getCampaignById(campaignId) {
    try {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()

      if (error) {
        console.error('Errore caricamento campagna:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Errore caricamento campagna:', error)
      return null
    }
  }

  // Aggiorna campagna
  async updateCampaign(campaignId, updates) {
    try {
      const { data, error } = await supabase
        .from('email_campaigns')
        .update(updates)
        .eq('id', campaignId)
        .select()
        .single()

      if (error) {
        console.error('Errore aggiornamento campagna:', error)
        return null
      }

      console.log('✅ Campagna aggiornata:', data.name)
      return data
    } catch (error) {
      console.error('Errore aggiornamento campagna:', error)
      return null
    }
  }

  // Elimina campagna
  async deleteCampaign(campaignId) {
    try {
      const { error } = await supabase
        .from('email_campaigns')
        .delete()
        .eq('id', campaignId)

      if (error) {
        console.error('Errore eliminazione campagna:', error)
        return false
      }

      console.log('✅ Campagna eliminata')
      return true
    } catch (error) {
      console.error('Errore eliminazione campagna:', error)
      return false
    }
  }

  // Duplica campagna
  async duplicateCampaign(campaignId) {
    try {
      const originalCampaign = await this.getCampaignById(campaignId)
      if (!originalCampaign) return null

      const duplicatedCampaign = {
        ...originalCampaign,
        name: `${originalCampaign.name} (Copia)`,
        status: 'draft',
        total_sent: 0,
        total_delivered: 0,
        total_opened: 0,
        total_clicked: 0,
        total_bounced: 0,
        total_unsubscribed: 0,
        open_rate: 0,
        click_rate: 0,
        bounce_rate: 0,
        unsubscribe_rate: 0,
        launched_at: null,
        completed_at: null
      }

      // Rimuovi campi che non dovrebbero essere duplicati
      delete duplicatedCampaign.id
      delete duplicatedCampaign.created_at
      delete duplicatedCampaign.updated_at

      return await this.createCampaign(duplicatedCampaign)
    } catch (error) {
      console.error('Errore duplicazione campagna:', error)
      return null
    }
  }

  // Cambia stato campagna
  async updateCampaignStatus(campaignId, newStatus) {
    return await this.updateCampaign(campaignId, { status: newStatus })
  }

  // Ottieni statistiche dashboard campagne
  async getCampaignStats() {
    try {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('status, campaign_type, total_sent, total_opened, total_clicked, open_rate, click_rate')

      if (error) {
        console.error('Errore statistiche campagne:', error)
        return {
          totalCampaigns: 0,
          activeCampaigns: 0,
          draftCampaigns: 0,
          sentCampaigns: 0,
          avgOpenRate: 0,
          avgClickRate: 0,
          totalSent: 0
        }
      }

      const stats = data.reduce((acc, campaign) => {
        acc.totalCampaigns++
        if (campaign.status === 'draft') acc.draftCampaigns++
        if (campaign.status === 'sent') acc.sentCampaigns++
        if (['scheduled', 'sending'].includes(campaign.status)) acc.activeCampaigns++
        
        acc.totalSent += campaign.total_sent || 0
        acc.totalOpenRate += campaign.open_rate || 0
        acc.totalClickRate += campaign.click_rate || 0
        
        return acc
      }, {
        totalCampaigns: 0,
        activeCampaigns: 0,
        draftCampaigns: 0,
        sentCampaigns: 0,
        totalOpenRate: 0,
        totalClickRate: 0,
        totalSent: 0
      })

      return {
        ...stats,
        avgOpenRate: stats.totalCampaigns > 0 ? stats.totalOpenRate / stats.totalCampaigns : 0,
        avgClickRate: stats.totalCampaigns > 0 ? stats.totalClickRate / stats.totalCampaigns : 0
      }
    } catch (error) {
      console.error('Errore statistiche campagne:', error)
      return {}
    }
  }

  // Gestione Template
  async saveTemplate(templateData) {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .insert([{
          name: templateData.name,
          description: templateData.description,
          category: templateData.category || 'custom',
          unlayer_design: templateData.unlayer_design,
          html_preview: templateData.html_preview,
          thumbnail_url: templateData.thumbnail_url
        }])
        .select()
        .single()

      if (error) {
        console.error('Errore salvataggio template:', error)
        return null
      }

      console.log('✅ Template salvato:', data.name)
      return data
    } catch (error) {
      console.error('Errore salvataggio template:', error)
      return null
    }
  }

  async getTemplates() {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Errore caricamento template:', error)
        return []
      }

      return data
    } catch (error) {
      console.error('Errore caricamento template:', error)
      return []
    }
  }

  // Gestione Liste Email
  async createEmailList(name, description, emails) {
    try {
      const { data, error } = await supabase
        .from('email_lists')
        .insert([{
          name,
          description,
          emails
        }])
        .select()
        .single()

      if (error) {
        console.error('Errore creazione lista:', error)
        return null
      }

      console.log('✅ Lista email creata:', data.name)
      return data
    } catch (error) {
      console.error('Errore creazione lista:', error)
      return null
    }
  }

  async getEmailLists() {
    try {
      const { data, error } = await supabase
        .from('email_lists')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Errore caricamento liste:', error)
        return []
      }

      return data
    } catch (error) {
      console.error('Errore caricamento liste:', error)
      return []
    }
  }

  // Avvia invio campagna
  async launchCampaign(campaignId, targetCustomers) {
    try {
      // Aggiorna stato a "sending"
      await this.updateCampaignStatus(campaignId, 'sending')

      // Crea record delivery per ogni destinatario
      const deliveries = targetCustomers.map(customer => ({
        campaign_id: campaignId,
        customer_id: customer.id,
        customer_email: customer.email,
        delivery_status: 'pending'
      }))

      const { error } = await supabase
        .from('campaign_deliveries')
        .insert(deliveries)

      if (error) {
        console.error('Errore creazione deliveries:', error)
        return false
      }

      // Aggiorna conteggio audience
      await this.updateCampaign(campaignId, {
        audience_count: targetCustomers.length,
        launched_at: new Date().toISOString()
      })

      console.log('✅ Campagna avviata:', campaignId)
      return true
    } catch (error) {
      console.error('Errore avvio campagna:', error)
      return false
    }
  }

  // Calcola metriche campagna usando dati reali
  async calculateCampaignMetrics(campaignId) {
    try {
      console.log(`🔢 Calcolando metriche per campagna: ${campaignId}`)

      // Conta email inviate da campaign_deliveries
      const { data: deliveries, error: deliveriesError } = await supabase
        .from('campaign_deliveries')
        .select('customer_email')
        .eq('campaign_id', campaignId)
        .eq('delivery_status', 'sent')

      if (deliveriesError) {
        console.error('Errore conteggio deliveries:', deliveriesError)
        return { totalSent: 0, totalOpened: 0, openRate: 0 }
      }

      const totalSent = deliveries?.length || 0

      // Conta aperture uniche da email_opens
      const { data: opens, error: opensError } = await supabase
        .from('email_opens')
        .select('customer_email')
        .eq('campaign_id', campaignId)

      if (opensError) {
        console.error('Errore conteggio aperture:', opensError)
      }

      const uniqueOpens = opens ? new Set(opens.map(o => o.customer_email)).size : 0
      const openRate = totalSent > 0 ? (uniqueOpens / totalSent) * 100 : 0

      console.log(`📊 Metriche campagna ${campaignId}: ${totalSent} inviate, ${uniqueOpens} aperte, ${openRate.toFixed(1)}% apertura`)

      // Aggiorna la campagna con le statistiche calcolate
      await this.updateCampaign(campaignId, {
        total_sent: totalSent,
        total_opened: uniqueOpens,
        open_rate: openRate
      })

      return { totalSent, totalOpened: uniqueOpens, openRate }
    } catch (error) {
      console.error('Errore calcolo metriche:', error)
      return { totalSent: 0, totalOpened: 0, openRate: 0 }
    }
  }
}

export const campaignService = new CampaignService()