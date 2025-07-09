import React from 'react';

const MilestoneTemplate = ({ nome, gemme }) => {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', margin: 0, padding: 0, background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)' }}>
      <table width="100%" cellPadding="0" cellSpacing="0" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <tr>
          <td style={{ padding: '50px 30px', textAlign: 'center' }}>
            <div style={{ width: '120px', height: '120px', background: 'linear-gradient(135deg, #FFA500, #FF8C00)', borderRadius: '50%', margin: '0 auto 25px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 15px 40px rgba(255, 165, 0, 0.4)', position: 'relative' }}>
              <div style={{ width: '100px', height: '100px', background: 'rgba(255,255,255,0.95)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <span style={{ fontSize: '24px', marginBottom: '4px' }}>🏆</span>
                <span style={{ color: '#2d3748', fontSize: '16px', fontWeight: '800' }}>{gemme}</span>
                <span style={{ color: '#4a5568', fontSize: '10px' }}>GEMME</span>
              </div>
            </div>
            <h1 style={{ color: 'white', margin: '0', fontSize: '32px', fontWeight: '300' }}>Fantastico {nome}!</h1>
            <p style={{ color: 'rgba(255,255,255,0.9)', margin: '10px 0 0 0', fontSize: '18px' }}>Hai raggiunto un traguardo importante</p>
          </td>
        </tr>
      </table>

      <table width="100%" cellPadding="0" cellSpacing="0" style={{ maxWidth: '600px', margin: '0 auto', background: 'white', borderRadius: '20px 20px 0 0' }}>
        <tr>
          <td style={{ padding: '40px 30px' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <h2 style={{ color: '#2d3748', margin: '0 0 10px 0', fontSize: '24px' }}>Traguardo Raggiunto! 🎉</h2>
              <p style={{ color: '#718096', margin: '0', fontSize: '16px' }}>La tua fedeltà è stata premiata con {gemme} GEMME</p>
            </div>

            <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '25px', margin: '25px 0' }}>
              <h3 style={{ color: '#2d3748', margin: '0 0 20px 0', fontSize: '18px', textAlign: 'center' }}>I tuoi prossimi traguardi:</h3>
              <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '15px', height: '15px', background: '#48bb78', borderRadius: '50%', marginRight: '15px' }}></div>
                <div>
                  <strong style={{ color: '#2d3748' }}>150 GEMME</strong>
                  <span style={{ color: '#718096', marginLeft: '10px' }}>🎁 Regalo sorpresa + Sconto 15%</span>
                </div>
              </div>
              <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '15px', height: '15px', background: '#ed8936', borderRadius: '50%', marginRight: '15px' }}></div>
                <div>
                  <strong style={{ color: '#2d3748' }}>250 GEMME</strong>
                  <span style={{ color: '#718096', marginLeft: '10px' }}>👑 Status VIP + Accesso anticipato</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '15px', height: '15px', background: '#9f7aea', borderRadius: '50%', marginRight: '15px' }}></div>
                <div>
                  <strong style={{ color: '#2d3748' }}>500 GEMME</strong>
                  <span style={{ color: '#718096', marginLeft: '10px' }}>💎 Premio esclusivo + Evento privato</span>
                </div>
              </div>
            </div>

            <div style={{ background: '#FFF8DC', borderLeft: '4px solid #D4AF37', padding: '20px', borderRadius: '8px', margin: '25px 0' }}>
              <p style={{ color: '#8B4513', margin: '0', fontSize: '16px', lineHeight: '1.4', fontStyle: 'italic', textAlign: 'center' }}>
                "Ogni GEMMA racconta la storia della tua passione per i sapori autentici"
              </p>
            </div>

            <div style={{ textAlign: 'center', margin: '30px 0' }}>
              <a href="#" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #D4AF37, #B8860B)', color: 'white', padding: '15px 35px', textDecoration: 'none', borderRadius: '25px', fontWeight: '600', fontSize: '16px', boxShadow: '0 8px 20px rgba(212, 175, 55, 0.4)' }}>Continua il Viaggio</a>
            </div>
          </td>
        </tr>
      </table>

      <table width="100%" cellPadding="0" cellSpacing="0" style={{ maxWidth: '600px', margin: '0 auto', background: '#2d3748' }}>
        <tr>
          <td style={{ padding: '25px', textAlign: 'center' }}>
            <p style={{ color: '#a0aec0', margin: '0', fontSize: '14px' }}>Grazie per essere parte della famiglia Sapori & Colori</p>
            <p style={{ color: '#718096', margin: '8px 0 0 0', fontSize: '12px' }}>📍 Via Example 123, Roma • 📞 06 1234567</p>
          </td>
        </tr>
      </table>
    </div>
  );
};

export default MilestoneTemplate;