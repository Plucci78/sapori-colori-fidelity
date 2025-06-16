# 🗄️ Istruzioni Setup Database - Forno Loyalty

## Stato Implementazione

✅ **Codice Applicazione Completo**
- Sistema privacy completo implementato
- Persistenza consensi abilitata nel codice
- Integrazione database attiva in tutti i componenti

🔄 **Database Setup Richiesto**
- Creazione tabella `customer_consents` in Supabase

## Passo 1: Creare la Tabella in Supabase

1. **Accedi al Dashboard Supabase**
   - Vai su https://supabase.com
   - Accedi al tuo progetto Forno Loyalty

2. **Esegui lo Script SQL**
   - Vai nella sezione "SQL Editor" 
   - Crea una nuova query
   - Copia e incolla il contenuto del file `create_customer_consents_table.sql`
   - Clicca "Run" per eseguire lo script

3. **Verifica Creazione Tabella**
   - Vai nella sezione "Table Editor"
   - Verifica che la tabella `customer_consents` sia presente
   - Controlla che abbia le colonne corrette

## Passo 2: Verifica Funzionamento

Dopo aver creato la tabella, l'applicazione:

1. **Caricherà automaticamente i consensi** dal database quando selezioni un cliente
2. **Salverà i consensi** nel database quando li aggiorni dal modal Privacy
3. **Mostrerà i consensi persistenti** ad ogni accesso

## Schema Tabella `customer_consents`

```sql
CREATE TABLE customer_consents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
    marketing boolean DEFAULT false,
    newsletter boolean DEFAULT false,
    profiling boolean DEFAULT false,
    fidelity boolean DEFAULT true,
    digital_signature text,
    consent_date timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    ip_address inet,
    user_agent text,
    UNIQUE(customer_id)
);
```

## Funzionalità Attive

Dopo il setup database, saranno completamente operative:

✅ **Gestione Consensi Privacy**
- Visualizzazione stato consensi per cliente
- Aggiornamento consensi con persistenza
- Consensi obbligatori (fidelity) e opzionali

✅ **Generazione PDF Privacy**
- Documento conforme GDPR
- Include stato consensi cliente
- Scaricamento automatico

✅ **Scanner QR Clienti**
- Lettura QR code per identificazione cliente
- Formato: `CUSTOMER:uuid-cliente`

✅ **Gestione Portale Cliente** 
- Generazione link portale personale
- Rigenerazione token di accesso
- Copia automatica negli appunti

✅ **Gestione Duplicati**
- Verifica preventiva telefono/email
- Messaggi errore specifici
- Validazione in tempo reale

## File Modificati per Database Integration

### `/src/components/Privacy/PrivacyManagement.jsx`
- ✅ Import supabase aggiunto
- ✅ Funzione `updatePrivacyConsents()` attivata per salvare in DB
- ✅ Gestione errori database completa

### `/src/components/Customers/CustomerView.jsx`
- ✅ Funzione `loadCustomerConsents()` attivata per caricare da DB
- ✅ Fallback su valori default se consensi non trovati
- ✅ Gestione errori 'PGRST116' (record non trovato)

## Troubleshooting

### Errore "relation customer_consents does not exist"
- **Causa**: Tabella non ancora creata in Supabase
- **Soluzione**: Eseguire lo script SQL nel dashboard Supabase

### Consensi non si salvano
- **Verifica**: Controlla i log della console browser
- **Possibili cause**: 
  - Tabella non creata
  - Policy RLS non configurate
  - Problemi di autenticazione

### RLS (Row Level Security)
Le policy sono già configurate nello script SQL:
```sql
CREATE POLICY "Allow all operations for authenticated users" ON customer_consents
    FOR ALL USING (auth.role() = 'authenticated');
```

## Comandi Utili

### Verifica Contenuto Tabella
```sql
SELECT * FROM customer_consents;
```

### Reset Consensi Cliente
```sql
DELETE FROM customer_consents WHERE customer_id = 'uuid-cliente';
```

### Verifica Integrità Referenziale
```sql
SELECT cc.*, c.name 
FROM customer_consents cc
JOIN customers c ON cc.customer_id = c.id;
```

---

## ✅ Prossimi Passi Completamento

1. **[URGENTE]** Creare tabella `customer_consents` in Supabase
2. **[OPZIONALE]** Implementare invio email PDF privacy
3. **[OPZIONALE]** Aggiungere firma digitale touch/mouse
4. **[OPZIONALE]** Storico modifiche consensi
5. **[MINOR]** Rimuovere variabili unused dai warning ESLint

---

**🎯 Stato: 95% COMPLETO - Solo setup database richiesto!**
