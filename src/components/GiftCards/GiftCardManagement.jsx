import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import emailjs from '@emailjs/browser'
import QRCode from 'qrcode'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import QRCodeReader from '../Common/QRCodeReader'
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
  const [showQRScanner, setShowQRScanner] = useState(false)
  
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

  // Genera QR code quando si apre il modal
  useEffect(() => {
    if (showPreviewModal && previewCard) {
      const timer = setTimeout(() => {
        console.log('🔲 Generating QR Code for:', previewCard.code)
        
        // Debug completo del DOM
        const container = document.querySelector('.qr-code-container')
        const canvas = document.getElementById(`qr-code-${previewCard.code}`)
        
        console.log('🔍 QR Container found:', !!container)
        console.log('🔍 Canvas element found:', !!canvas)
        
        if (container) {
          console.log('📐 Container style:', window.getComputedStyle(container).display)
          console.log('📐 Container visibility:', window.getComputedStyle(container).visibility)
        }
        
        generateQRCode(previewCard)
        
      }, 500) // Aumentato a 500ms
      return () => clearTimeout(timer)
    }
  }, [showPreviewModal, previewCard])

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

  // Funzione per inviare email gift card con PDF allegato
  const sendGiftCardEmail = async (giftCardData, purchaserData) => {
    if (!giftCardData.recipient_email) {
      return { success: true, message: 'Nessuna email destinatario fornita' }
    }

    try {
      const emailData = {
        to_name: giftCardData.recipient_name,
        to_email: giftCardData.recipient_email,
        subject: `🎁 Hai ricevuto una Gift Card da Sapori & Colori!`,
        reply_to: 'saporiecolori.b@gmail.com',
        message_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #D4AF37; text-align: center;">🎁 Hai ricevuto una Gift Card!</h2>
          
          <p><strong>Ciao ${giftCardData.recipient_name}!</strong></p>
          
          <p>${purchaserData?.name || 'Qualcuno di speciale'} ti ha inviato una fantastica Gift Card per goderti le delizie di <strong>Sapori & Colori</strong>!</p>
          
          ${giftCardData.message ? `
          <div style="background: #fef3c7; border: 2px solid #D4AF37; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #92400e;">💌 Messaggio personale:</h4>
            <p style="margin: 0; font-style: italic; color: #451a03;">"${giftCardData.message}"</p>
          </div>
          ` : ''}
          
          <!-- GIFT CARD COMPATTA -->
          <div style="
            background: linear-gradient(135deg, #FFD700 0%, #D4AF37 50%, #B8860B 100%);
            color: white; 
            padding: 20px; 
            border-radius: 15px; 
            margin: 25px auto; 
            box-shadow: 0 10px 25px rgba(212, 175, 55, 0.4);
            border: 2px solid rgba(255, 215, 0, 0.8);
            position: relative;
            width: 380px;
            height: 180px;
            display: table;
          ">
            <!-- Decorazioni -->
            <div style="position: absolute; top: 10px; right: 15px; font-size: 16px; opacity: 0.4;">✨🍝🍷</div>
            
            <!-- Contenuto centrato -->
            <div style="display: table-cell; vertical-align: middle; text-align: center; width: 100%; height: 100%;">
              
              <!-- Header -->
              <div style="margin-bottom: 15px;">
                <div style="
                  margin: 0; 
                  font-size: 24px; 
                  font-weight: bold; 
                  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                  letter-spacing: 1px;
                ">SAPORI & COLORI</div>
                <div style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.8; letter-spacing: 2px;">GIFT CARD</div>
              </div>
              
              <!-- Valore -->
              <div style="
                font-size: 32px; 
                font-weight: bold; 
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                margin-bottom: 15px;
              ">${formatCurrency(giftCardData.amount)}</div>
              
              <!-- Codice -->
              <div style="
                background: rgba(255,255,255,0.95); 
                color: #8B4513;
                padding: 8px 15px; 
                border-radius: 8px; 
                display: inline-block;
                border: 1px dashed #D4AF37;
                margin-bottom: 10px;
              ">
                <div style="font-size: 16px; font-family: 'Courier New', monospace; font-weight: bold; letter-spacing: 2px;">
                  ${giftCardData.code}
                </div>
              </div>
              
              <!-- Info -->
              <div style="font-size: 10px; opacity: 0.7; margin-top: 10px;">
                Saldo: ${formatCurrency(giftCardData.balance)} • ${giftCardData.expires_at ? new Date(giftCardData.expires_at).toLocaleDateString('it-IT') : 'No scadenza'}
              </div>
              
            </div>
          </div>
          
          <div style="background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h4 style="color: #0c4a6e; margin: 0 0 15px 0;">🎯 Come utilizzare la Gift Card</h4>
            
            <div style="display: flex; align-items: flex-start; gap: 20px; margin-bottom: 15px;">
              <!-- Istruzioni -->
              <div style="flex: 1;">
                <ol style="color: #0c4a6e; padding-left: 20px; margin: 0;">
                  <li style="margin-bottom: 8px;">Vieni al forno gastronomico <strong>Sapori & Colori</strong></li>
                  <li style="margin-bottom: 8px;">Mostra il <strong>QR code</strong> o comunica il codice: <strong>${giftCardData.code}</strong></li>
                  <li style="margin-bottom: 8px;">L'importo verrà scalato automaticamente dal tuo ordine</li>
                </ol>
              </div>
              
              <!-- QR Code -->
              <div style="text-align: center; min-width: 100px;">
                <div style="
                  background: white; 
                  padding: 8px; 
                  border-radius: 8px;
                  border: 2px solid #0ea5e9;
                  display: inline-block;
                ">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(giftCardData.code)}" 
                       alt="QR Code Gift Card" 
                       style="display: block; width: 80px; height: 80px;" />
                </div>
                <div style="font-size: 11px; color: #0c4a6e; margin-top: 5px; font-weight: 600;">
                  📱 SCANSIONA QUI
                </div>
              </div>
            </div>
            
            <div style="background: rgba(14, 165, 233, 0.1); padding: 12px; border-radius: 6px; font-size: 14px; color: #0c4a6e;">
              💡 Puoi utilizzare la gift card in più visite fino ad esaurimento del saldo
            </div>
          </div>
          
          <div style="background: #fff8e1; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center;">
            <h4 style="color: #8B4513; margin: 0 0 10px 0;">📞 I nostri contatti</h4>
            <p style="margin: 5px 0; color: #8B4513;">📍 Via Bagaladi,7 - Roma</p>
            <p style="margin: 5px 0; color: #8B4513;">📞 06 39911640</p>
            <p style="margin: 5px 0; color: #8B4513;">🌐 www.saporiecolori.net</p>
          </div>
          
          <p style="text-align: center; color: #D4AF37; font-weight: bold; font-size: 16px;">
            Ti aspettiamo per un'esperienza gastronomica indimenticabile! 🍝✨
          </p>
          
          <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #dee2e6; padding-top: 15px;">
            <p>Questa email è stata generata automaticamente dal sistema di gestione gift card di Sapori & Colori</p>
          </div>
        </div>`
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
      
      // Trova i dati dell'acquirente per l'email (commentato per ora)
      // const purchaser = customers.find(c => c.id === newCard.purchaser_customer_id)
      
      const { error } = await supabase
        .from('gift_cards')
        .insert({
          code,
          purchaser_customer_id: newCard.purchaser_customer_id,
          amount: amount,
          balance: amount,
          purchase_amount: amount,
          recipient_name: newCard.recipient_name,
          recipient_email: newCard.recipient_email || null,
          message: newCard.message || null,
          expires_at: newCard.expires_at || null,
          status: 'active'
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
  const checkGiftCard = async (code = null) => {
    const cardCode = code || redeemCode.trim()
    
    if (!cardCode) {
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
        .eq('code', cardCode.toUpperCase())
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
      // Se il codice viene da QR scanner, aggiorna anche l'input
      if (code) {
        setRedeemCode(code)
      }
      showNotification?.(`Gift card trovata! Saldo disponibile: ${formatCurrency(data.balance)}`, 'success')
    } catch (error) {
      console.error('Errore verifica gift card:', error)
      showNotification?.('Errore nella verifica della gift card', 'error')
      setFoundCard(null)
    } finally {
      setRedeemLoading(false)
    }
  }

  // Gestione scansione QR
  const handleQRScan = (scannedData) => {
    console.log('🔍 QR Scanned:', scannedData)
    
    try {
      // Prova a parsare come JSON per QR generati dall'app
      const qrData = JSON.parse(scannedData)
      if (qrData.type === 'gift_card' && qrData.code) {
        checkGiftCard(qrData.code)
        setShowQRScanner(false)
        return
      }
      if (qrData.type === 'receipt' && qrData.orderId) {
        // QR code ricevuta scansionato
        showNotification?.(`Ricevuta verificata: ${qrData.orderId} - Totale: E ${qrData.total} - Data: ${new Date(qrData.date).toLocaleDateString('it-IT')}`, 'success')
        setShowQRScanner(false)
        return
      }
    } catch (e) {
      // Non è JSON, prova formato semplice (solo codice)
      if (scannedData && scannedData.match(/^GC[A-Z0-9]+$/)) {
        checkGiftCard(scannedData)
        setShowQRScanner(false)
        return
      }
      // Prova formato ricevuta (GC-CODICE)
      if (scannedData && scannedData.match(/^GC-.+$/)) {
        showNotification?.(`Ricevuta verificata: ${scannedData}`, 'success')
        setShowQRScanner(false)
        return
      }
    }
    
    // Prova formato semplice "GIFTCARD:CODE:BALANCE"
    if (scannedData.startsWith('GIFTCARD:')) {
      const parts = scannedData.split(':')
      if (parts.length >= 2) {
        checkGiftCard(parts[1])
        setShowQRScanner(false)
        return
      }
    }
    
    // Prova come codice diretto
    if (scannedData.length >= 6 && scannedData.length <= 20) {
      checkGiftCard(scannedData)
      setShowQRScanner(false)
      return
    }
    
    showNotification?.('QR code non riconosciuto', 'error')
  }

  // Genera QR Code per gift card
  const generateQRCode = async (giftCard) => {
    try {
      // Dati semplificati per QR più piccolo e leggibile
      const qrData = `GIFTCARD:${giftCard.code}:${giftCard.balance}`
      console.log('🔲 QR Data:', qrData)
      
      const canvas = document.getElementById(`qr-code-${giftCard.code}`)
      console.log('🔲 Canvas found:', !!canvas)
      
      if (canvas) {
        await QRCode.toCanvas(canvas, qrData, {
          width: 80,
          margin: 1,
          color: {
            dark: '#000000', // Nero puro per massimo contrasto
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M'
        })
        console.log('✅ QR Code generated successfully')
        
        // Debug finale - rendiamo il canvas super visibile
        canvas.style.border = '5px solid red'
        canvas.style.backgroundColor = 'yellow'
        canvas.style.display = 'block'
        console.log('🎨 Canvas made super visible')
      } else {
        console.error('❌ Canvas not found for QR code')
      }
    } catch (error) {
      console.error('❌ Errore generazione QR Code:', error)
    }
  }

  // SOSTITUISCI la funzione exportGiftCardToPDF con questa che USA L'HTML
  const exportGiftCardToPDF = async (giftCard, forEmail = false) => {
    try {
      // Crea un template HTML invisibile ottimizzato per PDF
      const pdfContainer = document.createElement('div')
      pdfContainer.style.position = 'absolute'
      pdfContainer.style.left = '-9999px'
      pdfContainer.style.top = '0'
      pdfContainer.style.width = '210mm' // A4 width
      pdfContainer.style.height = '297mm' // A4 height
      pdfContainer.style.background = 'white'
      pdfContainer.style.fontFamily = 'Arial, sans-serif'
      pdfContainer.style.color = '#333'
      pdfContainer.style.padding = '15mm'
      pdfContainer.style.boxSizing = 'border-box'
      
      // Template HTML PROFESSIONALE
      pdfContainer.innerHTML = `
        <div style="width: 100%; height: 100%; display: flex; flex-direction: column;">
          
          <!-- HEADER -->
          <div style="
            background: linear-gradient(135deg, #8B4513 0%, #D4AF37 100%);
            color: white;
            padding: 18px;
            text-align: center;
            border-radius: 10px;
            margin-bottom: 20px;
            box-shadow: 0 4px 20px rgba(139, 69, 19, 0.3);
          ">
            <h1 style="
              margin: 0 0 5px 0;
              font-size: 26px;
              font-weight: bold;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
              letter-spacing: 1px;
            ">🎁 SAPORI & COLORI</h1>
            <p style="
              margin: 0;
              font-size: 14px;
              opacity: 0.9;
              font-weight: 300;
            ">Gift Card Digitale</p>
          </div>

          <!-- GIFT CARD PRINCIPALE -->
          <div style="
            background: linear-gradient(135deg, #D4AF37 0%, #B8860B 50%, #8B7D3A 100%);
            border-radius: 15px;
            padding: 20px;
            margin: 0 auto 25px auto;
            width: 320px;
            height: 200px;
            position: relative;
            box-shadow: 0 10px 35px rgba(212, 175, 55, 0.35);
            border: 2px solid rgba(255, 215, 0, 0.6);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            color: white;
          ">
            
            <!-- Header Gift Card -->
            <div style="text-align: center; border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 10px;">
              <h2 style="
                margin: 0 0 3px 0;
                font-size: 18px;
                font-weight: bold;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
                letter-spacing: 1px;
              ">SAPORI & COLORI</h2>
              <p style="
                margin: 0;
                font-size: 10px;
                opacity: 0.9;
                letter-spacing: 1px;
              ">GIFT CARD</p>
            </div>

            <!-- Valore -->
            <div style="text-align: center; flex: 1; display: flex; flex-direction: column; justify-content: center;">
              <div style="
                font-size: 36px;
                font-weight: bold;
                text-shadow: 3px 3px 6px rgba(0,0,0,0.5);
                margin-bottom: 8px;
                color: #FFF8DC;
              ">${formatCurrency(giftCard.amount)}</div>
              
              ${giftCard.balance < giftCard.amount ? `
                <div style="
                  font-size: 14px;
                  color: #FFB6C1;
                  font-weight: 600;
                  background: rgba(0,0,0,0.2);
                  padding: 3px 10px;
                  border-radius: 12px;
                  display: inline-block;
                  margin: 0 auto;
                ">Saldo: ${formatCurrency(giftCard.balance)}</div>
              ` : ''}
            </div>

            <!-- Footer Gift Card -->
            <div style="display: flex; justify-content: space-between; align-items: end;">
              <div style="flex: 1;">
                <div style="font-size: 8px; opacity: 0.8; margin-bottom: 2px;">DESTINATARIO:</div>
                <div style="font-size: 12px; font-weight: bold; text-transform: uppercase;">${giftCard.recipient_name}</div>
                <div style="font-size: 8px; font-family: monospace; margin-top: 5px; opacity: 0.9;">CODICE: ${giftCard.code}</div>
              </div>
              
              <!-- QR Code Placeholder -->
              <div style="
                width: 45px;
                height: 45px;
                background: white;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 6px;
                color: #8B4513;
                font-weight: bold;
                border: 2px solid rgba(255,255,255,0.8);
              " id="qr-placeholder-${giftCard.code}">
                QR CODE
              </div>
            </div>
          </div>

          <!-- INFORMAZIONI DETTAGLIATE -->
          <div style="
            background: #f8fafc;
            border: 2px solid #D4AF37;
            border-radius: 12px;
            padding: 18px;
            margin-bottom: 20px;
          ">
            <h3 style="
              margin: 0 0 15px 0;
              color: #8B4513;
              font-size: 16px;
              font-weight: bold;
              border-bottom: 2px solid #D4AF37;
              padding-bottom: 8px;
            ">📋 DETTAGLI GIFT CARD</h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 12px;">
              <div>
                <div style="margin-bottom: 10px;">
                  <strong style="color: #8B4513;">Codice:</strong><br>
                  <span style="font-family: monospace; background: #e5e7eb; padding: 2px 6px; border-radius: 3px; font-weight: bold; font-size: 11px;">${giftCard.code}</span>
                </div>
                <div style="margin-bottom: 10px;">
                  <strong style="color: #8B4513;">Destinatario:</strong><br>
                  <span>${giftCard.recipient_name}</span>
                </div>
                <div style="margin-bottom: 10px;">
                  <strong style="color: #8B4513;">Data Acquisto:</strong><br>
                  <span>${formatDate(giftCard.purchase_date)}</span>
                </div>
              </div>
              <div>
                <div style="margin-bottom: 10px;">
                  <strong style="color: #8B4513;">Valore Originale:</strong><br>
                  <span style="font-size: 14px; font-weight: bold; color: #059669;">${formatCurrency(giftCard.amount)}</span>
                </div>
                <div style="margin-bottom: 10px;">
                  <strong style="color: #8B4513;">Saldo Attuale:</strong><br>
                  <span style="font-size: 14px; font-weight: bold; color: ${giftCard.balance > 0 ? '#059669' : '#dc2626'};">${formatCurrency(giftCard.balance)}</span>
                </div>
                <div style="margin-bottom: 10px;">
                  <strong style="color: #8B4513;">Scadenza:</strong><br>
                  <span>${giftCard.expires_at ? formatDate(giftCard.expires_at) : 'Nessuna scadenza'}</span>
                </div>
              </div>
            </div>
          </div>

          ${giftCard.message ? `
            <!-- MESSAGGIO PERSONALIZZATO -->
            <div style="
              background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 20%);
              border: 2px solid #D4AF37;
              border-radius: 10px;
              padding: 12px;
              margin-bottom: 20px;
            ">
              <h4 style="
                margin: 0 0 8px 0;
                color: #92400e;
                font-size: 12px;
                font-weight: bold;
              ">💌 MESSAGGIO PERSONALIZZATO</h4>
              <p style="
                margin: 0;
                font-style: italic;
                font-size: 11px;
                color: #451a03;
                line-height: 1.4;
                background: rgba(255,255,255,0.7);
                padding: 8px;
                border-radius: 6px;
                border-left: 3px solid #D4AF37;
              ">"${giftCard.message}"</p>
            </div>
          ` : ''}

          <!-- ISTRUZIONI PER L'UTILIZZO -->
          <div style="
            background: #f0f9ff;
            border: 2px solid #0ea5e9;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 20px;
            text-align: center;
          ">
            <h4 style="
              margin: 0 0 12px 0;
              color: #0c4a6e;
              font-size: 14px;
              font-weight: bold;
            ">🎯 COME UTILIZZARE LA GIFT CARD</h4>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 12px;">
              <div style="text-align: center;">
                <div style="
                  width: 30px;
                  height: 30px;
                  background: #0ea5e9;
                  color: white;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 14px;
                  font-weight: bold;
                  margin: 0 auto 6px auto;
                ">1</div>
                <p style="margin: 0; font-size: 10px; color: #0c4a6e; font-weight: 600;">
                  Vieni al forno gastronomico<br>SAPORI & COLORI
                </p>
              </div>
              
              <div style="text-align: center;">
                <div style="
                  width: 30px;
                  height: 30px;
                  background: #0ea5e9;
                  color: white;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 14px;
                  font-weight: bold;
                  margin: 0 auto 6px auto;
                ">2</div>
                <p style="margin: 0; font-size: 10px; color: #0c4a6e; font-weight: 600;">
                  Mostra il codice QR<br>o comunica il codice
                </p>
              </div>
              
              <div style="text-align: center;">
                <div style="
                  width: 30px;
                  height: 30px;
                  background: #0ea5e9;
                  color: white;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 14px;
                  font-weight: bold;
                  margin: 0 auto 6px auto;
                ">3</div>
                <p style="margin: 0; font-size: 10px; color: #0c4a6e; font-weight: 600;">
                  L'importo verrà scalato<br>automaticamente
                </p>
              </div>
            </div>
            
            <div style="
              background: rgba(14, 165, 233, 0.1);
              padding: 8px;
              border-radius: 6px;
              font-size: 10px;
              color: #0c4a6e;
              font-weight: 600;
            ">
              💡 Puoi utilizzare la gift card in più visite fino ad esaurimento del saldo
            </div>
          </div>

          <!-- FOOTER -->
          <div style="
            border-top: 2px solid #D4AF37;
            padding-top: 20px;
            text-align: center;
            margin-top: auto;
          ">
            <div style="margin-bottom: 10px; color: #8B4513; font-weight: bold; font-size: 14px;">
              📍 Via Bagaladi,7 - Roma &nbsp;|&nbsp; 📞 06 39911640 &nbsp;|&nbsp; 🌐 www.saporiecolori.net
            </div>
            <div style="font-size: 11px; color: #6b7280; line-height: 1.4;">
              Gift card non rimborsabile in denaro • Valida per tutti i prodotti<br>
              Documento generato il ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}
            </div>
          </div>

        </div>
      `
      
      // Aggiungi al DOM temporaneamente
      document.body.appendChild(pdfContainer)
      
      // Genera QR codes reali
      try {
        const qrData = `GIFTCARD:${giftCard.code}:${giftCard.balance}`
        
        // QR piccolo sulla card
        const qrSmallElement = document.getElementById(`qr-placeholder-${giftCard.code}`)
        if (qrSmallElement) {
          const qrSmallCanvas = document.createElement('canvas')
          await QRCode.toCanvas(qrSmallCanvas, qrData, {
            width: 60,
            margin: 1,
            color: { dark: '#8B4513', light: '#FFFFFF' }
          })
          qrSmallElement.innerHTML = ''
          qrSmallElement.appendChild(qrSmallCanvas)
        }
        
      } catch (qrError) {
        console.warn('⚠️ QR Code generation failed:', qrError)
      }
      
      // Aspetta rendering
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Cattura come immagine con html2canvas
      const canvas = await html2canvas(pdfContainer, {
        scale: 2, // Alta qualità
        useCORS: true,
        backgroundColor: '#ffffff',
        width: 794, // A4 width in pixels at 96 DPI
        height: 1123, // A4 height in pixels at 96 DPI
        scrollX: 0,
        scrollY: 0
      })
      
      // Rimuovi dal DOM
      document.body.removeChild(pdfContainer)
      
      // Crea PDF con l'immagine
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      const imgData = canvas.toDataURL('image/jpeg', 0.9)
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297)
      
      // Se è per email, restituisci base64
      if (forEmail) {
        return pdf.output('datauristring').split(',')[1] // Solo la parte base64
      }
      
      return pdf
      
    } catch (error) {
      console.error('❌ Errore export PDF con HTML:', error)
      throw new Error('Impossibile generare il PDF: ' + error.message)
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
                onClick={() => checkGiftCard()}
                disabled={redeemLoading || !redeemCode.trim()}
              >
                {redeemLoading ? '⏳' : '🔍'} Verifica
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowQRScanner(true)}
                disabled={redeemLoading}
              >
                📱 Scansiona QR
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
                      {/* Layout a due colonne per mostrare sempre valore e saldo */}
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
                            color: '#FFFFFF',
                            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                            letterSpacing: '1px',
                            lineHeight: '1.1',
                            margin: '0',
                            zIndex: '999',
                            position: 'relative'
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
                            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                            letterSpacing: '1px',
                            lineHeight: '1.1',
                            margin: '0',
                            zIndex: '999',
                            position: 'relative'
                          }}>{formatCurrency(previewCard.balance)}</div>
                        </div>
                      </div>
                      
                      {/* Indicatore di stato per gift card */}
                      <div style={{
                        fontSize: '0.65rem',
                        marginTop: '8px',
                        padding: '3px 10px',
                        background: previewCard.balance > 0 ? (previewCard.balance < previewCard.amount ? 'rgba(255, 215, 0, 0.2)' : 'rgba(76, 175, 80, 0.3)') : 'rgba(255, 107, 107, 0.2)',
                        borderRadius: '12px',
                        color: previewCard.balance > 0 ? (previewCard.balance < previewCard.amount ? '#FFD700' : '#90EE90') : '#FF6B6B',
                        textAlign: 'center',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        display: 'inline-block'
                      }}>
                        {previewCard.balance >= previewCard.amount ? 'NUOVA' : (previewCard.balance > 0 ? 'PARZIALMENTE USATA' : 'UTILIZZATA')}
                      </div>
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
                        <div className="qr-code-container" style={{ 
                          background: 'rgba(255, 255, 255, 0.95)', 
                          padding: '8px',
                          borderRadius: '8px',
                          border: '2px solid rgba(212, 175, 55, 0.8)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                        }}>
                          <canvas 
                            id={`qr-code-${previewCard.code}`}
                            width="80" 
                            height="80"
                            style={{
                              borderRadius: '4px',
                              background: 'white',
                              display: 'block'
                            }}
                          />
                          <div style={{ 
                            color: '#8B4513', 
                            fontSize: '8px', 
                            textAlign: 'center',
                            marginTop: '2px',
                            fontWeight: 'bold'
                          }}>
                            SCANSIONA
                          </div>
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
                      <div className="contact-item">📍 Via Bagaladi,7 - Roma</div>
                      <div className="contact-item">📞 06 39911640</div>
                      <div className="contact-item">🌐 www.saporiecolori.net</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="preview-footer">
              <button 
                className="btn"
                style={{
                  backgroundColor: '#000000',
                  color: 'white',
                  border: '1px solid #000000'
                }}
                onClick={() => setShowPreviewModal(false)}
              >
                Chiudi
              </button>
              
              <button 
                className="btn"
                style={{
                  backgroundColor: '#000000',
                  color: 'white',
                  border: '1px solid #000000'
                }}
                onClick={async () => {
                  try {
                    // PDF alta qualità per download
                    const pdf = await exportGiftCardToPDF(previewCard, false)
                    const blob = pdf.output('blob')
                    
                    // Download PDF
                    const url = URL.createObjectURL(blob)
                    const link = document.createElement('a')
                    link.href = url
                    link.download = `GiftCard_${previewCard.code}.pdf`
                    link.click()
                    URL.revokeObjectURL(url)
                    
                    showNotification?.('📄 PDF Gift Card scaricato', 'success')
                  } catch (error) {
                    console.error('Errore export PDF:', error)
                    showNotification?.('Errore nell\'export del PDF', 'error')
                  }
                }}
              >
                📄 Download PDF
              </button>
              
              <button 
                className="btn"
                style={{
                  backgroundColor: '#000000',
                  color: 'white',
                  border: '1px solid #000000'
                }}
                onClick={async () => {
                  if (!previewCard.recipient_email) {
                    showNotification?.('Nessuna email destinatario configurata', 'error')
                    return
                  }
                  
                  try {
                    const purchaser = customers.find(c => c.id === previewCard.purchaser_customer_id)
                    
                    // Invia email semplificata senza PDF allegato
                    const result = await sendGiftCardEmail(previewCard, purchaser)
                    if (result.success) {
                      showNotification?.('📧 Email gift card inviata con successo!', 'success')
                    } else {
                      showNotification?.(result.message, 'error')
                    }
                  } catch (error) {
                    console.error('Errore invio email:', error)
                    showNotification?.('Errore nell\'invio dell\'email', 'error')
                  }
                }}
              >
                📧 Invia Email
              </button>
              
              <button 
                className="btn"
                style={{
                  backgroundColor: '#000000',
                  color: 'white',
                  border: '1px solid #000000'
                }}
                onClick={async () => {
                  // Registra la stampa della ricevuta
                  const recorded = await recordReceiptPrint(previewCard, 'courtesy', 'Ricevuta di cortesia stampata')
                  if (!recorded) {
                    showNotification?.('Errore nella registrazione della ricevuta', 'error')
                  }
                  
                  // API call per stampa ricevuta
                  try {
                    const response = await fetch('/api/print/receipt', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ giftCard: previewCard })
                    })
                    
                    if (response.ok) {
                      showNotification?.('Ricevuta inviata alla stampante', 'success')
                    } else {
                      throw new Error('Errore nella stampa')
                    }
                  } catch (error) {
                    console.error('Errore stampa ricevuta:', error)
                    showNotification?.('Errore nell\'invio della ricevuta alla stampante', 'error')
                  }
                }}
              >
                🧾 Stampa Ricevuta
              </button>
              
              <button 
                className="btn"
                style={{
                  backgroundColor: '#000000',
                  color: 'white',
                  border: '1px solid #000000'
                }}
                onClick={async () => {
                  // Registra la stampa della gift card
                  const recorded = await recordReceiptPrint(previewCard, 'gift_card', 'Gift card stampata')
                  if (!recorded) {
                    showNotification?.('Errore nella registrazione della stampa', 'error')
                  }
                  
                  // API call per stampa gift card
                  try {
                    const response = await fetch('/api/print/gift-card', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ giftCard: previewCard })
                    })
                    
                    if (response.ok) {
                      showNotification?.('Gift card inviata alla stampante', 'success')
                    } else {
                      throw new Error('Errore nella stampa')
                    }
                  } catch (error) {
                    console.error('Errore stampa gift card:', error)
                    showNotification?.('Errore nell\'invio della gift card alla stampante', 'error')
                  }
                }}
              >
                🖨️ Stampa Gift Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Scanner QR */}
      {showQRScanner && (
        <div className="modal-overlay" onClick={() => setShowQRScanner(false)}>
          <div className="modal qr-scanner-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📱 Scanner QR Gift Card</h2>
              <button 
                className="close-button"
                onClick={() => setShowQRScanner(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-content">
              <div className="scanner-instructions">
                <p>Posiziona il QR code della gift card al centro della camera</p>
                <div className="scanner-tips">
                  <span>💡 Mantieni il QR ben illuminato e stabile</span>
                </div>
              </div>
              
              <div className="qr-scanner-container">
                <QRCodeReader
                  onScan={handleQRScan}
                  onError={(error) => {
                    console.error('QR Scanner Error:', error)
                    showNotification?.('Errore scanner: ' + error.message, 'error')
                  }}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowQRScanner(false)}
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GiftCardManagement