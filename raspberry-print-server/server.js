const express = require('express')
const cors = require('cors')
const { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } = require('node-thermal-printer')
const moment = require('moment')
const { createCanvas, loadImage } = require('canvas')
const QRCode = require('qrcode')
const fs = require('fs')
const { exec } = require('child_process')
const { promisify } = require('util')

const app = express()
const PORT = process.env.PRINT_SERVER_PORT || 3002
const execAsync = promisify(exec)

// IP dinamico della stampante (verrà rilevato automaticamente)
let CURRENT_PRINTER_IP = null

// Configurazione base stampante (IP viene aggiornato dinamicamente)
const BASE_PRINTER_CONFIG = {
  type: PrinterTypes.EPSON,
  characterSet: CharacterSet.PC852_LATIN2,
  removeSpecialCharacters: true,
  lineCharacter: "=",
  options: {
    timeout: 5000
  }
}

// Funzione per rilevare IP stampante automaticamente
const discoverPrinterIP = async () => {
  try {
    console.log('🔍 Ricerca automatica stampante sulla rete...')
    
    // Scansiona la rete locale per porte 9100 (stampanti ESC/POS)
    const { stdout } = await execAsync('nmap -p 9100 --open 192.168.1.0/24 2>/dev/null | grep -B4 "9100/tcp open"')
    
    const lines = stdout.split('\n')
    for (const line of lines) {
      if (line.includes('Nmap scan report for')) {
        const ip = line.match(/(\d+\.\d+\.\d+\.\d+)/)?.[1]
        if (ip) {
          console.log(`✅ Stampante trovata su IP: ${ip}:9100`)
          return ip
        }
      }
    }
    
    // Fallback: prova gli IP più comuni per stampanti
    const commonIPs = ['192.168.1.17', '192.168.1.100', '192.168.1.101', '192.168.1.200']
    
    for (const ip of commonIPs) {
      try {
        console.log(`🔍 Test IP: ${ip}:9100`)
        const testConfig = { ...BASE_PRINTER_CONFIG, interface: `tcp://${ip}:9100` }
        const testPrinter = new ThermalPrinter(testConfig)
        const isConnected = await testPrinter.isPrinterConnected()
        
        if (isConnected) {
          console.log(`✅ Stampante confermata su IP: ${ip}:9100`)
          return ip
        }
      } catch (error) {
        console.log(`❌ IP ${ip}:9100 non risponde`)
      }
    }
    
    throw new Error('Nessuna stampante trovata sulla rete')
    
  } catch (error) {
    console.error('❌ Errore ricerca stampante:', error.message)
    
    // Ultimo tentativo con IP default
    console.log('🆘 Uso IP default: 192.168.1.17:9100')
    return '192.168.1.17'
  }
}

// Funzione per ottenere configurazione stampante aggiornata
const getPrinterConfig = async () => {
  if (!CURRENT_PRINTER_IP) {
    CURRENT_PRINTER_IP = await discoverPrinterIP()
  }
  
  return {
    ...BASE_PRINTER_CONFIG,
    interface: `tcp://${CURRENT_PRINTER_IP}:9100`
  }
}

// Middleware
app.use(cors())
app.use(express.json())

// Funzione per loggare operazioni
const logOperation = (operation, data = {}) => {
  console.log(`[${new Date().toISOString()}] ${operation}:`, data)
}

// Funzione per creare l'istanza della stampante con IP dinamico
const createPrinter = async () => {
  const config = await getPrinterConfig()
  console.log(`🖨️ Creo stampante su: ${config.interface}`)
  return new ThermalPrinter(config)
}

// Funzione per generare QR Code per Gift Card (SEMPLIFICATO per scanner)
const generateQRData = (giftCardData) => {
  // Formato semplice che funzionava ieri - solo il codice
  return giftCardData.code || giftCardData.code
}

// Funzione per creare Gift Card PNG professionale SUPER NITIDO
const createGiftCardPNG = async (giftCardData) => {
  const width = 576  // 72mm * 8px/mm 
  const height = 2000 // Altezza aumentata per QR distanziato e frame completo
  
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  
  // Migliora DRASTICAMENTE la qualità del rendering
  ctx.textRenderingOptimization = 'optimizeQuality'
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.font = 'bold Arial'  // Forza font più nitido
  
  // Sfondo bianco
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  
  // Bordo più spesso
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 4
  ctx.strokeRect(10, 10, width-20, height-20)
  
  let y = 60
  
  // HEADER - SAPORI & COLORI (GIGANTE)
  ctx.fillStyle = '#000000'
  ctx.font = 'bold 52px Arial'  // Adattato per testo più lungo
  ctx.textAlign = 'center'
  ctx.fillRect(50, y-25, width-100, 100)
  ctx.fillStyle = '#ffffff'
  ctx.fillText('SAPORI & COLORI', width/2, y+50)
  
  y += 120
  ctx.fillStyle = '#666666'
  ctx.font = 'bold 36px Arial'
  ctx.fillText('Panetteria Gastronomica', width/2, y)
  
  y += 80
  // GIFT CARD - SCRITTA GIGANTE E NERA (2 STELLE PER LATO)
  ctx.fillStyle = '#000000'  // Nero invece di marrone per massima visibilità
  ctx.font = 'bold 48px Arial'  // Da 34 → 48 (GIGANTE!)
  ctx.fillText('★ ★ GIFT CARD ★ ★', width/2, y)
  
  y += 70
  ctx.fillStyle = '#333333'
  ctx.font = 'bold 38px Arial'  // Aumentato per maggiore visibilità
  ctx.fillText('Un regalo speciale per te', width/2, y)
  
  y += 90
  // VALORE GIGANTE
  ctx.fillStyle = '#c41e3a'
  ctx.fillRect(50, y-30, width-100, 140)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 50px Arial'  // Da 40 → 50 (GIGANTE!)
  ctx.fillText('VALORE', width/2, y+30)
  ctx.font = 'bold 72px Arial'  // Da 58 → 72 (ENORME!)
  ctx.fillText(`€ ${giftCardData.value || '25.00'}`, width/2, y+95)
  
  y += 180
  // DEDICATO A GIGANTE
  ctx.fillStyle = '#f0f0f0'
  ctx.fillRect(50, y-25, width-100, 100)
  ctx.fillStyle = '#666666'
  ctx.font = 'bold 32px Arial'  // Da 26 → 32 (MOLTO PIÙ GRANDE)
  ctx.fillText('DEDICATO A:', width/2, y+25)
  ctx.fillStyle = '#000000'
  ctx.font = 'bold 40px Arial'  // Da 32 → 40 (GIGANTE!)
  ctx.fillText((giftCardData.recipient || 'Nome Destinatario').toUpperCase(), width/2, y+65)
  
  y += 140
  // MESSAGGIO CON FRAME DECORATIVO
  if (giftCardData.notes) {
    // Frame esterno con doppio bordo
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 4
    ctx.strokeRect(40, y-30, width-80, 290)
    
    // Frame interno decorativo
    ctx.strokeStyle = '#cccccc'
    ctx.lineWidth = 2
    ctx.strokeRect(50, y-20, width-100, 270)
    
    // Sfondo leggero per il messaggio
    ctx.fillStyle = '#f9f9f9'
    ctx.fillRect(52, y-18, width-104, 266)
    
    ctx.fillStyle = '#666666'
    ctx.font = 'bold 30px Arial'  // Da 24 → 30 (GIGANTE!)
    ctx.fillText('MESSAGGIO:', width/2, y+25)
    
    ctx.fillStyle = '#000000'
    ctx.font = 'bold 32px Arial'  // Da 26 → 32 (GIGANTE E GRASSETTO!)
    const words = giftCardData.notes.split(' ')
    let line = ''
    let lineY = y + 70
    
    words.forEach(word => {
      const testLine = line + word + ' '
      const metrics = ctx.measureText(testLine)
      if (metrics.width > width-180 && line !== '') {
        ctx.fillText(line.trim(), width/2, lineY)
        line = word + ' '
        lineY += 42  // Spaziatura GIGANTE
      } else {
        line = testLine
      }
    })
    if (line.trim()) {
      ctx.fillText(line.trim(), width/2, lineY)
    }
    y += 310
  }
  
  // DA PARTE DI GIGANTE
  ctx.fillStyle = '#666666'
  ctx.font = 'bold 32px Arial'  // Da 26 → 32 (GIGANTE!)
  ctx.fillText('DA PARTE DI:', width/2, y)
  ctx.fillStyle = '#000000'
  ctx.font = 'bold 38px Arial'  // Da 30 → 38 (GIGANTE!)
  ctx.fillText((giftCardData.purchaser || 'Mittente').toUpperCase(), width/2, y+50)
  
  y += 110
  // QR CODE GIGANTE CON ALTA QUALITÀ PER SCANNER
  const qrData = generateQRData(giftCardData)
  const qrCodeDataURL = await QRCode.toDataURL(qrData, { 
    width: 250, 
    margin: 4,  // Margine più grande per scanner
    errorCorrectionLevel: 'H',  // Massima correzione errori
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  })
  const qrImage = await loadImage(qrCodeDataURL)
  ctx.drawImage(qrImage, width/2-125, y, 250, 250)  // Centrato e più grande
  
  y += 300  // Molto più spazio per non confondere lo scanner
  ctx.fillStyle = '#000000'
  ctx.font = 'bold 36px Arial'  // Da 28 → 36 (GIGANTE!)
  ctx.fillText(giftCardData.code || 'DEMO2025', width/2, y)
  
  y += 70
  // DATE DI EMISSIONE E SCADENZA
  const dataEmissione = new Date().toLocaleDateString('it-IT')
  const dataScadenza = new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('it-IT') // 6 mesi dopo
  
  ctx.fillStyle = '#000000'
  ctx.font = 'bold 24px Arial'
  ctx.fillText(`DATA EMESSA: ${dataEmissione}`, width/2, y)
  
  y += 35
  ctx.fillStyle = '#c41e3a'  // Rosso per evidenziare la scadenza
  ctx.font = 'bold 24px Arial'
  ctx.fillText(`DATA SCADENZA: ${dataScadenza}`, width/2, y)
  
  y += 70
  // CONDIZIONI GIGANTI
  ctx.fillStyle = '#666666'
  ctx.font = 'bold 24px Arial'  // Da 20 → 24 (MOLTO PIÙ GRANDE E GRASSETTO!)
  ctx.fillText('Non rimborsabile - Non trasferibile', width/2, y)
  ctx.fillText('Utilizzabile parzialmente', width/2, y+35)
  
  y += 130
  // INFO AZIENDA GIGANTE
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 4
  ctx.strokeRect(40, y-15, width-80, 120)  // Frame più grande
  ctx.fillStyle = '#000000'
  ctx.font = 'bold 32px Arial'  // Più grande per leggibilità
  ctx.fillText('SAPORI & COLORI', width/2, y+20)
  ctx.font = 'bold 24px Arial'  // Più grande per indirizzo
  ctx.fillText('Via Bagaladi 7', width/2, y+50)
  ctx.fillText('00132 Roma', width/2, y+75)
  ctx.font = 'bold 20px Arial'  // P.IVA leggibile
  ctx.fillText('P.IVA: 16240351003', width/2, y+100)
  
  // Salva il file PNG su disco
  const buffer = canvas.toBuffer('image/png')
  const filename = `gift-card-${giftCardData.code}.png`
  require('fs').writeFileSync(filename, buffer)
  
  return buffer
}

// Funzione per creare gift card con template JSON strutturato
const createGiftCardWithJSONTemplate = async (giftCardData) => {
  const printer = await createPrinter()
  
  const value = parseFloat(giftCardData.value || giftCardData.amount || giftCardData.balance).toFixed(2)
  const recipient = giftCardData.recipient_name || giftCardData.recipient || ''
  const code = giftCardData.code
  const notes = giftCardData.message || giftCardData.notes || ''
  const purchaserName = giftCardData.purchaser?.name || giftCardData.purchaser_name || giftCardData.purchaser || ''
  
  try {
    // Header con decorazione
    printer.alignCenter()
    printer.drawLine()
    printer.newLine()
    
    // Logo FORNO
    printer.setTextSize(1, 1)
    printer.bold(true)
    printer.invert(true)
    printer.println(" FORNO ")
    printer.invert(false)
    printer.bold(false)
    printer.newLine()
    
    // Nome negozio
    printer.setTextSize(1, 1)
    printer.bold(true)
    printer.println("Sapori & Colori")
    printer.bold(false)
    printer.setTextSize(0, 0)
    printer.println("Panetteria Artigianale")
    printer.newLine()
    
    // Ornamento
    printer.println("* * * GIFT CARD * * *")
    printer.newLine()
    
    // Titolo BUONO REGALO
    printer.drawLine()
    printer.setTextSize(1, 1)
    printer.bold(true)
    printer.println("BUONO REGALO")
    printer.bold(false)
    printer.setTextSize(0, 0)
    printer.drawLine()
    printer.newLine()
    
    // Sezione Valore (sfondo nero)
    printer.println("╔══════════════════════════════╗")
    printer.println("║                              ║")
    printer.print("║         VALORE               ║")
    printer.newLine()
    printer.print("║                              ║")
    printer.newLine()
    printer.setTextSize(2, 2)
    printer.bold(true)
    const valueText = `    € ${value}    `
    printer.print("║")
    printer.print(valueText)
    printer.println("║")
    printer.bold(false)
    printer.setTextSize(0, 0)
    printer.print("║                              ║")
    printer.newLine()
    printer.println("╚══════════════════════════════╝")
    printer.newLine()
    
    // Dettagli certificato
    printer.println("┌────────────────────────────────┐")
    printer.println(`│ Codice Buono: ${code.padEnd(15)} │`)
    printer.println(`│ Data Emissione: ${moment().format('DD/MM/YYYY').padEnd(13)} │`)
    const expiryDate = moment().add(6, 'months').format('DD/MM/YYYY')
    printer.println(`│ Scadenza: ${expiryDate.padEnd(19)} │`)
    printer.println("└────────────────────────────────┘")
    printer.newLine()
    
    // Linea tratteggiata
    printer.println("- - - - - - - - - - - - - - - - -")
    printer.newLine()
    
    // Sezione destinatario
    if (recipient) {
      printer.println("┌─ DESTINATARIO ─────────────────┐")
      printer.println("│                                │")
      printer.println(`│ Per: ${recipient.toUpperCase().padEnd(25)} │`)
      if (purchaserName) {
        printer.println(`│ Da: ${purchaserName.toUpperCase().padEnd(26)} │`)
      }
      if (notes) {
        printer.println("│                                │")
        printer.println("│ Messaggio:                     │")
        const words = notes.split(' ')
        let line = ''
        words.forEach(word => {
          if ((line + word).length > 28) {
            printer.println(`│ ${line.trim().padEnd(30)} │`)
            line = word + ' '
          } else {
            line += word + ' '
          }
        })
        if (line.trim()) {
          printer.println(`│ ${line.trim().padEnd(30)} │`)
        }
      }
      printer.println("│                                │")
      printer.println("└────────────────────────────────┘")
      printer.newLine()
    }
    
    
    // Condizioni d'uso
    printer.underline(true)
    printer.println("CONDIZIONI D'USO")
    printer.underline(false)
    printer.println("■ Valido 6 mesi dalla data di emissione")
    printer.println("■ Non rimborsabile in denaro contante")
    printer.println("■ Non sostituibile in caso di smarrimento")
    printer.println("■ Utilizzabile parzialmente")
    printer.println("■ Valido solo presso Sapori & Colori")
    printer.println("■ Non cumulabile con altre promozioni")
    printer.newLine()
    
    // Codice a barre (QR code)
    printer.println("┌─ CODICE DI VERIFICA ───────────┐")
    printer.println("│                                │")
    const qrData = generateQRData(giftCardData)
    printer.printQR(qrData, {
      cellSize: 6,
      correction: 'H',
      model: 2
    })
    printer.println("│                                │")
    printer.println("└────────────────────────────────┘")
    printer.newLine()
    
    // Footer
    printer.drawLine()
    printer.println("Via Bagaladi 7, 00132 Roma")
    printer.println("Tel: 06-1234567")
    printer.println("Lun-Sab 7:00-20:00, Dom 8:00-13:00")
    printer.println("info@saporicolori.it")
    printer.newLine()
    
    printer.println("🍞 Grazie per aver scelto la qualità artigianale! 🥖")
    printer.newLine()
    printer.println("\"Dove ogni giorno è una festa di sapori\"")
    printer.newLine()
    printer.drawLine()
    
    // Taglia e stampa
    printer.cut()
    await printer.execute()
    
    return 'json-template-printed'
    
  } catch (error) {
    logOperation('JSON_TEMPLATE_ERROR', { 
      error: error.message,
      code: code 
    })
    throw error
  }
}

// Template SVG di backup (quello attuale)
const createBackupGiftCardImage = async (giftCardData) => {
  const sharp = require('sharp')
  const path = require('path')
  
  const value = parseFloat(giftCardData.value).toFixed(2)
  const recipient = giftCardData.recipient || 'Al Portatore'
  const notes = giftCardData.notes || ''
  const code = giftCardData.code
  
  const svgTemplate = `
    <svg width="576" height="800" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#2C3E50;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#34495E;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="valueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#E74C3C;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#C0392B;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <rect width="576" height="800" fill="white" stroke="#2C3E50" stroke-width="6"/>
      <rect x="0" y="0" width="576" height="160" fill="url(#headerGrad)"/>
      <text x="288" y="50" font-family="Arial Black" font-size="42" font-weight="bold" text-anchor="middle" fill="white">SAPORI E COLORI</text>
      <text x="288" y="80" font-family="Arial" font-size="22" text-anchor="middle" fill="#BDC3C7">FORNO GASTRONOMICO</text>
      <text x="288" y="110" font-family="Arial" font-size="18" text-anchor="middle" fill="#ECF0F1">Via Giuseppe Garibaldi, 123 - Nocera Inferiore</text>
      <text x="288" y="140" font-family="Arial" font-size="18" text-anchor="middle" fill="#ECF0F1">Tel: 081-123-4567</text>
      
      <rect x="30" y="180" width="516" height="100" fill="#F8F9FA" stroke="#34495E" stroke-width="3"/>
      <text x="288" y="220" font-family="Arial Black" font-size="48" font-weight="bold" text-anchor="middle" fill="#2C3E50">GIFT CARD</text>
      <text x="288" y="250" font-family="Arial" font-size="20" text-anchor="middle" fill="#7F8C8D">Esperienza Gastronomica Autentica</text>
      
      <rect x="60" y="300" width="456" height="120" fill="url(#valueGrad)" rx="15"/>
      <text x="288" y="340" font-family="Arial" font-size="26" font-weight="bold" text-anchor="middle" fill="white">VALORE</text>
      <text x="288" y="390" font-family="Arial Black" font-size="64" font-weight="bold" text-anchor="middle" fill="white">€ ${value}</text>
      
      ${recipient !== 'Al Portatore' ? `
      <rect x="30" y="440" width="516" height="80" fill="#ECF0F1" stroke="#BDC3C7" stroke-width="2"/>
      <text x="288" y="470" font-family="Arial" font-size="18" text-anchor="middle" fill="#7F8C8D">DEDICATO A:</text>
      <text x="288" y="505" font-family="Arial" font-size="28" font-weight="bold" text-anchor="middle" fill="#2C3E50">${recipient.toUpperCase()}</text>
      ` : ''}
      
      ${notes ? `
      <rect x="30" y="${recipient !== 'Al Portatore' ? '540' : '460'}" width="516" height="100" fill="#F8F9FA" stroke="#D5DBDB" stroke-width="2"/>
      <text x="288" y="${recipient !== 'Al Portatore' ? '570' : '490'}" font-family="Arial" font-size="16" text-anchor="middle" fill="#7F8C8D">MESSAGGIO:</text>
      <text x="288" y="${recipient !== 'Al Portatore' ? '600' : '520'}" font-family="Arial" font-size="18" text-anchor="middle" fill="#2C3E50">${notes.substring(0, 60)}${notes.length > 60 ? '...' : ''}</text>
      ` : ''}
      
      <rect x="30" y="${notes ? (recipient !== 'Al Portatore' ? '660' : '580') : (recipient !== 'Al Portatore' ? '540' : '460')}" width="516" height="70" fill="#2C3E50"/>
      <text x="288" y="${notes ? (recipient !== 'Al Portatore' ? '690' : '610') : (recipient !== 'Al Portatore' ? '570' : '490')}" font-family="Arial" font-size="16" text-anchor="middle" fill="#BDC3C7">CODICE CERTIFICATO</text>
      <text x="288" y="${notes ? (recipient !== 'Al Portatore' ? '720' : '640') : (recipient !== 'Al Portatore' ? '600' : '520')}" font-family="Arial Black" font-size="24" font-weight="bold" text-anchor="middle" fill="white">${code}</text>
      
    </svg>
  `
  
  const imagePath = path.join(__dirname, `gift-card-${code}.png`)
  
  await sharp(Buffer.from(svgTemplate))
    .png()
    .toFile(imagePath)
    
  return imagePath
}

// Funzione per stampare Gift Card PROFESSIONALE con PNG
const printGiftCard = async (giftCardData) => {
  const printer = await createPrinter()
  
  try {
    // Test connessione
    const isConnected = await printer.isPrinterConnected()
    if (!isConnected) {
      throw new Error('Stampante non connessa')
    }

    logOperation('PRINT_START_PNG', { 
      code: giftCardData.code,
      value: giftCardData.value 
    })

    // Usa il template JSON strutturato (stampa già inclusa)
    await createGiftCardWithJSONTemplate(giftCardData)
    
    logOperation('PRINT_SUCCESS_JSON', { 
      code: giftCardData.code,
      template: 'JSON-structured',
      timestamp: new Date().toISOString()
    })

    const qrData = generateQRData(giftCardData)
    return {
      success: true,
      message: 'Buono Regalo PROFESSIONALE stampato con successo',
      template: 'JSON-structured-bakery',
      timestamp: new Date().toISOString(),
      qrData: qrData
    }

  } catch (error) {
    logOperation('PRINT_ERROR_PNG', { 
      error: error.message,
      code: giftCardData.code 
    })
    
    throw error
  }
}

// Funzione per stampare ricevute di vendita
const printSalesReceipt = async (receiptData) => {
  const printer = await createPrinter()
  
  try {
    const isConnected = await printer.isPrinterConnected()
    if (!isConnected) {
      throw new Error('Stampante non connessa')
    }

    logOperation('PRINT_RECEIPT_START', { 
      orderId: receiptData.orderId,
      total: receiptData.total 
    })

    printer.clear()

    // Header ricevuta
    printer.alignCenter()
    printer.setTextSize(1, 1)
    printer.bold(true)
    printer.println("SAPORI & COLORI")
    printer.bold(false)
    printer.setTextSize(0, 0)
    printer.println("Panetteria Gastronomica")
    printer.println("Via Bagaladi 7")
    printer.println("00132 Roma")
    printer.println("Tel: 0639911640")
    printer.println("P.IVA: 16240351003")
    printer.println("════════════════════════════════")
    printer.bold(true)
    printer.println("RICEVUTA DI VENDITA")
    printer.bold(false)
    printer.println("════════════════════════════════")
    printer.newLine()

    // Dettagli ordine
    printer.alignLeft()
    printer.println(`N. Ordine: ${receiptData.orderId || 'N/A'}`)
    printer.println(`Data: ${moment().format('DD/MM/YYYY HH:mm')}`)
    printer.println(`Operatore: ${receiptData.operator || 'Sistema'}`)
    if (receiptData.customer) {
      printer.println(`Cliente: ${receiptData.customer}`)
    }
    printer.println("--------------------------------")
    printer.newLine()

    // Articoli con allineamento perfetto
    printer.println("ARTICOLI:")
    printer.println("--------------------------------")
    
    if (receiptData.items && receiptData.items.length > 0) {
      receiptData.items.forEach(item => {
        const itemName = item.name
        const quantity = item.quantity > 1 ? ` x${item.quantity}` : ''
        const price = `EUR ${parseFloat(item.price).toFixed(2)}`
        
        // Calcola spazi per allineamento (32 caratteri totali)
        const leftSide = itemName + quantity
        const spaces = Math.max(1, 32 - leftSide.length - price.length)
        const spacesStr = ' '.repeat(spaces)
        
        printer.alignLeft()
        printer.println(`${leftSide}${spacesStr}${price}`)
      })
    }
    
    printer.println("--------------------------------")
    
    // Totali con allineamento perfetto
    const printAlignedLine = (label, amount, isBold = false) => {
      const amountStr = `EUR ${parseFloat(amount).toFixed(2)}`
      const spaces = Math.max(1, 32 - label.length - amountStr.length)
      const spacesStr = ' '.repeat(spaces)
      
      printer.alignLeft()
      if (isBold) printer.bold(true)
      printer.println(`${label}${spacesStr}${amountStr}`)
      if (isBold) printer.bold(false)
    }
    
    if (receiptData.subtotal) {
      printAlignedLine("Subtotale:", receiptData.subtotal)
    }
    
    if (receiptData.tax) {
      printAlignedLine("IVA:", receiptData.tax)
    }
    
    if (receiptData.discount) {
      printAlignedLine("Sconto:", `-${receiptData.discount}`)
    }

    printer.println("════════════════════════════════")
    printer.setTextSize(1, 1)
    printAlignedLine("TOTALE:", receiptData.total, true)
    printer.setTextSize(0, 0)
    printer.println("════════════════════════════════")
    printer.newLine()

    // Metodo pagamento
    if (receiptData.paymentMethod) {
      printer.alignLeft()
      printer.println(`Pagamento: ${receiptData.paymentMethod}`)
      if (receiptData.change) {
        printer.println(`Resto: EUR ${parseFloat(receiptData.change).toFixed(2)}`)
      }
      printer.newLine()
    }

    // QR Code per la ricevuta - GRANDE e ISOLATO
    printer.newLine()
    printer.newLine()
    printer.alignCenter()
    printer.println("═══ RICEVUTA DIGITALE ═══")
    printer.newLine()
    // QR semplificato - solo orderId per scanner facile
    const receiptQR = receiptData.orderId
    printer.printQR(receiptQR, {
      cellSize: 8,  // Più grande (era 5)
      correction: 'H',  // Massima correzione errori (era M)
      model: 2
    })
    printer.newLine()
    printer.newLine()

    // Footer
    printer.alignCenter()
    printer.println("Grazie per aver scelto")
    printer.bold(true)
    printer.println("SAPORI E COLORI!")
    printer.bold(false)
    printer.println("Arrivederci e a presto! 🍴")
    printer.newLine()
    printer.newLine()

    printer.cut()
    await printer.execute()
    
    logOperation('PRINT_RECEIPT_SUCCESS', { 
      orderId: receiptData.orderId,
      timestamp: new Date().toISOString()
    })

    return {
      success: true,
      message: 'Ricevuta stampata con successo',
      timestamp: new Date().toISOString(),
      qrData: receiptQR
    }

  } catch (error) {
    logOperation('PRINT_RECEIPT_ERROR', { 
      error: error.message,
      orderId: receiptData.orderId 
    })
    
    throw error
  }
}

// ===================================
// API ENDPOINTS
// ===================================

// POST /print/discover - Forza ricerca stampante
app.post('/print/discover', async (req, res) => {
  try {
    console.log('🔍 Avvio ricerca manuale stampante...')
    
    // Reset IP corrente per forzare nuova ricerca
    CURRENT_PRINTER_IP = null
    
    // Rileva nuovo IP
    const newIP = await discoverPrinterIP()
    CURRENT_PRINTER_IP = newIP
    
    // Test connessione
    const printer = await createPrinter()
    const isConnected = await printer.isPrinterConnected()
    
    const result = {
      success: true,
      discoveredIP: newIP,
      connected: isConnected,
      message: `Stampante ${isConnected ? 'trovata e connessa' : 'trovata ma non connessa'} su ${newIP}:9100`,
      timestamp: new Date().toISOString()
    }
    
    logOperation('MANUAL_DISCOVERY', result)
    res.json(result)
    
  } catch (error) {
    console.error('❌ Errore ricerca manuale:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// GET /print/status - Stato della stampante
app.get('/print/status', async (req, res) => {
  try {
    const printer = await createPrinter()
    const isConnected = await printer.isPrinterConnected()
    
    const status = {
      connected: isConnected,
      printerType: 'Bisofice ESC/POS 80mm',
      interface: `${CURRENT_PRINTER_IP}:9100`,
      lastCheck: new Date().toISOString(),
      autoDiscovered: CURRENT_PRINTER_IP !== null
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
    
    // GENERA E STAMPA IL PNG PROFESSIONALE
    const printer = await createPrinter()
    
    const isConnected = await printer.isPrinterConnected()
    if (!isConnected) {
      throw new Error('Stampante non connessa')
    }
    
    console.log('🎨 STAMPA GIFT CARD PNG - TEMPLATE PROFESSIONALE')
    
    // PRIMA GENERA IL PNG
    await createGiftCardPNG(printData)
    console.log(`✅ PNG generato: gift-card-${printData.code}.png`)
    
    // Stampa il PNG professionale che abbiamo generato
    const pngFile = `gift-card-${printData.code}.png`
    
    console.log(`🖨️ Tentativo stampa PNG: ${pngFile}`)
    
    // Stampa l'immagine PNG
    printer.alignCenter()
    await printer.printImage(pngFile)
    printer.newLine()
    printer.newLine()
    
    // Aggiungi info extra sotto l'immagine se serve
    printer.setTextSize(0, 0)
    printer.println(`Codice: ${printData.code}`)
    printer.println(`Generato: ${new Date().toLocaleDateString('it-IT')}`)
    
    printer.cut()
    await printer.execute()
    
    console.log('✅ PNG stampato con successo')
    
    const result = {
      success: true,
      message: 'Gift Card PNG PROFESSIONALE stampato',
      template: 'PNG-professional-image',
      timestamp: new Date().toISOString(),
      qrData: generateQRData(printData)
    }
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

// Funzione per stampare ricevuta saldo wallet
const printBalanceReceipt = async (receiptData) => {
  const printer = await createPrinter()
  
  try {
    const isConnected = await printer.isPrinterConnected()
    if (!isConnected) {
      throw new Error('Stampante non connessa')
    }

    logOperation('PRINT_BALANCE_START', { 
      customer: receiptData.customer,
      balance: receiptData.balance 
    })

    printer.clear()

    // Header ricevuta saldo
    printer.alignCenter()
    printer.setTextSize(1, 1)
    printer.bold(true)
    printer.println("SAPORI & COLORI")
    printer.bold(false)
    printer.setTextSize(0, 0)
    printer.println("Panetteria Gastronomica")
    printer.println("Via Bagaladi 7")
    printer.println("00132 Roma")
    printer.println("Tel: 0639911640")
    printer.println("P.IVA: 16240351003")
    printer.println("════════════════════════════════")
    printer.bold(true)
    printer.setTextSize(1, 1)
    printer.println("CONSULTAZIONE SALDO")
    printer.println("WALLET CLIENTE")
    printer.bold(false)
    printer.setTextSize(0, 0)
    printer.println("════════════════════════════════")
    printer.newLine()

    // Dettagli cliente
    printer.alignLeft()
    printer.println(`Cliente: ${receiptData.customer || 'N/A'}`)
    printer.println(`Data: ${moment().format('DD/MM/YYYY HH:mm')}`)
    printer.println(`Operatore: ${receiptData.operator || 'Sistema'}`)
    printer.println("--------------------------------")
    printer.newLine()

    // Saldo evidenziato
    printer.alignCenter()
    printer.println("💰 CREDITO DISPONIBILE 💰")
    printer.newLine()
    printer.setTextSize(2, 2)
    printer.bold(true)
    printer.println(`EUR ${receiptData.balance || '0.00'}`)
    printer.bold(false)
    printer.setTextSize(0, 0)
    printer.newLine()
    printer.println("════════════════════════════════")
    printer.newLine()

    // Informazioni saldo
    printer.alignLeft()
    printer.println("INFORMAZIONI WALLET:")
    printer.println("• Il credito non ha scadenza")
    printer.println("• Utilizzabile per tutti i prodotti")
    printer.println("• Utilizzabile parzialmente")
    printer.println("• Non rimborsabile in contanti")
    printer.newLine()

    // Footer
    printer.alignCenter()
    printer.println("Grazie per la fiducia!")
    printer.bold(true)
    printer.println("SAPORI E COLORI")
    printer.bold(false)
    printer.println("Il tuo credito è sempre disponibile")
    printer.newLine()

    printer.cut()
    await printer.execute()
    
    logOperation('PRINT_BALANCE_SUCCESS', { 
      customer: receiptData.customer,
      timestamp: new Date().toISOString()
    })

    return {
      success: true,
      message: 'Ricevuta saldo stampata con successo',
      type: 'balance',
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    logOperation('PRINT_BALANCE_ERROR', { 
      error: error.message,
      customer: receiptData.customer 
    })
    
    throw error
  }
}

// Funzione per stampare ricevuta abbonamento
const printSubscriptionReceipt = async (receiptData) => {
  const printer = await createPrinter()
  
  try {
    const isConnected = await printer.isPrinterConnected()
    if (!isConnected) {
      throw new Error('Stampante non connessa')
    }

    logOperation('PRINT_SUBSCRIPTION_START', { 
      customer: receiptData.customer,
      plan: receiptData.subscriptionDetails?.planName,
      total: receiptData.total
    })

    printer.clear()

    // Header ricevuta abbonamento
    printer.alignCenter()
    printer.setTextSize(1, 1)
    printer.bold(true)
    printer.println("SAPORI & COLORI")
    printer.bold(false)
    printer.setTextSize(0, 0)
    printer.println("Panetteria Gastronomica")
    printer.println("Via Bagaladi 7")
    printer.println("00132 Roma")
    printer.println("Tel: 0639911640")
    printer.println("P.IVA: 16240351003")
    printer.println("════════════════════════════════")
    printer.bold(true)
    printer.setTextSize(1, 1)
    printer.println("RICEVUTA ABBONAMENTO")
    printer.bold(false)
    printer.setTextSize(0, 0)
    printer.println("════════════════════════════════")
    printer.newLine()

    // Dettagli abbonamento
    printer.alignLeft()
    printer.println(`N. Ordine: ${receiptData.orderId || 'N/A'}`)
    printer.println(`Data: ${moment().format('DD/MM/YYYY HH:mm')}`)
    printer.println(`Operatore: ${receiptData.operator || 'Sistema'}`)
    printer.println(`Cliente: ${receiptData.customer}`)
    printer.println("--------------------------------")
    printer.newLine()

    // Dettagli piano abbonamento
    printer.println("PIANO ABBONAMENTO:")
    printer.println("--------------------------------")
    const planName = receiptData.subscriptionDetails?.planName || 'Piano Abbonamento'
    const planDuration = receiptData.subscriptionDetails?.duration || 'N/A'
    
    printer.println(`Piano: ${planName}`)
    printer.println(`Durata: ${planDuration}`)
    
    if (receiptData.subscriptionDetails?.startDate) {
      printer.println(`Inizio: ${receiptData.subscriptionDetails.startDate}`)
    }
    if (receiptData.subscriptionDetails?.endDate) {
      printer.println(`Scadenza: ${receiptData.subscriptionDetails.endDate}`)
    }
    
    printer.println("--------------------------------")
    
    // Totali
    const printAlignedLine = (label, amount, isBold = false) => {
      const amountStr = `EUR ${parseFloat(amount).toFixed(2)}`
      const spaces = Math.max(1, 32 - label.length - amountStr.length)
      const spacesStr = ' '.repeat(spaces)
      
      printer.alignLeft()
      if (isBold) printer.bold(true)
      printer.println(`${label}${spacesStr}${amountStr}`)
      if (isBold) printer.bold(false)
    }
    
    if (receiptData.subtotal) {
      printAlignedLine("Subtotale:", receiptData.subtotal)
    }
    
    if (receiptData.tax) {
      printAlignedLine("IVA:", receiptData.tax)
    }

    printer.println("════════════════════════════════")
    printer.setTextSize(1, 1)
    printAlignedLine("TOTALE:", receiptData.total, true)
    printer.setTextSize(0, 0)
    printer.println("════════════════════════════════")
    printer.newLine()

    // Metodo pagamento
    if (receiptData.paymentMethod) {
      printer.alignLeft()
      printer.println(`Pagamento: ${receiptData.paymentMethod}`)
      printer.newLine()
    }

    // Informazioni abbonamento
    printer.println("INFORMAZIONI ABBONAMENTO:")
    printer.println("• Servizio attivo dalla data di inizio")
    printer.println("• Benefici validi fino alla scadenza")
    printer.println("• Non rimborsabile")
    printer.println("• Non trasferibile")
    printer.newLine()

    // Footer
    printer.alignCenter()
    printer.println("Grazie per aver scelto")
    printer.bold(true)
    printer.println("SAPORI E COLORI!")
    printer.bold(false)
    printer.println("Il tuo abbonamento è attivo! 🎉")
    printer.newLine()

    printer.cut()
    await printer.execute()
    
    logOperation('PRINT_SUBSCRIPTION_SUCCESS', { 
      customer: receiptData.customer,
      plan: receiptData.subscriptionDetails?.planName,
      timestamp: new Date().toISOString()
    })

    return {
      success: true,
      message: 'Ricevuta abbonamento stampata con successo',
      type: 'subscription',
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    logOperation('PRINT_SUBSCRIPTION_ERROR', { 
      error: error.message,
      customer: receiptData.customer 
    })
    
    throw error
  }
}

// POST /print/receipt - Stampa ricevuta di vendita
app.post('/print/receipt', async (req, res) => {
  try {
    const receiptData = req.body
    
    // Controlla se è una ricevuta saldo
    if (receiptData.receiptType === 'balance') {
      logOperation('BALANCE_RECEIPT_REQUEST', { 
        customer: receiptData.customer,
        balance: receiptData.balance 
      })
      
      const result = await printBalanceReceipt(receiptData)
      res.json(result)
      return
    }

    // Controlla se è una ricevuta abbonamento
    if (receiptData.receiptType === 'subscription') {
      logOperation('SUBSCRIPTION_RECEIPT_REQUEST', { 
        customer: receiptData.customer,
        plan: receiptData.subscriptionDetails?.planName,
        total: receiptData.total
      })
      
      const result = await printSubscriptionReceipt(receiptData)
      res.json(result)
      return
    }
    
    // Supporta sia gift card che ricevute generiche
    if (receiptData.giftCard) {
      // Formato gift card - converte in formato ricevuta
      const giftCard = receiptData.giftCard
      const convertedReceipt = {
        orderId: `GC-${giftCard.code}`,
        total: giftCard.balance || giftCard.amount,
        customer: giftCard.recipient_name,
        operator: 'Sistema Gift Card',
        paymentMethod: 'Gift Card',
        items: [{
          name: `Gift Card ${giftCard.code}`,
          quantity: 1,
          price: giftCard.balance || giftCard.amount
        }],
        notes: giftCard.message || 'Ricevuta Gift Card'
      }
      
      logOperation('RECEIPT_REQUEST_GIFTCARD', { 
        giftCardCode: giftCard.code,
        total: convertedReceipt.total 
      })
      
      const result = await printSalesReceipt(convertedReceipt)
      res.json(result)
    } else {
      // Formato ricevuta normale
      if (!receiptData.total) {
        return res.status(400).json({
          success: false,
          error: 'Totale ricevuta obbligatorio',
          timestamp: new Date().toISOString()
        })
      }
      
      logOperation('RECEIPT_REQUEST', { 
        orderId: receiptData.orderId,
        total: receiptData.total 
      })
      
      const result = await printSalesReceipt(receiptData)
      res.json(result)
    }
    
  } catch (error) {
    console.error('Errore stampa ricevuta:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// POST /print/test-commands - Test comandi ESC/POS
app.post('/print/test-commands', async (req, res) => {
  try {
    const printer = await createPrinter()
    
    const isConnected = await printer.isPrinterConnected()
    if (!isConnected) {
      throw new Error('Stampante non connessa')
    }

    printer.clear()
    
    // Test comandi base
    printer.alignCenter()
    printer.println("=== TEST COMANDI ESC/POS ===")
    printer.newLine()
    
    // Test 1: Text size
    printer.println("Test 1: Dimensioni testo")
    printer.setTextSize(0, 0)
    printer.println("Normale (0,0)")
    printer.setTextSize(1, 1)
    printer.println("Medio (1,1)")
    printer.setTextSize(2, 2)
    printer.println("Grande (2,2)")
    printer.setTextSize(0, 0)  // Reset
    printer.newLine()
    
    // Test 2: Invert
    printer.println("Test 2: Sfondo inverso")
    printer.invert(true)
    printer.println(" SFONDO NERO, TESTO BIANCO ")
    printer.invert(false)
    printer.println("Normale")
    printer.newLine()
    
    // Test 3: Draw Line
    printer.println("Test 3: Linee")
    printer.drawLine()
    printer.println("Linea sopra e sotto")
    printer.drawLine('=')
    printer.newLine()
    
    // Test 4: Bold e underline
    printer.println("Test 4: Formattazione")
    printer.bold(true)
    printer.println("GRASSETTO")
    printer.bold(false)
    printer.underline(true)
    printer.println("Sottolineato")
    printer.underline(false)
    printer.newLine()
    
    printer.println("=== FINE TEST ===")
    printer.cut()
    
    await printer.execute()
    
    res.json({
      success: true,
      message: 'Test comandi completato',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Errore test comandi:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// POST /print/test-chars - Test caratteri supportati
app.post('/print/test-chars', async (req, res) => {
  try {
    const printer = await createPrinter()
    
    const isConnected = await printer.isPrinterConnected()
    if (!isConnected) {
      throw new Error('Stampante non connessa')
    }

    printer.clear()
    printer.alignCenter()
    
    printer.println("=== TEST CARATTERI ===")
    printer.newLine()
    
    // Test ASCII semplice
    printer.println("ASCII SEMPLICE:")
    printer.println("*-=+#@$%&!?")
    printer.println("()-[]{}|\\/<>")
    printer.newLine()
    
    // Test caratteri estesi
    printer.println("CARATTERI ESTESI:")
    printer.println("░▓█▄▀")
    printer.println("◆◇●○◢◣")
    printer.println("╔═╗║╚╝")
    printer.println("★☆♦♣♠♥")
    printer.newLine()
    
    // Test dimensioni
    printer.println("TEST DIMENSIONI:")
    printer.setTextSize(0, 0)
    printer.println("Normale")
    printer.setTextSize(1, 1)
    printer.println("Grande")
    printer.setTextSize(2, 2)
    printer.println("Enorme")
    printer.setTextSize(0, 0)
    printer.newLine()
    
    printer.println("=== FINE TEST ===")
    printer.cut()
    await printer.execute()
    
    res.json({
      success: true,
      message: 'Test caratteri completato',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Errore test caratteri:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// POST /print/test-json - Test template JSON senza stampante
app.post('/print/test-json', async (req, res) => {
  try {
    const testData = {
      code: 'SC2025-0001',
      value: '25.00',
      recipient_name: 'Mario Rossi',
      message: 'Buon compleanno! Spero che tu possa gustare un ottimo pranzo da Sapori e Colori',
      purchaser: { name: 'Anna Bianchi' }
    }
    
    console.log('🧪 SIMULAZIONE STAMPA BUONO REGALO:')
    console.log('=====================================')
    console.log('║                                 ║')
    console.log('║           FORNO                 ║')
    console.log('║                                 ║')
    console.log('')
    console.log('      Sapori & Colori')
    console.log('    Panetteria Artigianale')
    console.log('')
    console.log('    🍞 ❦ 🥖 ❦ 🧁')
    console.log('')
    console.log('================================')
    console.log('      BUONO REGALO')
    console.log('================================')
    console.log('')
    console.log('╔══════════════════════════════╗')
    console.log('║                              ║')
    console.log('║         VALORE               ║')
    console.log('║                              ║')
    console.log(`║       € ${testData.value}             ║`)
    console.log('║                              ║')
    console.log('╚══════════════════════════════╝')
    console.log('')
    console.log('┌────────────────────────────────┐')
    console.log(`│ Codice: ${testData.code}        │`)
    console.log(`│ Emissione: ${new Date().toLocaleDateString('it-IT')}         │`)
    console.log(`│ Scadenza: ${new Date(Date.now() + 6*30*24*60*60*1000).toLocaleDateString('it-IT')}          │`)
    console.log('└────────────────────────────────┘')
    console.log('')
    console.log('┌─ DESTINATARIO ─────────────────┐')
    console.log('│                                │')
    console.log(`│ Per: ${testData.recipient_name.toUpperCase()}           │`)
    console.log(`│ Da: ${testData.purchaser.name.toUpperCase()}          │`)
    console.log('│                                │')
    console.log('│ Messaggio:                     │')
    console.log('│ Buon compleanno! Spero che     │')
    console.log('│ tu possa gustare un ottimo     │')
    console.log('│ pranzo da Sapori e Colori      │')
    console.log('└────────────────────────────────┘')
    console.log('')
    console.log('★ VALIDO PER ★')
    console.log('• Pane fresco e prodotti da forno')
    console.log('• Dolci e torte artigianali')
    console.log('• Focacce e specialità regionali')
    console.log('• Biscotti e prodotti per colazione')
    console.log('')
    console.log('CONDIZIONI D\'USO')
    console.log('■ Valido 6 mesi dalla data di emissione')
    console.log('■ Non rimborsabile in denaro contante')
    console.log('■ Non sostituibile in caso di smarrimento')
    console.log('■ Utilizzabile parzialmente')
    console.log('■ Valido solo presso Sapori & Colori')
    console.log('■ Non cumulabile con altre promozioni')
    console.log('')
    console.log('┌─ QR CODE ──────────────────────┐')
    console.log('│    ██ ▄▄ ██ ▄▄ ██ ▄▄ ██      │')
    console.log('│    ██ ▄▄ ██ ▄▄ ██ ▄▄ ██      │')
    console.log('│    ██ ▄▄ ██ ▄▄ ██ ▄▄ ██      │')
    console.log('└────────────────────────────────┘')
    console.log('')
    console.log('================================')
    console.log('Via Bagaladi 7, 00132 Roma')
    console.log('Tel: 06-1234567')
    console.log('Lun-Sab 7:00-20:00, Dom 8:00-13:00')
    console.log('info@saporicolori.it')
    console.log('')
    console.log('🍞 Grazie per aver scelto la qualità artigianale! 🥖')
    console.log('')
    console.log('"Dove ogni giorno è una festa di sapori"')
    console.log('=====================================')
    
    res.json({
      success: true,
      message: 'Simulazione template JSON completata - vedi console',
      template: 'JSON-structured-bakery',
      preview: 'Console output shows the layout',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Errore simulazione:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// POST /print/test-simple - Versione SEMPLICISSIMA
app.post('/print/test-simple', async (req, res) => {
  try {
    const printer = await createPrinter()
    
    const isConnected = await printer.isPrinterConnected()
    if (!isConnected) {
      throw new Error('Stampante non connessa')
    }

    printer.clear()
    printer.alignCenter()
    
    // Solo testo normale
    printer.println("SAPORI E COLORI")
    printer.println("GIFT CARD")
    printer.println("25 EURO")
    printer.println("TEST123")
    printer.println("25/07/2025")
    
    printer.cut()
    await printer.execute()
    
    res.json({
      success: true,
      message: 'Versione semplice stampata',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Errore stampa semplice:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// POST /print/test-png - Test stampa immagine PNG 
app.post('/print/test-png', async (req, res) => {
  try {
    const printer = await createPrinter()
    
    const isConnected = await printer.isPrinterConnected()
    if (!isConnected) {
      throw new Error('Stampante non connessa')
    }

    logOperation('PNG_TEST_START', { timestamp: new Date().toISOString() })

    printer.clear()
    printer.alignCenter()
    
    // Testo prima dell'immagine
    printer.println("=== TEST IMMAGINE PNG ===")
    printer.newLine()
    
    // CREA UN'IMMAGINE PNG DI TEST SE NON ESISTE
    const sharp = require('sharp')
    const fs = require('fs')
    const path = require('path')
    
    const testImagePath = path.join(__dirname, 'gift-card-GC2025DEMO.png')
    
    // Crea un'immagine di test se non esiste
    if (!fs.existsSync(testImagePath)) {
      await sharp({
        create: {
          width: 384,  // Larghezza per stampante 80mm
          height: 200,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      })
      .png()
      .composite([
        {
          input: Buffer.from(`
            <svg width="384" height="200">
              <rect width="384" height="200" fill="white" stroke="black" stroke-width="3"/>
              <text x="192" y="40" font-family="Arial" font-size="24" font-weight="bold" text-anchor="middle" fill="black">SAPORI E COLORI</text>
              <text x="192" y="80" font-family="Arial" font-size="32" font-weight="bold" text-anchor="middle" fill="black">GIFT CARD</text>
              <rect x="50" y="100" width="284" height="60" fill="black"/>
              <text x="192" y="140" font-family="Arial" font-size="28" font-weight="bold" text-anchor="middle" fill="white">€ 25.00</text>
              <text x="192" y="180" font-family="Arial" font-size="16" text-anchor="middle" fill="black">TEST-PNG-2025</text>
            </svg>
          `),
          top: 0,
          left: 0
        }
      ])
      .toFile(testImagePath)
    }
    
    // Stampa l'immagine
    console.log('🖨️ Tentativo stampa PNG:', testImagePath)
    await printer.printImage(testImagePath)
    
    printer.newLine()
    printer.println("Se vedi un'immagine sopra,")
    printer.println("allora le PNG funzionano!")
    printer.newLine()
    printer.println("=== FINE TEST PNG ===")
    
    printer.cut()
    await printer.execute()
    
    logOperation('PNG_TEST_SUCCESS', { imagePath: testImagePath })
    
    res.json({
      success: true,
      message: 'Test PNG completato - controlla la stampa',
      imagePath: testImagePath,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    logOperation('PNG_TEST_ERROR', { error: error.message })
    console.error('Errore test PNG:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Installa sharp con: npm install sharp',
      timestamp: new Date().toISOString()
    })
  }
})

// POST /print/test-debug - Test DEBUG nuovo template
app.post('/print/test-debug', async (req, res) => {
  try {
    const printer = await createPrinter()
    
    const isConnected = await printer.isPrinterConnected()
    if (!isConnected) {
      throw new Error('Stampante non connessa')
    }
    
    console.log('🔴 STAMPA DEBUG - TEMPLATE COMPLETAMENTE NUOVO')
    
    printer.alignCenter()
    printer.setTextSize(1, 1)
    printer.bold(true)
    printer.println("=== DEBUG TEMPLATE ===")
    printer.bold(false)
    printer.setTextSize(0, 0)
    printer.newLine()
    
    printer.println("FORNO - Sapori & Colori")
    printer.println("* * * GIFT CARD * * *")
    printer.newLine()
    
    printer.println("VALORE: € 99.99")
    printer.println("CODICE: DEBUG123")
    printer.newLine()
    
    printer.println("DEDICATO A: NUOVO CLIENTE")
    printer.println("DA: NUOVO MITTENTE")
    printer.newLine()
    
    printer.println("Questo e' il NUOVO template!")
    printer.println("Se vedi questo, il template funziona!")
    printer.newLine()
    
    printer.println("Timestamp: " + new Date().toLocaleString())
    
    printer.cut()
    await printer.execute()
    
    res.json({
      success: true,
      message: 'Template DEBUG stampato',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
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

// POST /print/test-receipt - Stampa ricevuta di test
app.post('/print/test-receipt', async (req, res) => {
  try {
    const testReceiptData = {
      orderId: 'TEST-' + Date.now(),
      total: '45.50',
      subtotal: '41.36',
      tax: '4.14',
      operator: 'Test Operator',
      customer: 'Cliente Test',
      paymentMethod: 'Contanti',
      change: '4.50',
      items: [
        { name: 'Pizza Margherita', quantity: 1, price: '8.00' },
        { name: 'Spaghetti Carbonara', quantity: 2, price: '12.00' },
        { name: 'Tiramisu', quantity: 1, price: '6.50' },
        { name: 'Acqua 0.5L', quantity: 3, price: '1.50' }
      ]
    }
    
    const result = await printSalesReceipt(testReceiptData)
    res.json(result)
    
  } catch (error) {
    console.error('Errore stampa test ricevuta:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// POST /print/generate-png - Genera Gift Card PNG
app.post('/print/generate-png', async (req, res) => {
  try {
    const { giftCard } = req.body
    
    if (!giftCard || !giftCard.code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Dati gift card mancanti' 
      })
    }
    
    console.log(`🎨 Generazione PNG per ${giftCard.code}...`)
    
    const pngBuffer = await createGiftCardPNG(giftCard)
    const filename = `gift-card-${giftCard.code}.png`
    
    // Salva il file
    fs.writeFileSync(filename, pngBuffer)
    
    console.log(`✅ PNG generato: ${filename}`)
    
    res.json({
      success: true,
      message: 'Gift Card PNG generata con successo',
      filename: filename,
      size: pngBuffer.length,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Errore generazione PNG:', error.message)
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// POST /print/simulate-json - Simula stampa JSON senza stampante
app.post('/print/simulate-json', async (req, res) => {
  console.log('\n🎯 SIMULAZIONE GIFT CARD JSON')
  console.log('================================')
  
  const { giftCard } = req.body
  
  // Simula il layout che verrà stampato
  console.log('                FORNO                ')
  console.log('          Pasta Fresca Tradizionale  ')
  console.log('----------------------------------------')
  console.log('❀ ❀ ❀ ❀ ❀ GIFT CARD ❀ ❀ ❀ ❀ ❀')
  console.log('  Un regalo speciale per te')
  console.log('----------------------------------------')
  console.log('')
  console.log(`           VALORE`)
  console.log(`         € ${giftCard?.value || '25.00'}`)
  console.log('')
  console.log('----------------------------------------')
  console.log(`DEDICATO A: ${giftCard?.recipient || 'Nome Destinatario'}`)
  console.log('')
  console.log('┌─ MESSAGGIO ──────────────────────┐')
  console.log('│                                  │')
  console.log(`│ ${(giftCard?.notes || 'Buon regalo!').substring(0,32).padEnd(32)} │`)
  console.log('│                                  │')
  console.log('└──────────────────────────────────┘')
  console.log('')
  console.log(`DA PARTE DI: ${giftCard?.purchaser || 'Mittente'}`)
  console.log('')
  console.log('        [QR CODE]')
  console.log(`     ${giftCard?.code || 'DEMO2025'}`)
  console.log('')
  console.log('VALIDITÀ: 12 mesi dalla data di acquisto')
  console.log('Non rimborsabile - Non trasferibile')
  console.log('Utilizzabile in un\'unica soluzione')
  console.log('')
  console.log('┌──────────────────────────────────┐')
  console.log('│        SAPORI & COLORI           │')
  console.log('│       Via Bagaladi 7             │')
  console.log('│       00132 Roma                 │')
  console.log('└──────────────────────────────────┘')
  console.log('================================')
  console.log('')
  
  res.json({
    success: true,
    message: 'Simulazione completata - layout mostrato in console',
    data: giftCard,
    height_estimate: '~15cm',
    timestamp: new Date().toISOString()
  })
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
    const printer = await createPrinter()
    const isConnected = await printer.isPrinterConnected()
    
    console.log('🖨️  Stampante connessa:', isConnected ? '✅' : '❌')
    
    // Avvio server HTTP
    app.listen(PORT, () => {
      console.log('')
      console.log('🚀 Print Server avviato su porta', PORT)
      console.log('🖨️  Stampante: Bisofice ESC/POS 80mm')
      console.log('🌐 IP Stampante:', `${CURRENT_PRINTER_IP}:9100`)
      console.log('📡 API disponibili:')
      console.log(`   GET  http://localhost:${PORT}/print/status`)
      console.log(`   POST http://localhost:${PORT}/print/gift-card`)
      console.log(`   POST http://localhost:${PORT}/print/receipt`)
      console.log(`   POST http://localhost:${PORT}/print/test`)
      console.log(`   POST http://localhost:${PORT}/print/test-receipt`)
      console.log(`   POST http://localhost:${PORT}/print/test-png`)
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

// Endpoint per stampa scontrini SumUp con logo da Supabase

const SUMUP_LOGO_URL = 'https://jexkalekaofsfcusdfjh.supabase.co/storage/v1/object/public/tinymce-images/sumup-logo.png'

// POST /print/sumup-receipt - Stampa scontrino SumUp professionale
app.post('/print/sumup-receipt', async (req, res) => {
  try {
    const { receipt } = req.body
    
    if (!receipt) {
      return res.status(400).json({
        success: false,
        error: 'Dati ricevuta mancanti'
      })
    }

    console.log('🖨️ Stampa scontrino SumUp:', receipt.transactionCode)

    const printer = await createPrinter()
    
    // 1. Scarica logo SumUp da Supabase
    console.log('⬇️ Scaricando logo SumUp...')
    const logoResponse = await fetch(SUMUP_LOGO_URL)
    
    if (logoResponse.ok) {
      const logoArrayBuffer = await logoResponse.arrayBuffer()
      const logoBuffer = Buffer.from(logoArrayBuffer)
      
      // Ridimensiona logo per stampante (più grande)
      const sharp = require('sharp')
      const resizedLogoBuffer = await sharp(logoBuffer)
        .resize(300, null, { // Larghezza 300px, altezza proporzionale
          withoutEnlargement: false,
          fit: 'inside'
        })
        .png()
        .toBuffer()
      
      const tempLogoPath = 'temp-sumup-logo.png'
      fs.writeFileSync(tempLogoPath, resizedLogoBuffer)
      console.log('✅ Logo SumUp scaricato e ridimensionato')
    }

    printer.clear()
    
    // 2. Stampa logo SumUp
    try {
      printer.alignCenter()
      await printer.printImage('temp-sumup-logo.png')
      printer.newLine()
      console.log('✅ Logo SumUp stampato')
    } catch (logoError) {
      console.log('⚠️ Logo non stampato, uso testo:', logoError.message)
      // Fallback testo se logo non funziona
      printer.alignCenter()
      printer.println("╔══════════════════════════╗")
      printer.println("║         SUMUP            ║")
      printer.println("╚══════════════════════════╝")
      printer.newLine()
    }
    
    // 3. Header scontrino
    printer.alignCenter()
    printer.setTextSize(0, 0)
    printer.println("Card Payment Receipt")
    printer.println("===============================")
    printer.newLine()
    
    // 4. Dati merchant
    printer.println(receipt.merchantName || 'SAPORI E COLORI B SRL')
    printer.println(receipt.merchantAddress || 'Via Bagaladi 7, 00132 Roma')
    printer.println(`P.IVA: ${receipt.vatId || 'IT16240351003'}`)
    printer.println(`Merchant: ${receipt.merchantCode || 'MCNUET34'}`)
    printer.newLine()
    
    // 5. Dati transazione
    printer.alignLeft()
    printer.println("TRANSACTION DETAILS")
    printer.println("===============================")
    
    // Formatta data
    const transactionDate = new Date(receipt.timestamp)
    const dateStr = transactionDate.toLocaleDateString('it-IT')
    const timeStr = transactionDate.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
    
    printer.println(`Date: ${dateStr} ${timeStr}`)
    printer.println(`Amount: EUR ${parseFloat(receipt.amount).toFixed(2)}`)
    printer.println(`Transaction ID: ${receipt.transactionCode}`)
    printer.newLine()
    
    // 6. Dati carta
    printer.println("PAYMENT METHOD")
    printer.println("===============================")
    printer.println(`Card Type: ${receipt.cardType || 'CARD'}`)
    printer.println(`Entry Mode: ${receipt.entryMode || 'N/A'}`)
    printer.println("Status: APPROVED")
    printer.newLine()
    
    // 7. Footer
    printer.alignCenter()
    printer.println("===============================")
    printer.println("Thank you!")
    printer.newLine()
    printer.println("Keep this receipt")
    printer.println("for your records")
    printer.newLine()
    
    // 8. Info legali piccole
    printer.setTextSize(0, 0)
    printer.println(`Terminal: ${receipt.merchantCode || 'MCNUET34'}`)
    printer.println("Customer copy")
    printer.newLine()
    
    printer.cut()
    await printer.execute()
    
    // Cleanup logo temporaneo
    try {
      fs.unlinkSync('temp-sumup-logo.png')
    } catch (cleanupError) {
      console.log('⚠️ Cleanup logo:', cleanupError.message)
    }
    
    console.log('✅ Scontrino SumUp stampato con successo')
    
    res.json({
      success: true,
      message: 'Scontrino SumUp stampato con successo',
      transactionCode: receipt.transactionCode,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Errore stampa scontrino SumUp:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// Avvio
startServer()