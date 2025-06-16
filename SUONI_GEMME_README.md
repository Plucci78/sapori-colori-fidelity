# 🔊 Sistema Suoni GEMME - Guida Completa ✨

## 📋 **Panoramica**
Il sistema di suoni delle GEMME fornisce feedback audio differenziato per le operazioni di aggiunta e rimozione punti nella sezione "Gestione Manuale GEMME", con la possibilità di scegliere tra diversi suoni per la rimozione.

## 🎯 **Funzionalità Implementate**

### ✅ **Suoni Automatici con Scelta**
- **Aggiunta GEMME** → Suono positivo (`coin.wav`)
- **Rimozione GEMME** → **Due opzioni**:
  - 🔴 **Standard**: `lose.wav` (suono principale)
  - ⚠️ **Alternativo**: `remove.wav` (suono alternativo)
- **Volume dinamico** → Si adatta alla quantità di GEMME modificate
- **Selettore interfaccia** → Cambia tipo suono in tempo reale

### ✅ **Controlli Avanzati**
- **Selettore "Suono (-)"** → Scegli tra lose.wav e remove.wav
- **🔊 Test Tutti** → Testa tutti i suoni in sequenza
- **🔊 (-)** → Testa solo il suono di rimozione selezionato
- **Quick Actions** (-10, -5, +5, +10) → Usano le preferenze

## 🚀 **Come Testare**

### 1️⃣ **Test Rapido Completo**
1. Vai in "Gestione Clienti" → "Gestione Manuale GEMME"
2. Clicca **"🔊 Test Tutti"** per sentire:
   - Aggiunta GEMME (+10)
   - Rimozione Standard (-10)  
   - Rimozione Alternativo (-10)

### 2️⃣ **Test Suono Specifico**
1. Nel selettore **"Suono (-)"** scegli:
   - 🔴 `lose.wav` (suono principale)
   - ⚠️ `remove.wav` (suono alternativo)
2. Clicca **"🔊 (-)"** per testare solo quello selezionato

### 3️⃣ **Test con Cliente Reale**
1. Cerca un cliente nella sezione
2. **Scegli il suono** nel selettore
3. Usa i pulsanti quick-action o input personalizzato
4. **Il suono cambierà** in base alla tua selezione!

## 📁 **File Audio Disponibili**

### 📍 **Posizione**: `/public/sounds/`
- `coin.wav` → 🟢 **Aggiunta GEMME** (suono positivo per +)
- `lose.wav` → 🔴 **Rimozione Standard** (suono principale per -)
- `remove.wav` → ⚠️ **Rimozione Alternativo** (suono alternativo per -)

### 🔄 **Personalizzazione**
Per sostituire i suoni:
1. Sostituisci i file `.wav` in `/public/sounds/`
2. Mantieni gli stessi nomi dei file
3. **Formato consigliato**: WAV, durata 0.5-2 secondi, volume moderato
4. **Suggerimenti**:
   - `coin.wav` → Suono allegro/positivo (monete, campanello)
   - `lose.wav` → Suono neutro/serio (clic profondo, beep basso)  
   - `remove.wav` → Suono alternativo (pop, swoosh)

## ⚙️ **Configurazione Tecnica**

### 🎚️ **Volume**
- Volume base: **60%**
- Volume dinamico: si adatta alla quantità di GEMME
- Volume massimo: **80%**

### 🛠️ **Gestione Errori**
- Se i file audio non si caricano → Continua senza errori
- Console warnings per debug
- Fallback silenzioso se audio non supportato

## 🔧 **Risoluzione Problemi**

### ❓ **Non sento i suoni?**
1. **Controlla il volume** del dispositivo
2. **Verifica i file audio** in `/public/sounds/`
3. **Apri la Console** (F12) per vedere eventuali errori
4. **Testa il pulsante** "🔊 Test Suoni"

### ❓ **Suoni troppo forti/silenziosi?**
Modifica il volume in `src/utils/soundUtils.js`:
```javascript
audio.volume = 0.6  // Cambia questo valore (0.0 - 1.0)
```

### ❓ **Errori nella console?**
- Verifica che i file `.wav` esistano
- Controlla la compatibilità del formato audio
- Assicurati che il browser supporti l'audio

## 📊 **Stati del Sistema**

### 🟢 **Funzionante**
- Suoni si riproducono correttamente
- Pulsante test funziona
- Volume appropriato

### 🟡 **Attenzione**
- Alcuni file audio mancanti
- Errori occasionali nella console
- Volume troppo alto/basso

### 🔴 **Problema**
- Nessun suono si riproduce
- Errori continui nella console
- Sistema audio non disponibile

## 🎨 **Miglioramenti Futuri**

- [ ] **Libreria suoni più ampia** (diversi toni per diverse quantità)
- [ ] **Controlli volume utente** nell'interfaccia
- [ ] **Suoni per altre azioni** (registrazione vendita, riscatto premi)
- [ ] **Temi audio personalizzabili**
- [ ] **Modalità silenziosa** con toggle

---

## 🔗 **File Correlati**
- `src/utils/soundUtils.js` → Gestione suoni
- `src/App.jsx` → Integrazione funzione modifyPoints  
- `src/components/Customers/CustomerView.jsx` → UI e pulsante test
- `public/sounds/` → File audio

---

**✨ Implementato con successo! I suoni rendono l'esperienza più coinvolgente e danno feedback immediato alle azioni dell'operatore.**
