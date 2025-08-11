import { createClient } from '@supabase/supabase-js'
import { inflate } from 'pako'

const supabase = createClient(
  'https://jexkalekaofsfcusdfjh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGthbGVrYW9mc2ZjdXNkZmpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYyNjEzNCwiZXhwIjoyMDY0MjAyMTM0fQ.43plaZecrTvbwkr7U7g2Ucogkd0VgKRUg9VkJ--7JCU'
)

// OneSignal API configuration (stesso di send-notification.js)
const ONESIGNAL_CONFIG = {
  appId: '61a2318f-68f7-4a79-8beb-203c58bf8763',
  restApiKey: 'os_v2_app_mgrddd3i65fhtc7lea6frp4hmncfypt3q7mugmfh4hi67xyyoz3emmmkj5zd7hwbgt7qwkoxxyavzlux76q47oot2e5e6qieftmnf4a'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    console.log('🔄 Avvio sincronizzazione OneSignal subscriptions...')
    
    // 1. Ottieni tutti i clienti dal database
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, name, email, onesignal_player_id, onesignal_subscription_id')
      .eq('is_active', true)
    
    if (customersError) {
      throw new Error(`Errore caricamento clienti: ${customersError.message}`)
    }
    
    console.log(`📊 Trovati ${customers.length} clienti attivi`)
    
    // 2. Ottieni tutti i subscription tramite CSV export API (endpoint corretto!)
    console.log('📱 Recuperando subscriptions da OneSignal via CSV export...')
    
    const exportResponse = await fetch(`https://api.onesignal.com/players/csv_export?app_id=${ONESIGNAL_CONFIG.appId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${ONESIGNAL_CONFIG.restApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        extra_fields: [
          'external_user_id',
          'onesignal_id',
          'country',
          'timezone_id'
        ]
      })
    })
    
    console.log('📱 OneSignal CSV Export Response Status:', exportResponse.status)
    console.log('📱 OneSignal CSV Export Response Headers:', Object.fromEntries(exportResponse.headers.entries()))
    
    if (!exportResponse.ok) {
      const errorText = await exportResponse.text()
      console.error('📱 OneSignal CSV Export Error Response:', errorText)
      throw new Error(`OneSignal CSV Export error: ${exportResponse.status} - ${errorText}`)
    }
    
    // Controlla il content-type prima di fare .json()
    const contentType = exportResponse.headers.get('content-type')
    console.log('📱 Response Content-Type:', contentType)
    
    let exportData
    if (contentType && contentType.includes('application/json')) {
      exportData = await exportResponse.json()
    } else {
      const responseText = await exportResponse.text()
      console.log('📱 Non-JSON Response:', responseText.substring(0, 200))
      throw new Error(`OneSignal API returned non-JSON response: ${contentType}`)
    }
    console.log('📱 OneSignal CSV export URL:', exportData.csv_file_url)
    
    // Scarica il file .gz compresso
    const csvResponse = await fetch(exportData.csv_file_url)
    if (!csvResponse.ok) {
      throw new Error(`Errore download CSV: ${csvResponse.status}`)
    }
    
    // Scarica come Buffer per la decompressione
    const gzippedBuffer = Buffer.from(await csvResponse.arrayBuffer())
    console.log(`📱 File .gz scaricato: ${gzippedBuffer.length} bytes`)
    
    // Decomprimi il file .gz usando pako
    const decompressedData = inflate(gzippedBuffer)
    const csvText = new TextDecoder().decode(decompressedData)
    console.log(`📱 CSV decompresso: ${csvText.length} caratteri`)
    
    // Parse CSV (primo parsing semplice per vedere struttura)
    const lines = csvText.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''))
    
    console.log('📱 CSV Headers:', headers)
    console.log('📱 Numero righe CSV:', lines.length - 1)
    
    // Trova l'indice delle colonne che ci interessano
    const idIndex = headers.findIndex(h => h.includes('id') || h.includes('subscription'))
    const externalIdIndex = headers.findIndex(h => h.includes('external'))
    
    console.log('📱 Colonna ID:', idIndex >= 0 ? headers[idIndex] : 'Non trovata')
    console.log('📱 Colonna External ID:', externalIdIndex >= 0 ? headers[externalIdIndex] : 'Non trovata')
    
    // Parsa tutte le righe del CSV in oggetti strutturati
    const subscriptions = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, ''))
      const subscription = {}
      headers.forEach((header, index) => {
        subscription[header] = values[index] || ''
      })
      return subscription
    })
    
    console.log(`📱 Processate ${subscriptions.length} subscription da OneSignal CSV`)
    
    // Per debug, mostra le prime 3 righe
    const sampleRows = subscriptions.slice(0, 3)
    
    let synced = 0
    let notFound = 0
    let errors = 0
    let foundSubscriptions = []
    let savedToTable = 0
    
    // 3. Per ogni subscription, cerca il cliente corrispondente e salva nella tabella
    for (const subscription of subscriptions) {
      try {
        // Salva nella tabella onesignal_subscriptions
        const subscriptionData = {
          subscription_id: subscription.id || subscription.subscription_id,
          onesignal_user_id: subscription.onesignal_id || subscription.user_id,
          external_user_id: subscription.external_user_id || subscription.external_id,
          device_type: subscription.device_type,
          device_model: subscription.device_model,
          device_os: subscription.device_os,
          app_version: subscription.app_version,
          country: subscription.country,
          timezone_id: subscription.timezone_id,
          language: subscription.language,
          notification_types: subscription.notification_types ? parseInt(subscription.notification_types) : null,
          first_session: subscription.first_session ? new Date(subscription.first_session) : null,
          last_session: subscription.last_session ? new Date(subscription.last_session) : null,
          created_at: subscription.created_at ? new Date(subscription.created_at) : null,
          is_active: subscription.invalid_identifier !== 'true'
        }
        
        // Trova customer collegato per external_user_id
        if (subscription.external_user_id) {
          const matchingCustomer = customers.find(c => c.id === subscription.external_user_id)
          if (matchingCustomer) {
            subscriptionData.customer_id = matchingCustomer.id
            
            // Aggiorna anche il customer con subscription_id
            const { error: updateError } = await supabase
              .from('customers')
              .update({ 
                onesignal_subscription_id: subscription.id || subscription.subscription_id,
                onesignal_player_id: subscription.onesignal_id || subscription.user_id
              })
              .eq('id', matchingCustomer.id)
            
            if (!updateError) {
              foundSubscriptions.push({
                customer: matchingCustomer.name,
                subscriptionId: subscription.id || subscription.subscription_id,
                external_id: subscription.external_user_id,
                linked: true
              })
              synced++
            } else {
              console.error(`❌ Errore update customer ${matchingCustomer.name}:`, updateError)
              errors++
            }
          }
        }
        
        // Salva subscription nella tabella dedicata
        const { error: insertError } = await supabase
          .from('onesignal_subscriptions')
          .upsert(subscriptionData, { 
            onConflict: 'subscription_id',
            ignoreDuplicates: false 
          })
        
        if (!insertError) {
          savedToTable++
        } else {
          console.error(`❌ Errore salvataggio subscription:`, insertError)
          errors++
        }
        
      } catch (subscriptionError) {
        console.error(`❌ Errore elaborazione subscription:`, subscriptionError)
        errors++
      }
    }
    
    // Conta clienti non trovati
    notFound = customers.length - synced
    
    const results = {
      total: customers.length,
      synced,
      notFound,
      errors,
      subscriptionsFound: subscriptions.length,
      savedToTable,
      foundSubscriptions: foundSubscriptions.slice(0, 10), // Solo primi 10 per debug
      sampleRows: sampleRows.slice(0, 3) // Per debug
    }
    
    console.log('📊 Risultati sincronizzazione completa:', results)
    
    res.json({
      success: true,
      message: `Sincronizzazione completata: ${synced} clienti collegati, ${savedToTable} subscription salvate, ${notFound} non trovati, ${errors} errori`,
      ...results
    })
    
  } catch (error) {
    console.error('❌ Errore sincronizzazione OneSignal:', error)
    res.status(500).json({ 
      error: error.message,
      success: false
    })
  }
}