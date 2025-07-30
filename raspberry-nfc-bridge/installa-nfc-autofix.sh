#!/bin/bash
# ===================================
# SCRIPT INSTALLAZIONE NFC AUTO-FIX
# ===================================
#
# Installa e configura lo script di monitoraggio automatico NFC
# 
# Uso: bash installa-nfc-autofix.sh
#

set -e

echo "🚀 Installazione NFC Auto-Fix Script..."

# Crea directory scripts se non esiste
echo "📁 Creazione directory scripts..."
sudo mkdir -p /home/sapori/scripts
sudo chown sapori:sapori /home/sapori/scripts

# Copia script auto-fix
echo "📋 Copia script auto-fix..."
sudo cp nfc-auto-fix.sh /home/sapori/scripts/
sudo chown sapori:sapori /home/sapori/scripts/nfc-auto-fix.sh
sudo chmod +x /home/sapori/scripts/nfc-auto-fix.sh

# Verifica script copiato
if [ ! -f "/home/sapori/scripts/nfc-auto-fix.sh" ]; then
    echo "❌ Errore: Script non copiato correttamente"
    exit 1
fi

echo "✅ Script installato in /home/sapori/scripts/nfc-auto-fix.sh"

# Test script
echo "🧪 Test script..."
sudo /home/sapori/scripts/nfc-auto-fix.sh
echo "✅ Test completato"

# Configura crontab
echo "⏰ Configurazione monitoraggio automatico..."
(sudo crontab -l 2>/dev/null || true; echo "*/2 * * * * /home/sapori/scripts/nfc-auto-fix.sh") | sudo crontab -

echo "✅ Crontab configurato per controllo ogni 2 minuti"

# Crea file di log
sudo touch /var/log/nfc-autofix.log
sudo chown sapori:sapori /var/log/nfc-autofix.log

echo ""
echo "🎉 INSTALLAZIONE COMPLETATA!"
echo ""
echo "📋 Cosa è stato installato:"
echo "   • Script: /home/sapori/scripts/nfc-auto-fix.sh"
echo "   • Log: /var/log/nfc-autofix.log"
echo "   • Crontab: controllo ogni 2 minuti"
echo ""
echo "🔍 Comandi utili:"
echo "   • Visualizza log: tail -f /var/log/nfc-autofix.log"
echo "   • Test manuale: sudo /home/sapori/scripts/nfc-auto-fix.sh"
echo "   • Stato crontab: sudo crontab -l"
echo ""
echo "⚡ Il sistema ora si auto-ripara automaticamente!"