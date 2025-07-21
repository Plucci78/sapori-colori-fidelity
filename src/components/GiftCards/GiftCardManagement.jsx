import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import emailjs from '@emailjs/browser'
import './GiftCardManagement.css'

const GiftCardManagement = ({ showNotification }) => {
  const [giftCards, setGiftCards] = useState([])
  const [customers, setCustomers] = useState([])
  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(true)
  const [receiptsLoading, setReceiptsLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewCard, setPreviewCard] = useState(null)
  const [redeemCode, setRedeemCode] = useState('')
  const [redeemAmount, setRedeemAmount] = useState('')
  const [redeemLoading, setRedeemLoading] = useState(false)
  const [foundCard, setFoundCard] = useState(null)
  
  // Configurazione EmailJS
  const EMAIL_CONFIG = {
    serviceId: 'service_f6lj74h',
    templateId: 'template_kvxg4p9',  // Useremo lo stesso template o ne creiamo uno nuovo
    publicKey: 'P0A99o_tLGsOuzhDs'
  }
  const [newCard, setNewCard] = useState({
    purchaser_customer_id: '',
    amount: '',
    recipient_name: '',
    recipient_email: '',
    message: '',
    expires_at: ''
  })

  useEffect(() => {
    // Inizializza EmailJS
    emailjs.init(EMAIL_CONFIG.publicKey)
    loadGiftCards()
    loadCustomers()
    loadReceipts()
  }, [])

  const loadGiftCards = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('gift_cards')
        .select(`
          *,
          purchaser:customers!purchaser_customer_id(
            id,
            name,
            email,
            phone
          )
        `)
        .order('purchase_date', { ascending: false })

      if (error) throw error
      setGiftCards(data || [])
    } catch (error) {
      console.error('Errore caricamento gift card:', error)
      showNotification?.('Errore nel caricamento delle gift card', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, phone')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('Errore caricamento clienti:', error)
      showNotification?.('Errore nel caricamento dei clienti', 'error')
    }
  }

  const loadReceipts = async () => {
    try {
      setReceiptsLoading(true)
      const { data, error } = await supabase
        .from('gift_card_receipts')
        .select(`
          *,
          gift_card:gift_cards(
            id,
            code,
            recipient_name,
            amount,
            balance,
            purchaser:customers!purchaser_customer_id(
              name
            )
          )
        `)
        .order('printed_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setReceipts(data || [])
    } catch (error) {
      console.error('Errore caricamento ricevute:', error)
      showNotification?.('Errore nel caricamento delle ricevute', 'error')
    } finally {
      setReceiptsLoading(false)
    }
  }

  const generateCode = () => {
    return 'GC' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase()
  }

  // Funzione per registrare una ricevuta stampata
  const recordReceiptPrint = async (giftCard, receiptType = 'courtesy', notes = '') => {
    try {
      const receiptData = {
        gift_card_code: giftCard.code,
        recipient_name: giftCard.recipient_name,
        purchaser_name: giftCard.purchaser?.name,
        amount: giftCard.amount,
        balance: giftCard.balance,
        purchase_date: giftCard.purchase_date,
        expires_at: giftCard.expires_at,
        print_timestamp: new Date().toISOString()
      }

      const { error } = await supabase
        .from('gift_card_receipts')
        .insert({
          gift_card_id: giftCard.id,
          receipt_type: receiptType,
          receipt_data: receiptData,
          notes: notes || null
        })

      if (error) throw error
      
      // Ricarica la lista delle ricevute
      await loadReceipts()
      
      return true
    } catch (error) {
      console.error('Errore registrazione ricevuta:', error)
      showNotification?.('Errore nella registrazione della ricevuta', 'error')
      return false
    }
  }

  // Funzione per inviare email gift card
  const sendGiftCardEmail = async (giftCardData, purchaserData) => {
    if (!giftCardData.recipient_email) {
      return { success: true, message: 'Nessuna email destinatario fornita' }
    }

    try {
      const emailData = {
        to_email: giftCardData.recipient_email,
        to_name: giftCardData.recipient_name,
        from_name: 'Sapori & Colori',
        reply_to: 'noreply@saporicolori.it',
        
        // Dati specifici gift card
        gift_card_code: giftCardData.code,
        gift_card_amount: formatCurrency(giftCardData.amount),
        recipient_name: giftCardData.recipient_name,
        personal_message: giftCardData.message || 'Ti auguriamo di goderti questa esperienza gastronomica!',
        purchaser_name: purchaserData?.name || 'Un amico speciale',
        
        // Template specifico per gift card
        subject: `🎁 Hai ricevuto una Gift Card da Sapori & Colori!`,
        message: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px; }
        .gift-card { background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%); color: white; padding: 25px; border-radius: 12px; margin: 20px 0; text-align: center; }
        .code { font-family: monospace; font-size: 24px; font-weight: bold; letter-spacing: 3px; background: rgba(255,255,255,0.2); padding: 10px; border-radius: 8px; margin: 15px 0; }
        .message { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #D4AF37; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎁 SAPORI & COLORI</h1>
            <h2>Hai ricevuto una Gift Card!</h2>
        </div>
        
        <div class="content">
            <p><strong>Ciao ${giftCardData.recipient_name}!</strong></p>
            
            <p>${purchaserData?.name || 'Qualcuno di speciale'} ti ha inviato una fantastica Gift Card per goderti le delizie di <strong>Sapori & Colori</strong>!</p>
            
            ${giftCardData.message ? `
            <div class="message">
                <h4>💌 Messaggio personale:</h4>
                <p><em>"${giftCardData.message}"</em></p>
            </div>
            ` : ''}
            
            <div class="gift-card">
                <h3>🎊 LA TUA GIFT CARD 🎊</h3>
                <p><strong>Valore:</strong> ${formatCurrency(giftCardData.amount)}</p>
                <div class="code">${giftCardData.code}</div>
                <p><small>Conserva questo codice per utilizzare la tua gift card</small></p>
            </div>
            
            <h4>📍 Come utilizzarla:</h4>
            <ol>
                <li>Vieni al nostro ristorante <strong>Sapori & Colori</strong></li>
                <li>Comunica il codice: <strong>${giftCardData.code}</strong></li>
                <li>L'importo verrà scalato automaticamente dal tuo ordine</li>
            </ol>
            
            <p><strong>📞 Contatti:</strong><br>
            📍 Via della Gastronomia, 123 - Città<br>
            📞 +39 123 456 7890<br>
            🌐 www.saporicolori.it</p>
            
            <p style="text-align: center; color: #D4AF37; font-weight: bold;">
                Ti aspettiamo per un'esperienza gastronomica indimenticabile! 🍝✨
            </p>
        </div>
        
        <div class="footer">
            <p>Questa email è stata generata automaticamente dal sistema di gestione gift card di Sapori & Colori</p>
        </div>
    </div>
</body>
</html>
        `
      }

      await emailjs.send(
        EMAIL_CONFIG.serviceId,
        EMAIL_CONFIG.templateId,
        emailData,
        EMAIL_CONFIG.publicKey
      )

      return { success: true, message: 'Email inviata con successo' }
    } catch (error) {
      console.error('Errore invio email gift card:', error)
      return { success: false, message: 'Errore nell\'invio dell\'email: ' + error.message }
    }
  }

  const createGiftCard = async () => {
    try {
      if (!newCard.purchaser_customer_id || !newCard.amount || !newCard.recipient_name) {
        showNotification?.('Compila cliente acquirente, importo e nome destinatario', 'error')
        return
      }

      const code = generateCode()
      const amount = parseFloat(newCard.amount)
      
      // Trova i dati dell'acquirente per l'email
      const purchaser = customers.find(c => c.id === newCard.purchaser_customer_id)
      
      const { error } = await supabase
        .from('gift_cards')
        .insert({
          code,
          purchaser_customer_id: newCard.purchaser_customer_id,
          amount: amount,
          purchase_amount: amount, // Per ora uguale al valore, in futuro si potrebbe avere uno sconto
          recipient_name: newCard.recipient_name,
          recipient_email: newCard.recipient_email || null,
          message: newCard.message || null,
          expires_at: newCard.expires_at || null,
          status: 'active',
          balance: amount
        })

      if (error) throw error

      showNotification?.(`Gift Card ${code} creata con successo!`, 'success')
      
      setShowCreateModal(false)
      setSearchTerm('')
      setNewCard({
        purchaser_customer_id: '',
        amount: '',
        recipient_name: '',
        recipient_email: '',
        message: '',
        expires_at: ''
      })
      loadGiftCards()
    } catch (error) {
      console.error('Errore creazione gift card:', error)
      showNotification?.('Errore nella creazione della gift card', 'error')
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('it-IT')
  }

  const getStatusColor = (status, expiresAt) => {
    if (status === 'used') return 'text-gray-500'
    if (expiresAt && new Date(expiresAt) < new Date()) return 'text-red-500'
    return 'text-green-500'
  }

  const getStatusText = (status, expiresAt, balance, originalAmount) => {
    if (status === 'used' || balance <= 0) return 'Utilizzata'
    if (expiresAt && new Date(expiresAt) < new Date()) return 'Scaduta'
    if (balance < originalAmount) return 'Parzialmente utilizzata'
    return 'Attiva'
  }

  // Verifica gift card per codice
  const checkGiftCard = async () => {
    if (!redeemCode.trim()) {
      showNotification?.('Inserisci il codice della gift card', 'error')
      return
    }

    try {
      setRedeemLoading(true)
      const { data, error } = await supabase
        .from('gift_cards')
        .select(`
          *,
          purchaser:customers!purchaser_customer_id(
            id,
            name,
            email
          )
        `)
        .eq('code', redeemCode.trim().toUpperCase())
        .single()

      if (error || !data) {
        setFoundCard(null)
        showNotification?.('Gift card non trovata', 'error')
        return
      }

      // Verifica se è scaduta
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setFoundCard(null)
        showNotification?.('Gift card scaduta', 'error')
        return
      }

      // Verifica se è già utilizzata
      if (data.status === 'used' || data.balance <= 0) {
        setFoundCard(null)
        showNotification?.('Gift card già utilizzata completamente', 'error')
        return
      }

      setFoundCard(data)
      showNotification?.(`Gift card trovata! Saldo disponibile: ${formatCurrency(data.balance)}`, 'success')
    } catch (error) {
      console.error('Errore verifica gift card:', error)
      showNotification?.('Errore nella verifica della gift card', 'error')
      setFoundCard(null)
    } finally {
      setRedeemLoading(false)
    }
  }

  // Riscatta gift card
  const redeemGiftCard = async () => {
    if (!foundCard) {
      showNotification?.('Prima verifica la gift card', 'error')
      return
    }

    if (!redeemAmount || parseFloat(redeemAmount) <= 0) {
      showNotification?.('Inserisci un importo valido da utilizzare', 'error')
      return
    }

    const amount = parseFloat(redeemAmount)
    if (amount > foundCard.balance) {
      showNotification?.(`Importo troppo alto. Saldo disponibile: ${formatCurrency(foundCard.balance)}`, 'error')
      return
    }

    try {
      setRedeemLoading(true)

      // Utilizza la funzione SQL per il riscatto
      const { data, error } = await supabase.rpc('use_gift_card', {
        card_code: foundCard.code,
        use_amount: amount,
        description_param: `Riscatto manuale - Importo: ${formatCurrency(amount)}`
      })

      if (error) throw error

      const result = data
      if (!result.success) {
        showNotification?.(`Errore: ${result.error}`, 'error')
        return
      }

      showNotification?.(`🎉 Gift card utilizzata! Importo scalato: ${formatCurrency(amount)}. Saldo rimanente: ${formatCurrency(result.remaining_balance)}`, 'success')
      
      // Aggiorna il foundCard con il nuovo saldo per mostrarlo immediatamente
      setFoundCard(prev => ({
        ...prev,
        balance: result.remaining_balance,
        status: result.remaining_balance <= 0 ? 'used' : 'active'
      }))
      
      // Reset solo l'importo per permettere altri utilizzi
      setRedeemAmount('')
      
      // Ricarica la lista per aggiornare i saldi in background
      await loadGiftCards()
      
      // Se l'anteprima è aperta per questa gift card, aggiorna anche quella
      if (previewCard && previewCard.code === foundCard.code) {
        setPreviewCard(prev => ({
          ...prev,
          balance: result.remaining_balance,
          status: result.remaining_balance <= 0 ? 'used' : 'active'
        }))
      }
    } catch (error) {
      console.error('Errore riscatto gift card:', error)
      showNotification?.('Errore nel riscatto della gift card', 'error')
    } finally {
      setRedeemLoading(false)
    }
  }

  return (
    <div className="gift-card-management">
      <div className="header">
        <div>
          <h1>🎁 Gestione Gift Card</h1>
          <p>Crea e gestisci le gift card digitali</p>
        </div>
        <button
          className="btn btn-black btn-change-text"
          onClick={() => setShowCreateModal(true)}
          data-hover="➕ CREA"
        >
          ➕ Nuova Gift Card
        </button>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner">⏳</div>
          <p>Caricamento gift card...</p>
        </div>
      ) : (
        <div className="gift-cards-table-container">
          {giftCards.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎁</div>
              <h3>Nessuna Gift Card</h3>
              <p>Registra il primo acquisto per iniziare</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="gift-cards-table">
                <thead>
                  <tr>
                    <th>Codice</th>
                    <th>Acquirente</th>
                    <th>Data Acquisto</th>
                    <th>Valore</th>
                    <th>Saldo</th>
                    <th>Destinatario</th>
                    <th>Stato</th>
                    <th>Scadenza</th>
                    <th>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {giftCards.map(card => (
                    <tr key={card.id} className={`table-row ${card.status}`}>
                      <td className="code-cell">
                        <code className="gift-code">{card.code}</code>
                      </td>
                      <td className="customer-cell">
                        <div className="customer-info">
                          <div className="customer-name">{card.purchaser?.name || 'N/A'}</div>
                          {card.purchaser?.email && (
                            <div className="customer-email">{card.purchaser.email}</div>
                          )}
                        </div>
                      </td>
                      <td className="date-cell">
                        {formatDate(card.purchase_date)}
                      </td>
                      <td className="amount-cell">
                        <strong>{formatCurrency(card.amount)}</strong>
                      </td>
                      <td className="balance-cell">
                        <span className={card.balance < card.amount ? 'partial-balance' : 'full-balance'}>
                          {formatCurrency(card.balance)}
                        </span>
                      </td>
                      <td className="recipient-cell">
                        <div className="recipient-info">
                          <div className="recipient-name">{card.recipient_name}</div>
                          {card.recipient_email && (
                            <div className="recipient-email">{card.recipient_email}</div>
                          )}
                        </div>
                      </td>
                      <td className="status-cell">
                        <span className={`status-badge ${getStatusColor(card.status, card.expires_at).replace('text-', '')}`}>
                          {getStatusText(card.status, card.expires_at, card.balance, card.amount)}
                        </span>
                      </td>
                      <td className="expiry-cell">
                        {card.expires_at ? formatDate(card.expires_at) : 'Mai'}
                      </td>
                      <td className="actions-cell">
                        <button
                          className="btn-preview"
                          onClick={() => {
                            // Trova la gift card più aggiornata dalla lista corrente
                            const updatedCard = giftCards.find(gc => gc.id === card.id) || card
                            setPreviewCard(updatedCard)
                            setShowPreviewModal(true)
                          }}
                          title="Anteprima Gift Card"
                        >
                          👁️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SEZIONE RISCATTO GIFT CARD */}
      <div className="redeem-section">
        <div className="redeem-header">
          <h2>💳 Riscatta Gift Card</h2>
          <p>Inserisci il codice per verificare il saldo e utilizzare la gift card</p>
        </div>
        
        <div className="redeem-form">
          <div className="redeem-step-1">
            <div className="form-group-inline">
              <label>Codice Gift Card</label>
              <input
                type="text"
                placeholder="es: GC123ABC"
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                className="redeem-input"
                maxLength="20"
              />
              <button
                className="btn btn-brand-primary"
                onClick={checkGiftCard}
                disabled={redeemLoading || !redeemCode.trim()}
              >
                {redeemLoading ? '⏳' : '🔍'} Verifica
              </button>
            </div>
          </div>

          {foundCard && (
            <div className="redeem-step-2">
              <div className="found-card-info" style={{
                background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 50%, #8B7D3A 100%)',
                color: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 10px 30px rgba(212, 175, 55, 0.4)',
                position: 'relative',
                overflow: 'hidden',
                minHeight: '200px',
                border: 'none'
              }}>
                <div className="found-card-header" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '24px',
                  position: 'relative',
                  zIndex: 2
                }}>
                  <span className="found-icon" style={{
                    fontSize: '2rem',
                    background: 'rgba(255, 255, 255, 0.2)',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid rgba(255, 255, 255, 0.3)'
                  }}>✅</span>
                  <span className="found-title" style={{
                    fontSize: '1.4rem',
                    fontWeight: '800',
                    color: 'white',
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
                    letterSpacing: '1px'
                  }}>Gift Card Trovata!</span>
                </div>
                <div className="found-details" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px'
                }}>
                  <div className="detail-item" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    transition: 'all 0.3s ease'
                  }}>
                    <span className="label" style={{
                      fontSize: '0.7rem',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      marginBottom: '4px'
                    }}>Codice:</span>
                    <span className="value" style={{
                      fontWeight: '700',
                      color: 'white',
                      fontSize: '1rem',
                      textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)'
                    }}>{foundCard.code}</span>
                  </div>
                  <div className="detail-item" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    transition: 'all 0.3s ease'
                  }}>
                    <span className="label" style={{
                      fontSize: '0.7rem',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      marginBottom: '4px'
                    }}>Destinatario:</span>
                    <span className="value" style={{
                      fontWeight: '700',
                      color: 'white',
                      fontSize: '1rem',
                      textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)'
                    }}>{foundCard.recipient_name}</span>
                  </div>
                  <div className="detail-item" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    transition: 'all 0.3s ease'
                  }}>
                    <span className="label" style={{
                      fontSize: '0.7rem',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      marginBottom: '4px'
                    }}>Valore originale:</span>
                    <span className="value" style={{
                      fontWeight: '700',
                      color: 'white',
                      fontSize: '1rem',
                      textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)'
                    }}>{formatCurrency(foundCard.amount)}</span>
                  </div>
                  <div className="detail-item" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    transition: 'all 0.3s ease'
                  }}>
                    <span className="label" style={{
                      fontSize: '0.7rem',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      marginBottom: '4px'
                    }}>Saldo disponibile:</span>
                    <span className="value balance-amount" style={{
                      fontWeight: '800',
                      color: '#FFF8DC',
                      fontSize: '1.3rem',
                      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.6)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      padding: '4px 8px',
                      borderRadius: '6px'
                    }}>{formatCurrency(foundCard.balance)}</span>
                  </div>
                  {foundCard.purchaser && (
                    <div className="detail-item" style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      transition: 'all 0.3s ease'
                    }}>
                      <span className="label" style={{
                        fontSize: '0.7rem',
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        marginBottom: '4px'
                      }}>Acquistata da:</span>
                      <span className="value" style={{
                        fontWeight: '700',
                        color: 'white',
                        fontSize: '1rem',
                        textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)'
                      }}>{foundCard.purchaser.name}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="use-card-form">
                <div className="form-group-inline">
                  <label>Importo da utilizzare</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={redeemAmount}
                    onChange={(e) => setRedeemAmount(e.target.value)}
                    className="redeem-input"
                    min="0.01"
                    max={foundCard.balance}
                    step="0.01"
                  />
                  <button
                    className="btn btn-success"
                    onClick={redeemGiftCard}
                    disabled={redeemLoading || !redeemAmount || parseFloat(redeemAmount) <= 0}
                  >
                    {redeemLoading ? '⏳' : '💰'} Riscatta
                  </button>
                </div>
                <div className="quick-amounts">
                  <span className="quick-label">Importi rapidi:</span>
                  {[10, 25, 50].filter(amount => amount <= foundCard.balance).map(amount => (
                    <button
                      key={amount}
                      className="btn-quick-amount"
                      onClick={() => setRedeemAmount(amount.toString())}
                    >
                      <span>€{amount}</span>
                    </button>
                  ))}
                  <button
                    className="btn-quick-amount"
                    onClick={() => setRedeemAmount(foundCard.balance.toString())}
                  >
                    <span>Tutto ({formatCurrency(foundCard.balance)})</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SEZIONE RICEVUTE STAMPATE */}
      <div className="receipts-section">
        <div className="receipts-header">
          <h2>📄 Ricevute Stampate</h2>
          <p>Storico delle stampe effettuate</p>
        </div>
        
        {receiptsLoading ? (
          <div className="loading">
            <div className="spinner">⏳</div>
            <p>Caricamento ricevute...</p>
          </div>
        ) : receipts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <h3>Nessuna Ricevuta Stampata</h3>
            <p>Le stampe effettuate verranno registrate qui</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="receipts-table">
              <thead>
                <tr>
                  <th>Data Stampa</th>
                  <th>Tipo</th>
                  <th>Codice Gift Card</th>
                  <th>Destinatario</th>
                  <th>Acquirente</th>
                  <th>Valore</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map(receipt => (
                  <tr key={receipt.id} className="table-row">
                    <td className="date-cell">
                      {new Date(receipt.printed_at).toLocaleDateString('it-IT', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="type-cell">
                      <span className={`type-badge ${receipt.receipt_type}`}>
                        {receipt.receipt_type === 'courtesy' ? '🧾 Ricevuta' : 
                         receipt.receipt_type === 'gift_card' ? '🎁 Gift Card' : 
                         '💳 Transazione'}
                      </span>
                    </td>
                    <td className="code-cell">
                      <code className="gift-code">{receipt.gift_card?.code || 'N/A'}</code>
                    </td>
                    <td className="recipient-cell">
                      {receipt.gift_card?.recipient_name || 'N/A'}
                    </td>
                    <td className="purchaser-cell">
                      {receipt.gift_card?.purchaser?.name || 'N/A'}
                    </td>
                    <td className="amount-cell">
                      <strong>{receipt.gift_card?.amount ? formatCurrency(receipt.gift_card.amount) : 'N/A'}</strong>
                    </td>
                    <td className="notes-cell">
                      <span className="notes-text" title={receipt.notes}>
                        {receipt.notes || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Creazione Gift Card */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🎁 Registra Acquisto Gift Card</h2>
              <button 
                className="close-button"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-content">
              <div className="form-group">
                <label>Cliente Acquirente *</label>
                <div className="customer-search">
                  <input
                    type="text"
                    placeholder="Cerca cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  {searchTerm && (
                    <div className="customer-dropdown">
                      {customers
                        .filter(customer => 
                          customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .slice(0, 5)
                        .map(customer => (
                          <div 
                            key={customer.id}
                            className="customer-option"
                            onClick={() => {
                              setNewCard(prev => ({ ...prev, purchaser_customer_id: customer.id }))
                              setSearchTerm(`${customer.name} (${customer.email || customer.phone || 'N/A'})`)
                            }}
                          >
                            <div className="customer-name">{customer.name}</div>
                            <div className="customer-details">
                              {customer.email || customer.phone || 'Nessun contatto'}
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Importo *</label>
                <input
                  type="number"
                  placeholder="es: 50.00"
                  value={newCard.amount}
                  onChange={(e) => setNewCard(prev => ({ ...prev, amount: e.target.value }))}
                  min="1"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label>Nome Destinatario *</label>
                <input
                  type="text"
                  placeholder="Nome del destinatario"
                  value={newCard.recipient_name}
                  onChange={(e) => setNewCard(prev => ({ ...prev, recipient_name: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Email Destinatario</label>
                <input
                  type="email"
                  placeholder="email@esempio.com"
                  value={newCard.recipient_email}
                  onChange={(e) => setNewCard(prev => ({ ...prev, recipient_email: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Messaggio Personalizzato</label>
                <textarea
                  placeholder="Messaggio di auguri o dedica..."
                  value={newCard.message}
                  onChange={(e) => setNewCard(prev => ({ ...prev, message: e.target.value }))}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Data di Scadenza</label>
                <input
                  type="date"
                  value={newCard.expires_at}
                  onChange={(e) => setNewCard(prev => ({ ...prev, expires_at: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Annulla
              </button>
              <button 
                className="btn btn-brand-primary"
                onClick={createGiftCard}
                disabled={!newCard.purchaser_customer_id || !newCard.amount || !newCard.recipient_name}
              >
                🎁 Registra Acquisto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Anteprima Gift Card */}
      {showPreviewModal && previewCard && (
        <div className="modal-overlay" onClick={() => setShowPreviewModal(false)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <h2>🎁 Anteprima Gift Card</h2>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowPreviewModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="gift-card-preview">
              {/* FRONTE GIFT CARD */}
              <div className="gift-card-front" id="gift-card-front">
                <div className="card-border">
                  <div className="card-header">
                    <div className="business-name">SAPORI & COLORI</div>
                    <div className="gift-card-title">GIFT CARD</div>
                  </div>
                  
                  <div className="card-main">
                    <div className="decorative-pattern"></div>
                    
                    <div className="card-value-section">
                      {/* Se la gift card non è mai stata usata, mostra solo il valore */}
                      {previewCard.balance === previewCard.amount ? (
                        // Layout singolo per gift card non utilizzata
                        <div style={{ textAlign: 'center' }}>
                          <div className="value-label" style={{
                            fontSize: '0.7rem',
                            letterSpacing: '1px',
                            opacity: 0.8,
                            marginBottom: '6px'
                          }}>VALORE</div>
                          <div className="value-amount" style={{
                            fontSize: '2.2rem',
                            fontWeight: 'bold',
                            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
                            letterSpacing: '1px',
                            lineHeight: '1.1',
                            margin: '0'
                          }}>{formatCurrency(previewCard.amount)}</div>
                          
                          {/* Badge per gift card nuova */}
                          <div style={{
                            fontSize: '0.7rem',
                            marginTop: '10px',
                            padding: '4px 12px',
                            background: 'rgba(255, 215, 0, 0.3)',
                            borderRadius: '12px',
                            color: '#FFD700',
                            textAlign: 'center',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            display: 'inline-block'
                          }}>
                            NUOVA
                          </div>
                        </div>
                      ) : (
                        // Layout a due colonne per gift card utilizzata
                        <>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '12px',
                            alignItems: 'start'
                          }}>
                            {/* Colonna Sinistra - Valore Originale */}
                            <div style={{ textAlign: 'center' }}>
                              <div className="value-label" style={{
                                fontSize: '0.6rem',
                                letterSpacing: '1px',
                                opacity: 0.8,
                                marginBottom: '4px'
                              }}>VALORE</div>
                              <div className="value-amount" style={{
                                fontSize: '1.6rem',
                                fontWeight: 'bold',
                                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
                                letterSpacing: '1px',
                                lineHeight: '1.1',
                                margin: '0'
                              }}>{formatCurrency(previewCard.amount)}</div>
                            </div>

                            {/* Colonna Destra - Saldo Attuale */}
                            <div style={{ textAlign: 'center' }}>
                              <div className="balance-label" style={{
                                fontSize: '0.6rem',
                                letterSpacing: '1px',
                                opacity: 0.9,
                                marginBottom: '4px',
                                color: '#FFF8DC'
                              }}>SALDO</div>
                              <div className="balance-amount" style={{
                                fontSize: '1.6rem',
                                color: previewCard.balance > 0 ? '#FFD700' : '#FF6B6B',
                                fontWeight: 'bold',
                                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
                                letterSpacing: '1px',
                                lineHeight: '1.1',
                                margin: '0'
                              }}>{formatCurrency(previewCard.balance)}</div>
                            </div>
                          </div>
                          
                          {/* Indicatore di stato per gift card utilizzata */}
                          <div style={{
                            fontSize: '0.65rem',
                            marginTop: '8px',
                            padding: '3px 10px',
                            background: previewCard.balance > 0 ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 107, 107, 0.2)',
                            borderRadius: '12px',
                            color: previewCard.balance > 0 ? '#FFD700' : '#FF6B6B',
                            textAlign: 'center',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            display: 'inline-block'
                          }}>
                            {previewCard.balance > 0 ? 'PARZIALMENTE USATA' : 'UTILIZZATA'}
                          </div>
                        </>
                      )}
                    </div>
                    
                    <div className="card-recipient-section">
                      <div className="recipient-to">PER:</div>
                      <div className="recipient-name">{previewCard.recipient_name}</div>
                      {previewCard.message && (
                        <div className="personal-message">"{previewCard.message}"</div>
                      )}
                    </div>
                    
                    <div className="card-code-section">
                      <div className="code-label">CODICE GIFT CARD</div>
                      <div className="gift-code">{previewCard.code}</div>
                    </div>
                    
                    <div className="card-footer-info">
                      <div className="footer-left">
                        <div className="valid-info">
                          {previewCard.expires_at ? `Valida fino al ${formatDate(previewCard.expires_at)}` : 'Valida senza scadenza'}
                        </div>
                        <div className="purchase-info">
                          Acquistata il {formatDate(previewCard.purchase_date)}
                        </div>
                      </div>
                      <div className="footer-right">
                        <div className="qr-placeholder">
                          <div className="qr-box">QR</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* RETRO GIFT CARD */}
              <div className="gift-card-back" id="gift-card-back">
                <div className="card-border">
                  <div className="back-header">
                    <div className="business-logo">🍝 SAPORI & COLORI</div>
                  </div>
                  
                  <div className="back-content">
                    <h3>COME UTILIZZARE LA TUA GIFT CARD</h3>
                    
                    <div className="instructions">
                      <div className="instruction-item">
                        <span className="step-number">1</span>
                        <span className="step-text">Presenta questa gift card al momento del pagamento</span>
                      </div>
                      <div className="instruction-item">
                        <span className="step-number">2</span>
                        <span className="step-text">Comunica il codice: <strong>{previewCard.code}</strong></span>
                      </div>
                      <div className="instruction-item">
                        <span className="step-number">3</span>
                        <span className="step-text">L'importo verrà scalato automaticamente dal tuo ordine</span>
                      </div>
                    </div>
                    
                    <div className="terms">
                      <h4>TERMINI E CONDIZIONI</h4>
                      <ul>
                        <li>Gift card non rimborsabile in denaro</li>
                        <li>Utilizzabile per tutti i prodotti del menu</li>
                        <li>Può essere utilizzata in più visite</li>
                        <li>In caso di smarrimento non sarà possibile il recupero</li>
                        {previewCard.expires_at && <li>Scade il {formatDate(previewCard.expires_at)}</li>}
                      </ul>
                    </div>
                    
                    <div className="contact-info">
                      <div className="contact-item">📍 Via della Gastronomia, 123 - Città</div>
                      <div className="contact-item">📞 +39 123 456 7890</div>
                      <div className="contact-item">🌐 www.saporicolori.it</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="preview-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowPreviewModal(false)}
              >
                Chiudi
              </button>
              <button 
                className="btn btn-success"
                onClick={async () => {
                  // Registra la stampa della ricevuta
                  const recorded = await recordReceiptPrint(previewCard, 'courtesy', 'Ricevuta di cortesia stampata')
                  if (!recorded) {
                    showNotification?.('Errore nella registrazione della ricevuta', 'error')
                  }
                  
                  // Stampa ricevuta scontrino di cortesia
                  const printWindow = window.open('', '_blank', 'width=400,height=600')
                  printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <title>Ricevuta Gift Card - ${previewCard.code}</title>
                      <style>
                        body { 
                          margin: 0; 
                          padding: 15px; 
                          font-family: 'Courier New', monospace; 
                          font-size: 12px; 
                          line-height: 1.3; 
                          color: #333; 
                          background: white;
                          max-width: 80mm;
                        }
                        .receipt-container { 
                          border: 1px dashed #333; 
                          padding: 10px; 
                          margin: 0 auto;
                          background: white;
                        }
                        .header { 
                          text-align: center; 
                          border-bottom: 1px solid #333; 
                          padding-bottom: 8px; 
                          margin-bottom: 10px; 
                        }
                        .business-name { 
                          font-weight: bold; 
                          font-size: 14px; 
                          margin-bottom: 2px; 
                          letter-spacing: 1px;
                        }
                        .business-subtitle { 
                          font-size: 10px; 
                          margin-bottom: 4px; 
                        }
                        .receipt-title { 
                          font-weight: bold; 
                          font-size: 13px; 
                          margin-top: 8px;
                          text-decoration: underline;
                        }
                        .section { 
                          margin: 8px 0; 
                          border-bottom: 1px dotted #666; 
                          padding-bottom: 6px; 
                        }
                        .row { 
                          display: flex; 
                          justify-content: space-between; 
                          margin: 2px 0; 
                        }
                        .label { 
                          font-weight: bold; 
                        }
                        .value { 
                          text-align: right; 
                        }
                        .total-row { 
                          font-weight: bold; 
                          font-size: 13px; 
                          border-top: 1px solid #333; 
                          padding-top: 4px; 
                          margin-top: 6px;
                        }
                        .gift-code { 
                          text-align: center; 
                          font-weight: bold; 
                          font-size: 14px; 
                          letter-spacing: 2px; 
                          margin: 8px 0;
                          border: 1px solid #333;
                          padding: 6px;
                          background: #f0f0f0;
                        }
                        .footer { 
                          text-align: center; 
                          font-size: 10px; 
                          margin-top: 10px; 
                          padding-top: 8px;
                          border-top: 1px solid #333;
                        }
                        .instructions { 
                          font-size: 10px; 
                          margin: 8px 0; 
                          text-align: justify;
                        }
                        .thank-you { 
                          text-align: center; 
                          font-weight: bold; 
                          margin: 8px 0; 
                        }
                        @media print { 
                          body { print-color-adjust: exact; }
                          .receipt-container { border: 1px dashed #000; }
                        }
                      </style>
                    </head>
                    <body>
                      <div class="receipt-container">
                        <div class="header">
                          <div class="business-name">SAPORI & COLORI</div>
                          <div class="business-subtitle">Ristorante & Gastronomia</div>
                          <div class="receipt-title">RICEVUTA GIFT CARD</div>
                        </div>

                        <div class="section">
                          <div class="row">
                            <span class="label">Data Acquisto:</span>
                            <span class="value">${formatDate(previewCard.purchase_date)}</span>
                          </div>
                          <div class="row">
                            <span class="label">Cliente:</span>
                            <span class="value">${previewCard.purchaser?.name || 'N/A'}</span>
                          </div>
                        </div>

                        <div class="section">
                          <div class="row">
                            <span class="label">Articolo:</span>
                            <span class="value">Gift Card Digitale</span>
                          </div>
                          <div class="row">
                            <span class="label">Destinatario:</span>
                            <span class="value">${previewCard.recipient_name}</span>
                          </div>
                        </div>

                        <div class="section">
                          <div class="row total-row">
                            <span class="label">VALORE GIFT CARD:</span>
                            <span class="value">${formatCurrency(previewCard.amount)}</span>
                          </div>
                          ${previewCard.balance < previewCard.amount ? `
                          <div class="row">
                            <span class="label">Saldo Utilizzato:</span>
                            <span class="value">-${formatCurrency(previewCard.amount - previewCard.balance)}</span>
                          </div>
                          <div class="row total-row">
                            <span class="label">SALDO ATTUALE:</span>
                            <span class="value">${formatCurrency(previewCard.balance)}</span>
                          </div>
                          ` : ''}
                        </div>

                        <div class="gift-code">
                          CODICE: ${previewCard.code}
                        </div>

                        <div class="instructions">
                          <strong>ISTRUZIONI:</strong><br>
                          1. Conserva questo codice per utilizzare la gift card<br>
                          2. Presenta al momento del pagamento<br>
                          3. Utilizzabile in più visite fino ad esaurimento<br>
                          ${previewCard.expires_at ? `4. Valida fino al ${formatDate(previewCard.expires_at)}` : '4. Nessuna scadenza'}
                        </div>

                        <div class="thank-you">
                          ★ GRAZIE PER LA FIDUCIA ★
                        </div>

                        <div class="footer">
                          Via della Gastronomia, 123 - Città<br>
                          Tel: +39 123 456 7890<br>
                          www.saporicolori.it<br><br>
                          <small>Ricevuta di cortesia - Non valida fiscalmente</small>
                        </div>
                      </div>
                    </body>
                    </html>
                  `)
                  printWindow.document.close()
                  printWindow.focus()
                  setTimeout(() => {
                    printWindow.print()
                    printWindow.close()
                  }, 250)
                }}
              >
                🧾 Stampa Ricevuta
              </button>
              <button 
                className="btn btn-brand-primary"
                onClick={async () => {
                  // Registra la stampa della gift card
                  const recorded = await recordReceiptPrint(previewCard, 'gift_card', 'Gift card stampata')
                  if (!recorded) {
                    showNotification?.('Errore nella registrazione della stampa', 'error')
                  }
                  
                  // Apri una nuova finestra per la stampa
                  const printWindow = window.open('', '_blank', 'width=800,height=600')
                  printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <title>Gift Card - ${previewCard.code}</title>
                      <style>
                        body { margin: 0; padding: 20px; font-family: Georgia, serif; background: white; }
                        .print-container { display: flex; gap: 40px; justify-content: center; align-items: flex-start; }
                        .gift-card { width: 400px; height: 250px; position: relative; background: linear-gradient(135deg, #D4AF37 0%, #B8860B 50%, #8B7D3A 100%); border-radius: 16px; overflow: hidden; color: white; margin-bottom: 20px; border: 2px solid rgba(255, 255, 255, 0.2); }
                        .card-border { position: absolute; top: 8px; left: 8px; right: 8px; bottom: 8px; border: 2px solid rgba(255, 255, 255, 0.3); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; background: rgba(255, 255, 255, 0.05); }
                        .card-header { text-align: center; margin-bottom: 16px; }
                        .business-name { font-size: 1.8rem; font-weight: bold; text-transform: uppercase; letter-spacing: 3px; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5); margin-bottom: 4px; }
                        .gift-card-title { font-size: 1rem; font-weight: 300; letter-spacing: 2px; opacity: 0.9; }
                        .card-main { flex: 1; position: relative; display: flex; flex-direction: column; justify-content: space-between; }
                        .card-value-section { text-align: center; margin: 16px 0; z-index: 2; position: relative; }
                        .value-label { font-size: 0.7rem; letter-spacing: 1px; opacity: 0.8; margin-bottom: 4px; }
                        .value-amount { font-size: 2.5rem; font-weight: bold; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5); letter-spacing: 1px; }
                        .card-recipient-section { text-align: center; margin: 12px 0; z-index: 2; position: relative; }
                        .recipient-to { font-size: 0.6rem; letter-spacing: 1px; opacity: 0.8; margin-bottom: 4px; }
                        .recipient-name { font-size: 1.2rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
                        .personal-message { font-size: 0.8rem; font-style: italic; opacity: 0.9; max-width: 280px; margin: 0 auto; line-height: 1.3; }
                        .card-code-section { text-align: center; margin: 12px 0; z-index: 2; position: relative; }
                        .code-label { font-size: 0.6rem; letter-spacing: 1px; opacity: 0.8; margin-bottom: 4px; }
                        .gift-code { font-family: 'Courier New', monospace; font-size: 1rem; font-weight: bold; letter-spacing: 2px; background: rgba(255, 255, 255, 0.2); padding: 8px 12px; border-radius: 6px; display: inline-block; }
                        .card-footer-info { display: flex; justify-content: space-between; align-items: flex-end; font-size: 0.6rem; z-index: 2; position: relative; }
                        .footer-left { flex: 1; }
                        .valid-info, .purchase-info { opacity: 0.8; line-height: 1.3; }
                        .back-card { background: linear-gradient(135deg, #2c1810 0%, #5d4037 50%, #2c1810 100%); }
                        .back-content { flex: 1; font-size: 0.7rem; line-height: 1.4; }
                        .back-content h3 { font-size: 0.8rem; text-align: center; margin-bottom: 12px; letter-spacing: 1px; border-bottom: 1px solid rgba(255, 255, 255, 0.3); padding-bottom: 8px; }
                        .back-content h4 { font-size: 0.7rem; margin: 12px 0 8px 0; letter-spacing: 0.5px; }
                        .instructions { margin-bottom: 16px; }
                        .instruction-item { display: flex; align-items: flex-start; margin-bottom: 8px; gap: 8px; }
                        .step-number { background: rgba(255, 255, 255, 0.2); width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: bold; flex-shrink: 0; }
                        .step-text { flex: 1; font-size: 0.65rem; }
                        .terms ul { margin: 0; padding-left: 16px; font-size: 0.6rem; }
                        .terms li { margin-bottom: 4px; line-height: 1.3; }
                        .contact-info { border-top: 1px solid rgba(255, 255, 255, 0.3); padding-top: 8px; margin-top: 12px; }
                        .contact-item { font-size: 0.6rem; margin-bottom: 2px; opacity: 0.9; }
                        @media print { body { print-color-adjust: exact; } }
                      </style>
                    </head>
                    <body>
                      <div class="print-container">
                        <div class="gift-card">
                          <div class="card-border">
                            <div class="card-header">
                              <div class="business-name">SAPORI & COLORI</div>
                              <div class="gift-card-title">GIFT CARD</div>
                            </div>
                            <div class="card-main">
                              <div class="card-value-section">
                                <div class="value-label">VALORE</div>
                                <div class="value-amount">${formatCurrency(previewCard.amount)}</div>
                              </div>
                              <div class="card-recipient-section">
                                <div class="recipient-to">PER:</div>
                                <div class="recipient-name">${previewCard.recipient_name}</div>
                                ${previewCard.message ? `<div class="personal-message">"${previewCard.message}"</div>` : ''}
                              </div>
                              <div class="card-code-section">
                                <div class="code-label">CODICE GIFT CARD</div>
                                <div class="gift-code">${previewCard.code}</div>
                              </div>
                              <div class="card-footer-info">
                                <div class="footer-left">
                                  <div class="valid-info">${previewCard.expires_at ? `Valida fino al ${formatDate(previewCard.expires_at)}` : 'Valida senza scadenza'}</div>
                                  <div class="purchase-info">Acquistata il ${formatDate(previewCard.purchase_date)}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div class="gift-card back-card">
                          <div class="card-border">
                            <div class="card-header">
                              <div class="business-name">🍝 SAPORI & COLORI</div>
                            </div>
                            <div class="back-content">
                              <h3>COME UTILIZZARE LA TUA GIFT CARD</h3>
                              <div class="instructions">
                                <div class="instruction-item">
                                  <span class="step-number">1</span>
                                  <span class="step-text">Presenta questa gift card al momento del pagamento</span>
                                </div>
                                <div class="instruction-item">
                                  <span class="step-number">2</span>
                                  <span class="step-text">Comunica il codice: <strong>${previewCard.code}</strong></span>
                                </div>
                                <div class="instruction-item">
                                  <span class="step-number">3</span>
                                  <span class="step-text">L'importo verrà scalato automaticamente dal tuo ordine</span>
                                </div>
                              </div>
                              <div class="terms">
                                <h4>TERMINI E CONDIZIONI</h4>
                                <ul>
                                  <li>Gift card non rimborsabile in denaro</li>
                                  <li>Utilizzabile per tutti i prodotti del menu</li>
                                  <li>Può essere utilizzata in più visite</li>
                                  <li>In caso di smarrimento non sarà possibile il recupero</li>
                                  ${previewCard.expires_at ? `<li>Scade il ${formatDate(previewCard.expires_at)}</li>` : ''}
                                </ul>
                              </div>
                              <div class="contact-info">
                                <div class="contact-item">📍 Via della Gastronomia, 123 - Città</div>
                                <div class="contact-item">📞 +39 123 456 7890</div>
                                <div class="contact-item">🌐 www.saporicolori.it</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </body>
                    </html>
                  `)
                  printWindow.document.close()
                  printWindow.focus()
                  setTimeout(() => {
                    printWindow.print()
                    printWindow.close()
                  }, 250)
                }}
              >
                🖨️ Stampa Gift Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GiftCardManagement