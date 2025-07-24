#!/usr/bin/env python3
"""
Script semplice per lettura NFC con timeout
"""

import sys
import json
import subprocess
import time
import signal

def timeout_handler(signum, frame):
    raise TimeoutError("Timeout lettura NFC")

def read_nfc_card(timeout_sec=10):
    """Leggi carta NFC con polling attivo"""
    try:
        start_time = time.time()
        
        while time.time() - start_time < timeout_sec:
            try:
                # Usa pcsc_scan in modalità continua per 1 secondo
                process = subprocess.Popen(
                    ['timeout', '1', 'pcsc_scan'],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                stdout, stderr = process.communicate()
                
                # Controlla se c'è una carta
                if "Card inserted" in stdout and "ATR:" in stdout:
                    lines = stdout.split('\n')
                    for line in lines:
                        if "ATR:" in line:
                            atr = line.split("ATR:")[1].strip()
                            # Estrai solo i primi 4-8 caratteri per UID semplice
                            uid_full = atr.replace(" ", "")
                            uid = uid_full[:8] if len(uid_full) > 8 else uid_full
                            
                            return {
                                "success": True,
                                "uid": uid,
                                "data": uid,
                                "type": "PCSC_UID",
                                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z")
                            }
                
                # Se non ha trovato nulla, aspetta un po' e riprova
                time.sleep(0.5)
                
            except Exception as e:
                time.sleep(0.5)
                continue
        
        return {"success": False, "error": "Timeout - nessuna carta rilevata"}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    timeout = 10
    if len(sys.argv) > 1:
        try:
            timeout = int(sys.argv[1]) / 1000  # Converti da ms a secondi
        except:
            timeout = 10
    
    result = read_nfc_card(timeout)
    print(json.dumps(result))