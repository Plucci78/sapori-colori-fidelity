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
  <div className="p-6">
    <div className="dashboard-header flex items-center gap-4 mb-8 p-6 rounded-xl bg-gradient-to-r from-yellow-100 to-orange-100 shadow">
      <div className="text-5xl">🎁</div>
      <div>
        <h1 className="text-3xl font-extrabold text-brand mb-1">Gestione Premi</h1>
        <p className="text-secondary">Crea e gestisci il catalogo premi</p>
      </div>
    </div>

    {/* Card aggiunta nuovo premio */}
    <div className="card mb-6">
      <div className="card-header">
        <h2 className="card-title flex items-center gap-3">
          <span role="img" aria-label="gift">🎁</span>
          Aggiungi Nuovo Premio
        </h2>
      </div>
      <div className="card-body">
        <div className="space-y-4 max-w-md">
          <input
            type="text"
            placeholder="Nome premio (es. Cornetto Gratis)"
            value={newPrizeName}
            onChange={(e) => setNewPrizeName(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand focus:outline-none transition-colors"
          />
          <input
            type="text"
            placeholder="Descrizione (es. Un cornetto della casa)"
            value={newPrizeDescription}
            onChange={(e) => setNewPrizeDescription(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand focus:outline-none transition-colors"
          />
          <input
            type="number"
            placeholder="Costo in GEMME"
            value={newPrizeCost}
            onChange={(e) => setNewPrizeCost(e.target.value)}
            min="1"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand focus:outline-none transition-colors"
          />
          <button onClick={addPrize} className="btn btn-primary w-full py-4 text-lg flex items-center justify-center gap-2">
            <span className="icon icon-plus"></span>
            Aggiungi Premio
          </button>
        </div>
      </div>
    </div>

    {/* Card premi attivi */}
    <div className="card">
      <div className="card-header">
        <h2 className="card-title flex items-center gap-3">
          <span className="gemma-icon-small"></span>
          Premi Attivi
        </h2>
      </div>
      <div className="card-body">
        <div className="grid grid-auto gap-4">
          {prizes.map((prize) => (
            <div key={prize.id} className="prize-management-card p-6 bg-yellow-50 rounded-xl border-2 border-orange-200 flex justify-between items-center shadow-sm">
              <div>
                <h4 className="font-bold text-brand text-xl mb-1 flex items-center gap-2">
                  <span className="gemma-icon-small"></span>
                  {prize.name}
                </h4>
                <p className="text-secondary mb-2">{prize.description}</p>
                <span className="inline-block bg-orange-200 text-orange-800 px-3 py-1 rounded-full font-semibold text-sm">
                  {prize.points_cost} GEMME
                </span>
              </div>
              <button
                onClick={() => deletePrize(prize.id)}
                className="btn btn-danger flex items-center gap-2"
              >
                <span className="icon icon-trash"></span>
                Elimina
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
))

PrizesView.displayName = 'PrizesView'

export default PrizesView