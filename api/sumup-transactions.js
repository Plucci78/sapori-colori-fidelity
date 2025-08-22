// API per recuperare transazioni SumUp e stampare scontrini
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUMUP_API_KEY = 'sup_sk_NaX6p2WD4w1mq7di7mLuSBibEvZ2ckxtx';

  try {
    // Test connessione API SumUp
    const response = await fetch('https://api.sumup.com/v0.1/me/transactions', {
      headers: {
        'Authorization': `Bearer ${SUMUP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Errore SumUp API:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'Errore connessione SumUp',
        details: errorText 
      });
    }

    const transactions = await response.json();
    
    // Restituisci le ultime 10 transazioni
    res.status(200).json({
      success: true,
      count: transactions.length,
      transactions: transactions.slice(0, 10)
    });

  } catch (error) {
    console.error('Errore API SumUp:', error);
    res.status(500).json({ 
      error: 'Errore interno',
      message: error.message 
    });
  }
}