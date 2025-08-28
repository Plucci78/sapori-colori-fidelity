// ===================================
// WORKFLOW EXECUTOR SERVICE
// File: src/services/workflowExecutor.js
// ===================================

import { supabase } from '../supabase';
import { emailAutomationService } from './emailAutomation';

export const workflowExecutor = {
  // Cache dei workflows attivi
  activeWorkflows: new Map(),
  
  // Inizializza il servizio
  async init() {
    console.log('🚀 Inizializzazione Workflow Executor...');
    await this.loadActiveWorkflows();
    console.log('✅ Workflow Executor attivato');
  },

  // Carica tutti i workflows attivi
  async loadActiveWorkflows() {
    try {
      const { data: workflows, error } = await supabase
        .from('email_workflows')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      
      this.activeWorkflows.clear();
      workflows.forEach(workflow => {
        const nodes = typeof workflow.nodes === 'string' 
          ? JSON.parse(workflow.nodes) 
          : workflow.nodes;
        const edges = typeof workflow.edges === 'string' 
          ? JSON.parse(workflow.edges) 
          : workflow.edges;
          
        this.activeWorkflows.set(workflow.id, {
          ...workflow,
          nodes,
          edges
        });
      });
      
      console.log(`📊 Caricati ${this.activeWorkflows.size} workflows attivi`);
    } catch (error) {
      console.error('Errore caricamento workflows:', error);
    }
  },

  // Esegue tutti i workflows che hanno un trigger specifico
  async executeTrigger(triggerType, customerData, additionalData = {}) {
    console.log(`🎯 Trigger eseguito: ${triggerType}`, customerData?.name || 'N/A');
    
    const matchingWorkflows = Array.from(this.activeWorkflows.values()).filter(workflow => {
      const triggerNodes = workflow.nodes.filter(node => 
        node.data.realTrigger === triggerType
      );
      return triggerNodes.length > 0;
    });
    
    console.log(`📋 Trovati ${matchingWorkflows.length} workflows per trigger ${triggerType}`);
    
    for (const workflow of matchingWorkflows) {
      try {
        await this.executeWorkflow(workflow, customerData, additionalData);
      } catch (error) {
        console.error(`Errore esecuzione workflow ${workflow.name}:`, error);
      }
    }
  },

  // Esegue un singolo workflow
  async executeWorkflow(workflow, customerData, additionalData = {}) {
    console.log(`🔄 Esecuzione workflow: ${workflow.name}`);
    
    // Trova il nodo trigger iniziale
    const triggerNodes = workflow.nodes.filter(node => 
      node.data.nodeType.startsWith('trigger')
    );
    
    if (triggerNodes.length === 0) {
      console.warn('⚠️ Nessun trigger trovato nel workflow');
      return;
    }
    
    // Inizia dall'primo trigger
    const startNode = triggerNodes[0];
    await this.executeNode(startNode, workflow, customerData, additionalData);
  },

  // Esegue un singolo nodo
  async executeNode(node, workflow, customerData, additionalData = {}) {
    console.log(`⚡ Esecuzione nodo: ${node.data.label}`);
    
    try {
      let result = true;
      
      switch (node.data.nodeType) {
        case 'email':
          result = await this.executeEmailNode(node, customerData);
          break;
          
        case 'condition':
          result = await this.executeConditionNode(node, customerData);
          break;
          
        case 'delay':
          result = await this.executeDelayNode(node);
          break;
          
        case 'action':
          result = await this.executeActionNode(node, customerData);
          break;
          
        default:
          console.log(`📝 Nodo ${node.data.nodeType} eseguito (placeholder)`);
      }
      
      // Se il nodo è stato eseguito con successo, procedi ai nodi successivi
      if (result) {
        const nextNodes = this.getNextNodes(node.id, workflow);
        for (const nextNode of nextNodes) {
          await this.executeNode(nextNode, workflow, customerData, additionalData);
        }
      }
      
    } catch (error) {
      console.error(`Errore esecuzione nodo ${node.data.label}:`, error);
    }
  },

  // Trova i nodi successivi basandosi sugli edges
  getNextNodes(nodeId, workflow) {
    const outgoingEdges = workflow.edges.filter(edge => edge.source === nodeId);
    return outgoingEdges.map(edge => 
      workflow.nodes.find(node => node.id === edge.target)
    ).filter(Boolean);
  },

  // Esegue nodo email
  async executeEmailNode(node, customerData) {
    if (!customerData?.email) {
      console.warn('⚠️ Cliente senza email, skip nodo email');
      return false;
    }
    
    const config = node.data.config || {};
    
    try {
      await emailAutomationService.init();
      
      // Determina il tipo di template
      let templateType = 'custom';
      if (config.template === 'welcome') templateType = 'welcome';
      else if (config.template === 'birthday') templateType = 'birthday';
      else if (config.template === 'milestone') templateType = 'milestone';
      
      const success = await emailAutomationService.sendAutomaticEmail(
        templateType, 
        customerData,
        {
          customSubject: config.subject,
          customContent: config.content,
          ...config
        }
      );
      
      console.log(`📧 Email inviata: ${success ? 'successo' : 'fallimento'}`);
      return success;
      
    } catch (error) {
      console.error('Errore invio email workflow:', error);
      return false;
    }
  },

  // Esegue nodo condizione
  async executeConditionNode(node, customerData) {
    const config = node.data.config || {};
    const { field, operator, value } = config;
    
    let customerValue;
    
    // Estrai valore dal cliente
    switch (field) {
      case 'points':
        customerValue = customerData.points || 0;
        break;
      case 'email':
        customerValue = customerData.email;
        break;
      case 'phone':
        customerValue = customerData.phone;
        break;
      case 'birth_date':
        customerValue = customerData.birth_date;
        break;
      default:
        customerValue = customerData[field];
    }
    
    let result = false;
    const compareValue = isNaN(value) ? value : parseInt(value);
    
    // Applica operatore
    switch (operator) {
      case 'gt':
        result = customerValue > compareValue;
        break;
      case 'lt':
        result = customerValue < compareValue;
        break;
      case 'eq':
        result = customerValue == compareValue;
        break;
      case 'exists':
        result = customerValue != null && customerValue !== '';
        break;
    }
    
    console.log(`🔀 Condizione: ${customerValue} ${operator} ${compareValue} = ${result}`);
    return result;
  },

  // Esegue nodo delay
  async executeDelayNode(node) {
    const config = node.data.config || {};
    const { amount = 1, unit = 'minutes' } = config;
    
    let milliseconds = amount * 1000; // default seconds
    
    switch (unit) {
      case 'minutes':
        milliseconds = amount * 60 * 1000;
        break;
      case 'hours':
        milliseconds = amount * 60 * 60 * 1000;
        break;
      case 'days':
        milliseconds = amount * 24 * 60 * 60 * 1000;
        break;
    }
    
    console.log(`⏰ Delay: ${amount} ${unit} (${milliseconds}ms)`);
    
    // Per demo, limitiamo il delay massimo a 10 secondi
    const maxDelay = 10000;
    if (milliseconds > maxDelay) {
      console.log(`⚠️ Delay troppo lungo, limitato a ${maxDelay}ms`);
      milliseconds = maxDelay;
    }
    
    await new Promise(resolve => setTimeout(resolve, milliseconds));
    return true;
  },

  // Esegue nodo azione
  async executeActionNode(node, customerData) {
    const config = node.data.config || {};
    console.log(`⚡ Azione personalizzata:`, config);
    
    // TODO: Implementare azioni specifiche (aggiungi punti, tag, etc.)
    
    return true;
  },

  // Metodi di utilità per essere chiamati da altre parti dell'app
  
  // Trigger quando si registra un nuovo cliente
  async onCustomerRegistered(customer) {
    await this.executeTrigger('customer_registered', customer);
  },
  
  // Trigger quando si aggiungono punti
  async onPointsAdded(customer, oldPoints, newPoints) {
    await this.executeTrigger('points_added', customer, { oldPoints, newPoints });
  },
  
  // Trigger quando si raggiunge una milestone
  async onMilestoneReached(customer, milestone) {
    await this.executeTrigger('milestone_reached', customer, { milestone });
  },
  
  // Trigger quando si scansiona NFC
  async onNFCScan(customer) {
    await this.executeTrigger('nfc_scan', customer);
  },
  
  // Trigger per compleanno (chiamato dal birthday scheduler)
  async onBirthdayCheck(customer) {
    await this.executeTrigger('birthday_check', customer);
  }
};

export default workflowExecutor;