#!/bin/bash

# Script per ripristinare la sensibilità del lettore NFC ACR122U
# Applica le configurazioni ottimizzate per lettura veloce

echo "🔧 Ripristino sensibilità NFC ACR122U"
echo "====================================="

# 1. Riavvia servizi NFC
echo "1️⃣  Riavvio servizi NFC..."
sudo systemctl restart pcscd
sudo killall nfc-poll nfc-list 2>/dev/null || true
echo "✅ Servizi riavviati"

# 2. Verifica configurazione libnfc
echo ""
echo "2️⃣  Verifica configurazione libnfc..."
if [ -f /etc/nfc/libnfc.conf ]; then
    if grep -q "allow_intrusive_scan = true" /etc/nfc/libnfc.conf; then
        echo "✅ allow_intrusive_scan = true configurato"
    else
        echo "⚠️  Configurazione intrusive_scan non ottimale"
        echo "📝 Modifica manualmente /etc/nfc/libnfc.conf"
    fi
else
    echo "❌ File configurazione /etc/nfc/libnfc.conf non trovato"
fi

# 3. Test veloce del lettore
echo ""
echo "3️⃣  Test veloce del lettore..."
echo "⏳ Avvicinare il tag NFC per 3 secondi..."

if timeout 3s nfc-poll -t 3 -k 2>/dev/null; then
    echo "✅ Lettore risponde correttamente"
else
    echo "⚠️  Lettore non risponde o tag non rilevato"
fi

# 4. Reset alimentazione USB (se necessario)
echo ""
echo "4️⃣  Informazioni per reset USB..."
echo "💡 Se il problema persiste, prova:"
echo "   - Scollegare e ricollegare il lettore USB"
echo "   - sudo usbutils && lsusb (per verificare rilevamento)"
echo "   - sudo systemctl restart nfc-bridge"

echo ""
echo "🏁 Procedura completata!"
echo "🧪 Testa ora la sensibilità toccando leggermente il tag"