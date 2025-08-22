// API unificata per transazioni SumUp: lista (GET) e stampa (POST)
export default async function handler(req, res) {
  const SUMUP_API_KEY = 'sup_sk_NaX6p2WD4w1mq7di7mLuSBibEvZ2ckxtx';
  const PRINTER_URL = 'https://sacred-eagle-similarly.ngrok-free.app';

  // GET - Lista transazioni SumUp
  if (req.method === 'GET') {
    const { action, limit = 20 } = req.query;

    if (action === 'list') {
      try {
        console.log(`📋 Recuperando lista transazioni SumUp (limit: ${limit})...`);
        
        const response = await fetch(`https://api.sumup.com/v0.1/me/transactions/history?order=descending&limit=${limit}`, {
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

        const data = await response.json();
        const transactions = data.items || [];
        
        // Filtra solo transazioni SUCCESS e formatta per UI
        const formattedTransactions = transactions
          .filter(t => t.status === 'SUCCESSFUL')
          .map(t => ({
            id: t.transaction_code,
            code: t.transaction_code,
            amount: parseFloat(t.amount).toFixed(2),
            currency: t.currency,
            cardType: t.card_type,
            entryMode: t.entry_mode,
            timestamp: t.timestamp,
            date: new Date(t.timestamp).toLocaleDateString('it-IT'),
            time: new Date(t.timestamp).toLocaleTimeString('it-IT', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            status: t.status,
            canPrint: true
          }));

        console.log(`✅ ${formattedTransactions.length} transazioni recuperate`);

        return res.status(200).json({
          success: true,
          count: formattedTransactions.length,
          transactions: formattedTransactions
        });

      } catch (error) {
        console.error('Errore API SumUp lista:', error);
        return res.status(500).json({ 
          error: 'Errore interno',
          message: error.message 
        });
      }
    } else {
      return res.status(400).json({ error: 'Parametro action richiesto per GET' });
    }
  }

  // POST - Stampa scontrino (codice esistente)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { amount } = req.body;

  if (!amount) {
    return res.status(400).json({ error: 'Importo richiesto' });
  }

  try {
    // 1. Cerca transazione SumUp per importo
    console.log(`🔍 Cercando transazione SumUp per €${amount}...`);
    
    const response = await fetch('https://api.sumup.com/v0.1/me/transactions/history?order=descending&limit=50', {
      headers: {
        'Authorization': `Bearer ${SUMUP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`SumUp API error: ${response.status}`);
    }

    const data = await response.json();
    const transactions = data.items || [];

    // Trova transazione con importo corrispondente (solo SUCCESS)
    const transaction = transactions.find(t => 
      parseFloat(t.amount) === parseFloat(amount) && 
      t.status === 'SUCCESSFUL'
    );

    if (!transaction) {
      return res.status(404).json({ 
        error: 'Transazione non trovata',
        message: `Nessuna transazione di €${amount} trovata nelle ultime 50 transazioni` 
      });
    }

    console.log(`✅ Transazione trovata: ${transaction.transaction_code}`);

    // 2. Prepara dati scontrino SumUp
    const receiptData = {
      // Dati SumUp ufficiali
      transactionCode: transaction.transaction_code,
      amount: transaction.amount,
      currency: transaction.currency,
      cardType: transaction.card_type,
      entryMode: transaction.entry_mode,
      timestamp: transaction.timestamp,
      payout_date: transaction.payout_date,
      
      // Dati aziendali
      merchantName: 'SAPORI E COLORI B SRL',
      merchantAddress: 'Via Bagaladi 7, 00132 Roma',
      merchantPhone: '+39 06 39911640',
      merchantCode: 'MCNUET34',
      vatId: 'IT16240351003'
    };

    // 3. Stampa scontrino
    console.log(`🖨️ Stampando scontrino SumUp...`);
    
    const printResponse = await fetch(`${PRINTER_URL}/print/receipt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        orderId: receiptData.transactionCode,
        total: receiptData.amount,
        operator: "Sistema SumUp",
        customer: "Cliente SumUp", 
        paymentMethod: `${receiptData.cardType} ${receiptData.entryMode}`,
        items: [{
          name: "SumUp Transaction",
          quantity: 1,
          price: receiptData.amount
        }],
        notes: `Transaction ID: ${receiptData.transactionCode}, Card: ${receiptData.cardType}, Entry: ${receiptData.entryMode}, Status: APPROVED`
      }),
      timeout: 15000
    });

    if (!printResponse.ok) {
      const errorText = await printResponse.text();
      throw new Error(`Errore stampa: ${printResponse.status} - ${errorText}`);
    }

    const printResult = await printResponse.json();
    
    console.log(`✅ Scontrino SumUp stampato con successo!`);

    res.status(200).json({
      success: true,
      message: 'Scontrino SumUp stampato con successo',
      transaction: {
        code: transaction.transaction_code,
        amount: transaction.amount,
        card: transaction.card_type,
        date: transaction.timestamp
      },
      printResult: printResult
    });

  } catch (error) {
    console.error('❌ Errore stampa scontrino SumUp:', error);
    res.status(500).json({ 
      error: 'Errore stampa scontrino',
      message: error.message 
    });
  }
}