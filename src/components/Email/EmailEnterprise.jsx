import React, { useRef, useCallback, useState } from 'react'
import EmailEditor from 'react-email-editor'
import html2canvas from 'html2canvas' // Importa html2canvas
import { emailTrackingService } from '../../services/emailTrackingService'
import { supabase } from '../../supabase'
import EmailStatsDashboard from './EmailStatsDashboard'
import CampaignManager from '../Campaigns/CampaignManager'
import './EmailEnterprise.css'

const EmailEnterprise = ({ 
  onSave, 
  onSendEmail, 
  emailSubject, 
  setEmailSubject,
  allCustomers = [],
  showNotification,
  sidebarMinimized = false,
  onLoadTemplate, // Nuovo: per caricare template
  savedTemplates = [], // Nuovo: lista template salvati
  onTemplateDeleted // Nuovo: per aggiornare la lista dopo eliminazione
}) => {
  const emailEditorRef = useRef(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showEmailConfig, setShowEmailConfig] = useState(false)
  const [emailRecipients, setEmailRecipients] = useState('all')
  const [showTemplates, setShowTemplates] = useState(false)
  const [selectedCustomers, setSelectedCustomers] = useState([])
  const [showCustomerSelector, setShowCustomerSelector] = useState(false)
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [showCampaignsModal, setShowCampaignsModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, template: null })
  const [showTemplateSaveModal, setShowTemplateSaveModal] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [templateThumbnails, setTemplateThumbnails] = useState({}) // Stato per le anteprime generate
  
  // Calcola dinamicamente le dimensioni in base allo stato sidebar
  const sidebarWidth = sidebarMinimized ? 70 : 280
  const containerStyles = {
    width: `calc(100vw - ${sidebarWidth}px)`,
    left: `${sidebarWidth}px`
  }
  
  // Funzione per calcolare hash del file con fallback
  const calculateFileHash = async (file) => {
    try {
      // Controlla se crypto.subtle è disponibile (richiede HTTPS)
      if (!window.crypto || !window.crypto.subtle) {
        throw new Error('crypto.subtle non disponibile');
      }

      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      // Usa solo i primi 16 caratteri per nome file più corto
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
    } catch (error) {
      console.warn('❌ Errore calcolo hash, uso fallback:', error);
      // Fallback: usa dimensione file + nome + timestamp ridotto per "deduplicazione" approssimativa
      const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
      return `${cleanName}_${file.size}_${Date.now().toString().slice(-6)}`;
    }
  };

  // Funzione upload personalizzato per Supabase con deduplicazione
  const customImageUpload = async (file) => {
    try {
      console.log('🚀 Inizio upload personalizzato su Supabase...');
      
      // 1. Calcola hash del file per deduplicazione
      const fileHash = await calculateFileHash(file);
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const hashFileName = `${fileHash}.${fileExtension}`;
      const bucketName = 'email-assets';

      console.log('🔍 Hash file:', fileHash);

      // 2. Controlla se il file esiste già provando a ottenere l'URL
      try {
        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(hashFileName);
          
        // Testa se il file esiste facendo una HEAD request
        const testResponse = await fetch(publicUrl, { method: 'HEAD' });
        
        if (testResponse.ok) {
          console.log('♻️ File già esistente, riutilizzo:', publicUrl);
          showNotification?.('♻️ Immagine già presente, riutilizzata!', 'info');
          return publicUrl;
        }
      } catch (error) {
        console.log('🔍 File non esistente, procedo con upload');
      }

      // 3. File nuovo, carica con nome hash
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(hashFileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        // Se il file esiste già (errore 400), riutilizzalo
        if (error.message?.includes('already exists') || error.status === 409 || error.statusCode === 409) {
          console.log('♻️ File esistente rilevato dall\'errore, riutilizzo');
          const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(hashFileName);
          showNotification?.('♻️ Immagine già presente, riutilizzata!', 'info');
          return publicUrl;
        }
        throw error;
      }

      console.log('✅ File caricato su Supabase:', data.path);

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);

      console.log('🔗 URL pubblico generato:', publicUrl);
      showNotification?.('✅ Nuova immagine caricata su Supabase!', 'success');
      
      return publicUrl;

    } catch (error) {
      console.error('❌ Errore durante l\'upload personalizzato:', error);
      showNotification?.(`Errore caricamento immagine: ${error.message}`, 'error');
      throw error;
    }
  };

  // Processa immagini locali e le carica su Supabase
  const processLocalImages = async () => {
    console.log('🔵 processLocalImages chiamata');
    
    if (!emailEditorRef.current?.editor) {
      console.log('❌ Editor non disponibile');
      showNotification?.('Editor non caricato', 'error');
      return;
    }

    console.log('✅ Editor disponibile, processing...');
    showNotification?.('🔄 Cercando immagini locali...', 'info');

    try {
      // Ottieni il design corrente
      emailEditorRef.current.editor.saveDesign(async (design) => {
        console.log('🔵 Design ottenuto:', design);
        let hasChanges = false;
        const processedUrls = new Set(); // Per evitare duplicati

        // Funzione ricorsiva per trovare e processare immagini
        const processImages = async (obj) => {
          if (!obj || typeof obj !== 'object') return;

          for (const key in obj) {
            // Cerca URL in src.url (struttura Unlayer)
            if (key === 'src' && obj[key] && typeof obj[key] === 'object' && obj[key].url) {
              const imageUrl = obj[key].url;
              console.log('🔍 Trovata immagine con URL:', imageUrl);
              
              // Rileva URL da spostare su Supabase (locali + Unlayer, escluse immagini già su Supabase)
              if ((imageUrl.startsWith('blob:') || 
                   imageUrl.startsWith('data:') || 
                   imageUrl.startsWith('file:') || 
                   imageUrl.includes('localhost') ||
                   imageUrl.includes('assets.unlayer.com')) && 
                   !imageUrl.includes('supabase.co') && // Non processare se già su Supabase
                   !processedUrls.has(imageUrl)) {
                
                processedUrls.add(imageUrl);
                
                try {
                  console.log('🔄 Processando immagine:', imageUrl);
                  showNotification?.(`🔄 Caricando immagine su Supabase...`, 'info');
                  
                  // Converte l'immagine in File
                  const file = await urlToFile(imageUrl);
                  if (file) {
                    // Carica su Supabase
                    const supabaseUrl = await customImageUpload(file);
                    
                    // Sostituisci l'URL nel design (mantieni la struttura Unlayer)
                    obj[key].url = supabaseUrl;
                    hasChanges = true;
                    
                    console.log('✅ Immagine sostituita:', imageUrl, '→', supabaseUrl);
                    showNotification?.(`✅ Immagine caricata su Supabase!`, 'success');
                  } else {
                    console.log('❌ Impossibile convertire immagine in file');
                  }
                } catch (error) {
                  console.error('❌ Errore processamento immagine:', error);
                  showNotification?.(`❌ Errore caricamento: ${error.message}`, 'error');
                }
              }
            } else if (typeof obj[key] === 'object') {
              await processImages(obj[key]);
            }
          }
        };

        // Processa tutte le immagini
        await processImages(design);

        // Se ci sono state modifiche, ricarica il design
        if (hasChanges) {
          emailEditorRef.current.editor.loadDesign(design);
          console.log('✅ Design aggiornato con immagini Supabase');
          showNotification?.('✅ Immagini caricate su Supabase!', 'success');
        } else {
          console.log('ℹ️ Nessuna immagine locale trovata da processare');
          showNotification?.('ℹ️ Nessuna immagine locale da processare', 'info');
        }
      });

    } catch (error) {
      console.error('❌ Errore nel processamento immagini:', error);
    }
  };

  // Converte URL in File object usando proxy server
  const urlToFile = async (url) => {
    try {
      console.log('🔄 Scaricando immagine tramite proxy server...');
      
      // Usa la funzione screenshot come proxy per evitare CORS
      const proxyResponse = await fetch('/api/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl: url })
      });

      if (!proxyResponse.ok) {
        throw new Error(`Proxy server error: ${proxyResponse.status}`);
      }

      const blob = await proxyResponse.blob();
      const fileName = `image_${Date.now()}.${blob.type.split('/')[1] || 'jpg'}`;
      
      return new File([blob], fileName, { type: blob.type });
    } catch (error) {
      console.error('❌ Errore conversione URL to File:', error);
      return null;
    }
  };

  // Configurazione Unlayer
  const onReady = useCallback(() => {
    const editor = emailEditorRef.current?.editor;
    if (!editor) return;

    showNotification?.('Editor email caricato!', 'success');

    // Registra il callback per l'upload personalizzato
    editor.registerCallback('image', async (file, done) => {
      try {
        const imageFile = file.attachments[0];
        if (!imageFile) {
          throw new Error('Nessun file immagine trovato.');
        }

        const publicUrl = await customImageUpload(imageFile);
        done({ progress: 100, url: publicUrl });

      } catch (error) {
        console.error('❌ Errore nel callback upload:', error);
        done({ progress: 100, url: null });
      }
    });

    // Event listener rimosso per evitare loop durante modifiche al design
    // Le immagini verranno processate solo manualmente tramite il pulsante

    // Controlla se c'è un template da caricare da sessionStorage
    const templateToLoad = sessionStorage.getItem('templateToLoad');
    if (templateToLoad) {
      try {
        const template = JSON.parse(templateToLoad);
        
        if (template.unlayer_design) {
          editor.loadDesign(template.unlayer_design);
          showNotification?.(`Template "${template.name}" caricato automaticamente!`, 'success');
        }
        
sessionStorage.removeItem('templateToLoad');
      } catch (error) {
        sessionStorage.removeItem('templateToLoad');
      }
    }
  }, [showNotification]);

  // Salva design come template
  const handleSave = useCallback(() => {
    if (!emailEditorRef.current) return
    
    // Reset del form e apertura modale
    setTemplateName('')
    setTemplateDescription('')
    setShowTemplateSaveModal(true)
  }, [])
  
  // Conferma salvataggio template
  const handleConfirmTemplateSave = useCallback(() => {
    if (!emailEditorRef.current || !templateName.trim()) return
    
    setIsLoading(true)
    try {
      // Salva sia design JSON che HTML
      emailEditorRef.current.editor.saveDesign((design) => {
        emailEditorRef.current.editor.exportHtml(async (data) => {
          try {
            // Genera screenshot con Machine
            const thumbnailUrl = await generateScreenshot(data.html)
            
            const templateData = {
              name: templateName.trim(),
              description: templateDescription.trim(),
              unlayer_design: design, // Design Unlayer (per modificare) - CORRETTO!
              html_preview: data.html, // HTML per anteprima - CORRETTO!
              thumbnail_url: thumbnailUrl, // Screenshot da Machine
              category: 'custom',
              created_at: new Date().toISOString()
            }
            
            
            onSave?.(templateData)
            showNotification?.(`Template "${templateName}" salvato con anteprima!`, 'success')
            
          } catch (error) {
            console.warn('⚠️ Errore screenshot, salvo senza:', error)
            
            const templateData = {
              name: templateName.trim(),
              description: templateDescription.trim(),
              unlayer_design: design, // CORRETTO!
              html_preview: data.html, // CORRETTO!
              thumbnail_url: null,
              category: 'custom',
              created_at: new Date().toISOString()
            }
            
            onSave?.(templateData)
            showNotification?.(`Template "${templateName}" salvato!`, 'success')
          } finally {
            setIsLoading(false)
            setShowTemplateSaveModal(false)
          }
        })
      })
    } catch (error) {
      showNotification?.('Errore salvataggio template', 'error')
      setIsLoading(false)
    }
  }, [templateName, templateDescription, onSave, showNotification])

  // Genera screenshot con html2canvas
  const generateScreenshot = async (html) => {
    try {
      
      // 1. Crea un contenitore nascosto per il rendering
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '-9999px';
      container.style.left = '0';
      container.style.width = '600px'; // Larghezza standard email
      container.style.height = '800px';
      document.body.appendChild(container);

      // 2. Inserisci l'HTML del template
      container.innerHTML = html;

      // 3. Aspetta che le immagini interne si carichino (se presenti)
      const images = Array.from(container.getElementsByTagName('img'));
      const promises = images.map(img => new Promise(resolve => {
        if (img.complete) return resolve();
        img.onload = resolve;
        img.onerror = resolve; // Risolvi anche in caso di errore per non bloccare tutto
      }));
      await Promise.all(promises);
      
      // 4. Genera il canvas
      const canvas = await html2canvas(container, {
        useCORS: true, // Per immagini da altre origini
        allowTaint: true,
        width: 600,
        height: 800,
        scale: 1
      });

      // 5. Rimuovi il contenitore
      document.body.removeChild(container);

      // 6. Converte il canvas in un URL dati (immagine JPEG di qualità media)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      return dataUrl;

    } catch (error) {
      // Fallback in caso di errore
      return `https://via.placeholder.com/600x800/8B4513/ffffff?text=${encodeURIComponent('Errore Anteprima')}`;
    }
  }

  // Rigenera anteprime per template senza thumbnail_url
  const regenerateThumbnails = async () => {
    try {
      const templatesNeedingThumbnails = savedTemplates.filter(t => !t.thumbnail_url && t.html_preview)
      
      for (const template of templatesNeedingThumbnails) {
        try {
          const thumbnailUrl = await generateScreenshot(template.html_preview)
          
          // Aggiorna il template nel database
          const updatedTemplate = { ...template, thumbnail_url: thumbnailUrl }
          onSave?.(updatedTemplate) // Questo dovrebbe aggiornare il template esistente
          
        } catch (error) {
        }
      }
      
      showNotification?.('Anteprime rigenerate!', 'success')
      
    } catch (error) {
      showNotification?.('Errore rigenerazione anteprime', 'error')
    }
  }

  // Pulisce template duplicati (mantiene solo il più recente per nome)
  const cleanDuplicateTemplates = async () => {
    try {
      
      if (!savedTemplates || savedTemplates.length === 0) {
        alert('Nessun template da pulire')
        return
      }

      // Raggruppa per nome e trova duplicati
      const templatesByName = savedTemplates.reduce((acc, template) => {
        if (!acc[template.name]) {
          acc[template.name] = []
        }
        acc[template.name].push(template)
        return acc
      }, {})

      const duplicates = []
      const toKeep = []

      Object.entries(templatesByName).forEach(([name, templates]) => {
        if (templates.length > 1) {
          // Ordina per data creazione (più recente prima)
          templates.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          toKeep.push(templates[0]) // Mantieni il più recente
          duplicates.push(...templates.slice(1)) // Elimina gli altri
        } else {
          toKeep.push(templates[0])
        }
      })

      
      if (duplicates.length === 0) {
        alert('✅ Nessun duplicato trovato!')
        return
      }

      const confirmDelete = confirm(`Eliminare ${duplicates.length} template duplicati? (Mantieni ${toKeep.length})`)
      if (!confirmDelete) return

      
      // Elimina i duplicati dal database
      const idsToDelete = duplicates.map(t => t.id)
      
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .in('id', idsToDelete)

      if (error) {
        alert('❌ Errore eliminazione dal database')
        return
      }

      
      // Aggiorna la lista locale (rimuovi i duplicati eliminati)
      showNotification?.(`✅ Eliminati ${duplicates.length} duplicati!`, 'success')
      
      // Ricarica i template per aggiornare la UI
      window.location.reload() // Modo rapido per aggiornare tutto
      
    } catch (error) {
      alert('❌ Errore durante la pulizia')
    }
  }

  // Elimina template corrotti (senza unlayer_design)
  const deleteCorruptedTemplates = async () => {
    try {
      const corruptedTemplates = savedTemplates.filter(t => !t.unlayer_design)
      
      if (corruptedTemplates.length === 0) {
        alert('✅ Nessun template corrotto trovato!')
        return
      }
      
      const confirmDelete = confirm(`Eliminare ${corruptedTemplates.length} template corrotti? (Non hanno design utilizzabile)`)
      if (!confirmDelete) return
      
      
      const idsToDelete = corruptedTemplates.map(t => t.id)
      
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .in('id', idsToDelete)
        
      if (error) {
        alert('❌ Errore eliminazione dal database')
        return
      }
      
      showNotification?.(`✅ Eliminati ${corruptedTemplates.length} template corrotti!`, 'success')
      
      // Ricarica la pagina
      window.location.reload()
      
    } catch (error) {
      alert('❌ Errore durante l\'eliminazione')
    }
  }

  // Invia email
  const handleSendEmail = useCallback(async () => {
    if (!emailSubject?.trim()) {
      showNotification?.('Inserisci l\'oggetto dell\'email', 'error')
      return
    }

    if (!emailEditorRef.current) {
      showNotification?.('Editor non caricato correttamente', 'error')
      return
    }

    setIsLoading(true)
    try {
      
      // Proviamo con il metodo corretto di react-email-editor
      emailEditorRef.current.editor.exportHtml((data) => {
        
        if (!data.html || data.html.trim().length === 0) {
          throw new Error('HTML vuoto generato da Unlayer')
        }
        
        
        // Determina destinatari in base alla selezione
        let recipients = []
        if (emailRecipients === 'custom') {
          recipients = selectedCustomers // Array di ID clienti selezionati
        } else if (emailRecipients !== 'all') {
          recipients = [emailRecipients] // Segmento specifico
        }
        
        // Determina destinatari per tracking
        let targetCustomers = []
        if (emailRecipients === 'custom') {
          targetCustomers = allCustomers.filter(c => selectedCustomers.includes(c.id))
        } else if (emailRecipients !== 'all') {
          const segmentCustomers = segments[emailRecipients] || []
          targetCustomers = segmentCustomers
        } else {
          targetCustomers = allCustomers
        }


        // Invio asincrono con tracking
        onSendEmail?.({
          subject: emailSubject,
          content: data.html,
          template: 'unlayer',
          segments: recipients,
          customCustomers: emailRecipients === 'custom' ? selectedCustomers : undefined,
          enableTracking: true,
          targetCustomers: targetCustomers
        }).then(() => {
          setShowEmailConfig(false)
          showNotification?.('Email inviata con successo!', 'success')
          setIsLoading(false)
        }).catch((sendError) => {
          showNotification?.('Errore invio email: ' + sendError.message, 'error')
          setIsLoading(false)
        })
      })
    } catch (error) {
      showNotification?.('Errore invio email: ' + error.message, 'error')
      setIsLoading(false)
    }
  }, [emailSubject, emailRecipients, onSendEmail, showNotification])

  // Anteprima
  const handlePreview = useCallback(() => {
    if (!emailEditorRef.current) return
    
    try {
      emailEditorRef.current.editor.exportHtml((data) => {
        // Apri anteprima in nuova finestra
        const previewWindow = window.open('', '_blank')
        previewWindow.document.write(data.html)
        previewWindow.document.close()
      })
    } catch (error) {
      showNotification?.('Errore caricamento anteprima', 'error')
    }
  }, [showNotification])

  // Carica template in Unlayer
  const handleLoadTemplate = useCallback((template) => {
    // Controlla se c'è un design valido (può essere in design o unlayer_design)
    const designData = template.design || template.unlayer_design
    if (!designData) {
      showNotification?.('Template non valido: manca il design', 'error')
      return
    }
    
    // Verifica che l'editor sia completamente pronto
    if (!emailEditorRef.current || !emailEditorRef.current.editor) {
      setTimeout(() => handleLoadTemplate(template), 1000)
      return
    }
    
    try {
      
      emailEditorRef.current.editor.loadDesign(designData)
      showNotification?.(`Template "${template.name}" caricato!`, 'success')
      setShowTemplates(false)
    } catch (error) {
      showNotification?.('Errore caricamento template: ' + error.message, 'error')
    }
  }, [showNotification])

  // Elimina un singolo template
  const handleDeleteTemplate = async (templateId, templateName) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', templateId);

      if (error) {
        throw error;
      }


      showNotification?.(`Template "${templateName}" eliminato con successo!`, 'success');
      onTemplateDeleted?.(templateId); // Notifica al componente genitore di aggiornare la lista

    } catch (error) {
      showNotification?.(`Errore durante l'eliminazione: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Funzioni per segmentazione avanzata
  const getCustomerSegments = useCallback(() => {
    if (!allCustomers.length) return {}

    const now = new Date()
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

    return {
      all: allCustomers,
      
      // Segmentazione per livello/gemme
      bronze: allCustomers.filter(c => c.points < 100),
      silver: allCustomers.filter(c => c.points >= 100 && c.points < 300), 
      gold: allCustomers.filter(c => c.points >= 300 && c.points < 500),
      platinum: allCustomers.filter(c => c.points >= 500),
      
      // Segmentazione per spesa (assumendo campo totalSpent)
      lowSpenders: allCustomers.filter(c => (c.totalSpent || 0) < 50),
      mediumSpenders: allCustomers.filter(c => (c.totalSpent || 0) >= 50 && (c.totalSpent || 0) < 200),
      highSpenders: allCustomers.filter(c => (c.totalSpent || 0) >= 200),
      
      // Segmentazione temporale
      newCustomers: allCustomers.filter(c => {
        const createdAt = new Date(c.created_at || c.createdAt)
        return createdAt >= thirtyDaysAgo
      }),
      activeCustomers: allCustomers.filter(c => {
        const lastPurchase = new Date(c.last_purchase || c.lastPurchase || c.created_at)
        return lastPurchase >= sixtyDaysAgo
      }),
      dormantCustomers: allCustomers.filter(c => {
        const lastPurchase = new Date(c.last_purchase || c.lastPurchase || c.created_at)
        return lastPurchase < sixtyDaysAgo
      }),
      historicalCustomers: allCustomers.filter(c => {
        const createdAt = new Date(c.created_at || c.createdAt)
        return createdAt < oneYearAgo
      })
    }
  }, [allCustomers])

  const segments = getCustomerSegments()

  // Effetto per generare anteprime mancanti quando si apre la modale
  React.useEffect(() => {
    if (showTemplates) {
      const generateMissingThumbnails = async () => {
        let updated = false;
        const newThumbnails = {};

        for (const template of savedTemplates) {
          if (!template.thumbnail_url && !templateThumbnails[template.id] && template.html_preview) {
            try {
              const thumb = await generateScreenshot(template.html_preview);
              newThumbnails[template.id] = thumb;
              
              // Persisti l'URL nel database
              onSave?.({ ...template, thumbnail_url: thumb });
              updated = true;

            } catch (e) {
            }
          }
        }
        
        if (Object.keys(newThumbnails).length > 0) {
          setTemplateThumbnails(prev => ({ ...prev, ...newThumbnails }));
        }

        if (updated) {
          showNotification?.('Anteprime mancanti sono state generate e salvate!', 'info');
        }
      };
      generateMissingThumbnails();
    }
  }, [showTemplates, savedTemplates]); // Rimosso templateThumbnails per evitare loop

  // Filtra clienti per ricerca manuale
  const filteredCustomers = allCustomers.filter(customer => {
    if (!customerSearchTerm) return true
    
    const searchLower = customerSearchTerm.toLowerCase()
    return (
      customer.name?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="email-builder-unlayer" style={containerStyles}>
      {/* Header Toolbar */}
      <div className="unlayer-toolbar">
        <div className="toolbar-left">
          <h1>🚀 Email Enterprise</h1>
          <span className="powered-by">Professional Email Builder</span>
        </div>
        
        <div className="toolbar-actions">
          <button 
            className="btn-templates" 
            onClick={() => setShowTemplates(!showTemplates)}
          >
            🎨 Template
          </button>
          
          <button 
            className="btn-preview" 
            onClick={handlePreview}
            disabled={isLoading}
          >
            👁️ Anteprima
          </button>
          
          <button 
            className="btn-upload-images" 
            onClick={() => {
              console.log('🔵 Pulsante Carica Immagini cliccato');
              processLocalImages();
            }}
            disabled={isLoading}
            title="Carica immagini locali su Supabase"
          >
            📤 Carica Immagini
          </button>
          
          <button 
            className="btn-save" 
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? '⏳ Salvando...' : '💾 Salva'}
          </button>
          
          <button 
            className="btn-config" 
            onClick={() => setShowEmailConfig(!showEmailConfig)}
          >
            📤 Configura & Invia
          </button>
          
          <button 
            className="btn-campaigns" 
            onClick={() => setShowCampaignsModal(true)}
          >
            🚀 Campagne
          </button>
          
          <button 
            className="btn-stats" 
            onClick={() => setShowStatsModal(true)}
          >
            📊 Statistiche
          </button>
        </div>
      </div>

      {/* Modale Template */}
      {showTemplates && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={() => setShowTemplates(false)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '16px',
              width: '90vw',
              height: '80vh',
              maxWidth: '1200px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header modale */}
            <div style={{
              background: 'linear-gradient(135deg, #8B4513 0%, #D4AF37 100%)',
              color: 'white',
              padding: '20px 30px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{margin: 0, fontSize: '24px', fontWeight: '700'}}>🎨 I Tuoi Template</h2>
              <button 
                onClick={() => setShowTemplates(false)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  fontSize: '20px',
                  cursor: 'pointer'
                }}
              >×</button>
            </div>
            
            {/* Contenuto modale */}
            <div 
              style={{
                flex: 1,
                padding: '30px',
                overflowY: 'auto',
                background: '#f8f9fa'
              }}
            >
            
            
            {!savedTemplates || savedTemplates.length === 0 ? (
              <div className="no-templates" style={{textAlign: 'center', padding: '40px 20px', color: '#6c757d'}}>
                <p style={{margin: '10px 0', fontSize: '16px'}}>Nessun template salvato ancora.</p>
                <p style={{margin: '10px 0', fontSize: '14px'}}>Crea il tuo primo design e clicca "💾 Salva"!</p>
                <div style={{marginTop: '20px', fontSize: '12px', opacity: '0.7'}}>
                  Debug: {savedTemplates ? `Array vuoto (${savedTemplates.length})` : 'savedTemplates è null/undefined'}
                </div>
              </div>
            ) : (
              <div 
                className="templates-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '24px',
                  maxHeight: '600px',
                  overflowY: 'auto',
                  padding: '15px 8px 15px 0'
                }}
              >
                {savedTemplates.map((template, index) => (
                  <div 
                    key={index} 
                    className="template-card"
                    onClick={() => handleLoadTemplate(template)}
                  >
                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteConfirm({ show: true, template })
                      }}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'rgba(220, 53, 69, 0.9)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        fontSize: '16px',
                        cursor: 'pointer',
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      title="Elimina template"
                    >
                      ×
                    </button>
                    
                    {/* Template Preview - Full Card */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '250px',
                      overflow: 'hidden'
                    }}>
                      {(template.thumbnail_url || templateThumbnails[template.id]) ? (
                        <img 
                          src={template.thumbnail_url || templateThumbnails[template.id]} 
                          alt={`Preview ${template.name}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: 'top center'
                          }}
                        />
                      ) : (
                        <div 
                          style={{
                            background: 'linear-gradient(135deg, #8B4513 0%, #D4AF37 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '48px',
                            height: '100%'
                          }}
                        >
                          📧
                        </div>
                      )}
                    </div>
                    
                    {/* Template Info */}
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      width: '100%',
                      height: '100px',
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,249,250,0.98) 100%)',
                      borderTop: '1px solid rgba(139, 69, 19, 0.08)',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      backdropFilter: 'blur(10px)'
                    }}>
                      <div>
                        <h4 style={{
                          color: '#333',
                          fontSize: '14px',
                          fontWeight: '600',
                          margin: '0 0 4px 0',
                          lineHeight: '1.2',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis'
                        }}>
                          {template.name || 'Template Personalizzato'}
                        </h4>
                        <small style={{
                          color: '#6c757d',
                          fontSize: '11px',
                          margin: 0
                        }}>
                          {template.created_at ? new Date(template.created_at).toLocaleDateString('it-IT') : 'Recente'}
                        </small>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleLoadTemplate(template)
                          setShowTemplates(false)
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #8B4513 0%, #D4AF37 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 8px rgba(139, 69, 19, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)'
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 69, 19, 0.4)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(139, 69, 19, 0.3)'
                        }}
                      >
                        🚀 Carica Template
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* Pannello configurazione email */}
      {showEmailConfig && (
        <div className="email-config-panel">
          <div className="config-content">
            <h3>⚙️ Configurazione Email</h3>
            
            <div className="config-row">
              <label>📝 Oggetto Email:</label>
              <input
                type="text"
                value={emailSubject || ''}
                onChange={(e) => setEmailSubject?.(e.target.value)}
                placeholder="Inserisci l'oggetto dell'email"
                className="config-input"
              />
            </div>
            
            <div className="config-row">
              <label>👥 Destinatari:</label>
              <select
                value={emailRecipients}
                onChange={(e) => setEmailRecipients(e.target.value)}
                className="config-select"
              >
                <optgroup label="📊 Tutti">
                  <option value="all">Tutti i clienti ({segments.all?.length || 0})</option>
                </optgroup>
                
                <optgroup label="💎 Per Livello Gemme">
                  <option value="bronze">🥉 Bronze - meno di 100 gemme ({segments.bronze?.length || 0})</option>
                  <option value="silver">🥈 Silver - 100-299 gemme ({segments.silver?.length || 0})</option>
                  <option value="gold">🥇 Gold - 300-499 gemme ({segments.gold?.length || 0})</option>
                  <option value="platinum">💎 Platinum - 500+ gemme ({segments.platinum?.length || 0})</option>
                </optgroup>
                
                <optgroup label="💰 Per Spesa">
                  <option value="lowSpenders">💸 Spesa Bassa - meno di 50€ ({segments.lowSpenders?.length || 0})</option>
                  <option value="mediumSpenders">💵 Spesa Media - 50-200€ ({segments.mediumSpenders?.length || 0})</option>
                  <option value="highSpenders">💎 Spesa Alta - oltre 200€ ({segments.highSpenders?.length || 0})</option>
                </optgroup>
                
                <optgroup label="📅 Per Attività">
                  <option value="newCustomers">🆕 Nuovi - ultimi 30gg ({segments.newCustomers?.length || 0})</option>
                  <option value="activeCustomers">✅ Attivi - acquisto &lt; 60gg ({segments.activeCustomers?.length || 0})</option>
                  <option value="dormantCustomers">😴 Dormienti - nessun acquisto &gt; 60gg ({segments.dormantCustomers?.length || 0})</option>
                  <option value="historicalCustomers">🏛️ Storici - oltre 1 anno ({segments.historicalCustomers?.length || 0})</option>
                </optgroup>
                
                <optgroup label="👤 Personalizzato">
                  <option value="custom">🎯 Selezione Manuale</option>
                </optgroup>
              </select>
            </div>
            
            {emailRecipients === 'custom' && (
              <div className="config-row">
                <button 
                  className="btn-select-customers"
                  onClick={() => setShowCustomerSelector(!showCustomerSelector)}
                >
                  {showCustomerSelector ? 'Chiudi Selezione' : `Seleziona Clienti (${selectedCustomers.length} selezionati)`}
                </button>
              </div>
            )}
            
            <div className="config-actions">
              <button 
                className="btn-send" 
                onClick={handleSendEmail}
                disabled={isLoading || !emailSubject?.trim()}
              >
                {isLoading ? '📤 Invio...' : '🚀 Invia Email'}
              </button>
              <button 
                className="btn-cancel" 
                onClick={() => setShowEmailConfig(false)}
              >
                ❌ Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pannello Selezione Clienti */}
      {showCustomerSelector && emailRecipients === 'custom' && (
        <div 
          className="customer-selector-modal" 
          onClick={() => setShowCustomerSelector(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(5px)'
          }}>
          <div 
            className="customer-selector-content" 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '30px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              position: 'relative'
            }}>
            <button
              onClick={() => setShowCustomerSelector(false)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6c757d',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
            <h3 style={{marginTop: 0, color: '#8B4513'}}>👥 Selezione Manuale Clienti</h3>
            <div className="customer-search">
              <input
                type="text"
                value={customerSearchTerm}
                onChange={(e) => setCustomerSearchTerm(e.target.value)}
                placeholder="🔍 Cerca cliente per nome o email..."
                className="customer-search-input"
              />
            </div>
            
            <div className="customer-stats">
              <span>Clienti selezionati: <strong>{selectedCustomers.length}</strong> di <strong>{filteredCustomers.length}</strong> ({allCustomers.length} totali)</span>
            </div>
            
            <div className="customer-actions">
              <button 
                className="btn-select-all"
                onClick={() => setSelectedCustomers(prev => [
                  ...new Set([...prev, ...filteredCustomers.map(c => c.id)])
                ])}
              >
                Seleziona Filtrati
              </button>
              <button 
                className="btn-deselect-all"
                onClick={() => setSelectedCustomers([])}
              >
                Deseleziona Tutti
              </button>
            </div>
            
            <div className="customers-list">
              {filteredCustomers.length === 0 && customerSearchTerm ? (
                <div className="customer-item" style={{justifyContent: 'center', fontStyle: 'italic', color: '#6c757d'}}>
                  Nessun cliente trovato per "{customerSearchTerm}"
                </div>
              ) : (
                filteredCustomers.map(customer => (
                <div key={customer.id} className="customer-item">
                  <input
                    type="checkbox"
                    checked={selectedCustomers.includes(customer.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCustomers(prev => [...prev, customer.id])
                      } else {
                        setSelectedCustomers(prev => prev.filter(id => id !== customer.id))
                      }
                    }}
                  />
                  <div className="customer-info">
                    <strong>{customer.name}</strong>
                    <small>{customer.email} • {customer.points} 💎</small>
                  </div>
                </div>
                ))
              )}
            </div>
            
            <div style={{
              marginTop: '20px',
              paddingTop: '20px',
              borderTop: '1px solid #e9ecef',
              textAlign: 'center'
            }}>
              <button
                onClick={() => setShowCustomerSelector(false)}
                style={{
                  background: 'linear-gradient(135deg, #8B4513 0%, #D4AF37 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 30px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ✅ Conferma Selezione ({selectedCustomers.length} clienti)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Unlayer */}
      <div className="unlayer-container">
        <EmailEditor
          ref={emailEditorRef}
          onReady={onReady}
          options={{
            displayMode: 'email',
            locale: 'it-IT',
            appearance: {
              theme: 'light',
              panels: {
                tools: {
                  dock: 'left'
                }
              }
            },
            features: {
              preview: true,
              imageEditor: true,
              stockImages: false
            },
            safeHtml: true,
            customJS: [
              "https://assets.unlayer.com/plugins/file-upload.js"
            ],
            tools: {
              text: { enabled: true },
              image: { enabled: true }, 
              button: { enabled: true },
              heading: { enabled: true },
              html: { enabled: true },
              divider: { enabled: true },
              columns: { enabled: true },
              video: { enabled: true },
              social: { enabled: true }
            },
            editor: {
              minRows: 1,
              maxRows: 25
            }
          }}
          style={{ 
            height: 'calc(100vh - 140px)',
            width: '100%'
          }}
        />
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>⏳ Elaborazione in corso...</p>
          </div>
        </div>
      )}

      {/* Modale Statistiche */}
      {showStatsModal && (
        <div 
          className="stats-modal-overlay"
          onClick={() => setShowStatsModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
            backdropFilter: 'blur(5px)'
          }}
        >
          <div 
            className="stats-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '16px',
              width: '95%',
              maxWidth: '1200px',
              height: '90vh',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              position: 'relative'
            }}
          >
            <button
              onClick={() => setShowStatsModal(false)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6c757d',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}
            >
              ✕
            </button>
            <div style={{ height: '100%', overflow: 'auto' }}>
              <EmailStatsDashboard />
            </div>
          </div>
        </div>
      )}

      {/* Modale Campagne */}
      {showCampaignsModal && (
        <div 
          className="campaigns-modal-overlay"
          onClick={() => setShowCampaignsModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10002,
            backdropFilter: 'blur(5px)'
          }}
        >
          <div 
            className="campaigns-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '16px',
              width: '98%',
              maxWidth: '1400px',
              height: '95vh',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              position: 'relative'
            }}
          >
            <button
              onClick={() => setShowCampaignsModal(false)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6c757d',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}
            >
              ✕
            </button>
            <div style={{ height: '100%', overflow: 'auto' }}>
              <CampaignManager showNotification={showNotification} />
            </div>
          </div>
        </div>
      )}
      
      {/* Template Save Modal */}
      {showTemplateSaveModal && (
        <div 
          className="modal-overlay"
          onClick={() => setShowTemplateSaveModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(5px)'
          }}
        >
          <div 
            className="template-save-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '16px',
              width: '90%',
              maxWidth: '500px',
              padding: '30px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              position: 'relative'
            }}
          >
            <button
              onClick={() => setShowTemplateSaveModal(false)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#6c757d',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
            
            <h3 style={{
              margin: '0 0 25px 0',
              color: '#8B4513',
              fontSize: '24px',
              fontWeight: '700'
            }}>
              💾 Salva Template
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#495057'
              }}>
                Nome Template *
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Es: Newsletter Natale 2024"
                style={{
                  width: '100%',
                  padding: '12px 15px',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  fontSize: '14px',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#8B4513'}
                onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
              />
            </div>
            
            <div style={{ marginBottom: '30px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#495057'
              }}>
                Descrizione (opzionale)
              </label>
              <textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Breve descrizione del template..."
                rows="3"
                style={{
                  width: '100%',
                  padding: '12px 15px',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  fontSize: '14px',
                  transition: 'border-color 0.2s ease',
                  resize: 'vertical'
                }}
                onFocus={(e) => e.target.style.borderColor = '#8B4513'}
                onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
              />
            </div>
            
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowTemplateSaveModal(false)}
                style={{
                  padding: '12px 24px',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  background: 'white',
                  color: '#6c757d',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#f8f9fa'
                  e.target.style.borderColor = '#d6d9dc'
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'white'
                  e.target.style.borderColor = '#e9ecef'
                }}
              >
                Annulla
              </button>
              
              <button
                onClick={handleConfirmTemplateSave}
                disabled={!templateName.trim() || isLoading}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  background: templateName.trim() && !isLoading ? 
                    'linear-gradient(135deg, #8B4513 0%, #D4AF37 100%)' : '#6c757d',
                  color: 'white',
                  fontWeight: '600',
                  cursor: templateName.trim() && !isLoading ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s ease',
                  opacity: isLoading ? 0.7 : 1
                }}
                onMouseOver={(e) => {
                  if (templateName.trim() && !isLoading) {
                    e.target.style.transform = 'translateY(-2px)'
                    e.target.style.boxShadow = '0 6px 20px rgba(139, 69, 19, 0.3)'
                  }
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = 'none'
                }}
              >
                {isLoading ? '💾 Salvataggio...' : '💾 Salva Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Popup */}
      {deleteConfirm.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '40px',
            minWidth: '400px',
            maxWidth: '500px',
            textAlign: 'center',
            boxShadow: '0 25px 80px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.2)',
            animation: 'popupIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            <div style={{
              fontSize: '64px',
              marginBottom: '24px',
              color: '#dc3545'
            }}>
              🗑️
            </div>
            <h3 style={{
              color: '#333',
              fontSize: '24px',
              fontWeight: '700',
              marginBottom: '16px',
              margin: 0
            }}>
              Elimina Template
            </h3>
            <p style={{
              color: '#666',
              fontSize: '16px',
              lineHeight: '1.5',
              marginBottom: '32px',
              margin: '16px 0 32px 0'
            }}>
              Sei sicuro di voler eliminare il template<br />
              <strong>"{deleteConfirm.template?.name}"</strong>?<br />
              Questa azione non può essere annullata.
            </p>
            <div style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => setDeleteConfirm({ show: false, template: null })}
                style={{
                  background: '#f8f9fa',
                  color: '#666',
                  border: '2px solid #e9ecef',
                  padding: '14px 28px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  minWidth: '120px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e9ecef'
                  e.currentTarget.style.borderColor = '#dee2e6'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f8f9fa'
                  e.currentTarget.style.borderColor = '#e9ecef'
                }}
              >
                Annulla
              </button>
              <button
                onClick={async () => {
                  try {
                    await handleDeleteTemplate(deleteConfirm.template.id, deleteConfirm.template.name)
                    setDeleteConfirm({ show: false, template: null })
                  } catch (error) {
                    showNotification?.('Errore durante l\'eliminazione', 'error')
                  }
                }}
                style={{
                  background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '14px 28px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  minWidth: '120px',
                  boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(220, 53, 69, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.3)'
                }}
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmailEnterprise