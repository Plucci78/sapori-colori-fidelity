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

import 'reactflow/dist/style.css';
import './FlowEditor.css';

const initialNodes = [
  {
    id: '1',
    type: 'input',
    data: { 
      label: '🎯 Nuovo Cliente Registrato',
      nodeType: 'trigger',
      description: 'Trigger: Si attiva quando un nuovo cliente si registra al programma loyalty'
    },
    position: { x: 300, y: 80 },
    style: {
      background: '#4f46e5',
      color: 'white',
      border: '2px solid #312e81',
      borderRadius: '10px',
      padding: '12px',
      minWidth: '200px',
      textAlign: 'center'
    }
  },
  {
    id: '2',
    data: { 
      label: '📧 Email di Benvenuto',
      nodeType: 'email',
      description: 'Invia email di benvenuto con codice sconto 10%'
    },
    position: { x: 300, y: 200 },
    style: {
      background: '#059669',
      color: 'white',
      border: '2px solid #047857',
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
        .from('email_workflows')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      setSavedWorkflows(data || []);
    } catch (error) {
      console.warn('Tabella email_workflows non trovata, uso localStorage:', error);
      const saved = JSON.parse(localStorage.getItem('email_workflows') || '[]');
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

  const addNode = useCallback((type) => {
    const nodeTypes = {
      email: '📧 Email',
      sms: '📱 SMS',
      whatsapp: '💬 WhatsApp',
      push: '🔔 Push',
      trigger: '🎯 Trigger',
      condition: '🔀 Condizione',
      delay: '⏰ Ritardo',
      action: '⚡ Azione'
    };
    
    const newNode = {
      id: Math.random().toString(),
      type: 'default',
      position: { x: Math.random() * 300 + 100, y: Math.random() * 300 + 100 },
      data: { 
        label: nodeTypes[type] || `Nuovo ${type}`,
        nodeType: type,
        description: `Nuovo nodo ${type} aggiunto al workflow`
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

  const saveCurrentWorkflow = async () => {
    const workflowData = {
      id: currentWorkflow.id || Math.random().toString(),
      name: currentWorkflow.name,
      nodes: JSON.stringify(nodes),
      edges: JSON.stringify(edges),
      is_active: false,
      created_at: currentWorkflow.id ? undefined : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    try {
      const { error } = await supabase
        .from('email_workflows')
        .upsert(workflowData);
      
      if (error) throw error;
      
      await loadSavedWorkflows();
      setCurrentWorkflow(prev => ({ ...prev, id: workflowData.id, saved: true }));
      
      showNotification({
        type: 'success',
        title: 'Workflow salvato',
        message: `Il workflow "${workflowData.name}" è stato salvato nel database.`
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
            <h1>⚡ Automation Builder</h1>
            <span className="workflow-name">{currentWorkflow.name}</span>
          </div>
          <div className="file-actions">
            <button className="header-btn" onClick={createNewWorkflow} title="Crea nuovo workflow">
              <Plus size={16} /> Nuovo
            </button>
            <button className="header-btn" onClick={() => setShowWorkflowManager(true)} title="Apri workflow esistente">
              <FolderOpen size={16} /> Apri
            </button>
            <button className="header-btn" onClick={saveCurrentWorkflow} title="Salva workflow corrente">
              <Save size={16} /> Salva
            </button>
          </div>
          <div className="editor-actions">
            <button className="header-btn" title="Annulla ultima azione">
              <Undo size={16} />
            </button>
            <button className="header-btn" title="Ripeti ultima azione">
              <Redo size={16} />
            </button>
            <button className="header-btn" title="Zoom in">
              <ZoomIn size={16} />
            </button>
            <button className="header-btn" title="Zoom out">
              <ZoomOut size={16} />
            </button>
            <button className="header-btn" title="Anteprima workflow">
              <Eye size={16} /> Anteprima
            </button>
          </div>
          <div className="workflow-actions">
            <button 
              className={`header-btn ${simulationActive ? 'running' : ''}`}
              onClick={simulationActive ? () => setSimulationActive(false) : testWorkflow}
              title={simulationActive ? 'Ferma simulazione' : 'Simula workflow'}
            >
              {simulationActive ? <Pause size={16} /> : <Play size={16} />}
              {simulationActive ? 'Ferma' : 'Testa'}
            </button>
            <button className="header-btn primary" title="Pubblica workflow">
              <Share2 size={16} /> Pubblica
            </button>
          </div>
        </div>
      </div>

      <div className="builder-content">
        {/* Sidebar componenti */}
        <div className="components-sidebar">
          <div className="sidebar-header">
            <h3>🧩 Componenti</h3>
          </div>
          
          <div className="sidebar-content">
            <div className="component-category">
              <div className="category-title">
                <Mail size={16} /> Email Marketing
              </div>
              <div className="component-list">
                <div className="component-item email" onClick={() => addNode('email')} data-type="welcome">
                  <div className="component-icon">📧</div>
                  <div className="component-details">
                    <h4>Email Benvenuto</h4>
                    <p>Messaggio di benvenuto automatico per nuovi clienti</p>
                  </div>
                </div>
                <div className="component-item email" onClick={() => addNode('email')} data-type="newsletter">
                  <div className="component-icon">📰</div>
                  <div className="component-details">
                    <h4>Newsletter</h4>
                    <p>Email periodica con notizie e promozioni</p>
                  </div>
                </div>
                <div className="component-item email" onClick={() => addNode('email')} data-type="recovery">
                  <div className="component-icon">🛒</div>
                  <div className="component-details">
                    <h4>Recupero Carrello</h4>
                    <p>Ricontatta clienti con carrello abbandonato</p>
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
                  <div className="component-info">
                    <div className="component-name">WhatsApp</div>
                    <div className="component-desc">Messaggio WhatsApp</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="component-category">
              <div className="category-title">
                <Bell size={16} /> Notifiche
              </div>
              <div className="component-list">
                <div className="component-item" onClick={() => addNode('push')}>
                  <div className="component-icon">🔔</div>
                  <div className="component-info">
                    <div className="component-name">Push Notification</div>
                    <div className="component-desc">Notifica app/browser</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="component-category">
              <div className="category-title">
                <Target size={16} /> Trigger
              </div>
              <div className="component-list">
                <div className="component-item" onClick={() => addNode('trigger')}>
                  <div className="component-icon">🎯</div>
                  <div className="component-info">
                    <div className="component-name">Evento Cliente</div>
                    <div className="component-desc">Registrazione, acquisto</div>
                  </div>
                </div>
                <div className="component-item" onClick={() => addNode('trigger')}>
                  <div className="component-icon">📅</div>
                  <div className="component-info">
                    <div className="component-name">Trigger Temporale</div>
                    <div className="component-desc">Data, compleanno</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="component-category">
              <div className="category-title">
                <GitBranch size={16} /> Logica
              </div>
              <div className="component-list">
                <div className="component-item" onClick={() => addNode('condition')}>
                  <div className="component-icon">🔀</div>
                  <div className="component-info">
                    <div className="component-name">Condizione</div>
                    <div className="component-desc">Percorsi alternativi</div>
                  </div>
                </div>
                <div className="component-item" onClick={() => addNode('delay')}>
                  <div className="component-icon">⏰</div>
                  <div className="component-info">
                    <div className="component-name">Ritardo</div>
                    <div className="component-desc">Pausa temporizzata</div>
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
      </div>

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
                                <span className={`status-badge ${workflow.is_active ? 'active' : 'inactive'}`}>
                                  {workflow.is_active ? '🟢 Attivo' : '⚪ Inattivo'}
                                </span>
                              </td>
                              <td>
                                <small>{new Date(workflow.updated_at).toLocaleDateString('it-IT')}</small>
                              </td>
                              <td>
                                <div className="action-buttons">
                                  <button 
                                    className="btn btn-sm btn-primary"
                                    onClick={() => {
                                      loadWorkflow(workflow.id);
                                      setShowWorkflowManager(false);
                                    }}
                                    title="Carica workflow"
                                  >
                                    <Eye size={12} />
                                  </button>
                                  <button 
                                    className="btn btn-sm btn-danger"
                                    onClick={async () => {
                                      if (confirm(`Eliminare il workflow "${workflow.name}"?`)) {
                                        try {
                                          await supabase
                                            .from('email_workflows')
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