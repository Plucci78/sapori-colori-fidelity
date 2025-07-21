# 🍞 Guida Setup Raspberry Pi - Sapori & Colori

## 🎯 Obiettivo
Trasformare il Raspberry Pi in un **thin client** che esegue l'app web Vercel con supporto NFC, eliminando la duplicazione di codice.

## 📋 Prerequisiti
- Raspberry Pi 4 (consigliato) o 3B+
- Scheda microSD 32GB+ (Classe 10)
- Lettore NFC USB (quello attuale)
- Connessione internet stabile

---

## 🚀 Procedura Completa

### 1️⃣ **Fresh Install Raspberry Pi OS**
```bash
# Scarica Raspberry Pi Imager
# Installa Raspberry Pi OS Lite (64-bit) sulla microSD
# Abilita SSH durante l'installazione
```

### 2️⃣ **Primo Avvio**
```bash
# SSH nel Raspberry
ssh pi@[IP_RASPBERRY]

# Aggiorna tutto
sudo apt update && sudo apt upgrade -y
```

### 3️⃣ **Copia Files e Esegui Setup**
```bash
# Sul tuo PC - copia i file necessari
scp raspberry-setup.sh pi@[IP_RASPBERRY]:~/
scp -r raspberry-nfc-bridge/ pi@[IP_RASPBERRY]:~/

# Sul Raspberry - esegui setup
chmod +x raspberry-setup.sh
./raspberry-setup.sh
```

### 4️⃣ **Configurazione URL App**
Prima di riavviare, modifica l'URL della tua app Vercel:
```bash
# Modifica lo script con la tua URL Vercel
nano raspberry-setup.sh

# Cambia questa riga:
WEBAPP_URL="https://your-app.vercel.app"  
# Con:
WEBAPP_URL="https://[TUA-APP].vercel.app"
```

### 5️⃣ **Riavvio**
```bash
sudo reboot
```

---

## ✅ Risultato Finale

Dopo il riavvio, il Raspberry:

1. **Si avvia automaticamente** in modalità kiosk
2. **Apre Chromium** a schermo intero con la tua app
3. **Avvia il bridge NFC** in background 
4. **Gestisce l'hardware NFC** via API HTTP
5. **Sincronizza tutti i dati** con Supabase

---

## 🛠️ Gestione e Manutenzione

### **Script Utili** (creati automaticamente):
```bash
./view-logs.sh        # Visualizza log del bridge NFC
./restart-services.sh # Riavvia servizi NFC
./update-app.sh       # Ricarica l'applicazione web
```

### **Verifica Servizi:**
```bash
# Status bridge NFC
curl http://localhost:3001/health

# Log in tempo reale
sudo journalctl -u nfc-bridge -f

# Status generale sistema
systemctl status nfc-bridge
```

### **Debug Comuni:**

**❌ App non si apre:**
- Verifica URL in `/home/pi/start-kiosk.sh`
- Controlla connessione internet

**❌ NFC non funziona:**
- Collega lettore USB
- `./view-logs.sh` per vedere errori
- `./restart-services.sh` per riavviare

**❌ Schermo nero:**
- SSH nel Raspberry
- `sudo systemctl restart lightdm`

---

## 🔄 Aggiornamenti App

**Il bello del nuovo sistema:** L'app si aggiorna automaticamente!

- ✅ Modifichi codice sul tuo PC
- ✅ Push su Vercel 
- ✅ **Tutti i Raspberry si aggiornano automaticamente**

Per forzare reload: `./update-app.sh`

---

## 📊 Vantaggi del Nuovo Sistema

| Aspetto | Prima | Dopo |
|---------|-------|------|
| **Codice da mantenere** | 2 app separate | 1 app unificata |
| **Database** | Locale + Cloud | Solo Cloud (Supabase) |
| **Aggiornamenti** | Manuali su ogni Pi | Automatici |
| **Backup** | Manuale | Automatico cloud |
| **Accesso remoto** | No | Sì (via web) |
| **Sincronizzazione** | Problematica | Perfetta |

---

## 🆘 Supporto

**File di log importanti:**
- Bridge NFC: `sudo journalctl -u nfc-bridge`
- Sistema: `sudo journalctl -xe`
- App Chromium: `~/.config/chromium/*/chrome_debug.log`

**Reset completo:**
```bash
# Se qualcosa va storto, ripeti il setup
sudo systemctl stop nfc-bridge
sudo rm -rf /opt/sapori-colori-nfc
./raspberry-setup.sh
```

---

## 🎉 Configurazione Completata!

Una volta completato, avrai:
- **Un'unica app** che funziona ovunque
- **Zero duplicazione** di codice
- **Aggiornamenti automatici** per tutti i dispositivi
- **Sistema stabile** e moderno

Il Raspberry è ora un **client intelligente** della tua app Vercel! 🚀