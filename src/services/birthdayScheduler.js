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
  async init() {
    console.log('🎂 Inizializzazione Birthday Scheduler...');
    
    // Carica ultima esecuzione dal database
    await this.loadLastRun();
    
    // Avvia controllo immediato se non è stato fatto oggi
    await this.checkTodayRun();
    
    // Programma controllo giornaliero alle 09:00
    this.scheduleDailyCheck();
    
    console.log('✅ Birthday Scheduler attivato');
  },

  // Carica ultima esecuzione dal database
  async loadLastRun() {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('last_birthday_check')
        .eq('key', 'birthday_scheduler')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Errore caricamento last_birthday_check:', error);
        return;
      }

      if (data?.last_birthday_check) {
        this.lastRun = data.last_birthday_check;
        console.log('📅 Ultima esecuzione caricata dal DB:', new Date(this.lastRun).toLocaleString('it-IT'));
      }
    } catch (error) {
      console.error('Errore caricamento last_birthday_check:', error);
    }
  },

  // Salva ultima esecuzione nel database
  async saveLastRun() {
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'birthday_scheduler',
          last_birthday_check: this.lastRun
        });

      if (error) {
        console.error('Errore salvataggio last_birthday_check:', error);
      } else {
        console.log('💾 Last run salvato nel DB:', new Date(this.lastRun).toLocaleString('it-IT'));
      }
    } catch (error) {
      console.error('Errore salvataggio last_birthday_check:', error);
    }
  },

  // Controlla se già eseguito oggi
  async checkTodayRun() {
    const now = new Date();
    const today = now.toDateString();
    const lastRunDate = this.lastRun ? new Date(this.lastRun).toDateString() : null;
    
    // Se non è mai stato eseguito oggi
    if (lastRunDate !== today) {
      // Esegui solo se è almeno mezzogiorno o se è dopo le 9:00
      const hour = now.getHours();
      if (hour >= 9) {
        console.log('🎂 Controllo compleanni non eseguito oggi, avvio...');
        await this.runBirthdayCheck();
      } else {
        console.log(`⏰ Troppo presto per controllo compleanni (${hour}:${now.getMinutes()}), aspetto le 9:00`);
      }
    } else {
      console.log('✅ Controllo compleanni già eseguito oggi');
    }
  },

  // Programma controllo giornaliero
  scheduleDailyCheck() {
    const now = new Date();
    let nextCheck;
    
    // Se sono già passate le 9:00 di oggi, programma per domani
    const todayAt9 = new Date(now);
    todayAt9.setHours(9, 0, 0, 0);
    
    if (now >= todayAt9) {
      // È già passata l'ora di oggi, programma per domani
      nextCheck = new Date(now);
      nextCheck.setDate(nextCheck.getDate() + 1);
      nextCheck.setHours(9, 0, 0, 0);
    } else {
      // Non sono ancora le 9:00 di oggi, programma per oggi
      nextCheck = todayAt9;
    }
    
    const msUntilNext = nextCheck.getTime() - now.getTime();
    
    console.log(`⏰ Prossimo controllo compleanni: ${nextCheck.toLocaleString('it-IT')}`);
    
    // Timer per il prossimo controllo
    this.dailyTimer = setTimeout(() => {
      this.runBirthdayCheck();
      
      // Programma controllo ricorrente ogni 24 ore
      this.dailyTimer = setInterval(() => {
        this.runBirthdayCheck();
      }, 24 * 60 * 60 * 1000); // 24 ore
      
    }, msUntilNext);
  },

  // Esegue controllo compleanni
  async runBirthdayCheck() {
    if (this.isRunning) {
      console.log('⏳ Controllo compleanni già in corso, skip...');
      return;
    }

    try {
      // LOGGING DETTAGLIATO PER DEBUG
      console.log('🚨 BIRTHDAY SCHEDULER - DEBUG INFO:');
      console.log(`📅 Timestamp avvio: ${new Date().toISOString()}`);
      console.log(`🔍 Chiamato da:`, new Error().stack);
      
      this.isRunning = true;
      this.lastRun = new Date().toISOString();
      await this.saveLastRun(); // Salva nel database
      
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
    let nextCheck;
    
    // Se sono già passate le 9:00 di oggi, programma per domani
    const todayAt9 = new Date(now);
    todayAt9.setHours(9, 0, 0, 0);
    
    if (now >= todayAt9) {
      // È già passata l'ora di oggi, prossimo controllo domani
      nextCheck = new Date(now);
      nextCheck.setDate(nextCheck.getDate() + 1);
      nextCheck.setHours(9, 0, 0, 0);
    } else {
      // Non sono ancora le 9:00 di oggi, prossimo controllo oggi
      nextCheck = todayAt9;
    }
    
    return nextCheck.toISOString();
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
  },

  // Reset controllo giornaliero (per test)
  async resetDailyCheck() {
    try {
      const { error } = await supabase
        .from('app_settings')
        .delete()
        .eq('key', 'birthday_scheduler');

      if (error) {
        console.error('Errore reset controllo:', error);
      }

      this.lastRun = null;
      console.log('🔄 Reset controllo giornaliero completato nel DB');
    } catch (error) {
      console.error('Errore reset controllo:', error);
    }
  }
};

// Esporta il servizio
export default birthdayScheduler;