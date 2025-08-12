// API Route per inviare notifiche OneSignal con storico completo
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://jexkalekaofsfcusdfjh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGthbGVrYW9mc2ZjdXNkZmpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYyNjEzNCwiZXhwIjoyMDY0MjAyMTM0fQ.43plaZecrTvbwkr7U7g2Ucogkd0VgKRUg9VkJ--7JCU'
)

export default async function handler(req, res) {
  // Solo metodo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { title, message, playerIds, url, imageUrl, targetType, targetValue, sentBy } = req.body

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
      include_subscription_ids: playerIds, // Usato per OneSignal SDK v16 Subscription IDs
      target_channel: "push"
    }

    // Aggiungi URL se fornito
    if (url) {
      notificationData.url = url
    }

    // Aggiungi immagine rich se fornita (OneSignal AI guidelines)
    if (imageUrl) {
      // Verifica che sia HTTPS
      if (imageUrl.startsWith('https://')) {
        notificationData.big_picture = imageUrl // Android
        notificationData.chrome_web_image = imageUrl // iOS Safari + Chrome Web (PRIMARIO!)
        // Rimosso ios_attachments che non funziona per web push
        console.log('🖼️ Aggiunta immagine rich HTTPS alla notifica:', imageUrl)
      } else {
        console.warn('⚠️ Immagine non HTTPS, saltata:', imageUrl)
      }
    }

    // Chiamata API OneSignal v2 dal server
    console.log('🔧 Invio notifica OneSignal v2:', { appId: ONESIGNAL_CONFIG.appId, subscriptionIds: playerIds })
    console.log('📋 Payload completo OneSignal:', JSON.stringify(notificationData, null, 2))
    
    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_CONFIG.restApiKey}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(notificationData)
    })
    
    console.log('📡 OneSignal response status:', response.status)

    const result = await response.json()
    console.log('📋 OneSignal response completa:', JSON.stringify(result, null, 2))

    if (response.ok && result.id) {
      console.log('✅ Notifica inviata con successo:', result.id)
      
      // 📊 SALVA NELLO STORICO PROFESSIONALE
      try {
        const { error: historyError } = await supabase
          .from('notification_history')
          .insert({
            title,
            message,
            target_type: targetType || 'manual',
            target_value: targetValue || null,
            recipients_count: playerIds.length,
            onesignal_notification_id: result.id,
            subscription_ids: playerIds,
            url: url || null,
            sent_by: sentBy || 'Dashboard',
            delivered_count: result.recipients || playerIds.length,
            status: 'sent'
          })

        if (historyError) {
          console.error('⚠️ Errore salvataggio storico:', historyError)
          // Non bloccare la risposta, la notifica è stata inviata
        } else {
          console.log('📊 Notifica salvata nello storico')
        }
      } catch (historyErr) {
        console.error('⚠️ Errore storico:', historyErr)
      }
      
      return res.status(200).json({
        success: true,
        notificationId: result.id,
        recipients: result.recipients || playerIds.length
      })
    } else {
      console.error('❌ Errore invio notifica OneSignal:', result)
      
      // Gestisci errors che potrebbero non essere un array
      let errorMessage = 'Errore sconosciuto'
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
    console.error('❌ Errore server notifiche:', error)
    console.error('❌ Stack trace:', error.stack)
    return res.status(500).json({
      success: false,
      error: `Errore server: ${error.message}`,
      stack: error.stack
    })
  }
}