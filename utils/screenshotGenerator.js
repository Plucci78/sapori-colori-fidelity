// ===================================
// GENERATORE SCREENSHOT LANDING PAGES
// ===================================

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

class ScreenshotGenerator {
  constructor() {
    this.browser = null;
  }

  // Inizializza browser Puppeteer
  async initBrowser() {
    if (!this.browser) {
      console.log('🚀 Inizializzando browser per screenshot...');
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
      console.log('✅ Browser inizializzato');
    }
    return this.browser;
  }

  // Chiude browser
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('🔒 Browser chiuso');
    }
  }

  // Crea screenshot da HTML/CSS
  async generateScreenshotFromHTML(htmlContent, cssContent, options = {}) {
    const {
      width = 1200,
      height = 800,
      quality = 80,
      format = 'jpeg'
    } = options;

    try {
      const browser = await this.initBrowser();
      const page = await browser.newPage();

      // Imposta viewport
      await page.setViewport({ width, height });

      // Crea contenuto HTML completo
      const fullHTML = `
        <!DOCTYPE html>
        <html lang="it">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Landing Page Preview</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
            }
            ${cssContent || ''}
          </style>
        </head>
        <body>
          ${htmlContent || '<div style="padding: 50px; text-align: center; color: #999;">Contenuto non disponibile</div>'}
        </body>
        </html>
      `;

      // Carica contenuto nella pagina
      await page.setContent(fullHTML, { 
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 10000
      });

      // Attendi che eventuali immagini si caricino
      await page.waitForTimeout(2000);

      // Genera screenshot
      console.log(`📸 Generando screenshot ${width}x${height}...`);
      const screenshot = await page.screenshot({
        type: format,
        quality: format === 'jpeg' ? quality : undefined,
        fullPage: false, // Solo la viewport
        clip: { x: 0, y: 0, width, height }
      });

      await page.close();
      console.log('✅ Screenshot generato');

      return screenshot;

    } catch (error) {
      console.error('❌ Errore generazione screenshot:', error);
      throw error;
    }
  }

  // Crea screenshot da URL pubblico
  async generateScreenshotFromURL(url, options = {}) {
    const {
      width = 1200,
      height = 800,
      quality = 80,
      format = 'jpeg',
      delay = 2000
    } = options;

    try {
      const browser = await this.initBrowser();
      const page = await browser.newPage();

      // Imposta viewport
      await page.setViewport({ width, height });

      console.log(`📱 Navigando verso: ${url}`);
      
      // Naviga alla pagina
      await page.goto(url, { 
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 15000
      });

      // Attendi caricamento completo
      await page.waitForTimeout(delay);

      // Genera screenshot
      console.log(`📸 Generando screenshot da URL...`);
      const screenshot = await page.screenshot({
        type: format,
        quality: format === 'jpeg' ? quality : undefined,
        fullPage: false,
        clip: { x: 0, y: 0, width, height }
      });

      await page.close();
      console.log('✅ Screenshot da URL generato');

      return screenshot;

    } catch (error) {
      console.error('❌ Errore screenshot da URL:', error);
      throw error;
    }
  }

  // Salva screenshot su filesystem
  async saveScreenshot(screenshotBuffer, filename, directory = 'public/thumbnails') {
    try {
      // Crea directory se non esiste
      const fullDir = path.join(process.cwd(), directory);
      if (!fs.existsSync(fullDir)) {
        fs.mkdirSync(fullDir, { recursive: true });
        console.log(`📁 Creata directory: ${fullDir}`);
      }

      // Salva file
      const filepath = path.join(fullDir, filename);
      fs.writeFileSync(filepath, screenshotBuffer);

      const publicPath = `/${directory}/${filename}`;
      console.log(`💾 Screenshot salvato: ${publicPath}`);

      return {
        filepath,
        publicPath,
        filename
      };

    } catch (error) {
      console.error('❌ Errore salvataggio screenshot:', error);
      throw error;
    }
  }

  // Genera nome file unico per thumbnail
  generateThumbnailFilename(landingPageId, type = 'landing') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${type}_${landingPageId}_${timestamp}_${random}.jpg`;
  }

  // Metodo completo: genera e salva thumbnail
  async createLandingPageThumbnail(landingPageId, htmlContent, cssContent, options = {}) {
    try {
      console.log(`🎯 Creando thumbnail per landing page: ${landingPageId}`);

      // Genera screenshot
      const screenshot = await this.generateScreenshotFromHTML(htmlContent, cssContent, {
        width: 400,  // Thumbnail più piccolo
        height: 300,
        quality: 75,
        ...options
      });

      // Genera nome file
      const filename = this.generateThumbnailFilename(landingPageId);

      // Salva screenshot
      const result = await this.saveScreenshot(screenshot, filename);

      console.log(`✅ Thumbnail creato: ${result.publicPath}`);
      
      return result;

    } catch (error) {
      console.error(`❌ Errore creazione thumbnail per ${landingPageId}:`, error);
      
      // Ritorna un placeholder in caso di errore
      return {
        filepath: null,
        publicPath: '/placeholder-thumbnail.svg',
        filename: 'placeholder-thumbnail.svg'
      };
    }
  }

  // Cleanup: chiude browser quando il processo termina
  async cleanup() {
    await this.closeBrowser();
  }
}

// Istanza singleton
const screenshotGenerator = new ScreenshotGenerator();

// Cleanup automatico
process.on('exit', () => screenshotGenerator.cleanup());
process.on('SIGINT', () => screenshotGenerator.cleanup());
process.on('SIGTERM', () => screenshotGenerator.cleanup());

module.exports = screenshotGenerator;