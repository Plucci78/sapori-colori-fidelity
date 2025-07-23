/**
 * API Proxy per stato stampante IT-ditron
 * Risolve problemi CORS di Cloudflare Tunnel
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // URL del tunnel NFC - HTTP funziona server-to-server
    const printUrl = 'http://nfc.saporiecolori.net/print/status'
    
    console.log('🖨️ Print Proxy: Controllo stato stampante via', printUrl)
    
    const response = await fetch(printUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Vercel-Print-Proxy/1.0'
      },
      timeout: 8000
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    
    console.log('✅ Print Proxy: Stato stampante ricevuto', data.available ? 'READY' : 'OFFLINE')
    
    return res.status(200).json(data)

  } catch (error) {
    console.error('❌ Print Proxy Status Error:', error.message)
    
    return res.status(500).json({
      available: false,
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}