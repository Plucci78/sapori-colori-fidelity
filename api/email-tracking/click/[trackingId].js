// API endpoint per tracking click sui link
// /api/email-tracking/click/[trackingId].js

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const { trackingId } = req.query

  try {
    // Decodifica il tracking ID
    const decodedData = atob(trackingId)
    const [emailLogId, customerEmail, originalUrl] = decodedData.split(':')

    // Ottieni info sulla richiesta
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown'
    const userAgent = req.headers['user-agent'] || 'unknown'

    console.log('🖱️ Tracking click link:', {
      emailLogId,
      customerEmail,
      originalUrl,
      ipAddress,
      userAgent: userAgent.substring(0, 100)
    })

    // Registra il click (permettiamo duplicati per i click)
    const { error: insertError } = await supabase
      .from('email_clicks')
      .insert([{
        email_log_id: emailLogId,
        customer_email: customerEmail,
        clicked_url: originalUrl,
        ip_address: ipAddress,
        user_agent: userAgent
      }])

    if (insertError) {
      console.error('❌ Errore inserimento click:', insertError)
    } else {
      console.log('✅ Click email registrato:', customerEmail, originalUrl)
    }

    // Redirect all'URL originale
    res.redirect(302, originalUrl)

  } catch (error) {
    console.error('❌ Errore tracking click:', error)
    
    // In caso di errore, prova comunque a estrarre l'URL e fare redirect
    try {
      const decodedData = atob(trackingId)
      const parts = decodedData.split(':')
      if (parts.length >= 3) {
        res.redirect(302, parts[2])
        return
      }
    } catch (decodeError) {
      console.error('❌ Errore decodifica URL:', decodeError)
    }
    
    // Fallback: redirect alla homepage
    res.redirect(302, process.env.NEXT_PUBLIC_SITE_URL || 'https://saporiecolori.net')
  }
}