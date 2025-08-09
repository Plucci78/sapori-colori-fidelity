// API per verificare collegamento OneSignal <-> Customer database
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
    const { subscriptionId, externalId } = req.body

    console.log('🔍 Verifica collegamento:', { subscriptionId, externalId })

    // 1. Cerca customer con Subscription ID
    const { data: customerBySubscription } = await supabase
      .from('customers')
      .select('*')
      .eq('onesignal_player_id', subscriptionId)
      .single()

    // 2. Cerca customer con External ID (se fornito)
    let customerByExternal = null
    if (externalId) {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('id', externalId)
        .single()
      customerByExternal = data
    }

    // 3. Verifica OneSignal Player/User details tramite API
    const ONESIGNAL_CONFIG = {
      appId: '61a2318f-68f7-4a79-8beb-203c58bf8763',
      restApiKey: 'os_v2_app_mgrddd3i65fhtc7lea6frp4hmncfypt3q7mugmfh4hi67xyyoz3emmmkj5zd7hwbgt7qwkoxxyavzlux76q47oot2e5e6qieftmnf4a'
    }

    let oneSignalUser = null
    try {
      // Prova a ottenere info utente da OneSignal usando l'External ID
      if (externalId) {
        const userResponse = await fetch(`https://api.onesignal.com/apps/${ONESIGNAL_CONFIG.appId}/users/by/external_id/${externalId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${ONESIGNAL_CONFIG.restApiKey}`,
            'Accept': 'application/json'
          }
        })

        if (userResponse.ok) {
          oneSignalUser = await userResponse.json()
        }
      }
    } catch (error) {
      console.log('⚠️ Non è stato possibile recuperare dati OneSignal:', error.message)
    }

    // 4. Risultato analisi
    const result = {
      subscriptionId,
      externalId,
      database: {
        foundBySubscriptionId: !!customerBySubscription,
        foundByExternalId: !!customerByExternal,
        customerBySubscription: customerBySubscription || null,
        customerByExternal: customerByExternal || null,
        match: customerBySubscription?.id === customerByExternal?.id
      },
      oneSignal: {
        userFound: !!oneSignalUser,
        userData: oneSignalUser || null
      },
      analysis: {
        isLinked: !!customerBySubscription && !!customerByExternal && customerBySubscription.id === customerByExternal.id,
        issues: []
      }
    }

    // Aggiungi problemi identificati
    if (!customerBySubscription) {
      result.analysis.issues.push('Subscription ID non trovato nel database')
    }
    if (externalId && !customerByExternal) {
      result.analysis.issues.push('External ID non corrisponde a nessun customer')
    }
    if (customerBySubscription && customerByExternal && customerBySubscription.id !== customerByExternal.id) {
      result.analysis.issues.push('Subscription ID e External ID puntano a customer diversi')
    }
    if (!oneSignalUser && externalId) {
      result.analysis.issues.push('External ID non trovato su OneSignal')
    }

    return res.status(200).json(result)

  } catch (error) {
    console.error('❌ Errore verifica collegamento:', error)
    return res.status(500).json({
      error: error.message,
      stack: error.stack
    })
  }
}