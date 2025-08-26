/**
 * API Unified per Print Operations
 * Combina status, gift-card e receipt in un'unica API
 * ?operation=status (GET) | ?operation=gift-card (POST) | ?operation=receipt (POST)
 */
export default async function handler(req, res) {
  const { method, query, body } = req
  const operation = query.operation || body?.operation

  const printUrl = 'https://sacred-eagle-similarly.ngrok-free.app/print'

  try {
    if (operation === 'status') {
      // Print Status Check
      if (method !== 'GET') {
        return res.status(405).json({ error: 'GET method required for status' })
      }

      console.log('🖨️ Print: Controllo stato stampante')
      
      const response = await fetch(`${printUrl}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Vercel-Print-Unified/1.0'
        },
        timeout: 8000
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('✅ Print Status:', data.available ? 'READY' : 'OFFLINE')
      return res.status(200).json(data)

    } else if (operation === 'gift-card') {
      // Gift Card Print
      if (method !== 'POST') {
        return res.status(405).json({ error: 'POST method required for gift-card' })
      }

      const { giftCard } = body || {}
      
      if (!giftCard || !giftCard.code) {
        return res.status(400).json({
          success: false,
          error: 'Gift card data missing or invalid'
        })
      }

      console.log('🎁 Print: Stampa gift card', giftCard.code)
      
      const response = await fetch(`${printUrl}/gift-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Vercel-Print-Unified/1.0'
        },
        body: JSON.stringify({ giftCard }),
        timeout: 15000
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Gift card print failed')
      }

      console.log('✅ Gift Card Print:', data.success ? 'SUCCESS' : 'FAILED')
      return res.status(200).json(data)

    } else if (operation === 'receipt') {
      // Receipt Print
      if (method !== 'POST') {
        return res.status(405).json({ error: 'POST method required for receipt' })
      }

      const receiptData = body
      
      if (!receiptData) {
        return res.status(400).json({
          success: false,
          error: 'Receipt data missing'
        })
      }

      console.log('🧾 Print: Stampa ricevuta')
      
      const response = await fetch(`${printUrl}/receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Vercel-Print-Unified/1.0'
        },
        body: JSON.stringify(receiptData),
        timeout: 15000
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Receipt print failed')
      }

      console.log('✅ Receipt Print:', data.success ? 'SUCCESS' : 'FAILED')
      return res.status(200).json(data)

    } else {
      return res.status(400).json({ 
        error: 'Invalid operation',
        available: ['status', 'gift-card', 'receipt']
      })
    }

  } catch (error) {
    console.error(`❌ Print ${operation} Error:`, error.message)
    
    return res.status(500).json({
      success: false,
      error: `Print ${operation} failed`,
      details: error.message,
      timestamp: new Date().toISOString()
    })
  }
}