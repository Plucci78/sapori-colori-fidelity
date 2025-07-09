import React from 'react';
import { useEmailCampaign } from '../../hooks/useEmailCampaign';

const EmailSendButton = ({ selectedSegments, emailSubject, emailContent, showNotification }) => {
  const { isSending, handleSendCampaign } = useEmailCampaign();

  const handleClick = async () => {
    if (!emailSubject.trim()) {
      showNotification('Compila l\'oggetto della campagna', 'error');
      return;
    }

    if (!emailContent) {
      showNotification('Il contenuto dell\'email non può essere vuoto', 'error');
      return;
    }

    if (selectedSegments.length === 0) {
      showNotification('Seleziona almeno un segmento di destinatari', 'error');
      return;
    }

    await handleSendCampaign();
  };

  return (
    <button 
      className="send-btn-fixed"
      onClick={handleClick}
      disabled={isSending}
    >
      {isSending ? '🚀 Invio in corso...' : '🚀 Invia Email Professionale'}
    </button>
  );
};

export default EmailSendButton;