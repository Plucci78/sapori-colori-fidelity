// Vercel Serverless Function per proxy immagini (evita CORS)
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { imageUrl } = req.body

    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl required' })
    }

    console.log('🔄 Proxy downloading image:', imageUrl)

    // Scarica l'immagine dal server
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`)
      return res.status(response.status).json({ 
        error: `HTTP ${response.status}: ${response.statusText}` 
      })
    }

    const buffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    console.log('✅ Image downloaded successfully')
    console.log('   - Size:', buffer.byteLength, 'bytes')
    console.log('   - Type:', contentType)

    // Restituisci l'immagine
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Length', buffer.byteLength)
    res.setHeader('Cache-Control', 'public, max-age=3600') // Cache 1 ora
    
    return res.send(Buffer.from(buffer))

  } catch (error) {
    console.error('❌ Proxy image error:', error)
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.toString()
    })
  }
}