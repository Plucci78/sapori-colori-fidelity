import { createClient } from '@supabase/supabase-js'

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
    
    if (!exportResponse.ok) {
      throw new Error(`OneSignal CSV Export error: ${exportResponse.status} - ${await exportResponse.text()}`)
    }
    
    const exportData = await exportResponse.json()
    console.log('📱 OneSignal CSV export response:', exportData)
    
    // Per ora restituisci solo il risultato della chiamata API per debug
    res.json({
      success: true,
      message: 'CSV Export API chiamata con successo',
      exportData,
      debug: true
    })
    return
    
    let synced = 0
    let notFound = 0
    let errors = 0
    let foundSubscriptions = []
    
    // 3. Per ogni cliente, cerca il corrispondente subscription OneSignal
    for (const customer of customers) {
      try {
        // Cerca per External ID (dovrebbe essere il customer.id)
        let matchingSubscription = subscriptionsData.subscriptions?.find(sub => 
          sub.external_id === customer.id ||
          sub.external_user_id === customer.id
        )
        
        // Se non trovato per ID, prova per tags nome/email
        if (!matchingSubscription) {
          matchingSubscription = subscriptionsData.subscriptions?.find(sub => 
            sub.tags?.customer_name === customer.name ||
            sub.tags?.customer_email === customer.email ||
            (sub.tags && Object.values(sub.tags).includes(customer.name))
          )
        }
        
        if (matchingSubscription) {
          foundSubscriptions.push({
            customer: customer.name,
            subscriptionId: matchingSubscription.id,
            external_id: matchingSubscription.external_id || matchingSubscription.external_user_id,
            tags: matchingSubscription.tags
          })
          
          // Aggiorna il database solo se i dati sono diversi
          const needsUpdate = customer.onesignal_subscription_id !== matchingSubscription.id
          
          if (needsUpdate) {
            const updateData = {
              onesignal_subscription_id: matchingSubscription.id
            }
            
            // Se c'è anche OneSignal User ID nei tags, aggiornalo
            if (matchingSubscription.onesignal_user_id) {
              updateData.onesignal_player_id = matchingSubscription.onesignal_user_id
            }
            
            const { error: updateError } = await supabase
              .from('customers')
              .update(updateData)
              .eq('id', customer.id)
            
            if (updateError) {
              console.error(`❌ Errore aggiornamento ${customer.name}:`, updateError)
              errors++
            } else {
              console.log(`✅ Sincronizzato ${customer.name}: ${matchingSubscription.id}`)
              synced++
            }
          } else {
            console.log(`⚪ ${customer.name} già sincronizzato`)
          }
        } else {
          console.log(`❓ Nessuna subscription OneSignal trovata per ${customer.name}`)
          notFound++
        }
      } catch (customerError) {
        console.error(`❌ Errore elaborazione ${customer.name}:`, customerError)
        errors++
      }
    }
    
    const results = {
      total: customers.length,
      synced,
      notFound,
      errors,
      subscriptionsFound: subscriptionsData.subscriptions?.length || 0,
      foundSubscriptions: foundSubscriptions.slice(0, 10) // Solo primi 10 per debug
    }
    
    console.log('📊 Risultati sincronizzazione completa:', results)
    
    res.json({
      success: true,
      message: `Sincronizzazione completata: ${synced} aggiornati, ${notFound} non trovati, ${errors} errori`,
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