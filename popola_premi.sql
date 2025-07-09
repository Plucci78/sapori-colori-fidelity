-- ===================================================================
-- SCRIPT PER POPOLARE I PREMI DI PRODUZIONE (VERSIONE SUPER DETTAGLIATA)
-- Sapori & Colori
--
-- Questo script prima svuota la tabella dei premi e poi inserisce
-- una nuova lista premium, dettagliata e strategicamente assortita.
-- ===================================================================

-- PASSO 1: Pulisci la tabella dei premi esistenti per partire da zero.
-- Usiamo TRUNCATE per la massima efficienza.
TRUNCATE public.prizes RESTART IDENTITY CASCADE;

-- PASSO 2: Inserisci la nuova lista di premi suddivisa per categorie strategiche.
-- I punti sono bilanciati per un modello "1€ speso = 1-2 GEMME" e per incentivare la raccolta.
INSERT INTO public.prizes
  (name, description, points_cost, active, required_level, image_url)
VALUES
  -- === CATEGORIA: PREMI QUOTIDIANI (Sotto 100 GEMME) ===
  -- Obiettivo: Gratificazione istantanea, facili da raggiungere per tutti.
  ('Caffè Espresso Offerto', 'Un buon caffè per iniziare la giornata, offerto da noi.', 30, true, 'Bronzo', 'https://your-storage-url/caffe-espresso.png'),
  ('Pizzetta Rossa', 'La nostra classica pizzetta al pomodoro, uno spuntino perfetto.', 45, true, 'Bronzo', NULL),
  ('Cappuccino Cremoso', 'Un cremoso cappuccino preparato a regola d''arte.', 50, true, 'Bronzo', 'https://your-storage-url/cappuccino.png'),
  ('Cornetto a Scelta', 'Scegli il tuo cornetto preferito tra crema, cioccolato o marmellata.', 60, true, 'Bronzo', 'https://your-storage-url/cornetto.png'),
  ('Bibita in Lattina', 'Una Coca-Cola, Fanta o altra bibita a scelta per dissetarti.', 70, true, 'Bronzo', NULL),

  -- === CATEGORIA: PAUSA PRANZO GOLOSA (100-250 GEMME) ===
  -- Obiettivo: Premiare i clienti che pranzano regolarmente da noi.
  ('Trancio di Pizza Farcita', 'Un trancio di pizza a scelta tra le nostre ricche specialità del giorno.', 130, true, 'Argento', 'https://your-storage-url/pizza-trancio.png'),
  ('Panino Gourmet', 'Un panino speciale con ingredienti di alta qualità e abbinamenti unici.', 180, true, 'Argento', 'https://your-storage-url/panino-gourmet.png'),
  ('Piatto del Giorno', 'Una porzione del nostro piatto caldo del giorno (es. lasagne, parmigiana).', 220, true, 'Argento', NULL),
  ('Menu Pranzo Completo', 'Un panino classico, una bibita e un caffè per un pranzo perfetto.', 250, true, 'Argento', NULL),

  -- === CATEGORIA: TESORI DEL FORNO (250-500 GEMME) ===
  -- Obiettivo: Incentivare l'acquisto di prodotti da forno da portare a casa.
  ('Sconto 15% sulla Spesa', 'Ottieni uno sconto del 15% sul totale della tua prossima spesa (max 8€ di sconto).', 300, true, 'Oro', NULL),
  ('1 Kg di Pane Casereccio', 'Un chilo del nostro fragrante pane a lievitazione naturale.', 350, true, 'Oro', 'https://your-storage-url/pane-casereccio.png'),
  ('Focaccia Genovese Intera', 'Una teglia della nostra deliziosa focaccia all''olio, perfetta da condividere.', 400, true, 'Oro', NULL),
  ('Vassoio di Pasticceria (500g)', 'Mezzo chilo di pasticcini freschi misti per le occasioni speciali.', 500, true, 'Oro', 'https://your-storage-url/pasticceria.png'),

  -- === CATEGORIA: RICOMPENSE SPECIALI (500-1000 GEMME) ===
  -- Obiettivo: Offrire premi di grande valore per i clienti più fedeli.
  ('Buono Spesa da 15€', 'Un buono da spendere come vuoi su tutti i nostri prodotti.', 750, true, 'Platino', NULL),
  ('Kit Aperitivo per Due', 'Una focaccia, olive, taralli e due bibite per il tuo aperitivo a casa.', 850, true, 'Platino', NULL),
  ('Teglia di Pizza Farcita', 'Una teglia di pizza con i tuoi ingredienti preferiti da portare a casa.', 1000, true, 'Platino', 'https://your-storage-url/pizza-teglia.png'),

  -- === CATEGORIA: PREMI VIP (Oltre 1000 GEMME) ===
  -- Obiettivo: Premi "wow" per i clienti top, da ricordare e raccontare.
  ('Cesto Gastronomico "Sapori & Colori"', 'Una selezione dei nostri migliori prodotti: pane, dolci, salumi e formaggi locali.', 1600, true, 'VIP', NULL),
  ('Torta di Compleanno Personalizzata (1.5kg)', 'Festeggia con noi! Una torta personalizzata per il tuo compleanno (da prenotare).', 2000, true, 'VIP', 'https://your-storage-url/torta-compleanno.png');

-- Messaggio di conferma
SELECT '✅ Lista premi "Deluxe" per il forno gastronomico inserita con successo!' as status;