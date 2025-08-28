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

      // DISATTIVATO: Le milestone fisse sono state sostituite dai livelli dinamici del pannello impostazioni
      // Ora si usano solo i livelli configurabili (Oro, Argento, Platino, etc.)
      this.milestones = milestonesData?.length > 0 ? milestonesData : [];

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

  // Email compleanno automatica
  async sendBirthdayEmail(customer) {
    if (!customer.email) return;
    
    console.log(`🎂 Invio email compleanno a ${customer.name}`);
    return await this.sendAutomaticEmail('birthday', customer);
  },

  // Trova clienti con compleanno oggi
  async getTodayBirthdays() {
    try {
      // Approccio semplice: scarica tutti e filtra in JavaScript
      const { data: allCustomers, error } = await supabase
        .from('customers')
        .select('*')
        .not('email', 'is', null)
        .not('birth_date', 'is', null);
      
      if (error) throw error;
      
      const today = new Date();
      const todayMonth = today.getMonth();
      const todayDay = today.getDate();
      
      const todayBirthdays = allCustomers.filter(customer => {
        if (!customer.birth_date) return false;
        const birthDate = new Date(customer.birth_date);
        return birthDate.getMonth() === todayMonth && 
               birthDate.getDate() === todayDay;
      });
      
      console.log(`🎂 Trovati ${todayBirthdays.length} compleanni oggi`);
      return todayBirthdays;
      
    } catch (error) {
      console.error('Errore ricerca compleanni:', error);
      return [];
    }
  },

  // Trova clienti con compleanno questo mese
  async getThisMonthBirthdays() {
    try {
      // Approccio semplice: scarica tutti e filtra in JavaScript
      const { data: allCustomers, error } = await supabase
        .from('customers')
        .select('*')
        .not('email', 'is', null)
        .not('birth_date', 'is', null);
      
      if (error) throw error;
      
      const today = new Date();
      const thisMonth = today.getMonth();
      
      const thisMonthBirthdays = allCustomers.filter(customer => {
        if (!customer.birth_date) return false;
        const birthDate = new Date(customer.birth_date);
        return birthDate.getMonth() === thisMonth;
      });
      
      console.log(`🎂 Trovati ${thisMonthBirthdays.length} compleanni questo mese`);
      return thisMonthBirthdays;
      
    } catch (error) {
      console.error('Errore ricerca compleanni mese:', error);
      return [];
    }
  },

  // Controlla se email compleanno già inviata oggi
  async isBirthdayEmailSentToday(customerId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .eq('template_name', 'automatic_birthday')
        .eq('metadata->customer_id', customerId)
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`);

      return data && data.length > 0;
    } catch (error) {
      console.error('Errore controllo email compleanno:', error);
      return false;
    }
  },

  // Processo completo compleanni giornaliero
  async processDailyBirthdays() {
    try {
      console.log('🎂 Inizio controllo compleanni giornaliero...');
      
      const birthdayCustomers = await this.getTodayBirthdays();
      let emailsSent = 0;
      
      for (const customer of birthdayCustomers) {
        // Controlla se email già inviata oggi
        const alreadySent = await this.isBirthdayEmailSentToday(customer.id);
        
        if (!alreadySent) {
          const success = await this.sendBirthdayEmail(customer);
          if (success) {
            emailsSent++;
            // Salva log specifico per compleanno
            await this.saveBirthdayLog(customer);
          }
          
          // Pausa di 1 secondo tra email per evitare rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.log(`📧 Email compleanno già inviata oggi per ${customer.name}`);
        }
      }
      
      console.log(`✅ Processo compleanni completato: ${emailsSent} email inviate`);
      return { total: birthdayCustomers.length, sent: emailsSent };
      
    } catch (error) {
      console.error('Errore processo compleanni:', error);
      return { total: 0, sent: 0, error: error.message };
    }
  },

  // Salva log specifico per compleanno
  async saveBirthdayLog(customer) {
    try {
      console.log('💾 Tentativo salvataggio log compleanno per:', customer.name);
      
      const logEntry = {
        template_name: 'automatic_birthday',
        recipient_email: customer.email,
        recipient_name: customer.name,
        subject: `Tanti auguri ${customer.name}! 🎉`,
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: { 
          type: 'automatic', 
          trigger: 'birthday',
          customer_id: customer.id,
          birth_date: customer.birth_date
        }
      };
      
      console.log('💾 Dati log da inserire:', logEntry);
      
      const { data, error } = await supabase
        .from('email_logs')
        .insert(logEntry);
        
      if (error) {
        console.error('❌ Errore inserimento log compleanno:', error);
        console.error('❌ Dettagli errore:', error.message, error.details);
      } else {
        console.log('✅ Log compleanno salvato con successo:', data);
      }
      
    } catch (error) {
      console.error('💥 Errore generale salvataggio log compleanno:', error);
    }
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
        await this.sendBirthdayEmail(customer);
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
