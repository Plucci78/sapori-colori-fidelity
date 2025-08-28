import { useState, useEffect } from 'react'
import NFCQuickReaderHybrid from '../NFC/NFCQuickReaderHybrid' // Ripristino Hybrid per Mac
import RegistrationWizard from '../Registration/RegistrationWizard'
import QRCodeReader from '../Common/QRCodeReader'
import EditCustomerModal from './EditCustomerModal'
import DeactivateCustomerModal from './DeactivateCustomerModal'
import StaffMessageModal from '../Chat/StaffMessageModal'
import { supabase } from '../../supabase'
import { copyToClipboard, copyReferralCode } from '../../utils/clipboardUtils'
import { playAddGemmeSound } from '../../utils/soundUtils'
import PrivacyManagement from '../Privacy/PrivacyManagement'
import oneSignalService from '../../services/onesignalService'
import styles from './CustomerView.module.css' // CSS Module isolato
import './CustomerButtonsOverride.css' // Override specifico per pulsanti neri
import './CustomerTable.css' // Styling per tabella clienti

function CustomerView({
  customerLevels,
  searchTerm,
  setSearchTerm,
  customers,
  selectedCustomer,
  setSelectedCustomer,
  transactionAmount,
  setTransactionAmount,
  addTransaction,
  prizes,
  redeemPrize,
  manualCustomerName,
  setManualCustomerName,
  searchCustomersForManual,
  foundCustomers,
  manualPoints,
  setManualPoints,
  modifyPoints,
  showNotification,
  generateClientTokenForCustomer,
  regenerateClientToken,
  loadCustomers,
  deactivateCustomer,
  reactivateCustomer,
  referredFriends,
  loadReferredFriends,
  getReferralLevel,
  getReferralPoints,
  getReferralLevelInfo,
  isMultiplierActive,
  user,
  notifyBirthday
}) {
  const [showGemmeRain, setShowGemmeRain] = useState(false);
  const [showRegistrationWizard, setShowRegistrationWizard] = useState(false)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [customerPrizeHistory, setCustomerPrizeHistory] = useState([])
  const [loadingPrizeHistory, setLoadingPrizeHistory] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)
  const [showStaffMessages, setShowStaffMessages] = useState(false)
  const [pendingMessages, setPendingMessages] = useState([])

  // Controlla messaggi staff quando si seleziona un cliente
  useEffect(() => {
    if (selectedCustomer?.id && user?.id) {
      // Reset solo il modale messaggi staff per questo controllo
      setShowStaffMessages(false)
      checkStaffMessages()
    } else {
      // Se non c'è cliente selezionato, assicurati che il modale sia chiuso
      setShowStaffMessages(false)
    }
  }, [selectedCustomer?.id, user?.id])


  // Funzione per controllare messaggi staff per il cliente selezionato
  const checkStaffMessages = async () => {
    try {
      console.log('🔍 checkStaffMessages: Controllo messaggi per cliente', selectedCustomer.name, 'ID:', selectedCustomer.id)
      console.log('🔍 checkStaffMessages: User ID:', user.id)
      
      // Prima controlliamo TUTTI i messaggi per questo cliente
      const { data: allMessages, error: allError } = await supabase
        .from('staff_messages_with_users')
        .select('*')
        .eq('customer_id', selectedCustomer.id)
        .order('created_at', { ascending: false })

      if (allError) throw allError
      console.log('🔍 TUTTI i messaggi per questo cliente:', allMessages)

      // Poi applichiamo i filtri
      const { data, error } = await supabase
        .from('staff_messages_with_users')
        .select('*')
        .eq('customer_id', selectedCustomer.id)
        .eq('status', 'pending')
        .or(`to_user_id.is.null,to_user_id.eq.${user.id}`)
        // .neq('from_user_id', user.id) // Commentato per test - mostra anche i miei messaggi
        .order('created_at', { ascending: false })

      if (error) throw error
      
      const messages = data || []
      console.log('📧 checkStaffMessages: Messaggi filtrati trovati:', messages.length, messages)
      console.log('📧 showStaffMessages stato attuale:', showStaffMessages)
      setPendingMessages(messages)
      
      // Se ci sono messaggi non letti, mostra automaticamente il modale
      if (messages.length > 0) {
        console.log('🎯 checkStaffMessages: APRENDO modale per', messages.length, 'messaggi')
        setShowStaffMessages(true)
        showNotification(
          `${messages.length} ${messages.length === 1 ? 'messaggio' : 'messaggi'} staff per ${selectedCustomer.name}`,
          'info'
        )
      } else {
        console.log('📭 checkStaffMessages: Nessun messaggio pending trovato - NON aprire modale')
        setShowStaffMessages(false) // Assicurati che il modale non si apra
      }
      console.log('📧 showStaffMessages stato finale:', showStaffMessages)
    } catch (error) {
      console.error('❌ Errore controllo messaggi staff:', error)
    }
  }

  // Funzione comune per controllare il compleanno
  const checkCustomerBirthday = async (customer) => {
    console.log('🔍 DEBUG checkCustomerBirthday:', {
      cliente: customer.name,
      birth_date: customer.birth_date,
      notifyBirthday_exists: !!notifyBirthday,
      notifyBirthday_type: typeof notifyBirthday
    })
    
    if (customer.birth_date && notifyBirthday) {
      const today = new Date()
      const birthday = new Date(customer.birth_date)
      console.log('🎂 Controllo compleanno per:', {
        cliente: customer.name,
        birth_date: customer.birth_date,
        oggi: today.toDateString(),
        compleanno: birthday.toDateString(),
        mese_oggi: today.getMonth(),
        giorno_oggi: today.getDate(),
        mese_compleanno: birthday.getMonth(),
        giorno_compleanno: birthday.getDate()
      })
      
      if (today.getMonth() === birthday.getMonth() && today.getDate() === birthday.getDate()) {
        console.log('🎉 È IL COMPLEANNO!', customer.name)
        
        // Controlla se email compleanno già inviata oggi per questo cliente
        if (customer.email) {
          try {
            // Usa lo stesso controllo di emailAutomation.js per coerenza
            const today = new Date().toISOString().split('T')[0];
            
            // Prima prova con recipient_email, poi con customer_id come fallback
            const { data: emailLogsByEmail } = await supabase
              .from('email_logs')
              .select('*')
              .eq('template_name', 'automatic_birthday')
              .eq('recipient_email', customer.email)
              .gte('created_at', `${today}T00:00:00`)
              .lt('created_at', `${today}T23:59:59`);
              
            const { data: emailLogsByCustomerId } = await supabase
              .from('email_logs')
              .select('*')
              .eq('template_name', 'automatic_birthday')
              .contains('metadata', { customer_id: customer.id })
              .gte('created_at', `${today}T00:00:00`)
              .lt('created_at', `${today}T23:59:59`);
            
            const emailLogs = [...(emailLogsByEmail || []), ...(emailLogsByCustomerId || [])];
            const error = null; // Ignora errori singoli, conta solo i risultati
            
            if (error) {
              console.error('Errore controllo email logs:', error)
              // Se errore nel database, mostra solo popup senza email
              notifyBirthday(customer, { skipEmail: true })
              return
            }
            
            if (emailLogs && emailLogs.length > 0) {
              console.log('📧 Email compleanno già inviata oggi a', customer.name, 'Skip email: TRUE')
              console.log('📧 DEBUG: emailLogs trovati:', emailLogs.length, 'record(s)')
              // Mostra solo popup e musica, senza inviare email
              notifyBirthday(customer, { skipEmail: true })
            } else {
              console.log('✅ Nessuna email compleanno inviata oggi, procedo con email per', customer.name)
              console.log('📧 DEBUG: emailLogs risultato:', emailLogs)
              notifyBirthday(customer, { skipEmail: false })
            }
            
          } catch (error) {
            console.error('Errore controllo duplicati email compleanno:', error)
            // In caso di errore, mostra comunque il compleanno ma salta l'email
            notifyBirthday(customer, { skipEmail: true })
          }
        } else {
          // Cliente senza email, solo popup e musica
          notifyBirthday(customer, { skipEmail: true })
        }
      }
    } else {
      console.log('❌ Controllo compleanno saltato:', {
        motivo: !customer.birth_date ? 'Manca birth_date' : 'Manca notifyBirthday',
        birth_date: customer.birth_date,
        notifyBirthday_disponibile: !!notifyBirthday
      })
    }
  }

  // Funzione comune per selezionare un cliente
  const selectCustomer = async (customer, source = 'unknown') => {
    setSelectedCustomer(customer)
    // Carica anche i referral per mostrare gli amici invitati
    await loadReferredFriends(customer.id)
    await loadCustomerPrizeHistory(customer.id)
    
    // Controlla sempre il compleanno quando si seleziona un cliente
    checkCustomerBirthday(customer)
    
    showNotification(`✅ Cliente trovato${source !== 'unknown' ? ` via ${source}` : ''}: ${customer.name}`, 'success')
  }

  // Funzione per gestire cliente trovato via NFC
  const handleNFCCustomerFound = async (customer) => {
    await selectCustomer(customer, 'NFC')
  }

  // Funzione per salvare modifiche cliente
  const handleSaveCustomer = async (customerId, formData) => {
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          birth_date: formData.birth_date,
          gender: formData.gender,
          notes: formData.notes
        })
        .eq('id', customerId)

      if (error) {
        console.error('Errore aggiornamento cliente:', error)
        throw error
      }

      // Ricarica i clienti per aggiornare la UI
      await loadCustomers()

      // Aggiorna selectedCustomer se è quello modificato
      if (selectedCustomer && selectedCustomer.id === customerId) {
        setSelectedCustomer(prev => ({
          ...prev,
          ...formData
        }))
      }

    } catch (error) {
      console.error('Errore salvataggio cliente:', error)
      throw error
    }
  }

  // Funzione per deselezionare cliente
  const handleDeactivateCustomer = async (customerId) => {
    try {
      await deactivateCustomer(customerId)
      
      // Se è il cliente selezionato, deselezionalo
      if (selectedCustomer && selectedCustomer.id === customerId) {
        setSelectedCustomer(null)
      }
      
      // Ricarica i clienti per aggiornare la UI
      await loadCustomers()
      
    } catch (error) {
      console.error('Errore deselezione cliente:', error)
      throw error
    }
  }

  // Funzione per gestire QR scan
  const handleQRScan = async (qrData) => {
    console.log('🔍 QR Scansionato:', qrData)

    try {
      if (qrData.startsWith('CUSTOMER:')) {
        const customerId = qrData.split(':')[1]
        console.log('👤 ID Cliente dal QR:', customerId)

        const { data: customer, error } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .single()

        if (error) {
          console.error('❌ Errore ricerca cliente:', error)
          showNotification('❌ Cliente non trovato nel database', 'error')
          return
        }

        if (customer) {
          console.log('✅ Cliente trovato dal QR:', customer)
          await selectCustomer(customer, 'QR')
          setShowQRScanner(false)
        } else {
          console.log('❌ Nessun cliente trovato con ID:', customerId)
          showNotification(`❌ Nessun cliente trovato con ID: ${customerId}`, 'error')
        }
      } else {
        console.log('⚠️ QR non riconosciuto come cliente')
        showNotification('⚠️ QR code non valido per riconoscimento cliente', 'warning')
      }
    } catch (error) {
      console.error('❌ Errore elaborazione QR:', error)
      showNotification('❌ Errore durante la scansione del QR', 'error')
    }
  }

  // Funzioni helper
  const calculateAge = (birthDate) => {
    if (!birthDate) return null
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
      return age - 1
    }
    return age
  }

  const getCustomerLevel = (points) => {
    if (!customerLevels || customerLevels.length === 0) {
      return { name: 'Nessun Livello', color: '#808080', emoji: '' };
    }

    const sortedLevels = [...customerLevels].sort((a, b) => b.min_gems - a.min_gems);
    const level = sortedLevels.find(l => points >= l.min_gems);

    return level || { name: 'Base', color: '#808080', emoji: '' };
  };

  // Handle transaction con suoni e animazioni
  const handleAddTransaction = async () => {
    if (selectedCustomer && transactionAmount) {
      // Blocca se il cliente è deselezionato
      if (selectedCustomer.is_active === false) {
        showNotification('❌ Impossibile registrare transazioni per cliente deselezionato', 'error');
        return;
      }
      
      const amount = parseFloat(transactionAmount)
      
      console.log(`💎 Inizio registrazione vendita per ${selectedCustomer.name}`)
      console.log(`💰 Importo: €${amount}`)
      
      // Suona il suono di aggiunta gemme
      try {
        console.log('🎵 Chiamata playAddGemmeSound...')
        playAddGemmeSound(amount)
        console.log('✅ Suono riprodotto con successo')
      } catch (error) {
        console.error('❌ Errore riproduzione suono:', error)
      }
      
      // Mostra la pioggia di gemme
      console.log('🌧️ Avvio animazione pioggia gemme')
      setShowGemmeRain(true)
      setTimeout(() => {
        setShowGemmeRain(false)
        console.log('🛑 Fermata animazione pioggia gemme')
      }, 3000)
      
      // Registra la transazione
      console.log('💾 Registrazione transazione...')
      addTransaction(selectedCustomer, amount)
      
      showNotification(`💎 Aggiunte ${Math.floor(amount)} GEMME a ${selectedCustomer.name}!`, 'success')
      console.log('✅ Vendita registrata completamente')
    }
  }

  // Filtra clienti per ricerca
  const filteredCustomers = searchTerm
    ? customers.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 10)
    : []

  // Funzioni social
  const shareOnWhatsApp = () => {
    if (!selectedCustomer) return;
    const message = `🎉 Ciao! Ti invito a scoprire il fantastico programma fedeltà di Sapori e Colori! 

Con il mio codice referral ${selectedCustomer.referral_code} riceverai subito 5 GEMME gratuite! 💎

Registrati qui: https://saporiecolori.it/ref/${selectedCustomer.referral_code}

Più acquisti, più gemme accumuli, più premi ottieni! 🎁`

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  const openShareModal = async () => {
    showNotification('🚀 Presto disponibili più opzioni di condivisione!', 'info');
    const shareLink = `https://saporiecolori.it/ref/${selectedCustomer.referral_code}`;
    await copyToClipboard(shareLink, showNotification);
  };

  // Funzioni portale cliente
  const handleGenerateClientPortal = async () => {
    // Blocca se il cliente è deselezionato
    if (selectedCustomer.is_active === false) {
      showNotification('❌ Impossibile generare portale per cliente deselezionato', 'error');
      return;
    }
    
    try {
      const token = await generateClientTokenForCustomer(selectedCustomer.id);
      if (token) {
        const clientUrl = `${window.location.origin}/cliente/${token}`;
        await copyToClipboard(clientUrl, showNotification);
        showNotification('🔗 Link portale cliente generato e copiato negli appunti!', 'success');
      }
    } catch (error) {
      console.error('Errore generazione portale cliente:', error);
      showNotification('❌ Errore nella generazione del link portale cliente', 'error');
    }
  };

  const handleRegenerateClientPortal = async () => {
    // Blocca se il cliente è deselezionato
    if (selectedCustomer.is_active === false) {
      showNotification('❌ Impossibile rigenerare portale per cliente deselezionato', 'error');
      return;
    }
    
    try {
      const token = await regenerateClientToken(selectedCustomer.id);
      if (token) {
        const clientUrl = `${window.location.origin}/cliente/${token}`;
        await copyToClipboard(clientUrl, showNotification);
        showNotification('🔄 Link portale cliente rigenerato e copiato negli appunti!', 'success');
      }
    } catch (error) {
      console.error('Errore rigenerazione portale cliente:', error);
      showNotification('❌ Errore nella rigenerazione del link portale cliente', 'error');
    }
  };

  // Funzione per caricare lo storico premi del cliente
  const loadCustomerPrizeHistory = async (customerId) => {
    if (!customerId) {
      setCustomerPrizeHistory([])
      return
    }

    try {
      setLoadingPrizeHistory(true)
      const { data: prizeActivities, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('action', 'PRIZE_REDEEMED')
        .order('timestamp', { ascending: false })

      if (error) {
        console.error('Errore caricamento storico premi:', error)
        setCustomerPrizeHistory([])
        return
      }

      // Filtra solo i premi di questo cliente
      const customerPrizes = prizeActivities?.filter(activity => {
        if (!activity.details) return false
        try {
          const details = JSON.parse(activity.details)
          return details.customer_id === customerId
        } catch {
          return false
        }
      }) || []

      console.log('🎁 Premi trovati per cliente:', customerPrizes)
      setCustomerPrizeHistory(customerPrizes)
    } catch (error) {
      console.error('Errore generale storico premi:', error)
      setCustomerPrizeHistory([])
    } finally {
      setLoadingPrizeHistory(false)
    }
  }

  // Carica storico quando cambia il cliente selezionato
  useEffect(() => {
    if (selectedCustomer?.id) {
      loadCustomerPrizeHistory(selectedCustomer.id)
    } else {
      setCustomerPrizeHistory([])
    }
  }, [selectedCustomer?.id])

  return (
    <div className="customer-view p-6">
      {/* WIZARD REGISTRAZIONE - OVERLAY COMPLETO */}
      {showRegistrationWizard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-lg w-full h-full max-w-none max-h-none overflow-auto" style={{ margin: '20px', maxWidth: 'calc(100vw - 40px)', maxHeight: 'calc(100vh - 40px)' }}>
            <RegistrationWizard
              onComplete={async (customer, successMessage) => {
                loadCustomers()
                setShowRegistrationWizard(false)
                await selectCustomer(customer, 'registrazione')
                
                // 🔔 Invia notifica push agli admin per nuovo cliente registrato
                try {
                  // Trova tutti gli admin con player IDs per le notifiche
                  const { data: adminProfiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, email')
                    .eq('role', 'admin')
                    .eq('active', true)

                  if (adminProfiles && adminProfiles.length > 0) {
                    // Trova i clienti admin (che hanno player IDs OneSignal)
                    const adminEmails = adminProfiles.map(admin => admin.email)
                    const { data: adminCustomers } = await supabase
                      .from('customers')
                      .select('onesignal_player_id')
                      .in('email', adminEmails)
                      .not('onesignal_player_id', 'is', null)

                    if (adminCustomers && adminCustomers.length > 0) {
                      const playerIds = adminCustomers.map(c => c.onesignal_player_id).filter(Boolean)
                      
                      if (playerIds.length > 0) {
                        await oneSignalService.sendNotification({
                          title: '👤 Nuovo Cliente Registrato!',
                          message: `${customer.name} si è appena registrato - ${customer.points || 0} punti iniziali`,
                          playerIds: playerIds,
                          url: '/customers'
                        })
                        console.log(`✅ Notifica nuovo cliente inviata a ${playerIds.length} admin`)
                      }
                    }
                  }
                } catch (error) {
                  console.error('⚠️ Errore invio notifica nuovo cliente:', error)
                  // Non bloccare la registrazione se fallisce la notifica
                }
              }}
              onCancel={() => setShowRegistrationWizard(false)}
              showNotification={showNotification}
            />
          </div>
        </div>
      )}

      {/* HEADER PRINCIPALE */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-brand">Gestione Clienti</h1>
            <p className="text-secondary">Identifica clienti, registra vendite e gestisci il programma fedeltà</p>
          </div>
          <button
            onClick={() => setShowRegistrationWizard(true)}
            className="btn btn-brand-primary flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nuovo Cliente
          </button>
        </div>
      </div>

      {/* SEZIONE NFC READER - PER CELLULARI ANDROID */}
      <div className="card mb-6">
        <div className="card-header">
          <h2 className="card-title flex items-center gap-3">
            <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Identificazione Cliente con NFC
            <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">ANDROID</span>
          </h2>
          <p className="card-subtitle">Usa il tuo cellulare Android per leggere tag NFC dei clienti</p>
        </div>
        <div className="card-body text-center">
          <NFCQuickReaderHybrid
            onCustomerFound={handleNFCCustomerFound}
            showNotification={showNotification}
          />
        </div>
      </div>

      {/* SEZIONE QR SCANNER */}
      <div className="card mb-6">
        <div className="card-header">
          <h2 className="card-title flex items-center gap-3">
            <svg className="w-6 h-6 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6V4H4zm10 0v6h6V4h-6zM4 14v6h6v-6H4zm7 0l3 3 6-6" />
            </svg>
            Scanner QR Code Cliente
          </h2>
          <p className="card-subtitle">Scansiona il QR code dal portale cliente</p>
        </div>
        <div className="card-body">
          <div className="qr-scanner-controls mb-4">
            <button
              onClick={() => setShowQRScanner(!showQRScanner)}
              className={`btn ${showQRScanner ? 'btn-error' : 'btn-info'} mb-3`}
            >
              {showQRScanner ? '❌ Chiudi Scanner' : '📷 Apri Scanner QR'}
            </button>



            {showQRScanner && (
              <div className="qr-scanner-container mt-4">
                <QRCodeReader
                  onScan={handleQRScan}
                  onError={(error) => showNotification(`❌ Errore scanner: ${error}`, 'error')}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SEZIONE RICERCA MANUALE - REDESIGN COERENTE */}
      <div className="card mb-6">
        <div className="card-header">
          <h2 className="card-title flex items-center gap-3">
            <svg className="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Ricerca Cliente
          </h2>
          <p className="card-subtitle">Cerca per nome, telefono o email</p>
        </div>
        <div className="card-body">
          {/* BARRA DI RICERCA */}
          <div className="relative mb-6">
            <div className="search-icon">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Cerca cliente per nome, telefono o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="clear-search"
              >
                ✕
              </button>
            )}
          </div>

          {/* GESTIONE MANUALE GEMME */}
          <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200 mb-6 shadow-lg">
            <h3 className="font-bold text-xl mb-6 flex items-center gap-3 text-amber-800">
              <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </div>
              Gestione Manuale GEMME
            </h3>
            
            {/* BARRA DI RICERCA GRANDE */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Cerca cliente per nome, telefono o email..."
                  value={manualCustomerName}
                  onChange={(e) => setManualCustomerName(e.target.value)}
                  className="w-full px-6 py-4 text-lg font-medium border-2 border-amber-300 rounded-xl focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-200 transition-all duration-300 bg-white shadow-md placeholder-gray-400"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <button
                onClick={() => searchCustomersForManual(manualCustomerName)}
                disabled={!manualCustomerName}
                className="px-8 py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white font-bold rounded-xl transition-all duration-300 shadow-md hover:shadow-lg disabled:cursor-not-allowed"
              >
                🔍 Cerca
              </button>
            </div>

            {/* CLIENTI TROVATI */}
            {foundCustomers.length > 0 && (
              <div style={{marginTop: '20px'}}>
                {foundCustomers.map(customer => (
                  <div key={customer.id} style={{
                    backgroundColor: 'white', 
                    borderRadius: '12px', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
                    border: '2px solid #f59e0b',
                    overflow: 'hidden',
                    marginBottom: '20px'
                  }}>
                    {/* TAB CLIENTE CARINO */}
                    <div style={{
                      background: 'linear-gradient(135deg, #b8860b, #daa520, #cd853f, #b8860b)',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          backgroundColor: 'rgba(255,255,255,0.2)',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <span style={{color: 'white', fontWeight: 'bold', fontSize: '18px'}}>
                            {customer.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h4 style={{color: 'white', fontWeight: 'bold', fontSize: '18px', margin: '0 0 4px 0'}}>
                            {customer.name}
                          </h4>
                          <p style={{color: 'rgba(255,255,255,0.8)', fontSize: '14px', margin: '0'}}>
                            {customer.phone} • {customer.email}
                          </p>
                        </div>
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        borderRadius: '20px',
                        padding: '8px 16px'
                      }}>
                        <div className="gemme-icon w-5 h-5"></div>
                        <span style={{color: 'white', fontWeight: 'bold', fontSize: '18px'}}>
                          {customer.points} GEMME
                        </span>
                      </div>
                    </div>

                    {/* CONTROLLI GEMME */}
                    <div className="p-6">
                      {/* INPUT CENTRALE GRANDE */}
                      <div className="mb-6">
                        <input
                          type="number"
                          placeholder="Inserisci quantità gemme..."
                          value={manualPoints}
                          onChange={(e) => setManualPoints(e.target.value)}
                          className="w-full px-6 py-6 text-center text-3xl font-bold border-2 border-amber-300 rounded-xl focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-200 transition-all duration-300 bg-gray-50"
                        />
                      </div>

                      {/* ANTEPRIMA IN TEMPO REALE */}
                      {manualPoints && !isNaN(parseInt(manualPoints)) && parseInt(manualPoints) !== 0 && (
                        <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 mb-6">
                          <div className="text-lg">
                            <span className="text-gray-700">Gemme attuali: </span>
                            <span className="text-xl font-bold text-gray-800">{customer.points}</span>
                          </div>
                          <div className="text-2xl mt-2">
                            <span className="text-gray-700">Con +{parseInt(manualPoints)}: </span>
                            <span className="text-green-600 font-bold">
                              {customer.points + parseInt(manualPoints)}
                            </span>
                          </div>
                          <div className="text-2xl mt-2">
                            <span className="text-gray-700">Con -{parseInt(manualPoints)}: </span>
                            <span className="text-red-600 font-bold">
                              {Math.max(0, customer.points - parseInt(manualPoints))}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* PULSANTI AGGIUNGI/RIMUOVI */}
                      <div className="flex gap-4">
                        <button
                          onClick={() => modifyPoints(customer, `-${manualPoints}`)}
                          disabled={!manualPoints || manualPoints.trim() === '' || isNaN(parseInt(manualPoints)) || parseInt(manualPoints) === 0}
                          className="flex-1 py-4 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white font-bold rounded-xl transition-all duration-300 shadow-md hover:shadow-lg disabled:cursor-not-allowed text-xl"
                        >
                          − TOGLI GEMME
                        </button>
                        
                        <button
                          onClick={() => modifyPoints(customer, manualPoints)}
                          disabled={!manualPoints || manualPoints.trim() === '' || isNaN(parseInt(manualPoints)) || parseInt(manualPoints) === 0}
                          className="flex-1 py-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-bold rounded-xl transition-all duration-300 shadow-md hover:shadow-lg disabled:cursor-not-allowed text-xl"
                        >
                          + AGGIUNGI GEMME
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* LISTA CLIENTI DALLA RICERCA GENERALE */}
          {searchTerm && filteredCustomers.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold">Risultati ricerca:</h4>
                <div className="grid gap-3">
                  {filteredCustomers.map(customer => (
                    <div 
                      key={customer.id} 
                      className={`customer-card ${customer.is_active === false ? 'customer-deactivated' : ''}`} 
                      onClick={async () => {
                        await selectCustomer(customer, 'ricerca')
                      }}
                    >
                      <div className="customer-card-header">
                        <h3 className="customer-name">
                          {customer.name}
                          {customer.is_active === false && (
                            <span className="ml-2 px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
                              DISATTIVATO
                            </span>
                          )}
                        </h3>
                        <div className="customer-gemme-badge">
                          <div className="gemme-icon w-4 h-4"></div>
                          <span>{customer.points}</span>
                        </div>
                      </div>
                      <div className="customer-card-body">
                        <div className="customer-info-row">
                          <strong>Telefono:</strong> {customer.phone || 'N/A'}
                        </div>
                        <div className="customer-info-row">
                          <strong>Email:</strong> {customer.email || 'N/A'}
                        </div>
                        <div className="customer-info-row">
                          <strong>Livello:</strong> 
                          <span
                            className="ml-2 px-2 py-1 rounded text-white text-xs font-bold"
                            style={{ backgroundColor: getCustomerLevel(customer.points).color }}
                          >
                            {getCustomerLevel(customer.points).emoji} {getCustomerLevel(customer.points).name}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>

      {/* CLIENTE SELEZIONATO */}
      {selectedCustomer && (
        <div className="space-y-6">
          {/* INFO CLIENTE */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title flex items-center gap-3">
                <svg className="w-6 h-6 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Cliente Selezionato
              </h2>
            </div>
            <div className="card-body">
              {/* INDICATORE STATO CLIENTE */}
              {selectedCustomer.is_active === false && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="font-bold text-red-700">⚠️ CLIENTE DISATTIVATO</span>
                  </div>
                  {selectedCustomer.deactivation_reason && (
                    <p className="text-sm text-red-600 mt-1">
                      <strong>Motivo:</strong> {selectedCustomer.deactivation_reason}
                    </p>
                  )}
                  {selectedCustomer.deactivated_at && (
                    <p className="text-sm text-red-600 mt-1">
                      <strong>Disattivato il:</strong> {new Date(selectedCustomer.deactivated_at).toLocaleDateString('it-IT')}
                    </p>
                  )}
                </div>
              )}

              <div className="customer-info-box flex items-center gap-6">
                <div className={styles.customerAvatar}>
                  {selectedCustomer.avatar_url ? (
                    <img 
                      src={selectedCustomer.avatar_url} 
                      alt={`Avatar di ${selectedCustomer.name}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '50%'
                      }}
                      onError={(e) => {
                        // Se l'immagine non si carica, mostra la lettera
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  <div 
                    style={{ 
                      display: selectedCustomer.avatar_url ? 'none' : 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      height: '100%',
                      fontSize: '1.5em',
                      fontWeight: 'bold'
                    }}
                  >
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-2xl font-bold text-brand">{selectedCustomer.name}</h3>
                    {selectedCustomer.is_active === false && (
                      <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                        DISATTIVATO
                      </span>
                    )}
                  </div>
                  <div className="grid grid-3 gap-4 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Tel:</span>
                      <span>{selectedCustomer.phone || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Email:</span>
                      <span>{selectedCustomer.email || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Cliente dal:</span>
                      <span>{new Date(selectedCustomer.created_at).toLocaleDateString('it-IT')}</span>
                    </div>
                    {selectedCustomer.city && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Città:</span>
                        <span>{selectedCustomer.city}</span>
                      </div>
                    )}
                    {selectedCustomer.birth_date && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Età:</span>
                        <span>{calculateAge(selectedCustomer.birth_date)} anni</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="level-icon" dangerouslySetInnerHTML={{ __html: getCustomerLevel(selectedCustomer.points).icon_svg }} />
                    <span className="font-medium">Categoria:</span>
                    <span
                      className="font-bold px-2 py-1 rounded text-white text-xs"
                      style={{ backgroundColor: getCustomerLevel(selectedCustomer.points).primary_color }}
                    >
                      {getCustomerLevel(selectedCustomer.points).name}
                    </span>
                  </div>
                </div>
                <div className="gemme-display">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="gemme-icon-lg"></div>
                    <span className="text-2xl font-extrabold text-red-600">{selectedCustomer.points}</span>
                  </div>
                  <div className="text-sm font-semibold text-red-700 uppercase tracking-wide">GEMME</div>
                </div>
              </div>
            </div>
          </div>

          {/* STORICO PREMI RISCATTATI */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title flex items-center gap-3">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
                Storico Premi Riscattati
              </h2>
              <p className="card-subtitle">Cronologia dei premi ottenuti dal cliente</p>
            </div>
            <div className="card-body">
              {loadingPrizeHistory ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                  <p className="text-sm text-secondary mt-2">Caricamento storico...</p>
                </div>
              ) : customerPrizeHistory.length > 0 ? (
                <div className={styles.prizeHistoryContainer}>
                  <div className={styles.prizeHistoryScroll}>
                    <div className="space-y-4">
                      {customerPrizeHistory.map((prizeLog, index) => {
                    const details = JSON.parse(prizeLog.details || '{}')
                    const prizeDate = new Date(prizeLog.timestamp)
                    const timeAgo = Math.floor((new Date() - prizeDate) / (1000 * 60 * 60 * 24))
                    
                    return (
                      <div key={index} className="flex items-center gap-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-orange-800 mb-1">
                            {details.prize_name || details.name || `Premio riscattato (${Math.abs(details.points_earned || 0)} gemme)`}
                          </div>
                          <div className="text-sm text-orange-600 mb-2">
                            Riscattato il {prizeDate.toLocaleDateString('it-IT')} alle {prizeDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            {timeAgo === 0 ? ' (oggi)' : timeAgo === 1 ? ' (ieri)' : ` (${timeAgo} giorni fa)`}
                          </div>
                          {(details.prize_description || details.description) && (
                            <div className="text-xs text-gray-600 italic">
                              {details.prize_description || details.description}
                            </div>
                          )}
                          {/* Mostra info se è un premio senza dettagli completi */}
                          {!details.prize_name && !details.name && (
                            <div className="text-xs text-gray-500 italic">
                              Premio riscattato prima dell'aggiornamento sistema
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm font-bold text-red-600">
                            <div className="gemme-icon w-4 h-4"></div>
                            <span>{Math.abs(details.points_earned || details.points_cost || 0)}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Gemme spese
                          </div>
                        </div>
                      </div>
                    )                    })}
                    </div>
                  </div>
                  {/* Gradiente fade-out per indicare scroll */}
                  {customerPrizeHistory.length > 3 && (
                    <div className={styles.prizeHistoryFade}></div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">Nessun premio riscattato</h3>
                  <p className="text-sm text-gray-500">
                    Questo cliente non ha ancora riscattato alcun premio. I premi futuri appariranno qui.
                  </p>
                </div>
              )}

              {/* Pulsante ricarica storico */}
              {customerPrizeHistory.length > 0 && (
                <div className="text-center mt-6">
                  <button
                    className="btn btn-secondary"
                    onClick={() => loadCustomerPrizeHistory(selectedCustomer?.id)}
                    disabled={loadingPrizeHistory}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Aggiorna Storico
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* AZIONI CLIENTE SELEZIONATO */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title flex items-center gap-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Azioni Cliente
              </h2>
              <p className="card-subtitle">Gestisci link portale cliente e altre azioni</p>
            </div>
            <div className="card-body">
              {/* SEZIONE MODIFICA DATI */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-3">📝 Gestione Dati Cliente</h4>
                <div className="grid grid-2 gap-4">
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="btn btn-brand-primary flex items-center gap-2 justify-center"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    ✏️ Modifica Dati Cliente
                  </button>
                </div>
              </div>

              {/* SEZIONE PORTALE CLIENTE */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-3">🔗 Portale Cliente</h4>
                <div className="grid grid-2 gap-4">
                  <button
                    onClick={handleGenerateClientPortal}
                    className="btn btn-info flex items-center gap-2 justify-center"
                    disabled={selectedCustomer.is_active === false}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    🔗 Genera Link Portale
                  </button>
                  <button
                    onClick={handleRegenerateClientPortal}
                    className="btn btn-warning flex items-center gap-2 justify-center"
                    disabled={selectedCustomer.is_active === false}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    🔄 Rigenera Link
                  </button>
                </div>
              </div>

              {/* SEZIONE DESELEZIONE CLIENTE */}
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-3">⚠️ Gestione Stato Cliente</h4>
                <div className="grid grid-1 gap-3">
                  {selectedCustomer.is_active !== false ? (
                    <button
                      onClick={() => setShowDeactivateModal(true)}
                      className="btn btn-error flex items-center gap-2 justify-center"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                      </svg>
                      🔒 Deseleziona Cliente
                    </button>
                  ) : (
                    <button
                      onClick={() => reactivateCustomer(selectedCustomer)}
                      className="btn btn-success flex items-center gap-2 justify-center"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      ✅ Riattiva Cliente
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-3 p-3 bg-amber-50 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>💡 Info:</strong> Il link del portale cliente permette al cliente di vedere i suoi punti, transazioni e premi disponibili. Il link viene automaticamente copiato negli appunti.
                </p>
              </div>
            </div>
          </div>

          {/* GESTIONE PRIVACY */}
          <PrivacyManagement 
            customer={selectedCustomer}
            showNotification={showNotification}
          />

          {/* NUOVA VENDITA */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title flex items-center gap-3">
                <svg className="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Nuova Vendita
              </h2>
              <p className="card-subtitle">Registra una vendita per {selectedCustomer.name}</p>
              {selectedCustomer.is_active === false && (
                <div className="bg-red-100 text-red-700 px-3 py-2 rounded-lg mt-2">
                  ⚠️ Impossibile registrare vendite per cliente disattivato
                </div>
              )}
            </div>
            <div className="card-body">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1 max-w-md">
                  <span className="currency-symbol">€</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={transactionAmount}
                    onChange={(e) => setTransactionAmount(e.target.value)}
                    className="input-currency"
                    disabled={selectedCustomer.is_active === false}
                  />
                </div>
                <button
                  onClick={handleAddTransaction}
                  disabled={!transactionAmount || parseFloat(transactionAmount) <= 0 || selectedCustomer.is_active === false}
                  className="btn btn-warning px-8 py-4 text-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Registra Vendita
                </button>
              </div>
              {transactionAmount && selectedCustomer.is_active !== false && (
                <div className="flex items-center gap-3 p-4 bg-orange-100 rounded-lg">
                  <div className="gemme-icon"></div>
                  <span className="font-semibold text-orange-800">
                    Aggiungerà: <strong>{Math.floor(parseFloat(transactionAmount || 0))} GEMME</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* PREMI */}
          {prizes.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title flex items-center gap-3">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Riscatta Premi
                </h2>
                {selectedCustomer.is_active === false && (
                  <div className="bg-red-100 text-red-700 px-3 py-2 rounded-lg mt-2">
                    ⚠️ Impossibile riscattare premi per cliente disattivato
                  </div>
                )}
              </div>
              <div className="card-body">
                <div className="grid grid-auto gap-4">
                  {prizes.map(prize => {
                    const hasPoints = selectedCustomer.points >= prize.points_cost && selectedCustomer.is_active !== false
                    return (
                      <div key={prize.id} className={`p-4 rounded-lg border ${hasPoints ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50'}`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-bold text-brand">{prize.name}</h4>
                            <p className="text-sm text-secondary">{prize.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="gemme-icon"></div>
                              <span className="font-bold text-red-600">{prize.points_cost} GEMME</span>
                            </div>
                          </div>
                          <button
                            onClick={() => redeemPrize(prize)}
                            disabled={!hasPoints || selectedCustomer.is_active === false}
                            className={`btn ${hasPoints ? 'btn-success' : 'btn-secondary'}`}
                          >
                            {selectedCustomer.is_active === false ? '🚫 Cliente disattivato' : (hasPoints ? '🎁 Riscatta' : '❌ Non disponibile')}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SEZIONE REFERRAL - REDESIGN COERENTE */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title flex items-center gap-3">
                <svg className="w-6 h-6 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.196-2.196M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.196-2.196M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Programma Invita & Guadagna
              </h2>
              <p className="card-subtitle">Condividi il tuo codice e guadagna GEMME extra!</p>
              {isMultiplierActive && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-bold">
                    🔥 BONUS 2X ATTIVO! Invita ora e guadagna il doppio!
                  </div>
                </div>
              )}
            </div>
            <div className="card-body">
              {/* PROGRESSO REFERRAL */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-secondary mb-2">
                  <span>Prossimo bonus a {Math.ceil((selectedCustomer.referral_count || 0) / 5) * 5} inviti</span>
                  <span className="font-bold text-brand-primary">{selectedCustomer.referral_count || 0}/5</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-brand-primary to-brand-secondary h-3 rounded-full transition-all duration-500" 
                    style={{ width: `${((selectedCustomer.referral_count || 0) % 5) * 20}%` }}
                  ></div>
                </div>
              </div>

              {/* CODICE REFERRAL */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-brand-primary">
                <div className="text-sm font-medium text-secondary mb-2">Il tuo codice referral</div>
                <div 
                  className="flex items-center justify-between p-3 bg-white rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => copyReferralCode(selectedCustomer.referral_code, showNotification)}
                >
                  <span className="font-bold text-xl text-brand-primary tracking-wide">{selectedCustomer.referral_code}</span>
                  <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-xs text-secondary mt-1">Clicca per copiare negli appunti</div>
              </div>

              {/* STATISTICHE CON MOLTIPLICATORI LIVELLO */}
              <div className="grid grid-3 gap-4 mb-6">
                <div className="text-center p-4 bg-amber-50 rounded-lg">
                  <div className="text-2xl mb-1">👥</div>
                  <div className="text-2xl font-bold text-brand-primary">{selectedCustomer.referral_count || 0}</div>
                  <div className="text-sm text-secondary">Amici Invitati</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl mb-1">💎</div>
                  <div className="text-2xl font-bold text-gemme-red">{(selectedCustomer.referral_count || 0) * 20}</div>
                  <div className="text-sm text-secondary">GEMME Guadagnate</div>
                  {(() => {
                    const levelInfo = getReferralLevelInfo(selectedCustomer.referral_count || 0);
                    return levelInfo.isBonus ? (
                      <div className="text-xs text-green-600 font-medium mt-1">
                        ⚡ +{levelInfo.bonusPercent}% bonus livello
                      </div>
                    ) : null;
                  })()}
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl mb-1">🎯</div>
                  <div className="text-lg font-bold text-brand-primary">{getReferralLevel(selectedCustomer.referral_count || 0)}</div>
                  <div className="text-sm text-secondary">Livello</div>
                  {(() => {
                    const nextPoints = getReferralPoints((selectedCustomer.referral_count || 0) + 1);
                    const currentPoints = getReferralPoints(selectedCustomer.referral_count || 0);
                    return nextPoints > currentPoints ? (
                      <div className="text-xs text-amber-600 font-medium mt-1">
                        Prossimo: +{nextPoints} gemme/referral
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>

              {/* BONUS LIVELLO DETTAGLI */}
              {(() => {
                const levelInfo = getReferralLevelInfo(selectedCustomer.referral_count || 0);
                const currentPoints = levelInfo.points;
                const nextLevelCount = selectedCustomer.referral_count >= 20 ? 20 : 
                                     selectedCustomer.referral_count >= 10 ? 20 :
                                     selectedCustomer.referral_count >= 5 ? 10 : 5;
                const nextLevelInfo = getReferralLevelInfo(nextLevelCount);
                
                return (
                  <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-2xl">🏆</div>
                      <div>
                        <div className="font-bold text-purple-800">Livello {levelInfo.level}</div>
                        <div className="text-sm text-purple-600">
                          Guadagni <span className="font-bold">{currentPoints} gemme</span> per ogni nuovo referral
                        </div>
                      </div>
                    </div>
                    
                    {levelInfo.isBonus && (
                      <div className="flex items-center gap-1 text-sm text-green-700 bg-green-100 px-2 py-1 rounded-full inline-block mb-2">
                        <span>⚡</span>
                        <span>Bonus +{levelInfo.bonusPercent}% attivo!</span>
                      </div>
                    )}
                    
                    {selectedCustomer.referral_count < 20 && (
                      <div className="text-sm text-gray-600">
                        Al prossimo traguardo ({nextLevelCount} referral) → 
                        <span className="font-bold text-amber-600"> {nextLevelInfo.points} gemme/referral</span>
                        {nextLevelInfo.isBonus && (
                          <span className="text-green-600"> (+{nextLevelInfo.bonusPercent}% bonus)</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* LISTA AMICI INVITATI */}
              {console.log('🔍 Debug referral:', { 
                referredFriendsLength: referredFriends?.length || 0, 
                referredFriends, 
                selectedCustomerId: selectedCustomer?.id,
                referralCount: selectedCustomer?.referral_count 
              })}
              {referredFriends.length > 0 ? (
                <div className="mb-6">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.196-2.196M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.196-2.196M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    I tuoi inviti ({referredFriends.length})
                  </h4>
                  <div className="space-y-3">
                    {referredFriends.map((friend, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 bg-brand-primary text-white rounded-full flex items-center justify-center font-bold">
                          {friend.referred?.name ? friend.referred.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{friend.referred?.name || 'Nome non disponibile'}</div>
                          <div className="text-sm text-secondary">
                            Invitato il {new Date(friend.created_at).toLocaleDateString('it-IT')} • 
                            Status: {friend.status === 'completed' ? '✅ Completato' : '⏳ In attesa'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm font-medium">
                            {friend.status === 'completed' ? (
                              <span className="text-green-600">✅ Attivo</span>
                            ) : (
                              <span className="text-orange-600">⏳ In attesa primo acquisto</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gemme-red">
                            <span>+{friend.points_awarded || 0} </span>
                            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-amber-800">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    Inizia a invitare amici!
                  </h4>
                  <p className="text-sm text-amber-700">
                    Condividi il tuo codice referral per guadagnare gemme extra. 
                    I tuoi amici riceveranno 10 gemme di benvenuto e tu ne guadagnerai {isMultiplierActive ? '40' : '20'} al loro primo acquisto!
                  </p>
                </div>
              )}

              {/* AZIONI CONDIVISIONE */}
              <div className="grid grid-2 gap-3">
                <button
                  onClick={shareOnWhatsApp}
                  className="btn btn-success flex items-center gap-2 justify-center"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                  </svg>
                  Condividi su WhatsApp
                </button>
                <button
                  onClick={openShareModal}
                  className="btn btn-brand-secondary flex items-center gap-2 justify-center"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  Altri Social
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ANIMAZIONE GEMME */}
      {/* TABELLA TUTTI I CLIENTI */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title flex items-center gap-3">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Lista Completa Clienti
          </h2>
          <p className="card-subtitle">Visualizza tutti i clienti registrati nel sistema</p>
        </div>
        <div className="card-body">
          {/* Conteggi Riassuntivi */}
          <div className="customers-summary-grid mb-6">
            <div className="summary-card">
              <div className="summary-icon">👥</div>
              <div className="summary-content">
                <div className="summary-number">{customers.length}</div>
                <div className="summary-label">Clienti Totali</div>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon male">👨</div>
              <div className="summary-content">
                <div className="summary-number">{customers.filter(c => {
                  const gender = (c.gender || '').toLowerCase()
                  return gender === 'm' || gender === 'male'
                }).length}</div>
                <div className="summary-label">Maschi</div>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon female">👩</div>
              <div className="summary-content">
                <div className="summary-number">{customers.filter(c => {
                  const gender = (c.gender || '').toLowerCase()
                  return gender === 'f' || gender === 'female'
                }).length}</div>
                <div className="summary-label">Femmine</div>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">🔔</div>
              <div className="summary-content">
                <div className="summary-number">{customers.filter(c => c.onesignal_player_id).length}</div>
                <div className="summary-label">Con Notifiche</div>
              </div>
            </div>
          </div>

          {/* Tabella Clienti */}
          {customers.length > 0 ? (
            <div className="customers-table-wrapper">
              <table className="customers-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Contatti</th>
                    <th>Punti</th>
                    <th>Livello</th>
                    <th>Stato</th>
                    <th>Registrato</th>
                    <th>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(customer => {
                    const gender = customer.gender?.toLowerCase()
                    const customerLevel = getCustomerLevel(customer.points)
                    
                    return (
                      <tr key={customer.id} className={selectedCustomer?.id === customer.id ? 'selected' : ''}>
                        <td>
                          <div className="customer-cell">
                            <div className={`gender-avatar ${gender === 'm' || gender === 'male' ? 'male' : gender === 'f' || gender === 'female' ? 'female' : 'neutral'}`}>
                              {customer.avatar_url ? (
                                <img 
                                  src={customer.avatar_url} 
                                  alt={`Avatar di ${customer.name}`}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    borderRadius: '50%'
                                  }}
                                  onError={(e) => {
                                    // Se l'immagine non si carica, mostra l'icona genere
                                    e.target.style.display = 'none'
                                    e.target.nextSibling.style.display = 'block'
                                  }}
                                />
                              ) : null}
                              <span 
                                style={{ 
                                  display: customer.avatar_url ? 'none' : 'block',
                                  fontSize: '1.3em'
                                }}
                              >
                                {gender === 'm' || gender === 'male' ? '👨' : 
                                 gender === 'f' || gender === 'female' ? '👩' : '👤'}
                              </span>
                            </div>
                            <div className="customer-info-text">
                              <div className="customer-name">{customer.name}</div>
                              <div className="customer-id">#{customer.id.substring(0, 8)}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="contact-cell">
                            {customer.email && (
                              <div className="contact-item">
                                <span className="contact-icon">📧</span>
                                <span className="contact-value">{customer.email}</span>
                              </div>
                            )}
                            {customer.phone && (
                              <div className="contact-item">
                                <span className="contact-icon">📱</span>
                                <span className="contact-value">{customer.phone}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="points-cell">
                            <img src="/gemma-rossa.png" alt="Gemme" className="points-gem" />
                            <span className="points-number">{customer.points || 0}</span>
                          </div>
                        </td>
                        <td>
                          <div 
                            className="level-badge"
                            style={{ backgroundColor: customerLevel.primary_color }}
                          >
                            <span dangerouslySetInnerHTML={{ __html: customerLevel.icon_svg }} />
                            <span>{customerLevel.name}</span>
                          </div>
                        </td>
                        <td>
                          <div className={`status-badge ${customer.is_active ? 'active' : 'inactive'}`}>
                            <span className="status-icon">
                              {customer.is_active ? '✅' : '❌'}
                            </span>
                            <span className="status-text">
                              {customer.is_active ? 'Attivo' : 'Disattivo'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="registration-date">
                            {new Date(customer.created_at).toLocaleDateString('it-IT', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </div>
                        </td>
                        <td>
                          <div className="actions-cell">
                            <button
                              onClick={() => selectCustomer(customer, 'ricerca')}
                              className="action-btn select-btn"
                              title="Seleziona cliente"
                            >
                              👁️
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCustomer(customer)
                                setShowEditModal(true)
                              }}
                              className="action-btn edit-btn"
                              title="Modifica cliente"
                            >
                              ✏️
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-customers-state">
              <div className="no-customers-icon">👥</div>
              <h3>Nessun cliente trovato</h3>
              <p>I clienti appariranno qui una volta registrati nel sistema</p>
            </div>
          )}
        </div>
      </div>

      {showGemmeRain && (
        <div className="gemme-rain">
          {[...Array(18)].map((_, i) => (
            <img
              key={i}
              src="/gemma-rossa.png"
              alt="gemma"
              className="gemma-drop"
              style={{
                left: `${Math.random() * 95}%`,
                animationDelay: `${Math.random() * 0.7}s`
              }}
            />
          ))}
        </div>
      )}


      {/* Modal per modifica dati cliente */}
      <EditCustomerModal
        customer={selectedCustomer}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveCustomer}
        showNotification={showNotification}
      />

      {/* Modal per deselezione cliente */}
      <DeactivateCustomerModal
        customer={selectedCustomer}
        isOpen={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        onConfirm={handleDeactivateCustomer}
        showNotification={showNotification}
      />

      {/* Modal per messaggi staff */}
      {showStaffMessages && (
        <StaffMessageModal
          customer={selectedCustomer}
          user={user}
          onClose={() => setShowStaffMessages(false)}
          showNotification={showNotification}
        />
      )}
    </div>
  )
}

export default CustomerView
