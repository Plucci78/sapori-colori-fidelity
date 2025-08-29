import { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  addEdge,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import { 
  Users, Filter, Check, X, Play, Pause, HelpCircle, Lightbulb, BookOpen,
  Save, FolderOpen, Plus, Undo, Redo, ZoomIn, ZoomOut, Eye, Share2,
  Mail, MessageSquare, Bell, Tag, Target, GitBranch, Clock, Repeat,
  Smartphone, Globe, Database, Zap
} from 'lucide-react';
import { supabase } from '../supabase';
import { emailAutomationService } from '../services/emailAutomation';
import { automaticTemplates } from '../components/Email/emailTemplates';
import { notificationWorkflowService } from '../services/notificationWorkflowService';
import { notificationScheduler } from '../services/notificationScheduler';

import 'reactflow/dist/style.css';
import './FlowEditor.css';
import './footer.css';
import './sidebar.css';
import './components-sidebar.css';

const initialNodes = [
  {
    id: '1',
    type: 'input',
    data: { 
      label: '⏰ Controllo Settimanale',
      nodeType: 'trigger',
      realTrigger: 'weekly_schedule',
      description: 'Trigger: Si attiva ogni settimana (es. Lunedì alle 9:00)'
    },
    position: { x: 300, y: 80 },
    style: {
      background: '#6366f1',
      color: 'white',
      border: '2px solid #4f46e5',
      borderRadius: '10px',
      padding: '12px',
      minWidth: '200px',
      textAlign: 'center'
    }
  },
  {
    id: '2',
    data: { 
      label: '📱 Push Notification',
      nodeType: 'notification',
      description: 'Invia notifica push al team/clienti'
    },
    position: { x: 300, y: 200 },
    style: {
      background: '#10b981',
      color: 'white',
      border: '2px solid #059669',
      borderRadius: '10px',
      padding: '12px',
      minWidth: '200px',
      textAlign: 'center'
    }
  }
];

const initialEdges = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#8B4513', strokeWidth: 2 }
  }
];

const FlowEditor = () => {
  // States esistenti
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isFlowRunning, setIsFlowRunning] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [notification, setNotification] = useState(null);
  const [simulationActive, setSimulationActive] = useState(false);
  const [currentSimulationStep, setCurrentSimulationStep] = useState(0);
  const [simulationLog, setSimulationLog] = useState([]);
  const [currentWorkflow, setCurrentWorkflow] = useState({ id: null, name: 'Workflow Senza Titolo', saved: false });
  const [savedWorkflows, setSavedWorkflows] = useState([]);
  const [showWorkflowManager, setShowWorkflowManager] = useState(false);
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [nodeSettings, setNodeSettings] = useState({});
  const [sidebarVisible, setSidebarVisible] = useState(true); // Stato visibilità sidebar
  
  // Nuove funzioni per gestire i pulsanti header
  const createNewWorkflow = () => {
    setNodes([]);
    setEdges([]);
    setCurrentWorkflow({ id: null, name: 'Nuovo Workflow', saved: false });
    setSelectedNode(null);
    showNotification({
      type: 'info',
      title: 'Nuovo workflow',
      message: 'Nuovo workflow creato. Inizia trascinando i componenti nell\'area di lavoro.'
    });
  };
  
  const loadWorkflow = async (workflowId) => {
    try {
      let workflow;
      
      if (savedWorkflows.length > 0) {
        workflow = savedWorkflows.find(w => w.id === workflowId);
      }
      
      if (workflow) {
        setNodes(typeof workflow.nodes === 'string' ? JSON.parse(workflow.nodes) : workflow.nodes);
        setEdges(typeof workflow.edges === 'string' ? JSON.parse(workflow.edges) : workflow.edges);
        setCurrentWorkflow({ id: workflow.id, name: workflow.name, saved: true });
        
        showNotification({
          type: 'success',
          title: 'Workflow caricato',
          message: `Workflow "${workflow.name}" caricato correttamente.`
        });
      }
    } catch (error) {
      console.error('Errore caricamento workflow:', error);
      showNotification({
        type: 'error',
        title: 'Errore',
        message: 'Impossibile caricare il workflow.'
      });
    }
  };
  
  const testWorkflow = async () => {
    if (nodes.length === 0) {
      showNotification({
        type: 'warning',
        title: 'Workflow vuoto',
        message: 'Aggiungi almeno un componente per testare il workflow.'
      });
      return;
    }
    
    setSimulationActive(true);
    setSimulationLog([]);
    setCurrentSimulationStep(0);
    
    // Simula esecuzione workflow
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      setCurrentSimulationStep(i + 1);
      
      setSimulationLog(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        nodeId: node.id,
        nodeName: node.data.label,
        action: `Esecuzione ${node.data.nodeType || 'azione'}`,
        result: 'completato'
      }]);
      
      // Pausa per effetto visivo
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setSimulationActive(false);
    showNotification({
      type: 'success',
      title: 'Test completato',
      message: `Test del workflow completato. Elaborati ${nodes.length} nodi.`
    });
  };

  // Carica workflows salvati
  useEffect(() => {
    loadSavedWorkflows();
    initializeEmailService();
  }, []);

  const initializeEmailService = async () => {
    try {
      await emailAutomationService.init();
      console.log('📧 Servizio email inizializzato');
    } catch (error) {
      console.error('Errore inizializzazione email:', error);
    }
  };

  const loadSavedWorkflows = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_workflows')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      setSavedWorkflows(data || []);
    } catch (error) {
      console.warn('Tabella notification_workflows non trovata, uso localStorage:', error);
      const saved = JSON.parse(localStorage.getItem('notification_workflows') || '[]');
      setSavedWorkflows(saved);
    }
  };

  // Funzioni esistenti
  const onConnect = useCallback((connection) => {
    const newEdge = {
      id: `${connection.source}-${connection.target}`,
      ...connection,
      type: 'smoothstep',
    };
    setEdges((eds) => addEdge(newEdge, eds));
    setCurrentWorkflow(prev => ({ ...prev, saved: false }));
  }, [setEdges]);

  const getNodeStyle = (nodeType) => {
    const styles = {
      trigger: { background: '#4f46e5', color: 'white', border: '2px solid #312e81' },
      email: { background: '#059669', color: 'white', border: '2px solid #047857' },
      sms: { background: '#3b82f6', color: 'white', border: '2px solid #1d4ed8' },
      whatsapp: { background: '#22c55e', color: 'white', border: '2px solid #16a34a' },
      push: { background: '#f59e0b', color: 'white', border: '2px solid #d97706' },
      condition: { background: '#8b5cf6', color: 'white', border: '2px solid #7c3aed' },
      delay: { background: '#f59e0b', color: 'white', border: '2px solid #d97706' },
      action: { background: '#ef4444', color: 'white', border: '2px solid #dc2626' },
      default: { background: '#6b7280', color: 'white', border: '2px solid #4b5563' }
    };
    return {
      ...styles[nodeType] || styles.default,
      borderRadius: '10px',
      padding: '12px',
      minWidth: '200px',
      textAlign: 'center'
    };
  };

  const addNode = useCallback((type, subType = null) => {
    const nodeTypes = {
      notification: '📱 Push Notification',
      tag: '🏷️ Aggiungi Tag',
      trigger: '🎯 Trigger',
      condition: '🔀 Condizione',
      delay: '⏰ Ritardo',
      action: '⚡ Azione'
    };
    
    // Tipi specifici per trigger - Sistema Gemme Completo
    const triggerLabels = {
      // Sistema Gemme - Accumulo
      gems_earned: '💎 Gemme Guadagnate',
      gems_milestone_50: '🏆 50 Gemme Raggiunte',
      gems_milestone_100: '🥇 100 Gemme Raggiunte', 
      gems_milestone_250: '👑 250 Gemme VIP',
      gems_milestone_500: '💫 500 Gemme Premium',
      gems_milestone_1000: '🌟 1000 Gemme Elite',
      
      // Sistema Gemme - Utilizzo
      gems_redeemed: '🎁 Gemme Riscattate',
      gems_expired_warning: '⚠️ Gemme in Scadenza',
      gems_expired: '💔 Gemme Scadute',
      reward_unlocked: '🔓 Premio Sbloccato',
      reward_claimed: '✅ Premio Ritirato',
      
      // Livelli & Status
      level_bronze: '🥉 Livello Bronze',
      level_silver: '🥈 Livello Silver',
      level_gold: '🥇 Livello Gold',
      level_platinum: '💎 Livello Platinum',
      level_diamond: '💍 Livello Diamond',
      vip_status: '👑 Status VIP Attivo',
      vip_expired: '👑 VIP Scaduto',
      
      // Eventi Cliente Avanzati
      new_customer: '👤 Nuovo Cliente',
      birthday: '🎂 Compleanno',
      anniversary: '💝 Anniversario Iscrizione',
      welcome_bonus: '🎊 Bonus Benvenuto',
      comeback_customer: '🔄 Cliente di Ritorno',
      inactive_30days: '😴 Inattivo 30 giorni',
      inactive_60days: '⏰ Inattivo 60 giorni',
      inactive_90days: '🚨 Inattivo 90 giorni',
      
      // Transazioni Specifiche
      first_purchase: '🛍️ Primo Acquisto',
      purchase_small: '💳 Piccolo Acquisto',
      purchase_medium: '💰 Medio Acquisto',
      purchase_large: '💎 Grande Acquisto',
      purchase_streak_3: '🔥 3 Acquisti Consecutivi',
      purchase_streak_5: '⚡ 5 Acquisti Consecutivi',
      refund_issued: '↩️ Rimborso Emesso',
      
      // Interazioni Fisiche
      nfc_scan: '📲 Scansione NFC',
      qr_scan: '📱 Scansione QR',
      store_visit: '🏪 Visita Negozio',
      app_opened: '📱 App Aperta',
      card_shown: '💳 Carta Mostrata',
      
      // Temporali Personalizzati
      daily_reminder: '☀️ Promemoria Giornaliero',
      weekly_recap: '📊 Recap Settimanale',
      monthly_bonus: '🗓️ Bonus Mensile',
      seasonal_promo: '🌸 Promo Stagionale',
      weekend_special: '🎉 Speciale Weekend',
      
      // Marketing Automation
      abandoned_reward: '🛒 Premio Abbandonato',
      survey_request: '📝 Richiesta Sondaggio',
      review_request: '⭐ Richiesta Recensione',
      referral_bonus: '🤝 Bonus Referral',
      social_share: '📱 Condivisione Social',
      
      // Eventi Negozio
      new_product: '🆕 Nuovo Prodotto',
      flash_sale: '⚡ Offerta Flash',
      inventory_low: '📦 Scorte Limitate',
      store_event: '🎪 Evento Negozio',
      happy_hour: '🕐 Happy Hour',
      
      // Avanzati
      weather_sunny: '☀️ Bel Tempo',
      weather_rainy: '🌧️ Tempo Piovoso',
      holiday_christmas: '🎄 Natale',
      holiday_easter: '🐰 Pasqua',
      holiday_valentine: '💕 San Valentino',
      competitor_promo: '👀 Promo Concorrenza',
      manual_trigger: '👆 Trigger Manuale'
    };
    
    let label = nodeTypes[type] || `Nuovo ${type}`;
    let realTrigger = null;
    let description = `Nuovo nodo ${type} aggiunto al workflow`;
    
    // Personalizza in base al sottotipo
    if (type === 'trigger' && subType) {
      label = triggerLabels[subType] || label;
      realTrigger = `${subType}_schedule`;
      description = `Trigger ${subType}: ${triggerLabels[subType]}`;
    }
    
    const newNode = {
      id: Math.random().toString(),
      type: 'default',
      position: { x: Math.random() * 300 + 100, y: Math.random() * 300 + 100 },
      data: { 
        label,
        nodeType: type,
        realTrigger,
        subType,
        description
      },
      style: getNodeStyle(type)
    };
    setNodes((nds) => nds.concat(newNode));
    setCurrentWorkflow(prev => ({ ...prev, saved: false }));
  }, [setNodes]);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    setShowNodeModal(true);
  }, []);


  const toggleFlowExecution = useCallback(() => {
    setIsFlowRunning(!isFlowRunning);
  }, [isFlowRunning]);

  // Carica workflow all'avvio del componente
  useEffect(() => {
    loadSavedWorkflows();
  }, [loadSavedWorkflows]);

  const saveCurrentWorkflow = async () => {
    // Validazione enterprise
    if (!currentWorkflow.name || currentWorkflow.name.trim() === '') {
      showNotification({
        type: 'error',
        title: '❌ Nome richiesto',
        message: 'Inserire un nome per il workflow prima di salvare.'
      });
      return;
    }
    
    if (nodes.length === 0) {
      showNotification({
        type: 'error',
        title: '❌ Workflow vuoto',
        message: 'Aggiungere almeno un componente prima di salvare.'
      });
      return;
    }
    
    // 🎯 RILEVAMENTO AUTOMATICO TRIGGER TYPE
    let detectedTriggerType = 'manual'; // Default
    
    // Cerca nodi trigger nel workflow
    const triggerNodes = nodes.filter(node => node.data?.nodeType === 'trigger');
    if (triggerNodes.length > 0) {
      // Prende il primo trigger trovato
      const mainTrigger = triggerNodes[0];
      if (mainTrigger.data?.subType) {
        detectedTriggerType = mainTrigger.data.subType;
        console.log('🎯 Trigger type rilevato automaticamente:', detectedTriggerType);
      }
    }
    
    const workflowData = {
      id: currentWorkflow.id || crypto.randomUUID(),
      name: currentWorkflow.name.trim(),
      nodes: JSON.stringify(nodes),
      edges: JSON.stringify(edges),
      is_active: false,
      trigger_type: detectedTriggerType, // 🚀 Auto-rilevato invece di 'manual'
      created_at: currentWorkflow.id ? undefined : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    try {
      const { error } = await supabase
        .from('notification_workflows')
        .upsert(workflowData);
      
      if (error) throw error;
      
      await loadSavedWorkflows();
      setCurrentWorkflow(prev => ({ ...prev, id: workflowData.id, saved: true }));
      
      showNotification({
        type: 'success',
        title: '✅ Workflow salvato con successo',
        message: `"${workflowData.name}" è stato salvato e sincronizzato nel database.`
      });
      
    } catch (error) {
      console.warn('Fallback su localStorage:', error);
      // Fallback su localStorage se tabella non esiste
      const saved = JSON.parse(localStorage.getItem('email_workflows') || '[]');
      const existingIndex = saved.findIndex(w => w.id === workflowData.id);
      
      if (existingIndex >= 0) {
        saved[existingIndex] = workflowData;
      } else {
        saved.push(workflowData);
      }
      
      localStorage.setItem('email_workflows', JSON.stringify(saved));
      setSavedWorkflows(saved);
      setCurrentWorkflow(prev => ({ ...prev, id: workflowData.id, saved: true }));
      
      showNotification({
        type: 'warning',
        title: 'Workflow salvato localmente',
        message: 'Il workflow è stato salvato localmente (database non disponibile).'
      });
    }
  };

  const showNotification = useCallback((notification) => {
    setNotification(notification);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  return (
    <div className="automation-builder">
      {/* Header esistente */}
      <div className="builder-header">
        <div className="header-left">
          <div className="logo-section">
            {!sidebarVisible && (
              <button 
                className="sidebar-show-btn"
                onClick={() => setSidebarVisible(true)}
                title="Mostra componenti"
              >
                ▶️
              </button>
            )}
            <h1>⚡ Automation Builder</h1>
            <input 
              type="text"
              value={currentWorkflow.name}
              onChange={(e) => setCurrentWorkflow(prev => ({ ...prev, name: e.target.value }))}
              className="workflow-name-input"
              placeholder="Nome del workflow"
              maxLength={50}
            />
          </div>
        </div>
        <div className="header-right">
          <button 
            className="header-btn save-btn" 
            onClick={saveCurrentWorkflow}
            title="Salva workflow corrente"
          >
            💾 Salva Workflow
          </button>
          <button className="header-btn" onClick={() => setSidebarVisible(!sidebarVisible)}>
            {sidebarVisible ? '◀️ Nascondi Componenti' : '▶️ Mostra Componenti'}
          </button>
        </div>
      </div>
      {/* ...existing code... (area principale builder, flow, ecc.) */}
      {/* Footer con tabella workflow */}
      <div className="workflow-footer">
        <h3 className="workflow-footer-title">🔄 Gestione Workflow</h3>
        <div className="workflow-footer-actions">
          <button className="workflow-footer-btn create" title="Crea nuovo workflow">
            ➕ Nuovo
          </button>
          <button className="workflow-footer-btn refresh" title="Aggiorna lista">
            🔄 Aggiorna
          </button>
        </div>
        {savedWorkflows.length === 0 ? (
          <div className="workflow-footer-empty">Nessun workflow creato. Crea un nuovo workflow e salvalo.</div>
        ) : (
          <div className="workflow-table-container">
            <table className="workflow-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Ultima Modifica</th>
                  <th>Stato</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {savedWorkflows.map((workflow) => {
                  const isActive = workflow.is_active;
                  return (
                    <tr key={workflow.id} className={isActive ? 'active-row' : 'inactive-row'}>
                      <td>{workflow.name}</td>
                      <td>{workflow.updated_at ? new Date(workflow.updated_at).toLocaleString() : '-'}</td>
                      <td style={{textAlign: 'center'}}>
                        {isActive ? (
                          <span title="Attivo" style={{color: '#22c55e', fontWeight: 'bold'}}>
                            <span className="status-light status-green" />🟢 Attivo
                          </span>
                        ) : (
                          <span title="Spento" style={{color: '#ef4444', fontWeight: 'bold'}}>
                            <span className="status-light status-red" />🔴 Spento
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="workflow-actions">
                          {isActive ? (
                            <button 
                              className="workflow-btn pause" 
                              title="Ferma workflow" 
                              onClick={async () => {
                                try {
                                  await supabase
                                    .from('notification_workflows')
                                    .update({ is_active: false })
                                    .eq('id', workflow.id);
                                  
                                  await loadSavedWorkflows();
                                  showNotification({
                                    message: `🔴 Workflow "${workflow.name}" fermato`,
                                    type: 'warning'
                                  });
                                } catch (err) {
                                  console.error('Errore stop workflow:', err);
                                  showNotification({
                                    message: '❌ Errore durante la disattivazione',
                                    type: 'error'
                                  });
                                }
                              }}
                            >
                              ⏸️
                            </button>
                          ) : (
                            <button 
                              className="workflow-btn play" 
                              title="Avvia workflow" 
                              onClick={async () => {
                                try {
                                  await supabase
                                    .from('notification_workflows')
                                    .update({ is_active: true })
                                    .eq('id', workflow.id);
                                  
                                  // Inizializza scheduler se non già attivo
                                  await notificationScheduler.init();
                                  
                                  await loadSavedWorkflows();
                                  showNotification({
                                    message: `🟢 Workflow "${workflow.name}" attivato!`,
                                    type: 'success'
                                  });
                                } catch (err) {
                                  console.error('Errore start workflow:', err);
                                  showNotification({
                                    message: '❌ Errore durante l\'attivazione',
                                    type: 'error'
                                  });
                                }
                              }}
                            >
                              ▶️
                            </button>
                          )}
                          
                          <button 
                            className="workflow-btn load" 
                            title="Carica nello stage per modificare" 
                            onClick={async () => {
                              await loadWorkflow(workflow.id);
                              showNotification({
                                message: `👁️ Workflow "${workflow.name}" caricato nello stage`,
                                type: 'success'
                              });
                            }}
                          >
                            👁️
                          </button>
                          
                          <button 
                            className="workflow-btn test" 
                            title="Test workflow" 
                            onClick={async () => {
                              try {
                                showNotification({
                                  message: `🧪 Test workflow "${workflow.name}" avviato...`,
                                  type: 'info'
                                });
                                
                                const result = await notificationWorkflowService.testWorkflow(workflow.id);
                                
                                if (result.success) {
                                  showNotification({
                                    message: `✅ Test completato! Inviate ${result.notificationsSent || 0} notifiche`,
                                    type: 'success'
                                  });
                                } else {
                                  showNotification({
                                    message: `❌ Test fallito: ${result.error}`,
                                    type: 'error'
                                  });
                                }
                              } catch (error) {
                                console.error('Errore test workflow:', error);
                                showNotification({
                                  message: '❌ Errore test workflow',
                                  type: 'error'
                                });
                              }
                            }}
                          >
                            🧪
                          </button>
                          
                          <button 
                            className="workflow-btn delete" 
                            title="Elimina workflow" 
                            onClick={async () => {
                              if (confirm(`Sei sicuro di voler eliminare il workflow "${workflow.name}"?`)) {
                                try {
                                  await supabase
                                    .from('notification_workflows')
                                    .delete()
                                    .eq('id', workflow.id);
                                    
                                  await loadSavedWorkflows();
                                  showNotification({
                                    message: `🗑️ Workflow "${workflow.name}" eliminato`,
                                    type: 'warning'
                                  });
                                } catch (err) {
                                  console.error('Errore eliminazione workflow:', err);
                                  showNotification({
                                    message: '❌ Errore durante l\'eliminazione',
                                    type: 'error'
                                  });
                                }
                              }
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="builder-content">

        {/* Sidebar Componenti con stile footer */}
        <div className={`components-sidebar-container ${sidebarVisible ? 'visible' : 'hidden'}`}>
          <h3 className="workflow-footer-title">🧩 Componenti Flow</h3>
          <div className="workflow-footer-actions">
            <button className="workflow-footer-btn create" title="Mostra preferiti">
              ⭐ Preferiti
            </button>
            <button className="workflow-footer-btn refresh" title="Mostra tutti">
              🔍 Tutti
            </button>
            <button 
              className="workflow-footer-btn refresh" 
              onClick={() => setSidebarVisible(false)} 
              title="Nascondi sidebar"
            >
              ◀️
            </button>
          </div>
          
          <div className="workflow-table-container">
            <div className="component-category">
              <div className="category-title">
                <Bell size={16} /> Push Notifications
              </div>
              <div className="component-list">
                <div className="component-item notification" onClick={() => addNode('notification')} data-type="push">
                  <div className="component-icon">📱</div>
                  <div className="component-details">
                    <h4>Push Notification</h4>
                    <p>Notifica push immediata a team o clienti</p>
                  </div>
                </div>
                <div className="component-item tag" onClick={() => addNode('tag')} data-type="add">
                  <div className="component-icon">🏷️</div>
                  <div className="component-details">
                    <h4>Aggiungi Tag</h4>
                    <p>Aggiunge tag specifico al cliente</p>
                  </div>
                </div>
                <div className="component-item condition" onClick={() => addNode('condition')} data-type="vip">
                  <div className="component-icon">👑</div>
                  <div className="component-details">
                    <h4>Controllo VIP</h4>
                    <p>Verifica se cliente è VIP o raggiunge soglia</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="component-category">
              <div className="category-title">
                <MessageSquare size={16} /> Messaggistica
              </div>
              <div className="component-list">
                <div className="component-item sms" onClick={() => addNode('sms')}>
                  <div className="component-icon">📱</div>
                  <div className="component-details">
                    <h4>SMS</h4>
                    <p>Messaggio di testo breve e diretto</p>
                  </div>
                </div>
                <div className="component-item whatsapp" onClick={() => addNode('whatsapp')}>
                  <div className="component-icon">💬</div>
                  <div className="component-details">
                    <h4>WhatsApp</h4>
                    <p>Messaggio WhatsApp</p>
                  </div>
                </div>
              </div>
            </div>


            <div className="component-category">
              <div className="category-title">
                <Target size={16} /> 💎 Sistema Gemme
              </div>
              <div className="component-list">
                <div className="component-item trigger" onClick={() => addNode('trigger', 'gems_earned')}>
                  <div className="component-icon">💎</div>
                  <div className="component-details">
                    <h4>Gemme Guadagnate</h4>
                    <p>Quando il cliente guadagna gemme</p>
                  </div>
                </div>
                <div className="component-item trigger" onClick={() => addNode('trigger', 'gems_milestone_100')}>
                  <div className="component-icon">🥇</div>
                  <div className="component-details">
                    <h4>100 Gemme</h4>
                    <p>Raggiunge 100 gemme totali</p>
                  </div>
                </div>
                <div className="component-item trigger" onClick={() => addNode('trigger', 'gems_milestone_500')}>
                  <div className="component-icon">💫</div>
                  <div className="component-details">
                    <h4>500 Gemme Premium</h4>
                    <p>Status premium raggiunto</p>
                  </div>
                </div>
                <div className="component-item trigger" onClick={() => addNode('trigger', 'gems_redeemed')}>
                  <div className="component-icon">🎁</div>
                  <div className="component-details">
                    <h4>Gemme Riscattate</h4>
                    <p>Cliente riscatta un premio</p>
                  </div>
                </div>
                <div className="component-item trigger" onClick={() => addNode('trigger', 'reward_unlocked')}>
                  <div className="component-icon">🔓</div>
                  <div className="component-details">
                    <h4>Premio Sbloccato</h4>
                    <p>Nuovo premio disponibile</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="component-category">
              <div className="category-title">
                <Users size={16} /> 🏆 Livelli & Status
              </div>
              <div className="component-list">
                <div className="component-item trigger" onClick={() => addNode('trigger', 'level_bronze')}>
                  <div className="component-icon">🥉</div>
                  <div className="component-details">
                    <h4>Livello Bronze</h4>
                    <p>Cliente raggiunge Bronze</p>
                  </div>
                </div>
                <div className="component-item trigger" onClick={() => addNode('trigger', 'level_gold')}>
                  <div className="component-icon">🥇</div>
                  <div className="component-details">
                    <h4>Livello Gold</h4>
                    <p>Cliente raggiunge Gold</p>
                  </div>
                </div>
                <div className="component-item trigger" onClick={() => addNode('trigger', 'level_diamond')}>
                  <div className="component-icon">💍</div>
                  <div className="component-details">
                    <h4>Livello Diamond</h4>
                    <p>Massimo livello raggiunto</p>
                  </div>
                </div>
                <div className="component-item trigger" onClick={() => addNode('trigger', 'vip_status')}>
                  <div className="component-icon">👑</div>
                  <div className="component-details">
                    <h4>Status VIP</h4>
                    <p>Cliente diventa VIP</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="component-category">
              <div className="category-title">
                <Target size={16} /> 🛍️ Transazioni
              </div>
              <div className="component-list">
                <div className="component-item trigger" onClick={() => addNode('trigger', 'first_purchase')}>
                  <div className="component-icon">🛍️</div>
                  <div className="component-details">
                    <h4>Primo Acquisto</h4>
                    <p>Primo acquisto del cliente</p>
                  </div>
                </div>
                <div className="component-item trigger" onClick={() => addNode('trigger', 'purchase_large')}>
                  <div className="component-icon">💎</div>
                  <div className="component-details">
                    <h4>Grande Acquisto</h4>
                    <p>Acquisto sopra soglia VIP</p>
                  </div>
                </div>
                <div className="component-item trigger" onClick={() => addNode('trigger', 'purchase_streak_3')}>
                  <div className="component-icon">🔥</div>
                  <div className="component-details">
                    <h4>3 Acquisti Consecutivi</h4>
                    <p>Streak di acquisti attiva</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="component-category">
              <div className="category-title">
                <Users size={16} /> 👤 Eventi Cliente
              </div>
              <div className="component-list">
                <div className="component-item trigger" onClick={() => addNode('trigger', 'new_customer')}>
                  <div className="component-icon">👤</div>
                  <div className="component-details">
                    <h4>Nuovo Cliente</h4>
                    <p>Registrazione completata</p>
                  </div>
                </div>
                <div className="component-item trigger" onClick={() => addNode('trigger', 'birthday')}>
                  <div className="component-icon">🎂</div>
                  <div className="component-details">
                    <h4>Compleanno</h4>
                    <p>È il compleanno del cliente</p>
                  </div>
                </div>
                <div className="component-item trigger" onClick={() => addNode('trigger', 'comeback_customer')}>
                  <div className="component-icon">🔄</div>
                  <div className="component-details">
                    <h4>Cliente di Ritorno</h4>
                    <p>Ritorna dopo periodo inattività</p>
                  </div>
                </div>
                <div className="component-item trigger" onClick={() => addNode('trigger', 'inactive_30days')}>
                  <div className="component-icon">😴</div>
                  <div className="component-details">
                    <h4>Inattivo 30 giorni</h4>
                    <p>Cliente non attivo da 30gg</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="component-category">
              <div className="category-title">
                <Target size={16} /> 📱 Interazioni
              </div>
              <div className="component-list">
                <div className="component-item trigger" onClick={() => addNode('trigger', 'nfc_scan')}>
                  <div className="component-icon">📲</div>
                  <div className="component-details">
                    <h4>Scansione NFC</h4>
                    <p>Cliente scannerizza NFC</p>
                  </div>
                </div>
                <div className="component-item trigger" onClick={() => addNode('trigger', 'qr_scan')}>
                  <div className="component-icon">📱</div>
                  <div className="component-details">
                    <h4>Scansione QR</h4>
                    <p>QR Code scansionato</p>
                  </div>
                </div>
                <div className="component-item trigger" onClick={() => addNode('trigger', 'store_visit')}>
                  <div className="component-icon">🏪</div>
                  <div className="component-details">
                    <h4>Visita Negozio</h4>
                    <p>Cliente entra nel negozio</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="component-category">
              <div className="category-title">
                <Target size={16} /> ⚡ Marketing Automation
              </div>
              <div className="component-list">
                <div className="component-item trigger" onClick={() => addNode('trigger', 'abandoned_reward')}>
                  <div className="component-icon">🛒</div>
                  <div className="component-details">
                    <h4>Premio Abbandonato</h4>
                    <p>Cliente non riscatta premio</p>
                  </div>
                </div>
                <div className="component-item trigger" onClick={() => addNode('trigger', 'review_request')}>
                  <div className="component-icon">⭐</div>
                  <div className="component-details">
                    <h4>Richiesta Recensione</h4>
                    <p>Momento ideale per recensione</p>
                  </div>
                </div>
                <div className="component-item trigger" onClick={() => addNode('trigger', 'referral_bonus')}>
                  <div className="component-icon">🤝</div>
                  <div className="component-details">
                    <h4>Bonus Referral</h4>
                    <p>Cliente invita amico</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="component-category">
              <div className="category-title">
                <Zap size={16} /> Azioni
              </div>
              <div className="component-list">
                <div className="component-item action" onClick={() => addNode('action')}>
                  <div className="component-icon">🏷️</div>
                  <div className="component-details">
                    <h4>Aggiungi Tag</h4>
                    <p>Etichetta automatica per segmentazione cliente</p>
                  </div>
                </div>
                <div className="component-item action" onClick={() => addNode('action')}>
                  <div className="component-icon">💎</div>
                  <div className="component-details">
                    <h4>Aggiungi Punti</h4>
                    <p>Sistema reward loyalty automatico</p>
                  </div>
                </div>
                <div className="component-item action" onClick={() => addNode('action')}>
                  <div className="component-icon">🔗</div>
                  <div className="component-details">
                    <h4>Webhook</h4>
                    <p>Chiamata API esterna per integrazioni</p>
                  </div>
                </div>
                <div className="component-item action" onClick={() => addNode('action')}>
                  <div className="component-icon">📊</div>
                  <div className="component-details">
                    <h4>Analytics</h4>
                    <p>Traccia eventi per reportistica</p>
                  </div>
                </div>
                <div className="component-item action" onClick={() => addNode('action')}>
                  <div className="component-icon">🎁</div>
                  <div className="component-details">
                    <h4>Genera Coupon</h4>
                    <p>Crea codice sconto personalizzato</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Area principale del flow */}
        <div className="flow-workspace">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            fitView
            attributionPosition="bottom-left"
          >
            <Background color="#f1f5f9" gap={20} />
            <Controls showInteractive={false} />
            <MiniMap 
              nodeStrokeColor="#8B4513"
              nodeColor="#A0522D" 
              nodeBorderRadius={8}
              pannable
              zoomable
              position="top-right"
              style={{
                backgroundColor: 'rgba(255,255,255,0.9)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
            />
            
          </ReactFlow>
        </div>
      </div>
        
        {/* Notifiche */}
        {notification && (
          <div className={`notification ${notification.type}`}>
            <div className="notification-content">
              <strong>{notification.title}</strong>
              <p>{notification.message}</p>
            </div>
            <button 
              onClick={() => setNotification(null)}
              className="notification-close"
            >
              ✕
            </button>
          </div>
        )}

      {/* Modale Workflow Manager */}
      {showWorkflowManager && (
        <div className="node-modal-overlay" onClick={() => setShowWorkflowManager(false)}>
          <div className="node-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📁 Gestione Workflows</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setShowWorkflowManager(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-content">
              <div className="workflow-list">
                {savedWorkflows.length === 0 ? (
                  <div className="empty-state">
                    <p>Nessun workflow salvato</p>
                    <button className="btn btn-primary" onClick={createNewWorkflow}>
                      <Plus size={16} /> Crea primo workflow
                    </button>
                  </div>
                ) : (
                  <div className="workflows-table">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Nodi</th>
                          <th>Stato</th>
                          <th>Ultima modifica</th>
                          <th>Azioni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {savedWorkflows.map(workflow => {
                          const nodeCount = typeof workflow.nodes === 'string' 
                            ? JSON.parse(workflow.nodes).length 
                            : (workflow.nodes?.length || 0);
                          
                          return (
                            <tr key={workflow.id}>
                              <td>
                                <strong>{workflow.name || 'Workflow senza nome'}</strong>
                              </td>
                              <td>
                                <span className="node-count">{nodeCount} nodi</span>
                              </td>
                              <td>
                                <div className="status-control">
                                  <div className={`status-light ${workflow.is_active ? 'active' : 'inactive'}`}>
                                    {workflow.is_active ? '🟢' : '🔴'} 
                                    {workflow.is_active ? 'ATTIVO' : 'SPENTO'}
                                  </div>
                                </div>
                              </td>
                              <td>
                                <small>{new Date(workflow.updated_at).toLocaleDateString('it-IT')}</small>
                              </td>
                              <td>
                                <div className="action-buttons">
                                  {workflow.is_active ? (
                                    <button 
                                      className="btn btn-sm btn-warning"
                                      onClick={async () => {
                                        try {
                                          await supabase
                                            .from('notification_workflows')
                                            .update({ is_active: false })
                                            .eq('id', workflow.id);
                                          await loadSavedWorkflows();
                                          showNotification({
                                            message: `🔴 Workflow "${workflow.name}" disattivato`,
                                            type: 'info'
                                          });
                                        } catch (error) {
                                          console.error('Errore stop workflow:', error);
                                          showNotification({
                                            message: '❌ Errore disattivazione workflow',
                                            type: 'error'
                                          });
                                        }
                                      }}
                                      title="🔴 Ferma workflow"
                                    >
                                      ⏸️
                                    </button>
                                  ) : (
                                    <button 
                                      className="btn btn-sm btn-success"
                                      onClick={async () => {
                                        try {
                                          await supabase
                                            .from('notification_workflows')
                                            .update({ is_active: true })
                                            .eq('id', workflow.id);
                                          
                                          // Inizializza scheduler se non già attivo
                                          await notificationScheduler.init();
                                          
                                          await loadSavedWorkflows();
                                          showNotification({
                                            message: `🟢 Workflow "${workflow.name}" attivato!`,
                                            type: 'success'
                                          });
                                        } catch (error) {
                                          console.error('Errore start workflow:', error);
                                          showNotification({
                                            message: '❌ Errore attivazione workflow',
                                            type: 'error'
                                          });
                                        }
                                      }}
                                      title="🟢 Avvia workflow"
                                    >
                                      ▶️
                                    </button>
                                  )}
                                  
                                  <button 
                                    className="btn btn-sm btn-info"
                                    onClick={async () => {
                                      try {
                                        showNotification({
                                          message: `🧪 Test workflow "${workflow.name}" avviato...`,
                                          type: 'info'
                                        });
                                        
                                        const result = await notificationWorkflowService.testWorkflow(workflow.id);
                                        
                                        if (result.success) {
                                          showNotification({
                                            message: `✅ Test completato! Inviate ${result.notificationsSent || 0} notifiche`,
                                            type: 'success'
                                          });
                                        } else {
                                          showNotification({
                                            message: `❌ Test fallito: ${result.error}`,
                                            type: 'error'
                                          });
                                        }
                                      } catch (error) {
                                        console.error('Errore test workflow:', error);
                                        showNotification({
                                          message: '❌ Errore test workflow',
                                          type: 'error'
                                        });
                                      }
                                    }}
                                    title="🧪 Test workflow"
                                  >
                                    🧪
                                  </button>
                                  
                                  <button 
                                    className="btn btn-sm btn-primary"
                                    onClick={() => {
                                      loadWorkflow(workflow.id);
                                      setShowWorkflowManager(false);
                                    }}
                                    title="👁️ Carica e modifica"
                                  >
                                    <Eye size={12} />
                                  </button>
                                  
                                  <button 
                                    className="btn btn-sm btn-danger"
                                    onClick={async () => {
                                      if (confirm(`🗑️ Eliminare il workflow "${workflow.name}"?`)) {
                                        try {
                                          await supabase
                                            .from('notification_workflows')
                                            .delete()
                                            .eq('id', workflow.id);
                                          await loadSavedWorkflows();
                                        } catch (error) {
                                          console.error('Errore eliminazione:', error);
                                        }
                                      }
                                    }}
                                    title="Elimina workflow"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pannello Simulazione */}
      {simulationActive && (
        <div className="simulation-panel">
          <div className="simulation-header">
            <h4>🧪 Test Workflow</h4>
            <button 
              className="modal-close-btn"
              onClick={() => setSimulationActive(false)}
            >
              ✕
            </button>
          </div>
          
          <div className="simulation-content">
            <div className="simulation-status">
              <div className={`status-indicator ${simulationActive ? 'active' : 'completed'}`}>
                {simulationActive ? `⚡ In esecuzione... (${currentSimulationStep}/${nodes.length})` : '✅ Completato'}
              </div>
            </div>
            
            <div className="simulation-log">
              {simulationLog.length === 0 ? (
                <div className="log-entry log-system">
                  <div className="log-time">{new Date().toLocaleTimeString()}</div>
                  <div className="log-action">Avvio test workflow...</div>
                </div>
              ) : (
                simulationLog.map((entry, index) => (
                  <div key={index} className={`log-entry log-${entry.nodeId}`}>
                    <div className="log-time">{entry.time}</div>
                    <div className="log-node">{entry.nodeName}</div>
                    <div className="log-action">{entry.action}</div>
                    <div className={`log-result result-${entry.result}`}>
                      {entry.result}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {simulationActive && (
              <div className="simulation-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-indicator"
                    style={{ width: `${(currentSimulationStep / nodes.length) * 100}%` }}
                  ></div>
                </div>
                <p>Processando nodo {currentSimulationStep} di {nodes.length}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modale Impostazioni Nodo */}
      {showNodeModal && selectedNode && (
        <div className="node-modal-overlay" onClick={() => setShowNodeModal(false)}>
          <div className="node-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚙️ Impostazioni Nodo</h3>
              <button 
                className="modal-close-btn"
                onClick={() => { setShowNodeModal(false); setSelectedNode(null); }}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-content">
              <div className="node-settings">
                <div className="setting-group">
                  <h4>📋 Informazioni Base</h4>
                  <div className="setting-field">
                    <label>Tipo:</label>
                    <span className="node-type">{selectedNode.data?.nodeType || 'Nodo'}</span>
                  </div>
                  
                  <div className="setting-field">
                    <label>Nome:</label>
                    <input 
                      type="text" 
                      defaultValue={selectedNode.data?.label || ''}
                      className="setting-input"
                      placeholder="Nome del nodo"
                      onChange={(e) => {
                        const updatedNodes = nodes.map(node => 
                          node.id === selectedNode.id 
                            ? { ...node, data: { ...node.data, label: e.target.value } }
                            : node
                        );
                        setNodes(updatedNodes);
                        setCurrentWorkflow(prev => ({ ...prev, saved: false }));
                      }}
                    />
                  </div>
                  
                  {selectedNode.data?.nodeType === 'notification' && (
                    <div className="setting-group">
                      <h4>📱 Impostazioni Notifica Push</h4>
                      <div className="setting-field">
                        <label>Titolo Notifica:</label>
                        <input 
                          type="text" 
                          className="setting-input"
                          ref={(input) => {
                            if (input && selectedNode) {
                              input.value = selectedNode.data?.label || '';
                            }
                          }}
                          onChange={(e) => {
                            console.log('Input onChange:', e.target.value);
                            const updatedNodes = nodes.map(node => 
                              node.id === selectedNode.id 
                                ? { ...node, data: { ...node.data, label: e.target.value } }
                                : node
                            );
                            setNodes(updatedNodes);
                            setSelectedNode(prev => ({ ...prev, data: { ...prev.data, label: e.target.value } }));
                            setCurrentWorkflow(prev => ({ ...prev, saved: false }));
                          }}
                          placeholder="Es: Tanti Auguri!"
                          style={{ pointerEvents: 'auto', cursor: 'text' }}
                          onKeyDown={(e) => {
                            // Supporto emoji Mac: Ctrl+Cmd+Space
                            if (e.metaKey && e.ctrlKey && e.code === 'Space') {
                              e.preventDefault();
                              // Il Mac aprirà automaticamente il picker emoji
                            }
                          }}
                        />
                        <div className="emoji-toolbar">
                          <span className="toolbar-label">Emoji rapide:</span>
                          <button 
                            type="button"
                            className="emoji-btn"
                            onClick={() => {
                              console.log('Emoji clicked!');
                              const titleInput = document.querySelector('.setting-input[type="text"]');
                              if (titleInput) {
                                titleInput.value = titleInput.value + '🎂';
                                const event = new Event('input', { bubbles: true });
                                titleInput.dispatchEvent(event);
                                titleInput.focus();
                              }
                            }}
                          >
                            🎂
                          </button>
                          <button 
                            type="button"
                            className="emoji-btn"
                            onClick={() => {
                              const titleInput = document.querySelector('.setting-input[type="text"]');
                              if (titleInput) {
                                titleInput.value = titleInput.value + '🎉';
                                const event = new Event('input', { bubbles: true });
                                titleInput.dispatchEvent(event);
                                titleInput.focus();
                              }
                            }}
                          >
                            🎉
                          </button>
                          <button 
                            type="button"
                            className="emoji-btn"
                            onClick={() => {
                              const titleInput = document.querySelector('.setting-input[type="text"]');
                              if (titleInput) {
                                titleInput.value = titleInput.value + '🎁';
                                const event = new Event('input', { bubbles: true });
                                titleInput.dispatchEvent(event);
                                titleInput.focus();
                              }
                            }}
                          >
                            🎁
                          </button>
                        </div>
                      </div>
                      <div className="setting-field">
                        <label>Messaggio:</label>
                        <textarea 
                          className="setting-input"
                          rows={3}
                          ref={(textarea) => {
                            if (textarea && selectedNode) {
                              textarea.value = selectedNode.data?.description || '';
                            }
                          }}
                          onChange={(e) => {
                            console.log('Textarea onChange:', e.target.value);
                            const updatedNodes = nodes.map(node => 
                              node.id === selectedNode.id 
                                ? { ...node, data: { ...node.data, description: e.target.value } }
                                : node
                            );
                            setNodes(updatedNodes);
                            setSelectedNode(prev => ({ ...prev, data: { ...prev.data, description: e.target.value } }));
                            setCurrentWorkflow(prev => ({ ...prev, saved: false }));
                          }}
                          placeholder="Es: È il compleanno di! Tanti auguri!"
                          style={{ pointerEvents: 'auto', cursor: 'text' }}
                          onKeyDown={(e) => {
                            // Supporto emoji Mac: Ctrl+Cmd+Space
                            if (e.metaKey && e.ctrlKey && e.code === 'Space') {
                              e.preventDefault();
                              // Il Mac aprirà automaticamente il picker emoji
                            }
                          }}
                        />
                        <div className="dynamic-tags-toolbar">
                          <span className="toolbar-label">Tag dinamici:</span>
                          <button 
                            type="button"
                            className="tag-btn"
                            onClick={() => {
                              console.log('Tag clicked!');
                              const messageTextarea = document.querySelector('textarea.setting-input');
                              if (messageTextarea) {
                                messageTextarea.value = messageTextarea.value + '{nome}';
                                const event = new Event('input', { bubbles: true });
                                messageTextarea.dispatchEvent(event);
                                messageTextarea.focus();
                              }
                            }}
                            title="Inserisci nome del cliente"
                          >
                            👤 Nome
                          </button>
                          <button 
                            type="button"
                            className="tag-btn"
                            onClick={() => {
                              const messageTextarea = document.querySelector('textarea.setting-input');
                              if (messageTextarea) {
                                messageTextarea.value = messageTextarea.value + '{punti}';
                                const event = new Event('input', { bubbles: true });
                                messageTextarea.dispatchEvent(event);
                                messageTextarea.focus();
                              }
                            }}
                            title="Inserisci punti del cliente"
                          >
                            💎 Punti
                          </button>
                          <button 
                            type="button"
                            className="tag-btn"
                            onClick={() => {
                              const messageTextarea = document.querySelector('textarea.setting-input');
                              if (messageTextarea) {
                                messageTextarea.value = messageTextarea.value + '{negozio}';
                                const event = new Event('input', { bubbles: true });
                                messageTextarea.dispatchEvent(event);
                                messageTextarea.focus();
                              }
                            }}
                            title="Inserisci nome del negozio"
                          >
                            🏪 Negozio
                          </button>
                        </div>
                        <div className="emoji-toolbar">
                          <span className="toolbar-label">Emoji messaggio:</span>
                          <button 
                            type="button"
                            className="emoji-btn"
                            onClick={() => {
                              const messageTextarea = document.querySelector('textarea.setting-input');
                              if (messageTextarea) {
                                messageTextarea.value = messageTextarea.value + '🎉';
                                const event = new Event('input', { bubbles: true });
                                messageTextarea.dispatchEvent(event);
                                messageTextarea.focus();
                              }
                            }}
                          >
                            🎉
                          </button>
                          <button 
                            type="button"
                            className="emoji-btn"
                            onClick={() => {
                              const messageTextarea = document.querySelector('textarea.setting-input');
                              if (messageTextarea) {
                                messageTextarea.value = messageTextarea.value + '❤️';
                                const event = new Event('input', { bubbles: true });
                                messageTextarea.dispatchEvent(event);
                                messageTextarea.focus();
                              }
                            }}
                          >
                            ❤️
                          </button>
                          <button 
                            type="button"
                            className="emoji-btn"
                            onClick={() => {
                              const messageTextarea = document.querySelector('textarea.setting-input');
                              if (messageTextarea) {
                                messageTextarea.value = messageTextarea.value + '✨';
                                const event = new Event('input', { bubbles: true });
                                messageTextarea.dispatchEvent(event);
                                messageTextarea.focus();
                              }
                            }}
                          >
                            ✨
                          </button>
                        </div>
                        <small style={{color: '#6b7280', fontSize: '0.8rem', marginTop: '8px', display: 'block'}}>
                          💡 Usa i pulsanti sopra per inserire tag dinamici ed emoji. Su Mac: Cmd+Ctrl+Spazio per più emoji
                        </small>
                      </div>
                    </div>
                  )}

                  {selectedNode.data?.nodeType === 'email' && (
                    <div className="setting-group">
                      <h4>📧 Impostazioni Email</h4>
                      <div className="setting-field">
                        <label>Template:</label>
                        <select className="setting-input">
                          <option value="welcome">Benvenuto</option>
                          <option value="birthday">Compleanno</option>
                          <option value="milestone">Milestone</option>
                          <option value="custom">Personalizzato</option>
                        </select>
                      </div>
                      <div className="setting-field">
                        <label>Oggetto:</label>
                        <input 
                          type="text" 
                          className="setting-input"
                          placeholder="Oggetto dell'email"
                        />
                      </div>
                    </div>
                  )}
                  
                  {selectedNode.data?.nodeType === 'condition' && (
                    <div className="setting-group">
                      <h4>🔀 Condizione</h4>
                      <div className="setting-field">
                        <label>Campo da controllare:</label>
                        <select className="setting-input">
                          <option value="points">Punti cliente</option>
                          <option value="email">Ha email</option>
                          <option value="phone">Ha telefono</option>
                          <option value="birth_date">Ha data nascita</option>
                        </select>
                      </div>
                      <div className="setting-field">
                        <label>Operatore:</label>
                        <select className="setting-input">
                          <option value="gt">Maggiore di</option>
                          <option value="lt">Minore di</option>
                          <option value="eq">Uguale a</option>
                          <option value="exists">Esiste</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-actions">
                  <button 
                    className="btn btn-primary"
                    onClick={() => { setShowNodeModal(false); setSelectedNode(null); }}
                  >
                    💾 Salva Modifiche
                  </button>
                  <button 
                    className="btn btn-danger"
                    onClick={() => {
                      const updatedNodes = nodes.filter(node => node.id !== selectedNode.id);
                      const updatedEdges = edges.filter(edge => 
                        edge.source !== selectedNode.id && edge.target !== selectedNode.id
                      );
                      setNodes(updatedNodes);
                      setEdges(updatedEdges);
                      setSelectedNode(null);
                      setShowNodeModal(false);
                      setCurrentWorkflow(prev => ({ ...prev, saved: false }));
                      showNotification({
                        type: 'warning',
                        title: 'Nodo eliminato',
                        message: 'Il nodo e le sue connessioni sono stati rimossi.'
                      });
                    }}
                  >
                    🗑️ Elimina Nodo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default FlowEditor;