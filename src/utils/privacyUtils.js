import jsPDF from 'jspdf';

export const generatePrivacyPDF = (customer, consentRecord, signature) => {
  const doc = new jsPDF();
  const currentDate = new Date().toLocaleDateString('it-IT');
  const currentTime = new Date().toLocaleTimeString('it-IT');

  const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Modulo Privacy e Consensi - ${customer.name}</title>
        <style>
          @media print {
            @page { 
              size: A4;
              margin: 20mm 15mm;
            }
            body { 
              margin: 0; 
              padding: 0;
              font-size: 13px !important;
              line-height: 1.4 !important;
              max-width: 100% !important;
            }
            .no-print { display: none; }
            .page-break { 
              page-break-after: always !important; 
              height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .force-new-page { 
              page-break-before: always !important; 
            }
            .no-break { page-break-inside: avoid; }
            .header { 
              page-break-after: avoid; 
              margin-bottom: 15px !important;
            }
            .customer-info { 
              page-break-inside: avoid; 
              margin-bottom: 15px !important;
            }
            .consents-section { 
              page-break-inside: avoid; 
              margin: 15px 0 !important;
            }
            .signature-area { 
              page-break-inside: avoid; 
              margin: 15px 0 !important;
            }
            .physical-signature-area { 
              page-break-inside: avoid; 
              margin: 15px 0 !important;
            }
            .privacy-text { 
              font-size: 12px !important;
              line-height: 1.4 !important;
              margin-bottom: 10px !important;
            }
            .privacy-text h4 { 
              font-size: 14px !important; 
              margin: 8px 0 4px 0 !important;
            }
            .privacy-text ul { 
              margin: 4px 0 !important;
              padding-left: 15px !important;
            }
            .footer { 
              page-break-before: avoid; 
              margin-top: 20px !important;
            }
            .header h1 { font-size: 18px !important; }
            .header h2 { font-size: 16px !important; }
            .consent-item { font-size: 13px !important; }
            .info-row { font-size: 12px !important; }
            .customer-info h3 { font-size: 15px !important; }
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
        <div class="header no-break">
          <img src="https://jexkalekaofsfcusdfjh.supabase.co/storage/v1/object/public/tinymce-images//saporiecolorilogo2.png" alt="Sapori & Colori" style="height: 60px; margin-bottom: 10px;" />
          <h2>Modulo Privacy e Consensi al Trattamento Dati</h2>
          <p><strong>Data e Ora:</strong> ${currentDate} - ${currentTime}</p>
        </div>
        <div class="customer-info no-break">
          <h3>📋 Dati Cliente</h3>
          <div class="info-row">
            <span class="info-label">Nome Completo:</span>
            <span><strong>${customer.name}</strong></span>
          </div>
          <div class="info-row">
            <span class="info-label">Data di Nascita:</span>
            <span>${customer.birth_date}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Telefono:</span>
            <span>${customer.phone}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Email:</span>
            <span>${customer.email || 'Non fornita'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Città:</span>
            <span>${customer.city || 'Non specificata'}</span>
          </div>
        </div>
        <div class="privacy-text">
          <h4>🏢 TITOLARE DEL TRATTAMENTO</h4>
          <p>Sapori & Colori B SRL<br/>
          Via Bagaladi n. 9 - 00132 Roma<br/>
          Tel: 06 39911640 - Email: saporiecolori.b@gmail.com</p>
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
          <p>Per esercitare i suoi diritti: Email saporiecolori.b@gmail.com, Tel 06 39911640, di persona presso il punto vendita</p>
        </div>
        
        <div class="consents-section no-break">
          <h3>✅ CONSENSI ESPRESSI</h3>
          
          <div class="consent-item">
            <span class="consent-checkbox">${consentRecord.find(c => c.consent_type === 'fidelity')?.consent_given ? '✓' : '☐'}</span>
            <span>Acconsento al programma fedeltà GEMME (obbligatorio)</span>
          </div>
          
          <div class="consent-item">
            <span class="consent-checkbox">${consentRecord.find(c => c.consent_type === 'email_marketing')?.consent_given ? '✓' : '☐'}</span>
            <span>Acconsento a ricevere offerte via email</span>
          </div>
          
          <div class="consent-item">
            <span class="consent-checkbox">${consentRecord.find(c => c.consent_type === 'sms_marketing')?.consent_given ? '✓' : '☐'}</span>
            <span>Acconsento a ricevere SMS promozionali</span>
          </div>
          
          <div class="consent-item">
            <span class="consent-checkbox">${consentRecord.find(c => c.consent_type === 'profiling')?.consent_given ? '✓' : '☐'}</span>
            <span>Acconsento alla profilazione per offerte personalizzate</span>
          </div>
        </div>
        
        <!-- SEZIONE FIRMA DIGITALE -->
        <div class="signature-area no-break">
          <h3>✍️ FIRMA DIGITALE ACQUISITA</h3>
          ${signature ? 
            `<p><strong>✅ Firma digitale apposta il ${currentDate} alle ${currentTime}</strong></p>
             <div style="border: 3px solid #27ae60; border-radius: 12px; padding: 15px; background: #f8fff8; margin: 15px 0; text-align: center;">
               <img src="${signature}" alt="Firma Digitale" class="signature-image" style="border: 2px solid #27ae60; border-radius: 8px; padding: 10px; background: white; max-width: 80%; height: auto; display: block; margin: 0 auto;"/>
               <p style="margin: 10px 0 0 0; font-size: 12px; color: #27ae60; text-align: center;"><strong>Firma acquisita digitalmente e valida ai sensi dell'art. 20 DPR 445/2000</strong></p>
             </div>` :
            `<p><em>❌ Nessuna firma digitale acquisita durante la registrazione</em></p>
             <div style="border: 2px dashed #ccc; height: 80px; margin: 10px 0; background: #f8f9fa; display: flex; align-items: center; justify-content: center; color: #999; border-radius: 8px;">
               <em>Firma digitale non acquisita</em>
             </div>`
          }
        </div>
        
        <!-- SEZIONE FIRME FISICHE -->
        <div class="physical-signature-area no-break force-new-page" style="border: 3px solid #e74c3c; padding: 20px; margin: 30px 0; border-radius: 12px; background: #fef9f9;">
          <h3 style="color: #e74c3c; margin-top: 0;">✍️ FIRME FISICHE RICHIESTE</h3>
          <p style="font-weight: bold; color: #e74c3c; margin-bottom: 20px;">
            Per completare la registrazione, è necessario apporre le seguenti firme fisiche:
          </p>
          
          <!-- FIRMA CLIENTE -->
          <div style="margin-bottom: 30px; border: 2px solid #e74c3c; border-radius: 8px; padding: 15px; background: white;">
            <h4 style="color: #e74c3c; margin: 0 0 10px 0;">📝 FIRMA DEL CLIENTE</h4>
            <p style="margin: 0 0 15px 0; font-size: 14px;">
              <strong>Il sottoscritto ${customer.name}</strong>, dichiara di aver letto e compreso l'informativa privacy 
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
              <span><strong>Nome:</strong> ${customer.name}</span>
              <span><strong>Tel:</strong> ${customer.phone}</span>
              <span><strong>Data nascita:</strong> ${customer.birth_date}</span>
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
        <div class="force-new-page" style="border: 2px solid #6c757d; border-radius: 8px; padding: 15px; margin: 20px 0; background: #f8f9fa;">
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
              <strong>🆔 Cliente:</strong> ${customer.name}<br>
              <strong>📞 Telefono:</strong> ${customer.phone}<br>
              <strong>📧 Email:</strong> ${customer.email || 'Non fornita'}
            </div>
            <div>
              <strong>🎂 Data nascita:</strong> ${customer.birth_date}<br>
              <strong>🏘️ Città:</strong> ${customer.city || 'Non specificata'}<br>
              <strong>📅 Registrato:</strong> ${currentDate}
            </div>
          </div>
          
          <div style="background: white; border-radius: 8px; padding: 15px; border: 2px solid #27ae60;">
            <h4 style="color: #27ae60; margin: 0 0 10px 0;">💎 STATO PROGRAMMA FEDELTÀ</h4>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>Status:</strong> ✅ Attivo<br>
                <strong>Punti iniziali:</strong> ${customer.referred_by ? '10 gemme (bonus referral)' : '0 gemme'}<br>
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
            <strong>SAPORI & COLORI - SISTEMA FEDELTÀ GEMME</strong><br>
            <small>Modulo Privacy e Consensi - Versione ${currentDate}</small>
          </div>
        </div>
        
      </body>
      </html>
    `;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(printContent);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
  }, 1000);
};