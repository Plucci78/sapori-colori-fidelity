// ===================================
// NOTIFICATION WORKFLOW SERVICE
// File: src/services/notificationWorkflowService.js
// ===================================

import { supabase } from '../supabase';
import { oneSignalService } from './onesignalService';

export const notificationWorkflowService = {
  // Esegue workflow di notifica attivi
  async executeActiveWorkflows(triggerType, triggerData = {}) {
    try {
      console.log(`🔔 Esecuzione workflow per trigger: ${triggerType}`, triggerData);
      
      // Carica tutti i workflow attivi per questo trigger
      const { data: workflows, error } = await supabase
        .from('notification_workflows')
        .select('*')
        .eq('is_active', true)
        .eq('trigger_type', triggerType);

      if (error) {
        console.error('Errore caricamento workflow:', error);
        return { success: false, error: error.message };
      }

      if (!workflows || workflows.length === 0) {
        console.log(`📭 Nessun workflow attivo per trigger: ${triggerType}`);
        return { success: true, executed: 0 };
      }

      let executed = 0;
      let errors = [];

      // Esegue ogni workflow
      for (const workflow of workflows) {
        try {
          const result = await this.executeWorkflow(workflow, triggerData);
          if (result.success) {
            executed++;
            console.log(`✅ Workflow "${workflow.name}" eseguito con successo`);
          } else {
            errors.push(`Workflow ${workflow.name}: ${result.error}`);
          }
        } catch (workflowError) {
          console.error(`❌ Errore esecuzione workflow ${workflow.name}:`, workflowError);
          errors.push(`Workflow ${workflow.name}: ${workflowError.message}`);
        }
      }

      return {
        success: true,
        executed,
        total: workflows.length,
        errors: errors.length > 0 ? errors : null
      };

    } catch (error) {
      console.error('❌ Errore generale esecuzione workflow:', error);
      return { success: false, error: error.message };
    }
  },

  // Esegue un singolo workflow
  async executeWorkflow(workflow, triggerData = {}) {
    try {
      const nodes = JSON.parse(workflow.nodes);
      const edges = JSON.parse(workflow.edges);

      // Trova il nodo trigger
      const triggerNode = nodes.find(node => node.data.nodeType === 'trigger');
      if (!triggerNode) {
        return { success: false, error: 'Nodo trigger non trovato' };
      }

      // Trova tutti i nodi di notifica collegati al trigger
      const connectedEdges = edges.filter(edge => edge.source === triggerNode.id);
      let notificationsSent = 0;

      for (const edge of connectedEdges) {
        const targetNode = nodes.find(node => node.id === edge.target);
        if (targetNode && targetNode.data.nodeType === 'notification') {
          const result = await this.executeNotificationNode(targetNode, triggerData, workflow);
          if (result.success) {
            notificationsSent++;
          }
        }
      }

      return {
        success: true,
        notificationsSent
      };

    } catch (error) {
      console.error('❌ Errore esecuzione workflow:', error);
      return { success: false, error: error.message };
    }
  },

  // Esegue un nodo di notifica
  async executeNotificationNode(notificationNode, triggerData, workflow) {
    try {
      console.log('📱 Esecuzione nodo notifica:', notificationNode.data.label);
      
      const title = this.replacePlaceholders(
        notificationNode.data.label || 'Notifica',
        triggerData
      );
      
      const message = this.replacePlaceholders(
        notificationNode.data.description || 'Messaggio automatico',
        triggerData
      );

      console.log('📝 Titolo notifica:', title);
      console.log('📝 Messaggio notifica:', message);

      // Determina i destinatari basato sul trigger
      const recipients = await this.getRecipients(triggerData);
      
      console.log('👥 Destinatari trovati:', recipients.length, recipients);
      
      if (!recipients || recipients.length === 0) {
        console.log('📭 Nessun destinatario trovato per la notifica');
        return { success: true, recipients: 0 };
      }

      // Invia notifica direttamente tramite OneSignal API
      console.log('🔔 Invio notifica direttamente tramite OneSignal API...');
      
      const ONESIGNAL_CONFIG = {
        appId: '61a2318f-68f7-4a79-8beb-203c58bf8763',
        restApiKey: 'os_v2_app_mgrddd3i65fhtc7lea6frp4hmncfypt3q7mugmfh4hi67xyyoz3emmmkj5zd7hwbgt7qwkoxxyavzlux76q47oot2e5e6qieftmnf4a'
      };

      const notificationData = {
        app_id: ONESIGNAL_CONFIG.appId,
        headings: { en: title, it: title },
        contents: { en: message, it: message },
        include_subscription_ids: recipients,
        target_channel: "push"
      };

      let notificationResult;
      
      try {
        const response = await fetch('https://api.onesignal.com/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${ONESIGNAL_CONFIG.restApiKey}`,
            'Accept': 'application/json'
          },
          body: JSON.stringify(notificationData)
        });

        const result = await response.json();
        console.log('📊 Risposta OneSignal:', result);

        notificationResult = {
          success: response.ok && result.id,
          notificationId: result.id,
          recipients: result.recipients || recipients.length,
          error: response.ok ? null : (result.errors || 'Errore sconosciuto')
        };
        
        console.log('✅ Risultato processato:', notificationResult);
        
      } catch (fetchError) {
        console.error('❌ Errore chiamata OneSignal:', fetchError);
        notificationResult = {
          success: false,
          error: fetchError.message
        };
      }

      console.log('📊 Risultato invio notifica:', notificationResult);

      if (notificationResult.success) {
        // Salva log nel database
        await this.saveWorkflowLog(workflow.id, title, message, recipients.length);
        
        console.log(`✅ Notifica inviata con successo a ${recipients.length} destinatari`);
        return {
          success: true,
          recipients: recipients.length,
          notificationId: notificationResult.notificationId
        };
      } else {
        console.log('❌ Errore invio notifica:', notificationResult.error);
        return {
          success: false,
          error: notificationResult.error
        };
      }

    } catch (error) {
      console.error('❌ Errore esecuzione nodo notifica:', error);
      return { success: false, error: error.message };
    }
  },

  // Sostituisce placeholder nei messaggi
  replacePlaceholders(text, data) {
    let result = text;
    
    // Placeholder comuni
    const placeholders = {
      '{{nome}}': data.customerName || data.name || 'Cliente',
      '{{cliente}}': data.customerName || data.name || 'Cliente',
      '{{punti}}': data.points || data.customerPoints || '0',
      '{{livello}}': data.level || data.currentLevel || 'Bronzo',
      '{{data}}': new Date().toLocaleDateString('it-IT'),
      '{{ora}}': new Date().toLocaleTimeString('it-IT'),
      '{{milestone}}': data.milestone || '',
      '{{soglia}}': data.threshold || ''
    };

    Object.keys(placeholders).forEach(key => {
      const regex = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g');
      result = result.replace(regex, placeholders[key]);
    });

    return result;
  },

  // Ottiene lista destinatari per la notifica
  async getRecipients(triggerData) {
    try {
      console.log('🔍 Ricerca destinatari per notifica...');
      
      // Prima prova: cerca admin con OneSignal attivo
      const { data: admins, error: adminError } = await supabase
        .from('customers')
        .select('onesignal_subscription_id')
        .not('onesignal_subscription_id', 'is', null)
        .eq('is_admin', true);

      if (!adminError && admins && admins.length > 0) {
        const adminIds = admins.map(admin => admin.onesignal_subscription_id).filter(Boolean);
        console.log(`✅ Trovati ${adminIds.length} admin con OneSignal`);
        return adminIds;
      }

      console.log('⚠️ Nessun admin con OneSignal trovato, cercando tutti i clienti...');
      
      // Fallback: cerca TUTTI i clienti con OneSignal attivo
      const { data: allCustomers, error: customerError } = await supabase
        .from('customers')
        .select('onesignal_subscription_id')
        .not('onesignal_subscription_id', 'is', null)
        .limit(20);
      
      if (!customerError && allCustomers && allCustomers.length > 0) {
        const customerIds = allCustomers.map(c => c.onesignal_subscription_id).filter(Boolean);
        console.log(`✅ Trovati ${customerIds.length} clienti con OneSignal`);
        return customerIds;
      }

      console.log('⚠️ Nessun cliente con OneSignal trovato, usando ID di test...');
      
      // Ultimo fallback: usa un ID di test per sviluppo
      // Sostituisci con un vero OneSignal ID se disponibile
      return ['test-player-id-for-development'];
      
    } catch (error) {
      console.error('❌ Errore generale caricamento destinatari:', error);
      // Fallback finale per sviluppo
      return ['test-player-id-for-development'];
    }
  },

  // Salva log esecuzione workflow
  async saveWorkflowLog(workflowId, title, message, recipientsCount) {
    try {
      await supabase
        .from('workflow_logs')
        .insert({
          workflow_id: workflowId,
          title,
          message,
          recipients_count: recipientsCount,
          status: 'sent',
          executed_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Errore salvataggio log workflow:', error);
    }
  },

  // Trigger specifici per eventi comuni
  async triggerBirthdayNotifications() {
    const today = new Date();
    
    // Trova clienti con compleanno oggi
    const { data: birthdayCustomers } = await supabase
      .from('customers')
      .select('*')
      .not('birth_date', 'is', null);

    const todayBirthdays = birthdayCustomers?.filter(customer => {
      if (!customer.birth_date) return false;
      const birthDate = new Date(customer.birth_date);
      return birthDate.getMonth() === today.getMonth() && 
             birthDate.getDate() === today.getDate();
    }) || [];

    console.log(`🎂 Trovati ${todayBirthdays.length} compleanni oggi`);

    for (const customer of todayBirthdays) {
      await this.executeActiveWorkflows('birthday', {
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        points: customer.points || 0,
        level: customer.current_level || 'Bronzo'
      });
    }

    return todayBirthdays.length;
  },

  // Trigger per nuovi clienti
  async triggerNewCustomerNotification(customer) {
    return await this.executeActiveWorkflows('new_customer', {
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      points: customer.points || 0,
      level: customer.current_level || 'Bronzo'
    });
  },

  // Trigger per milestone raggiunte
  async triggerMilestoneNotification(customer, milestone) {
    return await this.executeActiveWorkflows('milestone_reached', {
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      points: customer.points || 0,
      level: customer.current_level || 'Bronzo',
      milestone,
      threshold: milestone
    });
  },

  // Trigger per scansione NFC
  async triggerNfcScanNotification(customer) {
    console.log('🔔 [DEBUG] Notifica per scansione NFC INIZIO:', customer.name);
    
    try {
      // Verifica se esistono workflow attivi per questo trigger
      const { data: workflows, error } = await supabase
        .from('notification_workflows')
        .select('id, name')
        .eq('is_active', true)
        .eq('trigger_type', 'nfc_scan');
      
      if (error) {
        console.error('❌ [DEBUG] Errore verifica workflow NFC:', error);
        return { success: false, error: error.message };
      }
      
      console.log(`📋 [DEBUG] Workflow NFC trovati: ${workflows?.length || 0}`, workflows);
      
      // Se non ci sono workflow, creiamo un workflow predefinito
      if (!workflows || workflows.length === 0) {
        console.log('⚠️ [DEBUG] Nessun workflow NFC trovato, utilizzo notifica diretta');
        
        // Troviamo i player ID del cliente e inviamo direttamente
        const { data: subscriptions } = await supabase
          .from('onesignal_subscriptions')
          .select('player_id')
          .eq('customer_id', customer.id);
        
        console.log('📱 [DEBUG] Abbonamenti OneSignal trovati:', subscriptions);
        
        if (subscriptions && subscriptions.length > 0) {
          const playerIds = subscriptions.map(sub => sub.player_id).filter(Boolean);
          
          if (playerIds.length > 0) {
            console.log('📱 [DEBUG] Invio notifica diretta ai dispositivi:', playerIds);
            
            // Invio notifica diretta tramite API OneSignal
            const ONESIGNAL_CONFIG = {
              appId: '61a2318f-68f7-4a79-8beb-203c58bf8763',
              restApiKey: 'os_v2_app_mgrddd3i65fhtc7lea6frp4hmncfypt3q7mugmfh4hi67xyyoz3emmmkj5zd7hwbgt7qwkoxxyavzlux76q47oot2e5e6qieftmnf4a'
            };
            
            const notificationData = {
              app_id: ONESIGNAL_CONFIG.appId,
              headings: { en: `Benvenuto ${customer.name}!`, it: `Benvenuto ${customer.name}!` },
              contents: { en: `Grazie per la visita! Hai ${customer.points || 0} GEMME.`, it: `Grazie per la visita! Hai ${customer.points || 0} GEMME.` },
              include_subscription_ids: playerIds,
              target_channel: "push"
            };
            
            try {
              const response = await fetch('https://api.onesignal.com/notifications', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Basic ${ONESIGNAL_CONFIG.restApiKey}`,
                  'Accept': 'application/json'
                },
                body: JSON.stringify(notificationData)
              });
              
              const result = await response.json();
              console.log('✅ [DEBUG] Risposta notifica diretta:', result);
              
              return {
                success: response.ok && result.id,
                notificationId: result.id,
                recipients: result.recipients || playerIds.length
              };
            } catch (sendError) {
              console.error('❌ [DEBUG] Errore invio notifica diretta:', sendError);
              return { success: false, error: sendError.message };
            }
          }
        }
      }
      
      // Esegui normalmente attraverso i workflow configurati
      const result = await this.executeActiveWorkflows('nfc_scan', {
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        points: customer.points || 0,
        level: customer.current_level || 'Bronzo'
      });
      
      console.log('📊 [DEBUG] Risultato workflow NFC:', result);
      return result;
    } catch (error) {
      console.error('❌ [DEBUG] Errore generale trigger NFC:', error);
      return { success: false, error: error.message };
    }
  },

  // Trigger per report settimanali
  async triggerWeeklyReport(stats) {
    return await this.executeActiveWorkflows('weekly_report', {
      newCustomers: stats.newCustomers || 0,
      totalPoints: stats.totalPoints || 0,
      totalTransactions: stats.totalTransactions || 0,
      topCustomer: stats.topCustomer || 'N/A'
    });
  },

  // Test workflow manuale
  async testWorkflow(workflowId) {
    try {
      const { data: workflow } = await supabase
        .from('notification_workflows')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (!workflow) {
        return { success: false, error: 'Workflow non trovato' };
      }

      // Dati di test
      const testData = {
        customerName: 'Test Cliente',
        customerEmail: 'test@example.com',
        points: 100,
        level: 'Oro',
        milestone: 100
      };

      const result = await this.executeWorkflow(workflow, testData);
      
      console.log(`🧪 Test workflow "${workflow.name}" completato:`, result);
      return result;

    } catch (error) {
      console.error('❌ Errore test workflow:', error);
      return { success: false, error: error.message };
    }
  }
};

export default notificationWorkflowService;