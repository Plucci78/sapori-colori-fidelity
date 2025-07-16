#!/bin/bash

# Script per sincronizzare modifiche sul Raspberry Pi
# Modifica l'IP del tuo Raspberry Pi qui sotto
RASPBERRY_IP="192.168.1.10"
RASPBERRY_USER="pi"
RASPBERRY_PATH="/home/pi/forno-loyalty"

echo "🚀 SINCRONIZZAZIONE MODIFICHE SUL RASPBERRY PI"
echo "=============================================="

# 1. Build della nuova versione
echo "📦 Building nuova versione..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Errore durante il build!"
    exit 1
fi

# 2. Copia file singoli modificati
echo "📁 Copiando file modificati..."

# App.jsx (sistema moltiplicatori)
scp src/App.jsx $RASPBERRY_USER@$RASPBERRY_IP:$RASPBERRY_PATH/src/

# CustomerView.jsx (interfaccia referral)
scp src/components/Customers/CustomerView.jsx $RASPBERRY_USER@$RASPBERRY_IP:$RASPBERRY_PATH/src/components/Customers/

# NFCView.jsx (fix associazione)
scp src/components/NFCView/NFCView.jsx $RASPBERRY_USER@$RASPBERRY_IP:$RASPBERRY_PATH/src/components/NFCView/

# Nuovo file di configurazione NFC
scp src/config/nfcConfig.js $RASPBERRY_USER@$RASPBERRY_IP:$RASPBERRY_PATH/src/config/

# Server NFC aggiornato
scp nfc-server-fixed.cjs $RASPBERRY_USER@$RASPBERRY_IP:$RASPBERRY_PATH/

# 3. Copia build completo
echo "🔧 Copiando build completo..."
scp -r dist/ $RASPBERRY_USER@$RASPBERRY_IP:$RASPBERRY_PATH/

# 4. Aggiorna configurazione NFC su Raspberry Pi
echo "⚙️ Aggiornando configurazione NFC..."
ssh $RASPBERRY_USER@$RASPBERRY_IP "cd $RASPBERRY_PATH && sed -i \"s/localhost/$RASPBERRY_IP/g\" src/config/nfcConfig.js"

# 5. Riavvia servizi sul Raspberry Pi
echo "🔄 Riavviando servizi..."
ssh $RASPBERRY_USER@$RASPBERRY_IP "cd $RASPBERRY_PATH && pkill -f nfc-server && nohup node nfc-server-fixed.cjs > nfc.log 2>&1 &"

# 6. Riavvia server web (se necessario)
echo "🌐 Riavviando server web..."
ssh $RASPBERRY_USER@$RASPBERRY_IP "cd $RASPBERRY_PATH && pm2 restart all || (npm run build && npm run preview)"

echo "✅ SINCRONIZZAZIONE COMPLETATA!"
echo ""
echo "🔍 Verifica che i servizi siano attivi:"
echo "   http://$RASPBERRY_IP:4173 (interfaccia web)"
echo "   http://$RASPBERRY_IP:3001 (server NFC)"
echo ""
echo "📋 Log NFC: ssh $RASPBERRY_USER@$RASPBERRY_IP 'cd $RASPBERRY_PATH && tail -f nfc.log'"
