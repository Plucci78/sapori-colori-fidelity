#!/bin/bash
# ===================================
# DEPLOY NFC SUPER SYSTEM CON PASSWORD
# ===================================
#
# Script per trasferire e installare il sistema NFC migliorato
# sul Raspberry Pi tramite SSH con autenticazione password
#
# Uso: bash deploy-with-password.sh [IP_RASPBERRY] [UTENTE]
#

set -e

# Configurazione
RASPBERRY_IP=${1:-"192.168.1.6"}
RASPBERRY_USER=${2:-"sapori"}
RASPBERRY_PATH="/home/$RASPBERRY_USER/nfc-bridge"

echo "🚀 Deploy NFC Super System su Raspberry Pi (con password)"
echo "========================================================"
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
echo "🔐 IMPORTANTE: Ti verrà chiesta la password SSH più volte"
echo "💡 Suggerimento: usa la stessa password per tutti i comandi"
echo ""

echo "📁 Creazione directory di destinazione..."
echo "🔐 Inserisci la password SSH quando richiesto:"

# Crea directory se non esiste
ssh "$RASPBERRY_USER@$RASPBERRY_IP" "
    mkdir -p $RASPBERRY_PATH/super-system
    echo '✅ Directory creata: $RASPBERRY_PATH/super-system'
"

echo ""
echo "📤 Trasferimento file..."
echo "🔐 Inserisci la password per ogni file:"

# Trasferisci tutti i file
for file in "${FILES_TO_DEPLOY[@]}"; do
    echo ""
    echo "📤 Trasferisco $file..."
    scp "$file" "$RASPBERRY_USER@$RASPBERRY_IP:$RASPBERRY_PATH/super-system/"
    echo "✅ $file trasferito"
done

echo ""
echo "🔧 Esecuzione installazione remota..."
echo "🔐 Inserisci la password per l'ultima volta:"

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
    
    echo "🧪 Test finale del sistema..."
    echo "🔐 Password richiesta per il test finale:"
    
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
        echo '📋 Ultimi 5 log:'
        tail -n 5 /var/log/nfc-super-fix.log 2>/dev/null || echo 'Log non ancora disponibili'
    "
    
    echo ""
    echo "🎯 ISTRUZIONI POST-INSTALLAZIONE:"
    echo "================================="
    echo ""
    echo "1. 🔄 Il sistema si auto-monitora automaticamente"
    echo "2. 📊 Per vedere i log: ssh $RASPBERRY_USER@$RASPBERRY_IP 'tail -f /var/log/nfc-super-fix.log'"
    echo "3. 🧪 Test manuale: ssh $RASPBERRY_USER@$RASPBERRY_IP 'sudo /home/$RASPBERRY_USER/scripts/nfc-super-fix.sh'"
    echo "4. ⚡ Riavvia per test completo: ssh $RASPBERRY_USER@$RASPBERRY_IP 'sudo reboot'"
    echo ""
    echo "📞 Il sistema NFC ora dovrebbe essere molto più stabile!"
    
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