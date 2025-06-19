# 🔥 SISTEMA NFC COMPLETO - uTrust 3700F

## ✅ STATO IMPLEMENTAZIONE

Il sistema NFC è stato **COMPLETAMENTE RIPRISTINATO** e ora supporta:

### 🔥 MODALITÀ REALE (uTrust 3700F)
- **Lettore Hardware:** uTrust 3700F (Identive) via USB
- **Tecnologia:** WebUSB API per comunicazione diretta
- **Compatibilità:** Chrome/Edge su Mac/Windows/Linux
- **Funzionalità:** Lettura NFC reale, associazione tag, riconoscimento clienti

### 🎮 MODALITÀ DEMO
- **Simulazione:** Tag NFC simulati per test
- **Database:** Connessione reale a Supabase
- **Uso:** Training, presentazioni, debug

### 📱 MODALITÀ MOBILE/TABLET
- **NFC Nativo:** Web NFC API su Android
- **Dispositivi:** Tablet Android, smartphone
- **Auto-rilevamento:** Lenovo Tab M11 e altri

---

## 🚀 COME USARE

### 1. **Avvia il Sistema**
```bash
npm run dev
```

### 2. **Apri la Dashboard NFC**
- Vai su: `http://localhost:5173`
- Sezione: **NFC Dashboard**
- Il sistema rileva automaticamente il tipo di dispositivo

### 3. **Modalità Desktop (uTrust 3700F)**

#### **Prima Configurazione:**
1. Collega il lettore uTrust 3700F via USB
2. Clicca **"🔌 Connetti"** 
3. Il browser chiederà di selezionare il dispositivo USB
4. Seleziona **"uTrust 3700F"** dalla lista
5. Autorizza la connessione

#### **Utilizzo Normale:**
1. **Modalità REALE**: Disattiva demo mode
2. Clicca **"▶️ Leggi"** per avviare la scansione
3. Avvicina un tag NFC al lettore
4. Il sistema:
   - Legge l'UID del tag
   - Cerca il cliente nel database
   - Mostra informazioni cliente o "Tag non associato"

### 4. **Associare Nuovi Tag**
1. Leggi un tag non associato
2. Seleziona il cliente dalla lista
3. Clicca **"Associa Tag"**
4. Il tag è ora collegato al cliente

---

## 🔧 CARATTERISTICHE TECNICHE

### **Lettore uTrust 3700F**
- **Vendor ID:** 0x04e6
- **Product ID:** 0x5790, 0x5591 (varianti)
- **Interfaccia:** USB HID
- **Protocolli:** ISO14443A/B, MIFARE
- **Comunicazione:** WebUSB API

### **Supporto Tag NFC**
- **MIFARE Classic:** ✅
- **MIFARE Ultralight:** ✅
- **ISO14443:** ✅
- **NTAG:** ✅

### **Database Integration**
- **Tabelle:** `nfc_tags`, `customers`, `nfc_logs`
- **Real-time:** Supabase live updates
- **Sicurezza:** RLS policies attive

---

## 🎯 FUNZIONALITÀ PRINCIPALI

### ✅ **Sistema Multi-Dispositivo**
- Desktop (uTrust 3700F USB)
- Tablet Android (NFC nativo)
- Mobile (Web NFC)

### ✅ **Gestione Tag**
- Lettura tag NFC
- Associazione cliente
- Storico accessi
- Log dettagliati

### ✅ **Riconoscimento Clienti**
- Lookup automatico
- Visualizzazione punti/gemme
- Notifiche in tempo reale
- Update UI istantaneo

### ✅ **Modalità Debug**
- Log dettagliati
- Modalità demo/test
- Statistiche uso
- Monitoraggio connessione

---

## 🔥 ISTRUZIONI D'USO REALE

### **Per il Forno/Negozio:**

1. **Setup Iniziale (una volta):**
   - Collega uTrust 3700F al computer
   - Apri Chrome/Edge
   - Vai su dashboard NFC
   - Autorizza dispositivo USB

2. **Uso Quotidiano:**
   - Apri dashboard NFC
   - Modalità REALE attiva
   - Clicca "Leggi"
   - Sistema pronto per clienti

3. **Nuovo Cliente:**
   - Cliente avvicina tag NFC
   - Se non associato: seleziona cliente e associa
   - Se associato: mostra punti/gemme automaticamente

4. **Cliente Esistente:**
   - Cliente avvicina tag
   - Sistema riconosce automaticamente
   - Mostra nome, punti, livello
   - Aggiorna gemme se necessario

---

## 🎮 MODALITÀ DEMO

Per presentazioni o training:

1. Clicca **"🎮 Modalità Demo"**
2. Sistema simula lettura tag casuali
3. Database reale ma tag simulati
4. Perfetto per dimostrazioni

---

## 📱 SUPPORTO MOBILE

### **Tablet Android:**
- NFC nativo automatico
- Perfetto per cassa/banco
- Touch interface ottimizzata

### **iPhone/iPad:**
- NFC limitato (solo lettura URL)
- Usa modalità demo per training

---

## 🚨 RISOLUZIONE PROBLEMI

### **"Dispositivo non trovato"**
- Verifica cavo USB
- Riavvia browser
- Controlla dispositivi autorizzati in Chrome

### **"WebUSB non supportato"**
- Usa Chrome o Edge
- Non Safari o Firefox
- Aggiorna browser

### **"Errore connessione"**
- Disconnetti e riconnetti lettore
- Riavvia applicazione
- Controlla log debug

---

## 📋 CHECKLIST FINALE

- ✅ uTrust 3700F collegato e riconosciuto
- ✅ Modalità REALE attiva (non demo)
- ✅ Database Supabase connesso
- ✅ Lettore in modalità "▶️ Leggi"
- ✅ Tag NFC pronti per test
- ✅ Clienti configurati nel database

**🎉 SISTEMA PRONTO PER L'USO!**

---

*Creato: 19 Giugno 2025*  
*Versione: 1.0 COMPLETA*  
*Stato: ✅ FUNZIONANTE*
