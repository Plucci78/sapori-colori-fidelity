// Test per verificare se le attività sono fittizie
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jexkalekaofsfcusdfjh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGthbGVrYW9mc2ZjdXNkZmpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYyNjEzNCwiZXhwIjoyMDY0MjAyMTM0fQ.43plaZecrTvbwkr7U7g2Ucogkd0VgKRUg9VkJ--7JCU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function analyzeActivityLogs() {
  console.log('🔍 Analizzando attività recenti per verificare se sono fittizie...')
  
  try {
    // 1. Controlla se esiste la tabella activity_logs
    const { data: tables, error: tablesError } = await supabase
      .rpc('exec', { 
        sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%activity%';" 
      })
    
    if (tablesError) {
      console.log('❌ Errore controllo tabelle:', tablesError)
    } else {
      console.log('📋 Tabelle activity trovate:', tables)
    }
    
    // 2. Prova a leggere activity_logs
    const { data: activities, error: activitiesError } = await supabase
      .from('activity_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(15)
    
    if (activitiesError) {
      console.log('❌ Errore lettura activity_logs:', activitiesError)
      
      // Prova con un'altra possibile tabella
      const { data: logs, error: logsError } = await supabase
        .from('logs')
        .select('*')
        .limit(10)
      
      if (logsError) {
        console.log('❌ Nemmeno tabella logs esiste:', logsError)
      } else {
        console.log('📋 Trovata tabella logs:', logs)
      }
      
      return
    }
    
    console.log(`📊 Trovate ${activities?.length || 0} attività`)
    
    if (activities && activities.length > 0) {
      console.log('\n🎭 ANALISI DETTAGLIATA:')
      
      activities.forEach((activity, index) => {
        console.log(`\n${index + 1}. ACTION: ${activity.action}`)
        console.log(`   TIMESTAMP: ${activity.timestamp}`)
        console.log(`   USER: ${activity.user_name || activity.user_email || 'N/A'}`)
        console.log(`   DETAILS: ${activity.details || 'N/A'}`)
        console.log(`   IP: ${activity.ip_address || 'N/A'}`)
        console.log(`   CATEGORY: ${activity.category || 'N/A'}`)
      })
      
      // Analisi pattern sospetti
      console.log('\n🕵️ ANALISI PATTERN SOSPETTI:')
      
      const suspiciousIndicators = {
        testUsers: activities.filter(a => 
          a.user_name?.toLowerCase().includes('test') || 
          a.user_name?.toLowerCase().includes('demo') ||
          a.user_email?.toLowerCase().includes('test')
        ),
        localhostIPs: activities.filter(a => 
          a.ip_address === '127.0.0.1' || 
          a.ip_address === 'localhost' ||
          a.ip_address?.startsWith('192.168.')
        ),
        testDetails: activities.filter(a => 
          a.details?.toLowerCase().includes('test') ||
          a.details?.toLowerCase().includes('demo') ||
          a.details?.toLowerCase().includes('fake')
        ),
        recentTimeframe: activities.filter(a => {
          const now = new Date()
          const activityTime = new Date(a.timestamp)
          const diffHours = (now - activityTime) / (1000 * 60 * 60)
          return diffHours < 24 // Ultime 24 ore
        })
      }
      
      console.log(`🧪 Utenti test/demo: ${suspiciousIndicators.testUsers.length}`)
      suspiciousIndicators.testUsers.forEach(u => console.log(`   - ${u.user_name || u.user_email}`))
      
      console.log(`🏠 IP locali: ${suspiciousIndicators.localhostIPs.length}`)
      suspiciousIndicators.localhostIPs.forEach(u => console.log(`   - ${u.ip_address}`))
      
      console.log(`🧪 Dettagli test: ${suspiciousIndicators.testDetails.length}`)
      suspiciousIndicators.testDetails.forEach(u => console.log(`   - ${u.details}`))
      
      console.log(`⏰ Attività recenti (24h): ${suspiciousIndicators.recentTimeframe.length}`)
      
      // Verdetto finale
      const totalSuspicious = suspiciousIndicators.testUsers.length + 
                            suspiciousIndicators.testDetails.length
      
      if (totalSuspicious > activities.length * 0.5) {
        console.log('\n🚨 VERDETTO: La maggior parte delle attività sembrano FITTIZIE')
      } else if (totalSuspicious > 0) {
        console.log('\n⚠️ VERDETTO: Alcune attività potrebbero essere di test')
      } else {
        console.log('\n✅ VERDETTO: Le attività sembrano REALI')
      }
      
    } else {
      console.log('\n📭 Nessuna attività trovata - potrebbe essere normale per un sistema nuovo')
    }
    
  } catch (error) {
    console.error('❌ Errore generale:', error)
  }
}

analyzeActivityLogs()
