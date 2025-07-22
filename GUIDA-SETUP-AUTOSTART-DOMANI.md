# 🌅 SETUP AUTOSTART NFC - DA FARE DOMANI MATTINA

## 🎯 OBIETTIVO
Configurare il Raspberry Pi perché **NFC Server** e **Cloudflare Tunnel** si avviino automaticamente al boot.

**Risultato:** Accendi Raspberry → Tutto funziona automaticamente! 🚀

---

## 📋 CHECKLIST DOMANI

### ✅ **1. Collegati al Raspberry**
```bash
ssh pi@192.168.1.6
# (oppure l'IP del tuo Raspberry)
```

### ✅ **2. Vai nella cartella NFC**
```bash
cd /home/pi/nfc-bridge
```

### ✅ **3. Scarica i file aggiornati**
```bash
# Se hai git configurato:
git pull

# OPPURE copia manualmente dal Mac i file:
# - server.js (aggiornato)
# - nfc-bridge.service (nuovo)
# - install-autostart.sh (nuovo)
# - scripts/read_nfc.py (aggiornato con LED/beep)
```

### ✅ **4. Rendi eseguibile lo script**
```bash
chmod +x install-autostart.sh
```

### ✅ **5. Installa l'autostart**
```bash
./install-autostart.sh
```

### ✅ **6. Configura Cloudflare Tunnel autostart**
```bash
sudo cloudflared service install
```

### ✅ **7. Testa il riavvio**
```bash
sudo reboot
```

### ✅ **8. Verifica che tutto funzioni**
Dopo il riavvio:
- LED rosso acceso sul lettore NFC
- App web funziona da qualsiasi posto
- `/api/nfc/status` risponde `"available": true`

---

## 🔧 **COMANDI DI VERIFICA**

```bash
# Stato NFC Server
sudo systemctl status nfc-bridge

# Stato Cloudflare Tunnel  
sudo systemctl status cloudflared

# Log NFC in tempo reale
sudo journalctl -u nfc-bridge -f

# Log Tunnel in tempo reale
sudo journalctl -u cloudflared -f
```

---

## 🎉 **RISULTATO FINALE**

**Da domani sera:**
- 🔌 Accendi Raspberry → Tutto parte automaticamente
- 🔴 LED rosso sempre acceso → Pronto per carte
- 🌍 App funziona da casa/ufficio/ovunque
- 🔊 Beep + LED verde quando scansioni + suono app
- 🚀 Zero manutenzione manuale

**Sistema loyalty NFC production-ready!** ✨

---

## ⏰ **TEMPO STIMATO: 10 minuti**

Semplice configurazione una volta sola, poi tutto automatico per sempre! 💪