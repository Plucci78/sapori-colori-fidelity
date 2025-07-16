// src/config/nfcConfig.js

// IMPORTANTE:
// Sostituisci 'localhost' con l'indirizzo IP del tuo Raspberry Pi
// dove è in esecuzione il server NFC (nfc-server-fixed.cjs).
//
// Esempio:
// const NFC_SERVER_URL = 'http://192.168.1.10:3001';
//
// Se stai eseguendo il server NFC sulla stessa macchina dove esegui l'app React,
// puoi lasciare 'http://localhost:3001'.

const NFC_SERVER_URL = 'http://localhost:3001'

export { NFC_SERVER_URL }
