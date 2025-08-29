-- Workflow di notifica push per NFC scans
INSERT INTO notification_workflows (
  id, 
  name, 
  nodes, 
  edges, 
  is_active,
  trigger_type,
  schedule_config
) VALUES (
  'nfc-scan-notification-001',
  '📲 Notifica Scansione NFC',
  '[{"id":"1","type":"input","data":{"label":"📲 Scansione NFC","nodeType":"trigger","realTrigger":"nfc_scan","description":"Si attiva quando un cliente scannerizza il tag NFC"},"position":{"x":300,"y":80},"style":{"background":"#3b82f6","color":"white","border":"2px solid #2563eb","borderRadius":"10px","padding":"12px","minWidth":"200px","textAlign":"center"}},{"id":"2","data":{"label":"📱 Push Notification","nodeType":"notification","description":"Invia notifica push al cliente"},"position":{"x":300,"y":200},"style":{"background":"#10b981","color":"white","border":"2px solid #059669","borderRadius":"10px","padding":"12px","minWidth":"200px","textAlign":"center"}}]',
  '[{"id":"e1-2","source":"1","target":"2","type":"smoothstep","animated":true,"style":{"stroke":"#8B4513","strokeWidth":2}}]',
  true,
  'nfc_scan',
  '{"description": "Trigger scansione NFC del cliente"}'
);
