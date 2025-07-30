#!/bin/bash
# ===================================
# NFC AUTO-FIX SCRIPT
# ===================================
# 
# Script che monitora il servizio NFC e lo ripara automaticamente
# quando non funziona. Risolve il problema del timeout lettore
# dopo riavvio del Raspberry Pi.
#
# Installazione:
# 1. Copia in /home/sapori/scripts/nfc-auto-fix.sh
# 2. chmod +x /home/sapori/scripts/nfc-auto-fix.sh  
# 3. Aggiungi a crontab: */2 * * * * /home/sapori/scripts/nfc-auto-fix.sh
#

LOG_FILE="/var/log/nfc-autofix.log"
MAX_LOG_SIZE=1048576  # 1MB

# Funzione per limitare dimensione log
rotate_log() {
    if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo 0) -gt $MAX_LOG_SIZE ]; then
        tail -n 100 "$LOG_FILE" > "${LOG_FILE}.tmp" 2>/dev/null
        mv "${LOG_FILE}.tmp" "$LOG_FILE" 2>/dev/null
    fi
}

# Funzione per loggare con timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" >> "$LOG_FILE" 2>/dev/null
}

# Controlla se il servizio NFC funziona
check_nfc_service() {
    # Verifica che il servizio sia attivo
    if ! systemctl is-active --quiet nfc-bridge; then
        return 1
    fi
    
    # Verifica che risponda sulla porta
    if ! timeout 3 bash -c "echo >/dev/tcp/localhost/3001" 2>/dev/null; then
        return 1
    fi
    
    # Verifica che l'NFC sia disponibile
    local response=$(timeout 5 curl -s http://localhost:3001/nfc/status 2>/dev/null)
    if echo "$response" | grep -q '"available":true'; then
        return 0
    else
        return 1
    fi
}

# Controlla se il lettore USB è collegato
check_usb_reader() {
    lsusb | grep -qi "acr122u\|072f:2200"
}

# Fix del servizio NFC 
fix_nfc_service() {
    log_message "🔧 Avvio procedura riparazione NFC..."
    
    # Verifica lettore USB
    if ! check_usb_reader; then
        log_message "❌ Lettore ACR122U non trovato via USB"
        return 1
    fi
    
    log_message "📡 Lettore USB rilevato, riavvio servizi..."
    
    # Riavvia pcscd
    systemctl restart pcscd
    sleep 2
    
    # Verifica che pcscd sia attivo
    if ! systemctl is-active --quiet pcscd; then
        log_message "⚠️  pcscd non si è avviato correttamente"
    fi
    
    # Riavvia nfc-bridge
    systemctl restart nfc-bridge
    sleep 3
    
    # Verifica risultato
    if check_nfc_service; then
        log_message "✅ NFC riparato con successo"
        return 0
    else
        log_message "❌ NFC ancora non funziona dopo riparazione"
        return 1
    fi
}

# Script principale
main() {
    # Rotazione log se necessario
    rotate_log
    
    # Controlla se NFC funziona
    if check_nfc_service; then
        # NFC funziona, non fare nulla
        # log_message "✅ NFC funziona correttamente" # Decommentare per debug
        exit 0
    fi
    
    # NFC non funziona, tenta riparazione
    log_message "⚠️  NFC non disponibile, avvio riparazione..."
    
    if fix_nfc_service; then
        log_message "🎉 Riparazione completata con successo"
        exit 0
    else
        log_message "💥 Riparazione fallita - potrebbe servire riavvio completo"
        exit 1
    fi
}

# Esegui solo se non in esecuzione
PIDFILE="/tmp/nfc-autofix.pid"
if [ -f "$PIDFILE" ]; then
    if kill -0 $(cat "$PIDFILE") 2>/dev/null; then
        # Script già in esecuzione
        exit 0
    else
        # PID file orfano, rimuovi
        rm -f "$PIDFILE"
    fi
fi

# Crea PID file
echo $$ > "$PIDFILE"

# Esegui script principale
main

# Rimuovi PID file
rm -f "$PIDFILE"