/**
 * Genera un token sicuro e univoco per il cliente
 * @returns {string} Token di 8 caratteri alfanumerici
 */
export const generateClientToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Verifica che il token sia valido (8 caratteri alfanumerici)
 * @param {string} token 
 * @returns {boolean}
 */
export const isValidToken = (token) => {
  return /^[A-Za-z0-9]{8}$/.test(token)
}

/**
 * Genera URL completo per il cliente
 * @param {string} token 
 * @returns {string}
 */
export const generateClientURL = (token) => {
  const baseUrl = window.location.origin
  return `${baseUrl}/cliente/${token}`
}