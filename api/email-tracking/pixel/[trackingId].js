// API endpoint per tracking aperture email
// /api/email-tracking/pixel/[trackingId].js

import { createClient } from '@supabase/supabase-js'

// Verifica variabili ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variabili ambiente Supabase mancanti')
}

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req, res) {
  // SUPER DEBUG LOG
  console.log('🔥🔥 TRACKING PIXEL ENDPOINT INVOCATO 🔥🔥');
  console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✅ Trovata' : '❌ MANCANTE');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Trovata' : '❌ MANCANTE');
  
  const { trackingId } = req.query

  try {
    // Decodifica il tracking ID (usa Buffer invece di atob)
    const decodedData = Buffer.from(trackingId, 'base64').toString('utf-8')
    const [emailLogId, customerEmail, timestamp] = decodedData.split(':')

    // Ottieni info sulla richiesta (usa socket invece di connection)
    const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'
    const userAgent = req.headers['user-agent'] || 'unknown'

    console.log('🔍 Tracking apertura email:', {
      trackingId,
      emailLogId,
      customerEmail,
      ipAddress,
      userAgent: userAgent.substring(0, 100) // Tronca user agent
    })

    // DEBUG: Test connessione Supabase
    console.log('🔗 Supabase URL:', supabaseUrl ? 'OK' : 'MANCANTE')
    console.log('🔑 Supabase Key:', supabaseKey ? 'OK' : 'MANCANTE')

    // Verifica se l'apertura è già stata registrata (evita duplicati)
    const { data: existingOpen } = await supabase
      .from('email_opens')
      .select('id')
      .eq('email_log_id', emailLogId)
      .eq('customer_email', customerEmail)
      .single()

    if (!existingOpen) {
      // Registra l'apertura
      console.log('📝 Tentativo inserimento in email_opens...')
      
      const { data: insertData, error: insertError } = await supabase
        .from('email_opens')
        .insert([{
          email_log_id: emailLogId,
          customer_email: customerEmail,
          ip_address: ipAddress,
          user_agent: userAgent
        }])
        .select()

      if (insertError) {
        console.error('❌ Errore inserimento apertura:', insertError)
        console.error('❌ Dettagli errore:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint
        })
      } else {
        console.log('✅ Apertura email registrata:', customerEmail)
        console.log('📊 Dati inseriti:', insertData)
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