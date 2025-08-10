// API per aggiungere colonna onesignal_subscription_id
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://jexkalekaofsfcusdfjh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGthbGVrYW9mc2ZjdXNkZmpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYyNjEzNCwiZXhwIjoyMDY0MjAyMTM0fQ.43plaZecrTvbwkr7U7g2Ucogkd0VgKRUg9VkJ--7JCU'
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🔧 Aggiunta colonna onesignal_subscription_id...')

    // Controlla se la colonna esiste già
    const { data: columns } = await supabase
      .rpc('get_table_columns', { table_name: 'customers' })

    const hasColumn = columns?.some(col => col.column_name === 'onesignal_subscription_id')
    
    if (hasColumn) {
      console.log('✅ Colonna onesignal_subscription_id già presente')
      return res.status(200).json({
        success: true,
        message: 'Colonna già esistente',
        alreadyExists: true
      })
    }

    // Aggiunge la colonna
    const { error: alterError } = await supabase
      .rpc('exec_sql', { 
        sql: 'ALTER TABLE customers ADD COLUMN onesignal_subscription_id TEXT;'
      })

    if (alterError) {
      throw new Error(`Errore aggiunta colonna: ${alterError.message}`)
    }

    console.log('✅ Colonna onesignal_subscription_id aggiunta con successo')

    return res.status(200).json({
      success: true,
      message: 'Colonna onesignal_subscription_id aggiunta al database'
    })

  } catch (error) {
    console.error('❌ Errore migrazione database:', error)
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}