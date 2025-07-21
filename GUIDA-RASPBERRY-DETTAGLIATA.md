# 🍞 GUIDA COMPLETA RASPBERRY PI - SAPORI & COLORI
## Step by Step senza dare nulla per scontato

---

## 🎯 COSA STIAMO FACENDO
Trasformiamo il Raspberry Pi in un "monitor intelligente" che:
- Mostra la tua app web (quella su Vercel) a schermo intero
- Gestisce il lettore NFC USB 
- Non ha più software locale da aggiornare
- Si aggiorna automaticamente quando aggiorni l'app web

---

## 📋 COSA TI SERVE

### **Hardware:**
- [ ] Raspberry Pi (quello che hai già)
- [ ] Scheda microSD (quella attuale o una nuova)
- [ ] Lettore NFC USB (quello che usi già)
- [ ] Monitor/TV con HDMI
- [ ] Tastiera USB (serve solo per setup iniziale)
- [ ] Mouse USB (serve solo per setup iniziale)
- [ ] Cavo ethernet o WiFi funzionante

### **Software da scaricare sul tuo PC:**
- [ ] Raspberry Pi Imager: https://www.raspberrypi.org/software/
- [ ] Software SSH (se Windows: PuTTY, se Mac/Linux: terminale)

---

# 🚀 PROCEDURA COMPLETA

## FASE 1: PREPARAZIONE SCHEDA SD (Sul tuo PC)

### Passo 1.1: Scarica Raspberry Pi Imager
1. Vai su https://www.raspberrypi.org/software/
2. Clicca "Download for Windows" (o Mac/Linux)
3. Installa il programma sul tuo PC

### Passo 1.2: Prepara la scheda SD
1. **IMPORTANTE**: Fai backup di eventuali dati importanti dalla scheda attuale
2. Inserisci la scheda microSD nel tuo PC
3. Apri Raspberry Pi Imager
4. Clicca "CHOOSE OS"
5. Seleziona "Raspberry Pi OS Lite (32-bit)" o "Raspberry Pi OS Lite (64-bit)"
6. Clicca "CHOOSE STORAGE" 
7. Seleziona la tua scheda microSD
8. **IMPORTANTE**: Clicca l'ingranaggio (⚙️) per le impostazioni avanzate:
   - ✅ Abilita SSH
   - ✅ Imposta username: `pi`  
   - ✅ Imposta password: (scegli una password sicura, ricordatela!)
   - ✅ Configura WiFi (se lo usi):
     - Nome rete: (il nome della tua WiFi)
     - Password: (password della tua WiFi)
   - ✅ Imposta timezone: Europe/Rome
9. Clicca "SAVE"
10. Clicca "WRITE" e aspetta che finisca (5-10 minuti)

---

## FASE 2: PRIMO AVVIO RASPBERRY

### Passo 2.1: Accendi il Raspberry
1. Inserisci la scheda SD nel Raspberry Pi
2. Collega monitor HDMI, tastiera e mouse
3. Collega cavo ethernet (se non usi WiFi)
4. Collega alimentazione per ultimo
5. Accendi il monitor
6. Aspetta 2-3 minuti che faccia il primo boot

### Passo 2.2: Trova l'indirizzo IP
Il Raspberry deve essere connesso alla stessa rete del tuo PC.

**Metodo A - Dal Raspberry stesso (se hai monitor):**
1. Quando vedi il prompt `pi@raspberrypi:~$`
2. Scrivi: `ip addr show`
3. Premi INVIO
4. Cerca una riga tipo: `inet 192.168.1.XXX/24`
5. Annotati questo numero (es: 192.168.1.150)

**Metodo B - Dal tuo PC Windows:**
1. Apri "Prompt dei comandi" (scrivi cmd nel menu start)
2. Scrivi: `arp -a`
3. Cerca un IP con descrizione tipo "Raspberry Pi Foundation"

**Metodo C - Dal router:**
1. Apri il browser sul tuo PC
2. Vai su 192.168.1.1 (o l'IP del tuo router)
3. Cerca "dispositivi connessi" o "client DHCP"
4. Trova "raspberrypi" e nota l'IP

### Passo 2.3: Connessione SSH dal PC
**Su Windows con PuTTY:**
1. Apri PuTTY
2. In "Host Name" scrivi l'IP del Raspberry (es: 192.168.1.150)
3. In "Port" scrivi: 22
4. Clicca "Open"
5. Se chiede "trust this host" clicca "Yes"
6. Username: `pi`
7. Password: (quella che hai impostato al passo 1.2)

**Su Mac/Linux:**
1. Apri Terminale
2. Scrivi: `ssh pi@192.168.1.150` (sostituisci con il tuo IP)
3. Se chiede di accettare, scrivi `yes`
4. Password: (quella che hai impostato al passo 1.2)

Ora dovresti vedere: `pi@raspberrypi:~$`

---

## FASE 3: AGGIORNAMENTO SISTEMA

### Passo 3.1: Aggiorna tutti i pacchetti
Copia e incolla questi comandi uno alla volta:

```bash
sudo apt update
```
Aspetta che finisca (1-2 minuti), poi:

```bash
sudo apt upgrade -y
```
Aspetta che finisca (5-15 minuti a seconda della connessione).

### Passo 3.2: Pulizia
```bash
sudo apt autoremove -y
sudo apt autoclean
```

---

## FASE 4: COPIA I FILE DAL TUO PC

### Passo 4.1: Torna sul tuo PC (non chiudere SSH)
Apri una nuova finestra terminale/prompt comandi sul TUO PC (non sul Raspberry).

### Passo 4.2: Trova i file che ho creato
Sul tuo PC, va nella cartella del progetto (dove hai l'app):
```bash
cd /Users/pasqualelucci/forno-loyalty
```

### Passo 4.3: Copia il file setup
**Su Windows:**
```cmd
scp raspberry-setup.sh pi@192.168.1.150:~/
```

**Su Mac/Linux:**
```bash
scp raspberry-setup.sh pi@192.168.1.150:~/
```

### Passo 4.4: Copia la cartella bridge
**Su Windows:**
```cmd
scp -r raspberry-nfc-bridge pi@192.168.1.150:~/
```

**Su Mac/Linux:**
```bash
scp -r raspberry-nfc-bridge pi@192.168.1.150:~/
```

Inserisci la password del Raspberry quando richiesta.

---

## FASE 5: MODIFICA URL APP

### Passo 5.1: Torna sulla finestra SSH del Raspberry
Dovresti vedere `pi@raspberrypi:~$`

### Passo 5.2: Modifica il file setup
```bash
nano raspberry-setup.sh
```

### Passo 5.3: Cambia l'URL
1. Usa le frecce per andare alla riga che dice:
   ```
   WEBAPP_URL="https://your-app.vercel.app"
   ```

2. Cancella `your-app.vercel.app` 

3. Scrivi l'URL della TUA app Vercel (esempio):
   ```
   WEBAPP_URL="https://forno-loyalty.vercel.app"
   ```

4. Premi `Ctrl+X` per uscire
5. Premi `Y` per salvare
6. Premi `INVIO` per confermare

---

## FASE 6: ESEGUI SETUP AUTOMATICO

### Passo 6.1: Rendi eseguibile lo script
```bash
chmod +x raspberry-setup.sh
```

### Passo 6.2: Esegui lo script
```bash
./raspberry-setup.sh
```

Lo script farà tutto automaticamente:
- ✅ Installa browser e componenti grafici
- ✅ Installa Node.js
- ✅ Installa librerie NFC
- ✅ Configura il bridge NFC
- ✅ Configura l'autostart
- ✅ Configura kiosk mode

**ASPETTA**: Il processo dura 10-30 minuti a seconda della connessione internet.

### Passo 6.3: Completamento
Alla fine lo script chiederà:
```
🤔 Vuoi riavviare ora per completare la configurazione? (s/n):
```

Scrivi `s` e premi INVIO.

---

## FASE 7: VERIFICA FUNZIONAMENTO

### Passo 7.1: Primo riavvio
Il Raspberry si riavvierà automaticamente. 

1. **Aspetta 2-3 minuti** per il boot completo
2. Lo schermo dovrebbe diventare nero, poi apparire l'app web
3. L'app dovrebbe caricarsi a **schermo intero**

### Passo 7.2: Collega lettore NFC
1. Spegni il Raspberry: `sudo shutdown -h now` (via SSH se ancora connesso)
2. Scollega alimentazione
3. **Collega lettore NFC USB**
4. Ricollega alimentazione

### Passo 7.3: Test NFC
1. Vai alla sezione NFC dell'app
2. Prova a leggere una tessera
3. Dovresti vedere i dati della carta

---

## ⚠️ RISOLUZIONE PROBLEMI COMUNI

### **Problema: Schermo nero dopo riavvio**
**Soluzione:**
1. Connettiti via SSH: `ssh pi@192.168.1.150`
2. Controlla errori: `sudo journalctl -xe`
3. Riavvia interfaccia grafica: `sudo systemctl restart lightdm`

### **Problema: App non si carica**
**Soluzione:**
1. Via SSH controlla: `curl -I https://[tua-app].vercel.app`
2. Se non risponde, controlla URL nel file setup
3. Modifica: `nano /home/pi/start-kiosk.sh`

### **Problema: NFC non funziona**
**Soluzione:**
1. Controlla se lettore è riconosciuto: `lsusb`
2. Controlla log bridge: `sudo journalctl -u nfc-bridge -f`
3. Riavvia servizio: `sudo systemctl restart nfc-bridge`

### **Problema: Non riesco a connettermi via SSH**
**Soluzione:**
1. Controlla IP del Raspberry
2. Verifica che SSH sia abilitato nel Raspberry Pi Imager
3. Prova da altro PC sulla stessa rete

---

## 📞 COMANDI UTILI PER DEBUG

### Controllare stato servizi:
```bash
sudo systemctl status nfc-bridge
sudo systemctl status lightdm
```

### Vedere log in tempo reale:
```bash
# Log bridge NFC
sudo journalctl -u nfc-bridge -f

# Log sistema generale
sudo journalctl -f
```

### Riavviare servizi:
```bash
sudo systemctl restart nfc-bridge
sudo systemctl restart lightdm
```

### Test bridge NFC manuale:
```bash
curl http://localhost:3001/health
curl -X POST http://localhost:3001/nfc/read
```

---

## ✅ CHECKLIST FINALE

Una volta completato tutto:

- [ ] Raspberry si accende da solo
- [ ] App web appare a schermo intero
- [ ] Lettore NFC è collegato via USB
- [ ] Tessere NFC vengono lette correttamente
- [ ] Dati vengono salvati nel database
- [ ] Non ci sono messaggi di errore

---

## 🎉 CONGRATULAZIONI!

Ora hai:
- ✅ **Un'unica app** che funziona ovunque
- ✅ **Zero codice doppio** da mantenere
- ✅ **Aggiornamenti automatici** quando modifichi l'app
- ✅ **Sistema stabile** e moderno
- ✅ **Backup automatico** su cloud

Il Raspberry è ora un **terminale intelligente** della tua app web! 🚀

---

## 🆘 SE QUALCOSA VA STORTO

**Non panico!** Contattami e dimmi:
1. In che fase ti sei bloccato
2. Che errore vedi esattamente
3. Screenshot se possibile

Posso aiutarti passo dopo passo! 👍