import React, { useEffect, useState } from 'react';
import StudioEditor from '@grapesjs/studio-sdk/react';
import '@grapesjs/studio-sdk/style';
import rendererReact from '@grapesjs/studio-sdk-plugins/dist/rendererReact';
import grapesjsPresetWebpage from 'grapesjs-preset-webpage';
import grapesjsBlocksBasic from 'grapesjs-blocks-basic';
import grapesjsPluginForms from 'grapesjs-plugin-forms';
import grapesjsCustomCode from 'grapesjs-custom-code';
import grapesjsPluginExport from 'grapesjs-plugin-export';
import grapesjsTabs from 'grapesjs-tabs';

// Define your custom React components for GrapesJS blocks
// These are simplified versions based on your original HTML content
const SaporiHeader = ({ title, subtitle, logoSrc }) => (
  <div style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #FFD700 100%)', padding: '40px 20px', textAlign: 'center', color: '#8B4513' }}>
    {logoSrc && <img src={logoSrc} alt="Sapori & Colori" style={{ height: '80px', marginBottom: '20px' }} />}
    <h1 style={{ margin: '0', fontSize: '2.5em', fontWeight: 'bold' }}>{title}</h1>
    <p style={{ margin: '10px 0 0 0', fontSize: '1.2em' }}>{subtitle}</p>
  </div>
);

const PromoSection = ({ offer, description, buttonText, buttonLink }) => (
  <div style={{ padding: '60px 20px', textAlign: 'center', background: '#f8f9fa' }}>
    <h2 style={{ fontSize: '2.5em', color: '#D4AF37', marginBottom: '20px' }}>{offer}</h2>
    <p style={{ fontSize: '1.3em', color: '#333', marginBottom: '30px' }}>{description}</p>
    <div style={{ background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', maxWidth: '400px', margin: '0 auto' }}>
      <h3 style={{ color: '#8B4513', marginBottom: '15px' }}>Solo oggi!</h3>
      <p style={{ fontSize: '1.1em', marginBottom: '25px' }}>Mostra questa pagina in negozio</p>
      <a href={buttonLink} style={{ background: '#D4AF37', color: 'white', padding: '15px 30px', textDecoration: 'none', borderRadius: '25px', fontWeight: 'bold', display: 'inline-block' }}>{buttonText}</a>
    </div>
  </div>
);

const ContactCta = ({ phone, whatsapp, mapLink }) => (
  <div style={{ background: '#8B4513', color: 'white', padding: '40px 20px', textAlign: 'center' }}>
    <h3 style={{ marginBottom: '20px' }}>Contattaci Subito!</h3>
    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
      <a href={`tel:${phone}`} style={{ background: '#D4AF37', color: 'white', padding: '12px 25px', textDecoration: 'none', borderRadius: '25px', fontWeight: 'bold' }}>📞 Chiama</a>
      <a href={`https://wa.me/${whatsapp}`} style={{ background: '#25D366', color: 'white', padding: '12px 25px', textDecoration: 'none', borderRadius: '25px', fontWeight: 'bold' }}>💬 WhatsApp</a>
      <a href={mapLink} style={{ background: '#4285F4', color: 'white', padding: '12px 25px', textDecoration: 'none', borderRadius: '25px', fontWeight: 'bold' }}>🗺️ Indicazioni</a>
    </div>
  </div>
);


const PageBuilder = () => {
  // No need for editorRef, editor state, or complex useEffects for initialization
  // StudioEditor handles its own lifecycle

  // Define the React components GrapesJS will use
  const reactRendererConfig = {
    components: {
      SaporiHeader: {
        component: SaporiHeader,
        props: () => [
          { type: 'text', name: 'title', label: 'Titolo', value: 'Sapori & Colori' },
          { type: 'text', name: 'subtitle', label: 'Sottotitolo', value: 'Il sapore autentico della tradizione' },
          { type: 'text', name: 'logoSrc', label: 'URL Logo', value: 'https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png' },
        ],
      },
      PromoSection: {
        component: PromoSection,
        props: () => [
          { type: 'text', name: 'offer', label: 'Offerta', value: '🍕 OFFERTA SPECIALE!' },
          { type: 'text', name: 'description', label: 'Descrizione', value: 'La tua pizza preferita con il 30% di sconto' },
          { type: 'text', name: 'buttonText', label: 'Testo Bottone', value: '📞 Chiama Ora!' },
          { type: 'text', name: 'buttonLink', label: 'Link Bottone', value: 'tel:+393926568550' },
        ],
      },
      ContactCta: {
        component: ContactCta,
        props: () => [
          { type: 'text', name: 'phone', label: 'Telefono', value: '+393926568550' },
          { type: 'text', name: 'whatsapp', label: 'WhatsApp', value: '393926568550' },
          { type: 'text', name: 'mapLink', label: 'Link Mappa', value: 'https://maps.google.com/?q=Via+Roma+123+Roma' },
        ],
      },
    },
  };

  return (
    <div style={{ height: '100vh', width: '100vw' }}> {/* Ensure the container has dimensions */}
      <StudioEditor
        options={{
          licenseKey: import.meta.env.VITE_GRAPESJS_LICENSE_KEY,
          
          // The React Renderer plugin
          plugins: [
            rendererReact.init(reactRendererConfig),
            grapesjsPresetWebpage,
            grapesjsBlocksBasic,
            grapesjsPluginForms,
            grapesjsCustomCode,
            grapesjsPluginExport,
            grapesjsTabs,
            // Add blocks for your custom React components
            (editor) => {
              editor.Blocks.add('sapori-header', {
                label: 'Header Sapori & Colori',
                category: 'Sapori & Colori',
                content: { type: 'SaporiHeader', props: { title: 'Sapori & Colori', subtitle: 'Il sapore autentico della tradizione', logoSrc: 'https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png' } },
              });
              editor.Blocks.add('promo-section', {
                label: 'Sezione Promozione',
                category: 'Sapori & Colori',
                content: { type: 'PromoSection', props: { offer: '🍕 OFFERTA SPECIALE!', description: 'La tua pizza preferita con il 30% di sconto', buttonText: '📞 Chiama Ora!', buttonLink: 'tel:+393926568550' } },
              });
              editor.Blocks.add('contact-cta', {
                label: 'Call to Action Contatti',
                category: 'Sapori & Colori',
                content: { type: 'ContactCta', props: { phone: '+393926568550', whatsapp: '393926568550', mapLink: 'https://maps.google.com/?q=Via+Roma+123+Roma' } },
              });
            }
          ],
          // Initial project content using React components
          project: {
            type: 'react',
            default: {
              pages: [
                {
                  name: 'Pagina Iniziale',
                  component: (
                    <>
                      <SaporiHeader title="Benvenuto nel Page Builder" subtitle="Crea le tue landing page con facilità" logoSrc="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png" />
                      <PromoSection offer="Offerta di Benvenuto!" description="Trascina i blocchi per iniziare a costruire!" buttonText="Scopri di più" buttonLink="#" />
                    </>
                  )
                },
              ]
            }
          },
          // Other GrapesJS options (optional)
          height: '100%',
          width: '100%',
          showOffsets: true,
          noticeOnUnload: false,
          storageManager: {
            type: 'local',
            autosave: true,
            autoload: true,
            stepsBeforeSave: 3
          },
          deviceManager: {
            devices: [
              { name: 'Desktop', width: '' },
              { name: 'Tablet', width: '768px', widthMedia: '992px' },
              { name: 'Mobile', width: '375px', widthMedia: '575px' }
            ]
          },
        }}
      />
    </div>
  );
};

export default PageBuilder;