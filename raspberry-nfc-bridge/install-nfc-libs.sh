#!/bin/bash

# ==========================================
# INSTALLAZIONE LIBRERIE NFC RASPBERRY PI
# ==========================================

echo "🔧 Installazione librerie NFC per Raspberry Pi..."

# Aggiorna sistema
echo "📦 Aggiornamento sistema..."
sudo apt update
sudo apt upgrade -y

# Installa libnfc
echo "📡 Installazione libnfc..."
sudo apt install -y libnfc-dev libnfc-bin

# Installa PC/SC
echo "💳 Installazione PC/SC Lite..."
sudo apt install -y pcscd pcsc-tools libpcsclite-dev

# Installa Python per script opzionali
echo "🐍 Installazione dipendenze Python..."
sudo apt install -y python3-pip
pip3 install pyscard

# Configurazione libnfc
echo "⚙️ Configurazione libnfc..."
sudo mkdir -p /etc/nfc
sudo tee /etc/nfc/libnfc.conf > /dev/null << 'EOF'
# libnfc configuration
device.name = "PN532 on SPI"
device.connstring = "pn532_spi:/dev/spidev0.0:500000"

# Abilita più opzioni di connessione
allow_autoscan = true
allow_intrusive_scan = false
default_device = ""
log_level = 1
EOF

# Abilita servizi
echo "🚀 Abilitazione servizi..."
sudo systemctl enable pcscd
sudo systemctl start pcscd

# Test installazione
echo "🧪 Test installazione..."
echo "Testando nfc-list..."
timeout 3s nfc-list || echo "⚠️ nfc-list non risponde (normale se no NFC collegato)"

echo "Testando pcsc_scan..."
timeout 3s pcsc_scan -n || echo "⚠️ pcsc_scan installato ma nessun lettore rilevato"

echo ""
echo "✅ INSTALLAZIONE COMPLETATA!"
echo ""
echo "📋 Prossimi passi:"
echo "1. Collega il lettore NFC USB"
echo "2. Riavvia il Raspberry: sudo reboot"
echo "3. Testa con: nfc-list"
echo "4. Avvia il server: node server.js"
echo ""
echo "🔍 Se hai problemi:"
echo "- Controlla USB: lsusb"
echo "- Log PC/SC: sudo journalctl -u pcscd -f"
echo "- Test manuale: nfc-poll"