import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabase'
import jsPDF from 'jspdf'

const PrivacyManagement = ({ customer, showNotification }) => {
  const [consentRecord, setConsentRecord] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showFullPrivacy, setShowFullPrivacy] = useState(false)

  // Carica i consensi firmati dal Registration Wizard
  const loadConsentRecord = useCallback(async () => {
    if (!customer?.id) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('consent_records')
        .select('*')
        .eq('customer_id', customer.id)
        .order('consent_date', { ascending: false })

      if (error) {
        console.error('Errore caricamento consensi:', error)
        showNotification('❌ Errore nel caricamento dei consensi', 'error')
        return
      }

      // Raggruppa i consensi per tipo
      const consentsByType = {}
      data.forEach(record => {
        consentsByType[record.consent_type] = record
      })

      setConsentRecord(consentsByType)
    } catch (error) {
      console.error('Errore generale caricamento consensi:', error)
      showNotification('❌ Errore nel caricamento dei consensi', 'error')
    } finally {
      setLoading(false)
    }
  }, [customer?.id, showNotification])

  useEffect(() => {
    loadConsentRecord()
  }, [loadConsentRecord])

  // Genera e scarica il PDF della privacy firmata
  const generatePrivacyPDF = () => {
    const doc = new jsPDF()
    let y = 20

    // Intestazione colorata
    doc.setFontSize(20)
    doc.setTextColor(39, 174, 96) // Verde #27ae60
    doc.text("🍞 SAPORI & COLORI", 105, y, { align: 'center' })
    y += 10

    doc.setFontSize(14)
    doc.setTextColor(102, 102, 102) // Grigio #666
    doc.text("Modulo Privacy e Consensi al Trattamento Dati", 105, y, { align: 'center' })
    y += 10

    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0) // Nero
    doc.text(`Data e Ora: ${new Date().toLocaleDateString('it-IT')} - ${new Date().toLocaleTimeString('it-IT')}`, 105, y, { align: 'center' })
    y += 20

    // Linea separatrice
    doc.setDrawColor(39, 174, 96)
    doc.setLineWidth(1)
    doc.line(10, y, 200, y)
    y += 15

    // Dati Cliente
    doc.setFontSize(14)
    doc.setTextColor(39, 174, 96)
    doc.text("📋 Dati Cliente", 10, y)
    y += 10

    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.text(`Nome Completo: ${customer.name}`, 10, y)
    y += 7
    doc.text(`Data Firma: ${fidelityConsent?.consent_date ? new Date(fidelityConsent.consent_date).toLocaleDateString('it-IT') : 'N/A'}`, 10, y)
    y += 7
    doc.text(`ID Cliente: ${customer.id}`, 10, y)
    y += 15

    // Testo dell'informativa
    doc.setFontSize(12)
    doc.setTextColor(39, 174, 96)
    doc.text("🏢 TITOLARE DEL TRATTAMENTO", 10, y)
    y += 8

    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.text("Sapori & Colori", 10, y)
    y += 5
    doc.text("Via [INSERIRE INDIRIZZO COMPLETO]", 10, y)
    y += 5
    doc.text("Tel: [TELEFONO] - Email: [EMAIL NEGOZIO]", 10, y)
    y += 10

    // Finalità
    doc.setFontSize(12)
    doc.setTextColor(39, 174, 96)
    doc.text("🎯 FINALITÀ DEL TRATTAMENTO", 10, y)
    y += 8

    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.text("I suoi dati personali vengono trattati per:", 10, y)
    y += 5
    doc.text("• Gestione del programma fedeltà GEMME", 15, y)
    y += 5
    doc.text("• Erogazione dei servizi richiesti", 15, y)
    y += 5
    doc.text("• Invio comunicazioni commerciali (solo con consenso)", 15, y)
    y += 5
    doc.text("• Profilazione per offerte personalizzate (solo con consenso)", 15, y)
    y += 5
    doc.text("• Adempimenti fiscali e contabili", 15, y)
    y += 10

    // Base giuridica
    doc.setFontSize(12)
    doc.setTextColor(39, 174, 96)
    doc.text("⚖️ BASE GIURIDICA", 10, y)
    y += 8

    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.text("• Consenso dell'interessato (art. 6, lett. a GDPR)", 15, y)
    y += 5
    doc.text("• Esecuzione contratto (art. 6, lett. b GDPR)", 15, y)
    y += 5
    doc.text("• Obblighi legali (art. 6, lett. c GDPR)", 15, y)
    y += 10

    // Categorie dati
    doc.setFontSize(12)
    doc.setTextColor(39, 174, 96)
    doc.text("📊 CATEGORIE DI DATI", 10, y)
    y += 8

    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    const categorieDati = "Raccogliamo: nome, telefono, email, data nascita, città, note operative, preferenze, eventuali allergie/intolleranze (solo se comunicati volontariamente)"
    const lineeCategorie = doc.splitTextToSize(categorieDati, 180)
    lineeCategorie.forEach(linea => {
      doc.text(linea, 10, y)
      y += 5
    })
    y += 5

    // Conservazione
    doc.setFontSize(12)
    doc.setTextColor(39, 174, 96)
    doc.text("🕒 CONSERVAZIONE", 10, y)
    y += 8

    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    const conservazione = "I dati saranno conservati fino alla revoca del consenso o per 10 anni dall'ultima transazione per obblighi fiscali"
    const lineeConservazione = doc.splitTextToSize(conservazione, 180)
    lineeConservazione.forEach(linea => {
      doc.text(linea, 10, y)
      y += 5
    })
    y += 5

    // Diritti
    doc.setFontSize(12)
    doc.setTextColor(39, 174, 96)
    doc.text("🔒 I SUOI DIRITTI", 10, y)
    y += 8

    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    const diritti = "Lei ha diritto di accedere, rettificare, cancellare i dati, limitare il trattamento, alla portabilità dei dati, opporsi al trattamento e revocare il consenso in qualsiasi momento."
    const lineeDiritti = doc.splitTextToSize(diritti, 180)
    lineeDiritti.forEach(linea => {
      doc.text(linea, 10, y)
      y += 5
    })
    y += 5

    // Contatti
    doc.setFontSize(12)
    doc.setTextColor(39, 174, 96)
    doc.text("📧 CONTATTI", 10, y)
    y += 8

    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.text("Per esercitare i suoi diritti: Email [EMAIL PRIVACY], Tel [TELEFONO NEGOZIO],", 10, y)
    y += 5
    doc.text("di persona presso il punto vendita", 10, y)
    y += 15

    // Controllo pagina
    if (y > 250) {
      doc.addPage()
      y = 20
    }

    // Consensi espressi
    doc.setFontSize(14)
    doc.setTextColor(39, 174, 96)
    doc.text("✅ CONSENSI ESPRESSI", 10, y)
    y += 10

    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    
    // Riquadro per consensi
    doc.setDrawColor(39, 174, 96)
    doc.setLineWidth(0.5)
    doc.rect(10, y, 180, 40)
    y += 8

    doc.text(`${fidelityConsent?.consent_given ? '✓' : '☐'} Acconsento al programma fedeltà GEMME (obbligatorio)`, 15, y)
    y += 8
    doc.text(`${marketingConsent?.consent_given ? '✓' : '☐'} Acconsento a ricevere offerte via email`, 15, y)
    y += 8
    doc.text(`${smsConsent?.consent_given ? '✓' : '☐'} Acconsento a ricevere SMS promozionali`, 15, y)
    y += 8
    doc.text(`${profilingConsent?.consent_given ? '✓' : '☐'} Acconsento alla profilazione per offerte personalizzate`, 15, y)
    y += 15

    // Firma digitale
    if (fidelityConsent?.digital_signature) {
      if (y > 200) {
        doc.addPage()
        y = 20
      }
      
      doc.setFontSize(14)
      doc.setTextColor(39, 174, 96)
      doc.text("✍️ FIRMA DIGITALE ACQUISITA", 10, y)
      y += 10

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text(`✅ Firma digitale apposta il ${new Date(fidelityConsent.consent_date).toLocaleDateString('it-IT')} alle ${new Date(fidelityConsent.consent_date).toLocaleTimeString('it-IT')}`, 10, y)
      y += 10

      try {
        doc.addImage(fidelityConsent.digital_signature, 'PNG', 10, y, 80, 30)
        y += 35
        doc.setFontSize(9)
        doc.setTextColor(39, 174, 96)
        doc.text("Firma acquisita digitalmente e valida ai sensi dell'art. 20 DPR 445/2000", 10, y)
      } catch (error) {
        console.error('Errore aggiunta firma:', error)
        doc.text("(Firma non disponibile)", 10, y)
      }
    }

    // Salva il PDF
    doc.save(`Privacy_${customer.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
    showNotification('✅ PDF privacy scaricato!', 'success')
  }

  // Stampa la privacy con il formato del Registration Wizard - 4 FOGLI
  const printPrivacy = () => {
    const printWindow = window.open('', '_blank')
    const currentDate = new Date().toLocaleDateString('it-IT')
    const currentTime = new Date().toLocaleTimeString('it-IT')
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Modulo Privacy e Consensi - ${customer.name}</title>
        <style>
          @media print {
            body { margin: 0; }
            .no-print { display: none !important; }
            .page-break { page-break-after: always; }
          }
          
          body {
            font-family: 'Times New Roman', serif;
            line-height: 1.4;
            margin: 20px;
            color: #000;
            font-size: 14px;
          }
          
          .page {
            min-height: 100vh;
            padding: 20px;
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
            font-size: 28px;
          }
          
          .header h2 {
            margin: 5px 0 0 0;
            font-size: 20px;
            color: #666;
          }
          
          .customer-info {
            background: #f8f9fa;
            padding: 20px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          
          .customer-info h3 {
            margin-top: 0;
            color: #27ae60;
            font-size: 18px;
          }
          
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            font-size: 14px;
          }
          
          .info-label {
            font-weight: bold;
            width: 180px;
          }
          
          .privacy-text {
            font-size: 13px;
            line-height: 1.6;
            margin-bottom: 30px;
          }
          
          .privacy-text h4 {
            color: #27ae60;
            margin: 20px 0 10px 0;
            font-size: 16px;
          }
          
          .privacy-text ul {
            margin: 8px 0;
            padding-left: 25px;
          }
          
          .privacy-text li {
            margin-bottom: 5px;
          }
          
          .consents-section {
            border: 3px solid #27ae60;
            border-radius: 12px;
            padding: 25px;
            margin: 30px 0;
            background: #f8fff8;
          }
          
          .consents-section h3 {
            margin-top: 0;
            color: #27ae60;
            font-size: 20px;
            text-align: center;
          }
          
          .consent-item {
            margin: 15px 0;
            font-size: 15px;
            display: flex;
            align-items: center;
          }
          
          .consent-checkbox {
            display: inline-block;
            width: 25px;
            height: 25px;
            border: 3px solid #333;
            text-align: center;
            line-height: 19px;
            margin-right: 15px;
            font-weight: bold;
            font-size: 18px;
          }
          
          .signature-area {
            border: 3px solid #27ae60;
            border-radius: 12px;
            padding: 25px;
            margin: 30px 0;
            background: #f8fff8;
          }
          
          .signature-area h3 {
            margin-top: 0;
            color: #27ae60;
            font-size: 20px;
            text-align: center;
          }
          
          .signature-image {
            max-width: 350px;
            height: auto;
            border: 2px solid #27ae60;
            border-radius: 8px;
            padding: 10px;
            background: white;
            display: block;
            margin: 0 auto;
          }
          
          .physical-signature-area {
            border: 3px solid #e74c3c;
            padding: 25px;
            margin: 30px 0;
            border-radius: 12px;
            background: #fef9f9;
          }
          
          .physical-signature-area h3 {
            color: #e74c3c;
            margin-top: 0;
            font-size: 20px;
            text-align: center;
          }
          
          .signature-box {
            border: 3px solid #333;
            height: 120px;
            margin: 20px 0;
            background: white;
            position: relative;
            border-radius: 8px;
          }
          
          .signature-box .label {
            position: absolute;
            bottom: 10px;
            left: 15px;
            font-size: 12px;
            color: #666;
            font-weight: bold;
          }
          
          .signature-box .date {
            position: absolute;
            bottom: 10px;
            right: 15px;
            font-size: 12px;
            color: #666;
          }
          
          .operator-info {
            display: flex;
            justify-content: space-between;
            margin-top: 15px;
            font-size: 13px;
            gap: 30px;
          }
          
          .operator-info div {
            flex: 1;
          }
          
          .notes-section {
            border: 2px solid #6c757d;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
            background: #f8f9fa;
          }
          
          .notes-section h4 {
            color: #495057;
            margin: 0 0 15px 0;
            font-size: 16px;
          }
          
          .document-checkboxes {
            display: flex;
            gap: 25px;
            margin-top: 8px;
            flex-wrap: wrap;
          }
          
          .document-checkboxes label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
          }
          
          .checkbox-square {
            border: 2px solid #333;
            width: 18px;
            height: 18px;
            display: inline-block;
          }
          
          .notes-area {
            border: 2px solid #333;
            min-height: 80px;
            margin-top: 10px;
            padding: 10px;
            background: white;
            border-radius: 4px;
          }
          
          .instructions {
            background: #fff3cd;
            border: 2px solid #ffc107;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
          }
          
          .instructions h4 {
            color: #856404;
            margin: 0 0 15px 0;
            font-size: 16px;
          }
          
          .instructions ul {
            margin: 0;
            padding-left: 25px;
            color: #856404;
            font-size: 13px;
            line-height: 1.5;
          }
          
          .instructions li {
            margin-bottom: 8px;
          }
          
          .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #dee2e6;
          }
          
          .print-button {
            background: #27ae60;
            color: white;
            border: none;
            padding: 15px 25px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            margin: 10px 8px;
          }
          
          .print-button:hover {
            background: #229954;
          }
        </style>
      </head>
      <body>
        <!-- FOGLIO 1: INTESTAZIONE E INFORMATIVA -->
        <div class="page">
          <div class="header">
            <h1>🍞 SAPORI & COLORI</h1>
            <h2>Modulo Privacy e Consensi al Trattamento Dati</h2>
            <p><strong>Data e Ora:</strong> ${currentDate} - ${currentTime}</p>
          </div>
          
          <div class="customer-info">
            <h3>📋 Dati Cliente</h3>
            <div class="info-row">
              <span class="info-label">Nome Completo:</span>
              <span>${customer.name}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Data Firma:</span>
              <span>${fidelityConsent?.consent_date ? new Date(fidelityConsent.consent_date).toLocaleDateString('it-IT') : 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">ID Cliente:</span>
              <span>${customer.id}</span>
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
        </div>
        
        <div class="page-break"></div>
        
        <!-- FOGLIO 2: CONSENSI ESPRESSI -->
        <div class="page">
          <div class="consents-section">
            <h3>✅ CONSENSI ESPRESSI</h3>
            
            <div class="consent-item">
              <span class="consent-checkbox">${fidelityConsent?.consent_given ? '✓' : '☐'}</span>
              <span><strong>Acconsento al programma fedeltà GEMME (obbligatorio)</strong></span>
            </div>
            
            <div class="consent-item">
              <span class="consent-checkbox">${marketingConsent?.consent_given ? '✓' : '☐'}</span>
              <span><strong>Acconsento a ricevere offerte via email</strong></span>
            </div>
            
            <div class="consent-item">
              <span class="consent-checkbox">${smsConsent?.consent_given ? '✓' : '☐'}</span>
              <span><strong>Acconsento a ricevere SMS promozionali</strong></span>
            </div>
            
            <div class="consent-item">
              <span class="consent-checkbox">${profilingConsent?.consent_given ? '✓' : '☐'}</span>
              <span><strong>Acconsento alla profilazione per offerte personalizzate</strong></span>
            </div>
          </div>
          
          <div style="background: #e3f2fd; border: 2px solid #2196f3; border-radius: 12px; padding: 25px; margin: 30px 0;">
            <h3 style="color: #1976d2; margin: 0 0 15px 0; text-align: center;">💎 STATO PROGRAMMA FEDELTÀ</h3>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 16px;">
              <div>
                <strong>Status:</strong> ✅ Attivo<br>
                <strong>Punti attuali:</strong> ${customer.gems || 0} gemme<br>
                <strong>Livello:</strong> ${customer.level || 'Bronzo'}
              </div>
              <div style="text-align: right;">
                <div style="font-size: 48px;">💎</div>
                <strong>Tessera Digitale Attiva</strong>
              </div>
            </div>
          </div>
        </div>
        
        <div class="page-break"></div>
        
        <!-- FOGLIO 3: FIRMA DIGITALE -->
        <div class="page">
          <div class="signature-area">
            <h3>✍️ FIRMA DIGITALE ACQUISITA</h3>
            ${fidelityConsent?.digital_signature ? 
              `<p style="text-align: center; font-size: 16px;"><strong>✅ Firma digitale apposta il ${new Date(fidelityConsent.consent_date).toLocaleDateString('it-IT')} alle ${new Date(fidelityConsent.consent_date).toLocaleTimeString('it-IT')}</strong></p>
               <div style="border: 3px solid #27ae60; border-radius: 12px; padding: 25px; background: #f8fff8; margin: 25px 0; text-align: center;">
                 <img src="${fidelityConsent.digital_signature}" alt="Firma Digitale" class="signature-image"/>
                 <p style="margin: 20px 0 0 0; font-size: 14px; color: #27ae60; font-weight: bold;">Firma acquisita digitalmente e valida ai sensi dell'art. 20 DPR 445/2000</p>
               </div>` :
              `<p style="text-align: center; font-size: 16px;"><em>❌ Nessuna firma digitale acquisita durante la registrazione</em></p>
               <div style="border: 3px dashed #ccc; height: 200px; margin: 25px 0; background: #f8f9fa; display: flex; align-items: center; justify-content: center; color: #999; border-radius: 12px; font-size: 18px;">
                 <em>Firma digitale non acquisita</em>
               </div>`
            }
          </div>
          
          <div style="background: #e8f5e8; border: 2px solid #27ae60; border-radius: 12px; padding: 25px; margin: 30px 0;">
            <h3 style="color: #27ae60; margin: 0 0 15px 0; text-align: center;">✅ RIEPILOGO REGISTRAZIONE</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 14px;">
              <div>
                <strong>🆔 Cliente:</strong> ${customer.name}<br>
                <strong>📞 Telefono:</strong> ${customer.phone || 'N/A'}<br>
                <strong>📧 Email:</strong> ${customer.email || 'Non fornita'}
              </div>
              <div>
                <strong>🎂 Data nascita:</strong> ${customer.birth_date || 'N/A'}<br>
                <strong>🏘️ Città:</strong> ${customer.city || 'N/A'}<br>
                <strong>📅 Registrato:</strong> ${currentDate}
              </div>
            </div>
          </div>
        </div>
        
        <div class="page-break"></div>
        
        <!-- FOGLIO 4: FIRME FISICHE E NOTE -->
        <div class="page">
          <div class="physical-signature-area">
            <h3>✍️ FIRME FISICHE RICHIESTE</h3>
            <p style="font-weight: bold; color: #e74c3c; margin-bottom: 25px; text-align: center; font-size: 16px;">
              Per completare la registrazione, è necessario apporre le seguenti firme fisiche:
            </p>
            
            <!-- FIRMA CLIENTE -->
            <div style="margin-bottom: 35px; border: 3px solid #e74c3c; border-radius: 12px; padding: 20px; background: white;">
              <h4 style="color: #e74c3c; margin: 0 0 15px 0; font-size: 18px;">📝 FIRMA DEL CLIENTE</h4>
              <p style="margin: 0 0 20px 0; font-size: 15px;">
                <strong>Il sottoscritto ${customer.name}</strong>, dichiara di aver letto e compreso l'informativa privacy 
                e di esprimere i consensi come indicati sopra.
              </p>
              
              <div class="signature-box">
                <div class="label">Firma del Cliente</div>
                <div class="date">Data: ${currentDate}</div>
              </div>
              
              <div style="display: flex; justify-content: space-between; margin-top: 15px; font-size: 13px;">
                <span><strong>Nome:</strong> ${customer.name}</span>
                <span><strong>ID Cliente:</strong> ${customer.id}</span>
              </div>
            </div>
            
            <!-- FIRMA OPERATORE -->
            <div style="border: 3px solid #3498db; border-radius: 12px; padding: 20px; background: white; margin-bottom: 25px;">
              <h4 style="color: #3498db; margin: 0 0 15px 0; font-size: 18px;">👨‍💼 FIRMA DELL'OPERATORE</h4>
              <p style="margin: 0 0 20px 0; font-size: 15px;">
                <strong>L'operatore sottoscritto</strong> certifica l'identità del cliente e la corretta acquisizione dei consensi.
              </p>
              
              <div class="signature-box">
                <div class="label">Firma e Timbro Operatore</div>
                <div class="date">Data: ${currentDate}</div>
              </div>
              
              <div class="operator-info">
                <div>
                  <strong>Nome Operatore:</strong> _______________________
                </div>
                <div>
                  <strong>Codice ID:</strong> _______________________
                </div>
              </div>
            </div>
          </div>
          
          <!-- SEZIONE NOTE OPERATORE -->
          <div class="notes-section">
            <h4>📝 NOTE DELL'OPERATORE</h4>
            
            <div style="margin-bottom: 20px;">
              <strong>Documento identità verificato:</strong>
              <div class="document-checkboxes">
                <label>
                  <span class="checkbox-square"></span> Carta d'Identità
                </label>
                <label>
                  <span class="checkbox-square"></span> Patente
                </label>
                <label>
                  <span class="checkbox-square"></span> Passaporto
                </label>
              </div>
            </div>
            
            <div style="margin-bottom: 20px;">
              <strong>Numero documento:</strong> ________________________________________________
            </div>
            
            <div style="margin-bottom: 20px;">
              <strong>Note aggiuntive operatore:</strong>
              <div class="notes-area"></div>
            </div>
          </div>
          
          <!-- ISTRUZIONI IMPORTANTI -->
          <div class="instructions">
            <h4>⚠️ ISTRUZIONI IMPORTANTI</h4>
            <ul>
              <li><strong>Verificare l'identità</strong> del cliente tramite documento valido</li>
              <li><strong>Conservare questo modulo</strong> negli archivi fisici per 10 anni</li>
              <li><strong>Scansionare o fotografare</strong> il modulo firmato per backup digitale</li>
              <li><strong>Consegnare copia</strong> al cliente se richiesta</li>
              <li>In caso di dubbi contattare il responsabile privacy</li>
            </ul>
          </div>
          
          <div class="footer">
            <strong>🍞 SAPORI & COLORI - SISTEMA FEDELTÀ GEMME</strong><br>
            <small>Modulo Privacy e Consensi - Versione ${currentDate} - Documento su 4 fogli</small>
          </div>
        </div>
        
        <button class="print-button no-print" onclick="window.print()">🖨️ Stampa Documento (4 Fogli)</button>
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

  // Render del componente
  return (
    <div className="privacy-management">
      <div className="privacy-header">
        <h2>🔒 Gestione Privacy Cliente</h2>
        <p>Cliente: <strong>{customer.name}</strong></p>
      </div>

      <div className="privacy-cards">
        <div className="privacy-card">
          <h3>📋 Consensi Attuali</h3>
          <div className="consent-grid">
            <div className="consent-item">
              <span className="consent-label">💎 Programma Fedeltà GEMME</span>
              <span className={`consent-status ${fidelityConsent?.consent_given ? 'granted' : 'denied'}`}>
                {fidelityConsent?.consent_given ? '✅ Attivo' : '❌ Negato'}
              </span>
            </div>
            
            <div className="consent-item">
              <span className="consent-label">📧 Email Marketing</span>
              <span className={`consent-status ${marketingConsent?.consent_given ? 'granted' : 'denied'}`}>
                {marketingConsent?.consent_given ? '✅ Attivo' : '❌ Negato'}
              </span>
            </div>
            
            <div className="consent-item">
              <span className="consent-label">📱 SMS Marketing</span>
              <span className={`consent-status ${smsConsent?.consent_given ? 'granted' : 'denied'}`}>
                {smsConsent?.consent_given ? '✅ Attivo' : '❌ Negato'}
              </span>
            </div>
            
            <div className="consent-item">
              <span className="consent-label">📊 Profilazione</span>
              <span className={`consent-status ${profilingConsent?.consent_given ? 'granted' : 'denied'}`}>
                {profilingConsent?.consent_given ? '✅ Attivo' : '❌ Negato'}
              </span>
            </div>
          </div>
        </div>

        <div className="privacy-card">
          <h3>⚙️ Gestione Consensi</h3>
          <div className="consent-controls">
            <div className="consent-control">
              <label>📧 Email Marketing:</label>
              <div className="consent-buttons">
                <button 
                  className={`consent-btn ${marketingConsent?.consent_given ? 'active' : ''}`}
                  onClick={() => updateConsent('email_marketing', true)}
                >
                  ✅ Attiva
                </button>
                <button 
                  className={`consent-btn ${!marketingConsent?.consent_given ? 'active' : ''}`}
                  onClick={() => updateConsent('email_marketing', false)}
                >
                  ❌ Disattiva
                </button>
              </div>
            </div>
            
            <div className="consent-control">
              <label>📱 SMS Marketing:</label>
              <div className="consent-buttons">
                <button 
                  className={`consent-btn ${smsConsent?.consent_given ? 'active' : ''}`}
                  onClick={() => updateConsent('sms_marketing', true)}
                >
                  ✅ Attiva
                </button>
                <button 
                  className={`consent-btn ${!smsConsent?.consent_given ? 'active' : ''}`}
                  onClick={() => updateConsent('sms_marketing', false)}
                >
                  ❌ Disattiva
                </button>
              </div>
            </div>
            
            <div className="consent-control">
              <label>📊 Profilazione:</label>
              <div className="consent-buttons">
                <button 
                  className={`consent-btn ${profilingConsent?.consent_given ? 'active' : ''}`}
                  onClick={() => updateConsent('profiling', true)}
                >
                  ✅ Attiva
                </button>
                <button 
                  className={`consent-btn ${!profilingConsent?.consent_given ? 'active' : ''}`}
                  onClick={() => updateConsent('profiling', false)}
                >
                  ❌ Disattiva
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="privacy-card">
          <h3>✍️ Firma Digitale</h3>
          {fidelityConsent?.digital_signature ? (
            <div className="signature-display">
              <p>✅ Firma digitale presente</p>
              <p>Data: {new Date(fidelityConsent.consent_date).toLocaleString('it-IT')}</p>
              <img 
                src={fidelityConsent.digital_signature} 
                alt="Firma digitale"
                className="signature-preview"
              />
            </div>
          ) : (
            <div className="no-signature">
              <p>❌ Nessuna firma digitale presente</p>
              <p>La firma è stata acquisita durante la registrazione</p>
            </div>
          )}
        </div>

        <div className="privacy-card">
          <h3>📄 Documenti Privacy</h3>
          <div className="document-actions">
            <button 
              className="action-btn print-btn"
              onClick={printPrivacy}
              title="Stampa modulo privacy su 4 fogli"
            >
              🖨️ Stampa Privacy (4 Fogli)
            </button>
            <button 
              className="action-btn download-btn"
              onClick={generatePrivacyPDF}
              title="Scarica PDF privacy"
            >
              📄 Scarica PDF
            </button>
          </div>
        </div>
      </div>

      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
    </div>
  )
}

export default PrivacyManagement
          
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
            <span class="consent-checkbox">${fidelityConsent?.consent_given ? '✓' : '☐'}</span>
            <span>Acconsento al programma fedeltà GEMME (obbligatorio)</span>
          </div>
          
          <div class="consent-item">
            <span class="consent-checkbox">${marketingConsent?.consent_given ? '✓' : '☐'}</span>
            <span>Acconsento a ricevere offerte via email</span>
          </div>
          
          <div class="consent-item">
            <span class="consent-checkbox">${smsConsent?.consent_given ? '✓' : '☐'}</span>
            <span>Acconsento a ricevere SMS promozionali</span>
          </div>
          
          <div class="consent-item">
            <span class="consent-checkbox">${profilingConsent?.consent_given ? '✓' : '☐'}</span>
            <span>Acconsento alla profilazione per offerte personalizzate</span>
          </div>
        </div>
        
        ${fidelityConsent?.digital_signature ? `
          <div class="signature-area">
            <h3>✍️ FIRMA DIGITALE ACQUISITA</h3>
            <p><strong>✅ Firma digitale apposta il ${new Date(fidelityConsent.consent_date).toLocaleDateString('it-IT')} alle ${new Date(fidelityConsent.consent_date).toLocaleTimeString('it-IT')}</strong></p>
            <div style="border: 3px solid #27ae60; border-radius: 12px; padding: 15px; background: #f8fff8; margin: 15px 0;">
              <img src="${fidelityConsent.digital_signature}" alt="Firma Digitale" class="signature-image" style="border: 2px solid #27ae60; border-radius: 8px; padding: 10px; background: white; max-width: 100%; height: auto;"/>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #27ae60; text-align: center;"><strong>Firma acquisita digitalmente e valida ai sensi dell'art. 20 DPR 445/2000</strong></p>
            </div>
          </div>
        ` : ''}
        
        <div class="physical-signature-area">
          <h3>✍️ FIRME FISICHE RICHIESTE</h3>
          <p style="font-weight: bold; color: #e74c3c; margin-bottom: 20px;">
            Per completare la registrazione, è necessario apporre le seguenti firme fisiche:
          </p>
          
          <div style="margin-bottom: 30px; border: 2px solid #e74c3c; border-radius: 8px; padding: 15px; background: white;">
            <h4 style="color: #e74c3c; margin: 0 0 10px 0;">📝 FIRMA DEL CLIENTE</h4>
            <p style="margin: 0 0 15px 0; font-size: 14px;">
              <strong>Il sottoscritto ${customer.name}</strong>, dichiara di aver letto e compreso l'informativa privacy 
              e di esprimere i consensi come indicati sopra.
            </p>
            
            <div class="signature-box">
              <div class="signature-label">Firma del Cliente</div>
              <div class="signature-date">Data: ${currentDate}</div>
            </div>
          </div>
          
          <div style="border: 2px solid #e74c3c; border-radius: 8px; padding: 15px; background: white;">
            <h4 style="color: #e74c3c; margin: 0 0 10px 0;">👨‍💼 FIRMA DELL'OPERATORE</h4>
            <p style="margin: 0 0 15px 0; font-size: 14px;">
              L'operatore certifica l'identità del cliente e la corretta acquisizione dei consensi.
            </p>
            
            <div class="signature-box">
              <div class="signature-label">Firma dell'Operatore</div>
              <div class="signature-date">Data: ${currentDate}</div>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Modulo Privacy e Consensi - Versione ${currentDate}</strong></p>
          <p>Documento generato automaticamente dal sistema di gestione fedeltà GEMME</p>
        </div>
      </body>
      </html>
    `
    
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.print()
  }

  // Aggiorna un singolo consenso
  const updateConsent = async (consentType, consentGiven) => {
    if (!consentRecord || !consentRecord[consentType]) {
      showNotification('❌ Nessun consenso trovato per questo tipo', 'error')
      return
    }

    const recordId = consentRecord[consentType].id

    try {
      const { error } = await supabase
        .from('consent_records')
        .update({ 
          consent_given: consentGiven,
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId)

      if (error) {
        console.error('Errore aggiornamento consenso:', error)
        showNotification('❌ Errore nell\'aggiornamento del consenso', 'error')
        return
      }

      // Aggiorna lo stato locale
      setConsentRecord(prev => ({
        ...prev,
        [consentType]: {
          ...prev[consentType],
          consent_given: consentGiven,
          updated_at: new Date().toISOString()
        }
      }))

      showNotification('✅ Consenso aggiornato con successo!', 'success')
    } catch (error) {
      console.error('Errore generale aggiornamento consenso:', error)
      showNotification('❌ Errore nell\'aggiornamento del consenso', 'error')
    }
  }

  if (loading) {
    return (
      <div className="privacy-management-loading">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="text-sm text-secondary mt-2">Caricamento consensi...</p>
        </div>
      </div>
    )
  }

  if (!consentRecord || Object.keys(consentRecord).length === 0) {
    return (
      <div className="privacy-management-empty">
        <div className="text-center py-8">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Nessuna privacy firmata</h3>
          <p className="text-sm text-gray-500">
            Questo cliente non ha ancora firmato l'informativa privacy durante la registrazione.
          </p>
        </div>
      </div>
    )
  }

  // Estrai i consensi disponibili
  const fidelityConsent = consentRecord.fidelity
  const marketingConsent = consentRecord.email_marketing
  const smsConsent = consentRecord.sms_marketing
  const profilingConsent = consentRecord.profiling

  return (
    <div className="privacy-management">
      <div className="privacy-header">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          📋 Informativa Privacy Firmata
        </h3>
        <div className="text-sm text-gray-600 mb-6">
          {fidelityConsent && (
            <p><strong>Firmata il:</strong> {new Date(fidelityConsent.consent_date).toLocaleDateString('it-IT')} alle {new Date(fidelityConsent.consent_date).toLocaleTimeString('it-IT')}</p>
          )}
        </div>
        
        {/* Pulsanti Azioni */}
        <div className="flex gap-3 mb-6">
          <button 
            onClick={() => setShowFullPrivacy(!showFullPrivacy)}
            className="btn btn-secondary flex items-center gap-2"
          >
            {showFullPrivacy ? '👁️ Nascondi' : '👁️ Visualizza'} Privacy
          </button>
          <button 
            onClick={printPrivacy}
            className="btn btn-primary flex items-center gap-2"
          >
            🖨️ Stampa
          </button>
          <button 
            onClick={generatePrivacyPDF}
            className="btn btn-primary flex items-center gap-2"
          >
            💾 Scarica PDF
          </button>
        </div>
      </div>

      {/* Visualizzazione completa privacy */}
      {showFullPrivacy && (
        <div className="privacy-text mb-6 p-4 bg-gray-50 rounded-lg text-sm">
          <h4 className="font-semibold mb-3">INFORMATIVA AI SENSI DELL'ART. 13 DEL REGOLAMENTO UE 2016/679</h4>
          
          <div className="space-y-3">
            <div>
              <strong>🏢 TITOLARE DEL TRATTAMENTO:</strong><br />
              Sapori & Colori<br />
              Via [INSERIRE INDIRIZZO COMPLETO]<br />
              Tel: [TELEFONO] - Email: [EMAIL NEGOZIO]
            </div>
            
            <div>
              <strong>🎯 FINALITÀ DEL TRATTAMENTO:</strong><br />
              I suoi dati personali vengono trattati per:<br />
              • Gestione del programma fedeltà GEMME<br />
              • Erogazione dei servizi richiesti<br />
              • Invio comunicazioni commerciali (solo con consenso)<br />
              • Profilazione per offerte personalizzate (solo con consenso)<br />
              • Adempimenti fiscali e contabili
            </div>
            
            <div>
              <strong>⚖️ BASE GIURIDICA:</strong><br />
              • Consenso dell'interessato (art. 6, lett. a GDPR)<br />
              • Esecuzione contratto (art. 6, lett. b GDPR)<br />
              • Obblighi legali (art. 6, lett. c GDPR)
            </div>
            
            <div>
              <strong>📊 CATEGORIE DI DATI:</strong><br />
              Raccogliamo: nome, telefono, email, data nascita, città, note operative, preferenze, eventuali allergie/intolleranze (solo se comunicati volontariamente)
            </div>
            
            <div>
              <strong>🕒 CONSERVAZIONE:</strong><br />
              I dati saranno conservati fino alla revoca del consenso o per 10 anni dall'ultima transazione per obblighi fiscali
            </div>
            
            <div>
              <strong>🔒 I SUOI DIRITTI:</strong><br />
              Lei ha diritto di accedere, rettificare, cancellare i dati, limitare il trattamento, alla portabilità dei dati, opporsi al trattamento e revocare il consenso in qualsiasi momento.
            </div>
            
            <div>
              <strong>📧 CONTATTI:</strong><br />
              Per esercitare i suoi diritti: Email [EMAIL PRIVACY], Tel [TELEFONO NEGOZIO], di persona presso il punto vendita
            </div>
          </div>
        </div>
      )}

      {/* Modifica Consensi */}
      <div className="consent-modification">
        <h4 className="font-semibold text-gray-800 mb-4">
          ✏️ Modifica Consensi (se il cliente ci ripensa)
        </h4>
        
        <div className="consent-controls space-y-4">
          {/* Consenso Fidelity */}
          {fidelityConsent && (
            <div className="consent-item">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h5 className="font-medium text-gray-800">Programma Fedeltà</h5>
                  <p className="text-sm text-gray-600">Partecipazione al programma fedeltà GEMME</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fidelityConsent.consent_given || false}
                    onChange={(e) => updateConsent('fidelity', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>
            </div>
          )}

          {/* Consenso Email Marketing */}
          {marketingConsent && (
            <div className="consent-item">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h5 className="font-medium text-gray-800">Email Marketing</h5>
                  <p className="text-sm text-gray-600">Invio di newsletter e offerte commerciali via email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={marketingConsent.consent_given || false}
                    onChange={(e) => updateConsent('email_marketing', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>
            </div>
          )}

          {/* Consenso SMS Marketing */}
          {smsConsent && (
            <div className="consent-item">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h5 className="font-medium text-gray-800">SMS Marketing</h5>
                  <p className="text-sm text-gray-600">Invio di offerte e comunicazioni via SMS</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smsConsent.consent_given || false}
                    onChange={(e) => updateConsent('sms_marketing', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>
            </div>
          )}

          {/* Consenso Profilazione */}
          {profilingConsent && (
            <div className="consent-item">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h5 className="font-medium text-gray-800">Profilazione</h5>
                  <p className="text-sm text-gray-600">Offerte personalizzate basate sui tuoi acquisti</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profilingConsent.consent_given || false}
                    onChange={(e) => updateConsent('profiling', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Firma digitale */}
      {fidelityConsent?.digital_signature && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">🖋️ Firma Digitale Originale</h4>
          <div className="signature-container bg-white p-3 rounded border max-w-md">
            <img 
              src={fidelityConsent.digital_signature} 
              alt="Firma digitale" 
              className="max-w-full h-auto"
              style={{ maxHeight: '100px' }}
            />
          </div>
        </div>
      )}

      {/* Info tecnica */}
      <div className="mt-6 text-xs text-gray-500 p-3 bg-gray-100 rounded">
        <p><strong>Cliente:</strong> {customer.name} (ID: {customer.id})</p>
        <p><strong>Data firma:</strong> {fidelityConsent?.consent_date ? new Date(fidelityConsent.consent_date).toLocaleDateString('it-IT') : 'N/A'}</p>
        <p><strong>Ultima modifica:</strong> {fidelityConsent?.updated_at ? new Date(fidelityConsent.updated_at).toLocaleDateString('it-IT') : 'N/A'}</p>
      </div>
    </div>
  )
}

export default PrivacyManagement
