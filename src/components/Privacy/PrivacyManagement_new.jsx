import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabase'
import jsPDF from 'jspdf'
import './PrivacyManagement.css'

function PrivacyManagement({ customer }) {
  const [consentRecord, setConsentRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState(null)

  // Filtro consensi per tipo
  const fidelityConsent = consentRecord?.find(c => c.consent_type === 'fidelity')
  const marketingConsent = consentRecord?.find(c => c.consent_type === 'email_marketing')
  const profilingConsent = consentRecord?.find(c => c.consent_type === 'profiling')

  // Carica i consensi del cliente
  const loadConsentRecord = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('consent_records')
        .select('*')
        .eq('customer_id', customer.id)
        .order('consent_date', { ascending: false })

      if (error) {
        console.error('Errore caricamento consensi:', error)
        setNotification({ type: 'error', message: 'Errore nel caricamento dei consensi' })
        return
      }

      setConsentRecord(data || [])
    } catch (error) {
      console.error('Errore:', error)
      setNotification({ type: 'error', message: 'Errore nel caricamento dei consensi' })
    } finally {
      setLoading(false)
    }
  }, [customer.id])

  // Aggiorna un consenso
  const updateConsent = async (consentType, consentGiven) => {
    try {
      const { error } = await supabase
        .from('consent_records')
        .upsert({
          customer_id: customer.id,
          consent_type: consentType,
          consent_given: consentGiven,
          consent_date: new Date().toISOString(),
        })

      if (error) {
        console.error('Errore aggiornamento consenso:', error)
        setNotification({ type: 'error', message: 'Errore nell\'aggiornamento del consenso' })
        return
      }

      setNotification({ type: 'success', message: 'Consenso aggiornato correttamente' })
      loadConsentRecord()
    } catch (error) {
      console.error('Errore:', error)
      setNotification({ type: 'error', message: 'Errore nell\'aggiornamento del consenso' })
    }
  }

  // Notifica temporanea
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  // Funzione di stampa ottimizzata per 4 fogli
  const printPrivacy = () => {
    const printWindow = window.open('', '_blank')
    const currentDate = new Date().toLocaleDateString('it-IT')
    const currentTime = new Date().toLocaleTimeString('it-IT')
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Privacy - ${customer.name}</title>
        <style>
          @page { size: A4; margin: 2cm; }
          body { font-family: 'Times New Roman', serif; font-size: 11px; margin: 0; padding: 0; }
          .sheet { height: 100vh; padding: 10px; box-sizing: border-box; break-after: page; }
          .sheet:last-child { break-after: avoid; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
          .header h1 { font-size: 18px; margin: 0; }
          .header h2 { font-size: 13px; margin: 3px 0; }
          .content { font-size: 10px; line-height: 1.2; }
          .info-box { background: #f5f5f5; padding: 8px; border: 1px solid #000; margin-bottom: 12px; }
          .consent-item { margin: 6px 0; display: flex; align-items: flex-start; gap: 6px; }
          .checkbox { width: 12px; height: 12px; border: 1px solid #000; display: inline-block; text-align: center; line-height: 10px; font-size: 10px; }
          .sig-box { border: 1px solid #000; height: 50px; background: white; position: relative; margin: 8px 0; }
          .sig-label { position: absolute; bottom: 2px; left: 8px; font-size: 8px; }
          .sig-date { position: absolute; bottom: 2px; right: 8px; font-size: 8px; }
        </style>
      </head>
      <body>
        <!-- FOGLIO 1 -->
        <div class="sheet">
          <div class="header">
            <h1>🍞 SAPORI & COLORI</h1>
            <h2>Informativa Privacy</h2>
            <p>Data: ${currentDate} - ${currentTime}</p>
          </div>
          <div class="info-box">
            <strong>Cliente:</strong> ${customer.name} | <strong>ID:</strong> ${customer.id}<br>
            <strong>Status:</strong> ${fidelityConsent?.consent_given ? 'Attivo' : 'Inattivo'} | <strong>Punti:</strong> ${customer.gems || 0} gemme
          </div>
          <div class="content">
            <h3>INFORMATIVA PRIVACY (GDPR)</h3>
            <p><strong>Titolare:</strong> SAPORI & COLORI</p>
            <p><strong>Finalità:</strong> Gestione programma fedeltà con tessera digitale</p>
            <p><strong>Base Giuridica:</strong> Consenso esplicito dell'interessato</p>
            <p><strong>Dati Raccolti:</strong> Nome, cognome, data nascita, città, transazioni e punti</p>
            <p><strong>Conservazione:</strong> Fino a revoca del consenso o 10 anni dall'ultima transazione</p>
            <p><strong>Diritti:</strong> Accesso, rettifica, cancellazione, limitazione, portabilità, opposizione</p>
            <p><strong>Contatti:</strong> Presso il punto vendita per esercitare i propri diritti</p>
          </div>
        </div>
        
        <!-- FOGLIO 2 -->
        <div class="sheet">
          <div class="header">
            <h1>CONSENSI AL TRATTAMENTO</h1>
          </div>
          <div class="content">
            <h3>CONSENSI ESPRESSI</h3>
            <div class="consent-item">
              <span class="checkbox">${fidelityConsent?.consent_given ? '✓' : '☐'}</span>
              <span><strong>TESSERA FEDELTÀ (Obbligatorio):</strong> Accetto il trattamento dei miei dati personali per la partecipazione al programma fedeltà con tessera digitale</span>
            </div>
            <div class="consent-item">
              <span class="checkbox">${marketingConsent?.consent_given ? '✓' : '☐'}</span>
              <span><strong>MARKETING (Facoltativo):</strong> Accetto di ricevere comunicazioni commerciali e promozionali via email</span>
            </div>
            <div class="consent-item">
              <span class="checkbox">${profilingConsent?.consent_given ? '✓' : '☐'}</span>
              <span><strong>PROFILAZIONE (Facoltativo):</strong> Accetto la profilazione per ricevere offerte personalizzate</span>
            </div>
            <div style="margin-top: 15px; padding: 8px; border: 1px solid #000;">
              <h4>STATUS TESSERA FEDELTÀ</h4>
              <p><strong>Tessera:</strong> ${fidelityConsent?.consent_given ? '✅ Attiva' : '❌ Inattiva'}</p>
              <p><strong>Punti:</strong> ${customer.gems || 0} gemme | <strong>Livello:</strong> ${customer.level || 'Bronzo'}</p>
            </div>
          </div>
        </div>
        
        <!-- FOGLIO 3 -->
        <div class="sheet">
          <div class="header">
            <h1>FIRMA DIGITALE</h1>
          </div>
          <div class="content">
            ${fidelityConsent?.digital_signature ? 
              `<div style="text-align: center; margin: 15px 0;">
                <img src="${fidelityConsent.digital_signature}" style="max-width: 200px; border: 1px solid #000; padding: 5px;">
                <p><strong>✅ FIRMA ACQUISITA</strong></p>
                <p>Data: ${new Date(fidelityConsent.consent_date).toLocaleDateString('it-IT')}</p>
              </div>` : 
              '<p style="text-align: center; color: red; font-size: 12px; margin: 25px 0;">❌ FIRMA NON ACQUISITA</p>'
            }
            <div style="margin-top: 20px; padding: 8px; border: 1px solid #000;">
              <h4>DATI CONFERMATI</h4>
              <p><strong>Nome:</strong> ${customer.name}</p>
              <p><strong>Data nascita:</strong> ${customer.birth_date || 'N/A'}</p>
              <p><strong>Città:</strong> ${customer.city || 'N/A'}</p>
            </div>
          </div>
        </div>
        
        <!-- FOGLIO 4 -->
        <div class="sheet">
          <div class="header">
            <h1>FIRME FISICHE</h1>
          </div>
          <div class="content">
            <h3>FIRMA CLIENTE</h3>
            <div class="sig-box">
              <span class="sig-label">Firma Cliente</span>
              <span class="sig-date">Data: ${currentDate}</span>
            </div>
            <p style="text-align: center; font-size: 9px;"><strong>Dichiaro di aver letto l'informativa privacy</strong></p>
            
            <h3>FIRMA OPERATORE</h3>
            <div class="sig-box">
              <span class="sig-label">Firma Operatore</span>
              <span class="sig-date">Data: ${currentDate}</span>
            </div>
            <p style="text-align: center; font-size: 9px;"><strong>Confermo l'acquisizione dei consensi</strong></p>
            
            <div style="text-align: center; margin-top: 20px; padding: 8px; border-top: 1px solid #000;">
              <p style="font-size: 9px;"><strong>SAPORI & COLORI - SISTEMA FEDELTÀ</strong></p>
              <p style="font-size: 8px;">Documento 4 fogli - ${currentDate}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `)
    
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 1000)
  }

  // Genera PDF
  const generatePrivacyPDF = () => {
    const doc = new jsPDF()
    const pageHeight = doc.internal.pageSize.height
    let yPosition = 20
    
    // Intestazione
    doc.setFontSize(16)
    doc.text('🍞 SAPORI & COLORI', 20, yPosition)
    yPosition += 10
    doc.setFontSize(12)
    doc.text('Modulo Privacy e Consensi', 20, yPosition)
    yPosition += 15
    
    // Dati cliente
    doc.setFontSize(10)
    doc.text(`Cliente: ${customer.name}`, 20, yPosition)
    doc.text(`ID: ${customer.id}`, 120, yPosition)
    yPosition += 10
    doc.text(`Data: ${new Date().toLocaleDateString('it-IT')}`, 20, yPosition)
    yPosition += 15
    
    // Consensi
    doc.setFontSize(12)
    doc.text('CONSENSI:', 20, yPosition)
    yPosition += 10
    doc.setFontSize(10)
    doc.text(`Tessera Fedeltà: ${fidelityConsent?.consent_given ? '✅ SÌ' : '❌ NO'}`, 20, yPosition)
    yPosition += 7
    doc.text(`Marketing: ${marketingConsent?.consent_given ? '✅ SÌ' : '❌ NO'}`, 20, yPosition)
    yPosition += 7
    doc.text(`Profilazione: ${profilingConsent?.consent_given ? '✅ SÌ' : '❌ NO'}`, 20, yPosition)
    
    doc.save(`privacy_${customer.name}_${new Date().toISOString().split('T')[0]}.pdf`)
    showNotification('PDF generato con successo', 'success')
  }

  // Carica i dati all'avvio
  useEffect(() => {
    loadConsentRecord()
  }, [customer.id])

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Caricamento dati privacy...</p>
      </div>
    )
  }

  return (
    <div className="privacy-management">
      <div className="privacy-header">
        <h2>🔒 Gestione Privacy - {customer.name}</h2>
        <p>Visualizza e gestisci i consensi al trattamento dei dati</p>
      </div>

      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="privacy-cards">
        <div className="privacy-card">
          <h3>📋 Consenso Tessera Fedeltà</h3>
          <div className="consent-status">
            <span className={`status-badge ${fidelityConsent?.consent_given ? 'active' : 'inactive'}`}>
              {fidelityConsent?.consent_given ? '✅ Attivo' : '❌ Inattivo'}
            </span>
            <span className="consent-date">
              {fidelityConsent?.consent_date ? 
                `Dal ${new Date(fidelityConsent.consent_date).toLocaleDateString('it-IT')}` : 
                'Mai rilasciato'
              }
            </span>
          </div>
          <div className="consent-buttons">
            <button 
              className={`consent-btn ${fidelityConsent?.consent_given ? 'active' : ''}`}
              onClick={() => updateConsent('fidelity', true)}
            >
              ✅ Attiva
            </button>
            <button 
              className={`consent-btn ${!fidelityConsent?.consent_given ? 'active' : ''}`}
              onClick={() => updateConsent('fidelity', false)}
            >
              ❌ Disattiva
            </button>
          </div>
        </div>

        <div className="privacy-card">
          <h3>📧 Consenso Marketing</h3>
          <div className="consent-status">
            <span className={`status-badge ${marketingConsent?.consent_given ? 'active' : 'inactive'}`}>
              {marketingConsent?.consent_given ? '✅ Attivo' : '❌ Inattivo'}
            </span>
            <span className="consent-date">
              {marketingConsent?.consent_date ? 
                `Dal ${new Date(marketingConsent.consent_date).toLocaleDateString('it-IT')}` : 
                'Mai rilasciato'
              }
            </span>
          </div>
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

        <div className="privacy-card">
          <h3>📊 Consenso Profilazione</h3>
          <div className="consent-status">
            <span className={`status-badge ${profilingConsent?.consent_given ? 'active' : 'inactive'}`}>
              {profilingConsent?.consent_given ? '✅ Attivo' : '❌ Inattivo'}
            </span>
            <span className="consent-date">
              {profilingConsent?.consent_date ? 
                `Dal ${new Date(profilingConsent.consent_date).toLocaleDateString('it-IT')}` : 
                'Mai rilasciato'
              }
            </span>
          </div>
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

        <div className="privacy-card">
          <h3>✍️ Firma Digitale</h3>
          {fidelityConsent?.digital_signature ? (
            <div className="signature-display">
              <p>✅ Firma digitale acquisita</p>
              <img 
                src={fidelityConsent.digital_signature} 
                alt="Firma digitale" 
                className="signature-preview"
              />
              <p>Data: {new Date(fidelityConsent.consent_date).toLocaleDateString('it-IT')}</p>
            </div>
          ) : (
            <div className="no-signature">
              <p>❌ Firma digitale non acquisita</p>
              <p>La firma deve essere acquisita durante la registrazione</p>
            </div>
          )}
        </div>
      </div>

      <div className="privacy-card">
        <h3>📄 Documenti Privacy</h3>
        <div className="document-actions">
          <button 
            className="action-btn print-btn"
            onClick={printPrivacy}
          >
            🖨️ Stampa Privacy (4 Fogli)
          </button>
          <button 
            className="action-btn download-btn"
            onClick={generatePrivacyPDF}
          >
            📄 Scarica PDF
          </button>
        </div>
      </div>
    </div>
  )
}

export default PrivacyManagement
