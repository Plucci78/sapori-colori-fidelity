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
      const logoBuffer = await logoResponse.buffer()
      const tempLogoPath = 'temp-sumup-logo.png'
      fs.writeFileSync(tempLogoPath, logoBuffer)
      console.log('✅ Logo SumUp scaricato')
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
    printer.println("═══════════════════════════════")
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
    printer.println("───────────────────────────────")
    
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
    printer.println("───────────────────────────────")
    printer.println(`Card Type: ${receipt.cardType || 'CARD'}`)
    printer.println(`Entry Mode: ${receipt.entryMode || 'N/A'}`)
    printer.println("Status: APPROVED")
    printer.newLine()
    
    // 7. Footer
    printer.alignCenter()
    printer.println("═══════════════════════════════")
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

module.exports = { SUMUP_LOGO_URL }