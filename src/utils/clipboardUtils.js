// utils/clipboardUtils.js

/**
 * Copia testo negli appunti con fallback multipli
 * @param {string} text - Testo da copiare
 * @param {Function} showNotification - Funzione per mostrare notifiche
 * @returns {Promise<boolean>} - true se ha successo, false altrimenti
 */
export const copyToClipboard = async (text, showNotification = null) => {
  if (!text) {
    if (showNotification) showNotification('Nessun testo da copiare', 'warning')
    return false
  }

  // Metodo 1: Clipboard API moderna (preferito)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      if (showNotification) showNotification('✅ Copiato negli appunti!', 'success')
      return true
    } catch (err) {
      console.warn('Clipboard API fallita:', err)
      // Continua con il fallback
    }
  }

  // Metodo 2: Fallback con execCommand (deprecato ma funzionale)
  try {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)
    
    if (successful) {
      if (showNotification) showNotification('✅ Copiato negli appunti!', 'success')
      return true
    }
  } catch (err) {
    console.warn('execCommand fallback fallito:', err)
  }

  // Metodo 3: Fallback finale - textarea visibile per copia manuale
  try {
    // Crea un modal personalizzato per la copia manuale
    const modal = createCopyModal(text)
    document.body.appendChild(modal)
    
    // Aspetta che l'utente chiuda il modal
    return new Promise((resolve) => {
      const closeBtn = modal.querySelector('.close-btn')
      const copyBtn = modal.querySelector('.copy-btn')
      
      const cleanup = () => {
        document.body.removeChild(modal)
      }
      
      closeBtn.onclick = () => {
        cleanup()
        resolve(false)
      }
      
      copyBtn.onclick = () => {
        const textarea = modal.querySelector('textarea')
        textarea.select()
        textarea.setSelectionRange(0, 99999) // Per mobile
        
        try {
          document.execCommand('copy')
          if (showNotification) showNotification('✅ Copiato negli appunti!', 'success')
          cleanup()
          resolve(true)
        } catch (err) {
          if (showNotification) showNotification('⚠️ Seleziona il testo e premi Ctrl+C', 'warning')
          resolve(false)
        }
      }
      
      // Auto-seleziona il testo
      const textarea = modal.querySelector('textarea')
      textarea.select()
      textarea.setSelectionRange(0, 99999)
    })
  } catch (error) {
    console.error('Tutti i metodi di copia sono falliti:', error)
    // Fallback finale: alert con il testo
    alert(`Copia questo testo manualmente:\n\n${text}`)
    return false
  }
}

/**
 * Copia codice referral con feedback specifico
 * @param {string} referralCode - Codice referral da copiare
 * @param {Function} showNotification - Funzione per mostrare notifiche
 * @returns {Promise<boolean>}
 */
export const copyReferralCode = async (referralCode, showNotification = null) => {
  if (!referralCode) {
    if (showNotification) showNotification('⚠️ Nessun codice referral disponibile', 'warning')
    return false
  }

  const success = await copyToClipboard(referralCode, null) // Non mostrare notifica generica
  
  if (success && showNotification) {
    showNotification(`🎉 Codice referral "${referralCode}" copiato!`, 'success')
  } else if (!success && showNotification) {
    showNotification('❌ Impossibile copiare automaticamente', 'error')
  }
  
  return success
}

/**
 * Copia link cliente con feedback specifico
 * @param {string} clientUrl - URL del cliente da copiare
 * @param {Function} showNotification - Funzione per mostrare notifiche
 * @returns {Promise<boolean>}
 */
export const copyClientLink = async (clientUrl, showNotification = null) => {
  if (!clientUrl) {
    if (showNotification) showNotification('⚠️ Nessun link cliente disponibile', 'warning')
    return false
  }

  const success = await copyToClipboard(clientUrl, null) // Non mostrare notifica generica
  
  if (success && showNotification) {
    showNotification('🔗 Link cliente copiato negli appunti!', 'success')
  } else if (!success && showNotification) {
    showNotification('❌ Impossibile copiare automaticamente', 'error')
  }
  
  return success
}

/**
 * Crea un modal personalizzato per la copia manuale
 * @param {string} text - Testo da copiare
 * @returns {HTMLElement} - Elemento del modal
 */
const createCopyModal = (text) => {
  const modal = document.createElement('div')
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `
  
  modal.innerHTML = `
    <div style="
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    ">
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
      ">
        <h3 style="
          margin: 0;
          color: #333;
          font-size: 18px;
          font-weight: 600;
        ">📋 Copia negli Appunti</h3>
        <button class="close-btn" style="
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          padding: 0;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">&times;</button>
      </div>
      
      <p style="
        margin: 0 0 16px 0;
        color: #666;
        font-size: 14px;
        line-height: 1.4;
      ">La copia automatica non è disponibile. Copia manualmente il testo qui sotto:</p>
      
      <textarea readonly style="
        width: 100%;
        height: 80px;
        padding: 12px;
        border: 2px solid #e1e5e9;
        border-radius: 8px;
        font-family: monospace;
        font-size: 14px;
        background-color: #f8f9fa;
        resize: vertical;
        margin-bottom: 16px;
        box-sizing: border-box;
      ">${text}</textarea>
      
      <div style="
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      ">
        <button class="close-btn" style="
          padding: 8px 16px;
          background-color: #6c757d;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">Annulla</button>
        <button class="copy-btn" style="
          padding: 8px 16px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">📋 Copia</button>
      </div>
    </div>
  `
  
  return modal
}
