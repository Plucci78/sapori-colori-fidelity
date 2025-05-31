import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import './App.css'

function App() {
  const [customers, setCustomers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [transactionAmount, setTransactionAmount] = useState('')
  const [settings, setSettings] = useState({ points_per_euro: 1, points_for_prize: 10 })
  const [activeTab, setActiveTab] = useState('customer')
  // NUOVO: Stati per i premi
  const [prizes, setPrizes] = useState([])
  const [newPrizeName, setNewPrizeName] = useState('')
  const [newPrizeDescription, setNewPrizeDescription] = useState('')
  const [newPrizeCost, setNewPrizeCost] = useState('')

  // Carica impostazioni e premi
  useEffect(() => {
    loadSettings()
    loadPrizes()
  }, [])

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single()
      
      if (data) setSettings(data)
    } catch (error) {
      console.log('Errore caricamento impostazioni:', error)
    }
  }

  // NUOVO: Carica premi
  const loadPrizes = async () => {
    try {
      const { data, error } = await supabase
        .from('prizes')
        .select('*')
        .eq('active', true)
        .order('points_cost')

      if (data) setPrizes(data)
    } catch (error) {
      console.log('Errore caricamento premi:', error)
    }
  }

  // Salva impostazioni
  const saveSettings = async () => {
    try {
      const { error } = await supabase
        .from('settings')
        .update({
          points_per_euro: settings.points_per_euro,
          points_for_prize: settings.points_for_prize
        })
        .eq('id', settings.id)

      if (!error) {
        alert('Configurazione salvata!')
      }
    } catch (error) {
      console.log('Errore salvataggio:', error)
      alert('Errore nel salvataggio')
    }
  }

  // NUOVO: Aggiungi premio
  const addPrize = async () => {
    if (!newPrizeName || !newPrizeDescription || !newPrizeCost) {
      alert('Compila tutti i campi del premio')
      return
    }

    try {
      const { data, error } = await supabase
        .from('prizes')
        .insert([{
          name: newPrizeName,
          description: newPrizeDescription,
          points_cost: parseInt(newPrizeCost),
          active: true
        }])
        .select()

      if (data) {
        setPrizes([...prizes, data[0]])
        setNewPrizeName('')
        setNewPrizeDescription('')
        setNewPrizeCost('')
        alert('Premio aggiunto!')
      }
    } catch (error) {
      console.log('Errore aggiunta premio:', error)
      alert('Errore nell\'aggiunta del premio')
    }
  }

  // NUOVO: Elimina premio
  const deletePrize = async (prizeId) => {
    if (!confirm('Sei sicuro di voler eliminare questo premio?')) return

    try {
      const { error } = await supabase
        .from('prizes')
        .update({ active: false })
        .eq('id', prizeId)

      if (!error) {
        setPrizes(prizes.filter(p => p.id !== prizeId))
        alert('Premio eliminato!')
      }
    } catch (error) {
      console.log('Errore eliminazione premio:', error)
    }
  }

  // Cerca clienti
  const searchCustomers = async () => {
    if (searchTerm.length < 2) {
      setCustomers([])
      return
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .order('name')

      if (data) setCustomers(data)
    } catch (error) {
      console.log('Errore ricerca:', error)
    }
  }

  useEffect(() => {
    searchCustomers()
  }, [searchTerm])

  // Crea nuovo cliente
  const createCustomer = async () => {
    if (!newCustomerName || !newCustomerPhone) {
      alert('Inserisci nome e telefono')
      return
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{ name: newCustomerName, phone: newCustomerPhone, points: 0 }])
        .select()

      if (data) {
        setSelectedCustomer(data[0])
        setNewCustomerName('')
        setNewCustomerPhone('')
        alert('Cliente creato!')
      }
    } catch (error) {
      console.log('Errore creazione cliente:', error)
      alert('Errore: probabilmente il telefono è già registrato')
    }
  }

  // Aggiungi transazione
  const addTransaction = async () => {
    if (!selectedCustomer || !transactionAmount) return

    const amount = parseFloat(transactionAmount)
    const pointsEarned = Math.floor(amount * settings.points_per_euro)

    try {
      // Inserisci transazione
      await supabase
        .from('transactions')
        .insert([{
          customer_id: selectedCustomer.id,
          amount: amount,
          points_earned: pointsEarned,
          type: 'purchase'
        }])

      // Aggiorna punti cliente
      const newPoints = selectedCustomer.points + pointsEarned
      await supabase
        .from('customers')
        .update({ points: newPoints })
        .eq('id', selectedCustomer.id)

      setSelectedCustomer({ ...selectedCustomer, points: newPoints })
      setTransactionAmount('')
      alert(`+${pointsEarned} punti guadagnati!`)
    } catch (error) {
      console.log('Errore transazione:', error)
    }
  }

  // MODIFICATO: Riscatta premio specifico
  const redeemPrize = async (prize) => {
    if (!selectedCustomer || selectedCustomer.points < prize.points_cost) return

    try {
      // Inserisci transazione riscatto
      await supabase
        .from('transactions')
        .insert([{
          customer_id: selectedCustomer.id,
          amount: 0,
          points_earned: -prize.points_cost,
          type: 'redeem'
        }])

      // Aggiorna punti cliente
      const newPoints = selectedCustomer.points - prize.points_cost
      await supabase
        .from('customers')
        .update({ points: newPoints })
        .eq('id', selectedCustomer.id)

      setSelectedCustomer({ ...selectedCustomer, points: newPoints })
      alert(`${prize.name} riscattato! 🎉`)
    } catch (error) {
      console.log('Errore riscatto:', error)
    }
  }

  return (
    <div className="app">
      <header className="header">
  <div className="header-content">
    <img 
      src="https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png" 
      alt="Sapori e Colori Logo" 
      className="header-logo"
    />
    <div className="header-text">
      <h1>Sapori & Colori Fidelity</h1>

    </div>
  </div>
</header>

      <div className="tabs">
        <button 
          className={activeTab === 'customer' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('customer')}
        >
          👤 Cliente
        </button>
        <button 
          className={activeTab === 'admin' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('admin')}
        >
          ⚙️ Gestione
        </button>
      </div>

      {activeTab === 'customer' && (
        <div className="screen">
          <div className="search-section">
            <input
              type="text"
              placeholder="Cerca cliente per nome o telefono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {customers.length > 0 && (
            <div className="customers-list">
              {customers.map((customer) => (
                <div 
                  key={customer.id} 
                  className="customer-item"
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <div>
                    <h4>{customer.name}</h4>
                    <p>{customer.phone}</p>
                  </div>
                  <div className="points-badge">{customer.points} punti</div>
                </div>
              ))}
            </div>
          )}

          <div className="new-customer">
            <h3>Nuovo Cliente</h3>
            <input
              type="text"
              placeholder="Nome"
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
            />
            <input
              type="tel"
              placeholder="Telefono"
              value={newCustomerPhone}
              onChange={(e) => setNewCustomerPhone(e.target.value)}
            />
            <button onClick={createCustomer} className="btn-primary">
              Crea Cliente
            </button>
          </div>

          {selectedCustomer && (
            <div className="selected-customer">
              <div className="customer-card">
                <h2>{selectedCustomer.name}</h2>
                <div className="points-display">{selectedCustomer.points}</div>
                <p>Punti Fedeltà</p>
              </div>

              <div className="transaction-section">
                <h3>Nuova Spesa</h3>
                <div className="quick-amounts">
                  <button onClick={() => setTransactionAmount('2.25')}>Pane 500g - €2,25</button>
                  <button onClick={() => setTransactionAmount('4.50')}>Pane 1kg - €4,50</button>
                  <button onClick={() => setTransactionAmount('1.80')}>Cornetto - €1,80</button>
                </div>
                <input
                  type="number"
                  placeholder="Importo €"
                  value={transactionAmount}
                  onChange={(e) => setTransactionAmount(e.target.value)}
                  step="0.01"
                />
                <button onClick={addTransaction} className="btn-primary">
                  Registra Spesa
                </button>

                {/* NUOVO: Lista premi disponibili */}
                <div className="prizes-section">
                  <h3>🎁 Premi Disponibili</h3>
                  <div className="prizes-list">
                    {prizes.map((prize) => (
                      <div key={prize.id} className="prize-item">
                        <div className="prize-info">
                          <h4>{prize.name}</h4>
                          <p>{prize.description}</p>
                          <span className="prize-cost">{prize.points_cost} punti</span>
                        </div>
                        <button 
                          onClick={() => redeemPrize(prize)}
                          className="btn-redeem"
                          disabled={selectedCustomer.points < prize.points_cost}
                        >
                          Riscatta
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'admin' && (
        <div className="screen">
          <h2>Pannello Amministratore</h2>
          
          <div className="admin-section">
            <h3>📊 Statistiche di Oggi</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-number">12</div>
                <div className="stat-label">Clienti Serviti</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">47</div>
                <div className="stat-label">Punti Distribuiti</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">3</div>
                <div className="stat-label">Premi Riscattati</div>
              </div>
            </div>
          </div>

          <div className="admin-section">
            <h3>⚙️ Configurazione Sistema</h3>
            <div className="config-item">
              <label>Punti per ogni €1 speso:</label>
              <input 
                type="number" 
                value={settings.points_per_euro} 
                onChange={(e) => setSettings({...settings, points_per_euro: parseInt(e.target.value)})}
                min="1" 
                max="10" 
              />
            </div>
            <div className="config-item">
              <label>Punti necessari per premio:</label>
              <input 
                type="number" 
                value={settings.points_for_prize} 
                onChange={(e) => setSettings({...settings, points_for_prize: parseInt(e.target.value)})}
                min="5" 
                max="100" 
              />
            </div>
            <button className="btn-primary" onClick={saveSettings}>Salva Configurazione</button>
          </div>

          {/* NUOVO: Gestione Premi */}
          <div className="admin-section">
            <h3>🎁 Gestione Premi</h3>
            
            <div className="add-prize">
              <h4>Aggiungi Nuovo Premio</h4>
              <input
                type="text"
                placeholder="Nome premio (es. Cornetto Gratis)"
                value={newPrizeName}
                onChange={(e) => setNewPrizeName(e.target.value)}
              />
              <input
                type="text"
                placeholder="Descrizione (es. Un cornetto della casa)"
                value={newPrizeDescription}
                onChange={(e) => setNewPrizeDescription(e.target.value)}
              />
              <input
                type="number"
                placeholder="Costo in punti"
                value={newPrizeCost}
                onChange={(e) => setNewPrizeCost(e.target.value)}
                min="1"
              />
              <button onClick={addPrize} className="btn-primary">Aggiungi Premio</button>
            </div>

            <div className="prizes-management">
              <h4>Premi Esistenti</h4>
              {prizes.map((prize) => (
                <div key={prize.id} className="prize-management-item">
                  <div>
                    <strong>{prize.name}</strong> - {prize.points_cost} punti
                    <br />
                    <small>{prize.description}</small>
                  </div>
                  <button 
                    onClick={() => deletePrize(prize.id)}
                    className="btn-danger"
                  >
                    Elimina
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-section">
            <h3>👥 Gestione Manuale Punti</h3>
            <div className="manual-points">
              <input type="text" placeholder="Nome cliente" />
              <input type="number" placeholder="Punti da aggiungere/rimuovere" />
              <button className="btn-primary">Modifica Punti</button>
            </div>
          </div>

          <div className="admin-section">
            <h3>📈 Top Clienti</h3>
            <div className="top-customers">
              <div className="customer-rank">
                <span>1. lino</span>
                <span>50 punti</span>
              </div>
              <div className="customer-rank">
                <span>2. Mario Rossi</span>
                <span>36 punti</span>
              </div>
              <div className="customer-rank">
                <span>3. Anna Verdi</span>
                <span>15 punti</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App