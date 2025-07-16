#!/usr/bin/env node
// Server NFC FIXED per Raspberry Pi
// Gestisce comunicazione con lettore ACR122U via WebSocket

const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
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

// WebSocket Server
const wss = new WebSocket.Server({ port: PORT });

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
  console.log('🔍 Scansione avviata...');
  
  broadcast({
    type: 'SCAN_STARTED',
    data: { timestamp: new Date().toISOString() }
  });
  
  // Timeout automatico dopo 30 secondi
  scanTimeout = setTimeout(() => {
    stopScan();
    broadcast({
      type: 'SCAN_TIMEOUT',
      data: { message: 'Scansione scaduta' }
    });
  }, 30000);
  
  return { success: true, message: 'Scansione avviata' };
}

function stopScan() {
  isScanning = false;
  
  if (scanTimeout) {
    clearTimeout(scanTimeout);
    scanTimeout = null;
  }
  
  console.log('⏹️ Scansione fermata');
  
  broadcast({
    type: 'SCAN_STOPPED',
    data: { timestamp: new Date().toISOString() }
  });
  
  return { success: true, message: 'Scansione fermata' };
}

// API REST Endpoints
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    data: {
      readerConnected: !!nfcReader,
      readerName: nfcReader?.reader?.name || null,
      isScanning: isScanning,
      timestamp: new Date().toISOString()
    }
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

// WebSocket Connection Handler
wss.on('connection', (ws) => {
  console.log('🔌 Cliente WebSocket connesso');
  
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
            const result = startScan();
            ws.send(JSON.stringify({
              type: 'SCAN_RESPONSE',
              data: result
            }));
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              error: error.message
            }));
          }
          break;
          
        case 'STOP_SCAN':
          try {
            const result = stopScan();
            ws.send(JSON.stringify({
              type: 'SCAN_RESPONSE',
              data: result
            }));
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'ERROR',
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
      console.error('❌ Errore parsing messaggio:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 Cliente WebSocket disconnesso');
  });
});

// Gestione shutdown pulita
process.on('SIGINT', () => {
  console.log('\n🛑 Arresto server NFC...');
  if (nfcReader) {
    nfcReader.close();
  }
  process.exit(0);
});

console.log('🎯 Server NFC pronto per connessioni!');
