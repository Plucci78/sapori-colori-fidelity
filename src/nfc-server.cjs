#!/usr/bin/env node
// Server NFC FIXED per Raspberry Pi
// Gestisce comunicazione con lettore ACR122U via WebSocket e HTTP

const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const http = require('http');
const { NFC } = require('nfc-pcsc');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Stato globale
let nfcReader = null;
let isScanning = false;
let scanTimeout = null;

// Crea server HTTP
const server = http.createServer(app);

// WebSocket Server collegato al server HTTP
const wss = new WebSocket.Server({ server });

console.log(`🚀 Server NFC avviato su porta ${PORT}`);
console.log(`📡 WebSocket Server attivo su ws://localhost:${PORT}`);

// Broadcast a tutti i client WebSocket
function broadcast(message) {
  const data = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
  console.log('📨 Broadcast:', message);
}

// Inizializza NFC
const nfc = new NFC();

nfc.on('reader', reader => {
  console.log(`✅ Lettore NFC connesso: ${reader.reader.name}`);
  nfcReader = reader;
  
  broadcast({
    type: 'READER_CONNECTED',
    data: { name: reader.reader.name }
  });

  reader.on('card', card => {
    console.log(`🎯 Carta rilevata: ${card.uid}`);
    
    if (isScanning) {
      broadcast({
        type: 'CARD_DETECTED',
        data: {
          uid: card.uid,
          type: card.type,
          timestamp: new Date().toISOString()
        }
      });
      
      // Stop scanning dopo rilevamento
      stopScan();
    }
  });

  reader.on('card.off', card => {
    console.log(`📤 Carta rimossa: ${card.uid}`);
    broadcast({
      type: 'CARD_REMOVED',
      data: { uid: card.uid }
    });
  });

  reader.on('error', err => {
    console.error('❌ Errore lettore:', err);
    broadcast({
      type: 'ERROR',
      error: err.message
    });
  });
});

nfc.on('error', err => {
  console.error('❌ Errore NFC:', err);
  broadcast({
    type: 'ERROR',
    error: 'Errore sistema NFC'
  });
});

// Funzioni di controllo scansione
function startScan() {
  if (!nfcReader) {
    throw new Error('Nessun lettore NFC disponibile');
  }
  
  if (isScanning) {
    throw new Error('Scansione già in corso');
  }
  
  isScanning = true;
  
  // Timeout automatico
  scanTimeout = setTimeout(() => {
    stopScan();
    broadcast({
      type: 'SCAN_TIMEOUT',
      data: { message: 'Timeout scansione' }
    });
  }, 30000); // 30 secondi
  
  broadcast({
    type: 'SCAN_STARTED',
    data: { message: 'Scansione avviata' }
  });
  
  return {
    success: true,
    message: 'Scansione avviata',
    timeout: 30000
  };
}

function stopScan() {
  if (scanTimeout) {
    clearTimeout(scanTimeout);
    scanTimeout = null;
  }
  
  isScanning = false;
  
  broadcast({
    type: 'SCAN_STOPPED',
    data: { message: 'Scansione fermata' }
  });
  
  return {
    success: true,
    message: 'Scansione fermata'
  };
}

// API REST Endpoints
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    data: {
      readerConnected: !!nfcReader,
      readerName: nfcReader?.reader?.name || null,
      readerStatus: nfcReader ? 'connected' : 'disconnected',
      isScanning: isScanning,
      timestamp: new Date().toISOString()
    }
  });
});

// Endpoint compatibile per NFCView (senza /api)
app.get('/status', (req, res) => {
  res.json({
    success: true,
    reader: nfcReader ? 'connected' : 'disconnected',
    readerName: nfcReader?.reader?.name || null,
    isScanning: isScanning,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/scan/start', (req, res) => {
  try {
    const result = startScan();
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/scan/stop', (req, res) => {
  try {
    const result = stopScan();
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Root endpoint per verifiche
app.get('/', (req, res) => {
  res.json({
    status: 'NFC Server Running',
    version: '2.0',
    endpoints: ['/api/status', '/api/scan/start', '/api/scan/stop'],
    websocket: 'ws://localhost:3001',
    timestamp: new Date().toISOString()
  });
});

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('🔌 Nuovo client WebSocket connesso');
  
  // Invia stato iniziale
  ws.send(JSON.stringify({
    type: 'CONNECTION_ESTABLISHED',
    data: {
      readerConnected: !!nfcReader,
      readerName: nfcReader?.reader?.name || null,
      isScanning: isScanning
    }
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📨 Messaggio ricevuto:', data);
      
      switch (data.type) {
        case 'START_SCAN':
          try {
            startScan();
            ws.send(JSON.stringify({
              type: 'SCAN_RESULT',
              success: true,
              message: 'Scansione avviata'
            }));
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'SCAN_RESULT',
              success: false,
              error: error.message
            }));
          }
          break;
          
        case 'STOP_SCAN':
          try {
            stopScan();
            ws.send(JSON.stringify({
              type: 'SCAN_RESULT',
              success: true,
              message: 'Scansione fermata'
            }));
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'SCAN_RESULT',
              success: false,
              error: error.message
            }));
          }
          break;
          
        case 'GET_STATUS':
          ws.send(JSON.stringify({
            type: 'STATUS_RESPONSE',
            data: {
              readerConnected: !!nfcReader,
              readerName: nfcReader?.reader?.name || null,
              isScanning: isScanning
            }
          }));
          break;
      }
    } catch (error) {
      console.error('Errore parsing messaggio WebSocket:', error);
      ws.send(JSON.stringify({
        type: 'ERROR',
        error: 'Messaggio non valido'
      }));
    }
  });

  ws.on('close', () => {
    console.log('🔌 Client WebSocket disconnesso');
  });

  ws.on('error', (error) => {
    console.error('❌ Errore WebSocket:', error);
  });
});

console.log('🎯 Server NFC pronto per connessioni!');

// Avvia il server (HTTP + WebSocket)
server.listen(PORT, () => {
  console.log(`🌐 Server HTTP+WebSocket in ascolto su porta ${PORT}`);
});

// Gestione shutdown
process.on('SIGINT', () => {
  console.log('🛑 Arresto server NFC...');
  if (nfcReader) {
    nfcReader.close();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Arresto server NFC...');
  if (nfcReader) {
    nfcReader.close();
  }
  process.exit(0);
});
