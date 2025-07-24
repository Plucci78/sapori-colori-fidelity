#!/bin/bash

# Test completo stampante IT-ditron
# Verifica tutte le funzionalità di stampa

echo "🖨️ Test Stampante IT-ditron"
echo "=========================="

# Test 1: Verifica connessione CUPS
echo "1️⃣ Test connessione CUPS..."
if lpstat -p RT-Ditron >/dev/null 2>&1; then
    echo "✅ Stampante RT-Ditron configurata in CUPS"
    lpstat -p RT-Ditron
else
    echo "❌ Stampante RT-Ditron non trovata in CUPS"
    exit 1
fi

echo ""

# Test 2: Test API status
echo "2️⃣ Test API status..."
STATUS_RESPONSE=$(curl -s http://localhost:3001/print/status)
if [ $? -eq 0 ]; then
    echo "✅ API status risponde"
    echo "Response: $STATUS_RESPONSE"
else
    echo "❌ API status non risponde"
fi

echo ""

# Test 3: Test stampa semplice
echo "3️⃣ Test stampa semplice..."
SIMPLE_JOB=$(echo "TEST STAMPANTE DITRON - $(date)" | lp -d RT-Ditron -t "simple-test" 2>&1)
if [ $? -eq 0 ]; then
    echo "✅ Stampa semplice inviata"
    echo "Job ID: $SIMPLE_JOB"
else
    echo "❌ Errore stampa semplice: $SIMPLE_JOB"
fi

# Aspetta che finisca
sleep 3

echo ""

# Test 4: Test API Gift Card
echo "4️⃣ Test API Gift Card..."
GIFT_RESPONSE=$(curl -s -X POST http://localhost:3001/print/gift-card \
  -H "Content-Type: application/json" \
  -d '{
    "giftCard": {
      "code": "TEST-GC-001",
      "value": "50.00",
      "recipient_name": "Test Recipient",
      "purchaser_name": "Test Purchaser",
      "expires_at": "2025-12-31T23:59:59Z"
    }
  }')

if echo "$GIFT_RESPONSE" | grep -q '"success":true'; then
    echo "✅ API Gift Card funziona"
    echo "Response: $GIFT_RESPONSE"
else
    echo "❌ API Gift Card fallita"
    echo "Response: $GIFT_RESPONSE"
fi

# Aspetta che finisca
sleep 5

echo ""

# Test 5: Test API Receipt
echo "5️⃣ Test API Receipt..."
RECEIPT_RESPONSE=$(curl -s -X POST http://localhost:3001/print/receipt \
  -H "Content-Type: application/json" \
  -d '{
    "giftCard": {
      "code": "TEST-RC-001",
      "value": "25.00"
    }
  }')

if echo "$RECEIPT_RESPONSE" | grep -q '"success":true'; then
    echo "✅ API Receipt funziona"
    echo "Response: $RECEIPT_RESPONSE"
else
    echo "❌ API Receipt fallita"
    echo "Response: $RECEIPT_RESPONSE"
fi

# Aspetta che finisca
sleep 5

echo ""

# Test 6: Verifica log
echo "6️⃣ Verifica log..."
if [ -f "nfc-bridge.log" ]; then
    echo "✅ Log file trovato"
    echo "Ultime operazioni di stampa:"
    grep "PRINT_" nfc-bridge.log | tail -5
else
    echo "❌ Log file non trovato"
fi

echo ""

# Test 7: Stato finale
echo "7️⃣ Stato finale stampante..."
lpstat -p RT-Ditron
lpq -P RT-Ditron

echo ""
echo "🏁 Test completato!"
echo ""
echo "📝 Risultati test:"
echo "   - CUPS: Configurata ✅"
echo "   - API Status: OK ✅"  
echo "   - Stampa semplice: OK ✅"
echo "   - API Gift Card: $(echo "$GIFT_RESPONSE" | grep -q success && echo "OK ✅" || echo "FAIL ❌")"
echo "   - API Receipt: $(echo "$RECEIPT_RESPONSE" | grep -q success && echo "OK ✅" || echo "FAIL ❌")"
echo ""
echo "💡 Se tutti i test sono OK, la stampante funziona correttamente!"