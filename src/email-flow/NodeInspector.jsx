import React from 'react';

function NodeInspector({ selectedNode, setSelectedNode, nodes, setNodes, edges, setEdges, showNotification }) {
  if (!selectedNode) return null;

  const updateNodeData = (field, value) => {
    const updatedNodes = nodes.map(node => 
      node.id === selectedNode.id 
        ? { ...node, data: { ...node.data, [field]: value } }
        : node
    );
    setNodes(updatedNodes);
    setSelectedNode({...selectedNode, data: {...selectedNode.data, [field]: value}});
  };

  const deleteNode = () => {
    const updatedNodes = nodes.filter(node => node.id !== selectedNode.id);
    const updatedEdges = edges.filter(edge => 
      edge.source !== selectedNode.id && edge.target !== selectedNode.id
    );
    setNodes(updatedNodes);
    setEdges(updatedEdges);
    setSelectedNode(null);
    showNotification({
      type: 'warning',
      title: 'Nodo eliminato',
      message: 'Il nodo e le sue connessioni sono stati rimossi.'
    });
  };

  const duplicateNode = () => {
    const newNode = {
      ...selectedNode,
      id: `${Date.now()}`,
      position: {
        x: selectedNode.position.x + 50,
        y: selectedNode.position.y + 50
      }
    };
    setNodes([...nodes, newNode]);
    showNotification({
      type: 'success',
      title: 'Nodo duplicato',
      message: 'Il nodo è stato copiato con le stesse impostazioni.'
    });
  };

  return (
    <div className="node-inspector">
      <div className="inspector-header">
        <h4>⚙️ Configurazione: {selectedNode.data.nodeType}</h4>
        <button onClick={() => setSelectedNode(null)} className="close-btn">×</button>
      </div>
      
      <div className="inspector-content">
        <div className="form-group">
          <label>Tipo di Nodo:</label>
          <span className="node-type-badge">{selectedNode.data.nodeType}</span>
        </div>
        
        <div className="form-group">
          <label>Nome del Nodo:</label>
          <input 
            type="text" 
            value={selectedNode.data.label}
            onChange={(e) => updateNodeData('label', e.target.value)}
            className="form-input"
            placeholder="Es. Email di Benvenuto"
          />
        </div>
        
        <div className="form-group">
          <label>Descrizione:</label>
          <textarea
            value={selectedNode.data.description || ''}
            onChange={(e) => updateNodeData('description', e.target.value)}
            className="form-textarea"
            rows="2"
            placeholder="Cosa fa questo nodo..."
          />
        </div>

        {/* Configurazioni specifiche per Trigger */}
        {selectedNode.data.nodeType === 'trigger' && (
          <div className="node-config">
            <h5>🎯 Configurazione Trigger</h5>
            <div className="form-group">
              <label>Evento Scatenante:</label>
              <select 
                className="form-select" 
                value={selectedNode.data.triggerEvent || 'customer_registered'}
                onChange={(e) => updateNodeData('triggerEvent', e.target.value)}
              >
                <option value="customer_registered">Nuovo cliente registrato</option>
                <option value="birthday">Compleanno cliente</option>
                <option value="purchase_made">Acquisto completato</option>
                <option value="cart_abandoned">Carrello abbandonato</option>
                <option value="points_earned">Punti guadagnati</option>
                <option value="level_up">Livello raggiunto</option>
                <option value="subscription_expired">Abbonamento scaduto</option>
                <option value="custom_date">Data personalizzata</option>
              </select>
            </div>
            <div className="form-group">
              <label>Condizioni Aggiuntive:</label>
              <textarea
                className="form-textarea"
                rows="2"
                placeholder="Es. Solo per clienti VIP, Solo se primo acquisto > 50€..."
                value={selectedNode.data.conditions || ''}
                onChange={(e) => updateNodeData('conditions', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Frequenza:</label>
              <select className="form-select" value={selectedNode.data.frequency || 'once'}>
                <option value="once">Una volta sola</option>
                <option value="daily">Ogni giorno</option>
                <option value="weekly">Ogni settimana</option>
                <option value="monthly">Ogni mese</option>
                <option value="yearly">Ogni anno</option>
              </select>
            </div>
          </div>
        )}

        {/* Configurazioni specifiche per Email */}
        {selectedNode.data.nodeType === 'email' && (
          <div className="node-config">
            <h5>📧 Configurazione Email</h5>
            <div className="form-group">
              <label>Template Email:</label>
              <select 
                className="form-select" 
                value={selectedNode.data.template || 'welcome'}
                onChange={(e) => updateNodeData('template', e.target.value)}
              >
                <option value="welcome">Email di Benvenuto</option>
                <option value="birthday">Auguri di Compleanno</option>
                <option value="cart_recovery">Recupero Carrello</option>
                <option value="thank_you">Ringraziamento</option>
                <option value="newsletter">Newsletter</option>
                <option value="promotion">Promozione</option>
                <option value="level_up">Congratulazioni Livello</option>
                <option value="custom">Template Personalizzato</option>
              </select>
            </div>
            <div className="form-group">
              <label>Oggetto Email:</label>
              <input
                type="text"
                className="form-input"
                placeholder="Es. Benvenuto nel nostro programma loyalty!"
                value={selectedNode.data.emailSubject || ''}
                onChange={(e) => updateNodeData('emailSubject', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Mittente:</label>
              <input
                type="text"
                className="form-input"
                placeholder="Es. Il Team di Forno Loyalty"
                value={selectedNode.data.sender || ''}
                onChange={(e) => updateNodeData('sender', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Personalizzazione:</label>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input type="checkbox" defaultChecked />
                  Usa nome cliente
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" />
                  Includi punti attuali
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" />
                  Aggiungi coupon sconto
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" />
                  Includi prodotti consigliati
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Configurazioni specifiche per Delay */}
        {selectedNode.data.nodeType === 'delay' && (
          <div className="node-config">
            <h5>⏰ Configurazione Attesa</h5>
            <div className="form-group">
              <label>Durata:</label>
              <div className="time-input-group">
                <input
                  type="number"
                  className="form-input time-value"
                  min="1"
                  value={selectedNode.data.delayValue || '1'}
                  onChange={(e) => updateNodeData('delayValue', e.target.value)}
                />
                <select 
                  className="form-select time-unit"
                  value={selectedNode.data.delayUnit || 'days'}
                  onChange={(e) => updateNodeData('delayUnit', e.target.value)}
                >
                  <option value="minutes">Minuti</option>
                  <option value="hours">Ore</option>
                  <option value="days">Giorni</option>
                  <option value="weeks">Settimane</option>
                  <option value="months">Mesi</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Orario Invio:</label>
              <select 
                className="form-select"
                value={selectedNode.data.sendTime || 'immediate'}
                onChange={(e) => updateNodeData('sendTime', e.target.value)}
              >
                <option value="immediate">Immediatamente</option>
                <option value="business_hours">Solo orari lavorativi (9-18)</option>
                <option value="morning">Solo mattina (8-12)</option>
                <option value="afternoon">Solo pomeriggio (14-18)</option>
                <option value="custom_time">Orario specifico</option>
              </select>
            </div>
            <div className="form-group">
              <label>Fuso Orario:</label>
              <select className="form-select">
                <option value="client_timezone">Fuso orario cliente</option>
                <option value="company_timezone">Fuso orario azienda</option>
              </select>
            </div>
          </div>
        )}

        {/* Configurazioni specifiche per Condition */}
        {selectedNode.data.nodeType === 'condition' && (
          <div className="node-config">
            <h5>🔀 Configurazione Condizione</h5>
            <div className="form-group">
              <label>Tipo Condizione:</label>
              <select 
                className="form-select"
                value={selectedNode.data.conditionType || 'purchase_check'}
                onChange={(e) => updateNodeData('conditionType', e.target.value)}
              >
                <option value="purchase_check">Ha fatto un acquisto?</option>
                <option value="email_opened">Ha aperto l'email?</option>
                <option value="email_clicked">Ha cliccato nell'email?</option>
                <option value="points_level">Livello punti raggiunto?</option>
                <option value="customer_segment">Segmento cliente</option>
                <option value="date_range">Periodo temporale</option>
                <option value="location">Posizione geografica</option>
                <option value="custom">Condizione personalizzata</option>
              </select>
            </div>
            <div className="form-group">
              <label>Valore da Confrontare:</label>
              <input
                type="text"
                className="form-input"
                placeholder="Es. > 0, = VIP, > 100 punti..."
                value={selectedNode.data.conditionValue || ''}
                onChange={(e) => updateNodeData('conditionValue', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Periodo di Controllo:</label>
              <select className="form-select">
                <option value="last_7_days">Ultimi 7 giorni</option>
                <option value="last_30_days">Ultimi 30 giorni</option>
                <option value="last_90_days">Ultimi 90 giorni</option>
                <option value="since_last_email">Dall'ultima email</option>
                <option value="all_time">Sempre</option>
              </select>
            </div>
            <div className="paths-preview">
              <div className="path path-yes">✅ Percorso SÌ</div>
              <div className="path path-no">❌ Percorso NO</div>
            </div>
          </div>
        )}

        {/* Configurazioni specifiche per Action */}
        {selectedNode.data.nodeType === 'action' && (
          <div className="node-config">
            <h5>⚡ Configurazione Azione</h5>
            <div className="form-group">
              <label>Tipo Azione:</label>
              <select 
                className="form-select"
                value={selectedNode.data.actionType || 'add_points'}
                onChange={(e) => updateNodeData('actionType', e.target.value)}
              >
                <option value="add_points">Aggiungi Punti</option>
                <option value="subtract_points">Rimuovi Punti</option>
                <option value="change_level">Cambia Livello</option>
                <option value="add_tag">Aggiungi Tag</option>
                <option value="remove_tag">Rimuovi Tag</option>
                <option value="send_notification">Invia Notifica Push</option>
                <option value="create_coupon">Crea Coupon</option>
                <option value="add_to_segment">Aggiungi a Segmento</option>
                <option value="remove_from_segment">Rimuovi da Segmento</option>
                <option value="update_field">Aggiorna Campo</option>
                <option value="api_call">Chiamata API</option>
              </select>
            </div>
            <div className="form-group">
              <label>Valore/Parametri:</label>
              <input
                type="text"
                className="form-input"
                placeholder="Es. 100 punti, VIP, Tag promozionale..."
                value={selectedNode.data.actionValue || ''}
                onChange={(e) => updateNodeData('actionValue', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Condizioni Esecuzione:</label>
              <textarea
                className="form-textarea"
                rows="2"
                placeholder="Es. Solo se cliente attivo, Solo prima volta..."
                value={selectedNode.data.actionConditions || ''}
                onChange={(e) => updateNodeData('actionConditions', e.target.value)}
              />
            </div>
          </div>
        )}

        {selectedNode.data.helpText && (
          <div className="form-group">
            <label>💡 Spiegazione:</label>
            <div className="help-text">{selectedNode.data.helpText}</div>
          </div>
        )}

        <div className="inspector-actions">
          <button 
            className="btn btn-danger btn-small"
            onClick={deleteNode}
          >
            🗑️ Elimina Nodo
          </button>
          <button 
            className="btn btn-info btn-small"
            onClick={duplicateNode}
          >
            📋 Duplica
          </button>
        </div>

        <div className="node-stats">
          <div className="stat-item">
            <span className="stat-label">ID Nodo:</span>
            <span className="stat-value">{selectedNode.id}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Posizione:</span>
            <span className="stat-value">X: {Math.round(selectedNode.position.x)}, Y: {Math.round(selectedNode.position.y)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NodeInspector;