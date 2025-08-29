-- ===================================
-- SISTEMA COMPLETO NOTIFICHE WORKFLOW
-- File: create_notification_system_complete.sql
-- ===================================

-- 1. Tabella principale workflow (se non esiste già)
CREATE TABLE IF NOT EXISTS notification_workflows (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  nodes TEXT NOT NULL, -- JSON dei nodi del workflow
  edges TEXT NOT NULL, -- JSON delle connessioni
  is_active BOOLEAN DEFAULT FALSE,
  trigger_type VARCHAR(100), -- 'daily', 'weekly', 'monthly', 'event', 'manual'
  schedule_config JSONB, -- Configurazione orari/giorni per trigger temporali
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabella per log esecuzioni workflow
CREATE TABLE IF NOT EXISTS workflow_logs (
  id SERIAL PRIMARY KEY,
  workflow_id VARCHAR(255) REFERENCES notification_workflows(id) ON DELETE CASCADE,
  title VARCHAR(500),
  message TEXT,
  recipients_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'sent',
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabella per stato scheduler
CREATE TABLE IF NOT EXISTS scheduler_state (
  trigger_type VARCHAR(100) PRIMARY KEY,
  last_run TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabella per log notifiche (se non esiste già)
CREATE TABLE IF NOT EXISTS notification_logs (
  id SERIAL PRIMARY KEY,
  notification_type VARCHAR(100),
  title VARCHAR(500),
  message TEXT,
  recipients_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'sent',
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Indici per performance
CREATE INDEX IF NOT EXISTS idx_notification_workflows_active ON notification_workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_notification_workflows_trigger ON notification_workflows(trigger_type);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_workflow_id ON workflow_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_executed ON workflow_logs(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_scheduler_state_trigger ON scheduler_state(trigger_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent ON notification_logs(sent_at DESC);

-- 6. Inserimento workflow di esempio aggiornati
INSERT INTO notification_workflows (
  id, 
  name, 
  nodes, 
  edges, 
  is_active,
  trigger_type,
  schedule_config
) VALUES 
-- Workflow compleanno
(
  'birthday-push-001',
  '🎂 Notifiche Push Compleanno',
  '[{
    "id":"1",
    "type":"input",
    "data":{
      "label":"🎂 Compleanno Cliente",
      "nodeType":"trigger",
      "realTrigger":"birthday_check",
      "description":"Si attiva quando un cliente ha il compleanno oggi"
    },
    "position":{"x":300,"y":80},
    "style":{
      "background":"#f59e0b",
      "color":"white",
      "border":"2px solid #d97706",
      "borderRadius":"10px",
      "padding":"12px",
      "minWidth":"200px",
      "textAlign":"center"
    }
  },{
    "id":"2",
    "data":{
      "label":"📱 Push Notification Compleanno",
      "nodeType":"notification",
      "description":"Invia notifica push: È il compleanno di {{nome}}! 🎉"
    },
    "position":{"x":300,"y":200},
    "style":{
      "background":"#10b981",
      "color":"white",
      "border":"2px solid #059669",
      "borderRadius":"10px",
      "padding":"12px",
      "minWidth":"200px",
      "textAlign":"center"
    }
  }]',
  '[{
    "id":"e1-2",
    "source":"1",
    "target":"2",
    "type":"smoothstep",
    "animated":true,
    "style":{"stroke":"#8B4513","strokeWidth":2}
  }]',
  true,
  'birthday',
  '{"description": "Trigger evento compleanno cliente"}'
),

-- Workflow report settimanale
(
  'weekly-report-push-001',
  '📊 Report Settimanale Push',
  '[{
    "id":"1",
    "type":"input",
    "data":{
      "label":"⏰ Ogni Lunedì 09:00",
      "nodeType":"trigger",
      "realTrigger":"weekly_schedule",
      "description":"Si attiva ogni lunedì mattina alle 9:00"
    },
    "position":{"x":300,"y":80},
    "style":{
      "background":"#6366f1",
      "color":"white",
      "border":"2px solid #4f46e5",
      "borderRadius":"10px",
      "padding":"12px",
      "minWidth":"200px",
      "textAlign":"center"
    }
  },{
    "id":"2",
    "data":{
      "label":"📊 Notifica Report",
      "nodeType":"notification",
      "description":"Report settimanale: {{newCustomers}} nuovi clienti, {{totalPoints}} punti totali"
    },
    "position":{"x":300,"y":200},
    "style":{
      "background":"#10b981",
      "color":"white",
      "border":"2px solid #059669",
      "borderRadius":"10px",
      "padding":"12px",
      "minWidth":"200px",
      "textAlign":"center"
    }
  }]',
  '[{
    "id":"e1-2",
    "source":"1",
    "target":"2",
    "type":"smoothstep",
    "animated":true,
    "style":{"stroke":"#8B4513","strokeWidth":2}
  }]',
  false,
  'weekly',
  '{"day": "monday", "hour": 9, "minute": 0, "description": "Ogni lunedì alle 9:00"}'
),

-- Workflow nuovo cliente
(
  'new-customer-push-001',
  '👤 Benvenuto Nuovo Cliente Push',
  '[{
    "id":"1",
    "type":"input",
    "data":{
      "label":"👤 Nuovo Cliente Registrato",
      "nodeType":"trigger",
      "realTrigger":"new_customer",
      "description":"Si attiva quando un nuovo cliente si registra"
    },
    "position":{"x":300,"y":80},
    "style":{
      "background":"#4f46e5",
      "color":"white",
      "border":"2px solid #312e81",
      "borderRadius":"10px",
      "padding":"12px",
      "minWidth":"200px",
      "textAlign":"center"
    }
  },{
    "id":"2",
    "data":{
      "label":"📱 Notifica Nuovo Cliente",
      "nodeType":"notification",
      "description":"Nuovo cliente registrato: {{nome}} si è iscritto al programma loyalty!"
    },
    "position":{"x":300,"y":200},
    "style":{
      "background":"#10b981",
      "color":"white",
      "border":"2px solid #059669",
      "borderRadius":"10px",
      "padding":"12px",
      "minWidth":"200px",
      "textAlign":"center"
    }
  }]',
  '[{
    "id":"e1-2",
    "source":"1",
    "target":"2",
    "type":"smoothstep",
    "animated":true,
    "style":{"stroke":"#8B4513","strokeWidth":2}
  }]',
  false,
  'new_customer',
  '{"description": "Trigger evento nuovo cliente"}'
) 
ON CONFLICT (id) DO NOTHING;

-- 7. Trigger per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_notification_workflows_updated_at ON notification_workflows;
CREATE TRIGGER update_notification_workflows_updated_at
    BEFORE UPDATE ON notification_workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Verifica creazione tabelle
SELECT 'notification_workflows' as table_name, COUNT(*) as records FROM notification_workflows
UNION ALL
SELECT 'workflow_logs' as table_name, COUNT(*) as records FROM workflow_logs
UNION ALL  
SELECT 'scheduler_state' as table_name, COUNT(*) as records FROM scheduler_state
UNION ALL
SELECT 'notification_logs' as table_name, COUNT(*) as records FROM notification_logs;

-- 9. Mostra workflow di esempio creati
SELECT 
  id,
  name,
  trigger_type,
  is_active,
  created_at
FROM notification_workflows 
ORDER BY created_at DESC;