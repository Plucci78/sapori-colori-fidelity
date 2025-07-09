// ===================================
// EMAIL AUTOMATION SERVICE
// File: src/services/emailAutomation.js
// ===================================

import { supabase } from '../supabase';
import emailjs from '@emailjs/browser';
import { automaticTemplates } from '../components/Email/emailTemplates';

export const emailAutomationService = {
  // Cache delle impostazioni
  settings: null,
  milestones: null,
  lastSettingsCheck: null,
  
  // Configurazione EmailJS (usa quella del componente principale)
  EMAIL_CONFIG: {
    serviceId: 'service_f6lj74h',
    templateId: 'template_kvxg4p9',
    publicKey: 'P0A99o_tLGsOuzhDs'
  },

  // Inizializza il servizio
  async init() {
    emailjs.init(this.EMAIL_CONFIG.publicKey);
    await this.loadSettings();
  },

  // Carica impostazioni e milestone dal database
  async loadSettings(forceRefresh = false) {
    // Cache per 5 minuti
    const now = Date.now();
    if (!forceRefresh && this.lastSettingsCheck && (now - this.lastSettingsCheck) < 300000) {
      return;
    }

    try {
      // Carica settings generali
      const { data: settingsData } = await supabase
        .from('settings')
        .select('*')
        .single();
      
      this.settings = settingsData || { points_per_euro: 1 };

      // Carica milestone (se hai una tabella separata)
      // Altrimenti usa milestone predefinite che possono essere modificate
      const { data: milestonesData } = await supabase
        .from('email_milestones')
        .select('*')
        .order('threshold', { ascending: true });

      // Se non ci sono milestone nel DB, usa quelle default
      this.milestones = milestonesData?.length > 0 ? milestonesData : [
        { 
          threshold: settingsData?.milestone_1 || 50, 
          message: 'Sei un cliente speciale! Continua così per sbloccare premi esclusivi.',
          enabled: true 
        },
        { 
          threshold: settingsData?.milestone_2 || 100, 
          message: 'Incredibile! Sei entrato nel club VIP. Ti aspettano premi fantastici!',
          enabled: true 
        },
        { 
          threshold: settingsData?.milestone_3 || 150, 
          message: 'Sei una leggenda! Hai raggiunto un traguardo straordinario.',
          enabled: true 
        }
      ];

      this.lastSettingsCheck = now;
    } catch (error) {
      console.error('Errore caricamento settings automatismi:', error);
    }
  },

  // Invia email automatica
  async sendAutomaticEmail(type, customerData, additionalData = {}) {
    try {
      // Ricarica settings se necessario
      await this.loadSettings();

      const template = automaticTemplates[type];
      if (!template) {
        console.error('Template automatico non trovato:', type);
        return false;
      }

      // Prepara i dati per il template
      const templateData = {
        nome: customerData.name,
        gemme: customerData.points || 0,
        points_per_euro: this.settings?.points_per_euro || 1,
        ...additionalData
      };

      // Sostituisci variabili nel subject e HTML
      let subject = template.subject;
      let html = template.html;

      Object.keys(templateData).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, templateData[key]);
        html = html.replace(regex, templateData[key]);
      });

      // Parametri per EmailJS
      const emailParams = {
        to_name: customerData.name,
        to_email: customerData.email,
        subject: subject,
        message_html: html,
        reply_to: 'saporiecolori.b@gmail.com'
      };

      // Invia email
      await emailjs.send(
        this.EMAIL_CONFIG.serviceId,
        this.EMAIL_CONFIG.templateId,
        emailParams
      );

      // Salva log nel database
      await this.saveEmailLog(type, customerData, subject);

      console.log(`✅ Email automatica ${type} inviata a ${customerData.email}`);
      return true;

    } catch (error) {
      console.error('Errore invio email automatica:', error);
      return false;
    }
  },

  // Email di benvenuto automatica
  async sendWelcomeEmail(customer) {
    if (!customer.email) return;
    
    return await this.sendAutomaticEmail('welcome', customer);
  },

  // Controlla e invia email per milestone
  async checkAndSendMilestoneEmail(customer, oldPoints, newPoints) {
    if (!customer.email || !this.milestones) return;

    // Ricarica settings per essere sicuri di avere le milestone aggiornate
    await this.loadSettings();

    // Controlla ogni milestone
    for (const milestone of this.milestones) {
      if (!milestone.enabled) continue;

      // Se ha appena superato questa milestone
      if (oldPoints < milestone.threshold && newPoints >= milestone.threshold) {
        console.log(`🎯 Cliente ${customer.name} ha raggiunto milestone: ${milestone.threshold} GEMME`);
        
        await this.sendAutomaticEmail('milestone', 
          { ...customer, points: newPoints },
          { 
            gemme: milestone.threshold,
            message: milestone.message 
          }
        );
        
        // Puoi anche aggiornare un flag nel database per non reinviare
        await this.markMilestoneAsSent(customer.id, milestone.threshold);
      }
    }
  },

  // Segna milestone come inviata
  async markMilestoneAsSent(customerId, threshold) {
    try {
      await supabase
        .from('customer_milestones')
        .upsert({
          customer_id: customerId,
          milestone_threshold: threshold,
          sent_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Errore marking milestone:', error);
    }
  },

  // Salva log email
  async saveEmailLog(type, customer, subject) {
    try {
      await supabase
        .from('email_logs')
        .insert({
          template_name: `automatic_${type}`,
          recipient_email: customer.email,
          recipient_name: customer.name,
          subject: subject,
          status: 'sent',
          metadata: { type: 'automatic', trigger: type }
        });
    } catch (error) {
      console.error('Errore salvataggio log:', error);
    }
  },

  // Controlla tutte le automazioni per un cliente
  async checkAllAutomations(customer, eventType, oldData = {}) {
    switch (eventType) {
      case 'customer_created':
        await this.sendWelcomeEmail(customer);
        break;
        
      case 'points_updated':
        await this.checkAndSendMilestoneEmail(
          customer, 
          oldData.points || 0, 
          customer.points
        );
        break;
        
      // Puoi aggiungere altri eventi
      case 'birthday':
        // await this.sendBirthdayEmail(customer);
        break;
    }
  },

  // Metodo per testare le email (utile per debug)
  async testEmailAutomation(type = 'welcome') {
    const testCustomer = {
      name: 'Test Cliente',
      email: 'test@example.com',
      points: 100
    };

    console.log(`🧪 Test email ${type}...`);
    
    switch (type) {
      case 'welcome':
        return await this.sendWelcomeEmail(testCustomer);
      
      case 'milestone':
        return await this.sendAutomaticEmail('milestone', testCustomer, {
          gemme: 100,
          message: 'Test milestone email'
        });
      
      default:
        console.error('Tipo test non valido');
        return false;
    }
  }
};

// Esporta il servizio
export default emailAutomationService;
