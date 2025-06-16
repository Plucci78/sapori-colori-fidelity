// utils/levelEmailUtils.js
import { supabase } from '../supabase'

/**
 * Recupera i livelli configurati per le email automatiche
 * @returns {Array} Lista dei livelli ordinati
 */
export const getLevelsForEmails = async () => {
  try {
    const { data: levels, error } = await supabase
      .from('customer_levels')
      .select('*')
      .eq('active', true)
      .order('sort_order')

    if (error) {
      console.error('Errore recupero livelli per email:', error)
      return []
    }

    return levels || []
  } catch (error) {
    console.error('Errore getLevelsForEmails:', error)
    return []
  }
}

/**
 * Verifica se un cliente ha raggiunto un nuovo livello e deve ricevere email
 * @param {number} oldPoints - GEMME precedenti
 * @param {number} newPoints - GEMME attuali
 * @param {Array} levels - Livelli configurati
 * @returns {Object|null} Informazioni sul nuovo livello raggiunto o null
 */
export const checkLevelUpForEmail = (oldPoints, newPoints, levels) => {
  if (!levels || levels.length === 0) return null

  // Trova il livello precedente
  const oldLevel = levels.find(level => 
    oldPoints >= level.min_gems && 
    (level.max_gems === null || oldPoints <= level.max_gems)
  )

  // Trova il livello attuale
  const newLevel = levels.find(level => 
    newPoints >= level.min_gems && 
    (level.max_gems === null || newPoints <= level.max_gems)
  )

  // Se ha cambiato livello, ritorna le informazioni
  if (newLevel && (!oldLevel || oldLevel.id !== newLevel.id)) {
    return {
      newLevel,
      oldLevel: oldLevel || null,
      isFirstLevel: !oldLevel,
      levelUpOccurred: true
    }
  }

  return null
}

/**
 * Genera il contenuto email personalizzato per il livello raggiunto
 * @param {Object} level - Livello raggiunto
 * @param {string} customerName - Nome del cliente
 * @param {number} gems - GEMME totali
 * @returns {Object} Subject e contenuto HTML dell'email
 */
export const generateLevelEmailContent = (level, customerName, gems) => {
  const subject = `🎉 ${customerName}, hai raggiunto il livello ${level.name}!`
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, ${level.primary_color || '#6366f1'} 0%, #1e293b 100%);">
      <div style="padding: 40px; text-align: center;">
        <img src="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png" alt="Sapori & Colori" style="max-width: 200px; margin-bottom: 20px;">
        <div style="background: rgba(255,255,255,0.9); border-radius: 50%; width: 120px; height: 120px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; ${level.background_gradient ? `background: ${level.background_gradient};` : ''} box-shadow: 0 8px 25px rgba(0,0,0,0.2);">
          <div style="color: white; font-size: 28px; font-weight: bold;">
            ${level.icon_svg ? level.icon_svg : '🏆'}
          </div>
        </div>
        <h1 style="color: white; margin: 0; font-size: 32px;">Livello ${level.name}!</h1>
        <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin: 10px 0 0;">Complimenti ${customerName}!</p>
      </div>
      
      <div style="background: white; padding: 40px; margin: 0 20px; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
        <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Nuovo traguardo raggiunto! 🎯</h2>
        
        <div style="text-align: center; background: ${level.background_gradient || level.primary_color || '#f8f9fa'}; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <div style="font-size: 48px; font-weight: bold; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
            ${gems} GEMME
          </div>
          <div style="color: rgba(255,255,255,0.9); font-size: 16px; margin-top: 5px;">
            Livello ${level.name} raggiunto!
          </div>
        </div>
        
        <p style="color: #666; font-size: 16px; line-height: 1.6; text-align: center;">
          Con ${gems} GEMME hai sbloccato il prestigioso livello <strong style="color: ${level.primary_color || '#6366f1'};">${level.name}</strong>!
          Continua così per sbloccare premi ancora più esclusivi.
        </p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: ${level.primary_color || '#6366f1'}; margin-top: 0; text-align: center;">I tuoi vantaggi ${level.name}:</h3>
          <ul style="color: #666; line-height: 1.8; text-align: center; list-style: none; padding: 0;">
            <li style="margin: 10px 0;">✨ Accesso a premi esclusivi del livello ${level.name}</li>
            <li style="margin: 10px 0;">🎁 Offerte personalizzate riservate</li>
            <li style="margin: 10px 0;">⭐ Priorità nelle promozioni speciali</li>
            ${level.max_gems ? `<li style="margin: 10px 0;">🚀 A ${level.max_gems + 1} GEMME sblocchi il livello successivo!</li>` : '<li style="margin: 10px 0;">👑 Hai raggiunto il livello massimo!</li>'}
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${window.location.origin}" style="background: linear-gradient(135deg, ${level.primary_color || '#6366f1'} 0%, #1e293b 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">Scopri i tuoi premi!</a>
        </div>
        
        <p style="color: #999; font-size: 14px; text-align: center;">
          Grazie per essere un cliente ${level.name} di Sapori & Colori!<br>
          Via Example 123, Roma • Tel: 06 1234567
        </p>
      </div>
    </div>
  `

  return { subject, html }
}

/**
 * Verifica se esistono livelli successivi per motivare il cliente
 * @param {number} currentGems - GEMME attuali
 * @param {Array} levels - Livelli configurati
 * @returns {Object|null} Informazioni sul prossimo livello
 */
export const getNextLevelForMotivation = (currentGems, levels) => {
  if (!levels || levels.length === 0) return null

  // Trova il prossimo livello
  const nextLevel = levels.find(level => level.min_gems > currentGems)
  
  if (nextLevel) {
    return {
      nextLevel,
      gemsNeeded: nextLevel.min_gems - currentGems,
      progressPercentage: Math.round((currentGems / nextLevel.min_gems) * 100)
    }
  }

  return null
}
