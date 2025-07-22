/**
 * API Proxy per NFC Bridge Status
 * Risolve problemi CORS di Cloudflare Tunnel
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // URL del tunnel NFC - HTTP funziona server-to-server
    const nfcUrl = 'http://nfc.saporiecolori.net/nfc/status'
    
    console.log('🔍 NFC Proxy: Connecting to', nfcUrl)
    
    const response = await fetch(nfcUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Vercel-NFC-Proxy/1.0'
      },
      timeout: 8000
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    
    console.log('✅ NFC Proxy: Response received', data)
    
    return res.status(200).json(data)

  } catch (error) {
    console.error('❌ NFC Proxy Error:', error.message)
    
    return res.status(500).json({
      error: 'NFC Bridge unreachable',
      details: error.message,
      timestamp: new Date().toISOString(),
      available: false
    })
  }
}