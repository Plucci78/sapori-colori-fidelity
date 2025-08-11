import { supabase } from '../src/supabase'

const ONESIGNAL_APP_ID = 'fec6e3b5-c8e9-4c96-ac42-84cac7f4b5ab'
const ONESIGNAL_API_KEY = 'OTk5NmRmNDEtNTgzMS00ZjE5LWI4M2EtYjc4ODkwYWJjZGE5' // REST API Key

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
    
    // 2. Ottieni tutti i players da OneSignal
    const playersResponse = await fetch(`https://api.onesignal.com/apps/${ONESIGNAL_APP_ID}/players`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!playersResponse.ok) {
      throw new Error(`OneSignal API error: ${playersResponse.status}`)
    }
    
    const playersData = await playersResponse.json()
    console.log(`📱 OneSignal ha ${playersData.players?.length || 0} players attivi`)
    
    let synced = 0
    let notFound = 0
    let errors = 0
    
    // 3. Per ogni cliente, cerca il corrispondente player OneSignal
    for (const customer of customers) {
      try {
        // Cerca per External ID (dovrebbe essere il customer.id)
        const matchingPlayer = playersData.players?.find(player => 
          player.external_user_id === customer.id ||
          player.tags?.customer_name === customer.name ||
          player.tags?.customer_email === customer.email
        )
        
        if (matchingPlayer) {
          // Aggiorna il database solo se i dati sono diversi
          const needsUpdate = 
            customer.onesignal_subscription_id !== matchingPlayer.id ||
            (matchingPlayer.onesignal_user_id && customer.onesignal_player_id !== matchingPlayer.onesignal_user_id)
          
          if (needsUpdate) {
            const updateData = {
              onesignal_subscription_id: matchingPlayer.id
            }
            
            // Se c'è anche OneSignal User ID, aggiornalo
            if (matchingPlayer.onesignal_user_id) {
              updateData.onesignal_player_id = matchingPlayer.onesignal_user_id
            }
            
            const { error: updateError } = await supabase
              .from('customers')
              .update(updateData)
              .eq('id', customer.id)
            
            if (updateError) {
              console.error(`❌ Errore aggiornamento ${customer.name}:`, updateError)
              errors++
            } else {
              console.log(`✅ Sincronizzato ${customer.name}:`, updateData)
              synced++
            }
          } else {
            console.log(`⚪ ${customer.name} già sincronizzato`)
          }
        } else {
          console.log(`❓ Nessun player OneSignal trovato per ${customer.name}`)
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
      playersFound: playersData.players?.length || 0
    }
    
    console.log('📊 Risultati sincronizzazione:', results)
    
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