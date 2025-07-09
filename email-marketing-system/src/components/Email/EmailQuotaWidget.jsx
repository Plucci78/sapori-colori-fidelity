import React, { useEffect, useState } from 'react';
import { emailQuotaService } from '../../services/emailQuotaService';

const EmailQuotaWidget = ({ showNotification }) => {
  const [quota, setQuota] = useState({ allowed: 0, used: 0, remaining: 0 });

  useEffect(() => {
    const fetchQuota = async () => {
      try {
        const response = await emailQuotaService.getQuota();
        setQuota(response);
      } catch (error) {
        console.error('Error fetching email quota:', error);
        showNotification('❌ Errore nel recupero della quota email', 'error');
      }
    };

    fetchQuota();
  }, [showNotification]);

  return (
    <div className="email-quota-widget">
      <h3>Quota Email</h3>
      <p>Invii totali consentiti: {quota.allowed}</p>
      <p>Invii effettuati: {quota.used}</p>
      <p>Invii rimanenti: {quota.remaining}</p>
      <div className="quota-bar">
        <div
          className="quota-fill"
          style={{ width: `${(quota.used / quota.allowed) * 100}%` }}
        />
      </div>
    </div>
  );
};

export default EmailQuotaWidget;