# 📧 Informazioni Aziendali nelle Email - Sapori & Colori

## 📍 Dove Modificare le Informazioni Aziendali

### 1. Email Livelli (Oro, Argento, Platino, etc.)
**File:** `/src/utils/levelEmailUtils.js`
**Righe:** 117-120
**Informazioni attuali:**
- Indirizzo: Via Bagaladi 9, 00132 Roma
- Telefono: 0639911640
- Sito: saporiecolori.net

```javascript
<p style="color: #999; font-size: 14px; text-align: center;">
  Grazie per essere un cliente ${level.name} di Sapori & Colori!<br>
  Via Bagaladi 9, 00132 Roma • Tel: 0639911640 • saporiecolori.net
</p>
```

### 2. Email Template Automatici (Benvenuto, Compleanno, Milestone GEMME)
**File:** `/src/components/Email/emailTemplates.js`

**Logo nel header (righe 28-32):**
```html
<img src="https://jexkalekaofsfcusdfjh.supabase.co/storage/v1/object/public/tinymce-images//saporiecolorilogo2.png" alt="Sapori & Colori" style="height: 60px; margin-bottom: 10px;" />
```

**Footer informazioni aziendali (righe 57-63):**
```html
<tr>
  <td style="background-color: #1a1a1a; padding: 30px; text-align: center;">
    <p style="margin: 0 0 10px 0; color: #e0e0e0; font-size: 14px;">
      Via Bagaladi 9, 00132 Roma • Tel: 0639911640 • saporiecolori.net
    </p>
    <p style="margin: 0; color: #a0a0a0; font-size: 12px;">
      © 2024 Sapori & Colori. Tutti i diritti riservati.
    </p>
  </td>
</tr>
```

### 3. Database Template Automatici
**File:** `/create-automatic-templates-tables.sql`
**Cerca:** "Via Example" per trovare i template nel database

### 4. Email Newsletter e Altri Template
**File:** `/src/components/Email/emailTemplates.js`
**Cerca nel file:** "Via Example" o "Tel: 06"

## 🛠️ Come Modificare

1. **Apri il file** che contiene le informazioni da modificare
2. **Cerca** le stringhe: "Via Bagaladi", "0639911640", "saporiecolori.net"
3. **Sostituisci** con le nuove informazioni
4. **Salva** il file
5. **Riavvia** l'applicazione se necessario

## ⚠️ Attenzione

- Le modifiche ai file `.js` richiedono il riavvio dell'applicazione
- Le modifiche al database (`create-automatic-templates-tables.sql`) devono essere applicate eseguendo lo script SQL
- Alcuni template potrebbero essere salvati nel database e modificabili dall'interfaccia admin

## 📝 Testi Email Livelli (Oro, Argento, Platino, etc.)

### Dove Modificare i Contenuti delle Email Livelli
**File:** `/src/utils/levelEmailUtils.js`
**Funzione:** `generateLevelEmailContent` (righe 70-126)

### Testi Attuali:

**Subject Email:**
```javascript
const subject = `🎉 ${customerName}, hai raggiunto il livello ${level.name}!`
```

**Titolo Principale:**
```html
<h1 style="color: white; margin: 0; font-size: 32px;">Livello ${level.name}!</h1>
<p style="color: rgba(255,255,255,0.9); font-size: 18px; margin: 10px 0 0;">Complimenti ${customerName}!</p>
```

**Messaggio Centrale:**
```html
<h2 style="color: #333; text-align: center; margin-bottom: 20px;">Nuovo traguardo raggiunto! 🎯</h2>

<p style="color: #666; font-size: 16px; line-height: 1.6; text-align: center;">
  Con ${gems} GEMME hai sbloccato il prestigioso livello <strong style="color: ${level.primary_color};">${level.name}</strong>!
  Continua così per sbloccare premi ancora più esclusivi.
</p>
```

**Vantaggi (dinamici dal database):**
```html
<h3 style="color: ${level.primary_color}; margin-top: 0; text-align: center;">I tuoi vantaggi ${level.name}:</h3>
<ul style="color: #666; line-height: 1.8; text-align: center; list-style: none; padding: 0;">
  <li style="margin: 10px 0;">✨ Accesso a premi esclusivi del livello ${level.name}</li>
  <li style="margin: 10px 0;">🎁 Offerte personalizzate riservate</li>
  <li style="margin: 10px 0;">⭐ Priorità nelle promozioni speciali</li>
  <li style="margin: 10px 0;">🚀 A ${level.max_gems + 1} GEMME sblocchi il livello successivo!</li>
</ul>
```

**Pulsante Call-to-Action:**
```html
<a href="${window.location.origin}" style="background: linear-gradient(135deg, ${level.primary_color} 0%, #1e293b 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">Scopri i tuoi premi!</a>
```

### Come Personalizzare i Testi:

1. **Oggetto Email:** Modifica la variabile `subject` (riga 71)
2. **Titoli:** Modifica i tag `<h1>` e `<h2>` nel contenuto HTML
3. **Messaggi:** Modifica i paragrafi `<p>` per cambiare il tono e contenuto
4. **Vantaggi:** I vantaggi specifici sono gestiti dinamicamente dal pannello impostazioni
5. **Pulsante:** Modifica il testo del link (attualmente "Scopri i tuoi premi!")

## 📱 Informazioni Attuali

**Indirizzo Completo:** Via Bagaladi 9, 00132 Roma  
**Telefono:** 0639911640  
**Sito Web:** saporiecolori.net  
**Email:** (da definire se necessaria)

## 🔄 Aggiornamento Database

Se hai modificato i template nel database, puoi aggiornare le informazioni aziendali direttamente da Supabase:

```sql
UPDATE automatic_templates 
SET html = REPLACE(html, 'Via Example 123, Roma', 'Via Bagaladi 9, 00132 Roma')
WHERE html LIKE '%Via Example%';

UPDATE automatic_templates 
SET html = REPLACE(html, 'Tel: 06 1234567', 'Tel: 0639911640')
WHERE html LIKE '%Tel: 06%';
```

---
*Ultima modifica: Dicembre 2024*