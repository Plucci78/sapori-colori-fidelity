#!/bin/bash

# ===================================
# SETUP RASPBERRY PI - SAPORI & COLORI
# Fresh install per sistema unificato
# ===================================
# 
# Questo script configura un Raspberry Pi fresh 
# per funzionare come client NFC del sistema web
#
# Uso: bash raspberry-setup.sh
# ===================================

set -e  # Esci se qualsiasi comando fallisce

echo "🍞 ====================================="
echo "🍞   SETUP SAPORI & COLORI RASPBERRY"
echo "🍞   Sistema Fidelizzazione Unificato"  
echo "🍞 ====================================="
echo ""

# Variabili di configurazione
WEBAPP_URL="https://sapori-colori-fidelity.vercel.app"
NFC_BRIDGE_PORT=3001
AUTOSTART_USER="sapori"
HOSTNAME="saporiecolori"

# ===================================
# 1. AGGIORNAMENTO SISTEMA
# ===================================

echo "📦 Aggiornamento sistema..."
sudo apt update && sudo apt upgrade -y

echo "🧹 Pulizia pacchetti non necessari..."
sudo apt autoremove -y
sudo apt autoclean

# ===================================
# 1.5. CONFIGURAZIONE HOSTNAME
# ===================================

echo "🏷️ Configurazione hostname: $HOSTNAME..."
sudo hostnamectl set-hostname $HOSTNAME
echo "127.0.1.1    $HOSTNAME.local $HOSTNAME" | sudo tee -a /etc/hosts

# ===================================
# 2. INSTALLAZIONE SOFTWARE BASE
# ===================================

echo "🌐 Installazione browser e componenti grafici..."
sudo apt install -y \
  chromium-browser \
  xorg \
  openbox \
  lightdm \
  unclutter \
  x11-xserver-utils

echo "⚙️ Installazione Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

echo "📱 Installazione librerie NFC..."
sudo apt install -y \
  libnfc-dev \
  libnfc-bin \
  libpcsclite-dev \
  pcscd \
  pcsc-tools

# Configurazione pcscd per migliore sensibilità
sudo tee /etc/reader.conf.d/libccid_Info.plist > /dev/null << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>ifdDriverOptions</key>
	<string>0x0004</string>
	<key>ifdLogLevel</key>
	<string>0x0003</string>
</dict>
</plist>
EOF

# Avvia servizio pcscd
sudo systemctl enable pcscd
sudo systemctl start pcscd

# Installa dipendenze Python per PC/SC
sudo apt install -y python3-pyscard

# ===================================  
# 3. CONFIGURAZIONE NFC
# ===================================

echo "🔧 Configurazione NFC..."

# Crea directory di configurazione NFC
sudo mkdir -p /etc/nfc
sudo tee /etc/nfc/libnfc.conf > /dev/null << EOF
# Configurazione libnfc per Raspberry Pi
allow_autoscan = true
allow_intrusive_scan = true
log_level = 1

# Dispositivi supportati
device.name = "PN532 USB"
device.connstring = "pn532_uart:/dev/ttyUSB0"

device.name = "ACR122U"  
device.connstring = "acr122_usb"

# Configurazione specifica ACR122U per sensibilità migliorata
device.optional = true
EOF

# Permessi per device NFC
sudo usermod -a -G dialout,plugdev $AUTOSTART_USER

# ===================================
# 4. SETUP NFC BRIDGE
# ===================================

echo "🌉 Configurazione NFC Bridge..."

# Crea directory per il bridge
sudo mkdir -p /opt/sapori-colori-nfc
cd /opt/sapori-colori-nfc

# Copia i file del bridge (assumendo che siano nella stessa directory dello script)
if [ -d "$(dirname "$0")/raspberry-nfc-bridge" ]; then
    sudo cp -r "$(dirname "$0")/raspberry-nfc-bridge"/* .
else
    echo "⚠️  Directory raspberry-nfc-bridge non trovata. Creando struttura base..."
    
    # Crea package.json
    sudo tee package.json > /dev/null << 'EOF'
{
  "name": "sapori-colori-nfc-bridge",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  }
}
EOF

    # Crea server.js basic (l'utente dovrà copiare il contenuto completo)
    sudo tee server.js > /dev/null << 'EOF'
// NFC Bridge Server - Inserire qui il codice completo
console.log('🚨 ATTENZIONE: Inserire il codice completo del server NFC');
console.log('📁 File: /opt/sapori-colori-nfc/server.js');
process.exit(1);
EOF
fi

# Installa dipendenze
sudo npm install

# Cambia proprietario
sudo chown -R $AUTOSTART_USER:$AUTOSTART_USER /opt/sapori-colori-nfc

# ===================================
# 5. SERVIZIO SYSTEMD PER NFC BRIDGE
# ===================================

echo "⚙️ Creazione servizio NFC Bridge..."

sudo tee /etc/systemd/system/nfc-bridge.service > /dev/null << EOF
[Unit]
Description=Sapori & Colori NFC Bridge Server
After=network.target
Wants=network.target

[Service]
Type=simple
User=$AUTOSTART_USER
Group=$AUTOSTART_USER
WorkingDirectory=/opt/sapori-colori-nfc
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=NFC_BRIDGE_PORT=$NFC_BRIDGE_PORT

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=nfc-bridge

[Install]
WantedBy=multi-user.target
EOF

# Abilita il servizio
sudo systemctl daemon-reload
sudo systemctl enable nfc-bridge

# ===================================
# 6. KIOSK MODE - AUTOSTART APP WEB  
# ===================================

echo "🖥️ Configurazione Kiosk Mode..."

# Crea directory autostart
mkdir -p /home/$AUTOSTART_USER/.config/openbox
mkdir -p /home/$AUTOSTART_USER/.config/lxsession/LXDE-pi

# Script di avvio kiosk
tee /home/$AUTOSTART_USER/start-kiosk.sh > /dev/null << EOF
#!/bin/bash

# Attendi avvio completo del sistema
sleep 10

# Nascondi cursore del mouse
unclutter -idle 0.5 -root &

# Disabilita screen saver
xset s off
xset -dpms
xset s noblank

# Attendi che il bridge NFC sia ready
echo "⏳ Attendo avvio NFC Bridge..."
while ! curl -s http://localhost:$NFC_BRIDGE_PORT/health > /dev/null; do
    sleep 2
done
echo "✅ NFC Bridge ready!"

# Avvia Chromium in modalità kiosk
chromium-browser \\
  --noerrdialogs \\
  --disable-infobars \\
  --kiosk \\
  --disable-session-crashed-bubble \\
  --disable-restore-session-state \\
  --disable-background-networking \\
  --disable-background-timer-throttling \\
  --disable-renderer-backgrounding \\
  --disable-backgrounding-occluded-windows \\
  --disable-component-extensions-with-background-pages \\
  --disable-features=TranslateUI \\
  --disable-web-security \\
  --ignore-certificate-errors \\
  --ignore-ssl-errors \\
  --ignore-certificate-errors-spki-list \\
  --user-data-dir=/tmp/chromium-kiosk \\
  $WEBAPP_URL
EOF

chmod +x /home/$AUTOSTART_USER/start-kiosk.sh

# Autostart per Openbox
tee /home/$AUTOSTART_USER/.config/openbox/autostart > /dev/null << EOF
# Sapori & Colori Kiosk Mode
/home/$AUTOSTART_USER/start-kiosk.sh &
EOF

# ===================================
# 7. CONFIGURAZIONE DISPLAY
# ===================================

echo "🖼️ Configurazione display..."

# Boot config per ottimizzare il display
sudo tee -a /boot/config.txt > /dev/null << EOF

# Configurazione display per Sapori & Colori
hdmi_force_hotplug=1
hdmi_drive=2
disable_overscan=1

# Performance
gpu_mem=128
EOF

# ===================================
# 8. AUTO-LOGIN
# ===================================

echo "🔑 Configurazione auto-login..."

# Configura auto-login
sudo mkdir -p /etc/systemd/system/getty@tty1.service.d
sudo tee /etc/systemd/system/getty@tty1.service.d/override.conf > /dev/null << EOF
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin $AUTOSTART_USER --noclear %I \$TERM
EOF

# Configura LightDM per auto-login grafico
sudo tee /etc/lightdm/lightdm.conf > /dev/null << EOF
[Seat:*]
autologin-user=$AUTOSTART_USER
autologin-user-timeout=0
EOF

# ===================================
# 9. NETWORK E SICUREZZA
# ===================================

echo "🔒 Configurazione rete e sicurezza..."

# Firewall base (consenti solo traffico necessario)
sudo ufw --force enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22        # SSH
sudo ufw allow 3001      # NFC Bridge
sudo ufw allow 5000      # Se serve per sviluppo

# DNS ottimizzati
echo "nameserver 8.8.8.8" | sudo tee -a /etc/dhcpcd.conf
echo "nameserver 8.8.4.4" | sudo tee -a /etc/dhcpcd.conf

# ===================================
# 10. SCRIPT DI UTILITÀ
# ===================================

echo "🛠️ Creazione script di utilità..."

# Script per vedere i log
tee /home/$AUTOSTART_USER/view-logs.sh > /dev/null << EOF
#!/bin/bash
echo "📋 Log NFC Bridge:"
sudo journalctl -u nfc-bridge -f
EOF
chmod +x /home/$AUTOSTART_USER/view-logs.sh

# Script per riavviare i servizi  
tee /home/$AUTOSTART_USER/restart-services.sh > /dev/null << EOF
#!/bin/bash
echo "🔄 Riavvio servizi..."
sudo systemctl restart nfc-bridge
echo "✅ Servizi riavviati!"
EOF
chmod +x /home/$AUTOSTART_USER/restart-services.sh

# Script per aggiornare l'app (pull dal git)
tee /home/$AUTOSTART_USER/update-app.sh > /dev/null << EOF
#!/bin/bash
echo "📥 Aggiornamento app web in corso..."
echo "ℹ️  L'app si aggiorna automaticamente da Vercel"
echo "🔄 Ricarico solo il browser..."
pkill chromium
sleep 2
/home/$AUTOSTART_USER/start-kiosk.sh &
EOF
chmod +x /home/$AUTOSTART_USER/update-app.sh

# ===================================
# COMPLETAMENTO
# ===================================

echo ""
echo "🎉 ====================================="
echo "🎉   SETUP COMPLETATO CON SUCCESSO!"
echo "🎉 ====================================="
echo ""
echo "📋 Prossimi passi:"
echo "   1. Modifica WEBAPP_URL in questo script con la tua URL Vercel"
echo "   2. Copia il codice completo del server NFC in /opt/sapori-colori-nfc/server.js"
echo "   3. Riavvia il Raspberry: sudo reboot"
echo ""
echo "🛠️ Script di utilità disponibili:"
echo "   ./view-logs.sh        - Visualizza log NFC"
echo "   ./restart-services.sh - Riavvia servizi"
echo "   ./update-app.sh       - Ricarica applicazione"
echo ""
echo "📡 Servizi che verranno avviati:"
echo "   - NFC Bridge Server (porta $NFC_BRIDGE_PORT)"
echo "   - Chromium in Kiosk Mode"
echo "   - Auto-login utente $AUTOSTART_USER"
echo ""
echo "⚠️  IMPORTANTE:"
echo "   - Collega il lettore NFC USB prima di riavviare"
echo "   - Assicurati che l'URL dell'app web sia corretta"
echo "   - Il primo avvio potrebbe richiedere qualche minuto"
echo ""

read -p "🤔 Vuoi riavviare ora per completare la configurazione? (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "🔄 Riavvio in corso..."
    sudo reboot
else
    echo "✅ Setup completato. Riavvia manualmente quando sei pronto."
    echo "   Comando: sudo reboot"
fi