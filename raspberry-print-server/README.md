# 🖨️ Forno Print Server

Server di stampa dedicato per stampante termica Bisofice ESC/POS 80mm.

## 🚀 Setup

### Installazione dipendenze
```bash
cd raspberry-print-server
npm install
```

### Avvio server
```bash
npm start
```

### Sviluppo con auto-reload
```bash
npm run dev
```

## 🔧 Configurazione

### Stampante
- **Modello**: Bisofice ESC/POS 80mm
- **Connessione**: Ethernet
- **IP**: 192.168.1.100
- **Porta**: 9100
- **Protocollo**: ESC/POS

### Server
- **Porta**: 3002
- **CORS**: Abilitato per tutte le origini

## 📡 API Endpoints

### GET /print/status
Controlla lo stato della stampante
```json
{
  "connected": true,
  "printerType": "Bisofice ESC/POS 80mm",
  "interface": "192.168.1.100:9100",
  "lastCheck": "2025-01-XX..."
}
```

### POST /print/gift-card
Stampa una Gift Card
```json
{
  "code": "GC-2025-001",
  "value": "50.00",
  "recipient": "Mario Rossi",
  "purchaser": "Luca Bianchi",
  "notes": "Buon compleanno!"
}
```

### POST /print/test
Stampa di test con dati predefiniti

### GET /health
Health check del servizio

## 🖨️ Layout Stampa

```
================================
    🎁 SAPORI E COLORI 🎁
================================

         GIFT CARD

CODICE:
GC-2025-001

VALORE:
€ 50.00

PER:
MARIO ROSSI

DA:
LUCA BIANCHI

NOTE:
Buon compleanno!

EMESSA IL:
25/07/2025 - 17:45

--------------------------------
Valida fino al 31/12/2025
Non rimborsabile in denaro
Utilizzabile in un'unica soluzione
--------------------------------

Via Esempio 123, Città
Tel: 123-456-7890
www.saporiecolori.it

Grazie per la vostra fiducia!
```

## 🛡️ Sicurezza

- **Porta separata** (3002) dall'NFC server (3001)
- **Processo isolato** senza interferenze
- **Connessione Ethernet** dedicata
- **Nessun conflitto** con altri servizi

## 🔧 Troubleshooting

### Stampante non connessa
1. Verificare connessione Ethernet
2. Ping all'IP: `ping 192.168.1.100`
3. Test porta: `nc -zv 192.168.1.100 9100`

### Errori di stampa
- Controllare carta nella stampante
- Verificare che non sia in pausa
- Riavviare il server se necessario