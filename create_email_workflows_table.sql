-- SQL per creare la tabella email_workflows nel database Supabase
-- Esegui questo nel SQL Editor del dashboard di Supabase

CREATE TABLE email_workflows (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  nodes TEXT NOT NULL, -- JSON dei nodi del workflow
  edges TEXT NOT NULL, -- JSON delle connessioni
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserimento di un workflow di esempio
INSERT INTO email_workflows (
  id, 
  name, 
  nodes, 
  edges, 
  is_active
) VALUES (
  'welcome-workflow-001',
  '🎯 Workflow Benvenuto Automatico',
  '[{"id":"1","type":"input","data":{"label":"🎯 Nuovo Cliente Registrato","nodeType":"trigger","description":"Trigger: Si attiva quando un nuovo cliente si registra al programma loyalty"},"position":{"x":300,"y":80},"style":{"background":"#4f46e5","color":"white","border":"2px solid #312e81","borderRadius":"10px","padding":"12px","minWidth":"200px","textAlign":"center"}},{"id":"2","data":{"label":"📧 Email di Benvenuto","nodeType":"email","description":"Invia email di benvenuto con codice sconto 10%"},"position":{"x":300,"y":200},"style":{"background":"#059669","color":"white","border":"2px solid #047857","borderRadius":"10px","padding":"12px","minWidth":"200px","textAlign":"center"}}]',
  '[{"id":"e1-2","source":"1","target":"2","type":"smoothstep","animated":true,"style":{"stroke":"#8B4513","strokeWidth":2}}]',
  false
);

-- Verifica che sia stato creato correttamente
SELECT * FROM email_workflows;