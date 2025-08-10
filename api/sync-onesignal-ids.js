// API per sincronizzare OneSignal User IDs esistenti con Subscription IDs
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
    const ONESIGNAL_CONFIG = {
      appId: '61a2318f-68f7-4a79-8beb-203c58bf8763',
      restApiKey: 'os_v2_app_mgrddd3i65fhtc7lea6frp4hmncfypt3q7mugmfh4hi67xyyoz3emmmkj5zd7hwbgt7qwkoxxyavzlux76q47oot2e5e6qieftmnf4a'
    }

    console.log('🔄 Avvio sincronizzazione OneSignal IDs...')

    // Prima aggiungi la colonna se non esiste
    try {
      await supabase.rpc('exec_sql', { 
        sql: 'ALTER TABLE customers ADD COLUMN IF NOT EXISTS onesignal_subscription_id TEXT;'
      })
      console.log('✅ Colonna onesignal_subscription_id verificata/aggiunta')
    } catch (error) {
      console.log('⚠️ Colonna probabilmente già esistente:', error.message)
    }

    // Trova tutti i clienti con onesignal_player_id ma senza onesignal_subscription_id
    const { data: customers, error: fetchError } = await supabase
      .from('customers')
      .select('id, name, onesignal_player_id, onesignal_subscription_id')
      .not('onesignal_player_id', 'is', null)
      .is('onesignal_subscription_id', null)
      .eq('is_active', true)

    if (fetchError) {
      throw new Error(`Errore fetch clienti: ${fetchError.message}`)
    }

    console.log(`📋 Trovati ${customers.length} clienti da sincronizzare`)

    const results = {
      processed: 0,
      updated: 0,
      errors: 0,
      details: []
    }

    // Per ogni cliente, cerca il Subscription ID corrispondente
    for (const customer of customers) {
      const oneSignalUserId = customer.onesignal_player_id
      
      try {
        console.log(`🔍 Elaboro cliente ${customer.name} (OneSignal ID: ${oneSignalUserId})`)

        // Prova a ottenere l'utente OneSignal e i suoi subscription
        const userResponse = await fetch(`https://api.onesignal.com/apps/${ONESIGNAL_CONFIG.appId}/users/by/onesignal_id/${oneSignalUserId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${ONESIGNAL_CONFIG.restApiKey}`,
            'Accept': 'application/json'
          }
        })

        if (userResponse.ok) {
          const userData = await userResponse.json()
          console.log(`📱 Dati utente OneSignal:`, userData)
          
          // Cerca push subscription attiva
          const pushSubscription = userData.subscriptions?.find(sub => 
            (sub.type === 'iOSPush' || sub.type === 'AndroidPush' || sub.type === 'WebPush') && 
            sub.enabled === true
          )

          if (pushSubscription && pushSubscription.id) {
            console.log(`✨ Trovato Subscription ID per ${customer.name}: ${pushSubscription.id}`)
            
            // Aggiorna nel database
            const { error: updateError } = await supabase
              .from('customers')
              .update({ onesignal_subscription_id: pushSubscription.id })
              .eq('id', customer.id)

            if (updateError) {
              console.error(`❌ Errore aggiornamento ${customer.name}:`, updateError)
              results.errors++
              results.details.push({
                customer: customer.name,
                oneSignalUserId,
                status: 'error',
                error: updateError.message
              })
            } else {
              console.log(`✅ Sincronizzato ${customer.name}: ${pushSubscription.id}`)
              results.updated++
              results.details.push({
                customer: customer.name,
                oneSignalUserId,
                subscriptionId: pushSubscription.id,
                status: 'updated',
                subscriptionType: pushSubscription.type
              })
            }
          } else {
            console.log(`⚠️ Nessun push subscription attivo trovato per ${customer.name}`)
            results.details.push({
              customer: customer.name,
              oneSignalUserId,
              status: 'no_active_subscription',
              availableSubscriptions: userData.subscriptions?.map(s => s.type) || []
            })
          }
        } else {
          const errorData = await userResponse.text()
          console.log(`❌ Utente OneSignal non trovato per ${customer.name}:`, errorData)
          results.details.push({
            customer: customer.name,
            oneSignalUserId,
            status: 'user_not_found',
            error: errorData
          })
        }

        results.processed++

      } catch (error) {
        console.error(`❌ Errore elaborazione ${customer.name}:`, error)
        results.errors++
        results.details.push({
          customer: customer.name,
          oneSignalUserId,
          status: 'error',
          error: error.message
        })
      }

      // Pausa per evitare rate limiting OneSignal
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    console.log('📊 Risultati sincronizzazione:', results)

    return res.status(200).json({
      success: true,
      message: `Sincronizzazione completata: ${results.updated} aggiornati, ${results.errors} errori su ${results.processed} elaborati`,
      results
    })

  } catch (error) {
    console.error('❌ Errore sincronizzazione:', error)
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    })
  }
}