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

  // Funzioni esistenti
  const onConnect = useCallback((connection) => {
    const newEdge = {
      id: `${connection.source}-${connection.target}`,
      ...connection,
      type: 'smoothstep',
    };
    setEdges((eds) => addEdge(newEdge, eds));
  }, [setEdges]);

  const addNode = useCallback((type) => {
    const newNode = {
      id: Math.random().toString(),
      type: 'default',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label: `Nuovo ${type}` }
    };
    setNodes((nds) => nds.concat(newNode));
  }, [setNodes]);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    setShowNodeModal(true);
  }, []);

  const toggleFlowExecution = useCallback(() => {
    setIsFlowRunning(!isFlowRunning);
  }, [isFlowRunning]);

  const saveCurrentWorkflow = useCallback(() => {
    // Salva workflow
  }, []);

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
            <button className="header-btn" title="Crea nuovo workflow">
              <Plus size={16} /> Nuovo
            </button>
            <button className="header-btn" title="Apri workflow esistente">
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
              className={`header-btn ${isFlowRunning ? 'running' : ''}`}
              onClick={toggleFlowExecution}
              title={isFlowRunning ? 'Ferma simulazione' : 'Simula workflow'}
            >
              {isFlowRunning ? <Pause size={16} /> : <Play size={16} />}
              {isFlowRunning ? 'Ferma' : 'Simula'}
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
                    />
                  </div>
                  
                  {selectedNode.data?.description && (
                    <div className="setting-field">
                      <label>Descrizione:</label>
                      <p className="node-description">{selectedNode.data.description}</p>
                    </div>
                  )}
                </div>

                <div className="setting-group">
                  <h4>🎨 Aspetto</h4>
                  <div className="setting-field">
                    <label>Colore:</label>
                    <div className="color-picker-group">
                      <input type="color" defaultValue="#4f46e5" className="color-input" />
                      <span className="color-label">Colore del nodo</span>
                    </div>
                  </div>
                </div>

                <div className="setting-group">
                  <h4>📍 Posizione</h4>
                  <div className="position-controls">
                    <div className="setting-field">
                      <label>X:</label>
                      <input 
                        type="number" 
                        defaultValue={Math.round(selectedNode.position?.x || 0)}
                        className="position-input"
                      />
                    </div>
                    <div className="setting-field">
                      <label>Y:</label>
                      <input 
                        type="number" 
                        defaultValue={Math.round(selectedNode.position?.y || 0)}
                        className="position-input"
                      />
                    </div>
                  </div>
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