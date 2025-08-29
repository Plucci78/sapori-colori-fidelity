// ===================================
// NOTIFICATION SCHEDULER SERVICE
// File: src/services/notificationScheduler.js
// ===================================

import { notificationWorkflowService } from './notificationWorkflowService';
import { supabase } from '../supabase';

export const notificationScheduler = {
  // Timer per controlli automatici
  timers: new Map(),
  
  // Flag per evitare esecuzioni multiple
  isRunning: false,
  
  // Ultima esecuzione per ogni trigger
  lastRun: new Map(),

  // Inizializza lo scheduler
  async init() {
    console.log('🔔 Inizializzazione Notification Scheduler...');
    
    // Carica ultime esecuzioni dal database
    await this.loadLastRuns();
    
    // Avvia schedulazione per ogni tipo di trigger temporale
    await this.scheduleAllTriggers();
    
    console.log('✅ Notification Scheduler attivato');
  },

  // Carica ultime esecuzioni dal database
  async loadLastRuns() {
    try {
      const { data, error } = await supabase
        .from('scheduler_state')
        .select('*');

      if (error) {
        console.error('Errore caricamento scheduler state:', error);
        return;
      }

      data?.forEach(state => {
        this.lastRun.set(state.trigger_type, state.last_run);
      });

      console.log('📅 Ultime esecuzioni caricate:', Array.from(this.lastRun.keys()));
    } catch (error) {
      console.error('Errore caricamento scheduler state:', error);
    }
  },

  // Salva ultima esecuzione nel database
  async saveLastRun(triggerType) {
    try {
      const lastRun = new Date().toISOString();
      this.lastRun.set(triggerType, lastRun);

      const { error } = await supabase
        .from('scheduler_state')
        .upsert({
          trigger_type: triggerType,
          last_run: lastRun,
          updated_at: lastRun
        });

      if (error) {
        console.error('Errore salvataggio scheduler state:', error);
      } else {
        console.log(`💾 Last run salvato per ${triggerType}:`, new Date(lastRun).toLocaleString('it-IT'));
      }
    } catch (error) {
      console.error('Errore salvataggio scheduler state:', error);
    }
  },

  // Schedula tutti i trigger temporali
  async scheduleAllTriggers() {
    // Schedule trigger giornalieri (come i compleanni)
    this.scheduleDailyTriggers();
    
    // Schedule trigger settimanali
    this.scheduleWeeklyTriggers();
    
    // Schedule trigger mensili
    this.scheduleMonthlyTriggers();
    
    console.log('⏰ Tutti i trigger temporali sono stati schedulati');
  },

  // Schedula trigger giornalieri
  scheduleDailyTriggers() {
    const now = new Date();
    let nextRun;
    
    // Se sono già passate le 9:00 di oggi, programma per domani
    const todayAt9 = new Date(now);
    todayAt9.setHours(9, 0, 0, 0);
    
    if (now >= todayAt9) {
      nextRun = new Date(now);
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(9, 0, 0, 0);
    } else {
      nextRun = todayAt9;
    }
    
    const msUntilNext = nextRun.getTime() - now.getTime();
    
    console.log(`⏰ Prossimo controllo trigger giornalieri: ${nextRun.toLocaleString('it-IT')}`);
    
    // Timer per il prossimo controllo
    const dailyTimer = setTimeout(() => {
      this.runDailyTriggers();
      
      // Programma controllo ricorrente ogni 24 ore
      const recurringTimer = setInterval(() => {
        this.runDailyTriggers();
      }, 24 * 60 * 60 * 1000); // 24 ore
      
      this.timers.set('daily_recurring', recurringTimer);
      
    }, msUntilNext);
    
    this.timers.set('daily_initial', dailyTimer);
  },

  // Schedula trigger settimanali (ogni lunedì alle 9:00)
  scheduleWeeklyTriggers() {
    const now = new Date();
    let nextMonday = new Date(now);
    
    // Calcola il prossimo lunedì
    const daysUntilMonday = (1 - now.getDay() + 7) % 7;
    if (daysUntilMonday === 0 && now.getHours() >= 9) {
      // È già lunedì e sono passate le 9, vai al prossimo lunedì
      nextMonday.setDate(now.getDate() + 7);
    } else {
      nextMonday.setDate(now.getDate() + daysUntilMonday);
    }
    
    nextMonday.setHours(9, 0, 0, 0);
    
    const msUntilNext = nextMonday.getTime() - now.getTime();
    
    console.log(`⏰ Prossimo controllo trigger settimanali: ${nextMonday.toLocaleString('it-IT')}`);
    
    const weeklyTimer = setTimeout(() => {
      this.runWeeklyTriggers();
      
      // Programma controllo ricorrente ogni settimana
      const recurringTimer = setInterval(() => {
        this.runWeeklyTriggers();
      }, 7 * 24 * 60 * 60 * 1000); // 7 giorni
      
      this.timers.set('weekly_recurring', recurringTimer);
      
    }, msUntilNext);
    
    this.timers.set('weekly_initial', weeklyTimer);
  },

  // Schedula trigger mensili (primo giorno del mese alle 9:00)
  scheduleMonthlyTriggers() {
    const now = new Date();
    let nextMonth = new Date(now);
    
    // Calcola il primo giorno del prossimo mese
    if (now.getDate() === 1 && now.getHours() < 9) {
      // È già il primo del mese ma prima delle 9
      nextMonth.setHours(9, 0, 0, 0);
    } else {
      // Vai al primo del prossimo mese
      nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
      nextMonth.setHours(9, 0, 0, 0);
    }
    
    const msUntilNext = nextMonth.getTime() - now.getTime();
    
    console.log(`⏰ Prossimo controllo trigger mensili: ${nextMonth.toLocaleString('it-IT')}`);
    
    const monthlyTimer = setTimeout(() => {
      this.runMonthlyTriggers();
      
      // Programma controllo ricorrente ogni mese
      const recurringTimer = setInterval(() => {
        this.runMonthlyTriggers();
      }, 30 * 24 * 60 * 60 * 1000); // 30 giorni (approssimativo)
      
      this.timers.set('monthly_recurring', recurringTimer);
      
    }, msUntilNext);
    
    this.timers.set('monthly_initial', monthlyTimer);
  },

  // Esegue trigger giornalieri
  async runDailyTriggers() {
    if (this.isRunning) return;
    
    try {
      this.isRunning = true;
      console.log('🌅 Esecuzione trigger giornalieri...');
      
      const today = new Date().toDateString();
      const lastDailyRun = this.lastRun.get('daily');
      const lastRunDate = lastDailyRun ? new Date(lastDailyRun).toDateString() : null;
      
      // Evita esecuzioni multiple nello stesso giorno
      if (lastRunDate === today) {
        console.log('✅ Trigger giornalieri già eseguiti oggi');
        return;
      }
      
      // Esegue compleanni
      await this.runBirthdayTriggers();
      
      // Esegue altri trigger giornalieri
      await notificationWorkflowService.executeActiveWorkflows('daily', {
        date: new Date().toLocaleDateString('it-IT'),
        time: new Date().toLocaleTimeString('it-IT')
      });
      
      await this.saveLastRun('daily');
      console.log('✅ Trigger giornalieri completati');
      
    } catch (error) {
      console.error('❌ Errore trigger giornalieri:', error);
    } finally {
      this.isRunning = false;
    }
  },

  // Esegue trigger settimanali
  async runWeeklyTriggers() {
    try {
      console.log('📅 Esecuzione trigger settimanali...');
      
      // Calcola statistiche settimana passata
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      
      const stats = await this.calculateWeeklyStats(lastWeek);
      
      await notificationWorkflowService.executeActiveWorkflows('weekly', stats);
      await this.saveLastRun('weekly');
      
      console.log('✅ Trigger settimanali completati');
      
    } catch (error) {
      console.error('❌ Errore trigger settimanali:', error);
    }
  },

  // Esegue trigger mensili
  async runMonthlyTriggers() {
    try {
      console.log('📆 Esecuzione trigger mensili...');
      
      // Calcola statistiche mese passato
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      
      const stats = await this.calculateMonthlyStats(lastMonth);
      
      await notificationWorkflowService.executeActiveWorkflows('monthly', stats);
      await this.saveLastRun('monthly');
      
      console.log('✅ Trigger mensili completati');
      
    } catch (error) {
      console.error('❌ Errore trigger mensili:', error);
    }
  },

  // Esegue trigger compleanno
  async runBirthdayTriggers() {
    try {
      console.log('🎂 Controllo compleanni...');
      const birthdayCount = await notificationWorkflowService.triggerBirthdayNotifications();
      console.log(`🎂 Processati ${birthdayCount} compleanni`);
    } catch (error) {
      console.error('❌ Errore trigger compleanni:', error);
    }
  },

  // Calcola statistiche settimanali
  async calculateWeeklyStats(fromDate) {
    try {
      const from = fromDate.toISOString().split('T')[0];
      const to = new Date().toISOString().split('T')[0];
      
      // Query per nuovi clienti
      const { data: newCustomers } = await supabase
        .from('customers')
        .select('id')
        .gte('created_at', `${from}T00:00:00`)
        .lt('created_at', `${to}T23:59:59`);
      
      // Query per transazioni (se hai una tabella transazioni)
      // const { data: transactions } = await supabase
      //   .from('transactions')
      //   .select('*')
      //   .gte('created_at', from)
      //   .lt('created_at', to);
      
      return {
        newCustomers: newCustomers?.length || 0,
        // totalTransactions: transactions?.length || 0,
        // totalPoints: transactions?.reduce((sum, t) => sum + (t.points || 0), 0) || 0,
        totalTransactions: 0,
        totalPoints: 0,
        period: `${fromDate.toLocaleDateString('it-IT')} - ${new Date().toLocaleDateString('it-IT')}`
      };
    } catch (error) {
      console.error('Errore calcolo statistiche settimanali:', error);
      return {
        newCustomers: 0,
        totalTransactions: 0,
        totalPoints: 0,
        period: 'N/A'
      };
    }
  },

  // Calcola statistiche mensili
  async calculateMonthlyStats(fromDate) {
    // Simile a calculateWeeklyStats ma per periodo mensile
    return await this.calculateWeeklyStats(fromDate);
  },

  // Forza esecuzione trigger manuale
  async forceTrigger(triggerType) {
    console.log(`🔄 Forzatura trigger ${triggerType}...`);
    
    switch (triggerType) {
      case 'daily':
        await this.runDailyTriggers();
        break;
      case 'weekly':
        await this.runWeeklyTriggers();
        break;
      case 'monthly':
        await this.runMonthlyTriggers();
        break;
      case 'birthday':
        await this.runBirthdayTriggers();
        break;
      default:
        console.log(`❌ Tipo trigger non riconosciuto: ${triggerType}`);
    }
  },

  // Arresta scheduler
  stop() {
    this.timers.forEach((timer, key) => {
      clearTimeout(timer);
      clearInterval(timer);
      console.log(`⏹️ Timer ${key} arrestato`);
    });
    this.timers.clear();
    console.log('⏹️ Notification Scheduler arrestato');
  },

  // Status scheduler
  getStatus() {
    return {
      active: this.timers.size > 0,
      isRunning: this.isRunning,
      timers: Array.from(this.timers.keys()),
      lastRuns: Object.fromEntries(this.lastRun)
    };
  }
};

export default notificationScheduler;