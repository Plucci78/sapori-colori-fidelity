-- SQL per creare la tabella notification_workflows nel database Supabase
-- Esegui questo nel SQL Editor del dashboard di Supabase

CREATE TABLE notification_workflows (
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

-- Inserimento di workflow di esempio per notifiche push
INSERT INTO notification_workflows (
  id, 
  name, 
  nodes, 
  edges, 
  is_active,
  trigger_type,
  schedule_config
) VALUES (
  'birthday-notification-001',
  '🎂 Notifiche Compleanno Clienti',
  '[{"id":"1","type":"input","data":{"label":"🎂 Compleanno Cliente","nodeType":"trigger","realTrigger":"birthday_check","description":"Si attiva quando un cliente ha il compleanno oggi"},"position":{"x":300,"y":80},"style":{"background":"#f59e0b","color":"white","border":"2px solid #d97706","borderRadius":"10px","padding":"12px","minWidth":"200px","textAlign":"center"}},{"id":"2","data":{"label":"📱 Push Notification","nodeType":"notification","description":"Invia notifica push al team"},"position":{"x":300,"y":200},"style":{"background":"#10b981","color":"white","border":"2px solid #059669","borderRadius":"10px","padding":"12px","minWidth":"200px","textAlign":"center"}}]',
  '[{"id":"e1-2","source":"1","target":"2","type":"smoothstep","animated":true,"style":{"stroke":"#8B4513","strokeWidth":2}}]',
  true,
  'event',
  '{"description": "Trigger evento compleanno cliente"}'
),
(
  'weekly-report-001',
  '📊 Report Settimanale',
  '[{"id":"1","type":"input","data":{"label":"⏰ Ogni Lunedì 09:00","nodeType":"trigger","realTrigger":"weekly_schedule","description":"Si attiva ogni lunedì mattina alle 9:00"},"position":{"x":300,"y":80},"style":{"background":"#6366f1","color":"white","border":"2px solid #4f46e5","borderRadius":"10px","padding":"12px","minWidth":"200px","textAlign":"center"}},{"id":"2","data":{"label":"📊 Controlla Statistiche","nodeType":"condition","description":"Controlla le statistiche della settimana"},"position":{"x":300,"y":200},"style":{"background":"#f59e0b","color":"white","border":"2px solid #d97706","borderRadius":"10px","padding":"12px","minWidth":"200px","textAlign":"center"}},{"id":"3","data":{"label":"📱 Notifica Report","nodeType":"notification","description":"Invia report settimanale via push"},"position":{"x":300,"y":320},"style":{"background":"#10b981","color":"white","border":"2px solid #059669","borderRadius":"10px","padding":"12px","minWidth":"200px","textAlign":"center"}}]',
  '[{"id":"e1-2","source":"1","target":"2","type":"smoothstep","animated":true,"style":{"stroke":"#8B4513","strokeWidth":2}},{"id":"e2-3","source":"2","target":"3","type":"smoothstep","animated":true,"style":{"stroke":"#8B4513","strokeWidth":2}}]',
  false,
  'weekly',
  '{"day": "monday", "hour": 9, "minute": 0, "description": "Ogni lunedì alle 9:00"}'
);

-- Crea indici per performance
CREATE INDEX IF NOT EXISTS idx_notification_workflows_active ON notification_workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_notification_workflows_trigger ON notification_workflows(trigger_type);
CREATE INDEX IF NOT EXISTS idx_notification_workflows_created ON notification_workflows(created_at DESC);

-- Verifica che sia stato creato correttamente
SELECT * FROM notification_workflows;