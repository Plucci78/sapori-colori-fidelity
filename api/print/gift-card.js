/**
 * API Proxy per stampa Gift Card su IT-ditron
 * Risolve problemi CORS di Cloudflare Tunnel
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { giftCard } = req.body || {}
    
    if (!giftCard || !giftCard.code) {
      return res.status(400).json({
        success: false,
        error: 'Dati gift card mancanti'
      })
    }
    
    // URL del tunnel NFC - HTTP funziona server-to-server
    const printUrl = 'https://sacred-eagle-similarly.ngrok-free.app/print/gift-card'
    
    console.log('🖨️ Print Proxy: Stampa gift card', giftCard.code, 'via', printUrl)
    
    const response = await fetch(printUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Vercel-Print-Proxy/1.0'
      },
      body: JSON.stringify({ giftCard }),
      timeout: 15000 // 15 secondi per stampa
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    
    console.log('✅ Print Proxy: Gift card stampata', data.success ? 'SUCCESS' : 'FAILED')
    
    return res.status(200).json(data)

  } catch (error) {
    console.error('❌ Print Proxy Gift Card Error:', error.message)
    
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}