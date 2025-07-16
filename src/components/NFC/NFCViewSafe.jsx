// NFCView semplificato senza dipendenze problematiche
import { useState } from 'react'
import { supabase } from '../../supabase'

const NFCViewSafe = ({ showNotification }) => {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(false)

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name')
      
      if (error) throw error
      setCustomers(data || [])
      showNotification('Clienti caricati!', 'success')
    } catch (error) {
      console.error('Errore caricamento clienti:', error)
      showNotification('Errore caricamento clienti', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ 
        background: 'linear-gradient(135deg, #B8860B 0%, #DAA520 50%, #CD853F 100%)',
        color: 'white',
        padding: '20px',
        borderRadius: '16px',
        marginBottom: '24px',
        boxShadow: '0 10px 25px rgba(184, 134, 11, 0.2)'
      }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 'bold' }}>
          🔍 Sistema NFC
        </h1>
        <p style={{ margin: 0, fontSize: '16px', opacity: 0.9 }}>
          Gestione tessere NFC e associazione clienti (Versione Sicura)
        </p>
      </div>

      <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        
        {/* Sezione Caricamento Clienti */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          border: '2px solid #B8860B',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#8B4513' }}>📋 Database Clienti</h3>
          <button
            onClick={loadCustomers}
            disabled={loading}
            style={{
              background: loading ? '#ccc' : 'linear-gradient(135deg, #B8860B, #DAA520)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              width: '100%'
            }}
          >
            {loading ? '⏳ Caricamento...' : '🔄 Carica Clienti'}
          </button>
          
          {customers.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#8B4513' }}>
                <strong>Clienti trovati: {customers.length}</strong>
              </p>
              <div style={{ 
                maxHeight: '200px', 
                overflowY: 'auto',
                border: '1px solid #ddd',
                borderRadius: '6px',
                padding: '8px'
              }}>
                {customers.slice(0, 10).map(customer => (
                  <div key={customer.id} style={{
                    padding: '6px 8px',
                    borderBottom: '1px solid #eee',
                    fontSize: '13px'
                  }}>
                    <strong>{customer.name}</strong> - {customer.points || 0} gemme
                  </div>
                ))}
                {customers.length > 10 && (
                  <div style={{ textAlign: 'center', color: '#666', fontSize: '12px', marginTop: '8px' }}>
                    ... e altri {customers.length - 10} clienti
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sezione Info NFC */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          border: '2px solid #CD853F',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#8B4513' }}>📡 Server NFC</h3>
          <div style={{ 
            background: '#f5f5f5',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '12px'
          }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
              <strong>URL Server:</strong> http://localhost:3001
            </p>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
              <strong>Status:</strong> <span style={{ color: '#dc2626' }}>🔴 Disconnesso (Modalità Sicura)</span>
            </p>
          </div>
          
          <div style={{
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <p style={{ margin: '0', fontSize: '13px', color: '#92400e' }}>
              ⚠️ Questa è una versione semplificata di NFCView che non si connette al server NFC. 
              Utile per testare il database e l'interfaccia.
            </p>
          </div>
        </div>

        {/* Sezione Info Sistema */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          border: '2px solid #B8860B',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          gridColumn: '1 / -1'
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#8B4513' }}>🛠️ Diagnostica Sistema</h3>
          <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '6px' }}>
              <strong style={{ color: '#059669' }}>✅ React Components</strong>
              <br />
              <span style={{ fontSize: '13px', color: '#6b7280' }}>Caricamento componenti OK</span>
            </div>
            <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '6px' }}>
              <strong style={{ color: '#059669' }}>✅ Supabase Connection</strong>
              <br />
              <span style={{ fontSize: '13px', color: '#6b7280' }}>Database accessibile</span>
            </div>
            <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '6px' }}>
              <strong style={{ color: '#dc2626' }}>❌ NFC Service</strong>
              <br />
              <span style={{ fontSize: '13px', color: '#6b7280' }}>Disconnesso per sicurezza</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NFCViewSafe
