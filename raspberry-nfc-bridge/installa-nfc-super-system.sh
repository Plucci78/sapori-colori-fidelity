#!/bin/bash
# ===================================
# INSTALLAZIONE NFC SUPER SYSTEM
# ===================================
#
# Installa e configura il sistema NFC migliorato
# con maggiore stabilità e resilienza ai riavvii
#
# Uso: bash installa-nfc-super-system.sh
#

set -e

echo "🚀 Installazione NFC Super System..."
echo "======================================"
echo ""

# Verifica che siamo sul Raspberry Pi
if [ ! -f /opt/vc/bin/vcgencmd ]; then
    echo "⚠️  Questo script deve essere eseguito su un Raspberry Pi"
    read -p "Continuare comunque? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "📋 1. Backup configurazioni esistenti..."
sudo mkdir -p /home/sapori/backup/$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/sapori/backup/$(date +%Y%m%d_%H%M%S)"

# Backup servizi esistenti
if [ -f "/etc/systemd/system/nfc-bridge.service" ]; then
    sudo cp /etc/systemd/system/nfc-bridge.service "$BACKUP_DIR/"
    echo "✅ Backup servizio nfc-bridge esistente"
fi

if [ -f "/home/sapori/scripts/nfc-auto-fix.sh" ]; then
    sudo cp /home/sapori/scripts/nfc-auto-fix.sh "$BACKUP_DIR/"
    echo "✅ Backup script auto-fix esistente"
fi

echo ""
echo "🔧 2. Installazione servizio systemd migliorato..."

# Copia il nuovo file di servizio
sudo cp nfc-service-improved.service /etc/systemd/system/nfc-bridge.service
sudo chown root:root /etc/systemd/system/nfc-bridge.service
sudo chmod 644 /etc/systemd/system/nfc-bridge.service

echo "✅ Servizio systemd aggiornato"

echo ""
echo "📁 3. Installazione script super-fix..."

# Crea directory scripts se non esiste
sudo mkdir -p /home/sapori/scripts
sudo chown sapori:sapori /home/sapori/scripts

# Copia script super-fix
sudo cp nfc-super-fix.sh /home/sapori/scripts/
sudo chown sapori:sapori /home/sapori/scripts/nfc-super-fix.sh
sudo chmod +x /home/sapori/scripts/nfc-super-fix.sh

echo "✅ Script super-fix installato in /home/sapori/scripts/nfc-super-fix.sh"

echo ""
echo "⚙️ 4. Configurazione NFC ottimizzata..."

# Configurazione libnfc per ACR122U
sudo mkdir -p /etc/nfc
sudo tee /etc/nfc/libnfc.conf > /dev/null << 'EOF'
# Configurazione ottimizzata per ACR122U USB NFC Reader
allow_autoscan = true
allow_intrusive_scan = true
default_device = ""
log_level = 1

# Configurazione specifica ACR122U
device.name = "ACR122U USB NFC Reader"
device.connstring = "acr122_usb"

# Ottimizzazioni
device.optional = true
device.allow_intrusive_scan = true
EOF

echo "✅ Configurazione libnfc ottimizzata"

echo ""
echo "🔄 5. Configurazione crontab migliorata..."

# Rimuovi vecchio crontab nfc-auto-fix
sudo crontab -l 2>/dev/null | grep -v "nfc-auto-fix.sh" | sudo crontab - || true

# Aggiungi nuovo crontab con frequenza intelligente
(sudo crontab -l 2>/dev/null || true; cat << 'EOF'

# ===== NFC SUPER SYSTEM =====
# Monitoraggio frequente nei primi 10 minuti dopo boot
*/1 * * * * [ $(awk '{print int($1)}' /proc/uptime) -lt 600 ] && /home/sapori/scripts/nfc-super-fix.sh >/dev/null 2>&1

# Monitoraggio normale ogni 3 minuti dopo i primi 10 minuti
*/3 * * * * [ $(awk '{print int($1)}' /proc/uptime) -ge 600 ] && /home/sapori/scripts/nfc-super-fix.sh >/dev/null 2>&1

# Check di salute ogni ora
0 * * * * /home/sapori/scripts/nfc-super-fix.sh >/dev/null 2>&1
EOF
) | sudo crontab -

echo "✅ Crontab configurato con monitoraggio intelligente"

echo ""
echo "🔧 6. Ottimizzazione servizio pcscd..."

# Configura pcscd per avvio più stabile
sudo mkdir -p /etc/systemd/system/pcscd.service.d
sudo tee /etc/systemd/system/pcscd.service.d/override.conf > /dev/null << 'EOF'
[Unit]
After=usb.target

[Service]
ExecStartPre=/bin/sleep 5
Restart=always
RestartSec=10
EOF

echo "✅ Servizio pcscd ottimizzato"

echo ""
echo "📋 7. Creazione file di log..."

# Crea file di log con permessi corretti
sudo touch /var/log/nfc-super-fix.log
sudo chown sapori:sapori /var/log/nfc-super-fix.log
sudo chmod 644 /var/log/nfc-super-fix.log

# Configura logrotate per il log NFC
sudo tee /etc/logrotate.d/nfc-super-fix > /dev/null << 'EOF'
/var/log/nfc-super-fix.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 sapori sapori
    postrotate
        systemctl reload rsyslog > /dev/null 2>&1 || true
    endscript
}
EOF

echo "✅ Sistema di logging configurato"

echo ""
echo "🔄 8. Reload e restart servizi..."

# Reload systemd
sudo systemctl daemon-reload

# Riavvia servizi in ordine
echo "🔄 Riavvio pcscd..."
sudo systemctl restart pcscd
sleep 3

echo "🔄 Riavvio nfc-bridge..."
sudo systemctl restart nfc-bridge
sleep 5

# Abilita servizi all'avvio
sudo systemctl enable pcscd
sudo systemctl enable nfc-bridge

echo "✅ Servizi riavviati ed abilitati"

echo ""
echo "🧪 9. Test del sistema..."

# Test immediato
echo "🔍 Esecuzione test del sistema..."
sudo /home/sapori/scripts/nfc-super-fix.sh

echo ""
echo "📊 10. Verifica finale..."

# Verifica stato servizi
echo "📊 Stato pcscd: $(systemctl is-active pcscd)"
echo "📊 Stato nfc-bridge: $(systemctl is-active nfc-bridge)"

# Test API se disponibile
if curl -s http://localhost:3001/nfc/status >/dev/null 2>&1; then
    echo "📊 API NFC: ✅ Funzionante"
else
    echo "📊 API NFC: ⚠️ Non risponde (potrebbe essere normale durante l'avvio)"
fi

echo ""
echo "🎉 INSTALLAZIONE COMPLETATA!"
echo "=========================="
echo ""
echo "📋 Cosa è stato installato:"
echo "   • Servizio systemd migliorato: /etc/systemd/system/nfc-bridge.service"
echo "   • Script super-fix: /home/sapori/scripts/nfc-super-fix.sh"
echo "   • Configurazione NFC: /etc/nfc/libnfc.conf"
echo "   • Log: /var/log/nfc-super-fix.log"
echo "   • Crontab: monitoraggio intelligente"
echo ""
echo "🔍 Comandi utili:"
echo "   • Visualizza log: tail -f /var/log/nfc-super-fix.log"
echo "   • Test manuale: sudo /home/sapori/scripts/nfc-super-fix.sh"
echo "   • Stato servizi: systemctl status nfc-bridge pcscd"
echo "   • API status: curl http://localhost:3001/nfc/status"
echo ""
echo "⚡ Il sistema ora dovrebbe essere molto più stabile dopo i riavvii!"
echo ""

# Mostra gli ultimi log se disponibili
if [ -f "/var/log/nfc-super-fix.log" ] && [ -s "/var/log/nfc-super-fix.log" ]; then
    echo "📋 Ultimi log del sistema:"
    echo "========================"
    tail -n 10 /var/log/nfc-super-fix.log
fi