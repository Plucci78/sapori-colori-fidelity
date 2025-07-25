const express = require('express')
const cors = require('cors')
const { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } = require('node-thermal-printer')
const moment = require('moment')

const app = express()
const PORT = process.env.PRINT_SERVER_PORT || 3002

// Configurazione stampante
const PRINTER_CONFIG = {
  type: PrinterTypes.EPSON,
  interface: 'tcp://192.168.1.100:9100',
  characterSet: CharacterSet.PC858_MULTILINGUAL,
  removeSpecialCharacters: false,
  lineCharacter: "=",
  options: {
    timeout: 5000
  }
}

// Middleware
app.use(cors())
app.use(express.json())

// Funzione per loggare operazioni
const logOperation = (operation, data = {}) => {
  console.log(`[${new Date().toISOString()}] ${operation}:`, data)
}

// Funzione per creare l'istanza della stampante
const createPrinter = () => {
  let printer = new ThermalPrinter(PRINTER_CONFIG)
  return printer
}

// Funzione per stampare Gift Card
const printGiftCard = async (giftCardData) => {
  const printer = createPrinter()
  
  try {
    // Test connessione
    const isConnected = await printer.isPrinterConnected()
    if (!isConnected) {
      throw new Error('Stampante non connessa')
    }

    logOperation('PRINT_START', { 
      code: giftCardData.code,
      value: giftCardData.value 
    })

    // Clear e reset
    printer.clear()

    // Header
    printer.alignCenter()
    printer.setTextSize(1, 1)
    printer.bold(true)
    printer.println("================================")
    printer.println("    🎁 SAPORI E COLORI 🎁")
    printer.println("================================")
    printer.bold(false)
    printer.newLine()

    // Titolo Gift Card
    printer.setTextSize(1, 2)
    printer.bold(true)
    printer.println("GIFT CARD")
    printer.bold(false)
    printer.setTextSize(0, 0)
    printer.newLine()

    // Codice Gift Card
    printer.println("CODICE:")
    printer.bold(true)
    printer.setTextSize(1, 1)
    printer.println(giftCardData.code)
    printer.bold(false)
    printer.setTextSize(0, 0)
    printer.newLine()

    // Valore
    printer.println("VALORE:")
    printer.bold(true)
    printer.setTextSize(1, 2)
    printer.println(`€ ${giftCardData.value}`)
    printer.bold(false)
    printer.setTextSize(0, 0)
    printer.newLine()

    // Destinatario se presente
    if (giftCardData.recipient && giftCardData.recipient.trim()) {
      printer.println("PER:")
      printer.bold(true)
      printer.println(giftCardData.recipient.toUpperCase())
      printer.bold(false)
      printer.newLine()
    }

    // Acquirente se presente
    if (giftCardData.purchaser && giftCardData.purchaser.trim()) {
      printer.println("DA:")
      printer.bold(true)
      printer.println(giftCardData.purchaser.toUpperCase())
      printer.bold(false)
      printer.newLine()
    }

    // Note se presenti
    if (giftCardData.notes && giftCardData.notes.trim()) {
      printer.println("NOTE:")
      printer.println(giftCardData.notes)
      printer.newLine()
    }

    // Data e ora
    printer.println("EMESSA IL:")
    printer.println(moment().format('DD/MM/YYYY - HH:mm'))
    printer.newLine()

    // Istruzioni
    printer.alignCenter()
    printer.println("--------------------------------")
    
    // Data scadenza dinamica o default
    const expiryDate = giftCardData.expires_at 
      ? moment(giftCardData.expires_at).format('DD/MM/YYYY')
      : '31/12/2025'
    printer.println(`Valida fino al ${expiryDate}`)
    
    printer.println("Non rimborsabile in denaro")
    printer.println("Utilizzabile in un'unica soluzione")
    printer.println("--------------------------------")
    printer.newLine()

    // Footer
    printer.println("Via Esempio 123, Città")
    printer.println("Tel: 123-456-7890")
    printer.println("www.saporiecolori.it")
    printer.newLine()
    printer.println("Grazie per la vostra fiducia!")
    printer.newLine()
    printer.newLine()

    // Taglio automatico
    printer.cut()

    // Esegui stampa
    await printer.execute()
    
    logOperation('PRINT_SUCCESS', { 
      code: giftCardData.code,
      timestamp: new Date().toISOString()
    })

    return {
      success: true,
      message: 'Gift Card stampata con successo',
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    logOperation('PRINT_ERROR', { 
      error: error.message,
      code: giftCardData.code 
    })
    
    throw error
  }
}

// ===================================
// API ENDPOINTS
// ===================================

// GET /print/status - Stato della stampante
app.get('/print/status', async (req, res) => {
  try {
    const printer = createPrinter()
    const isConnected = await printer.isPrinterConnected()
    
    const status = {
      connected: isConnected,
      printerType: 'Bisofice ESC/POS 80mm',
      interface: '192.168.1.100:9100',
      lastCheck: new Date().toISOString()
    }
    
    logOperation('STATUS_CHECK', status)
    res.json(status)
    
  } catch (error) {
    console.error('Errore controllo stato stampante:', error)
    res.status(500).json({
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// POST /print/gift-card - Stampa Gift Card (compatibile con API esistente)
app.post('/print/gift-card', async (req, res) => {
  try {
    // Supporta sia formato diretto che wrapper {giftCard}
    const giftCardData = req.body.giftCard || req.body
    
    // Validazione dati richiesti
    if (!giftCardData.code || (!giftCardData.value && !giftCardData.amount && !giftCardData.balance)) {
      return res.status(400).json({
        success: false,
        error: 'Codice e valore sono obbligatori',
        timestamp: new Date().toISOString()
      })
    }
    
    // Normalizza i dati per la stampa
    const printData = {
      code: giftCardData.code,
      value: giftCardData.value || giftCardData.amount || giftCardData.balance,
      recipient: giftCardData.recipient_name || giftCardData.recipient || '',
      purchaser: giftCardData.purchaser?.name || giftCardData.purchaser_name || '',
      notes: giftCardData.message || giftCardData.notes || '',
      expires_at: giftCardData.expires_at || null
    }
    
    logOperation('PRINT_REQUEST', { 
      code: printData.code,
      source: req.body.giftCard ? 'API_WRAPPER' : 'DIRECT' 
    })
    
    const result = await printGiftCard(printData)
    res.json(result)
    
  } catch (error) {
    console.error('Errore stampa gift card:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// POST /print/test - Stampa di test
app.post('/print/test', async (req, res) => {
  try {
    const testData = {
      code: 'TEST-' + Date.now(),
      value: '25.00',
      recipient: 'Test Cliente',
      purchaser: 'Test Acquirente',
      notes: 'Stampa di test del sistema'
    }
    
    const result = await printGiftCard(testData)
    res.json(result)
    
  } catch (error) {
    console.error('Errore stampa test:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// GET /health - Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Print Server',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })
})

// ===================================
// AVVIO SERVER
// ===================================

const startServer = async () => {
  try {
    console.log('🚀 Avvio Print Server...')
    
    // Test iniziale stampante
    console.log('🖨️  Test connessione stampante...')
    const printer = createPrinter()
    const isConnected = await printer.isPrinterConnected()
    
    console.log('🖨️  Stampante connessa:', isConnected ? '✅' : '❌')
    
    // Avvio server HTTP
    app.listen(PORT, () => {
      console.log('')
      console.log('🚀 Print Server avviato su porta', PORT)
      console.log('🖨️  Stampante: Bisofice ESC/POS 80mm')
      console.log('🌐 IP Stampante: 192.168.1.100:9100')
      console.log('📡 API disponibili:')
      console.log(`   GET  http://localhost:${PORT}/print/status`)
      console.log(`   POST http://localhost:${PORT}/print/gift-card`)
      console.log(`   POST http://localhost:${PORT}/print/test`)
      console.log(`   GET  http://localhost:${PORT}/health`)
      console.log('')
      console.log('✅ Server pronto per stampare Gift Card!')
      console.log('')
    })
    
  } catch (error) {
    console.error('❌ Errore avvio server:', error)
    process.exit(1)
  }
}

// Gestione chiusura graceful
process.on('SIGINT', () => {
  console.log('\n🛑 Arresto Print Server...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Arresto Print Server...')
  process.exit(0)
})

// Avvio
startServer()