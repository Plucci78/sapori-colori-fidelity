-- Tabella per le campagne email create con il wizard
CREATE TABLE IF NOT EXISTS email_campaigns (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    preview_text VARCHAR(500),
    content TEXT,
    
    -- Destinatari
    recipient_type VARCHAR(50) NOT NULL DEFAULT 'all', -- 'all', 'segment', 'custom', 'uploaded'
    recipient_segment VARCHAR(50), -- 'bronze', 'silver', 'gold', 'platinum', 'new', 'active', 'dormant'
    selected_customers JSONB, -- Array di ID clienti per selezione custom
    uploaded_contacts JSONB, -- Contatti caricati via CSV
    total_recipients INTEGER DEFAULT 0,
    
    -- Programmazione
    send_type VARCHAR(20) NOT NULL DEFAULT 'now', -- 'now' or 'scheduled'
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Stato
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'
    
    -- Template e contenuto
    template_used VARCHAR(255),
    template_data JSONB, -- Dati del template utilizzato
    
    -- Opzioni
    enable_tracking BOOLEAN DEFAULT true,
    enable_followup BOOLEAN DEFAULT false,
    
    -- Statistiche
    emails_sent INTEGER DEFAULT 0,
    emails_delivered INTEGER DEFAULT 0,
    emails_opened INTEGER DEFAULT 0,
    emails_clicked INTEGER DEFAULT 0,
    emails_bounced INTEGER DEFAULT 0,
    emails_unsubscribed INTEGER DEFAULT 0,
    
    -- Metadati
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Indici per performance
    CONSTRAINT check_send_type CHECK (send_type IN ('now', 'scheduled')),
    CONSTRAINT check_status CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),
    CONSTRAINT check_recipient_type CHECK (recipient_type IN ('all', 'segment', 'custom', 'uploaded'))
);

-- Indici per migliorare le performance
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_scheduled_at ON email_campaigns(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at ON email_campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_recipient_type ON email_campaigns(recipient_type);

-- Tabella per i flussi di automazione (Flow Builder)
CREATE TABLE IF NOT EXISTS email_flows (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Trigger che avvia il flusso
    trigger_type VARCHAR(50) NOT NULL, -- 'new_customer', 'birthday', 'purchase', 'cart_abandoned', 'level_up', 'manual'
    trigger_conditions JSONB, -- Condizioni specifiche per il trigger
    
    -- Configurazione del flusso
    flow_steps JSONB NOT NULL, -- Array di step del flusso con condizioni e azioni
    
    -- Stato
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'paused', 'archived'
    
    -- Statistiche
    total_entries INTEGER DEFAULT 0, -- Quante volte è stato attivato
    active_customers INTEGER DEFAULT 0, -- Clienti attualmente nel flusso
    completed_customers INTEGER DEFAULT 0, -- Clienti che hanno completato il flusso
    
    -- Metadati
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT check_flow_status CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    CONSTRAINT check_trigger_type CHECK (trigger_type IN ('new_customer', 'birthday', 'purchase', 'cart_abandoned', 'level_up', 'manual'))
);

-- Indici per email_flows
CREATE INDEX IF NOT EXISTS idx_email_flows_status ON email_flows(status);
CREATE INDEX IF NOT EXISTS idx_email_flows_trigger_type ON email_flows(trigger_type);
CREATE INDEX IF NOT EXISTS idx_email_flows_created_at ON email_flows(created_at DESC);

-- Tabella per tracciare i clienti nei flussi
CREATE TABLE IF NOT EXISTS email_flow_entries (
    id BIGSERIAL PRIMARY KEY,
    flow_id BIGINT NOT NULL REFERENCES email_flows(id) ON DELETE CASCADE,
    customer_id BIGINT NOT NULL,
    
    -- Stato nel flusso
    current_step INTEGER NOT NULL DEFAULT 0, -- Step attuale (0 = non iniziato)
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'completed', 'failed', 'paused'
    
    -- Timing
    entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_step_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    next_action_at TIMESTAMP WITH TIME ZONE, -- Quando eseguire la prossima azione
    
    -- Dati del flusso
    flow_data JSONB, -- Dati specifici per questo cliente in questo flusso
    step_history JSONB DEFAULT '[]'::jsonb, -- Storia degli step completati
    
    -- Metadati
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT check_entry_status CHECK (status IN ('active', 'completed', 'failed', 'paused')),
    UNIQUE(flow_id, customer_id) -- Un cliente può essere in un flusso una sola volta
);

-- Indici per email_flow_entries
CREATE INDEX IF NOT EXISTS idx_email_flow_entries_flow_id ON email_flow_entries(flow_id);
CREATE INDEX IF NOT EXISTS idx_email_flow_entries_customer_id ON email_flow_entries(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_flow_entries_status ON email_flow_entries(status);
CREATE INDEX IF NOT EXISTS idx_email_flow_entries_next_action ON email_flow_entries(next_action_at) WHERE status = 'active' AND next_action_at IS NOT NULL;

-- Tabella per le azioni programmate (coda di esecuzione)
CREATE TABLE IF NOT EXISTS email_scheduled_actions (
    id BIGSERIAL PRIMARY KEY,
    
    -- Riferimenti
    flow_id BIGINT REFERENCES email_flows(id) ON DELETE CASCADE,
    flow_entry_id BIGINT REFERENCES email_flow_entries(id) ON DELETE CASCADE,
    campaign_id BIGINT REFERENCES email_campaigns(id) ON DELETE CASCADE,
    customer_id BIGINT NOT NULL,
    
    -- Azione
    action_type VARCHAR(50) NOT NULL, -- 'send_email', 'wait', 'add_tag', 'update_field', 'webhook'
    action_data JSONB NOT NULL,
    
    -- Programmazione
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE,
    
    -- Stato
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'executing', 'completed', 'failed', 'cancelled'
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Metadati
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT check_action_status CHECK (status IN ('pending', 'executing', 'completed', 'failed', 'cancelled')),
    CONSTRAINT check_action_type CHECK (action_type IN ('send_email', 'wait', 'add_tag', 'update_field', 'webhook'))
);

-- Indici per email_scheduled_actions
CREATE INDEX IF NOT EXISTS idx_scheduled_actions_scheduled_at ON email_scheduled_actions(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_actions_status ON email_scheduled_actions(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_actions_flow_entry ON email_scheduled_actions(flow_entry_id);

-- Trigger per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Applica il trigger a tutte le tabelle
CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON email_campaigns FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_email_flows_updated_at BEFORE UPDATE ON email_flows FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_email_flow_entries_updated_at BEFORE UPDATE ON email_flow_entries FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_email_scheduled_actions_updated_at BEFORE UPDATE ON email_scheduled_actions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Funzione per pulire le azioni completate più vecchie di 30 giorni
CREATE OR REPLACE FUNCTION cleanup_old_scheduled_actions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM email_scheduled_actions 
    WHERE status = 'completed' 
    AND executed_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Commenti per documentazione
COMMENT ON TABLE email_campaigns IS 'Campagne email create con il wizard - invii singoli e programmati';
COMMENT ON TABLE email_flows IS 'Flussi di automazione email con trigger e condizioni';
COMMENT ON TABLE email_flow_entries IS 'Traccia i clienti all''interno dei flussi di automazione';
COMMENT ON TABLE email_scheduled_actions IS 'Coda delle azioni programmate da eseguire';

COMMENT ON COLUMN email_campaigns.recipient_type IS 'Tipo di destinatari: all, segment, custom, uploaded';
COMMENT ON COLUMN email_campaigns.send_type IS 'Tipo di invio: now (immediato) o scheduled (programmato)';
COMMENT ON COLUMN email_flows.flow_steps IS 'Configurazione JSON degli step del flusso con condizioni e azioni';
COMMENT ON COLUMN email_flow_entries.step_history IS 'Storia cronologica degli step completati dal cliente';
COMMENT ON COLUMN email_scheduled_actions.action_type IS 'Tipo di azione: send_email, wait, add_tag, update_field, webhook';