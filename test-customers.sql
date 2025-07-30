-- Inserisci clienti di test se non esistono
INSERT INTO customers (name, email, phone, points, is_active) VALUES
('Mario Rossi', 'mario.rossi@email.com', '3331234567', 150, true),
('Anna Verdi', 'anna.verdi@email.com', '3339876543', 280, true),
('Luca Bianchi', 'luca.bianchi@email.com', '3335555555', 95, true),
('Sofia Romano', 'sofia.romano@email.com', '3337777777', 320, true)
ON CONFLICT (email) DO NOTHING;