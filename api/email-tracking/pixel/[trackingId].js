// API endpoint per tracking aperture email
// /api/email-tracking/pixel/[trackingId].js

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
    const [emailLogId, customerEmail] = decodedData.split(':')

    // Ottieni info sulla richiesta
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown'
    const userAgent = req.headers['user-agent'] || 'unknown'

    console.log('🔍 Tracking apertura email:', {
      emailLogId,
      customerEmail,
      ipAddress,
      userAgent: userAgent.substring(0, 100) // Tronca user agent
    })

    // Verifica se l'apertura è già stata registrata (evita duplicati)
    const { data: existingOpen } = await supabase
      .from('email_opens')
      .select('id')
      .eq('email_log_id', emailLogId)
      .eq('customer_email', customerEmail)
      .single()

    if (!existingOpen) {
      // Registra l'apertura
      const { error: insertError } = await supabase
        .from('email_opens')
        .insert([{
          email_log_id: emailLogId,
          customer_email: customerEmail,
          ip_address: ipAddress,
          user_agent: userAgent
        }])

      if (insertError) {
        console.error('❌ Errore inserimento apertura:', insertError)
      } else {
        console.log('✅ Apertura email registrata:', customerEmail)
      }
    } else {
      console.log('ℹ️ Apertura già registrata per:', customerEmail)
    }

    // Ritorna pixel trasparente 1x1
    const pixelBuffer = Buffer.from([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00,
      0xFF, 0xFF, 0xFF, 0x21, 0xF9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3B
    ])

    res.setHeader('Content-Type', 'image/gif')
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    res.status(200).send(pixelBuffer)

  } catch (error) {
    console.error('❌ Errore tracking apertura:', error)
    
    // Anche in caso di errore, ritorna il pixel
    const pixelBuffer = Buffer.from([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00,
      0xFF, 0xFF, 0xFF, 0x21, 0xF9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3B
    ])
    
    res.setHeader('Content-Type', 'image/gif')
    res.status(200).send(pixelBuffer)
  }
}