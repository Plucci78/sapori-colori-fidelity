# 🚀 SETUP AVVIO AUTOMATICO NFC BRIDGE

## COSA FARE SUL RASPBERRY PI

### 1. Collega al Raspberry via SSH
```bash
ssh pi@192.168.1.6
# (oppure l'IP del tuo Raspberry)
```

### 2. Vai nella cartella del progetto
```bash
cd /home/pi/nfc-bridge
```

### 3. Scarica i file aggiornati
```bash
# Opzione A: Se hai git
git pull

# Opzione B: Copia manualmente questi file dal Mac:
# - server.js
# - nfc-bridge.service
# - install-autostart.sh  
# - scripts/read_nfc.py
```

### 4. Rendi eseguibile lo script
```bash
chmod +x install-autostart.sh
```

### 5. Installa l'avvio automatico
```bash
./install-autostart.sh
```

### 6. Verifica che funzioni
```bash
sudo systemctl status nfc-bridge
```

## ✅ RISULTATO

Da ora in poi:
- Accendi Raspberry → Server parte automaticamente
- LED rosso acceso → Pronto per lettura carte
- App funziona da qualsiasi posto nel mondo

## 🔧 COMANDI UTILI

```bash
# Stato servizio
sudo systemctl status nfc-bridge

# Riavviare
sudo systemctl restart nfc-bridge

# Log in tempo reale  
sudo journalctl -u nfc-bridge -f
```