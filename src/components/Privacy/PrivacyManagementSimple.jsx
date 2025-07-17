import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabase'

const PrivacyManagementSimple = ({ customer, showNotification }) => {
  const [consentRecord, setConsentRecord] = useState(null)
  const [loading, setLoading] = useState(false)

  // Carica i consensi firmati dal Registration Wizard
  const loadConsentRecord = useCallback(async () => {
    if (!customer?.id) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('consent_records')
        .select('*')
        .eq('customer_id', customer.id)
        .order('consent_date', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Errore caricamento consensi:', error)
        showNotification('❌ Errore nel caricamento dei consensi', 'error')
        return
      }

      setConsentRecord(data?.[0] || null)
    } catch (error) {
      console.error('Errore generale caricamento consensi:', error)
      showNotification('❌ Errore nel caricamento dei consensi', 'error')
    } finally {
      setLoading(false)
    }
  }, [customer?.id, showNotification])

  useEffect(() => {
    loadConsentRecord()
  }, [loadConsentRecord])

  // Aggiorna un singolo consenso
  const updateConsent = async (field, value) => {
    if (!consentRecord) {
      showNotification('❌ Nessun consenso trovato per questo cliente', 'error')
      return
    }

    try {
      const { error } = await supabase
        .from('consent_records')
        .update({ 
          [field]: value,
          updated_at: new Date().toISOString()
        })
        .eq('id', consentRecord.id)

      if (error) {
        console.error('Errore aggiornamento consenso:', error)
        showNotification('❌ Errore nell\'aggiornamento del consenso', 'error')
        return
      }

      // Aggiorna lo stato locale
      setConsentRecord(prev => ({
        ...prev,
        [field]: value,
        updated_at: new Date().toISOString()
      }))

      showNotification('✅ Consenso aggiornato con successo!', 'success')
    } catch (error) {
      console.error('Errore generale aggiornamento consenso:', error)
      showNotification('❌ Errore nell\'aggiornamento del consenso', 'error')
    }
  }

  if (loading) {
    return (
      <div className="privacy-management-loading">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="text-sm text-secondary mt-2">Caricamento consensi...</p>
        </div>
      </div>
    )
  }

  if (!consentRecord) {
    return (
      <div className="privacy-management-empty">
        <div className="text-center py-8">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Nessun consenso firmato</h3>
          <p className="text-sm text-gray-500">
            Questo cliente non ha ancora firmato il consenso privacy durante la registrazione.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="privacy-management">
      <div className="privacy-header">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          📋 Consensi Privacy Firmati
        </h3>
        <div className="text-sm text-gray-600 mb-6">
          <p><strong>Firmato il:</strong> {new Date(consentRecord.consent_date).toLocaleDateString('it-IT')} alle {new Date(consentRecord.consent_date).toLocaleTimeString('it-IT')}</p>
          {consentRecord.updated_at && consentRecord.updated_at !== consentRecord.consent_date && (
            <p><strong>Ultimo aggiornamento:</strong> {new Date(consentRecord.updated_at).toLocaleDateString('it-IT')} alle {new Date(consentRecord.updated_at).toLocaleTimeString('it-IT')}</p>
          )}
        </div>
      </div>

      <div className="consent-controls space-y-4">
        {/* Consenso Marketing */}
        <div className="consent-item">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-800">Marketing e Comunicazioni</h4>
              <p className="text-sm text-gray-600">Invio di newsletter e offerte commerciali</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={consentRecord.marketing_consent || false}
                onChange={(e) => updateConsent('marketing_consent', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>
        </div>

        {/* Consenso Newsletter */}
        <div className="consent-item">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-800">Newsletter</h4>
              <p className="text-sm text-gray-600">Aggiornamenti su prodotti e servizi</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={consentRecord.newsletter_consent || false}
                onChange={(e) => updateConsent('newsletter_consent', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>
        </div>

        {/* Consenso Profilazione */}
        <div className="consent-item">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-800">Profilazione</h4>
              <p className="text-sm text-gray-600">Offerte personalizzate basate sui tuoi acquisti</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={consentRecord.profiling_consent || false}
                onChange={(e) => updateConsent('profiling_consent', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Firma digitale */}
      {consentRecord.digital_signature && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">🖋️ Firma Digitale</h4>
          <div className="signature-container bg-white p-3 rounded border max-w-md">
            <img 
              src={consentRecord.digital_signature} 
              alt="Firma digitale" 
              className="max-w-full h-auto"
              style={{ maxHeight: '100px' }}
            />
          </div>
        </div>
      )}

      {/* Info tecnica */}
      <div className="mt-6 text-xs text-gray-500 p-3 bg-gray-100 rounded">
        <p><strong>ID Record:</strong> {consentRecord.id}</p>
        <p><strong>Cliente:</strong> {customer.name} (ID: {customer.id})</p>
      </div>
    </div>
  )
}

export default PrivacyManagementSimple
