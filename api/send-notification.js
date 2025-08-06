// API Route per inviare notifiche OneSignal (Vercel Serverless)
export default async function handler(req, res) {
  // Solo metodo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { title, message, playerIds, url } = req.body

    // Validazione
    if (!title || !message || !playerIds || !Array.isArray(playerIds)) {
      return res.status(400).json({ 
        error: 'Missing required fields: title, message, playerIds' 
      })
    }

    // OneSignal API configuration
    const ONESIGNAL_CONFIG = {
      appId: '61a2318f-68f7-4a79-8beb-203c58bf8763',
      restApiKey: 'os_v2_app_mgrddd3i65fhtc7lea6frp4hmncfypt3q7mugmfh4hi67xyyoz3emmmkj5zd7hwbgt7qwkoxxyavzlux76q47oot2e5e6qieftmnf4a'
    }

    const notificationData = {
      app_id: ONESIGNAL_CONFIG.appId,
      headings: { en: title, it: title },
      contents: { en: message, it: message },
      include_player_ids: playerIds
    }

    // Aggiungi URL se fornito
    if (url) {
      notificationData.url = url
    }

    // Chiamata API OneSignal dal server
    console.log('🔧 Invio notifica OneSignal:', { appId: ONESIGNAL_CONFIG.appId, playerIds })
    
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ONESIGNAL_CONFIG.restApiKey}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(notificationData)
    })
    
    console.log('📡 OneSignal response status:', response.status)

    const result = await response.json()

    if (response.ok && result.id) {
      console.log('✅ Notifica inviata con successo:', result.id)
      return res.status(200).json({
        success: true,
        notificationId: result.id,
        recipients: result.recipients || playerIds.length
      })
    } else {
      console.error('❌ Errore invio notifica OneSignal:', result)
      return res.status(500).json({
        success: false,
        error: result.errors ? result.errors.join(', ') : 'Errore sconosciuto'
      })
    }

  } catch (error) {
    console.error('❌ Errore server notifiche:', error)
    return res.status(500).json({
      success: false,
      error: 'Errore interno del server'
    })
  }
}