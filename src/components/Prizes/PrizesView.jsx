import { memo } from 'react'

const PrizesView = memo(({
  newPrizeName,
  setNewPrizeName,
  newPrizeDescription,
  setNewPrizeDescription,
  newPrizeCost,
  setNewPrizeCost,
  addPrize,
  prizes,
  deletePrize
}) => (
  <div className="prizes-container">
    <div className="prizes-header">
      <h1>Gestione Premi</h1>
      <p>Crea e gestisci il catalogo premi</p>
    </div>

    <div className="add-prize-section">
      <h3>➕ Aggiungi Nuovo Premio</h3>
      <div className="add-prize-form">
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
          placeholder="Costo in GEMME"
          value={newPrizeCost}
          onChange={(e) => setNewPrizeCost(e.target.value)}
          min="1"
        />
        <button onClick={addPrize} className="btn-primary">
          Aggiungi Premio
        </button>
      </div>
    </div>

    <div className="current-prizes-section">
      <h3>🎁 Premi Attivi</h3>
      <div className="prizes-management-grid">
        {prizes.map((prize) => (
          <div key={prize.id} className="prize-management-card">
            <div className="prize-content">
              <h4>{prize.name}</h4>
              <p>{prize.description}</p>
              <div className="prize-cost">
                <span className="gemma-icon-small"></span>
                {prize.points_cost} GEMME
              </div>
            </div>
            <div className="prize-actions">
              <button
                onClick={() => deletePrize(prize.id)}
                className="btn-danger"
              >
                Elimina
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
))

PrizesView.displayName = 'PrizesView'

export default PrizesView