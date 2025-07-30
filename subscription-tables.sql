-- ===================================
-- SISTEMA ABBONAMENTI - TABELLE DATABASE
-- Schema completo per gestione abbonamenti ricorrenti
-- ===================================

-- 1. Tabella piani abbonamento disponibili
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration_days INTEGER NOT NULL DEFAULT 30,
    max_usage INTEGER NOT NULL DEFAULT 1,
    products_included JSONB DEFAULT '[]'::jsonb,
    gradient_colors VARCHAR(100) DEFAULT 'linear-gradient(135deg, #667eea, #764ba2)',
    icon_name VARCHAR(50) DEFAULT 'Pizza',
    savings_amount DECIMAL(10,2) DEFAULT 0,
    is_popular BOOLEAN DEFAULT FALSE,
    is_premium BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabella abbonamenti clienti
CREATE TABLE IF NOT EXISTS customer_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired', 'cancelled')),
    auto_renew BOOLEAN DEFAULT TRUE,
    remaining_usage INTEGER NOT NULL,
    total_used INTEGER DEFAULT 0,
    total_amount_paid DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cash',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabella utilizzi abbonamento
CREATE TABLE IF NOT EXISTS subscription_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subscription_id UUID REFERENCES customer_subscriptions(id) ON DELETE CASCADE,
    used_date DATE DEFAULT CURRENT_DATE,
    product_used VARCHAR(100),
    original_price DECIMAL(10,2),
    amount_saved DECIMAL(10,2),
    staff_member VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabella rinnovi abbonamento (storico)
CREATE TABLE IF NOT EXISTS subscription_renewals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subscription_id UUID REFERENCES customer_subscriptions(id) ON DELETE CASCADE,
    renewal_date DATE NOT NULL,
    old_end_date DATE NOT NULL,
    new_end_date DATE NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cash',
    auto_renewed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_customer_id ON customer_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_status ON customer_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_end_date ON customer_subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_subscription_id ON subscription_usage(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_used_date ON subscription_usage(used_date);

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_subscriptions_updated_at BEFORE UPDATE ON customer_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger per aggiornare remaining_usage quando si usa l'abbonamento
CREATE OR REPLACE FUNCTION update_subscription_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Decrementa remaining_usage e incrementa total_used
    UPDATE customer_subscriptions 
    SET 
        remaining_usage = remaining_usage - 1,
        total_used = total_used + 1,
        updated_at = NOW()
    WHERE id = NEW.subscription_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_usage_count AFTER INSERT ON subscription_usage FOR EACH ROW EXECUTE FUNCTION update_subscription_usage_count();

-- Funzione per controllare abbonamenti scaduti
CREATE OR REPLACE FUNCTION check_expired_subscriptions()
RETURNS VOID AS $$
BEGIN
    UPDATE customer_subscriptions 
    SET status = 'expired'
    WHERE end_date < CURRENT_DATE 
    AND status = 'active';
END;
$$ language 'plpgsql';

-- Inserisci piani abbonamento di esempio
INSERT INTO subscription_plans (name, description, price, duration_days, max_usage, products_included, gradient_colors, icon_name, savings_amount, is_popular) VALUES
('Pizza del Mese', '4 Pizze Grandi + 4 Bibite', 34.90, 30, 4, '["pizza_grande", "bibita"]', 'linear-gradient(135deg, #ff6b6b, #ee5a24)', 'Pizza', 15.10, true),
('Coffee Daily', 'Caffè + Brioche ogni giorno', 39.90, 30, 30, '["caffe", "brioche"]', 'linear-gradient(135deg, #8b4513, #d2691e)', 'Coffee', 20.10, false),
('Lunch Business', 'Pranzo Lun-Ven completo', 79.90, 30, 22, '["primo", "secondo", "contorno", "bibita"]', 'linear-gradient(135deg, #2d3748, #4a5568)', 'Lunch', 40.10, false),
('Weekend Family', 'Menu famiglia x4 weekend', 24.90, 7, 2, '["menu_famiglia"]', 'linear-gradient(135deg, #667eea, #764ba2)', 'Family', 10.10, false)
ON CONFLICT (name) DO NOTHING;

-- View per statistiche abbonamenti
CREATE OR REPLACE VIEW subscription_stats AS
SELECT 
    sp.name as plan_name,
    COUNT(cs.id) as active_subscriptions,
    SUM(cs.total_amount_paid) as total_revenue,
    AVG(cs.total_used::float / (sp.max_usage - cs.remaining_usage + cs.total_used)) as avg_usage_rate,
    COUNT(CASE WHEN cs.end_date <= CURRENT_DATE + INTERVAL '7 days' THEN 1 END) as expiring_soon
FROM subscription_plans sp
LEFT JOIN customer_subscriptions cs ON sp.id = cs.plan_id AND cs.status = 'active'
GROUP BY sp.id, sp.name, sp.max_usage;

-- View per abbonamenti clienti con dettagli
CREATE OR REPLACE VIEW customer_subscription_details AS
SELECT 
    cs.id,
    c.name as customer_name,
    c.email as customer_email,
    sp.name as plan_name,
    sp.description as plan_description,
    cs.start_date,
    cs.end_date,
    cs.status,
    cs.remaining_usage,
    cs.total_used,
    sp.max_usage,
    (cs.end_date - CURRENT_DATE) as days_remaining,
    cs.auto_renew,
    cs.total_amount_paid
FROM customer_subscriptions cs
JOIN customers c ON cs.customer_id = c.id
JOIN subscription_plans sp ON cs.plan_id = sp.id;

COMMENT ON TABLE subscription_plans IS 'Piani abbonamento disponibili per i clienti';
COMMENT ON TABLE customer_subscriptions IS 'Abbonamenti attivi/passati dei clienti';
COMMENT ON TABLE subscription_usage IS 'Storico utilizzi degli abbonamenti';
COMMENT ON TABLE subscription_renewals IS 'Storico rinnovi abbonamenti';