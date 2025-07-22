#!/bin/bash

# Script per configurare avvio automatico NFC Bridge
echo "🔧 Configurazione avvio automatico NFC Bridge..."

# 1. Copia service file
sudo cp nfc-bridge.service /etc/systemd/system/

# 2. Ricarica systemd
sudo systemctl daemon-reload

# 3. Abilita il servizio
sudo systemctl enable nfc-bridge

# 4. Avvia il servizio
sudo systemctl start nfc-bridge

# 5. Controlla lo status
sudo systemctl status nfc-bridge

echo "✅ NFC Bridge configurato per avvio automatico!"
echo "📋 Comandi utili:"
echo "   sudo systemctl status nfc-bridge    # Stato servizio"
echo "   sudo systemctl restart nfc-bridge   # Riavvia servizio"
echo "   sudo systemctl stop nfc-bridge      # Ferma servizio"
echo "   sudo journalctl -u nfc-bridge -f    # Log in tempo reale"