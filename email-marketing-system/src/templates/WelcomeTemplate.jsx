import React from 'react';

const WelcomeTemplate = ({ name }) => {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', margin: 0, padding: 0, background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)' }}>
      <table width="100%" cellPadding="0" cellSpacing="0" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <tr>
          <td style={{ padding: '50px 30px', textAlign: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
              <span style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>SC</span>
            </div>
            <h1 style={{ color: 'white', margin: '0 0 10px 0', fontSize: '32px', fontWeight: '300' }}>Benvenuto {name}!</h1>
            <p style={{ color: 'rgba(255,255,255,0.9)', margin: 0, fontSize: '18px' }}>Nella famiglia Sapori & Colori</p>
          </td>
        </tr>
      </table>

      <table width="100%" cellPadding="0" cellSpacing="0" style={{ maxWidth: '600px', margin: '0 auto', background: 'white', borderRadius: '20px 20px 0 0' }}>
        <tr>
          <td style={{ padding: '40px 30px' }}>
            <h2 style={{ color: '#2d3748', margin: '0 0 20px 0', fontSize: '24px', textAlign: 'center' }}>Il tuo viaggio inizia qui! 🚀</h2>

            <div style={{ background: '#f8f9fa', padding: '25px', borderRadius: '12px', margin: '20px 0' }}>
              <h3 style={{ color: '#B8860B', margin: '0 0 15px 0', fontSize: '18px' }}>Come funziona:</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
                <div style={{ flex: 1, padding: '0 10px' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>💎</div>
                  <p style={{ margin: 0, fontSize: '14px', color: '#4a5568' }}><strong>1€ = 1 GEMMA</strong></p>
                </div>
                <div style={{ flex: 1, padding: '0 10px' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎁</div>
                  <p style={{ margin: 0, fontSize: '14px', color: '#4a5568' }}><strong>Premi Esclusivi</strong></p>
                </div>
                <div style={{ flex: 1, padding: '0 10px' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>⭐</div>
                  <p style={{ margin: 0, fontSize: '14px', color: '#4a5568' }}><strong>Status VIP</strong></p>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', margin: '30px 0' }}>
              <a href="#" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #D4AF37, #B8860B)', color: 'white', padding: '15px 35px', textDecoration: 'none', borderRadius: '25px', fontWeight: '600', fontSize: '16px', boxShadow: '0 8px 20px rgba(212, 175, 55, 0.4)' }}>Scopri i Premi</a>
            </div>

            <div style={{ background: '#FFF8DC', padding: '20px', borderRadius: '10px', borderLeft: '4px solid #D4AF37' }}>
              <p style={{ margin: 0, color: '#4a5568', fontSize: '16px', lineHeight: 1.5, fontStyle: 'italic' }}>
                "{name}, siamo entusiasti di averti con noi. Preparati a vivere un'esperienza culinaria unica!"
              </p>
              <p style={{ margin: '10px 0 0 0', color: '#718096', fontSize: '14px', fontWeight: '600' }}>— Il Team Sapori & Colori</p>
            </div>
          </td>
        </tr>
      </table>

      <table width="100%" cellPadding="0" cellSpacing="0" style={{ maxWidth: '600px', margin: '0 auto', background: '#2d3748' }}>
        <tr>
          <td style={{ padding: '25px', textAlign: 'center' }}>
            <p style={{ color: '#a0aec0', margin: 0, fontSize: '14px' }}>📍 Via Example 123, Roma • 📞 06 1234567</p>
            <p style={{ color: '#718096', margin: '8px 0 0 0', fontSize: '12px' }}>Ti aspettiamo per la tua prima visita!</p>
          </td>
        </tr>
      </table>
    </div>
  );
};

export default WelcomeTemplate;