import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { generatePrivacyPDF } from '../../utils/privacyUtils';

const buttonStyle = "w-full text-white px-4 py-2 rounded-lg transition-colors duration-200 ease-in-out";
const activeButton = `${buttonStyle} bg-green-600 hover:bg-green-700`;
const inactiveButton = `${buttonStyle} bg-gray-400 hover:bg-gray-500`;
const disabledButton = `${buttonStyle} bg-gray-300 cursor-not-allowed`;

function PrivacyManagement({ customer, showNotification }) {
  const [activeTab, setActiveTab] = useState('consents');
  const [consentRecord, setConsentRecord] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadConsentRecord = useCallback(async () => {
    if (!customer?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('consent_records')
        .select('*')
        .eq('customer_id', customer.id);
      
      if (error) throw error;
      setConsentRecord(data || []);
    } catch (error) {
      showNotification(`❌ Errore caricamento consensi: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [customer?.id, showNotification]);

  useEffect(() => {
    loadConsentRecord();
  }, [loadConsentRecord]);

  const handleConsentChange = async (consentType, consentGiven) => {
    try {
      // Prima controlla se esiste già un record per questo tipo di consenso
      const { data: existingRecord, error: selectError } = await supabase
        .from('consent_records')
        .select('*')
        .eq('customer_id', customer.id)
        .eq('consent_type', consentType)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError;
      }

      let result;
      if (existingRecord) {
        // Aggiorna il record esistente
        result = await supabase
          .from('consent_records')
          .update({
            consent_given: consentGiven,
            consent_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecord.id);
      } else {
        // Crea un nuovo record
        result = await supabase
          .from('consent_records')
          .insert({
            customer_id: customer.id,
            consent_type: consentType,
            consent_given: consentGiven,
            consent_date: new Date().toISOString(),
            operator_id: 'current_user'
          });
      }

      if (result.error) throw result.error;
      
      showNotification(`✅ Consenso ${consentType.replace(/_/g, ' ')} ${consentGiven ? 'attivato' : 'revocato'}`, 'success');
      loadConsentRecord();
    } catch (error) {
      showNotification(`❌ Errore aggiornamento: ${error.message}`, 'error');
    }
  };

  const handleDownloadPrivacy = () => {
    const signature = consentRecord.find(c => c.consent_type === 'fidelity')?.digital_signature;
    generatePrivacyPDF(customer, consentRecord, signature);
    showNotification('📄 PDF generato con successo!', 'success');
  };

  const getConsent = (type) => consentRecord.find(c => c.consent_type === type) || { consent_given: false };

  const ConsentRow = ({ type, label }) => {
    const consent = getConsent(type);
    const isGiven = consent.consent_given;
    
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-gray-800">{label}</h4>
          <p className={`text-sm ${isGiven ? 'text-green-600' : 'text-red-600'}`}>
            Stato: {isGiven ? '✅ Acconsentito' : '❌ Negato'}
            {consent.consent_date && ` il ${new Date(consent.consent_date).toLocaleDateString('it-IT')}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => handleConsentChange(type, true)} 
            disabled={isGiven}
            className={isGiven ? disabledButton : activeButton}
          >
            Attiva
          </button>
          <button 
            onClick={() => handleConsentChange(type, false)} 
            disabled={!isGiven}
            className={!isGiven ? disabledButton : inactiveButton.replace('gray-400', 'red-600').replace('gray-500', 'red-700')}
          >
            Revoca
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-body text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto"></div>
          <p className="mt-2 text-secondary">Caricamento consensi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title flex items-center gap-3">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m0 6H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Gestione Privacy
        </h2>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('consents')} className={`btn ${activeTab === 'consents' ? 'btn-primary' : 'btn-secondary'}`}>Gestione Consensi</button>
          <button onClick={() => setActiveTab('document')} className={`btn ${activeTab === 'document' ? 'btn-primary' : 'btn-secondary'}`}>Documento Privacy</button>
        </div>
      </div>
      <div className="card-body space-y-4">
        {activeTab === 'consents' && (
          <>
            <ConsentRow type="fidelity" label="Tessera Fedeltà (Obbligatorio)" />
            <ConsentRow type="email_marketing" label="Marketing via Email" />
            <ConsentRow type="sms_marketing" label="Marketing via SMS" />
            <ConsentRow type="profiling" label="Profilazione per Offerte" />
          </>
        )}
        {activeTab === 'document' && (
          <div className="text-center">
            <button onClick={handleDownloadPrivacy} className="btn btn-primary flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Scarica Modulo Privacy Firmato
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PrivacyManagement;
