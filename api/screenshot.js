import puppeteer from 'puppeteer'

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { html, width = 600, height = 800, imageUrl } = req.body

    // Se c'è imageUrl, funziona come proxy per immagini
    if (imageUrl) {
      console.log('🔄 Proxy downloading image:', imageUrl)

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

      console.log('✅ Image downloaded successfully, size:', buffer.byteLength, 'bytes')

      res.setHeader('Content-Type', contentType)
      res.setHeader('Content-Length', buffer.byteLength)
      res.setHeader('Cache-Control', 'public, max-age=3600')
      
      return res.send(Buffer.from(buffer))
    }

    // Funzionalità screenshot normale
    if (!html) {
      return res.status(400).json({ error: 'HTML content or imageUrl required' })
    }

    console.log('🚀 Starting Puppeteer screenshot generation...')

    // Inizializza Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process'
      ]
    })

    const page = await browser.newPage()
    
    // Imposta viewport
    await page.setViewport({
      width: parseInt(width),
      height: parseInt(height),
      deviceScaleFactor: 1
    })

    // Carica l'HTML
    await page.setContent(html, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 10000
    })

    console.log('📄 HTML loaded, waiting for images...')

    // Aspetta che tutte le immagini si carichino
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.querySelectorAll('img')).map(img => {
          if (img.complete) return Promise.resolve()
          return new Promise(resolve => {
            img.onload = resolve
            img.onerror = resolve
            setTimeout(resolve, 3000) // Timeout
          })
        })
      )
    })

    console.log('🖼️ Images loaded, generating screenshot...')

    // Genera screenshot
    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: 80,
      fullPage: false,
      clip: {
        x: 0,
        y: 0,
        width: parseInt(width),
        height: parseInt(height)
      }
    })

    await browser.close()

    console.log('✅ Screenshot generated successfully')

    // Converti in base64
    const base64 = screenshot.toString('base64')
    const dataUrl = `data:image/jpeg;base64,${base64}`

    return res.status(200).json({
      success: true,
      screenshot: dataUrl,
      size: screenshot.length
    })

  } catch (error) {
    console.error('❌ Screenshot error:', error)
    return res.status(500).json({
      success: false,
      error: error.message,
      fallback: `https://via.placeholder.com/600x800/8B4513/ffffff?text=${encodeURIComponent('📧 Template Preview')}`
    })
  }
}