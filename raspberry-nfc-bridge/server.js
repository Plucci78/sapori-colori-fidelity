#!/usr/bin/env node

/**
 * ===================================
 * RASPBERRY NFC BRIDGE SERVER
 * ===================================
 * 
 * Server Node.js che espone API REST per gestire
 * lettore NFC USB sul Raspberry Pi
 * 
 * Uso: node server.js
 * API: http://localhost:3001/nfc/*
 */

const express = require('express')
const cors = require('cors')
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const app = express()
const PORT = process.env.NFC_BRIDGE_PORT || 3001

// Middleware CORS permissivo per tunnel Cloudflare
app.use(cors({
  origin: true, // Temporaneamente permissivo
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json())

// Log delle operazioni
const logOperation = (operation, data = null, error = null) => {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    operation,
    data: data ? JSON.stringify(data) : null,
    error: error ? error.message : null
  }
  
  console.log(`[${timestamp}] ${operation}:`, data || error?.message || 'OK')
  
  // Log su file (opzionale)
  const logFile = path.join(__dirname, 'nfc-bridge.log')
  fs.appendFile(logFile, JSON.stringify(logEntry) + '\n', (err) => {
    if (err) console.error('Errore scrittura log:', err)
  })
}

// Stato del bridge
let nfcStatus = {
  available: false,
  readerType: null,
  lastCheck: null,
  error: null
}

/**
 * Rileva il tipo di lettore NFC disponibile
 */
const detectNFCReader = async () => {
  return new Promise((resolve) => {
    // Controlla se nfc-list è disponibile (libnfc)
    const nfcList = spawn('nfc-list', ['-t', '0.5'])
    
    let output = ''
    let hasError = false
    
    nfcList.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    nfcList.stderr.on('data', (data) => {
      hasError = true
      console.error('nfc-list stderr:', data.toString())
    })
    
    nfcList.on('close', (code) => {
      if (code === 0 && !hasError && output.includes('NFC device')) {
        nfcStatus = {
          available: true,
          readerType: 'libnfc',
          lastCheck: new Date().toISOString(),
          error: null
        }
        resolve(nfcStatus)
      } else {
        // Prova con nfc-pcsc (alternativo)
        checkPCSC().then(resolve)
      }
    })
    
    nfcList.on('error', () => {
      checkPCSC().then(resolve)
    })
  })
}

/**
 * Controlla lettore PC/SC
 */
const checkPCSC = async () => {
  return new Promise((resolve) => {
    const pcscScan = spawn('pcsc_scan', ['-n'])
    
    let hasReader = false
    
    pcscScan.stdout.on('data', (data) => {
      const output = data.toString()
      if (output.includes('Reader') || output.includes('Card')) {
        hasReader = true
      }
    })
    
    pcscScan.on('close', () => {
      if (hasReader) {
        nfcStatus = {
          available: true,
          readerType: 'pcsc',
          lastCheck: new Date().toISOString(),
          error: null
        }
      } else {
        nfcStatus = {
          available: false,
          readerType: null,
          lastCheck: new Date().toISOString(),
          error: 'Nessun lettore NFC rilevato'
        }
      }
      resolve(nfcStatus)
    })
    
    pcscScan.on('error', (error) => {
      nfcStatus = {
        available: false,
        readerType: null,
        lastCheck: new Date().toISOString(),
        error: error.message
      }
      resolve(nfcStatus)
    })
    
    // Timeout dopo 3 secondi
    setTimeout(() => {
      pcscScan.kill()
      if (!nfcStatus.lastCheck) {
        nfcStatus = {
          available: false,
          readerType: null,
          lastCheck: new Date().toISOString(),
          error: 'Timeout rilevamento lettore'
        }
      }
      resolve(nfcStatus)
    }, 3000)
  })
}

/**
 * Leggi tag NFC
 */
const readNFCTag = async (timeout = 5000) => {
  if (!nfcStatus.available) {
    throw new Error('Lettore NFC non disponibile')
  }

  return new Promise((resolve, reject) => {
    let nfcProcess
    let timeoutHandle
    
    if (nfcStatus.readerType === 'libnfc') {
      // Usa polling più aggressivo per migliore sensibilità
      nfcProcess = spawn('nfc-poll', ['-t', Math.floor(timeout / 1000).toString(), '-k'])
    } else if (nfcStatus.readerType === 'pcsc') {
      // Forza uso di libnfc per maggiore stabilità
      console.log('🔧 Uso libnfc per maggiore sensibilità')
      nfcProcess = spawn('nfc-poll', ['-t', Math.floor(timeout / 1000).toString(), '-k'])
    } else {
      reject(new Error('Tipo lettore NFC non supportato'))
      return
    }

    let output = ''
    let errorOutput = ''

    nfcProcess.stdout.on('data', (data) => {
      output += data.toString()
    })

    nfcProcess.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    nfcProcess.on('close', (code) => {
      clearTimeout(timeoutHandle)
      
      if (code === 0 && output) {
        try {
          // Parsing output basato sul tipo di lettore
          const result = parseNFCOutput(output, nfcStatus.readerType)
          resolve(result)
        } catch (parseError) {
          reject(new Error(`Errore parsing: ${parseError.message}`))
        }
      } else {
        reject(new Error(`Errore lettura NFC: ${errorOutput || 'Codice uscita: ' + code}`))
      }
    })

    nfcProcess.on('error', (error) => {
      clearTimeout(timeoutHandle)
      reject(error)
    })

    // Timeout
    timeoutHandle = setTimeout(() => {
      nfcProcess.kill()
      reject(new Error('Timeout lettura NFC'))
    }, timeout)
  })
}

/**
 * Parsing dell'output del lettore NFC
 */
const parseNFCOutput = (output, readerType) => {
  const result = {
    success: true,
    data: null,
    uid: null,
    type: null,
    timestamp: new Date().toISOString()
  }

  if (readerType === 'libnfc') {
    // Parse output nfc-poll
    const lines = output.split('\n')
    
    for (const line of lines) {
      if (line.includes('UID')) {
        const match = line.match(/UID.*?:(.*)/)
        if (match) {
          result.uid = match[1].trim().replace(/\s/g, '')
        }
      }
      if (line.includes('ATQA') || line.includes('SAK')) {
        result.type = 'MIFARE'
      }
    }

    // Se abbiamo un UID, è un successo
    if (result.uid) {
      result.data = result.uid
    } else {
      throw new Error('UID non trovato nell\'output')
    }

  } else if (readerType === 'pcsc') {
    // Parse output PC/SC (implementare in base al tuo script Python)
    try {
      const jsonOutput = JSON.parse(output)
      result.data = jsonOutput.data || jsonOutput.uid
      result.uid = jsonOutput.uid
      result.type = jsonOutput.type || 'Unknown'
    } catch {
      // Se non è JSON, tratta come UID raw
      result.data = output.trim()
      result.uid = output.trim()
      result.type = 'Raw'
    }
  }

  return result
}

// ===================================
// API ENDPOINTS
// ===================================

/**
 * GET /nfc/status - Stato del bridge NFC
 */
app.get('/nfc/status', async (req, res) => {
  try {
    const status = await detectNFCReader()
    logOperation('STATUS_CHECK', status)
    res.json(status)
  } catch (error) {
    logOperation('STATUS_CHECK', null, error)
    res.status(500).json({
      available: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * POST /nfc/read - Leggi tag NFC
 */
app.post('/nfc/read', async (req, res) => {
  try {
    const { timeout = 10000 } = req.body
    
    logOperation('READ_START', { timeout })
    
    const result = await readNFCTag(timeout)
    
    logOperation('READ_SUCCESS', result)
    
    res.json(result)
    
  } catch (error) {
    logOperation('READ_ERROR', null, error)
    
    res.status(400).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * POST /nfc/write - Scrivi su tag NFC (TODO: implementare se necessario)
 */
app.post('/nfc/write', async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Scrittura NFC non ancora implementata',
    timestamp: new Date().toISOString()
  })
})

/**
 * GET /health - Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'nfc-bridge',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    nfc: nfcStatus
  })
})

// ===================================
// AVVIO SERVER
// ===================================

// Rilevamento iniziale
detectNFCReader().then((status) => {
  console.log('🔍 Rilevamento NFC completato:', status)
  
  // Inizializza configurazione alta sensibilità se disponibile
  if (status.available && status.readerType === 'pcsc') {
    console.log('🔧 Inizializzazione alta sensibilità...')
    const initScript = spawn('python3', [path.join(__dirname, 'scripts/init_nfc_sensitivity.py')])
    
    initScript.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Lettore NFC configurato con alta sensibilità')
      } else {
        console.log('⚠️  Configurazione sensibilità fallita, uso standard')
      }
    })
  }
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NFC Bridge Server avviato su porta ${PORT}`)
    console.log(`📡 API disponibili:`)
    console.log(`   GET  http://localhost:${PORT}/nfc/status`)
    console.log(`   POST http://localhost:${PORT}/nfc/read`)
    console.log(`   POST http://localhost:${PORT}/nfc/write`)
    console.log(`   GET  http://localhost:${PORT}/health`)
    console.log(``)
    console.log(`📱 NFC Status:`, status.available ? '✅ Disponibile' : '❌ Non disponibile')
    if (status.readerType) console.log(`🔧 Reader Type: ${status.readerType}`)
    if (status.error) console.log(`⚠️  Error: ${status.error}`)
  })
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Arresto NFC Bridge Server...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Arresto NFC Bridge Server...')
  process.exit(0)
})