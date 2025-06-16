import { useState } from 'react'
import jsPDF from 'jspdf'
import { supabase } from '../../supabase'

const PrivacyManagement = ({ customer, customerConsents, setCustomerConsents, showNotification }) => {
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [isUpdatingConsent, setIsUpdatingConsent] = useState(false)

  // Funzione per recuperare la firma digitale dal database
  const getDigitalSignature = async (customerId) => {
    try {
      const { data, error } = await supabase
        .from('consent_records')
        .select('digital_signature, consent_date')
        .eq('customer_id', customerId)
        .not('digital_signature', 'is', null)
        .order('consent_date', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Errore recupero firma:', error)
        return null
      }

      return data && data.length > 0 ? data[0] : null
    } catch (error) {
      console.error('Errore generale recupero firma:', error)
      return null
    }
  }

  // Genera e scarica il PDF della privacy
  const generatePrivacyPDF = () => {
    const doc = new jsPDF()
    let y = 15

    doc.setFontSize(16)
    doc.text("Modulo Privacy - Sapori & Colori", 10, y)
    y += 10

    doc.setFontSize(10)
    doc.text(
      `TITOLARE DEL TRATTAMENTO:\nSapori & Colori B srl\nVia Bagaladi 7, 00132 Roma\nTel: 06-XXXXXXX - Email: privacy@saporiecolori.it\n\n` +
      `FINALITÀ DEL TRATTAMENTO:\n- Gestione del programma fedeltà GEMME\n- Erogazione dei servizi richiesti\n- Invio comunicazioni commerciali (solo con consenso)\n- Profilazione per offerte personalizzate (solo con consenso)\n- Adempimenti fiscali e contabili\n\n` +
      `BASE GIURIDICA:\n- Consenso dell'interessato (art. 6, lett. a GDPR)\n- Esecuzione contratto (art. 6, lett. b GDPR)\n- Obblighi legali (art. 6, lett. c GDPR)\n\n` +
      `CATEGORIE DI DATI:\nRaccogliamo: nome, telefono, email, data nascita, città, note operative, preferenze, eventuali allergie/intolleranze (solo se comunicati volontariamente)\n\n` +
      `CONSERVAZIONE:\nI dati saranno conservati fino alla revoca del consenso o per 10 anni dall'ultima transazione per obblighi fiscali\n\n` +
      `DESTINATARI:\nI dati non verranno comunicati a terzi, salvo obblighi di legge o fornitori di servizi tecnici (con garanzie privacy)\n\n` +
      `TRASFERIMENTI:\nI dati vengono trattati nell'Unione Europea. Eventuali trasferimenti extra-UE avverranno con adeguate garanzie\n\n` +
      `DIRITTI:\n- Accedere ai suoi dati (art. 15 GDPR)\n- Rettificare dati inesatti (art. 16 GDPR)\n- Cancellare i dati (art. 17 GDPR)\n- Limitare il trattamento (art. 18 GDPR)\n- Portabilità dei dati (art. 20 GDPR)\n- Opporsi al trattamento (art. 21 GDPR)\n- Revocare il consenso in qualsiasi momento\n\n` +
      `COME ESERCITARE I DIRITTI:\nEmail: privacy@saporiecolori.it\nTelefono: 06-XXXXXXX\nDi persona presso il punto vendita\n\n` +
      `RECLAMI:\nHa diritto di proporre reclamo all'Autorità Garante per la Protezione dei Dati Personali (www.gpdp.it)\n\n` +
      `AGGIORNAMENTI:\nQuesta informativa può essere aggiornata. Le modifiche saranno comunicate tramite i nostri canali\n\n`,
      10,
      y,
      { maxWidth: 190 }
    )

    // Aggiungi data e info cliente
    y = 230
    doc.setFontSize(12)
    const oggi = new Date()
    const dataString = oggi.toLocaleDateString('it-IT')
    doc.text(`Roma, lì ${dataString}`, 10, y)
    y += 10
    doc.text(`Cliente: ${customer.name}`, 10, y)
    y += 5
    doc.text(`Email: ${customer.email}`, 10, y)
    y += 5
    doc.text(`Telefono: ${customer.phone}`, 10, y)
    y += 10

    // Stato consensi
    doc.text("CONSENSI PRESTATI:", 10, y)
    y += 7
    doc.setFontSize(10)
    
    const consents = customerConsents[customer.id] || {}
    doc.text(`✓ Trattamento dati per programma fedeltà: ${consents.fidelity ? 'SÌ' : 'NON PRESTATO'}`, 10, y)
    y += 5
    doc.text(`✓ Marketing e comunicazioni commerciali: ${consents.marketing ? 'SÌ' : 'NO'}`, 10, y)
    y += 5
    doc.text(`✓ Newsletter e aggiornamenti: ${consents.newsletter ? 'SÌ' : 'NO'}`, 10, y)
    y += 5
    doc.text(`✓ Profilazione per offerte personalizzate: ${consents.profiling ? 'SÌ' : 'NO'}`, 10, y)

    doc.save(`privacy_${customer.name.replace(/\s+/g, '_')}_${dataString.replace(/\//g, '-')}.pdf`)
    showNotification('📄 Documento privacy scaricato con successo!', 'success')
  }

  // Invia privacy via email
  const sendPrivacyByEmail = async () => {
    try {
      // TODO: Implementare invio email tramite Supabase Edge Functions o servizio email
      showNotification('📧 Funzionalità di invio email in sviluppo. Per ora scarica il PDF.', 'info')
    } catch (error) {
      console.error('Errore invio email:', error)
      showNotification('❌ Errore nell\'invio email', 'error')
    }
  }

  // Aggiorna consensi privacy con persistenza nel database
  const updatePrivacyConsents = async (newConsents) => {
    setIsUpdatingConsent(true)
    try {
      console.log('Aggiornamento consensi per cliente:', customer.id, newConsents)
      
      // Tenta di salvare nel database Supabase
      const { error } = await supabase
        .from('customer_consents')
        .upsert({
          customer_id: customer.id,
          marketing: newConsents.marketing || false,
          newsletter: newConsents.newsletter || false,
          profiling: newConsents.profiling || false,
          fidelity: newConsents.fidelity || true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'customer_id'
        })

      // Aggiorna lo state locale sempre (indipendentemente da errori DB)
      setCustomerConsents(prev => ({
        ...prev,
        [customer.id]: newConsents
      }))

      // Gestione semplificata: se c'è un errore, è molto probabilmente tabella mancante
      if (error) {
        console.log('Errore Supabase (presumibilmente tabella customer_consents mancante):', error)
        showNotification('⚠️ Consensi salvati localmente. Crea la tabella customer_consents in Supabase.', 'warning')
      } else {
        console.log('✅ Consensi salvati nel database')
        showNotification('✅ Consensi privacy salvati nel database!', 'success')
      }

      // Chiudi modal e mostra successo generale
      showNotification('✅ Consensi privacy aggiornati con successo!', 'success')
      setShowPrivacyModal(false)

    } catch (error) {
      console.error('Errore catch aggiornamento consensi:', error)
      
      // Anche nel catch, aggiorna lo state locale
      setCustomerConsents(prev => ({
        ...prev,
        [customer.id]: newConsents
      }))
      
      showNotification('⚠️ Consensi salvati localmente. Verifica configurazione database.', 'warning')
      setShowPrivacyModal(false)
    } finally {
      setIsUpdatingConsent(false)
    }
  }

  // Genera e scarica il PDF della privacy CON FIRMA DIGITALE
  const generateSignedPrivacyPDF = async () => {
    try {
      // Recupera la firma digitale dal database
      const signatureData = await getDigitalSignature(customer.id)
      
      if (!signatureData || !signatureData.digital_signature) {
        showNotification('❌ Nessuna firma digitale trovata per questo cliente', 'error')
        return
      }

      // Crea PDF con jsPDF già importato
      const doc = new jsPDF()
      let y = 15

      // Header
      doc.setFontSize(16)
      doc.setFont(undefined, 'bold')
      doc.text("🍞 SAPORI & COLORI", 10, y)
      y += 8
      doc.setFontSize(12)
      doc.text("Modulo Privacy e Consensi - CON FIRMA DIGITALE", 10, y)
      y += 15

      // Data e info cliente
      const oggi = new Date()
      const dataString = oggi.toLocaleDateString('it-IT')
      const timeString = oggi.toLocaleTimeString('it-IT')
      
      doc.setFontSize(10)
      doc.setFont(undefined, 'normal')
      doc.text(`Documento generato il: ${dataString} alle ${timeString}`, 10, y)
      y += 8
      doc.text(`Cliente: ${customer.name}`, 10, y)
      y += 5
      doc.text(`Email: ${customer.email || 'Non fornita'}`, 10, y)
      y += 5
      doc.text(`Telefono: ${customer.phone}`, 10, y)
      y += 10

      // Informativa privacy (versione compatta)
      doc.setFontSize(9)
      const privacyText = `INFORMATIVA PRIVACY - PROGRAMMA FEDELTÀ GEMME

TITOLARE: Sapori & Colori B srl, Via Bagaladi 7, 00132 Roma

FINALITÀ: Gestione programma fedeltà, erogazione servizi, comunicazioni commerciali (con consenso), 
profilazione (con consenso), adempimenti fiscali e contabili.

BASE GIURIDICA: Consenso (art. 6 lett. a GDPR), esecuzione contratto (art. 6 lett. b GDPR), 
obblighi legali (art. 6 lett. c GDPR).

DATI TRATTATI: Nome, telefono, email, data nascita, città, preferenze, cronologia acquisti.

CONSERVAZIONE: Fino a revoca consenso o 10 anni per obblighi fiscali.

DIRITTI: Accesso, rettifica, cancellazione, limitazione, portabilità, opposizione, revoca consenso.

CONTATTI: privacy@saporiecolori.it - Tel: 06-XXXXXXX`

      doc.text(privacyText, 10, y, { maxWidth: 190 })
      y += 55

      // Stato consensi
      const consents = customerConsents[customer.id] || {}
      doc.setFont(undefined, 'bold')
      doc.text("CONSENSI PRESTATI:", 10, y)
      y += 8
      doc.setFont(undefined, 'normal')
      doc.text(`✓ Programma fedeltà: ${consents.fidelity ? 'SÌ' : 'NON PRESTATO'}`, 15, y)
      y += 5
      doc.text(`✓ Marketing email: ${consents.marketing ? 'SÌ' : 'NO'}`, 15, y)
      y += 5
      doc.text(`✓ Newsletter: ${consents.newsletter ? 'SÌ' : 'NO'}`, 15, y)
      y += 5
      doc.text(`✓ Profilazione: ${consents.profiling ? 'SÌ' : 'NO'}`, 15, y)
      y += 15

      // Sezione firma digitale
      doc.setFont(undefined, 'bold')
      doc.text("FIRMA DIGITALE ACQUISITA:", 10, y)
      y += 8
      
      const signatureDate = new Date(signatureData.consent_date).toLocaleDateString('it-IT')
      const signatureTime = new Date(signatureData.consent_date).toLocaleTimeString('it-IT')
      
      doc.setFont(undefined, 'normal')
      doc.text(`✅ Firma apposta il ${signatureDate} alle ${signatureTime}`, 15, y)
      y += 8
      doc.text("Firma acquisita digitalmente e valida ai sensi dell'art. 20 DPR 445/2000", 15, y)
      y += 10

      // Aggiungi immagine della firma
      try {
        const signatureImg = signatureData.digital_signature
        // Dimensioni ottimali per la firma nel PDF
        const imgWidth = 80
        const imgHeight = 30
        
        doc.addImage(signatureImg, 'PNG', 15, y, imgWidth, imgHeight)
        y += imgHeight + 10
        
        // Bordo attorno alla firma
        doc.rect(13, y - imgHeight - 12, imgWidth + 4, imgHeight + 4)
        
      } catch (imgError) {
        console.error('Errore aggiunta immagine firma:', imgError)
        doc.text("❌ Errore nel caricamento dell'immagine della firma", 15, y)
        y += 10
      }

      // Footer
      y += 10
      doc.setFontSize(8)
      doc.text("Documento generato automaticamente dal sistema di gestione Sapori & Colori", 10, y)
      y += 5
      doc.text("Via Bagaladi 7, 00132 Roma - Tel: 06-XXXXXXX", 10, y)

      // Salva il PDF
      const fileName = `privacy_firmata_${customer.name.replace(/\s+/g, '_')}_${dataString.replace(/\//g, '-')}.pdf`
      doc.save(fileName)
      
      showNotification('📄 Privacy firmata scaricata con successo!', 'success')

    } catch (error) {
      console.error('Errore generazione PDF firmato:', error)
      showNotification('❌ Errore nella generazione del PDF firmato', 'error')
    }
  }

  const consents = customerConsents[customer.id] || {}
  const hasAnyConsent = consents.fidelity || consents.marketing || consents.newsletter || consents.profiling

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title flex items-center gap-3">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Gestione Privacy
        </h2>
        <p className="card-subtitle">Stato consensi e documenti privacy per {customer.name}</p>
      </div>
      
      <div className="card-body">
        {/* STATO CONSENSI */}
        <div className="privacy-status mb-6">
          <h3 className="font-semibold mb-3 text-gray-800">📋 Stato Consensi Privacy</h3>
          
          {!hasAnyConsent ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 19c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="font-medium">Nessun consenso privacy presente</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-2 gap-3">
              <div className={`p-3 rounded-lg border ${consents.fidelity ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl ${consents.fidelity ? 'text-green-600' : 'text-red-600'}`}>
                    {consents.fidelity ? '✅' : '❌'}
                  </span>
                  <div>
                    <div className="font-medium">Programma Fedeltà</div>
                    <div className="text-sm text-gray-600">Obbligatorio per il servizio</div>
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-lg border ${consents.marketing ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl ${consents.marketing ? 'text-green-600' : 'text-gray-400'}`}>
                    {consents.marketing ? '✅' : '⚪'}
                  </span>
                  <div>
                    <div className="font-medium">Marketing</div>
                    <div className="text-sm text-gray-600">Comunicazioni commerciali</div>
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-lg border ${consents.newsletter ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl ${consents.newsletter ? 'text-green-600' : 'text-gray-400'}`}>
                    {consents.newsletter ? '✅' : '⚪'}
                  </span>
                  <div>
                    <div className="font-medium">Newsletter</div>
                    <div className="text-sm text-gray-600">Aggiornamenti e novità</div>
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-lg border ${consents.profiling ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl ${consents.profiling ? 'text-green-600' : 'text-gray-400'}`}>
                    {consents.profiling ? '✅' : '⚪'}
                  </span>
                  <div>
                    <div className="font-medium">Profilazione</div>
                    <div className="text-sm text-gray-600">Offerte personalizzate</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* AZIONI PRIVACY */}
        <div className="privacy-actions">
          <h3 className="font-semibold mb-3 text-gray-800">🔧 Azioni Privacy</h3>
          
          <div className="grid grid-2 gap-4 mb-4">
            <button
              onClick={() => setShowPrivacyModal(true)}
              className="btn btn-primary flex items-center gap-2 justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {hasAnyConsent ? '📝 Aggiorna Consensi' : '📝 Firma Privacy'}
            </button>

            <button
              onClick={sendPrivacyByEmail}
              disabled={!hasAnyConsent || !customer.email}
              className={`btn ${hasAnyConsent && customer.email ? 'btn-info' : 'btn-secondary'} flex items-center gap-2 justify-center`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              📧 Invia via Email
            </button>
          </div>

          <div className="grid grid-2 gap-4">
            <button
              onClick={generatePrivacyPDF}
              disabled={!hasAnyConsent}
              className={`btn ${hasAnyConsent ? 'btn-success' : 'btn-secondary'} flex items-center gap-2 justify-center`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              📄 Scarica PDF Standard
            </button>

            <button
              onClick={generateSignedPrivacyPDF}
              disabled={!hasAnyConsent}
              className={`btn ${hasAnyConsent ? 'btn-warning' : 'btn-secondary'} flex items-center gap-2 justify-center`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              ✍️ Scarica Privacy Firmata
            </button>
          </div>

          <div className="mt-4">
            <button
              onClick={() => showNotification('🔍 Funzionalità di visualizzazione storico consensi in sviluppo', 'info')}
              className="btn btn-outline flex items-center gap-2 justify-center w-full"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              📈 Storico Consensi
            </button>
          </div>

          {hasAnyConsent && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 Info:</strong> I consensi sono stati prestati e registrati nel sistema. 
                È possibile scaricare il documento PDF standard, la versione firmata digitalmente o inviarlo via email al cliente.
                {!customer.email && ' ⚠️ Email non presente per l\'invio automatico.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL AGGIORNAMENTO CONSENSI */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <PrivacyConsentModal 
              customer={customer}
              currentConsents={consents}
              onSave={updatePrivacyConsents}
              onCancel={() => setShowPrivacyModal(false)}
              isLoading={isUpdatingConsent}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Componente modal per aggiornamento consensi
const PrivacyConsentModal = ({ customer, currentConsents, onSave, onCancel, isLoading }) => {
  const [consents, setConsents] = useState({
    fidelity: currentConsents.fidelity || true, // Sempre obbligatorio
    marketing: currentConsents.marketing || false,
    newsletter: currentConsents.newsletter || false,
    profiling: currentConsents.profiling || false
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(consents)
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">
          🛡️ Gestione Consensi Privacy - {customer.name}
        </h2>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-4 mb-6">
          {/* Consenso Fidelity (obbligatorio) */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={consents.fidelity}
                disabled={true}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-green-800">
                  Trattamento dati per programma fedeltà (OBBLIGATORIO)
                </div>
                <div className="text-sm text-green-700 mt-1">
                  Necessario per la gestione del programma GEMME e l'erogazione del servizio.
                </div>
              </div>
            </div>
          </div>

          {/* Altri consensi */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={consents.marketing}
                onChange={(e) => setConsents(prev => ({ ...prev, marketing: e.target.checked }))}
                className="mt-1"
              />
              <div>
                <div className="font-medium">Marketing e comunicazioni commerciali</div>
                <div className="text-sm text-gray-600 mt-1">
                  Autorizza l'invio di offerte, promozioni e comunicazioni commerciali.
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={consents.newsletter}
                onChange={(e) => setConsents(prev => ({ ...prev, newsletter: e.target.checked }))}
                className="mt-1"
              />
              <div>
                <div className="font-medium">Newsletter e aggiornamenti</div>
                <div className="text-sm text-gray-600 mt-1">
                  Ricevi newsletter con novità, eventi e aggiornamenti del negozio.
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={consents.profiling}
                onChange={(e) => setConsents(prev => ({ ...prev, profiling: e.target.checked }))}
                className="mt-1"
              />
              <div>
                <div className="font-medium">Profilazione per offerte personalizzate</div>
                <div className="text-sm text-gray-600 mt-1">
                  Autorizza l'analisi delle preferenze per offerte e contenuti personalizzati.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="btn btn-secondary"
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
          >
            {isLoading ? '🔄 Salvando...' : '✅ Salva Consensi'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default PrivacyManagement
