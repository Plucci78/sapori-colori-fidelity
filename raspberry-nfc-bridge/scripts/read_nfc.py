#!/usr/bin/env python3
"""
Script Python per lettura NFC tramite PC/SC
Ottimizzato per ACR122U con sensibilità migliorata
"""

import json
import sys
import time
from smartcard.System import readers
from smartcard.util import toHexString
from smartcard.CardRequest import CardRequest
from smartcard.CardConnectionObserver import ConsoleCardConnectionObserver
from smartcard.Exceptions import CardRequestTimeoutException, NoCardException

class NFCReader:
    def __init__(self):
        self.reader_list = readers()
        if not self.reader_list:
            raise Exception("Nessun lettore NFC trovato")
        
        # Usa il primo lettore disponibile
        self.reader = self.reader_list[0]
        print(f"Uso lettore: {self.reader}", file=sys.stderr)

    def configure_leds(self, connection):
        """
        Configura LED e beep per ACR122U
        """
        try:
            # Comando per configurare LED: LED rosso ON quando in attesa
            led_red_on = [0xFF, 0x00, 0x40, 0x0F, 0x04, 0x01, 0x01, 0x01, 0x01]
            connection.transmit(led_red_on)
            
            # Comando per abilitare beep
            buzzer_on = [0xFF, 0x00, 0x52, 0x00, 0x00, 0x02, 0x01, 0x05]
            connection.transmit(buzzer_on)
            
        except Exception as e:
            print(f"Errore configurazione LED/beep: {e}", file=sys.stderr)

    def read_tag(self, timeout_sec=10):
        """
        Leggi tag NFC con sensibilità ottimizzata e LED/beep
        """
        try:
            # Configurazione per polling più frequente
            cardrequest = CardRequest(readers=[self.reader])
            
            print("In attesa di tag NFC...", file=sys.stderr)
            
            # Polling a intervalli più brevi per migliorare sensibilità
            end_time = time.time() + timeout_sec
            while time.time() < end_time:
                try:
                    # Prova a connettersi con timeout breve
                    import signal
                    
                    def timeout_handler(signum, frame):
                        raise CardRequestTimeoutException()
                    
                    signal.signal(signal.SIGALRM, timeout_handler)
                    signal.alarm(1)  # 1 secondo di timeout
                    
                    try:
                        cardservice = cardrequest.waitforcard()
                        signal.alarm(0)  # Cancella timeout
                        cardservice.connection.connect()
                        
                        # Leggi UID del tag
                        get_uid_cmd = [0xFF, 0xCA, 0x00, 0x00, 0x00]
                        response, sw1, sw2 = cardservice.connection.transmit(get_uid_cmd)
                        
                        if sw1 == 0x90 and sw2 == 0x00:
                            uid_hex = toHexString(response).replace(' ', '')
                            
                            result = {
                                "success": True,
                                "uid": uid_hex,
                                "data": uid_hex,
                                "type": "LIBNFC_UID",
                                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                                "reader": str(self.reader)
                            }
                            
                            cardservice.connection.disconnect()
                            return result
                        else:
                            cardservice.connection.disconnect()
                            raise Exception(f"Errore lettura UID: {sw1:02X} {sw2:02X}")
                    
                    except:
                        signal.alarm(0)  # Assicurati di cancellare il timeout
                        raise
                        
                except (CardRequestTimeoutException, Exception):
                    # Continua il polling
                    time.sleep(0.2)
                    continue
                    
            # Timeout raggiunto
            raise Exception("Timeout: Nessun tag rilevato")
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
            }

def main():
    try:
        reader = NFCReader()
        result = reader.read_tag()
        print(json.dumps(result))
        
        if result.get("success"):
            sys.exit(0)
        else:
            sys.exit(1)
            
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()