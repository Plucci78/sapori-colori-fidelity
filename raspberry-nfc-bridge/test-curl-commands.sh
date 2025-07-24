#!/bin/bash

# Quick curl commands for testing IT-ditron printer functionality
# Use these commands to manually test the printer

echo "🚀 Comandi curl per test stampante IT-ditron"
echo "============================================="
echo ""

echo "1️⃣ Controlla stato stampante:"
echo "curl -s http://localhost:3001/print/status | jq"
echo ""

echo "2️⃣ Test stampa Gift Card:"
echo 'curl -X POST http://localhost:3001/print/gift-card \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '\''{'
echo '    "giftCard": {'
echo '      "code": "MANUAL-TEST-001",'
echo '      "value": "35.50",'
echo '      "recipient_name": "Cliente Test",'
echo '      "purchaser_name": "Staff Test",'
echo '      "expires_at": "2025-12-31T23:59:59Z"'
echo '    }'
echo '  }'\'' | jq'
echo ""

echo "3️⃣ Test stampa Ricevuta:"
echo 'curl -X POST http://localhost:3001/print/receipt \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '\''{'
echo '    "giftCard": {'
echo '      "code": "MANUAL-RECEIPT-001",'
echo '      "value": "20.00"'
echo '    }'
echo '  }'\'' | jq'
echo ""

echo "4️⃣ Verifica stato sistema:"
echo "curl -s http://localhost:3001/health | jq"
echo ""

echo "5️⃣ Comandi CUPS diretti:"
echo "lpstat -p RT-Ditron                    # Stato stampante"
echo "lpq -P RT-Ditron                       # Coda di stampa"
echo "echo 'Test diretto' | lp -d RT-Ditron  # Stampa test"
echo ""

echo "6️⃣ Test via proxy Vercel (se configurato):"
echo "curl -s https://tuodominio.vercel.app/api/print/status | jq"
echo ""

echo "💡 Suggerimenti per il debugging:"
echo "- Controllare i log: tail -f nfc-bridge.log"
echo "- Riavviare il server: pkill -f 'node server.js' && node server.js"
echo "- Verificare CUPS: sudo systemctl status cups (Linux) o brew services list | grep cups (macOS)"