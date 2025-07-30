#!/bin/bash
# ===================================
# NFC SUPER-FIX SCRIPT - VERSIONE MIGLIORATA
# ===================================
# 
# Script avanzato che monitora e ripara il sistema NFC
# con controlli più approfonditi e recovery intelligente
#

LOG_FILE="/var/log/nfc-super-fix.log"
MAX_LOG_SIZE=2097152  # 2MB
LOCK_FILE="/tmp/nfc-super-fix.lock"

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funzione per limitare dimensione log
rotate_log() {
    if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo 0) -gt $MAX_LOG_SIZE ]; then
        tail -n 200 "$LOG_FILE" > "${LOG_FILE}.tmp" 2>/dev/null
        mv "${LOG_FILE}.tmp" "$LOG_FILE" 2>/dev/null
        echo "$(date '+%Y-%m-%d %H:%M:%S'): 🔄 Log ruotato per dimensione" >> "$LOG_FILE"
    fi
}

# Funzione per loggare con timestamp e colori
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Log su file sempre
    echo "$timestamp: $message" >> "$LOG_FILE" 2>/dev/null
    
    # Output colorato su console se terminale
    if [ -t 1 ]; then
        case $level in
            "ERROR")   echo -e "${RED}$timestamp: $message${NC}" ;;
            "SUCCESS") echo -e "${GREEN}$timestamp: $message${NC}" ;;
            "WARNING") echo -e "${YELLOW}$timestamp: $message${NC}" ;;
            "INFO")    echo -e "${BLUE}$timestamp: $message${NC}" ;;
            *)         echo "$timestamp: $message" ;;
        esac
    fi
}

# Controllo 1: Hardware USB
check_usb_hardware() {
    log_message "INFO" "🔍 Controllo hardware USB..."
    
    if lsusb | grep -qi "acr122u\|072f:2200"; then
        log_message "SUCCESS" "✅ Lettore ACR122U rilevato via USB"
        return 0
    else
        log_message "ERROR" "❌ Lettore ACR122U non trovato via USB"
        
        # Lista tutti i dispositivi USB per debug
        log_message "INFO" "📋 Dispositivi USB disponibili:"
        lsusb >> "$LOG_FILE" 2>&1
        return 1
    fi
}

# Controllo 2: Servizio pcscd
check_pcscd_service() {
    log_message "INFO" "🔍 Controllo servizio pcscd..."
    
    if systemctl is-active --quiet pcscd; then
        log_message "SUCCESS" "✅ pcscd è attivo"
        
        # Verifica anche lo stato dettagliato
        local pcscd_status=$(systemctl status pcscd --no-pager -l | grep "Active:")
        log_message "INFO" "📊 Stato pcscd: $pcscd_status"
        return 0
    else
        log_message "ERROR" "❌ pcscd non è attivo"
        return 1
    fi
}

# Controllo 3: Comunicazione con lettore
check_reader_communication() {
    log_message "INFO" "🔍 Test comunicazione con lettore..."
    
    # Test più approfondito con pcsc_scan
    local scan_output=$(timeout 8 pcsc_scan -n 2>&1)
    local scan_result=$?
    
    if [ $scan_result -eq 0 ] && echo "$scan_output" | grep -qi "reader"; then
        log_message "SUCCESS" "✅ Lettore risponde correttamente"
        log_message "INFO" "📡 Dettagli lettore: $(echo "$scan_output" | grep -i reader | head -1)"
        return 0
    else
        log_message "ERROR" "❌ Lettore non risponde"
        log_message "ERROR" "📋 Output pcsc_scan: $scan_output"
        return 1
    fi
}

# Controllo 4: Servizio NFC Bridge
check_nfc_bridge_service() {
    log_message "INFO" "🔍 Controllo servizio NFC Bridge..."
    
    # Verifica che il servizio sia attivo
    if ! systemctl is-active --quiet nfc-bridge; then
        log_message "ERROR" "❌ nfc-bridge non è attivo"
        return 1
    fi
    
    # Verifica che risponda sulla porta
    if ! timeout 5 bash -c "echo >/dev/tcp/localhost/3001" 2>/dev/null; then
        log_message "ERROR" "❌ nfc-bridge non risponde sulla porta 3001"
        return 1
    fi
    
    # Test API endpoint
    local api_response=$(timeout 8 curl -s http://localhost:3001/nfc/status 2>/dev/null)
    if echo "$api_response" | grep -q '"available":true'; then
        log_message "SUCCESS" "✅ NFC Bridge API funziona correttamente"
        log_message "INFO" "📊 Status: $api_response"
        return 0
    else
        log_message "ERROR" "❌ NFC Bridge API non funziona"
        log_message "ERROR" "📋 Risposta API: $api_response"
        return 1
    fi
}

# Controllo completo della catena NFC
check_nfc_chain() {
    log_message "INFO" "🚀 Avvio controllo completo catena NFC..."
    
    # Sequenza di controlli
    check_usb_hardware || return 1
    check_pcscd_service || return 1
    check_reader_communication || return 1
    check_nfc_bridge_service || return 1
    
    log_message "SUCCESS" "🎉 Catena NFC completa e funzionante!"
    return 0
}

# Procedura di riparazione avanzata
advanced_nfc_repair() {
    log_message "WARNING" "🔧 Avvio procedura riparazione avanzata..."
    
    # Step 1: Ferma il servizio NFC Bridge
    log_message "INFO" "1️⃣ Arresto servizio NFC Bridge..."
    systemctl stop nfc-bridge
    sleep 3
    
    # Step 2: Riavvia pcscd con reset completo
    log_message "INFO" "2️⃣ Reset completo pcscd..."
    systemctl stop pcscd
    sleep 2
    
    # Pulisci eventuali processi orfani
    pkill -f pcscd 2>/dev/null || true
    pkill -f pcsc_scan 2>/dev/null || true
    sleep 2
    
    systemctl start pcscd
    sleep 5
    
    # Step 3: Verifica hardware prima di procedere
    log_message "INFO" "3️⃣ Verifica hardware post-reset..."
    if ! check_usb_hardware; then
        log_message "ERROR" "💥 Hardware USB non disponibile dopo reset"
        return 1
    fi
    
    # Step 4: Test comunicazione lettore
    log_message "INFO" "4️⃣ Test comunicazione lettore..."
    if ! check_reader_communication; then
        log_message "ERROR" "💥 Lettore non risponde dopo reset pcscd"
        
        # Tentativo di reset USB (se possibile)
        log_message "WARNING" "🔄 Tentativo reset USB..."
        echo "0" > /sys/bus/usb/devices/usb*/authorized 2>/dev/null || true
        sleep 2
        echo "1" > /sys/bus/usb/devices/usb*/authorized 2>/dev/null || true
        sleep 5
        
        # Riprova pcscd
        systemctl restart pcscd
        sleep 5
        
        if ! check_reader_communication; then
            log_message "ERROR" "💥 Lettore ancora non risponde dopo reset USB"
            return 1
        fi
    fi
    
    # Step 5: Riavvia NFC Bridge
    log_message "INFO" "5️⃣ Riavvio servizio NFC Bridge..."
    systemctl start nfc-bridge
    sleep 10
    
    # Step 6: Verifica finale
    log_message "INFO" "6️⃣ Verifica finale sistema..."
    if check_nfc_bridge_service; then
        log_message "SUCCESS" "🎉 Riparazione completata con successo!"
        return 0
    else
        log_message "ERROR" "💥 Riparazione fallita - servizio NFC non risponde"
        return 1
    fi
}

# Funzione di monitoraggio con retry intelligente
intelligent_monitor() {
    local max_retries=3
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        if check_nfc_chain; then
            # Sistema OK
            return 0
        else
            retry_count=$((retry_count + 1))
            log_message "WARNING" "⚠️ Tentativo $retry_count/$max_retries fallito"
            
            if [ $retry_count -lt $max_retries ]; then
                log_message "INFO" "⏳ Attendo 30 secondi prima del prossimo tentativo..."
                sleep 30
            fi
        fi
    done
    
    # Se arriviamo qui, tutti i tentativi sono falliti
    log_message "ERROR" "💥 Tutti i tentativi di verifica falliti, avvio riparazione..."
    return 1
}

# Script principale
main() {
    # Rotazione log
    rotate_log
    
    log_message "INFO" "🚀 NFC Super-Fix Script avviato"
    
    # Monitoraggio intelligente
    if intelligent_monitor; then
        # Sistema funziona, log silenzioso
        log_message "SUCCESS" "✅ Sistema NFC operativo"
        exit 0
    fi
    
    # Sistema non funziona, tenta riparazione
    log_message "WARNING" "⚠️ Sistema NFC non funziona, avvio riparazione..."
    
    if advanced_nfc_repair; then
        log_message "SUCCESS" "🎉 Sistema NFC riparato con successo"
        exit 0
    else
        log_message "ERROR" "💥 Riparazione fallita - potrebbe servire riavvio completo del sistema"
        exit 1
    fi
}

# Gestione lock per evitare esecuzioni multiple
if [ -f "$LOCK_FILE" ]; then
    if kill -0 $(cat "$LOCK_FILE") 2>/dev/null; then
        # Script già in esecuzione
        exit 0
    else
        # Lock file orfano, rimuovi
        rm -f "$LOCK_FILE"
    fi
fi

# Crea lock file
echo $$ > "$LOCK_FILE"

# Trap per pulizia
trap "rm -f $LOCK_FILE" EXIT

# Esegui script principale
main "$@"