import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://uqkgjrnjzxxlvjunqgqc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxa2dqcm5qenh4bHZqdW5xZ3FjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNTEwMzI3MSwiZXhwIjoyMDQwNjc5MjcxfQ.FHFdGWnbEyBcOS7ymnYhZV0_L-fOgGTJRwmNiWQYSus'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createEmailTemplatesTable() {
  console.log('🎨 Creazione tabella email_custom_templates...')
  
  try {
    // Prova a creare la tabella inserendo direttamente un record
    // Se la tabella non esiste, Supabase restituirà un errore specifico
    
    // Inserisci template di esempio
    const { data: insertData, error: insertError } = await supabase
      .from('email_custom_templates')
      .insert([
        {
          name: 'Benvenuto Semplice',
          description: 'Template di benvenuto base per nuovi clienti',
          blocks: [
            {
              id: 1,
              type: 'header',
              props: {
                title: 'Benvenuto {{nome}}!',
                subtitle: 'Grazie per esserti registrato',
                background: '#8B4513',
                color: 'white'
              }
            },
            {
              id: 2,
              type: 'text', 
              props: {
                content: 'Siamo felici di averti nella nostra famiglia Sapori & Colori!',
                align: 'center'
              }
            },
            {
              id: 3,
              type: 'button',
              props: {
                text: 'Scopri i vantaggi',
                background: '#D4AF37',
                color: 'white'
              }
            }
          ],
          preview_html: '<div style="background:#8B4513;color:white;padding:20px;text-align:center;"><h1>Benvenuto!</h1></div>'
        }
      ])
      .select()

    if (insertError) {
      console.log('ℹ️ Template di esempio già esistente o errore inserimento:', insertError.message)
    } else {
      console.log('✅ Template di esempio inserito:', insertData)
    }
    
  } catch (error) {
    console.error('❌ Errore creazione tabella:', error)
  }
}

createEmailTemplatesTable()