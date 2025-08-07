// API Route per creare player OneSignal (Vercel Serverless)
export default async function handler(req, res) {
  // Solo metodo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { subscription, customerData } = req.body

    // Validazione
    if (!subscription || !customerData) {
      return res.status(400).json({ 
        error: 'Missing required fields: subscription, customerData' 
      })
    }

    // OneSignal API configuration
    const ONESIGNAL_CONFIG = {
      appId: '61a2318f-68f7-4a79-8beb-203c58bf8763',
      restApiKey: 'os_v2_app_mgrddd3i65fhtc7lea6frp4hmncfypt3q7mugmfh4hi67xyyoz3emmmkj5zd7hwbgt7qwkoxxyavzlux76q47oot2e5e6qieftmnf4a'
    }

    // Crea player su OneSignal con formato corretto per Web Push
    const playerData = {
      app_id: ONESIGNAL_CONFIG.appId,
      device_type: 5, // Web Push
      notification_types: 1,
      // Formato corretto per OneSignal Web Push  
      identifier: subscription.endpoint,
      web_auth: subscription.keys.auth,
      web_p256: subscription.keys.p256dh,
      tags: {
        customer_id: customerData.id,
        customer_name: customerData.name,
        customer_email: customerData.email || '',
        customer_phone: customerData.phone || '',
        customer_points: customerData.points || 0,
        registration_date: new Date().toISOString()
      }
    }

    console.log('🔧 Registrazione player OneSignal con subscription reale')
    console.log('📋 Dati player da inviare:', JSON.stringify(playerData, null, 2))

    // Chiamata API OneSignal per creare player
    const response = await fetch('https://onesignal.com/api/v1/players', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ONESIGNAL_CONFIG.restApiKey}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(playerData)
    })

    console.log('📡 OneSignal create player response:', response.status)
    const result = await response.json()

    if (response.ok || response.status === 409) { // 409 = already exists, è ok
      console.log('✅ Player registrato con OneSignal:', result.id)
      return res.status(200).json({
        success: true,
        playerId: result.id
      })
    } else {
      console.error('❌ Errore registrazione player:', result)
      
      // Gestisci errors che potrebbero non essere un array
      let errorMessage = 'Errore registrazione player'
      if (result.errors) {
        if (Array.isArray(result.errors)) {
          errorMessage = result.errors.join(', ')
        } else if (typeof result.errors === 'string') {
          errorMessage = result.errors
        } else {
          errorMessage = JSON.stringify(result.errors)
        }
      }
      
      return res.status(500).json({
        success: false,
        error: errorMessage
      })
    }

  } catch (error) {
    console.error('❌ Errore server create player:', error)
    return res.status(500).json({
      success: false,
      error: 'Errore interno del server'
    })
  }
}