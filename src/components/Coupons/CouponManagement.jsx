import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabase'
import './CouponManagement.css'; // Import the new CSS file  

const CouponManagement = ({ showNotification }) => {
  const [coupons, setCoupons] = useState([])
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    description: '',
    value: '',
    type: 'percentage',
    expiry_date: '',
  })
  const [allCustomers, setAllCustomers] = useState([]) // Tutti i clienti
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]) // Clienti selezionati individualmente
  const [selectedSegment, setSelectedSegment] = useState('generic') // Segmento selezionato: 'generic', 'all', 'vip', 'active', 'inactive', 'individual'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [couponFilter, setCouponFilter] = useState('all'); // 'all', 'active', 'expired'
  const [customerSearchFilter, setCustomerSearchFilter] = useState(''); // Ricerca testuale per cliente (per visualizzazione coupon)
  const [customerAssignFilter, setCustomerAssignFilter] = useState(''); // NUOVA: Ricerca per assegnazione clienti
  const [showDeleteTooltip, setShowDeleteTooltip] = useState(null); // Stato per il tooltip
  const [expandedDescriptions, setExpandedDescriptions] = useState({}); // Stato per le descrizioni espanse

  const loadAllCustomers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, phone, points')
        .order('name')
      if (error) throw error
      setAllCustomers(data)
    } catch (err) {
      console.error('Errore caricamento clienti:', err)
      showNotification('❌ Errore caricamento clienti', 'error')
    }
  }, [showNotification])

  const loadCoupons = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Modifica la query per includere informazioni sul cliente
      const { data, error } = await supabase
        .from('coupons')
        .select(`
          *,
          customers (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCoupons(data)
    } catch (err) {
      console.error('Errore caricamento coupon:', err)
      setError('Impossibile caricare i coupon.')
      showNotification('❌ Errore caricamento coupon', 'error')
    } finally {
      setLoading(false)
    }
  }, [showNotification])

  useEffect(() => {
    loadCoupons()
    loadAllCustomers()
  }, [loadCoupons, loadAllCustomers])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setNewCoupon(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleCreateCoupon = async (customerIds = []) => {
    if (!newCoupon.code || !newCoupon.description || !newCoupon.value || !newCoupon.expiry_date) {
      showNotification('Compila tutti i campi obbligatori del coupon.', 'warning')
      return
    }

    setLoading(true)
    try {
      // Usa il codice base fornito dall'utente
      const baseCode = newCoupon.code.toUpperCase();
      
      const couponsToInsert = customerIds.length > 0 
        ? customerIds.map(id => {
            // Crea un suffisso univoco usando l'ID cliente e timestamp
            const uniqueSuffix = id.substring(0, 6);
            return { 
              ...newCoupon,
              code: `${baseCode}-${uniqueSuffix}`,
              value: parseFloat(newCoupon.value),
              customer_id: id,
              expiry_date: newCoupon.expiry_date + 'T23:59:59Z'
            };
          })
        : [{ 
            ...newCoupon,
            code: baseCode,
            value: parseFloat(newCoupon.value),
            customer_id: null,
            expiry_date: newCoupon.expiry_date + 'T23:59:59Z'
          }];

      const { error } = await supabase
        .from('coupons')
        .insert(couponsToInsert);

      if (error) throw error;

      // Messaggio appropriato a seconda del numero di coupon creati
      const successMessage = customerIds.length > 1
        ? `✅ Creati ${customerIds.length} coupon basati su ${baseCode}`
        : `✅ Coupon ${baseCode} creato con successo!`;
        
      showNotification(successMessage, 'success');
      setNewCoupon({
        code: '',
        description: '',
        value: '',
        type: 'percentage',
        expiry_date: '',
      });
      loadCoupons();
    } catch (err) {
      console.error('Errore creazione coupon:', err);
      setError('Impossibile creare il coupon.');
      showNotification('❌ Errore creazione coupon', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteCoupon = async (couponId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo coupon?')) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', couponId)

      if (error) throw error

      showNotification('✅ Coupon eliminato con successo!', 'success')
      loadCoupons()
    } catch (err) {
      console.error('Errore eliminazione coupon:', err)
      setError('Impossibile eliminare il coupon.')
      showNotification('❌ Errore eliminazione coupon', 'error')
    } finally {
      setLoading(false)
    }
  }

  const getCouponStatus = (coupon) => {
    const today = new Date();
    const expiryDate = new Date(coupon.expiry_date);
    
    if (today > expiryDate) {
      return 'expired';
    }
    
    // Se hai un campo status nel DB
    return coupon.status || 'active';
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-brand mb-6">Gestione Coupon</h1>

      {/* Form Creazione Nuovo Coupon */}
      <div className="card mb-6">
        <div className="card-header">
          <h2 className="card-title">Crea Nuovo Coupon</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="form-label">Codice Coupon</label>
              <input
                type="text"
                name="code"
                value={newCoupon.code}
                onChange={handleInputChange}
                className="form-input"
                placeholder="ES: SCONTO10"
                style={{ color: '#1f2937' }}
              />
              {selectedSegment !== 'generic' && (
                <p className="text-xs text-gray-500 mt-1">
                  Nota: Per assegnazioni multiple, al codice base verrà aggiunto un suffisso unico per ogni cliente (es. SCONTO10-ABC123).
                </p>
              )}
            </div>
            <div>
              <label className="form-label">Descrizione</label>
              <input
                type="text"
                name="description"
                value={newCoupon.description}
                onChange={handleInputChange}
                className="form-input"
                placeholder="ES: 10% di sconto sul pane"
                style={{ color: '#1f2937' }}
              />
            </div>
            <div>
              <label className="form-label">Valore</label>
              <input
                type="number"
                name="value"
                value={newCoupon.value}
                onChange={handleInputChange}
                className="form-input"
                placeholder="ES: 10 (per 10% o 10€)"
                style={{ color: '#1f2937' }}
              />
            </div>
            <div>
              <label className="form-label">Tipo</label>
              <select
                name="type"
                value={newCoupon.type}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value="percentage">Percentuale (%)</option>
                <option value="fixed_amount">Importo Fisso (€)</option>
                <option value="free_product">Prodotto Gratuito</option>
              </select>
            </div>
            <div>
              <label className="form-label">Data Scadenza</label>
              <input
                type="date"
                name="expiry_date"
                value={newCoupon.expiry_date}
                onChange={handleInputChange}
                className="form-input"
                style={{ color: '#1f2937' }}
              />
            </div>
          </div>

          {/* Sezione Assegnazione Clienti */}
          <div className="mb-4 p-4 border rounded-lg bg-gray-50">
            <h3 className="font-semibold mb-3">Assegna a Clienti:</h3>
            <div className="mb-3">
              <label className="form-label">Seleziona Gruppo:</label>
              <select
                value={selectedSegment}
                onChange={(e) => {
                  setSelectedSegment(e.target.value)
                  setSelectedCustomerIds([]) // Resetta selezione individuale
                }}
                className="form-select"
              >
                <option value="generic">Coupon Generico (non assegnato a nessuno)</option>
                <option value="all">Tutti i Clienti</option>
                <option value="vip">Clienti VIP (&gt;= 100 punti)</option>
                <option value="active">Clienti Attivi (&gt; 0 punti)</option>
                <option value="inactive">Clienti Inattivi (0 punti)</option>
                <option value="individual">Seleziona Individualmente</option>
              </select>
            </div>

            {selectedSegment === 'individual' && (
              <div className="mb-3">
                <label className="form-label">Cerca e Seleziona Clienti:</label>
                <input
                  type="text"
                  placeholder="Cerca per nome, email o telefono..."
                  className="form-input mb-2"
                  style={{ color: '#1f2937' }}
                  value={customerAssignFilter}
                  onChange={(e) => setCustomerAssignFilter(e.target.value)}
                />
                <div className="customer-selection-list" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '5px', padding: '10px' }}>
                  {allCustomers
                    .filter(customer => {
                      if (!customerAssignFilter) return true;
                      const searchTerm = customerAssignFilter.toLowerCase();
                      return (
                        customer.name.toLowerCase().includes(searchTerm) ||
                        (customer.email && customer.email.toLowerCase().includes(searchTerm)) ||
                        (customer.phone && customer.phone.includes(searchTerm))
                      );
                    })
                    .map(customer => (
                    <div key={customer.id} className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id={`customer-${customer.id}`}
                        checked={selectedCustomerIds.includes(customer.id)}
                        onChange={() => {
                          setSelectedCustomerIds(prev => 
                            prev.includes(customer.id) 
                              ? prev.filter(id => id !== customer.id)
                              : [...prev, customer.id]
                          )
                        }}
                        className="mr-2"
                      />
                      <label htmlFor={`customer-${customer.id}`}>{customer.name} ({customer.email || customer.phone})</label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              let customerIdsToAssign = [];
              let customerCount = 0;
              
              if (selectedSegment === 'all') {
                customerIdsToAssign = allCustomers.map(c => c.id);
                customerCount = allCustomers.length;
              } else if (selectedSegment === 'vip') {
                const vipCustomers = allCustomers.filter(c => c.points >= 100);
                customerIdsToAssign = vipCustomers.map(c => c.id);
                customerCount = vipCustomers.length;
              } else if (selectedSegment === 'active') {
                const activeCustomers = allCustomers.filter(c => c.points > 0);
                customerIdsToAssign = activeCustomers.map(c => c.id);
                customerCount = activeCustomers.length;
              } else if (selectedSegment === 'inactive') {
                const inactiveCustomers = allCustomers.filter(c => c.points === 0);
                customerIdsToAssign = inactiveCustomers.map(c => c.id);
                customerCount = inactiveCustomers.length;
              } else if (selectedSegment === 'individual') {
                customerIdsToAssign = selectedCustomerIds;
                customerCount = selectedCustomerIds.length;
              }
              
              // Aggiungi una conferma se ci sono molti clienti
              if (customerCount > 10) {
                if (!window.confirm(`Stai per creare ${customerCount} coupon. Continuare?`)) {
                  return;
                }
              }
              
              handleCreateCoupon(customerIdsToAssign);
            }}
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Creazione...' : 'Crea Coupon'}
            {selectedSegment !== 'generic' && selectedSegment !== 'individual' && ` per ${
              selectedSegment === 'all' ? allCustomers.length : 
              selectedSegment === 'vip' ? allCustomers.filter(c => c.points >= 100).length :
              selectedSegment === 'active' ? allCustomers.filter(c => c.points > 0).length :
              allCustomers.filter(c => c.points === 0).length
            } clienti`}
            {selectedSegment === 'individual' && ` per ${selectedCustomerIds.length} clienti selezionati`}
          </button>
        </div>
      </div>

      {/* Lista Coupon Esistenti */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Coupon Esistenti</h2>
        </div>
        <div className="card-body">
          {loading && <p>Caricamento coupon...</p>}
          {error && <p className="text-danger">{error}</p>}
          {!loading && coupons.length === 0 && <p>Nessun coupon trovato.</p>}
          
          {/* Filtro Coupon */}
          <div className="filter-controls" style={{ marginBottom: '15px' }}>
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <label htmlFor="coupon-filter" className="mr-2">Stato:</label>
                <select 
                  id="coupon-filter"
                  value={couponFilter}
                  onChange={(e) => setCouponFilter(e.target.value)}
                  className="form-select"
                  style={{ width: 'auto', display: 'inline-block' }}
                >
                  <option value="all">Tutti i coupon</option>
                  <option value="active">Solo attivi</option>
                  <option value="expired">Solo scaduti</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="customer-search" className="mr-2">Cerca Cliente:</label>
                <input
                  id="customer-search"
                  type="text"
                  value={customerSearchFilter}
                  onChange={(e) => setCustomerSearchFilter(e.target.value)}
                  className="form-input"
                  placeholder="Digita il nome del cliente..."
                  style={{ 
                    width: 'auto', 
                    display: 'inline-block', 
                    minWidth: '200px',
                    color: '#1f2937'
                  }}
                />
                {customerSearchFilter && (
                  <button
                    onClick={() => setCustomerSearchFilter('')}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                    style={{ fontSize: '18px' }}
                    title="Cancella ricerca"
                  >
                    ✕
                  </button>
                )}
              </div>
              
              <div>
                <button
                  onClick={() => {
                    setCouponFilter('all');
                    setCustomerSearchFilter('');
                    // NON resettiamo customerAssignFilter qui perché è per l'assegnazione
                  }}
                  className="btn btn-secondary text-sm"
                  style={{ padding: '6px 12px' }}
                >
                  Resetta Filtri
                </button>
              </div>
            </div>
          </div>

          {!loading && coupons.length > 0 && (
            <>
              {/* Contatore risultati filtrati */}
              <div className="mb-4 text-sm text-gray-600">
                {(() => {
                  const filteredCoupons = coupons.filter(coupon => {
                    const today = new Date();
                    const expiryDate = new Date(coupon.expiry_date);
                    const isExpired = today > expiryDate;
                    
                    let statusMatch = true;
                    if (couponFilter === 'active') statusMatch = !isExpired;
                    if (couponFilter === 'expired') statusMatch = isExpired;
                    
                    // Filtro per ricerca cliente
                    let customerMatch = true;
                    if (customerSearchFilter.trim()) {
                      const searchTerm = customerSearchFilter.toLowerCase().trim();
                      if (coupon.customers?.name) {
                        customerMatch = coupon.customers.name.toLowerCase().includes(searchTerm);
                      } else {
                        // Se non c'è un cliente assegnato, non mostrarlo quando si cerca
                        customerMatch = false;
                      }
                    }
                    
                    return statusMatch && customerMatch;
                  });
                  
                  return `Mostrando ${filteredCoupons.length} di ${coupons.length} coupon${customerSearchFilter.trim() ? ` - Ricerca: "${customerSearchFilter}"` : ''}`;
                })()}
              </div>
              
              <div className="coupon-cards-container">
              {coupons
                .filter(coupon => {
                  // Filtro per stato del coupon
                  const today = new Date();
                  const expiryDate = new Date(coupon.expiry_date);
                  const isExpired = today > expiryDate;
                  
                  let statusMatch = true;
                  if (couponFilter === 'active') statusMatch = !isExpired;
                  if (couponFilter === 'expired') statusMatch = isExpired;
                  
                  // Filtro per ricerca cliente
                  let customerMatch = true;
                  if (customerSearchFilter.trim()) {
                    const searchTerm = customerSearchFilter.toLowerCase().trim();
                    if (coupon.customers?.name) {
                      customerMatch = coupon.customers.name.toLowerCase().includes(searchTerm);
                    } else {
                      // Se non c'è un cliente assegnato, non mostrarlo quando si cerca
                      customerMatch = false;
                    }
                  }
                  
                  return statusMatch && customerMatch;
                })
                .map(coupon => {
                  // Calcola se è vicino alla scadenza (7 giorni)
                  const expiryDate = new Date(coupon.expiry_date);
                  const today = new Date();
                  const daysToExpiry = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));
                  const isExpiringSoon = daysToExpiry <= 7;
                  const isExpired = today > expiryDate;
                  
                  // Determina lo stato del coupon
                  const statusInfo = {
                    active: { label: 'Attivo', color: '#10B981', bgColor: '#ECFDF5' },
                    used: { label: 'Utilizzato', color: '#6B7280', bgColor: '#F3F4F6' },
                    expired: { label: 'Scaduto', color: '#EF4444', bgColor: '#FEF2F2' }
                  };
                  
                  // Usa lo stato o determina in base alla scadenza
                  const status = isExpired ? 'expired' : coupon.status || 'active';
                  const statusStyle = statusInfo[status];
                  
                  return (
                    <div 
                      key={coupon.id} 
                      className={`coupon-card-admin ${
                        daysToExpiry === 0 ? 'expiring-today-card' : 
                        isExpiringSoon && !isExpired ? 'expiring-soon-card' : ''
                      }`}
                    >
                      <div className="coupon-card-header">
                        <span 
                          className="coupon-status-badge"
                          style={{ 
                            backgroundColor: statusStyle.bgColor, 
                            color: statusStyle.color,
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                          }}
                        >
                          {statusStyle.label}
                        </span>
                        
                        <button
                          className="coupon-delete-btn"
                          onClick={() => handleDeleteCoupon(coupon.id)}
                          title="Elimina coupon"
                        >
                          Elimina
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                      
                      <div className="coupon-card-content">
                        <div className="coupon-value">
                          {coupon.type === 'percentage' ? (
                            <span>{coupon.value}%</span>
                          ) : coupon.type === 'fixed_amount' ? (
                            <span>{coupon.value}€</span>
                          ) : (
                            <span>🎁</span>
                          )}
                        </div>
                        
                        <h4 className="coupon-code">{coupon.code}</h4>
                        <div className="coupon-description-wrapper">
                          <p className="coupon-description full-text">
                            {coupon.description}
                          </p>
                        </div>
                        
                        <div className="coupon-meta">
                          <div className="coupon-type">
                            {coupon.type === 'percentage' ? (
                              <span>Percentuale</span>
                            ) : coupon.type === 'fixed_amount' ? (
                              <span>Importo Fisso</span>
                            ) : (
                              <span>Prodotto Gratuito</span>
                            )}
                          </div>
                          
                          <div 
                            className={`coupon-expiry ${
                              daysToExpiry === 0 ? 'coupon-expiry-today' : 
                              isExpiringSoon && !isExpired ? 'coupon-expiry-soon' : ''
                            }`}
                          >
                            {isExpired ? (
                              <span>❌ SCADUTO il: {new Date(coupon.expiry_date).toLocaleDateString('it-IT')}</span>
                            ) : daysToExpiry === 0 ? (
                              <span>🚨 SCADE OGGI! UTILIZZALO SUBITO! 🚨</span>
                            ) : isExpiringSoon ? (
                              <span>⚠️ SCADE TRA {daysToExpiry} GIORNI! ⚠️</span>
                            ) : (
                              <span>Scade: {new Date(coupon.expiry_date).toLocaleDateString('it-IT')}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="coupon-customer">
                          {coupon.customer_id ? (
                            <div className="assigned-customer">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                              </svg>
                              <span>
                                {coupon.customers?.name 
                                  ? coupon.customers.name
                                  : `Cliente ID: ${coupon.customer_id.substring(0, 8)}...`}
                              </span>
                            </div>
                          ) : (
                            <div className="generic-coupon">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                              </svg>
                              <span>Coupon Generico</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default CouponManagement