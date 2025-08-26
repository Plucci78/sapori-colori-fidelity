// Debug endpoint per vedere cosa succede nel tracking
import { createClient } from '@supabase/supabase-js'

// Verifica variabili ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req, res) {
  const logs = []
  
  try {
    logs.push('🔍 Starting debug tracking test...')
    
    // Test connessione
    logs.push(`🔗 Supabase URL: ${supabaseUrl ? 'OK' : 'MISSING'}`)
    logs.push(`🔑 Supabase Key: ${supabaseKey ? 'OK' : 'MISSING'}`)
    
    // Test trackingId
    const trackingId = 'dGVzdDp0ZXN0QHRlc3QuY29tOjE3MzUzNDAwMDA='
    const decodedData = Buffer.from(trackingId, 'base64').toString('utf-8')
    const [emailLogId, customerEmail, timestamp] = decodedData.split(':')
    
    logs.push(`📊 Decoded: emailLogId=${emailLogId}, email=${customerEmail}`)
    
    // Test tabella esiste
    logs.push('📋 Testing table existence...')
    const { data: tableTest, error: tableError } = await supabase
      .from('email_opens')
      .select('id')
      .limit(1)
    
    if (tableError) {
      logs.push(`❌ Table error: ${tableError.message}`)
    } else {
      logs.push(`✅ Table exists, found ${tableTest?.length || 0} records`)
    }
    
    // Test inserimento
    logs.push('📝 Testing insert...')
    const { data: insertData, error: insertError } = await supabase
      .from('email_opens')
      .insert([{
        email_log_id: parseInt(emailLogId) || null,
        customer_email: customerEmail,
        ip_address: 'debug-test',
        user_agent: 'debug-agent'
      }])
      .select()
    
    if (insertError) {
      logs.push(`❌ Insert error: ${insertError.message}`)
      logs.push(`❌ Error code: ${insertError.code}`)
      logs.push(`❌ Error details: ${insertError.details}`)
      logs.push(`❌ Error hint: ${insertError.hint}`)
    } else {
      logs.push(`✅ Insert successful: ${JSON.stringify(insertData)}`)
    }
    
  } catch (error) {
    logs.push(`💥 Catch error: ${error.message}`)
  }
  
  // Ritorna i log come JSON
  res.status(200).json({
    success: true,
    logs: logs,
    timestamp: new Date().toISOString()
  })
}