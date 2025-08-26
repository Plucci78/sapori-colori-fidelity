import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Configura Supabase (usa le tue credenziali)
const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'

// Se usi Supabase locale
const supabase = createClient(
  'http://127.0.0.1:54321', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Il tuo anon key locale
)

async function setupTemplates() {
  try {
    console.log('🔧 Aggiornamento struttura tabella...')
    
    // Aggiungi colonne mancanti
    const { error: alterError } = await supabase.rpc('execute_sql', {
      sql: `
        ALTER TABLE email_templates 
        ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'custom',
        ADD COLUMN IF NOT EXISTS html_preview TEXT,
        ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
        
        ALTER TABLE email_templates 
        ALTER COLUMN unlayer_design DROP NOT NULL;
      `
    })
    
    if (alterError) {
      console.log('⚠️ Errore modifica tabella (potrebbe essere già corretta):', alterError.message)
    } else {
      console.log('✅ Struttura tabella aggiornata')
    }
    
    console.log('🗑️ Pulizia template esistenti...')
    const { error: deleteError } = await supabase
      .from('email_templates')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Cancella tutto
    
    if (deleteError) {
      console.log('⚠️ Errore pulizia template:', deleteError.message)
    } else {
      console.log('✅ Template esistenti rimossi')
    }
    
    console.log('📧 Inserimento template di esempio...')
    
    // Template 1: Benvenuto
    const { error: error1 } = await supabase
      .from('email_templates')
      .insert([{
        name: 'Benvenuto Nuovo Cliente',
        description: 'Template di benvenuto per nuovi clienti registrati',
        category: 'welcome',
        unlayer_design: {
          "counters": {"u_column": 1, "u_row": 1, "u_content_text": 1, "u_content_heading": 1, "u_content_button": 1},
          "body": {
            "id": "body",
            "rows": [{
              "id": "row-1",
              "cells": [{
                "id": "column-1",
                "contents": [
                  {
                    "id": "heading-1",
                    "type": "heading",
                    "values": {
                      "containerPadding": "10px",
                      "headingType": "h1",
                      "fontSize": "32px",
                      "fontWeight": 700,
                      "textAlign": "center",
                      "text": "<p><span style=\"color: #8b4513;\">Benvenuto {{nome}}!</span></p>"
                    }
                  },
                  {
                    "id": "text-1",
                    "type": "text",
                    "values": {
                      "containerPadding": "10px",
                      "fontSize": "14px",
                      "textAlign": "center",
                      "text": "<p>Ti diamo il benvenuto nella famiglia Sapori & Colori. Da oggi ogni tuo acquisto ti farà guadagnare preziose GEMME!</p>"
                    }
                  },
                  {
                    "id": "button-1",
                    "type": "button",
                    "values": {
                      "containerPadding": "10px",
                      "fontSize": "14px",
                      "textAlign": "center",
                      "padding": "15px 25px",
                      "buttonColors": {"color": "#FFFFFF", "backgroundColor": "#8B4513"},
                      "borderRadius": "8px",
                      "text": "Inizia Subito",
                      "href": "#"
                    }
                  }
                ]
              }]
            }]
          }
        },
        html_preview: '<div style="text-align:center;padding:20px;"><h1 style="color:#8B4513;">Benvenuto {{nome}}!</h1><p>Ti diamo il benvenuto nella famiglia Sapori & Colori. Da oggi ogni tuo acquisto ti farà guadagnare preziose GEMME!</p><a href="#" style="display:inline-block;padding:15px 25px;background:#8B4513;color:white;text-decoration:none;border-radius:8px;">Inizia Subito</a></div>'
      }])
    
    if (error1) {
      console.log('❌ Errore inserimento template 1:', error1.message)
    } else {
      console.log('✅ Template "Benvenuto" inserito')
    }
    
    // Template 2: Newsletter
    const { error: error2 } = await supabase
      .from('email_templates')
      .insert([{
        name: 'Newsletter Mensile',
        description: 'Template per newsletter con novità e promozioni',
        category: 'newsletter',
        unlayer_design: {"basic": true},
        html_preview: '<div style="padding:20px;"><h2 style="color:#8B4513;text-align:center;">Newsletter Sapori & Colori</h2><p><strong>Ciao {{nome}},</strong></p><p>Ecco le novità di questo mese dal nostro ristorante.</p></div>'
      }])
    
    if (error2) {
      console.log('❌ Errore inserimento template 2:', error2.message)
    } else {
      console.log('✅ Template "Newsletter" inserito')
    }
    
    // Template 3: Promozione
    const { error: error3 } = await supabase
      .from('email_templates')
      .insert([{
        name: 'Promozione Speciale',
        description: 'Template per offerte e promozioni limitate',
        category: 'promotions',
        unlayer_design: {"basic": true},
        html_preview: '<div style="text-align:center;padding:20px;background:linear-gradient(135deg,#f8f9fa,#e9ecef);"><h1 style="color:#D4AF37;margin:0;">OFFERTA SPECIALE!</h1><h3 style="color:#333;margin:10px 0;">Solo per te, {{nome}}</h3><p><strong>Sconto del 20%</strong> su tutti i piatti del menu.</p><a href="#" style="display:inline-block;padding:20px 40px;background:#D4AF37;color:white;text-decoration:none;border-radius:12px;font-weight:700;">Prenota Ora</a></div>'
      }])
    
    if (error3) {
      console.log('❌ Errore inserimento template 3:', error3.message)
    } else {
      console.log('✅ Template "Promozione" inserito')
    }
    
    console.log('🎉 Setup completato! Controlla i template nell\'app.')
    
  } catch (error) {
    console.error('💥 Errore durante il setup:', error)
  }
}

// Esegui setup
setupTemplates()