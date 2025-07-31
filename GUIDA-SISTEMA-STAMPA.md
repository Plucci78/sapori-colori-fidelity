# 🖨️ GUIDA COMPLETA SISTEMA STAMPA TERMICA

## 📋 Panoramica Sistema

Il sistema di stampa è composto da:
- **Stampante Termica**: Bisofice ESC/POS 80mm (IP dinamico)
- **Print Server**: Raspberry Pi con Node.js + systemd
- **Tunnel Ngrok**: Espone print server pubblicamente
- **API Vercel**: Proxy per chiamate da frontend
- **Frontend**: React components per stampa

## 🔧 Architettura

```
Frontend → /api/print/* → API Vercel → ngrok tunnel → Raspberry Pi → Print Server → Stampante
```

### Development:
```
localhost:5173 → /api/print/* → Vite proxy → ngrok tunnel → Raspberry Pi → Stampante
```

### Production:
```
vercel.app → /api/print/* → API Vercel → ngrok tunnel → Raspberry Pi → Stampante
```

---

## 🚨 PROBLEMI RISOLTI E SOLUZIONI

### ❌ Problema 1: Stampante IP Dinamico
**Sintomo**: Stampante non funziona dopo riavvio
**Causa**: IP cambia da 192.168.1.17 a 192.168.1.100, ecc.
**Soluzione**: Auto-discovery IP implementato

```javascript
// Auto-discovery nel server.js
const discoverPrinterIP = async () => {
  // 1. Scansiona rete con nmap
  // 2. Testa IP comuni
  // 3. Fallback su IP default
}
```

### ❌ Problema 2: URL Tunnel Errato
**Sintomo**: API chiamano URL sbagliato
**Causa**: `nfc.saporiecolori.net` vs `sacred-eagle-similarly.ngrok-free.app`
**Soluzione**: Aggiornare tutti gli URL

**File modificati:**
- `api/print/status.js`
- `api/print/receipt.js`
- `api/print/gift-card.js`

```javascript
// Prima (ERRATO)
const printUrl = 'http://nfc.saporiecolori.net/print/status'

// Dopo (CORRETTO)
const printUrl = 'https://sacred-eagle-similarly.ngrok-free.app/print/status'
```

### ❌ Problema 3: Frontend usa localhost:3002
**Sintomo**: Funziona solo in locale, non su Vercel
**Causa**: Componenti chiamano direttamente Raspberry Pi
**Soluzione**: Usare API Vercel ovunque

**File modificati:**
- `src/components/Wallet/WalletCashRegister.jsx`
- `src/components/Dashboard/DashboardEnterprisePro.jsx`

```javascript
// Prima (ERRATO)
fetch('http://localhost:3002/print/receipt', ...)

// Dopo (CORRETTO)
fetch('/api/print/receipt', ...)
```

### ❌ Problema 4: Development vs Production
**Sintomo**: Non funziona in dev locale dopo correzioni
**Causa**: `/api/print` non esiste in locale
**Soluzione**: Proxy Vite configurato

```javascript
// vite.config.js
proxy: {
  '/api/print': {
    target: 'https://sacred-eagle-similarly.ngrok-free.app',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
    headers: {
      'ngrok-skip-browser-warning': 'true'
    }
  }
}
```

---

## 🔄 SETUP COMPLETO PASSO-PASSO

### 1. Raspberry Pi Setup

```bash
# Installa dipendenze
sudo apt update && sudo apt install nmap

# Copia server.js aggiornato
sudo cp ~/Desktop/server/server.js /path/to/print-server/

# Riavvia servizio
sudo systemctl restart print-server
sudo systemctl status print-server

# Verifica log
sudo journalctl -u print-server -f
```

### 2. Ngrok Setup

```bash
# Verifica servizio attivo
sudo systemctl status ngrok-print.service

# Controlla URL tunnel
curl -s http://localhost:4040/api/tunnels
```

**URL attuale**: `https://sacred-eagle-similarly.ngrok-free.app`

### 3. API Vercel Update

Assicurati che tutti questi file abbiano l'URL ngrok corretto:

```javascript
// api/print/status.js
const printUrl = 'https://sacred-eagle-similarly.ngrok-free.app/print/status'

// api/print/receipt.js  
const printUrl = 'https://sacred-eagle-similarly.ngrok-free.app/print/receipt'

// api/print/gift-card.js
const printUrl = 'https://sacred-eagle-similarly.ngrok-free.app/print/gift-card'
```

### 4. Frontend Components

Tutti i componenti devono usare API Vercel:

```javascript
// ✅ CORRETTO - Usa API Vercel
const response = await fetch('/api/print/gift-card', { ... })
const response = await fetch('/api/print/receipt', { ... })
const response = await fetch('/api/print/status', { ... })

// ❌ ERRATO - Non usare mai direttamente
const response = await fetch('http://localhost:3002/...', { ... })
const response = await fetch('https://ngrok-url.com/...', { ... })
```

---

## 🛠️ MANUTENZIONE E TROUBLESHOOTING

### Controlli di Routine

**1. Verifica Print Server:**
```bash
# Su Raspberry Pi
sudo systemctl status print-server
curl http://localhost:3002/print/status
```

**2. Verifica Tunnel Ngrok:**
```bash
# Su Raspberry Pi  
sudo systemctl status ngrok-print.service
curl https://sacred-eagle-similarly.ngrok-free.app/print/status
```

**3. Test Stampa:**
```bash
# Da qualsiasi luogo
curl -X POST https://sacred-eagle-similarly.ngrok-free.app/print/test
```

### Diagnostica Problemi

**Stampante non risponde:**
```bash
# Su Raspberry Pi
sudo journalctl -u print-server -f

# Forza ricerca IP
curl -X POST http://localhost:3002/print/discover
```

**Tunnel non funziona:**
```bash
# Riavvia ngrok
sudo systemctl restart ngrok-print.service
sudo journalctl -u ngrok-print.service -f
```

**API Vercel errore 500:**
- Controlla URL tunnel ngrok nelle API
- Verifica header ngrok-skip-browser-warning
- Controlla timeout (15s per stampa)

---

## 📝 TEMPLATE PER NUOVI COMPONENTI

### Stampa Gift Card
```javascript
const printGiftCard = async (giftCardData) => {
  try {
    const response = await fetch('/api/print/gift-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        giftCard: {
          code: giftCardData.code,
          value: giftCardData.value,
          recipient: giftCardData.recipient,
          purchaser: giftCardData.purchaser,
          notes: giftCardData.notes
        }
      })
    })

    if (!response.ok) throw new Error('Errore stampa')
    
    const result = await response.json()
    console.log('✅ Gift card stampata:', result)
    return result
    
  } catch (error) {
    console.error('❌ Errore stampa gift card:', error)
    throw error
  }
}
```

### Stampa Ricevuta Generica
```javascript
const printReceipt = async (receiptData) => {
  try {
    const response = await fetch('/api/print/receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: receiptData.orderId,
        total: receiptData.total,
        customer: receiptData.customer,
        operator: receiptData.operator,
        paymentMethod: receiptData.paymentMethod,
        items: receiptData.items,
        receiptType: receiptData.receiptType || 'sale' // sale, balance, subscription
      })
    })

    if (!response.ok) throw new Error('Errore stampa ricevuta')
    
    const result = await response.json()
    console.log('✅ Ricevuta stampata:', result)
    return result
    
  } catch (error) {
    console.error('❌ Errore stampa ricevuta:', error)
    throw error
  }
}
```

### Check Status Stampante
```javascript
const checkPrinterStatus = async () => {
  try {
    const response = await fetch('/api/print/status')
    const status = await response.json()
    
    return {
      connected: status.connected,
      printerType: status.printerType,
      interface: status.interface,
      autoDiscovered: status.autoDiscovered
    }
  } catch (error) {
    console.error('❌ Errore status stampante:', error)
    return { connected: false }
  }
}
```

---

## 🚀 PREVENZIONE PROBLEMI FUTURI

### 1. Cambio URL Ngrok

Se l'URL ngrok cambia da `sacred-eagle-similarly.ngrok-free.app`:

```bash
# 1. Aggiorna vite.config.js (development)
# 2. Aggiorna api/print/*.js (3 files)
# 3. Commit e push
# 4. Vercel si aggiornerà automaticamente
```

### 2. IP Stampante Cambia

Il sistema auto-discovery dovrebbe gestirlo automaticamente. Se non funziona:

```bash
# Su Raspberry Pi
curl -X POST http://localhost:3002/print/discover
```

### 3. Nuovo Componente con Stampa

**SEMPRE usa il pattern:**
```javascript
// ✅ CORRETTO
fetch('/api/print/...', { ... })

// ❌ MAI fare così
fetch('http://localhost:3002/...', { ... })
fetch('https://ngrok-url/...', { ... })
```

### 4. Test Prima del Deploy

```bash
# 1. Test locale
npm run dev
# Prova stampa su localhost:5173

# 2. Test production  
# Vai su vercel.app e prova stampa

# 3. Verifica log
sudo journalctl -u print-server -f
```

---

## 📚 FILE IMPORTANTI

### Configurazione
- `/Users/pasqualelucci/forno-loyalty/vite.config.js` - Proxy development
- `/etc/systemd/system/print-server.service` - Servizio print server
- `/etc/systemd/system/ngrok-print.service` - Servizio ngrok

### API Vercel
- `api/print/status.js` - Status stampante
- `api/print/receipt.js` - Stampa ricevute  
- `api/print/gift-card.js` - Stampa gift card

### Print Server
- `raspberry-print-server/server.js` - Server principale con auto-discovery

### Frontend Components
- `src/components/Wallet/WalletCashRegister.jsx` - Wallet stampa
- `src/components/Dashboard/DashboardEnterprisePro.jsx` - Dashboard status
- `src/components/Subscriptions/SubscriptionManager.jsx` - Abbonamenti

---

## ✅ CHECKLIST DEPLOY

Prima di ogni deploy, verifica:

- [ ] Tutti i componenti usano `/api/print/*` (non localhost:3002)
- [ ] API Vercel hanno URL ngrok corretto
- [ ] Print server funziona su Raspberry Pi
- [ ] Tunnel ngrok attivo
- [ ] Test stampa funziona sia locale che Vercel
- [ ] Auto-discovery IP stampante attivo
- [ ] Vite proxy configurato per development

---

## 🆘 CONTATTI SUPPORTO

**In caso di emergenza:**

1. **Riavvia tutto su Raspberry Pi:**
   ```bash
   sudo systemctl restart print-server
   sudo systemctl restart ngrok-print.service
   ```

2. **Verifica URL tunnel:**
   ```bash
   curl https://sacred-eagle-similarly.ngrok-free.app/print/status
   ```

3. **Rollback veloce** se serve:
   - Ripristina vite.config.js con proxy localhost:3002
   - Avvia print server locale per emergenza

**Il sistema è robusto e auto-riparante, ma questa guida copre ogni scenario! 🚀**

---

*Documento creato il 31 Luglio 2025 - Sistema stampa v2.0*
*🤖 Generated with [Claude Code](https://claude.ai/code)*