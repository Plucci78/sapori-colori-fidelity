#!/usr/bin/env python3
"""
Script Python per lettura NFC real-time con ACR122U
Gestisce correttamente inserimento/rimozione carte
"""

import sys
import json
import time
from smartcard.System import readers
from smartcard.util import toHexString
from smartcard.Exceptions import CardConnectionException, NoCardException

def wait_for_card(timeout=10):
    """Aspetta che una carta venga inserita"""
    try:
        # Ottieni lista lettori
        reader_list = readers()
        if not reader_list:
            return {"success": False, "error": "Nessun lettore NFC trovato"}
        
        reader = reader_list[0]  # Usa primo lettore
        
        # Aspetta carta per timeout secondi
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                # Prova a connettersi alla carta
                connection = reader.createConnection()
                connection.connect()
                
                # Se arriviamo qui, c'è una carta
                atr = connection.getATR()
                atr_hex = toHexString(atr).replace(' ', '')
                
                connection.disconnect()
                
                return {
                    "success": True,
                    "data": atr_hex,
                    "uid": atr_hex,
                    "type": "PICC",
                    "reader": str(reader),
                    "timestamp": time.strftime('%Y-%m-%dT%H:%M:%S.%fZ')
                }
                
            except (NoCardException, CardConnectionException):
                # Nessuna carta, aspetta un po'
                time.sleep(0.1)
                continue
            except Exception as e:
                return {"success": False, "error": f"Errore lettura: {str(e)}"}
        
        # Timeout raggiunto
        return {"success": False, "error": "Timeout - nessuna carta rilevata"}
        
    except Exception as e:
        return {"success": False, "error": f"Errore sistema: {str(e)}"}

if __name__ == "__main__":
    # Leggi timeout da argomento o usa default
    timeout = 10
    if len(sys.argv) > 1:
        try:
            timeout = int(sys.argv[1]) / 1000  # Converti da ms a secondi
        except:
            timeout = 10
    
    result = wait_for_card(timeout)
    print(json.dumps(result))