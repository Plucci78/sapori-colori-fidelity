import { useState, useEffect, useCallback, memo, useRef } from 'react'
import { supabase } from './supabase'
import emailjs from '@emailjs/browser'
import './App.css'

// ===================================
// AUTH SYSTEM IMPORTS (AGGIUNTI)
// ===================================
import { AuthProvider, useAuth } from './auth/AuthContext'
import LoginForm from './auth/LoginForm'
import { ProtectedComponent } from './auth/ProtectedComponent'
import { usePermissions } from './hooks/usePermissions'
import { activityService } from './services/activityService'
import { emailQuotaService } from './services/emailQuotaService'
import { playGemmeSound } from './utils/soundUtils'
import { getLevelsForEmails, checkLevelUpForEmail, generateLevelEmailContent } from './utils/levelEmailUtils'

// Test component import
import LevelsTest from './components/Test/LevelsTest'

// Import dei componenti (ESISTENTI)
import AdvancedAnalytics from './components/Analytics/AdvancedAnalytics'
import NotificationContainer from './components/Common/NotificationContainer'
import DashboardView from './components/Dashboard/DashboardView'
import CustomerView from './components/Customers/CustomerView'
import EmailView from './components/Email/EmailView'
import PrizesView from './components/Prizes/PrizesView'
import SettingsView from './components/Settings/SettingsView'
import NFCViewSimpleVertical from './components/NFC/NFCViewSimpleVertical'
import ClientPortal from './components/Clients/ClientPortal'
import CouponManagement from './components/Coupons/CouponManagement'
import { generateClientToken, isValidToken } from './utils/tokenUtils'
import nfcService from './services/nfcService'

// ===================================
// COMPONENTE APP PRINCIPALE (con auth)
// ===================================
function AppContent() {
  // ===================================
  // AUTH HOOKS (AGGIUNTI)
  // ===================================
  const { isAuthenticated, loading: authLoading, profile, signOut } = useAuth()
  const { permissions, userRole, userName } = usePermissions()

  // Funzione per controllare se il multiplier è attivo (weekend per ora)
  const checkMultiplierActive = () => {
    const today = new Date().getDay();
    return today === 0 || today === 6; // Domenica o Sabato
    // In futuro: return settings?.referral_multiplier_active || false;
  };
  const isMultiplierActive = checkMultiplierActive();

  // Stati per sistema referral
  const [referredFriends, setReferredFriends] = useState([]);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // ===================================
  // STATI ESISTENTI (INVARIATI)
  // ===================================
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [allCustomers, setAllCustomers] = useState([])
  const [customers, setCustomers] = useState([])

  useEffect(() => {
    // Carica tutti i clienti solo una volta all'avvio
    const loadAllCustomers = async () => {
      if (!isAuthenticated) return // ← AGGIUNTO CHECK AUTH

      const { data, error } = await supabase
        .from('customers')
        .select('*')
      if (data) {
        setAllCustomers(data)
        setCustomers(data)
      }
    }
    loadAllCustomers()
  }, [isAuthenticated]) // ← AGGIUNTA DIPENDENZA AUTH

  const [selectedCustomer, setSelectedCustomer] = useState(null)
  // Stati per gestione modifica cliente
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerEmail, setNewCustomerEmail] = useState('')
  const [transactionAmount, setTransactionAmount] = useState('')
  const [settings, setSettings] = useState({ points_per_euro: 1, points_for_prize: 10 })
  const [activeView, setActiveView] = useState('dashboard')

  // Stati per gestione manuale punti
  const [manualCustomerName, setManualCustomerName] = useState('')
  const [manualPoints, setManualPoints] = useState('')
  const [foundCustomers, setFoundCustomers] = useState([])

  // Stati per i premi
  const [prizes, setPrizes] = useState([])
  const [newPrizeName, setNewPrizeName] = useState('')
  const [newPrizeDescription, setNewPrizeDescription] = useState('')
  const [newPrizeCost, setNewPrizeCost] = useState('')
  const [customerLevels, setCustomerLevels] = useState([])
  const [nfcServiceConnected, setNfcServiceConnected] = useState(false)

  // Stati per statistiche reali
  const [todayStats, setTodayStats] = useState({
    customers: 0,
    points: 0,
    redeems: 0,
    revenue: 0
  })
  const [topCustomers, setTopCustomers] = useState([])

  // Stati per Email Marketing
  const [emailTemplate, setEmailTemplate] = useState('welcome')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailRecipients, setEmailRecipients] = useState('all')
  const [customMessage, setCustomMessage] = useState('')
  const [emailStats, setEmailStats] = useState({ sent: 0, opened: 0 })

  // Stati per selezione clienti individuali
  const [selectedIndividualCustomers, setSelectedIndividualCustomers] = useState([])
  const [showIndividualSelection, setShowIndividualSelection] = useState(false)
  const [allCustomersForEmail, setAllCustomersForEmail] = useState([])

  // Sistema notifiche moderne
  const [notifications, setNotifications] = useState([])
  const loadCustomers = async () => {
    const { data } = await supabase.from('customers').select('*')
    if (data) {
      setAllCustomers(data)
      setCustomers(data)
    }
  }
// ========== FUNZIONI SISTEMA REFERRAL ==========

// Genera codice referral unico
const generateReferralCode = (customerName) => {
  const namePart = customerName.split(' ')[0].toUpperCase().slice(0, 5).replace(/[^A-Z]/g, '');
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${namePart}-${randomPart}`;
};

// Carica lista amici invitati da un cliente CON AUTO-CORREZIONE
const loadReferredFriends = async (customerId) => {
  if (!customerId) return;
  
  try {
    console.log('🔍 loadReferredFriends chiamata per customerId:', customerId);
    
    const { data, error } = await supabase
      .from('referrals')
      .select(`
        *,
        referred:customers!referrals_referred_id_fkey(name, created_at)
      `)
      .eq('referrer_id', customerId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Errore caricamento referral:', error);
      return;
    }
    
    console.log('📊 Referral trovati per customerId', customerId, ':', data);
    console.log('📊 Numero totale referral:', data?.length || 0);
    
    // Debug dettagliato
    if (data && data.length > 0) {
      data.forEach((ref, index) => {
        console.log(`📋 Referral #${index + 1}:`, {
          id: ref.id,
          status: ref.status,
          referred_id: ref.referred_id,
          referred_name: ref.referred?.name,
          created_at: ref.created_at
        });
      });
    }
    
    setReferredFriends(data || []);
    
    // ✨ AUTO-CORREZIONE: Verifica e corregge automaticamente i dati
    await autoFixReferralData(customerId, data || []);
    
  } catch (error) {
    console.error('❌ Errore:', error);
  }
};

// Calcola il livello in base ai referral
const getReferralLevel = (count) => {
  if (count >= 20) return 'LEGGENDA';
  if (count >= 10) return 'MAESTRO';
  if (count >= 5) return 'ESPERTO';
  if (count >= 1) return 'AMICO';
  return 'NUOVO';
};

// 💎 NUOVO: Calcola punti referral con moltiplicatori di livello
const getReferralPoints = (referralCount) => {
  const level = getReferralLevel(referralCount);
  
  switch (level) {
    case 'LEGGENDA': return 40;  // +100% (20 * 2)
    case 'MAESTRO':  return 30;  // +50%  (20 * 1.5)
    case 'ESPERTO':  return 25;  // +25%  (20 * 1.25)
    case 'AMICO':    return 20;  // Base
    default:         return 20;  // Base per NUOVO
  }
};

// 🎯 NUOVO: Ottieni info complete livello referral
const getReferralLevelInfo = (count) => {
  const level = getReferralLevel(count);
  const points = getReferralPoints(count);
  const basePoints = 20;
  const multiplier = points / basePoints;
  const bonusPercent = Math.round((multiplier - 1) * 100);
  
  return {
    level,
    points,
    multiplier,
    bonusPercent,
    isBonus: bonusPercent > 0
  };
};

// Completa referral dopo il primo acquisto
const completeReferral = async (customerId) => {
  try {
    console.log('🔍 completeReferral chiamata per customerId:', customerId);
    
    // METODO MIGLIORATO: Prima cerca direttamente un referral pending
    let { data: referrals, error: referralError } = await supabase
      .from('referrals')
      .select('*')
      .eq('referred_id', customerId)
      .eq('status', 'pending');
      
    console.log('📊 Query referrals risultato:', { referrals, error: referralError });
    
    let referral = referrals && referrals.length > 0 ? referrals[0] : null;
    console.log('📊 Referral selezionato:', referral);
      
    if (!referral) {
      console.log('📊 Nessun referral pending trovato, controllo referred_by nel customer...');
      // Se non c'è referral pending, controlla se c'è un referred_by nel cliente
      // per compatibilità con clienti aggiunti manualmente
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('referred_by, name')
        .eq('id', customerId)
        .single();
        
      console.log('📊 Customer data:', { customer, error: customerError });
        
      if (!customer?.referred_by) {
        console.log('❌ Nessun referred_by trovato per il customer');
        showNotification('❌ Questo cliente non ha un referrer', 'error');
        return;
      }
      
      console.log('✨ Creando record referral mancante...');
      // Se c'è referred_by ma non il record referral, crealo
      const { data: newReferral, error: createError } = await supabase
        .from('referrals')
        .insert([{
          referrer_id: customer.referred_by,
          referred_id: customerId,
          status: 'pending',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
        
      if (createError) {
        console.error('❌ Errore creazione referral mancante:', createError);
        showNotification('❌ Errore nella creazione del referral', 'error');
        return;
      }
      
      console.log('✅ Nuovo referral creato:', newReferral);
      // Usa il nuovo referral appena creato
      referral = newReferral;
    }
    
    if (!referral) {
      console.log('❌ Nessun referral trovato dopo tutti i controlli');
      showNotification('❌ Impossibile trovare il referral', 'error');
      return;
    }
    
    console.log('✅ Procedendo con il completamento del referral:', referral);
    
    // 🎯 NUOVO: Calcola bonus con moltiplicatori di livello
    // Prima conta i referral attuali del referrer per determinare il livello
    const { data: existingReferrals } = await supabase
      .from('referrals')
      .select('id')
      .eq('referrer_id', referral.referrer_id)
      .eq('status', 'completed');
      
    const currentReferralCount = existingReferrals?.length || 0;
    const levelInfo = getReferralLevelInfo(currentReferralCount);
    const baseBonus = levelInfo.points;
    
    // Applica moltiplicatore temporaneo se attivo
    const finalBonus = isMultiplierActive ? baseBonus * 2 : baseBonus;
    
    console.log('💰 Calcolo bonus avanzato:', {
      currentReferralCount,
      level: levelInfo.level,
      baseBonus,
      bonusPercent: levelInfo.bonusPercent,
      moltiplicatoreTemporaneo: isMultiplierActive,
      finalBonus
    });
    
    // Prima recupera i dati attuali del referrer
    console.log('📝 Recuperando dati attuali del referrer ID:', referral.referrer_id);
    const { data: referrerData, error: referrerError } = await supabase
      .from('customers')
      .select('points, referral_count, referral_points_earned')
      .eq('id', referral.referrer_id)
      .single();
      
    if (referrerError) {
      console.error('❌ Errore recupero dati referrer:', referrerError);
      // Se la query fallisce, potrebbe essere che alcuni campi non esistono
      // Proviamo con solo points
      const { data: basicReferrerData, error: basicError } = await supabase
        .from('customers')
        .select('points')
        .eq('id', referral.referrer_id)
        .single();
        
      if (basicError) {
        console.error('❌ Errore anche con query base:', basicError);
        throw basicError;
      }
      
      // Usa solo i dati base disponibili
      console.log('⚠️ Usando dati base referrer:', basicReferrerData);
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          points: (basicReferrerData.points || 0) + finalBonus
        })
        .eq('id', referral.referrer_id);
        
      if (updateError) {
        console.error('❌ Errore aggiornamento punti base:', updateError);
        throw updateError;
      }
      
    } else {
      console.log('📊 Dati attuali referrer:', referrerData);
      
      // Aggiorna punti e contatori del referrer con tutti i campi disponibili
      console.log('📝 Aggiornando punti del referrer ID:', referral.referrer_id);
      const updateData = {
        points: (referrerData.points || 0) + finalBonus
      };
      
      // Aggiungi i campi aggiuntivi solo se esistono
      if ('referral_count' in referrerData) {
        updateData.referral_count = (referrerData.referral_count || 0) + 1;
      }
      if ('referral_points_earned' in referrerData) {
        updateData.referral_points_earned = (referrerData.referral_points_earned || 0) + finalBonus;
      }
      
      const { error: updateError } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', referral.referrer_id);
        
      if (updateError) {
        console.error('❌ Errore aggiornamento punti referrer:', updateError);
        throw updateError;
      }
    }
    
    console.log('✅ Punti referrer aggiornati con successo');
    
    // Marca il referral come completato
    console.log('📝 Marcando referral come completato...');
    const { error: referralUpdateError } = await supabase
      .from('referrals')
      .update({
        status: 'completed',
        points_awarded: finalBonus,
        completed_at: new Date().toISOString()
        // multiplier_applied: isMultiplierActive // RIMOSSO: campo non esiste nella tabella
      })
      .eq('id', referral.id);
      
    if (referralUpdateError) {
      console.error('❌ Errore aggiornamento referral:', referralUpdateError);
      throw referralUpdateError;
    }
    
    console.log('✅ Referral marcato come completato');
    
    // Crea transazione per tracciare il bonus
    console.log('📝 Creando transazione di tracciamento...');
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        customer_id: referral.referrer_id,
        amount: 0,
        points_earned: finalBonus,
        type: isMultiplierActive ? 'referral_bonus_2x' : 'referral_bonus'
      });
      
    if (transactionError) {
      console.error('❌ Errore creazione transazione:', transactionError);
      throw transactionError;
    }
    
    console.log('✅ Transazione creata con successo');
      
    const bonusMessage = isMultiplierActive 
      ? `🔥 Referral completato con BONUS 2X! +${finalBonus} gemme assegnate` 
      : `🎉 Referral completato! +${finalBonus} gemme assegnate`;
    showNotification(bonusMessage, 'success');
    
    console.log('🔄 Ricaricando dati clienti...');
    loadCustomers(); // Ricarica per aggiornare i punti
    console.log('🎉 completeReferral completata con successo!');
    
    // ✨ AUTO-CORREZIONE: Verifica dati dopo completamento
    setTimeout(() => {
      // Ricarica anche i referral per attivare l'auto-correzione
      loadReferredFriends(referral.referrer_id);
    }, 500);
    
  } catch (error) {
    console.error('❌ Errore completamento referral:', error);
    showNotification('❌ Errore nel completamento del referral: ' + error.message, 'error');
  }
};

// ✨ NUOVA FUNZIONE: Completa manualmente un referral
const forceCompleteReferral = async (customerId, customerName) => {
  if (!confirm(`Vuoi completare manualmente il referral per ${customerName}?\n\nQuesto assegnerà i bonus al referrer.`)) {
    return;
  }
  
  try {
    await completeReferral(customerId);
    showNotification(`✅ Referral di ${customerName} completato manualmente!`, 'success');
  } catch (error) {
    console.error('Errore forzatura referral:', error);
    showNotification('❌ Errore nel completamento del referral', 'error');
  }
};

// ========== FUNZIONE CORREZIONE DATI REFERRAL ==========

// Corregge automaticamente i dati inconsistenti dei referral (silenzioso)
const autoFixReferralData = async (customerId, referralData) => {
  try {
    // Calcola i valori corretti dai dati effettivi
    const actualCount = referralData?.length || 0;
    const completedReferrals = referralData?.filter(r => r.status === 'completed') || [];
    const actualPointsEarned = completedReferrals.reduce((sum, r) => sum + (r.points_awarded || 20), 0);
    
    // Recupera i dati attuali del cliente
    const { data: currentCustomer } = await supabase
      .from('customers')
      .select('referral_count, referral_points_earned, name')
      .eq('id', customerId)
      .single();
      
    if (!currentCustomer) return;
    
    const currentCount = currentCustomer.referral_count || 0;
    const currentPoints = currentCustomer.referral_points_earned || 0;
    
    // Verifica se serve correzione
    const needsCountFix = currentCount !== actualCount;
    const needsPointsFix = currentPoints !== actualPointsEarned;
    
    if (needsCountFix || needsPointsFix) {
      console.log('🔧 Auto-correzione necessaria per:', currentCustomer.name, {
        conteggio: `${currentCount} → ${actualCount}`,
        punti: `${currentPoints} → ${actualPointsEarned}`
      });
      
      // Aggiorna automaticamente
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          referral_count: actualCount,
          referral_points_earned: actualPointsEarned
        })
        .eq('id', customerId);
        
      if (!updateError) {
        console.log('✅ Dati referral auto-corretti silenziosamente');
        // Ricarica solo se c'è stata una modifica significativa
        if (Math.abs(currentCount - actualCount) > 0 || Math.abs(currentPoints - actualPointsEarned) > 10) {
          loadCustomers(); // Ricarica per aggiornare la UI
        }
      }
    }
  } catch (error) {
    console.log('⚠️ Auto-correzione fallita (non critico):', error);
  }
};

// Corregge i dati inconsistenti dei referral (con notifica)
const fixReferralData = async (customerId) => {
  try {
    console.log('🔧 Correggendo dati referral per customerId:', customerId);
    
    // 1. Conta i referral effettivi nella tabella referrals
    const { data: actualReferrals, error: referralsError } = await supabase
      .from('referrals')
      .select('id, status, points_awarded')
      .eq('referrer_id', customerId);
      
    if (referralsError) {
      console.error('❌ Errore nel recupero referral:', referralsError);
      return;
    }
    
    console.log('📊 Referral effettivi trovati:', actualReferrals);
    
    // 2. Calcola i valori corretti
    const actualCount = actualReferrals?.length || 0;
    const completedReferrals = actualReferrals?.filter(r => r.status === 'completed') || [];
    const actualPointsEarned = completedReferrals.reduce((sum, r) => sum + (r.points_awarded || 20), 0);
    
    console.log('📊 Valori corretti:', {
      count: actualCount,
      completed: completedReferrals.length,
      pointsEarned: actualPointsEarned
    });
    
    // 3. Aggiorna il cliente con i valori corretti
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        referral_count: actualCount,
        referral_points_earned: actualPointsEarned
      })
      .eq('id', customerId);
      
    if (updateError) {
      console.error('❌ Errore aggiornamento cliente:', updateError);
      return;
    }
    
    console.log('✅ Dati referral corretti con successo!');
    showNotification(`✅ Dati referral corretti: ${actualCount} inviti, ${actualPointsEarned} gemme`, 'success');
    
    // 4. Ricarica i dati
    loadCustomers();
    loadReferredFriends(customerId);
    
  } catch (error) {
    console.error('❌ Errore correzione dati:', error);
    showNotification('❌ Errore nella correzione dei dati', 'error');
  }
};

  // CONFIGURAZIONE EMAILJS
  const EMAIL_CONFIG = {
    serviceId: 'service_f6lj74h',
    templateId: 'template_kvxg4p9',
    publicKey: 'P0A99o_tLGsOuzhDs'
  }

  // Inizializza EmailJS
  useEffect(() => {
    if (isAuthenticated) { // ← AGGIUNTO CHECK AUTH
      emailjs.init(EMAIL_CONFIG.publicKey)
    }
  }, [isAuthenticated]) // ← AGGIUNTA DIPENDENZA AUTH

  // ===================================
  // FUNZIONE LOGOUT (AGGIUNTA)
  // ===================================
  const handleLogout = async () => {
    const confirmed = window.confirm('Sei sicuro di voler uscire?')
    if (confirmed) {
      try {
        await signOut()
        showNotification('👋 Logout effettuato con successo', 'success')
      } catch (error) {
        console.error('Logout error:', error)
        showNotification('❌ Errore durante il logout', 'error')
      }
    }
  }

  // Counter per notifiche univoche
  const notificationCounter = useRef(0);
  
  // Funzione per mostrare notifiche moderne
  const showNotification = useCallback((message, type = 'success') => {
    const id = Date.now() + (++notificationCounter.current)
    const notification = { id, message, type }
    setNotifications(prev => [...prev, notification])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 4000)
  }, [])
  // ========== FUNZIONI MODIFICA E DISATTIVAZIONE CLIENTI ==========

  // FUNZIONE 1: Disattiva Cliente
  const deactivateCustomer = async (customer) => {
    const reason = prompt(`Motivo disattivazione per ${customer.name}:`);
    if (!reason) {
      showNotification('⚠️ Inserisci un motivo per la disattivazione', 'warning');
      return;
    }
    if (confirm(`Confermi di voler disattivare ${customer.name}?`)) {
      try {
        const { error } = await supabase
          .from('customers')
          .update({
            is_active: false,
            deactivated_at: new Date().toISOString(),
            deactivation_reason: reason
          })
          .eq('id', customer.id);

        if (error) throw error;

        // Aggiorna anche il selectedCustomer se è lo stesso cliente
        if (selectedCustomer && selectedCustomer.id === customer.id) {
          setSelectedCustomer({
            ...selectedCustomer,
            is_active: false,
            deactivated_at: new Date().toISOString(),
            deactivation_reason: reason
          });
        }

        showNotification(`✅ Cliente ${customer.name} disattivato`, 'success');
        await loadCustomers(); // <--- ora funziona

      } catch (error) {
        console.error('Errore:', error);
        showNotification('❌ Errore durante la disattivazione', 'error');
      }
    }
  };

  // FUNZIONE 2: Riattiva Cliente
  const reactivateCustomer = async (customer) => {
    if (confirm(`Vuoi riattivare ${customer.name}?`)) {
      try {
        const { error } = await supabase
          .from('customers')
          .update({
            is_active: true,
            deactivated_at: null,
            deactivation_reason: null
          })
          .eq('id', customer.id);

        if (error) throw error;

        // Aggiorna anche il selectedCustomer se è lo stesso cliente
        if (selectedCustomer && selectedCustomer.id === customer.id) {
          setSelectedCustomer({
            ...selectedCustomer,
            is_active: true,
            deactivated_at: null,
            deactivation_reason: null
          });
        }

        showNotification(`✅ Cliente ${customer.name} riattivato`, 'success');
        await loadCustomers(); // <--- ora funziona

      } catch (error) {
        console.error('Errore:', error);
        showNotification('❌ Errore durante la riattivazione', 'error');
      }
    }
  };

  // FUNZIONE 3: Salva Modifiche Cliente
  const saveCustomerEdits = async () => {
    if (!editingCustomer.name || !editingCustomer.phone) {
      showNotification('⚠️ Nome e telefono sono obbligatori', 'warning');
      return;
    }

    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: editingCustomer.name,
          phone: editingCustomer.phone,
          email: editingCustomer.email,
          birth_date: editingCustomer.birth_date,
          notes: editingCustomer.notes,
          category: editingCustomer.category || 'Bronze',
          marketing_accepted: editingCustomer.marketing_accepted,
          newsletter_accepted: editingCustomer.newsletter_accepted
        })
        .eq('id', editingCustomer.id);

      if (error) throw error;

      showNotification('✅ Cliente aggiornato con successo', 'success');
      setShowEditModal(false);
      setEditingCustomer(null);
      loadCustomers();

    } catch (error) {
      console.error('Errore:', error);
      showNotification('❌ Errore durante l\'aggiornamento', 'error');
    }
  };




  // ===================================
  // MENU ITEMS CON PROTEZIONI AUTH (AGGIORNATO)
  // ===================================
  const menuItems = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      description: 'Panoramica generale',
      permission: null // Tutti possono vedere
    },
    {
      id: 'customer',
      title: 'Clienti',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      description: 'Gestione clienti e vendite',
      permission: 'canViewCustomers'
    },
    {
      id: 'prizes',
      title: 'Premi',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      description: 'Catalogo premi',
      permission: 'canManagePrizes'
    },
    {
      id: 'email',
      title: 'Email Marketing',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
        </svg>
      ),
      description: 'Campagne email',
      permission: 'canSendEmails'
    },
    {
      id: 'coupons',
      title: 'Coupon',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      description: 'Gestione coupon e offerte',
      permission: 'canManageCoupons'
    },
    {
      id: 'analytics',
      title: 'Analytics',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      description: 'Statistiche avanzate',
      permission: 'canViewStats'
    },
    {
      id: 'nfc',
      title: 'NFC',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      description: 'Gestione NFC con Android',
      permission: 'canViewCustomers'
    },
    {
      id: 'settings',
      title: 'Impostazioni',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      description: 'Configurazione sistema',
      permission: 'canViewSettings'
    }
  ]

  // ===================================
  // TUTTE LE FUNZIONI ESISTENTI (INVARIATE + LOG ACTIVITY)
  // ===================================

  // Funzione per salvare statistiche email nel database
  const saveEmailLog = useCallback(async (emailType, recipients, subject, status) => {
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .insert([{
          email_type: emailType,
          recipients_count: recipients.length,
          subject: subject,
          status: status,
          sent_at: new Date().toISOString()
        }])

      if (error) {
        console.error('Errore salvataggio log email:', error)
      }

      // ← AGGIUNTO ACTIVITY LOG
      await activityService.logEmail('EMAIL_CAMPAIGN_SENT', {
        email_type: emailType,
        recipients_count: recipients.length,
        subject: subject,
        status: status
      })
    } catch (error) {
      console.error('Errore salvataggio log email:', error)
    }
  }, [])

  // Carica statistiche email dal database
  const loadEmailStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .gte('sent_at', today + 'T00:00:00')
        .lte('sent_at', today + 'T23:59:59')

      if (data) {
        const totalSent = data.reduce((sum, log) => sum + log.recipients_count, 0)
        setEmailStats({
          sent: totalSent,
          opened: 0
        })
      }
    } catch (error) {
      console.error('Errore caricamento statistiche email:', error)
    }
  }, [])

  // Template Email HTML AGGIORNATI con GEMME
  const getEmailTemplate = useCallback((type, customerName, customMsg = '') => {
    const templates = {
      welcome: {
        subject: `Benvenuto in Sapori & Colori, ${customerName}!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%);">
            <div style="padding: 40px; text-align: center;">
              <img src="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png" alt="Sapori & Colori" style="max-width: 200px; margin-bottom: 20px;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Benvenuto ${customerName}!</h1>
            </div>
            <div style="background: white; padding: 40px; margin: 0 20px; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
              <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Il tuo viaggio nei sapori inizia qui!</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Grazie per esserti unito alla famiglia Sapori & Colori! Ora fai parte del nostro esclusivo programma fedeltà.
              </p>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #ff7e5f; margin-top: 0;">Come funziona:</h3>
                <ul style="color: #666; line-height: 1.8;">
                  <li><strong>1€ speso = 1 GEMMA guadagnata</strong></li>
                  <li><strong>Accumula GEMME e riscatta premi esclusivi</strong></li>
                  <li><strong>Offerte speciali riservate ai membri VIP</strong></li>
                </ul>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="background: linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">Vieni a trovarci!</a>
              </div>
              <p style="color: #999; font-size: 14px; text-align: center;">
                Ti aspettiamo per la tua prima visita!<br>
                Via Example 123, Roma • Tel: 06 1234567
              </p>
            </div>
          </div>
        `
      },
      points: {
        subject: `Hai raggiunto ${customMsg} GEMME!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);">
            <div style="padding: 40px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Congratulazioni ${customerName}!</h1>
              <p style="color: #fecaca; font-size: 18px;">Hai raggiunto ${customMsg} GEMME fedeltà!</p>
            </div>
            <div style="background: white; padding: 40px; margin: 0 20px; border-radius: 10px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; width: 120px, height: 120px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold; box-shadow: 0 8px 25px rgba(220, 38, 38, 0.4);">
                  ${customMsg}
                </div>
              </div>
              <h2 style="color: #333; text-align: center;">Le tue GEMME crescono!</h2>
              <p style="color: #666; text-align: center; font-size: 16px;">
                Continua così! Sei sempre più vicino ai nostri premi esclusivi.
              </p>
            </div>
          </div>
        `
      },
      promo: {
        subject: `Offerta Speciale per te, ${customerName}!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
            <div style="padding: 40px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 32px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">OFFERTA SPECIALE</h1>
              <p style="color: white; font-size: 20px; margin: 10px 0;">Solo per te, ${customerName}!</p>
            </div>
            <div style="background: white; padding: 40px; margin: 0 20px; border-radius: 10px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="background: #fa709a; color: white; padding: 20px; border-radius: 10px; display: inline-block;">
                  <h2 style="margin: 0; font-size: 24px;">SCONTO 20%</h2>
                  <p style="margin: 5px 0; font-size: 16px;">Su tutti i prodotti da forno</p>
                </div>
              </div>
              <p style="color: #666; text-align: center; font-size: 16px; margin-bottom: 20px;">
                ${customMessage || 'Approfitta di questa offerta esclusiva valida fino alla fine del mese!'}
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 18px; display: inline-block;">Vieni ora!</a>
              </div>
            </div>
          </div>
        `
      }
    }
    return templates[type]
  }, [customMessage])

  // Funzione automatica per email di benvenuto (+ ACTIVITY LOG + CONTROLLO QUOTE)
  const sendWelcomeEmail = useCallback(async (customer) => {
    if (!customer.email) return

    try {
      // ========== CONTROLLO QUOTE EMAIL ==========
      const canSend = await emailQuotaService.canSendEmails(1)
      if (!canSend.allowed) {
        console.warn(`❌ Email benvenuto non inviata a ${customer.name}: ${canSend.message}`)
        return
      }

      const template = getEmailTemplate('welcome', customer.name)

      const templateParams = {
        to_name: customer.name,
        to_email: customer.email,
        subject: template.subject,
        message_html: template.html,
        reply_to: 'saporiecolori.b@gmail.com'
      }

      await emailjs.send(
        EMAIL_CONFIG.serviceId,
        EMAIL_CONFIG.templateId,
        templateParams,
        EMAIL_CONFIG.publicKey
      )

      await saveEmailLog('welcome', [customer], template.subject, 'sent')
      showNotification(`✅ Email di benvenuto inviata a ${customer.name}!`, 'success')

      // ← AGGIUNTO ACTIVITY LOG
      await activityService.logEmail('WELCOME_EMAIL_SENT', {
        customer_id: customer.id,
        customer_name: customer.name,
        customer_email: customer.email
      })
    } catch (error) {
      console.error('Errore invio email benvenuto:', error)
      await saveEmailLog('welcome', [customer], 'Benvenuto', 'failed')
    }
  }, [getEmailTemplate, saveEmailLog, showNotification, EMAIL_CONFIG])

  // Funzione automatica per email milestone gemme DINAMICA basata sui livelli (+ ACTIVITY LOG)
  const sendPointsMilestoneEmail = useCallback(async (customer, oldPoints, newPoints) => {
    if (!customer.email) return

    try {
      // Recupera i livelli configurati
      const levels = await getLevelsForEmails()
      if (levels.length === 0) {
        console.log('Nessun livello configurato per email automatiche')
        return
      }

      // Verifica se c'è stato un level up
      const levelUpInfo = checkLevelUpForEmail(oldPoints, newPoints, levels)
      
      if (!levelUpInfo || !levelUpInfo.levelUpOccurred) {
        console.log(`Nessun level up per ${customer.name}: ${oldPoints} → ${newPoints} GEMME`)
        return
      }

      const { newLevel, isFirstLevel } = levelUpInfo
      
      // ========== CONTROLLO QUOTE EMAIL ==========
      const canSend = await emailQuotaService.canSendEmails(1)
      if (!canSend.allowed) {
        console.warn(`❌ Email milestone non inviata a ${customer.name}: ${canSend.message}`)
        return
      }
      
      console.log(`🎉 Level up per ${customer.name}: ${isFirstLevel ? 'Primo livello' : 'Nuovo livello'} ${newLevel.name}`)

      // Genera contenuto email personalizzato per il livello
      const emailContent = generateLevelEmailContent(newLevel, customer.name, newPoints)

      const templateParams = {
        to_name: customer.name,
        to_email: customer.email,
        subject: emailContent.subject,
        message_html: emailContent.html,
        reply_to: 'saporiecolori.b@gmail.com'
      }

      await emailjs.send(
        EMAIL_CONFIG.serviceId,
        EMAIL_CONFIG.templateId,
        templateParams,
        EMAIL_CONFIG.publicKey
      )

      await saveEmailLog('level_milestone', [customer], emailContent.subject, 'sent')
      showNotification(`🎉 Email livello ${newLevel.name} inviata a ${customer.name}!`, 'success')

      // ← AGGIUNTO ACTIVITY LOG
      await activityService.logEmail('LEVEL_MILESTONE_EMAIL_SENT', {
        customer_id: customer.id,
        customer_name: customer.name,
        level_name: newLevel.name,
        level_id: newLevel.id,
        gems_reached: newPoints,
        old_points: oldPoints,
        is_first_level: isFirstLevel
      })
    } catch (error) {
      console.error('Errore invio email milestone livello:', error)
      await saveEmailLog('level_milestone', [customer], `Livello ${newPoints} GEMME`, 'failed')
    }
  }, [saveEmailLog, showNotification, EMAIL_CONFIG])

  // Carica impostazioni e premi
  useEffect(() => {
    if (isAuthenticated) { // ← AGGIUNTO CHECK AUTH
      loadSettings()
      loadPrizes()
      loadTodayStats()
      loadTopCustomers()
      loadEmailStats()
      loadCustomerLevels()
    }
  }, [isAuthenticated, loadEmailStats]) // ← AGGIUNTA DIPENDENZA AUTH

  const loadCustomerLevels = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('customer_levels')
        .select('*')
        .order('min_gems');

      if (data) {
        setCustomerLevels(data);
      }
    } catch (error) {
      console.log('Errore caricamento livelli cliente:', error);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single()

      if (data) {
        setSettings(data)
        // TODO: Implementare setServerUrl in nfcService se necessario
        // if (data.nfc_server_url) {
        //   nfcService.setServerUrl(data.nfc_server_url)
        // }
      }
    } catch (error) {
      console.log('Errore caricamento impostazioni:', error)
    }
  }, [])

  const loadPrizes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('prizes')
        .select('*')
        .eq('active', true)
        .order('points_cost')

      if (data) setPrizes(data)
    } catch (error) {
      console.log('Errore caricamento premi:', error)
    }
  }, [])

  const loadTodayStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0]

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', today + 'T00:00:00')
        .lte('created_at', today + 'T23:59:59')

      if (transactions) {
        const purchases = transactions.filter(t => t.type === 'acquistare')
        const redeems = transactions.filter(t => t.type === 'riscattare')

        const uniqueCustomers = new Set(transactions.map(t => t.customer_id)).size
        const totalPoints = purchases.reduce((sum, t) => sum + t.points_earned, 0)
        const totalRevenue = purchases.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)

        setTodayStats({
          customers: uniqueCustomers,
          points: totalPoints,
          redeems: redeems.length,
          revenue: totalRevenue
        })
      }
    } catch (error) {
      console.log('Errore caricamento statistiche:', error)
    }
  }, [])

  const loadTopCustomers = useCallback(async () => {
    try {
      const { data: customers, error } = await supabase
        .from('customers')
        .select('*')
        .order('points', { ascending: false })
        .limit(5)

      if (customers) {
        setTopCustomers(customers)
      }
    } catch (error) {
      console.log('Errore caricamento top clienti:', error)
    }
  }, [])

  // Carica tutti i clienti per selezione individuale
  const loadAllCustomersForEmail = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .not('email', 'is', null)
        .order('name')

      if (data) {
        setAllCustomersForEmail(data)
      }
    } catch (error) {
      console.error('Errore caricamento clienti per email:', error)
    }
  }, [])

  // Toggle selezione cliente individuale
  const toggleIndividualCustomer = useCallback((customerId) => {
    setSelectedIndividualCustomers(prev => {
      if (prev.includes(customerId)) {
        return prev.filter(id => id !== customerId)
      } else {
        return [...prev, customerId]
      }
    })
  }, [])

  // Seleziona/Deseleziona tutti i clienti
  const toggleAllCustomers = useCallback(() => {
    if (selectedIndividualCustomers.length === allCustomersForEmail.length) {
      setSelectedIndividualCustomers([])
    } else {
      setSelectedIndividualCustomers(allCustomersForEmail.map(c => c.id))
    }
  }, [selectedIndividualCustomers.length, allCustomersForEmail])

  // Funzione invio email AGGIORNATA con selezione individuale + CONTROLLO QUOTE + segmenti
  const sendEmail = useCallback(async ({ subject, content, template, segments }) => {
    if (!subject.trim()) {
      showNotification('Inserisci l\'oggetto dell\'email', 'error')
      return
    }

    try {
      let recipients = []
      console.log('[DEBUG] Segmenti ricevuti:', segments)

      if (Array.isArray(segments) && segments.length > 0) {
        const { data: allCustomers } = await supabase
          .from('customers')
          .select('*')
          .not('email', 'is', null)
        // Mappa segmenti → filtri
        const segmentFilters = {
          all: c => !!c.email,
          vip: c => c.email && c.points >= 100,
          active: c => c.email && c.points > 0,
          inactive: c => c.email && c.points === 0,
          new: c => {
            const created = new Date(c.created_at)
            const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
            return c.email && created > weekAgo
          },
          birthday: c => false // Da implementare se serve
        }
        recipients = allCustomers.filter(c => segments.some(seg => segmentFilters[seg]?.(c)))
        console.log('[DEBUG] Destinatari trovati per segmenti:', recipients.map(c => c.email))
      } else if (emailRecipients === 'individual' && selectedIndividualCustomers.length > 0) {
        recipients = allCustomersForEmail.filter(c =>
          selectedIndividualCustomers.includes(c.id) && c.email
        )
        console.log('[DEBUG] Destinatari individuali:', recipients.map(c => c.email))
      } else {
        const { data: allCustomers } = await supabase
          .from('customers')
          .select('*')
          .not('email', 'is', null)
        switch (emailRecipients) {
          case 'all':
            recipients = allCustomers.filter(c => c.email)
            break
          case 'top':
            recipients = allCustomers.filter(c => c.email && c.points >= 50)
            break
          case 'active':
            recipients = allCustomers.filter(c => c.email && c.points > 0)
            break
          case 'inactive':
            recipients = allCustomers.filter(c => c.email && c.points === 0)
            break
        }
        console.log('[DEBUG] Destinatari per emailRecipients:', recipients.map(c => c.email))
      }

      if (recipients.length === 0) {
        showNotification('Nessun destinatario trovato per i criteri selezionati', 'error')
        console.error('[DEBUG] Nessun destinatario trovato per i criteri selezionati')
        return
      }

      // ========== CONTROLLO QUOTE EMAIL ==========
      const canSend = await emailQuotaService.canSendEmails(recipients.length)
      if (!canSend.allowed) {
        showNotification(canSend.message, 'error')
        console.error('[DEBUG] Quota email superata:', canSend.message)
        return
      }

      // Avviso se vicini al limite
      if (canSend.warning) {
        showNotification(canSend.warning, 'warning')
        console.warn('[DEBUG] Quota email quasi esaurita:', canSend.warning)
      }

      showNotification(`Invio ${recipients.length} email in corso...`, 'info')
      console.log(`[DEBUG] Invio ${recipients.length} email in corso...`)

      let successCount = 0
for (const customer of recipients) {
  try {
    // Sostituzione variabili nel subject e nel content
    let personalizedSubject = subject
      .replace(/{{nome}}/g, customer.name)
      .replace(/{{gemme}}/g, customer.points)
      .replace(/{{email}}/g, customer.email)
      .replace(/{{telefono}}/g, customer.phone || '')
      .replace(/{{negozio}}/g, 'Sapori & Colori')
      .replace(/{{data}}/g, new Date().toLocaleDateString('it-IT'))

    let personalizedContent = content
      .replace(/{{nome}}/g, customer.name)
      .replace(/{{gemme}}/g, customer.points)
      .replace(/{{email}}/g, customer.email)
      .replace(/{{telefono}}/g, customer.phone || '')
      .replace(/{{negozio}}/g, 'Sapori & Colori')
      .replace(/{{data}}/g, new Date().toLocaleDateString('it-IT'))

    const templateParams = {
      to_name: customer.name,
      to_email: customer.email,
      subject: personalizedSubject,
      message_html: personalizedContent,
      reply_to: 'saporiecolori.b@gmail.com'
    }

    await emailjs.send(
      EMAIL_CONFIG.serviceId,
      EMAIL_CONFIG.templateId,
      templateParams,
      EMAIL_CONFIG.publicKey
    )

    successCount++
    await new Promise(res => setTimeout(res, 500)) // mezzo secondo di pausa tra invii
  } catch (error) {
    console.error(`[DEBUG] Errore invio email a ${customer.name} (${customer.email}):`, error)
    showNotification(`Errore invio email a ${customer.name}: ${error?.text || error?.message || error}`, 'error')
  }
}

      await Promise.all(emailPromises)

      await saveEmailLog(template || 'custom', recipients, subject, 'sent')
      await loadEmailStats()

      if (successCount === recipients.length) {
        showNotification(`✅ Tutte le ${successCount} email inviate con successo!`, 'success')
        console.log(`[DEBUG] Tutte le ${successCount} email inviate con successo!`)
      } else {
        showNotification(`⚠️ ${successCount}/${recipients.length} email inviate correttamente`, 'info')
        console.warn(`[DEBUG] Solo ${successCount}/${recipients.length} email inviate correttamente`)
      }

      setEmailSubject('')
      setCustomMessage('')
      setSelectedIndividualCustomers([])

    } catch (error) {
      console.error('[DEBUG] Errore invio email:', error)
      await saveEmailLog(template || 'custom', [], subject, 'failed')
      showNotification('❌ Errore nell\'invio delle email: ' + (error?.message || error), 'error')
    }
  }, [
    emailRecipients,
    selectedIndividualCustomers,
    allCustomersForEmail,
    saveEmailLog,
    loadEmailStats,
    showNotification,
    EMAIL_CONFIG
  ])

  const searchCustomersForManual = useCallback(async (searchName) => {
    if (searchName.length < 2) {
      setFoundCustomers([])
      return
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .ilike('name', `%${searchName}%`)
        .limit(5)

      if (data) {
        setFoundCustomers(data)
      }
    } catch (error) {
      console.log('Errore ricerca clienti:', error)
    }
  }, [])

  // Modifica punti manualmente CON email automatica milestone (+ ACTIVITY LOG)
  const modifyPoints = useCallback(async (customer, pointsToAdd) => {
    console.log('🔧 ModifyPoints chiamata con:', { customer: customer?.name, pointsToAdd })
    
    const points = parseInt(pointsToAdd)
    console.log('🔧 Points parsato:', points)
    
    if (isNaN(points) || points === 0) {
      console.log('❌ Validazione fallita:', { isNaN: isNaN(points), isZero: points === 0 })
      showNotification('Inserisci un numero valido di GEMME', 'error')
      return
    }

    try {
      const newPoints = Math.max(0, customer.points + points)
      console.log('🔧 Nuovi punti calcolati:', { oldPoints: customer.points, points, newPoints })

      console.log('🔧 Aggiornamento database customers...')
      await supabase
        .from('customers')
        .update({ points: newPoints })
        .eq('id', customer.id)

      console.log('🔧 Inserimento transazione...')
      await supabase
        .from('transactions')
        .insert([{
          customer_id: customer.id,
          amount: 0,
          points_earned: points,
          type: points > 0 ? 'acquistare' : 'riscattare'
        }])

      console.log('🔧 Activity log...')
      // ← AGGIUNTO ACTIVITY LOG
      await activityService.logCustomer('POINTS_MODIFIED', customer.id, { points: newPoints }, { points: customer.points })

      // Nota: I suoni sono ora gestiti dal CustomerView per permettere personalizzazione

      console.log('🔧 Controllo milestone email...')
      if (points > 0) {
        await sendPointsMilestoneEmail(customer, customer.points, newPoints)
      }

      console.log('🔧 Aggiornamento interfaccia...')
      loadTodayStats()
      loadTopCustomers()
      searchCustomersForManual(manualCustomerName)

      if (selectedCustomer && selectedCustomer.id === customer.id) {
        setSelectedCustomer({ ...selectedCustomer, points: newPoints })
      }

      setManualPoints('')
      console.log('✅ ModifyPoints completata con successo')
      showNotification(`${points > 0 ? 'Aggiunte' : 'Rimosse'} ${Math.abs(points)} GEMME a ${customer.name}`)
    } catch (error) {
      console.log('❌ Errore modifica GEMME:', error)
      showNotification('Errore nella modifica GEMME', 'error')
    }
  }, [sendPointsMilestoneEmail, loadTodayStats, loadTopCustomers, searchCustomersForManual, manualCustomerName, selectedCustomer, showNotification])

  const saveSettings = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('settings')
        .update({
          points_per_euro: settings.points_per_euro,
          points_for_prize: settings.points_for_prize,
          nfc_server_url: settings.nfc_server_url
        })
        .eq('id', settings.id)

      if (!error) {
        // ← AGGIUNTO ACTIVITY LOG
        await activityService.logSystem('SETTINGS_UPDATED', { settings })
        showNotification('Configurazione salvata con successo!')
      }
    } catch (error) {
      console.log('Errore salvataggio:', error)
      showNotification('Errore nel salvataggio', 'error')
    }
  }, [settings, showNotification])

  const addPrize = useCallback(async (imageUrl = null) => {
    if (!newPrizeName || !newPrizeDescription || !newPrizeCost) {
      showNotification('Compila tutti i campi del premio', 'error')
      return
    }

    try {
      const { data, error } = await supabase
        .from('prizes')
        .insert([{
          name: newPrizeName,
          description: newPrizeDescription,
          points_cost: parseInt(newPrizeCost),
          image_url: imageUrl,
          active: true
        }])
        .select()

      if (data) {
        setPrizes([...prizes, data[0]])
        setNewPrizeName('')
        setNewPrizeDescription('')
        setNewPrizeCost('')

        // ← AGGIUNTO ACTIVITY LOG
        await activityService.logSystem('PRIZE_CREATED', { prize: data[0] })
        showNotification('Premio aggiunto con successo!')
      }
    } catch (error) {
      console.log('Errore aggiunta premio:', error)
      showNotification('Errore nell\'aggiunta del premio', 'error')
    }
  }, [newPrizeName, newPrizeDescription, newPrizeCost, prizes, showNotification])

  const deletePrize = useCallback(async (prizeId) => {
    if (!confirm('Sei sicuro di voler eliminare questo premio?')) return

    try {
      const { error } = await supabase
        .from('prizes')
        .update({ active: false })
        .eq('id', prizeId)

      if (!error) {
        const deletedPrize = prizes.find(p => p.id === prizeId)
        setPrizes(prizes.filter(p => p.id !== prizeId))

        // ← AGGIUNTO ACTIVITY LOG
        await activityService.logSystem('PRIZE_DELETED', { prize: deletedPrize })
        showNotification('Premio eliminato con successo!')
      }
    } catch (error) {
      console.log('Errore eliminazione premio:', error)
      showNotification('Errore nell\'eliminazione del premio', 'error')
    }
  }, [prizes, showNotification])

  const searchCustomers = useCallback(async () => {
    if (searchTerm.length < 2) {
      setCustomers(allCustomers)
      return
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .order('name')

      if (data) setCustomers(data)
    } catch (error) {
      console.log('Errore ricerca:', error)
    }
  }, [searchTerm, allCustomers])

  useEffect(() => {
    if (isAuthenticated) { // ← AGGIUNTO CHECK AUTH
      searchCustomers()
    }
  }, [searchCustomers, isAuthenticated]) // ← AGGIUNTA DIPENDENZA AUTH

  // Crea nuovo cliente CON email benvenuto automatica (+ ACTIVITY LOG)
  const createCustomer = useCallback(async () => {
    if (!newCustomerName || !newCustomerPhone) {
      showNotification('Inserisci nome e telefono', 'error')
      return
    }

    if (newCustomerEmail && !/\S+@\S+\.\S+/.test(newCustomerEmail)) {
      showNotification('Formato email non valido', 'error')
      return
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          name: newCustomerName,
          phone: newCustomerPhone,
          email: newCustomerEmail || null,
          points: 0
        }])
        .select()

      if (data) {
        setSelectedCustomer(data[0])
        setNewCustomerName('')
        setNewCustomerPhone('')
        setNewCustomerEmail('')

        // ← AGGIUNTO ACTIVITY LOG
        await activityService.logCustomer('CUSTOMER_CREATED', data[0].id, data[0])

        // Invia email di benvenuto automatica
        if (data[0].email) {
          await sendWelcomeEmail(data[0])
        }

        showNotification(`Cliente ${data[0].name} creato con successo!`)
      }
      loadTodayStats()
    } catch (error) {
      console.log('Errore creazione cliente:', error)
      showNotification('Errore: probabilmente il telefono è già registrato', 'error')
    }
  }, [newCustomerName, newCustomerPhone, newCustomerEmail, sendWelcomeEmail, loadTodayStats, showNotification])

  // Aggiungi transazione CON email automatica milestone (+ ACTIVITY LOG)
  const addTransaction = useCallback(async () => {
    if (!selectedCustomer || !transactionAmount) return

    const amount = parseFloat(transactionAmount)
    const pointsEarned = Math.floor(amount * settings.points_per_euro)

    try {
      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert([{
          customer_id: selectedCustomer.id,
          amount: amount,
          points_earned: pointsEarned,
          type: 'acquistare'
        }])
        .select()
        .single()

      if (error) throw error

      const newPoints = selectedCustomer.points + pointsEarned
      await supabase
        .from('customers')
        .update({ points: newPoints })
        .eq('id', selectedCustomer.id)

      // ← AGGIUNTO ACTIVITY LOG
      await activityService.logTransaction('TRANSACTION_CREATED', transaction.id, transaction)

      // Controlla milestone email automatiche DINAMICHE
      if (pointsEarned > 0) {
        await sendPointsMilestoneEmail(selectedCustomer, selectedCustomer.points, newPoints)
      }

      // === AGGIUNGI QUESTO BLOCCO PER IL REFERRAL ===
      // Controlla se è il primo acquisto del cliente
      console.log('🔍 Controllo primo acquisto per referral...');
      const { count, error: countError } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', selectedCustomer.id)
        .eq('type', 'acquistare');
        
      console.log('📊 Risultato conteggio transazioni:', { count, error: countError, customerId: selectedCustomer.id });
      
      if (countError) {
        console.error('❌ Errore nel conteggio transazioni:', countError);
      } else if (count === 1) {
        console.log('🎉 È il primo acquisto! Tentativo completamento referral...');
        try {
          await completeReferral(selectedCustomer.id);
          console.log('✅ Completamento referral eseguito');
        } catch (referralError) {
          console.error('❌ Errore completamento referral:', referralError);
        }
      } else {
        console.log(`📝 Non è il primo acquisto (${count} transazioni totali)`);
      }
      // === FINE BLOCCO REFERRAL ===

      setSelectedCustomer({ ...selectedCustomer, points: newPoints })
      setTransactionAmount('')
      showNotification(`+${pointsEarned} GEMME guadagnate!`)
      loadTodayStats()
    } catch (error) {
      console.log('Errore transazione:', error)
      showNotification('Errore nella registrazione della transazione', 'error')
    }
  }, [selectedCustomer, transactionAmount, settings.points_per_euro, sendPointsMilestoneEmail, loadTodayStats, showNotification, completeReferral])

  const redeemPrize = useCallback(async (prize) => {
    if (!selectedCustomer || selectedCustomer.points < prize.points_cost) return

    try {
      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert([{
          customer_id: selectedCustomer.id,
          amount: 0,
          points_earned: -prize.points_cost,
          type: 'riscattare'
        }])
        .select()
        .single()

      if (error) throw error

      const newPoints = selectedCustomer.points - prize.points_cost
      await supabase
        .from('customers')
        .update({ points: newPoints })
        .eq('id', selectedCustomer.id)

      // ← AGGIUNTO ACTIVITY LOG
      await activityService.logTransaction('PRIZE_REDEEMED', transaction.id, {
        ...transaction,
        prize_name: prize.name,
        customer_name: selectedCustomer.name
      })

      setSelectedCustomer({ ...selectedCustomer, points: newPoints })
      showNotification(`${prize.name} riscattato con successo!`)
      loadTodayStats()
    } catch (error) {
      console.log('Errore riscatto:', error)
      showNotification('Errore nel riscatto del premio', 'error')
    }
  }, [selectedCustomer, loadTodayStats, showNotification])

  // Funzione per generare token univoco e salvarlo nel DB (MIGLIORATA)
  const generateClientTokenForCustomer = useCallback(async (customerId) => {
    try {
      // 1. Prima controlla se il cliente ha già un token valido
      const { data: currentCustomer } = await supabase
        .from('customers')
        .select('client_token')
        .eq('id', customerId)
        .single();
      
      // 2. Se ha già un token, riutilizzalo
      if (currentCustomer?.client_token) {
        console.log('🔄 Riutilizzo token esistente:', currentCustomer.client_token);
        showNotification('✅ Link cliente recuperato (token esistente)', 'success');
        return currentCustomer.client_token;
      }
      
      // 3. Se non ha token, generane uno nuovo
      console.log('🆕 Generando nuovo token per cliente:', customerId);
      let token = generateClientToken()
      
      // 4. Verifica che il token sia univoco
      let { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('client_token', token)
        .single()
      while (existingCustomer) {
        token = generateClientToken()
        const { data } = await supabase
          .from('customers')
          .select('id')
          .eq('client_token', token)
          .single()
        existingCustomer = data
      }
      
      // 5. Salva il token nel database
      const { error } = await supabase
        .from('customers')
        .update({ client_token: token })
        .eq('id', customerId)
      if (error) {
        showNotification('Errore nella generazione del link cliente', 'error')
        return null
      }

      // ← AGGIUNTO ACTIVITY LOG
      await activityService.logCustomer('CLIENT_TOKEN_GENERATED', customerId, { token })

      showNotification('✅ Nuovo link cliente generato con successo!', 'success')
      return token
    } catch (error) {
      console.error('Errore generazione token:', error)
      showNotification('Errore nella generazione del link cliente', 'error')
      return null
    }
  }, [showNotification])

  // Funzione per rigenerare forzatamente un nuovo token
  const regenerateClientToken = useCallback(async (customerId) => {
    try {
      console.log('🔄 Rigenerando forzatamente token per cliente:', customerId);
      
      let token = generateClientToken()
      
      // Verifica che il token sia univoco
      let { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('client_token', token)
        .single()
      while (existingCustomer) {
        token = generateClientToken()
        const { data } = await supabase
          .from('customers')
          .select('id')
          .eq('client_token', token)
          .single()
        existingCustomer = data
      }
      
      // Salva il nuovo token nel database
      const { error } = await supabase
        .from('customers')
        .update({ client_token: token })
        .eq('id', customerId)
      if (error) {
        showNotification('Errore nella rigenerazione del link cliente', 'error')
        return null
      }

      await activityService.logCustomer('CLIENT_TOKEN_REGENERATED', customerId, { token })
      showNotification('🔄 Link cliente rigenerato! Il vecchio link non funziona più', 'success')
      return token
    } catch (error) {
      console.error('Errore rigenerazione token:', error)
      showNotification('Errore nella rigenerazione del link cliente', 'error')
      return null
    }
  }, [showNotification])

  // Check per mostrare solo il portale cliente se siamo su /cliente/:token
  useEffect(() => {
    const path = window.location.pathname
    const clientMatch = path.match(/^\/cliente\/(.+)$/)
    if (clientMatch) {
      const token = clientMatch[1]
      if (isValidToken(token)) {
        setClientPortalToken(token)
        return
      } else {
        window.location.href = '/'
      }
    }
    

    
    // Check per mostrare test dei livelli
    if (path === '/test-livelli') {
      setShowLevelsTest(true)
      return
    }
  }, [])

  const [clientPortalToken, setClientPortalToken] = useState(null)
  const [showLevelsTest, setShowLevelsTest] = useState(false)

  // ===================================
  // AUTH LOADING & LOGIN SCREENS (AGGIUNTI)
  // ===================================

  // PRIORITÀ 1: Se siamo nel portale clienti, mostra solo quello (PRIMA dell'auth check)
  if (clientPortalToken) {
    return <ClientPortal token={clientPortalToken} />
  }

  // PRIORITÀ 1.5: Se siamo nel test dei livelli, mostra solo quello
  if (showLevelsTest) {
    return <LevelsTest />
  }

  // PRIORITÀ 2: Se l'auth sta caricando
  if (authLoading) {
    return (
      <div className="app-loading">
        <div className="loading-container">
          <img
            src="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png"
            alt="Sapori & Colori"
            className="loading-logo"
          />
          <h2>Sapori & Colori</h2>
          <div className="loading-spinner">⏳</div>
          <p>Caricamento sistema...</p>
        </div>
      </div>
    )
  }

  // PRIORITÀ 3: Se non autenticato, mostra login
  if (!isAuthenticated) {
    return (
      <div className="login-page">
        <LoginForm
          onSuccess={() => {
            showNotification(`🎉 Benvenuto ${userName}!`, 'success')
            setActiveView('dashboard') // Reset al dashboard
          }}
        />
      </div>
    )
  }

  // ===================================
  // RENDER CONTENT CON PROTEZIONI AUTH (AGGIORNATO)
  // ===================================
  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView
          todayStats={todayStats}
          topCustomers={topCustomers}
          emailStats={emailStats}
          showNotification={showNotification}
        />
      case 'customer':
        return (
          <ProtectedComponent permission="canViewCustomers">
            {/* Lista clienti e funzionalità esistenti */}
            <CustomerView
              customerLevels={customerLevels}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              customers={customers}
              setCustomers={setCustomers}
              selectedCustomer={selectedCustomer}
              setSelectedCustomer={setSelectedCustomer}
              transactionAmount={transactionAmount}
              setTransactionAmount={setTransactionAmount}
              addTransaction={addTransaction}
              prizes={prizes}
              redeemPrize={redeemPrize}
              manualCustomerName={manualCustomerName}
              setManualCustomerName={setManualCustomerName}
              searchCustomersForManual={searchCustomersForManual}
              foundCustomers={foundCustomers}
              setFoundCustomers={setFoundCustomers}
              manualPoints={manualPoints}
              setManualPoints={setManualPoints}
              modifyPoints={modifyPoints}
              showNotification={showNotification}
              generateClientTokenForCustomer={generateClientTokenForCustomer}
              regenerateClientToken={regenerateClientToken}
              loadCustomers={loadCustomers}
              deactivateCustomer={deactivateCustomer}
              reactivateCustomer={reactivateCustomer}
              showEditModal={showEditModal}
              setShowEditModal={setShowEditModal}
              editingCustomer={editingCustomer}
              setEditingCustomer={setEditingCustomer}
              saveCustomerEdits={saveCustomerEdits}
              // AGGIUNGI QUESTE PROPS
              referredFriends={referredFriends}
              loadReferredFriends={loadReferredFriends}
              getReferralLevel={getReferralLevel}
              getReferralPoints={getReferralPoints}
              getReferralLevelInfo={getReferralLevelInfo}
              showQRModal={showQRModal}
              setShowQRModal={setShowQRModal}
              showShareModal={showShareModal}
              setShowShareModal={setShowShareModal}
              isMultiplierActive={isMultiplierActive}
              completeReferral={completeReferral} // ✅ AGGIUNTA QUESTA PROP
              fixReferralData={fixReferralData} // ✅ AGGIUNTA FUNZIONE CORREZIONE
              
            />
          </ProtectedComponent>
        )
      case 'prizes':
        return (
          <ProtectedComponent permission="canManagePrizes">
            <PrizesView
              newPrizeName={newPrizeName}
              setNewPrizeName={setNewPrizeName}
              newPrizeDescription={newPrizeDescription}
              setNewPrizeDescription={setNewPrizeDescription}
              newPrizeCost={newPrizeCost}
              setNewPrizeCost={setNewPrizeCost}
              addPrize={addPrize}
              prizes={prizes}
              deletePrize={deletePrize}
              showNotification={showNotification}
            />
          </ProtectedComponent>
        )
      case 'email':
        return (
          <ProtectedComponent permission="canSendEmails">
            <EmailView
              emailStats={emailStats}
              emailTemplate={emailTemplate}
              setEmailTemplate={setEmailTemplate}
              emailRecipients={emailRecipients}
              setEmailRecipients={setEmailRecipients}
              showIndividualSelection={showIndividualSelection}
              setShowIndividualSelection={setShowIndividualSelection}
              loadAllCustomersForEmail={loadAllCustomersForEmail}
              selectedIndividualCustomers={selectedIndividualCustomers}
              allCustomersForEmail={allCustomersForEmail}
              toggleAllCustomers={toggleAllCustomers}
              toggleIndividualCustomer={toggleIndividualCustomer}
              emailSubject={emailSubject}
              setEmailSubject={setEmailSubject}
              customMessage={customMessage}
              setCustomMessage={setCustomMessage}
              sendEmail={sendEmail}
              showNotification={showNotification}
              supabase={supabase}
              customers={allCustomers}
            />
          </ProtectedComponent>
        )
      case 'coupons':
        return (
          <ProtectedComponent permission="canManageCoupons">
            <CouponManagement
              showNotification={showNotification}
            />
          </ProtectedComponent>
        )
      case 'analytics':
        return (
          <ProtectedComponent permission="canViewStats">
            <AdvancedAnalytics
              showNotification={showNotification}
              todayStats={todayStats}
              topCustomers={topCustomers}
              prizes={prizes}
            />
          </ProtectedComponent>
        )
      case 'nfc':
        return (
          <ProtectedComponent permission="canViewCustomers">
            <NFCViewSimpleVertical showNotification={showNotification} />
          </ProtectedComponent>
        )
      case 'settings':
        return (
          <ProtectedComponent permission="canViewSettings">
            <SettingsView
              customerLevels={customerLevels}
              loadCustomerLevels={loadCustomerLevels}
              settings={settings}
              setSettings={setSettings}
              saveSettings={saveSettings}
              EMAIL_CONFIG={EMAIL_CONFIG}
              showNotification={showNotification}
              // assignMissingReferralCodes={assignMissingReferralCodes} // TEMPORANEO: commentato per debug
            />
          </ProtectedComponent>
        )
      default:
        return <DashboardView
          todayStats={todayStats}
          topCustomers={topCustomers}
          emailStats={emailStats}
        />
    }
  }

  // ===================================
  // RENDER APP PRINCIPALE (CON AUTH HEADER)
  // ===================================
  return (
    <div className="app-container">
      <NotificationContainer
        notifications={notifications}
        setNotifications={setNotifications}
      />

      {/* ===================================
          AUTH HEADER (AGGIUNTO)
          =================================== */}
      <div className="auth-header">
        <div className="auth-user-info">
          <div className="user-avatar">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <span className="user-name">{userName}</span>
            <span className="user-role">{userRole?.toUpperCase()}</span>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>

      {/* HAMBURGER BUTTON - SOLO MOBILE */}
      <button
        className="hamburger-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Apri menu"
      >
        <span className="hamburger-icon">☰</span>
      </button>

      {/* SIDEBAR MENU CON PROTEZIONI AUTH (AGGIORNATO) */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img
            src="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png"
            alt="Sapori e Colori Logo"
            className="sidebar-logo"
          />
          <h2>Sapori & Colori</h2>
          <p>Sistema GEMME</p>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            // ← AGGIUNTO CONTROLLO PERMESSI
            if (item.permission && !permissions[item.permission]) {
              return null // Non mostrare il menu se mancano i permessi
            }

            return (
              <button
                key={item.id}
                className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                onClick={() => {
                  // Reset cliente selezionato quando si cambia vista
                  if (activeView === 'customer' && item.id !== 'customer' && selectedCustomer) {
                    setSelectedCustomer(null)
                    setSearchTerm('')
                    showNotification('🔄 Cliente deselezionato per nuova ricerca', 'info')
                  }
                  
                  // Reset anche quando si torna alla vista clienti da altre viste
                  if (activeView !== 'customer' && item.id === 'customer' && selectedCustomer) {
                    setSelectedCustomer(null)
                    setSearchTerm('')
                    showNotification('🔄 Pronto per nuova ricerca cliente', 'info')
                  }
                  
                  setActiveView(item.id)
                  setSidebarOpen(false) // Chiude la sidebar su mobile
                }}
              >
                <span className="nav-icon">{item.icon}</span>
                <div className="nav-content">
                  <span className="nav-title">{item.title}</span>
                  <span className="nav-description">{item.description}</span>
                </div>
              </button>
            )
          })}
        </nav>
      </div>

      {/* MAIN CONTENT */}
      <div className="main-content">
        {renderContent()}
      </div>
    </div>
  )
}

// ===================================
// APP WRAPPER CON AUTH PROVIDER (AGGIUNTO)
// ===================================
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App