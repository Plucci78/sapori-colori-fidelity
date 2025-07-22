/**
 * API Proxy per NFC Bridge Read
 * Risolve problemi CORS di Cloudflare Tunnel
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { timeout = 10000 } = req.body || {}
    
    // URL del tunnel NFC - HTTP funziona server-to-server
    const nfcUrl = 'http://nfc.saporiecolori.net/nfc/read'
    
    console.log('🔍 NFC Proxy: Reading tag via', nfcUrl)
    
    const response = await fetch(nfcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Vercel-NFC-Proxy/1.0'
      },
      body: JSON.stringify({ timeout }),
      timeout: timeout + 2000 // Aggiungi 2s di buffer
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    
    console.log('✅ NFC Proxy: Tag read result', data.success ? 'SUCCESS' : 'FAILED')
    
    return res.status(200).json(data)

  } catch (error) {
    console.error('❌ NFC Proxy Read Error:', error.message)
    
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}