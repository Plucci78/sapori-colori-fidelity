// Consolidated email tracking API
// Handles both pixel tracking and click tracking
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variabili ambiente Supabase mancanti')
}

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req, res) {
  const { action, trackingId } = req.query
  
  console.log('🔥 EMAIL TRACKING API:', { action, trackingId })
  
  try {
    // Decodifica il tracking ID
    const decodedData = Buffer.from(trackingId, 'base64').toString('utf-8')
    const [emailLogId, customerEmail, timestamp] = decodedData.split(':')
    
    const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'
    const userAgent = req.headers['user-agent'] || 'unknown'
    
    console.log('🔍 Tracking data:', { 
      emailLogId, 
      customerEmail, 
      ipAddress,
      userAgent: userAgent.substring(0, 150)
    })
    
    if (action === 'pixel') {
      // Pixel tracking for email opens - verifica se questa specifica email è già stata aperta
      const { data: existingOpen } = await supabase
        .from('email_opens')
        .select('id')
        .eq('email_log_id', parseInt(emailLogId) || null)
        .eq('customer_email', customerEmail)
        .single()

      if (!existingOpen) {
        const { error: insertError } = await supabase
          .from('email_opens')
          .insert([{
            email_log_id: parseInt(emailLogId) || null,
            customer_email: customerEmail,
            ip_address: ipAddress,
            user_agent: userAgent
          }])

        if (insertError) {
          console.error('❌ Errore inserimento apertura:', insertError)
        } else {
          console.log('✅ Apertura registrata:', customerEmail, 'per emailLogId:', emailLogId)
        }
      } else {
        console.log('ℹ️ Apertura già registrata per:', customerEmail, 'emailLogId:', emailLogId)
      }
      
      // Return 1x1 transparent pixel
      const pixelBuffer = Buffer.from([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00,
        0xFF, 0xFF, 0xFF, 0x21, 0xF9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3B
      ])
      
      res.setHeader('Content-Type', 'image/gif')
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      res.status(200).send(pixelBuffer)
      
    } else if (action === 'click') {
      // Click tracking for email links
      const { redirectUrl } = req.query
      
      const { error: insertError } = await supabase
        .from('email_clicks')
        .insert([{
          email_log_id: parseInt(emailLogId) || null,
          customer_email: customerEmail,
          clicked_url: redirectUrl,
          ip_address: ipAddress,
          user_agent: userAgent
        }])

      if (insertError) {
        console.error('❌ Errore inserimento click:', insertError)
      } else {
        console.log('✅ Click registrato:', customerEmail)
      }
      
      // Redirect to the actual URL
      if (redirectUrl) {
        res.redirect(302, redirectUrl)
      } else {
        res.status(400).json({ error: 'Missing redirectUrl' })
      }
    } else {
      res.status(400).json({ error: 'Invalid action. Use: pixel or click' })
    }
    
  } catch (error) {
    console.error('❌ Errore tracking:', error)
    
    if (action === 'pixel') {
      // Always return pixel even on error
      const pixelBuffer = Buffer.from([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00,
        0xFF, 0xFF, 0xFF, 0x21, 0xF9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3B
      ])
      res.setHeader('Content-Type', 'image/gif')
      res.status(200).send(pixelBuffer)
    } else {
      res.status(500).json({ error: 'Tracking failed' })
    }
  }
}