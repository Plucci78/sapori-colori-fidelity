// API Route per verificare e ri-registrare Player ID OneSignal
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { createClient } = await import('@supabase/supabase-js')
    
    const supabase = createClient(
      'https://jexkalekaofsfcusdfjh.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGthbGVrYW9mc2ZjdXNkZmpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYyNjEzNCwiZXhwIjoyMDY0MjAyMTM0fQ.43plaZecrTvbwkr7U7g2Ucogkd0VgKRUg9VkJ--7JCU'
    )

    // OneSignal API configuration
    const ONESIGNAL_CONFIG = {
      appId: '61a2318f-68f7-4a79-8beb-203c58bf8763',
      restApiKey: 'os_v2_app_mgrddd3i65fhtc7lea6frp4hmncfypt3q7mugmfh4hi67xyyoz3emmmkj5zd7hwbgt7qwkoxxyavzlux76q47oot2e5e6qieftmnf4a'
    }

    console.log('🔧 Verifica Player IDs...')

    // Ottieni tutti i clienti con Player ID
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, name, email, phone, points, onesignal_player_id')
      .not('onesignal_player_id', 'is', null)

    if (error) {
      console.error('❌ Errore database:', error)
      return res.status(500).json({ error: error.message })
    }

    console.log(`📊 Trovati ${customers.length} clienti con Player ID`)
    
    // DEBUG: Mostra tutti i Player ID trovati
    customers.forEach(c => {
      console.log(`🔍 Cliente: ${c.name} - Player ID: ${c.onesignal_player_id}`)
    })

    if (customers.length === 0) {
      console.log('⚠️ Nessun cliente con Player ID trovato')
      return res.status(200).json({ 
        success: true,
        results: {
          total: 0,
          verified: [],
          invalid: [],
          reregistered: []
        }
      })
    }

    const results = {
      total: customers.length,
      verified: [],
      invalid: [],
      reregistered: []
    }

    // Verifica ogni Player ID con OneSignal
    for (const customer of customers) {
      try {
        console.log(`🔍 Verifico Player ID per ${customer.name}: ${customer.onesignal_player_id}`)

        // Verifica se il Player ID exists su OneSignal
        const checkUrl = `https://onesignal.com/api/v1/players/${customer.onesignal_player_id}?app_id=${ONESIGNAL_CONFIG.appId}`
        console.log(`🌐 Chiamata OneSignal: ${checkUrl}`)
        
        const checkResponse = await fetch(checkUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${ONESIGNAL_CONFIG.restApiKey}`,
            'Accept': 'application/json'
          }
        })

        console.log(`📡 OneSignal response status: ${checkResponse.status}`)
        
        if (checkResponse.ok) {
          const playerData = await checkResponse.json()
          console.log(`✅ Player data:`, playerData)
          console.log(`✅ Player ID valido: ${customer.name}`)
          results.verified.push({
            name: customer.name,
            playerId: customer.onesignal_player_id
          })
        } else {
          const errorData = await checkResponse.text()
          console.log(`❌ Player ID invalido: ${customer.name} - Status: ${checkResponse.status}`)
          console.log(`❌ Error response: ${errorData}`)
          results.invalid.push({
            name: customer.name,
            playerId: customer.onesignal_player_id,
            error: `${checkResponse.status}: ${errorData}`
          })

          // Tenta di ri-registrare il Player ID
          const playerData = {
            app_id: ONESIGNAL_CONFIG.appId,
            device_type: 5, // Web Push
            id: customer.onesignal_player_id,
            notification_types: 1,
            tags: {
              customer_id: customer.id,
              customer_name: customer.name,
              customer_email: customer.email || '',
              customer_phone: customer.phone || '',
              customer_points: customer.points || 0,
              registration_date: new Date().toISOString()
            }
          }

          const reregisterResponse = await fetch('https://onesignal.com/api/v1/players', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${ONESIGNAL_CONFIG.restApiKey}`,
              'Accept': 'application/json'
            },
            body: JSON.stringify(playerData)
          })

          if (reregisterResponse.ok || reregisterResponse.status === 409) {
            console.log(`✅ Player ri-registrato: ${customer.name}`)
            results.reregistered.push({
              name: customer.name,
              playerId: customer.onesignal_player_id
            })
          } else {
            console.log(`❌ Errore ri-registrazione: ${customer.name}`)
          }
        }

        // Pausa tra le chiamate per non sovraccaricare l'API
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`❌ Errore verifica ${customer.name}:`, error)
        results.invalid.push({
          name: customer.name,
          playerId: customer.onesignal_player_id,
          error: error.message
        })
      }
    }

    console.log('📊 Risultati verifica:', results)
    
    return res.status(200).json({ 
      success: true,
      results
    })

  } catch (error) {
    console.error('❌ Errore server verify players:', error)
    return res.status(500).json({ error: 'Errore interno del server' })
  }
}