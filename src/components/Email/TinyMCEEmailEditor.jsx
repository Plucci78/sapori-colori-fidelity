// ===================================
// TINYMCE EMAIL EDITOR CON BLOCCHI COLORATI
// File: src/components/Email/TinyMCEEmailEditor.jsx
// ===================================

import { useRef, useEffect } from 'react';
import tinymce from "tinymce/tinymce";
import "tinymce/themes/silver";
// Rimuovi o sostituisci i plugin non esistenti
// import "tinymce/plugins/template";
// import "tinymce/plugins/colorpicker"; // obsoleto nelle versioni recenti
// import "tinymce/plugins/textcolor"; // obsoleto nelle versioni recenti

// Importa i plugin corretti disponibili
import "tinymce/plugins/code";
import "tinymce/plugins/link";
import "tinymce/plugins/image";
import "tinymce/plugins/lists";
import "tinymce/plugins/table";
import "tinymce/plugins/preview";
import "tinymce/plugins/autolink";
import "tinymce/plugins/emoticons";
import "tinymce/plugins/advlist";

// BLOCCHI EMAIL PREDEFINITI
const emailBlocks = {
  // HEADER ROSSO GRADIENTE
  headerRed: {
    title: '🔴 Header Rosso Gradiente',
    description: 'Header con gradiente rosso brand',
    content: `
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="background: #f9f9f9; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0; border-bottom: 1px solid #e0e0e0;">
            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">Titolo Header</h1>
            <p style="margin: 10px 0 0 0; color: #666666; font-size: 16px;">Sottotitolo opzionale</p>
          </td>
        </tr>
      </table>
    `
  },

  // HERO SECTION
  heroSection: {
    title: '🖼️ Hero con Immagine',
    description: 'Sezione hero con immagine e testo',
    content: `
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="background-color: #ffffff; padding: 60px 30px; text-align: center; border: 1px solid #e0e0e0;">
            <img src="https://via.placeholder.com/400x200" alt="Hero Image" style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 10px 0; color: #333333; font-size: 28px;">Titolo Principale</h2>
            <p style="margin: 0; color: #666666; font-size: 16px;">Descrizione del contenuto</p>
          </td>
        </tr>
      </table>
    `
  },

  // CARD OFFERTA
  offerCard: {
    title: '🎁 Card Offerta',
    description: 'Card colorata per offerte speciali',
    content: `
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 20px;">
            <div style="background-color: #fef2f2; border: 2px solid #fde68a; border-radius: 8px; padding: 30px; text-align: center;">
              <h3 style="margin: 0 0 10px 0; color: #F59E0B; font-size: 24px;">OFFERTA SPECIALE</h3>
              <p style="margin: 0 0 20px 0; color: #F59E0B; font-size: 36px; font-weight: bold;">-20%</p>
              <p style="margin: 0; color: #666666; font-size: 16px;">Su tutti i prodotti</p>
            </div>
          </td>
        </tr>
      </table>
    `
  },

  // BOTTONE CTA
  ctaButton: {
    title: '🎯 Bottone CTA',
    description: 'Call to action button',
    content: `
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 30px; text-align: center;">
            <a href="#" style="display: inline-block; background: #D4AF37; color: #333333; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">Clicca Qui</a>
          </td>
        </tr>
      </table>
    `
  },

  // GRID PRODOTTI
  productGrid: {
    title: '📦 Griglia Prodotti',
    description: 'Layout a 2 colonne per prodotti',
    content: `
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="48%" style="background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; vertical-align: top;">
                  <img src="https://via.placeholder.com/150x150" alt="Prodotto 1" style="width: 100%; height: auto; border-radius: 4px; margin-bottom: 10px;">
                  <h4 style="margin: 0 0 10px 0; color: #333333; font-size: 18px;">Prodotto 1</h4>
                  <p style="margin: 0 0 10px 0; color: #dc2626; font-size: 20px; font-weight: bold;">€9,99</p>
                  <p style="margin: 0; color: #666666; font-size: 14px;">Descrizione breve</p>
                </td>
                <td width="4%"></td>
                <td width="48%" style="background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; vertical-align: top;">
                  <img src="https://via.placeholder.com/150x150" alt="Prodotto 2" style="width: 100%; height: auto; border-radius: 4px; margin-bottom: 10px;">
                  <h4 style="margin: 0 0 10px 0; color: #333333; font-size: 18px;">Prodotto 2</h4>
                  <p style="margin: 0 0 10px 0; color: #dc2626; font-size: 20px; font-weight: bold;">€12,99</p>
                  <p style="margin: 0; color: #666666; font-size: 14px;">Descrizione breve</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `
  },

  // INFO BOX
  infoBox: {
    title: 'ℹ️ Box Informativo',
    description: 'Box colorato per informazioni',
    content: `
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 20px;">
            <div style="background-color: #f3f1eb; border-left: 4px solid #8B4513; padding: 20px; border-radius: 0 8px 8px 0;">
              <h4 style="margin: 0 0 10px 0; color: #8B4513; font-size: 18px;">💡 Lo sapevi che...</h4>
              <p style="margin: 0; color: #8B4513; font-size: 14px; line-height: 1.6;">
                Inserisci qui informazioni utili o curiosità per i tuoi clienti.
              </p>
            </div>
          </td>
        </tr>
      </table>
    `
  },

  // TESTIMONIAL
  testimonial: {
    title: '💬 Testimonial',
    description: 'Recensione cliente',
    content: `
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 20px;">
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 30px; text-align: center; border: 1px solid #e0e0e0;">
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 18px; font-style: italic; line-height: 1.6;">
                "Il miglior pane che abbia mai mangiato! Sempre fresco e genuino."
              </p>
              <p style="margin: 0; color: #333333; font-weight: bold;">- Maria Rossi</p>
              <p style="margin: 0; color: #666666; font-size: 14px;">Cliente dal 2020</p>
            </div>
          </td>
        </tr>
      </table>
    `
  },

  // GEMME STATUS
  gemsStatus: {
    title: '💎 Status GEMME',
    description: 'Mostra il saldo punti',
    content: `
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 20px;">
            <div style="background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 30px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #333333; font-size: 16px;">Le tue GEMME attuali:</p>
              <p style="margin: 0; color: #dc2626; font-size: 48px; font-weight: bold;">{{gemme}} 💎</p>
              <p style="margin: 10px 0 0 0; color: #666666; font-size: 14px;">Continua ad accumulare per fantastici premi!</p>
            </div>
          </td>
        </tr>
      </table>
    `
  },

  // FOOTER
  footer: {
    title: '📧 Footer Contatti',
    description: 'Footer con info contatti',
    content: `
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="background-color: #f0f2f5; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e0e0e0;">
            <h3 style="margin: 0 0 20px 0; color: #dc2626; font-size: 20px;">Sapori & Colori</h3>
            <p style="margin: 0 0 10px 0; color: #333333; font-size: 14px;">
              📍 Via Example 123, Roma<br>
              📞 Tel: 06 1234567<br>
              📧 info@saporiecolori.it
            </p>
            <div style="margin: 20px 0;">
              <a href="#" style="color: #dc2626; text-decoration: none; margin: 0 10px;">Facebook</a>
              <a href="#" style="color: #dc2626; text-decoration: none; margin: 0 10px;">Instagram</a>
              <a href="#" style="color: #dc2626; text-decoration: none; margin: 0 10px;">WhatsApp</a>
            </div>
            <p style="margin: 20px 0 0 0; color: #666666; font-size: 12px;">
              © 2024 Sapori & Colori. Tutti i diritti riservati.
            </p>
          </td>
        </tr>
      </table>
    `
  }
};

const TinyMCEEmailEditor = ({ onContentChange, initialContent = '' }) => {
  const editorRef = useRef(null);

  useEffect(() => {
    tinymce.init({
      selector: '#email-editor',
      height: 600,
      menubar: false,
      
      // PLUGINS
      plugins: [
        'code', 'link', 'image', 'lists', 'table', 'preview', 'autolink', 'emoticons', 'advlist'
      ],
      
      // TOOLBAR
      toolbar: 'undo redo | blocks | bold italic underline | forecolor backcolor | ' +
               'alignleft aligncenter alignright | bullist numlist | ' +
               'link image emoticons | preview code',
      
      // STYLE FORMATS PERSONALIZZATI
      style_formats: [
        { title: 'Titoli', items: [
          { title: 'Titolo Grande Rosso', block: 'h1', styles: { color: '#dc2626', fontSize: '32px' } },
          { title: 'Titolo Medio', block: 'h2', styles: { color: '#1a1a1a', fontSize: '24px' } },
          { title: 'Sottotitolo', block: 'h3', styles: { color: '#4b5563', fontSize: '18px' } }
        ]},
        { title: 'Inline', items: [
          { title: 'Testo Rosso', inline: 'span', styles: { color: '#dc2626' } },
          { title: 'Evidenziato', inline: 'span', styles: { backgroundColor: '#fef2f2', padding: '2px 6px' } },
          { title: 'Badge', inline: 'span', styles: { backgroundColor: '#dc2626', color: 'white', padding: '4px 8px', borderRadius: '4px' } }
        ]},
        { title: 'Blocchi', items: [
          { title: 'Box Info', block: 'div', wrapper: true, styles: { backgroundColor: '#f3f1eb', border: '1px solid #8B4513', padding: '20px', borderRadius: '8px' } },
          { title: 'Box Success', block: 'div', wrapper: true, styles: { backgroundColor: '#d1fae5', border: '1px solid #10b981', padding: '20px', borderRadius: '8px' } },
          { title: 'Box Warning', block: 'div', wrapper: true, styles: { backgroundColor: '#fef3c7', border: '1px solid #f59e0b', padding: '20px', borderRadius: '8px' } }
        ]}
      ],
      
      // TEMPLATES (BLOCCHI EMAIL)
      templates: Object.values(emailBlocks),
      
      // CONTENT CSS
      content_style: `
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333; /* Dark text for editor content */
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        h1, h2, h3 { margin-top: 0; }
        a { color: #dc2626; }
        .email-block {
          margin: 20px 0;
          padding: 20px;
          border-radius: 8px;
        }
      `,
      
      // CALLBACK
      setup: (editor) => {
        editorRef.current = editor;
        
        // BOTTONI CUSTOM PER BLOCCHI RAPIDI
        editor.ui.registry.addButton('insertGemme', {
          text: '💎 GEMME',
          tooltip: 'Inserisci variabile GEMME',
          onAction: () => {
            editor.insertContent('{{gemme}}');
          }
        });
        
        editor.ui.registry.addButton('insertNome', {
          text: '👤 Nome',
          tooltip: 'Inserisci variabile nome',
          onAction: () => {
            editor.insertContent('{{nome}}');
          }
        });
        
        // MENU CONTESTUALE BLOCCHI
        editor.ui.registry.addMenuButton('emailBlocks', {
          text: '🎨 Blocchi Email',
          fetch: (callback) => {
            const items = Object.entries(emailBlocks).map(([, block]) => ({
              type: 'menuitem',
              text: block.title,
              onAction: () => {
                editor.insertContent(block.content);
              }
            }));
            callback(items);
          }
        });
      },
      
      // INIZIALIZZAZIONE
      init_instance_callback: (editor) => {
        if (initialContent) {
          editor.setContent(initialContent);
        }
        
        // CALLBACK CAMBIO CONTENUTO
        editor.on('change', () => {
          if (onContentChange) {
            onContentChange(editor.getContent());
          }
        });
      },
      
      // TOOLBAR CUSTOM
      toolbar2: 'insertNome insertGemme | emailBlocks',
      
      // COLORI PREDEFINITI
      color_map: [
        'dc2626', 'Rosso Brand',
        'ef4444', 'Rosso Chiaro',
        '991b1b', 'Rosso Scuro',
        'f9fafb', 'Bianco Sfondo',
        'ffffff', 'Bianco Puro',
        'e0e0e0', 'Grigio Chiaro',
        '666666', 'Grigio Scuro',
        '333333', 'Nero Testo',
        '3b82f6', 'Blu Info',
        '10b981', 'Verde Success',
        'f59e0b', 'Giallo Warning'
      ]
    });

    // CLEANUP
    return () => {
      if (editorRef.current) {
        tinymce.remove(editorRef.current);
      }
    };
  }, [initialContent, onContentChange]);

  return (
    <div className="tinymce-email-editor">
      <textarea id="email-editor"></textarea>
    </div>
  );
};

export default TinyMCEEmailEditor;