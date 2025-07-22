#!/bin/bash

# Script per testare la sensibilità del lettore NFC ACR122U
# Esegue diversi test per verificare la configurazione ottimale

echo "🔍 Test sensibilità NFC ACR122U"
echo "================================"

# Test 1: Verifica lettore disponibile
echo "1️⃣  Test rilevamento lettore..."
if command -v pcsc_scan &> /dev/null; then
    timeout 3s pcsc_scan -n
    echo "✅ PC/SC disponibile"
else
    echo "❌ PC/SC non installato"
fi

# Test 2: Verifica libnfc
echo ""
echo "2️⃣  Test libnfc..."
if command -v nfc-list &> /dev/null; then
    nfc-list -t 1
    echo "✅ libnfc disponibile"
else
    echo "❌ libnfc non installato"
fi

# Test 3: Test polling veloce
echo ""
echo "3️⃣  Test polling veloce (avvicinare tag)..."
if command -v nfc-poll &> /dev/null; then
    echo "⏳ Polling per 5 secondi..."
    timeout 5s nfc-poll -t 5 -k
    echo "✅ Test polling completato"
else
    echo "❌ nfc-poll non disponibile"
fi

# Test 4: Verifica configurazione
echo ""
echo "4️⃣  Verifica configurazioni..."
echo "📄 /etc/nfc/libnfc.conf:"
if [ -f /etc/nfc/libnfc.conf ]; then
    cat /etc/nfc/libnfc.conf | grep -E "(allow_intrusive_scan|allow_autoscan)"
else
    echo "❌ File configurazione non trovato"
fi

echo ""
echo "🏁 Test completato!"
echo "📝 Se il tag non viene rilevato facilmente:"
echo "   1. Verificare che allow_intrusive_scan = true"
echo "   2. Riavviare il servizio pcscd: sudo systemctl restart pcscd"
echo "   3. Verificare alimentazione USB del lettore"