-- Inserisci abbonamenti di test
-- Prima assicuriamoci che ci siano i piani base
INSERT INTO subscription_plans (name, description, price, duration_days, max_usage, products_included, gradient_colors, icon_name, savings_amount, is_popular) VALUES
('Pizza del Mese', '4 Pizze Grandi + 4 Bibite', 34.90, 30, 4, '["pizza_grande", "bibita"]', 'linear-gradient(135deg, #ff6b6b, #ee5a24)', 'Pizza', 15.10, true),
('Coffee Daily', 'Caffè + Brioche ogni giorno', 39.90, 30, 30, '["caffe", "brioche"]', 'linear-gradient(135deg, #8b4513, #d2691e)', 'Coffee', 20.10, false),
('Lunch Business', 'Pranzo Lun-Ven completo', 79.90, 30, 22, '["primo", "secondo", "contorno", "bibita"]', 'linear-gradient(135deg, #2d3748, #4a5568)', 'Lunch', 40.10, false)
ON CONFLICT (name) DO NOTHING;

-- Ora creiamo alcuni abbonamenti attivi per clienti esistenti
-- (Questi SQL useranno i piani e clienti esistenti)
DO $$
DECLARE
    customer_ids UUID[];
    plan_ids UUID[];
    customer_id UUID;
    plan_id UUID;
BEGIN
    -- Prendi alcuni clienti esistenti
    SELECT ARRAY(SELECT id FROM customers WHERE is_active = true LIMIT 3) INTO customer_ids;
    
    -- Prendi alcuni piani esistenti
    SELECT ARRAY(SELECT id FROM subscription_plans WHERE is_active = true LIMIT 3) INTO plan_ids;
    
    -- Se abbiamo clienti e piani, crea abbonamenti
    IF array_length(customer_ids, 1) > 0 AND array_length(plan_ids, 1) > 0 THEN
        
        -- Abbonamento attivo 1 (2 utilizzi su 4)
        customer_id := customer_ids[1];
        plan_id := plan_ids[1];
        
        INSERT INTO customer_subscriptions (
            customer_id, plan_id, start_date, end_date, status, 
            remaining_usage, total_used, total_amount_paid, payment_method
        ) VALUES (
            customer_id, plan_id, 
            CURRENT_DATE - INTERVAL '5 days',
            CURRENT_DATE + INTERVAL '25 days',
            'active', 2, 2, 34.90, 'cash'
        ) ON CONFLICT DO NOTHING;
        
        -- Abbonamento attivo 2 (5 utilizzi su 30)
        IF array_length(customer_ids, 1) > 1 THEN
            customer_id := customer_ids[2];
            plan_id := plan_ids[2];
            
            INSERT INTO customer_subscriptions (
                customer_id, plan_id, start_date, end_date, status, 
                remaining_usage, total_used, total_amount_paid, payment_method
            ) VALUES (
                customer_id, plan_id,
                CURRENT_DATE - INTERVAL '10 days',
                CURRENT_DATE + INTERVAL '20 days',
                'active', 25, 5, 39.90, 'card'
            ) ON CONFLICT DO NOTHING;
        END IF;
        
        -- Abbonamento in scadenza (3 giorni rimasti)
        IF array_length(customer_ids, 1) > 2 THEN
            customer_id := customer_ids[3];
            plan_id := plan_ids[3];
            
            INSERT INTO customer_subscriptions (
                customer_id, plan_id, start_date, end_date, status, 
                remaining_usage, total_used, total_amount_paid, payment_method
            ) VALUES (
                customer_id, plan_id,
                CURRENT_DATE - INTERVAL '27 days',
                CURRENT_DATE + INTERVAL '3 days',
                'active', 10, 12, 79.90, 'cash'
            ) ON CONFLICT DO NOTHING;
        END IF;
        
    END IF;
END $$;