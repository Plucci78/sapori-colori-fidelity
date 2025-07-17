// ===================================
// BIRTHDAY SCHEDULER SERVICE
// File: src/services/birthdayScheduler.js
// ===================================

import { emailAutomationService } from './emailAutomation';
import { supabase } from '../supabase';

export const birthdayScheduler = {
  // Timer per controllo giornaliero
  dailyTimer: null,
  
  // Flag per evitare esecuzioni multiple
  isRunning: false,
  
  // Ultima esecuzione
  lastRun: null,

  // Inizializza lo scheduler
  init() {
    console.log('🎂 Inizializzazione Birthday Scheduler...');
    
    // Avvia controllo immediato se non è stato fatto oggi
    this.checkTodayRun();
    
    // Programma controllo giornaliero alle 09:00
    this.scheduleDailyCheck();
    
    console.log('✅ Birthday Scheduler attivato');
  },

  // Controlla se già eseguito oggi
  async checkTodayRun() {
    const today = new Date().toDateString();
    const lastRunDate = this.lastRun ? new Date(this.lastRun).toDateString() : null;
    
    if (lastRunDate !== today) {
      console.log('🎂 Controllo compleanni non eseguito oggi, avvio...');
      await this.runBirthdayCheck();
    } else {
      console.log('✅ Controllo compleanni già eseguito oggi');
    }
  },

  // Programma controllo giornaliero
  scheduleDailyCheck() {
    // Calcola millisecondi fino alle 09:00 del giorno successivo
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    
    const msUntilTomorrow = tomorrow.getTime() - now.getTime();
    
    console.log(`⏰ Prossimo controllo compleanni: ${tomorrow.toLocaleString('it-IT')}`);
    
    // Timer per domani alle 09:00
    this.dailyTimer = setTimeout(() => {
      this.runBirthdayCheck();
      
      // Programma controllo ricorrente ogni 24 ore
      this.dailyTimer = setInterval(() => {
        this.runBirthdayCheck();
      }, 24 * 60 * 60 * 1000); // 24 ore
      
    }, msUntilTomorrow);
  },

  // Esegue controllo compleanni
  async runBirthdayCheck() {
    if (this.isRunning) {
      console.log('⏳ Controllo compleanni già in corso, skip...');
      return;
    }

    try {
      this.isRunning = true;
      this.lastRun = new Date().toISOString();
      
      console.log('🎂 Avvio controllo compleanni automatico...');
      
      // Inizializza servizio email se necessario
      await emailAutomationService.init();
      
      // Esegue processo compleanno
      const result = await emailAutomationService.processDailyBirthdays();
      
      console.log(`✅ Controllo compleanni completato: ${result.sent}/${result.total} email inviate`);
      
      // Salva statistiche (opzionale)
      await this.saveBirthdayStats(result);
      
    } catch (error) {
      console.error('❌ Errore controllo compleanni:', error);
    } finally {
      this.isRunning = false;
    }
  },

  // Salva statistiche controllo
  async saveBirthdayStats(result) {
    try {
      // Salva in localStorage per debug locale
      const stats = JSON.parse(localStorage.getItem('birthday_stats') || '[]');
      stats.push({
        date: new Date().toISOString(),
        total: result.total,
        sent: result.sent,
        error: result.error || null
      });
      
      // Mantieni solo ultimi 30 giorni
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const filteredStats = stats.filter(stat => 
        new Date(stat.date) > thirtyDaysAgo
      );
      
      localStorage.setItem('birthday_stats', JSON.stringify(filteredStats));
      
    } catch (error) {
      console.error('Errore salvataggio stats:', error);
    }
  },

  // Forza controllo manuale
  async forceCheck() {
    console.log('🔄 Forzatura controllo compleanni manuale...');
    await this.runBirthdayCheck();
  },

  // Arresta scheduler
  stop() {
    if (this.dailyTimer) {
      clearTimeout(this.dailyTimer);
      clearInterval(this.dailyTimer);
      this.dailyTimer = null;
    }
    console.log('⏹️ Birthday Scheduler arrestato');
  },

  // Status scheduler
  getStatus() {
    return {
      active: !!this.dailyTimer,
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      nextRun: this.getNextRunTime()
    };
  },

  // Calcola prossima esecuzione
  getNextRunTime() {
    if (!this.dailyTimer) return null;
    
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    
    return tomorrow.toISOString();
  },

  // Test manuale
  async testBirthdayEmail(customerEmail) {
    try {
      console.log(`🧪 Test email compleanno per ${customerEmail}...`);
      
      // Trova cliente per email
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('email', customerEmail)
        .single();
      
      if (!customer) {
        console.error('Cliente non trovato');
        return false;
      }
      
      await emailAutomationService.init();
      const success = await emailAutomationService.sendBirthdayEmail(customer);
      
      console.log(success ? '✅ Test completato' : '❌ Test fallito');
      return success;
      
    } catch (error) {
      console.error('Errore test:', error);
      return false;
    }
  }
};

// Esporta il servizio
export default birthdayScheduler;