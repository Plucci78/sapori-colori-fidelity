#!/bin/bash
# ===================================
# DEPLOY NFC SUPER SYSTEM SU RASPBERRY PI
# ===================================
#
# Script per trasferire e installare il sistema NFC migliorato
# sul Raspberry Pi tramite SSH
#
# Uso: bash deploy-nfc-super-system.sh [IP_RASPBERRY]
#

set -e

# Configurazione
RASPBERRY_IP=${1:-"192.168.1.100"}  # IP di default, può essere sostituito
RASPBERRY_USER="sapori"
RASPBERRY_PATH="/home/sapori/nfc-bridge"

echo "🚀 Deploy NFC Super System su Raspberry Pi"
echo "=========================================="
echo "📡 Target: $RASPBERRY_USER@$RASPBERRY_IP:$RASPBERRY_PATH"
echo ""

# Verifica che i file esistano
FILES_TO_DEPLOY=(
    "nfc-service-improved.service"
    "nfc-super-fix.sh"
    "installa-nfc-super-system.sh"
)

echo "📋 Verifica file locali..."
for file in "${FILES_TO_DEPLOY[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ File mancante: $file"
        exit 1
    else
        echo "✅ $file"
    fi
done

echo ""
echo "🔐 Test connessione SSH..."

# Test connessione SSH
if ! ssh -o ConnectTimeout=10 -o BatchMode=yes "$RASPBERRY_USER@$RASPBERRY_IP" "echo 'Connessione OK'" 2>/dev/null; then
    echo "❌ Impossibile connettersi a $RASPBERRY_USER@$RASPBERRY_IP"
    echo ""
    echo "🔧 Possibili soluzioni:"
    echo "   1. Verifica che l'IP sia corretto: $RASPBERRY_IP"
    echo "   2. Verifica che SSH sia abilitato sul Raspberry Pi"
    echo "   3. Verifica le credenziali dell'utente: $RASPBERRY_USER"
    echo "   4. Aggiungi la chiave SSH: ssh-copy-id $RASPBERRY_USER@$RASPBERRY_IP"
    echo ""
    echo "💡 Usa: bash $0 <IP_CORRETTO> se l'IP è diverso"
    exit 1
fi

echo "✅ Connessione SSH funzionante"

echo ""
echo "📁 Creazione directory di destinazione..."

# Crea directory se non esiste
ssh "$RASPBERRY_USER@$RASPBERRY_IP" "
    mkdir -p $RASPBERRY_PATH/super-system
    echo '✅ Directory creata: $RASPBERRY_PATH/super-system'
"

echo ""
echo "📤 Trasferimento file..."

# Trasferisci tutti i file
for file in "${FILES_TO_DEPLOY[@]}"; do
    echo "📤 Trasferisco $file..."
    scp "$file" "$RASPBERRY_USER@$RASPBERRY_IP:$RASPBERRY_PATH/super-system/"
    echo "✅ $file trasferito"
done

echo ""
echo "🔧 Esecuzione installazione remota..."

# Esegui l'installazione sul Raspberry Pi
ssh "$RASPBERRY_USER@$RASPBERRY_IP" "
    cd $RASPBERRY_PATH/super-system
    chmod +x *.sh
    echo '🚀 Avvio installazione NFC Super System...'
    echo '============================================'
    sudo ./installa-nfc-super-system.sh
"

INSTALL_RESULT=$?

echo ""
if [ $INSTALL_RESULT -eq 0 ]; then
    echo "🎉 DEPLOY COMPLETATO CON SUCCESSO!"
    echo "================================="
    echo ""
    echo "✅ Sistema NFC Super System installato sul Raspberry Pi"
    echo "📡 IP: $RASPBERRY_IP"
    echo "👤 Utente: $RASPBERRY_USER"
    echo ""
    echo "🔍 Comandi per monitoraggio remoto:"
    echo "   ssh $RASPBERRY_USER@$RASPBERRY_IP 'tail -f /var/log/nfc-super-fix.log'"
    echo "   ssh $RASPBERRY_USER@$RASPBERRY_IP 'systemctl status nfc-bridge'"
    echo "   ssh $RASPBERRY_USER@$RASPBERRY_IP 'curl -s http://localhost:3001/nfc/status'"
    echo ""
    echo "🧪 Test del sistema remoto..."
    
    # Test finale
    ssh "$RASPBERRY_USER@$RASPBERRY_IP" "
        echo '🧪 Test servizi...'
        echo '📊 pcscd:' \$(systemctl is-active pcscd)
        echo '📊 nfc-bridge:' \$(systemctl is-active nfc-bridge)
        echo ''
        echo '🧪 Test API NFC...'
        if curl -s http://localhost:3001/nfc/status >/dev/null 2>&1; then
            echo '✅ API NFC funzionante'
            curl -s http://localhost:3001/nfc/status | head -3
        else
            echo '⚠️ API NFC non risponde (normale durante l'\''avvio)'
        fi
        echo ''
        echo '📋 Ultimi log:'
        tail -n 5 /var/log/nfc-super-fix.log 2>/dev/null || echo 'Log non ancora disponibili'
    "
    
else
    echo "❌ ERRORE DURANTE L'INSTALLAZIONE"
    echo "================================"
    echo ""
    echo "🔍 Per debug, connettiti manualmente:"
    echo "   ssh $RASPBERRY_USER@$RASPBERRY_IP"
    echo "   cd $RASPBERRY_PATH/super-system"
    echo "   sudo ./installa-nfc-super-system.sh"
    exit 1
fi

echo ""
echo "🎯 ISTRUZIONI POST-INSTALLAZIONE:"
echo "================================="
echo ""
echo "1. 🔄 Il sistema si auto-monitora automaticamente"
echo "2. 📊 Logs disponibili in: /var/log/nfc-super-fix.log"
echo "3. 🧪 Test manuale: sudo /home/sapori/scripts/nfc-super-fix.sh"
echo "4. ⚡ Riavvia il Raspberry per test completo: sudo reboot"
echo ""
echo "📞 Il sistema NFC ora dovrebbe essere molto più stabile!"