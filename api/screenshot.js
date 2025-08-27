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
    const { html, width = 600, height = 800 } = req.body

    if (!html) {
      return res.status(400).json({ error: 'HTML content required' })
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