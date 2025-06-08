// utils/levelsUtils.js

/**
 * Determina il livello di un cliente in base alle sue GEMME
 * @param {number} gems - Numero di GEMME del cliente
 * @param {Array} levels - Array dei livelli configurati
 * @returns {Object} Oggetto livello corrispondente
 */
export const getCustomerLevel = (gems, levels) => {
  if (!levels || levels.length === 0) {
    return {
      name: 'Bronzo',
      primary_color: '#cd7f32',
      background_gradient: 'linear-gradient(135deg, #cd7f32 0%, #b8860b 100%)',
      icon_svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z"/></svg>'
    }
  }

  // Ordina i livelli per sort_order
  const sortedLevels = [...levels].sort((a, b) => a.sort_order - b.sort_order)
  
  for (const level of sortedLevels) {
    if (gems >= level.min_gems && (level.max_gems === null || gems <= level.max_gems)) {
      return level
    }
  }
  
  // Se non trova nessun livello, ritorna il primo
  return sortedLevels[0]
}

/**
 * Calcola i GEMME necessari per il prossimo livello
 * @param {number} gems - GEMME attuali del cliente
 * @param {Array} levels - Array dei livelli configurati
 * @returns {Object} Informazioni sul prossimo livello
 */
export const getNextLevelInfo = (gems, levels) => {
  const currentLevel = getCustomerLevel(gems, levels)
  const sortedLevels = [...levels].sort((a, b) => a.sort_order - b.sort_order)
  
  const currentIndex = sortedLevels.findIndex(l => l.name === currentLevel.name)
  const nextLevel = sortedLevels[currentIndex + 1]
  
  if (!nextLevel) {
    return {
      hasNextLevel: false,
      gemsNeeded: 0,
      nextLevelName: 'Livello Massimo',
      progress: 100
    }
  }
  
  const gemsNeeded = nextLevel.min_gems - gems
  const progressRange = nextLevel.min_gems - currentLevel.min_gems
  const currentProgress = gems - currentLevel.min_gems
  const progress = Math.min((currentProgress / progressRange) * 100, 100)
  
  return {
    hasNextLevel: true,
    gemsNeeded: Math.max(gemsNeeded, 0),
    nextLevelName: nextLevel.name,
    progress: Math.max(progress, 0)
  }
}

/**
 * Valida un codice SVG per sicurezza
 * @param {string} svgCode - Codice SVG da validare
 * @returns {boolean} True se il codice è sicuro
 */
export const validateSVG = (svgCode) => {
  if (!svgCode || typeof svgCode !== 'string') return false
  
  // Controlli di sicurezza base
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ]
  
  return !dangerousPatterns.some(pattern => pattern.test(svgCode))
}

/**
 * Sanitizza e normalizza un codice SVG
 * @param {string} svgCode - Codice SVG da sanitizzare
 * @returns {string} SVG sanitizzato
 */
export const sanitizeSVG = (svgCode) => {
  if (!validateSVG(svgCode)) return ''
  
  // Assicura che l'SVG abbia viewBox e currentColor
  let cleanSVG = svgCode.trim()
  
  // Se non ha viewBox, ne aggiunge uno standard
  if (!cleanSVG.includes('viewBox')) {
    cleanSVG = cleanSVG.replace('<svg', '<svg viewBox="0 0 24 24"')
  }
  
  return cleanSVG
}

/**
 * Libreria di icone SVG predefinite
 */
export const PREDEFINED_ICONS = {
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z"/></svg>',
  crown: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 6L15 2L17 7L22 4L20 10H4L2 4L7 7L9 2L12 6Z"/><rect x="4" y="10" width="16" height="8" rx="2"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M12 7C13.4 7 14.8 8.6 14.8 10V14H9.2V10C9.2 8.6 10.6 7 12 7Z"/></svg>',
  diamond: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 2L2 8L12 22L22 8L18 2H6M6.5 3H8.5L7 5.5L6.5 3M9.5 3H14.5L16 5.5L12 9L8 5.5L9.5 3M15.5 3H17.5L16.5 5.5L15 3M5.27 9L7.58 6L9 6.5L6.73 9H5.27M17.27 9L15 6.5L16.42 6L18.73 9H17.27Z"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 3V6H6C4.9 6 4 6.9 4 8V10C4 11.1 4.9 12 6 12H7V21H17V12H18C19.1 12 20 11.1 20 10V8C20 6.9 19.1 6 18 6H17V3H7M16 8V10H18V8H16M6 8H8V10H6V8Z"/></svg>',
  medal: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4C13.1 4 14 4.9 14 6C14 7.1 13.1 8 12 8C10.9 8 10 7.1 10 6C10 4.9 10.9 4 12 4M21 9V7L15 1L13.5 2.5L16.17 5.17L10.5 10.84L11.92 12.25L15 9.17L17.5 11.67L19 10.17L21 9M3 15.5L6.5 12L8 13.5L4.5 17L3 15.5Z"/></svg>'
}

/**
 * Genera CSS per gradient personalizzato
 * @param {string} primaryColor - Colore primario
 * @param {number} opacity - Opacità (0-1)
 * @returns {string} CSS gradient
 */
export const generateLevelGradient = (primaryColor, opacity = 1) => {
  const hex = primaryColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  
  return `linear-gradient(135deg, 
    rgba(${r}, ${g}, ${b}, ${opacity}) 0%, 
    rgba(${Math.max(r - 30, 0)}, ${Math.max(g - 30, 0)}, ${Math.max(b - 30, 0)}, ${opacity}) 100%)`
}
