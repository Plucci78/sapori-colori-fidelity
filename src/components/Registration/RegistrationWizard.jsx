import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../supabase'
import emailjs from '@emailjs/browser'
import './RegistrationWizard.css'

const RegistrationWizard = ({ onComplete, onCancel }) => {
  // STATI WIZARD
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  
  // DATI CLIENTE
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    city: '',
    phone: '',
    email: '',
    notes: '',
    consents: {
      fidelity: true, // obbligatorio
      email_marketing: false,
      sms_marketing: false,
      profiling: false
    }
  })
  const [referralCode, setReferralCode] = useState('');

  // FIRMA DIGITALE
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  // VALIDAZIONI PER STEP
  const validateStep = (step) => {
    const newErrors = {}
    
    switch(step) {
      case 1:
        if (!formData.name.trim()) newErrors.name = 'Nome obbligatorio'
        if (!formData.birthDate) newErrors.birthDate = 'Data nascita obbligatoria'
        if (formData.name.length < 2) newErrors.name = 'Nome troppo corto'
        
        // Verifica età (18+)
        if (formData.birthDate) {
          const today = new Date()
          const birth = new Date(formData.birthDate)
          const age = today.getFullYear() - birth.getFullYear()
          if (age < 16) newErrors.birthDate = 'Età minima 16 anni'
        }
        break
        
      case 2:
        if (!formData.phone.trim()) newErrors.phone = 'Telefono obbligatorio'
        if (formData.phone.length < 10) newErrors.phone = 'Telefono non valido'
        if (formData.email && !formData.email.includes('@')) newErrors.email = 'Email non valida'
        break
        
      case 3:
        // Note opzionali, nessuna validazione
        break
        
      case 4:
        if (!formData.consents.fidelity) newErrors.fidelity = 'Consenso programma fedeltà obbligatorio'
        // Firma digitale ora opzionale - rimossa validazione obbligatoria
        break
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // NAVIGAZIONE STEPS
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4))
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  // GESTIONE FIRMA DIGITALE - VERSIONE CORRETTA AD ALTA PRECISIONE
  
  // Funzione per ottenere coordinate precise su tutti i dispositivi
  const getEventPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    
    let clientX, clientY
    
    if (e.touches && e.touches[0]) {
      // Touch event
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      // Mouse event
      clientX = e.clientX
      clientY = e.clientY
    }
    
    // Coordinate relative al canvas (senza scaling DPR)
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }

  // Inizializza canvas per alta qualità
  const initializeCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    
    // Supporto per schermi ad alta densità (Retina, etc.)
    const dpr = window.devicePixelRatio || 1
    
    // Imposta dimensioni fisiche del canvas (alta risoluzione)
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    
    // Scala il contesto per la densità pixel
    ctx.scale(dpr, dpr)
    
    // Imposta stile CSS per dimensioni visibili (mantiene dimensioni originali)
    canvas.style.width = rect.width + 'px'
    canvas.style.height = rect.height + 'px'
    
    // Configurazione ottimale per firma digitale
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2.5
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    
    // Sfondo bianco per migliore visibilità
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)
    
    console.log('Canvas inizializzato:', {
      cssWidth: rect.width,
      cssHeight: rect.height,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      dpr: dpr
    })
  }

  const startDrawing = (e) => {
    e.preventDefault() // Previene comportamenti di scroll su mobile
    setIsDrawing(true)
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const pos = getEventPos(e, canvas)
    const ctx = canvas.getContext('2d')
    
    console.log('Inizio disegno a:', pos)
    
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  const draw = (e) => {
    if (!isDrawing) return
    e.preventDefault()
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const pos = getEventPos(e, canvas)
    const ctx = canvas.getContext('2d')
    
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    
    setHasSignature(true)
  }

  const stopDrawing = (e) => {
    if (isDrawing) {
      e.preventDefault()
      setIsDrawing(false)
      
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx.closePath()
      }
      
      console.log('Fine disegno')
    }
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    
    // Pulisce completamente il canvas
    ctx.clearRect(0, 0, rect.width, rect.height)
    
    // Ridisegna sfondo bianco
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)
    
    setHasSignature(false)
    
    console.log('Firma cancellata')
  }

  // Effetto per inizializzare il canvas quando il componente viene montato
  useEffect(() => {
    if (canvasRef.current && currentStep === 4) {
      // Timeout multipli per assicurare rendering completo
      setTimeout(() => {
        initializeCanvas()
      }, 50)
      
      // Backup in caso di problemi di timing
      setTimeout(() => {
        if (canvasRef.current) {
          initializeCanvas()
        }
      }, 300)
    }
  }, [currentStep])

  // Effetto per gestire resize della finestra
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && currentStep === 4) {
        setTimeout(initializeCanvas, 100)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [currentStep])

  // CALCOLI AUTOMATICI
  const calculateAgeGroup = (birthDate) => {
    const today = new Date()
    const birth = new Date(birthDate)
    const age = today.getFullYear() - birth.getFullYear()
    
    if (age < 30) return '18-30'
    if (age < 45) return '31-45'
    if (age < 60) return '46-60'
    return '60+'
  }

  const determineCustomerType = (city) => {
    const localCities = ['Roma', 'Milano', 'Napoli'] // Personalizzare
    return localCities.includes(city) ? 'locale' : 'turistico'
  }

  // SALVATAGGIO FINALE
  const saveCustomer = async () => {
    if (!validateStep(4)) return
    
    setLoading(true)
    try {
      // === VERIFICA PREVENTIVA DUPLICATI ===
      console.log('🔍 Verifica duplicati...')
      
      // Verifica telefono esistente
      if (formData.phone.trim()) {
        const { data: existingPhone } = await supabase
          .from('customers')
          .select('id, name, phone')
          .eq('phone', formData.phone.trim())
          .single()
        
        if (existingPhone) {
          throw new Error(`Il numero di telefono ${formData.phone} è già registrato per il cliente "${existingPhone.name}". Utilizzare un numero diverso o cercare il cliente esistente.`)
        }
      }
      
      // Verifica email esistente (se fornita)
      if (formData.email.trim()) {
        const { data: existingEmail } = await supabase
          .from('customers')
          .select('id, name, email')
          .eq('email', formData.email.trim())
          .single()
        
        if (existingEmail) {
          throw new Error(`L'email ${formData.email} è già registrata per il cliente "${existingEmail.name}". Utilizzare un'email diversa o cercare il cliente esistente.`)
        }
      }

      // === GESTIONE CODICE REFERRAL ===
      let referrerId = null;
      if (referralCode.trim()) {
        const { data: referrer } = await supabase
          .from('customers')
          .select('id, name')
          .eq('referral_code', referralCode.trim())
          .single();
        
        if (referrer) {
          referrerId = referrer.id;
          console.log('✅ Referrer trovato:', referrer.name);
        } else {
          console.log('⚠️ Codice referral non valido:', referralCode);
          // Non blocchiamo la registrazione, ma avvisiamo
        }
      }

      // 1. Genera codice referral unico
      const generateReferralCode = (customerName) => {
        const namePart = customerName.split(' ')[0].toUpperCase().slice(0, 5).replace(/[^A-Z]/g, '');
        const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${namePart}-${randomPart}`;
      };

      // 2. Salva cliente con codice referral
      const customerData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        birth_date: formData.birthDate,
        city: formData.city.trim(),
        notes: formData.notes.trim(),
        points: referrerId ? 10 : 0, // Bonus benvenuto se ha usato un referral
        referred_by: referrerId, // Salva chi lo ha invitato
        referral_code: generateReferralCode(formData.name), // ✅ GENERA CODICE AUTOMATICAMENTE
        age_group: calculateAgeGroup(formData.birthDate),
        customer_type: determineCustomerType(formData.city),
        created_at: new Date().toISOString()
      }

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert([customerData])
        .select()
        .single()

      if (customerError) {
        // Gestione specifica per numero di telefono duplicato
        if (customerError.code === '23505' && customerError.message.includes('customers_phone_key')) {
          throw new Error(`Il numero di telefono ${formData.phone} è già registrato nel sistema. Utilizzare un numero diverso o cercare il cliente esistente.`)
        }
        // Gestione per email duplicata (se presente)
        if (customerError.code === '23505' && customerError.message.includes('customers_email_key')) {
          throw new Error(`L'email ${formData.email} è già registrata nel sistema. Utilizzare un'email diversa o cercare il cliente esistente.`)
        }
        // Altri errori di constraint
        if (customerError.code === '23505') {
          throw new Error('Questo cliente sembra essere già registrato. Verificare i dati inseriti.')
        }
        throw customerError
      }

      // 3. Salva consensi
      const consentPromises = Object.entries(formData.consents).map(async ([type, given]) => {
        return supabase.from('consent_records').insert([{
          customer_id: customer.id,
          consent_type: type,
          consent_given: given,
          consent_date: new Date().toISOString(),
          digital_signature: hasSignature ? canvasRef.current.toDataURL() : null,
          operator_id: 'current_user', // TODO: sistema utenti
          device_info: navigator.userAgent
        }])
      })

      await Promise.all(consentPromises)

      // === CREA REFERRAL RECORD SE NECESSARIO ===
      if (referrerId) {
        const { error: referralError } = await supabase
          .from('referrals')
          .insert([{
            referrer_id: referrerId,
            referred_id: customer.id,
            status: 'pending',
            created_at: new Date().toISOString()
          }]);
        
        if (referralError) {
          console.error('Errore creazione referral:', referralError);
        } else {
          console.log('✅ Referral record creato');
        }
      }

      // 3. Email benvenuto automatica (se email e consenso)
      if (formData.email && formData.consents.email_marketing) {
        await sendWelcomeEmail(customer)
      }

      // 4. Notifica successo e chiudi wizard
      const successMessage = referrerId 
        ? `🎉 Cliente creato! Bonus 10 gemme assegnato per il referral!`
        : `✅ Cliente creato con successo!`;
      
      // Stampa automatica del modulo privacy se c'è la firma
      if (hasSignature) {
        setTimeout(() => {
          printPrivacyForm()
        }, 1000)
      }
      
      onComplete(customer, successMessage)
      
    } catch (error) {
      console.error('Errore salvataggio:', error)
      
      // Gestione errori specifici con messaggi chiari per l'utente
      let errorMessage = 'Errore nel salvataggio. Riprova.'
      
      if (error.message && error.message.includes('telefono') && error.message.includes('già registrato')) {
        errorMessage = error.message
        // Evidenzia il campo telefono come problematico
        setErrors({ 
          phone: 'Numero già registrato',
          general: errorMessage 
        })
        // Torna allo step 2 dove c'è il telefono
        setCurrentStep(2)
        setLoading(false)
        return
      }
      
      if (error.message && error.message.includes('email') && error.message.includes('già registrata')) {
        errorMessage = error.message
        setErrors({ 
          email: 'Email già registrata',
          general: errorMessage 
        })
        setCurrentStep(2)
        setLoading(false)
        return
      }
      
      if (error.message && error.message.includes('già registrato')) {
        errorMessage = error.message
      }
      
      setErrors({ general: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  // EMAIL BENVENUTO
  const sendWelcomeEmail = async (customer) => {
    try {
      const templateParams = {
        to_name: customer.name,
        to_email: customer.email,
        subject: `Benvenuto in Sapori & Colori, ${customer.name}! 🍞`,
        message_html: getWelcomeEmailTemplate(customer.name),
        reply_to: 'saporiecolori.b@gmail.com'
      }
      
      await emailjs.send(
        'service_f6lj74h',
        'template_kvxg4p9', 
        templateParams,
        'P0A99o_tLGsOuzhDs'
      )
    } catch (error) {
      console.error('Errore invio email benvenuto:', error)
    }
  }

  const getWelcomeEmailTemplate = (name) => {
    return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%);">
      <div style="padding: 40px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Benvenuto ${name}! 🎉</h1>
      </div>
      <div style="background: white; padding: 40px; margin: 0 20px; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
        <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Il tuo viaggio nei sapori inizia qui!</h2>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">Grazie per esserti unito alla famiglia Sapori & Colori! Ora fai parte del nostro esclusivo programma fedeltà GEMME.</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #ff7e5f; margin-top: 0;">Come funziona:</h3>
          <ul style="color: #666; line-height: 1.8;">
            <li>🛍️ <strong>1€ speso = 1 gemma guadagnata</strong></li>
            <li>🎁 <strong>Accumula gemme e riscatta premi esclusivi</strong></li>
            <li>✨ <strong>Offerte speciali riservate ai membri</strong></li>
          </ul>
        </div>
        <p style="color: #999; font-size: 14px; text-align: center;">Ti aspettiamo per la tua prima visita!<br>Via Example 123, Roma • Tel: 06 1234567</p>
      </div>
    </div>`
  }

  // VALIDAZIONE ASINCRONA TELEFONO
  const checkPhoneExists = async (phone) => {
    if (!phone || phone.length < 10) return false
    
    try {
      const { data } = await supabase
        .from('customers')
        .select('id, name')
        .eq('phone', phone.trim())
        .single()
      
      return data ? { exists: true, customer: data } : { exists: false }
    } catch {
      // Se non trova nessun record, è OK
      return { exists: false }
    }
  }

  // HANDLER PER CAMBIO TELEFONO CON VALIDAZIONE
  const handlePhoneChange = async (e) => {
    const phone = e.target.value
    setFormData(prev => ({ ...prev, phone }))
    
    // Rimuovi errori esistenti
    if (errors.phone) {
      setErrors(prev => ({ ...prev, phone: undefined }))
    }
    
    // Validazione asincrona solo se il telefono è completo
    if (phone.length >= 10) {
      const phoneCheck = await checkPhoneExists(phone)
      if (phoneCheck.exists) {
        setErrors(prev => ({ 
          ...prev, 
          phone: `Telefono già registrato per ${phoneCheck.customer.name}` 
        }))
      }
    }
  }

  // COMPONENTE AVVISO DUPLICATO
  const DuplicateWarning = ({ type, existingCustomer, onSearchExisting }) => (
    <div className="duplicate-warning" style={{
      background: '#fff3cd',
      border: '1px solid #ffeaa7',
      borderRadius: '8px',
      padding: '15px',
      margin: '10px 0',
      color: '#856404'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '24px' }}>⚠️</span>
        <div>
          <strong>Cliente già esistente!</strong>
          <p style={{ margin: '5px 0' }}>
            {type === 'phone' ? 'Questo numero di telefono' : 'Questa email'} è già registrata per: <strong>{existingCustomer.name}</strong>
          </p>
          <div style={{ marginTop: '10px' }}>
            <button 
              onClick={onSearchExisting}
              style={{
                background: '#007bff',
                color: 'white',
                border: 'none',
                padding: '8px 15px',
                borderRadius: '5px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              🔍 Cerca cliente esistente
            </button>
            <span style={{ fontSize: '14px', color: '#6c757d' }}>
              oppure modifica i dati per continuare
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  // STAMPA MODULO PRIVACY
  const printPrivacyForm = () => {
    const printWindow = window.open('', '_blank')
    const signatureDataURL = hasSignature ? canvasRef.current.toDataURL() : null
    const currentDate = new Date().toLocaleDateString('it-IT')
    const currentTime = new Date().toLocaleTimeString('it-IT')
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Modulo Privacy e Consensi - ${formData.name}</title>
        <style>
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
          
          body {
            font-family: 'Times New Roman', serif;
            line-height: 1.4;
            margin: 20px;
            color: #000;
          }
          
          .header {
            text-align: center;
            border-bottom: 3px solid #27ae60;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          
          .header h1 {
            color: #27ae60;
            margin: 0;
            font-size: 24px;
          }
          
          .header h2 {
            margin: 5px 0 0 0;
            font-size: 18px;
            color: #666;
          }
          
          .customer-info {
            background: #f8f9fa;
            padding: 15px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          
          .customer-info h3 {
            margin-top: 0;
            color: #27ae60;
          }
          
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          
          .info-label {
            font-weight: bold;
            width: 150px;
          }
          
          .privacy-text {
            font-size: 12px;
            line-height: 1.6;
            margin-bottom: 20px;
            text-align: justify;
          }
          
          .privacy-text h4 {
            color: #27ae60;
            margin: 15px 0 8px 0;
            font-size: 14px;
          }
          
          .consents-section {
            border: 2px solid #27ae60;
            padding: 15px;
            margin: 20px 0;
            border-radius: 8px;
          }
          
          .consent-item {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
            font-size: 14px;
          }
          
          .consent-checkbox {
            width: 20px;
            height: 20px;
            border: 2px solid #333;
            margin-right: 10px;
            display: inline-block;
            text-align: center;
            line-height: 16px;
            font-size: 16px;
          }
          
          .signature-area {
            margin-top: 30px;
            border: 2px solid #27ae60;
            padding: 20px;
            border-radius: 8px;
          }
          
          .signature-image {
            border: 1px solid #ccc;
            margin: 10px 0;
            display: block;
            max-width: 100%;
          }
          
          .footer {
            margin-top: 40px;
            border-top: 2px solid #27ae60;
            padding-top: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          
          .print-button {
            background: #27ae60;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin: 20px auto;
            display: block;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🍞 SAPORI & COLORI</h1>
          <h2>Modulo Privacy e Consensi al Trattamento Dati</h2>
          <p><strong>Data e Ora:</strong> ${currentDate} - ${currentTime}</p>
        </div>
        
        <div class="customer-info">
          <h3>📋 Dati Cliente</h3>
          <div class="info-row">
            <span class="info-label">Nome Completo:</span>
            <span><strong>${formData.name}</strong></span>
          </div>
          <div class="info-row">
            <span class="info-label">Data di Nascita:</span>
            <span>${formData.birthDate}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Telefono:</span>
            <span>${formData.phone}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Email:</span>
            <span>${formData.email || 'Non fornita'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Città:</span>
            <span>${formData.city || 'Non specificata'}</span>
          </div>
        </div>
        
        <div class="privacy-text">
          <h4>🏢 TITOLARE DEL TRATTAMENTO</h4>
          <p>Sapori & Colori<br/>
          Via [INSERIRE INDIRIZZO COMPLETO]<br/>
          Tel: [TELEFONO] - Email: [EMAIL NEGOZIO]</p>
          
          <h4>🎯 FINALITÀ DEL TRATTAMENTO</h4>
          <p>I suoi dati personali vengono trattati per:</p>
          <ul>
            <li>Gestione del programma fedeltà GEMME</li>
            <li>Erogazione dei servizi richiesti</li>
            <li>Invio comunicazioni commerciali (solo con consenso)</li>
            <li>Profilazione per offerte personalizzate (solo con consenso)</li>
            <li>Adempimenti fiscali e contabili</li>
          </ul>
          
          <h4>⚖️ BASE GIURIDICA</h4>
          <ul>
            <li>Consenso dell'interessato (art. 6, lett. a GDPR)</li>
            <li>Esecuzione contratto (art. 6, lett. b GDPR)</li>
            <li>Obblighi legali (art. 6, lett. c GDPR)</li>
          </ul>
          
          <h4>📊 CATEGORIE DI DATI</h4>
          <p>Raccogliamo: nome, telefono, email, data nascita, città, note operative, preferenze, eventuali allergie/intolleranze (solo se comunicati volontariamente)</p>
          
          <h4>🕒 CONSERVAZIONE</h4>
          <p>I dati saranno conservati fino alla revoca del consenso o per 10 anni dall'ultima transazione per obblighi fiscali</p>
          
          <h4>🔒 I SUOI DIRITTI</h4>
          <p>Lei ha diritto di accedere, rettificare, cancellare i dati, limitare il trattamento, alla portabilità dei dati, opporsi al trattamento e revocare il consenso in qualsiasi momento.</p>
          
          <h4>📧 CONTATTI</h4>
          <p>Per esercitare i suoi diritti: Email [EMAIL PRIVACY], Tel [TELEFONO NEGOZIO], di persona presso il punto vendita</p>
        </div>
        
        <div class="consents-section">
          <h3>✅ CONSENSI ESPRESSI</h3>
          
          <div class="consent-item">
            <span class="consent-checkbox">${formData.consents.fidelity ? '✓' : '☐'}</span>
            <span>Acconsento al programma fedeltà GEMME (obbligatorio)</span>
          </div>
          
          <div class="consent-item">
            <span class="consent-checkbox">${formData.consents.email_marketing ? '✓' : '☐'}</span>
            <span>Acconsento a ricevere offerte via email</span>
          </div>
          
          <div class="consent-item">
            <span class="consent-checkbox">${formData.consents.sms_marketing ? '✓' : '☐'}</span>
            <span>Acconsento a ricevere SMS promozionali</span>
          </div>
          
          <div class="consent-item">
            <span class="consent-checkbox">${formData.consents.profiling ? '✓' : '☐'}</span>
            <span>Acconsento alla profilazione per offerte personalizzate</span>
          </div>
        </div>
        
        <!-- SEZIONE FIRMA DIGITALE -->
        <div class="signature-area">
          <h3>✍️ FIRMA DIGITALE ACQUISITA</h3>
          ${signatureDataURL ? 
            `<p><strong>✅ Firma digitale apposta il ${currentDate} alle ${currentTime}</strong></p>
             <div style="border: 3px solid #27ae60; border-radius: 12px; padding: 15px; background: #f8fff8; margin: 15px 0;">
               <img src="${signatureDataURL}" alt="Firma Digitale" class="signature-image" style="border: 2px solid #27ae60; border-radius: 8px; padding: 10px; background: white; max-width: 100%; height: auto;"/>
               <p style="margin: 10px 0 0 0; font-size: 12px; color: #27ae60; text-align: center;"><strong>Firma acquisita digitalmente e valida ai sensi dell'art. 20 DPR 445/2000</strong></p>
             </div>` :
            `<p><em>❌ Nessuna firma digitale acquisita durante la registrazione</em></p>
             <div style="border: 2px dashed #ccc; height: 80px; margin: 10px 0; background: #f8f9fa; display: flex; align-items: center; justify-content: center; color: #999; border-radius: 8px;">
               <em>Firma digitale non acquisita</em>
             </div>`
          }
        </div>
        
        <!-- SEZIONE FIRME FISICHE -->
        <div class="physical-signature-area" style="border: 3px solid #e74c3c; padding: 20px; margin: 30px 0; border-radius: 12px; background: #fef9f9;">
          <h3 style="color: #e74c3c; margin-top: 0;">✍️ FIRME FISICHE RICHIESTE</h3>
          <p style="font-weight: bold; color: #e74c3c; margin-bottom: 20px;">
            Per completare la registrazione, è necessario apporre le seguenti firme fisiche:
          </p>
          
          <!-- FIRMA CLIENTE -->
          <div style="margin-bottom: 30px; border: 2px solid #e74c3c; border-radius: 8px; padding: 15px; background: white;">
            <h4 style="color: #e74c3c; margin: 0 0 10px 0;">📝 FIRMA DEL CLIENTE</h4>
            <p style="margin: 0 0 15px 0; font-size: 14px;">
              <strong>Il sottoscritto ${formData.name}</strong>, dichiara di aver letto e compreso l'informativa privacy 
              e di esprimere i consensi come indicati sopra.
            </p>
            
            <!-- Area firma grande -->
            <div style="border: 2px solid #333; height: 120px; margin: 15px 0; background: white; position: relative; border-radius: 8px;">
              <div style="position: absolute; bottom: 5px; left: 10px; font-size: 12px; color: #666;">
                Firma del Cliente
              </div>
              <div style="position: absolute; bottom: 5px; right: 10px; font-size: 12px; color: #666;">
                Data: ${currentDate}
              </div>
            </div>
            
            <!-- Dati cliente -->
            <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 12px;">
              <span><strong>Nome:</strong> ${formData.name}</span>
              <span><strong>Tel:</strong> ${formData.phone}</span>
              <span><strong>Data nascita:</strong> ${formData.birthDate}</span>
            </div>
          </div>
          
          <!-- FIRMA OPERATORE -->
          <div style="border: 2px solid #3498db; border-radius: 8px; padding: 15px; background: white;">
            <h4 style="color: #3498db; margin: 0 0 10px 0;">👨‍💼 FIRMA DELL'OPERATORE</h4>
            <p style="margin: 0 0 15px 0; font-size: 14px;">
              <strong>L'operatore sottoscritto</strong> certifica l'identità del cliente e la corretta acquisizione dei consensi.
            </p>
            
            <!-- Area firma operatore -->
            <div style="border: 2px solid #333; height: 100px; margin: 15px 0; background: white; position: relative; border-radius: 8px;">
              <div style="position: absolute; bottom: 5px; left: 10px; font-size: 12px; color: #666;">
                Firma e Timbro Operatore
              </div>
              <div style="position: absolute; bottom: 5px; right: 10px; font-size: 12px; color: #666;">
                Data: ${currentDate}
              </div>
            </div>
            
            <!-- Campi operatore -->
            <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 12px; gap: 20px;">
              <div style="flex: 1;">
                <strong>Nome Operatore:</strong> _______________________
              </div>
              <div style="flex: 1;">
                <strong>Codice ID:</strong> _______________________
              </div>
            </div>
          </div>
          
          <!-- NOTE IMPORTANTI -->
          <div style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 15px; margin-top: 20px;">
            <h4 style="color: #856404; margin: 0 0 10px 0;">⚠️ ISTRUZIONI IMPORTANTI</h4>
            <ul style="margin: 0; padding-left: 20px; color: #856404; font-size: 13px; line-height: 1.4;">
              <li><strong>Verificare l'identità</strong> del cliente tramite documento valido</li>
              <li><strong>Conservare questo modulo</strong> negli archivi fisici per 10 anni</li>
              <li><strong>Scansionare o fotografare</strong> il modulo firmato per backup digitale</li>
              <li><strong>Consegnare copia</strong> al cliente se richiesta</li>
              <li>In caso di dubbi contattare il responsabile privacy</li>
            </ul>
          </div>
        </div>
        
        <!-- SEZIONE NOTE OPERATORE -->
        <div style="border: 2px solid #6c757d; border-radius: 8px; padding: 15px; margin: 20px 0; background: #f8f9fa;">
          <h4 style="color: #495057; margin: 0 0 15px 0;">📝 NOTE DELL'OPERATORE</h4>
          
          <div style="margin-bottom: 15px;">
            <strong>Documento identità verificato:</strong>
            <div style="display: flex; gap: 20px; margin-top: 5px; flex-wrap: wrap;">
              <label style="display: flex; align-items: center; gap: 5px;">
                <span style="border: 2px solid #333; width: 18px; height: 18px; display: inline-block; margin-right: 5px;"></span> Carta d'Identità
              </label>
              <label style="display: flex; align-items: center; gap: 5px;">
                <span style="border: 2px solid #333; width: 18px; height: 18px; display: inline-block; margin-right: 5px;"></span> Patente
              </label>
              <label style="display: flex; align-items: center; gap: 5px;">
                <span style="border: 2px solid #333; width: 18px; height: 18px; display: inline-block; margin-right: 5px;"></span> Passaporto
              </label>
            </div>
          </div>
          
          <div style="margin-bottom: 15px;">
            <strong>Numero documento:</strong> ________________________________________________
          </div>
          
          <div style="margin-bottom: 15px;">
            <strong>Note aggiuntive operatore:</strong>
            <div style="border: 1px solid #333; min-height: 60px; margin-top: 8px; padding: 0; background: white; border-radius: 4px;">
              <!-- Area per note scritte a mano -->
            </div>
          </div>
          
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 15px; border-top: 1px solid #ccc; padding-top: 10px;">
            <div><strong>Ora registrazione:</strong> ${currentTime}</div>
            <div><strong>Operatore:</strong> _____________________</div>
            <div><strong>Punto vendita:</strong> Sapori & Colori</div>
          </div>
        </div>
        
        <!-- RIEPILOGO REGISTRAZIONE -->
        <div style="border: 3px solid #27ae60; border-radius: 12px; padding: 20px; margin: 20px 0; background: #f8fff8;">
          <h3 style="color: #27ae60; margin: 0 0 15px 0; text-align: center;">✅ RIEPILOGO REGISTRAZIONE COMPLETATA</h3>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
            <div>
              <strong>🆔 Cliente:</strong> ${formData.name}<br>
              <strong>📞 Telefono:</strong> ${formData.phone}<br>
              <strong>📧 Email:</strong> ${formData.email || 'Non fornita'}
            </div>
            <div>
              <strong>🎂 Data nascita:</strong> ${formData.birthDate}<br>
              <strong>🏘️ Città:</strong> ${formData.city || 'Non specificata'}<br>
              <strong>📅 Registrato:</strong> ${currentDate}
            </div>
          </div>
          
          <div style="background: white; border-radius: 8px; padding: 15px; border: 2px solid #27ae60;">
            <h4 style="color: #27ae60; margin: 0 0 10px 0;">💎 STATO PROGRAMMA FEDELTÀ</h4>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>Status:</strong> ✅ Attivo<br>
                <strong>Punti iniziali:</strong> ${referralCode ? '10 gemme (bonus referral)' : '0 gemme'}<br>
                <strong>Livello:</strong> Bronzo
              </div>
              <div style="text-align: right;">
                <div style="font-size: 24px;">💎</div>
                <strong>Tessera Digitale Attiva</strong>
              </div>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <div style="background: #e3f2fd; border: 2px solid #2196f3; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <h4 style="color: #1976d2; margin: 0 0 10px 0; text-align: center;">📂 ISTRUZIONI PER L'ARCHIVIAZIONE</h4>
            <div style="font-size: 12px; color: #1976d2;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <strong>✅ CONTROLLI COMPLETATI:</strong><br>
                  ☐ Documento identità verificato<br>
                  ☐ Firme apposte correttamente<br>
                  ☐ Dati cliente confermati<br>
                  ☐ Consensi GDPR raccolti
                </div>
                <div>
                  <strong>📋 ARCHIVIAZIONE:</strong><br>
                  ☐ Scansione/foto del modulo<br>
                  ☐ Archiviazione fisica (10 anni)<br>
                  ☐ Backup digitale sicuro<br>
                  ☐ Copia al cliente (se richiesta)
                </div>
              </div>
            </div>
          </div>
          
          <p><strong>Documento generato automaticamente dal sistema Sapori & Colori</strong></p>
          <p>Questo documento è valido anche senza firma autografa ai sensi dell'art. 20 del DPR 445/2000</p>
          <p><em>Stampato il ${currentDate} alle ${currentTime}</em></p>
          
          <div style="text-align: center; margin-top: 20px; padding: 10px; background: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;">
            <strong>🍞 SAPORI & COLORI - SISTEMA FEDELTÀ GEMME</strong><br>
            <small>Modulo Privacy e Consensi - Versione ${currentDate}</small>
          </div>
        </div>
        
        <button class="print-button no-print" onclick="window.print()">🖨️ Stampa Documento</button>
        <button class="print-button no-print" onclick="window.close()" style="background: #dc3545;">❌ Chiudi</button>
      </body>
      </html>
    `
    
    printWindow.document.write(printContent)
    printWindow.document.close()
    
    // Auto-stampa dopo 1 secondo per dare tempo al caricamento
    setTimeout(() => {
      printWindow.print()
    }, 1000)
  }

  // RENDER STEPS
  const renderStep = () => {
    switch(currentStep) {
      case 1:
        return (
          <div className="registration-step">
            <h2 className="step-title">Dati Personali</h2>
            
            <div className="form-group">
              <label className="form-label">Nome Completo *</label>
              <input
                type="text"
                className={`form-input-large ${errors.name ? 'error' : ''}`}
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Mario Rossi"
              />
              {errors.name && <span className="error-message">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Data di Nascita *</label>
              <input
                type="date"
                className={`form-input-large ${errors.birthDate ? 'error' : ''}`}
                value={formData.birthDate}
                onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                max={new Date().toISOString().split('T')[0]}
              />
              {errors.birthDate && <span className="error-message">{errors.birthDate}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Città di Residenza</label>
              <input
                type="text"
                className="form-input-large"
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                placeholder="Roma"
              />
            </div>
          </div>
        )

      case 2:
        return (
          <div className="registration-step">
            <h2 className="step-title">Informazioni Contatto</h2>
            
            <div className="form-group">
              <label className="form-label">Telefono *</label>
              <input
                type="tel"
                className={`form-input-large ${errors.phone ? 'error' : ''}`}
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="333-1234567"
              />
              {errors.phone && <span className="error-message">{errors.phone}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Email (opzionale)</label>
              <input
                type="email"
                className={`form-input-large ${errors.email ? 'error' : ''}`}
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="mario@email.com"
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
              <small className="form-hint">Per ricevere offerte e comunicazioni</small>
            </div>

            {/* CAMPO CODICE AMICO */}
            <div className="form-group">
              <label className="form-label">Codice Amico (opzionale)</label>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="Es: MARIO-X7B2"
                className="form-input-large"
              />
              <span className="form-hint">
                Se un amico ti ha invitato, inserisci il suo codice per 10 gemme gratis!
              </span>
            </div>

            {/* AVVISO DUPLICATO TELEFONO */}
            {errors.phone && errors.phone.includes('Telefono già registrato') && (
              <DuplicateWarning 
                type="phone" 
                existingCustomer={{ name: errors.phone.split('per ')[1] }}
                onSearchExisting={() => {}}
              />
            )}

            {/* AVVISO DUPLICATO EMAIL */}
            {errors.email && errors.email.includes('Email già registrata') && (
              <DuplicateWarning 
                type="email" 
                existingCustomer={{ name: errors.email.split('per ')[1] }}
                onSearchExisting={() => {}}
              />
            )}
          </div>
        )

      case 3:
        return (
          <div className="registration-step">
            <h2 className="step-title">Note e Preferenze</h2>
            
            <div className="form-group">
              <label className="form-label">Note Operatori</label>
              <textarea
                className="form-textarea-large"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Allergie, intolleranze, preferenze particolari..."
                rows="6"
                maxLength="500"
              />
              <small className="form-hint">
                Informazioni utili per il nostro staff (allergie, preferenze, etc.)
              </small>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="registration-step">
            <h2 className="step-title">Privacy e Consensi</h2>
            
            <div className="privacy-section">
              <h3>📋 Informativa Privacy Completa</h3>
              <div className="privacy-text">
                <div className="privacy-scroll-area" style={{ maxHeight: '300px', overflowY: 'auto', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '2px solid #e9ecef' }}>
                  <div style={{ lineHeight: '1.6', fontSize: '14px' }}>
                    <p><strong>🏢 TITOLARE DEL TRATTAMENTO:</strong><br/>
                    Sapori & Colori B SRL <br/>
                    Via [BAGALADI N 900132 ROMA]<br/>
                    Tel: [06 39911640] - Email: [SAPORIECOLORI.B@GMAIL.COM]</p>
                    
                    <p><strong>🎯 FINALITÀ DEL TRATTAMENTO:</strong><br/>
                    I suoi dati personali vengono trattati per:
                    <br/>• Gestione del programma fedeltà GEMME
                    <br/>• Erogazione dei servizi richiesti
                    <br/>• Invio comunicazioni commerciali (solo con consenso)
                    <br/>• Profilazione per offerte personalizzate (solo con consenso)
                    <br/>• Adempimenti fiscali e contabili</p>
                    
                    <p><strong>⚖️ BASE GIURIDICA:</strong><br/>
                    • Consenso dell'interessato (art. 6, lett. a GDPR)
                    <br/>• Esecuzione contratto (art. 6, lett. b GDPR)
                    <br/>• Obblighi legali (art. 6, lett. c GDPR)</p>
                    
                    <p><strong>📊 CATEGORIE DI DATI:</strong><br/>
                    Raccogliamo: nome, telefono, email, data nascita, città, note operative, preferenze, eventuali allergie/intolleranze (solo se comunicati volontariamente)</p>
                    
                    <p><strong>🕒 CONSERVAZIONE:</strong><br/>
                    I dati saranno conservati fino alla revoca del consenso o per 10 anni dall'ultima transazione per obblighi fiscali</p>
                    
                    <p><strong>👥 DESTINATARI:</strong><br/>
                    I dati non verranno comunicati a terzi, salvo:
                    <br/>• Obblighi di legge (es. autorità fiscali)
                    <br/>• Fornitori di servizi tecnici (con garanzie privacy)</p>
                    
                    <p><strong>🌍 TRASFERIMENTI:</strong><br/>
                    I dati vengono trattati nell'Unione Europea. Eventuali trasferimenti extra-UE avverranno con adeguate garanzie</p>
                    
                    <p><strong>🔒 I SUOI DIRITTI:</strong><br/>
                    Lei ha diritto di:
                    <br/>• Accedere ai suoi dati (art. 15 GDPR)
                    <br/>• Rettificare dati inesatti (art. 16 GDPR)
                    <br/>• Cancellare i dati (art. 17 GDPR)
                    <br/>• Limitare il trattamento (art. 18 GDPR)
                    <br/>• Portabilità dei dati (art. 20 GDPR)
                    <br/>• Opporsi al trattamento (art. 21 GDPR)
                    <br/>• Revocare il consenso in qualsiasi momento</p>
                    
                    <p><strong>📧 COME ESERCITARE I DIRITTI:</strong><br/>
                    Per esercitare i suoi diritti può contattarci:
                    <br/>• Email: [SAPORIECOLORI.B@GMAIL.COM]
                    <br/>• Telefono: [06 39911640]
                    <br/>• Di persona presso il punto vendita</p>
                    
                    <p><strong>⚠️ RECLAMI:</strong><br/>
                    Ha diritto di proporre reclamo all'Autorità Garante per la Protezione dei Dati Personali (www.gpdp.it)</p>
                    
                    <p><strong>🔄 AGGIORNAMENTI:</strong><br/>
                    Questa informativa può essere aggiornata. Le modifiche saranno comunicate tramite i nostri canali</p>
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '10px', fontStyle: 'italic' }}>
                  📖 Scroll per leggere l'informativa completa prima di procedere
                </p>
              </div>
            </div>

            <div className="consents-section">
              <h3>✅ Consensi</h3>
              
              <label className="consent-item required">
                <input
                  type="checkbox"
                  checked={formData.consents.fidelity}
                  onChange={(e) => setFormData({
                    ...formData, 
                    consents: {...formData.consents, fidelity: e.target.checked}
                  })}
                />
                <span>Acconsento al programma fedeltà GEMME (obbligatorio)</span>
              </label>

              <label className="consent-item">
                <input
                  type="checkbox"
                  checked={formData.consents.email_marketing}
                  onChange={(e) => setFormData({
                    ...formData, 
                    consents: {...formData.consents, email_marketing: e.target.checked}
                  })}
                />
                <span>Acconsento a ricevere offerte via email</span>
              </label>

              <label className="consent-item">
                <input
                  type="checkbox"
                  checked={formData.consents.sms_marketing}
                  onChange={(e) => setFormData({
                    ...formData, 
                    consents: {...formData.consents, sms_marketing: e.target.checked}
                  })}
                />
                <span>Acconsento a ricevere SMS promozionali</span>
              </label>

              <label className="consent-item">
                <input
                  type="checkbox"
                  checked={formData.consents.profiling}
                  onChange={(e) => setFormData({
                    ...formData, 
                    consents: {...formData.consents, profiling: e.target.checked}
                  })}
                />
                <span>Acconsento alla profilazione per offerte personalizzate</span>
              </label>

              {errors.fidelity && <span className="error-message">{errors.fidelity}</span>}
            </div>

            <div className="signature-section">
              <h3>✍️ Firma Digitale (Opzionale)</h3>
              <p className="signature-description">
                La firma digitale è opzionale ma consigliata per confermare l'accettazione dei consensi privacy.
                <br />
                <small style={{color: '#666', fontSize: '0.9em'}}>
                  📱 Su mobile: tocca e trascina per firmare con precisione
                </small>
              </p>
              <div className="signature-container">
                <canvas
                  ref={canvasRef}
                  className="signature-canvas"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  onTouchCancel={stopDrawing}
                  style={{
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff',
                    cursor: 'crosshair',
                    touchAction: 'none', // Previene scroll durante la firma
                    width: '100%',
                    maxWidth: '600px',
                    height: '200px'
                  }}
                />
                {hasSignature && (
                  <div className="signature-status" style={{
                    marginTop: '8px',
                    color: '#28a745',
                    fontSize: '0.9em',
                    fontWeight: '500'
                  }}>
                    ✅ Firma acquisita correttamente
                  </div>
                )}
              </div>
              <div className="signature-buttons">
                <button type="button" onClick={clearSignature} className="btn-clear-signature">
                  🗑️ Cancella Firma
                </button>
                <button type="button" onClick={printPrivacyForm} className="btn-print-privacy">
                  🖨️ Stampa Modulo Privacy
                </button>
              </div>
              {errors.signature && <span className="error-message">{errors.signature}</span>}
            </div>
          </div>
        )
    }
  }

  return (
    <div className="wizard-overlay">
      <div className="registration-wizard">
        {/* Progress Indicator */}
        <div className="progress-indicator">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{width: `${(currentStep / 4) * 100}%`}}
            ></div>
          </div>
          <span className="progress-text">Passo {currentStep} di 4</span>
        </div>

        {/* Step Content */}
        <div className="wizard-content">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="wizard-navigation">
          {currentStep > 1 && (
            <button 
              type="button" 
              onClick={prevStep}
              className="btn-secondary-large"
              disabled={loading}
            >
              ← Indietro
            </button>
          )}
             {currentStep < 4 ? (
          <button 
            type="button" 
            onClick={nextStep}
            className="btn-primary-large"
          >
            Avanti →
          </button>
        ) : (
          <div className="final-step-buttons">
            <button 
              type="button" 
              onClick={printPrivacyForm}
              className="btn-print-large"
            >
              🖨️ Stampa Privacy
            </button>
            <button 
              type="button" 
              onClick={saveCustomer}
              className="btn-success-large"
              disabled={loading}
            >
              {loading ? '⏳ Salvando...' : '✅ Crea Cliente'}
            </button>
          </div>
        )}
        </div>

        {/* Errori generali */}
        {errors.general && (
          <div className="error-banner">
            {errors.general}
          </div>
        )}

        {/* Cancel */}
        <button 
          type="button" 
          onClick={onCancel}
          className="btn-cancel"
          disabled={loading}
        >
          ❌ Annulla
        </button>
      </div>
    </div>
  )
}

export default RegistrationWizard