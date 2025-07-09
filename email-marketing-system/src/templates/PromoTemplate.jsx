import React from 'react';

const PromoTemplate = ({ name }) => {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', margin: 0, padding: 0, background: '#f8f9fa' }}>
      <table width="100%" cellPadding="0" cellSpacing="0" style={{ maxWidth: '600px', margin: '0 auto', background: 'white' }}>
        <tr>
          <td style={{ background: 'linear-gradient(45deg, #DC2626, #B91C1C)', padding: '40px 30px', textAlign: 'center', position: 'relative' }}>
            <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '25px', backdropFilter: 'blur(10px)' }}>
              <h1 style={{ color: '#2d3748', margin: '0 0 8px 0', fontSize: '36px', fontWeight: '800' }}>SUPER OFFERTA</h1>
              <p style={{ color: '#4a5568', margin: 0, fontSize: '18px' }}>Solo per te, {name}! 🎯</p>
            </div>
          </td>
        </tr>
      </table>

      <table width="100%" cellPadding="0" cellSpacing="0" style={{ maxWidth: '600px', margin: '0 auto', background: 'white' }}>
        <tr>
          <td style={{ padding: '40px 30px' }}>
            <div style={{ background: 'linear-gradient(135deg, #DC2626, #B91C1C)', color: 'white', padding: '30px', borderRadius: '15px', textAlign: 'center', marginBottom: '25px', position: 'relative', overflow: 'hidden' }}>
              <h2 style={{ margin: '0 0 10px 0', fontSize: '42px', fontWeight: '900' }}>20%</h2>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: '300' }}>DI SCONTO</p>
              <div style={{ width: '60px', height: '2px', background: 'rgba(255,255,255,0.8)', margin: '15px auto' }}></div>
              <p style={{ margin: 0, fontSize: '16px', opacity: 0.9 }}>Su tutti i prodotti da forno</p>
            </div>

            <div style={{ textAlign: 'center', margin: '30px 0' }}>
              <a href="#" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #DC2626, #B91C1C)', color: 'white', padding: '18px 40px', textDecoration: 'none', borderRadius: '25px', fontWeight: '700', fontSize: '18px', boxShadow: '0 10px 25px rgba(220, 38, 38, 0.4)', textTransform: 'uppercase' }}>
                Vieni Subito!
              </a>
            </div>
          </td>
        </tr>
      </table>
    </div>
  );
};

export default PromoTemplate;