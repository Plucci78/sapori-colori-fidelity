import { useState, useCallback } from 'react';
import { supabase } from '../supabase';
import { emailQuotaService } from '../services/emailQuotaService';
import emailjs from '@emailjs/browser';

const useEmailCampaign = (showNotification) => {
  const [isSending, setIsSending] = useState(false);

  const handleSendCampaign = useCallback(async (emailSubject, emailContent, selectedSegments, customers) => {
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

    setIsSending(true);

    try {
      const segmentFilters = {
        all: () => true,
        vip: c => c.points >= 100,
        active: c => c.points > 0,
      };
      const recipients = customers.filter(c =>
        c.is_active && c.marketing_accepted && c.email && selectedSegments.some(seg => segmentFilters[seg]?.(c))
      );

      if (recipients.length === 0) {
        showNotification('Nessun destinatario trovato per i segmenti selezionati', 'warning');
        setIsSending(false);
        return;
      }

      const canSend = await emailQuotaService.canSendEmails(recipients.length);
      if (!canSend.allowed) {
        showNotification(canSend.message, 'error');
        setIsSending(false);
        return;
      }
      if (canSend.warning) {
        showNotification(canSend.warning, 'warning');
      }

      showNotification(`🚀 Invio di ${recipients.length} email in corso...`, 'info');

      const { data: campaign, error: campaignError } = await supabase
        .from('email_campaigns')
        .insert({
          subject: emailSubject,
          content_html: emailContent,
          status: 'sending',
          recipients_segment: { type: 'segment', value: selectedSegments },
          recipients_count: recipients.length
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      let successCount = 0;
      for (const customer of recipients) {
        try {
          const personalizedSubject = emailSubject.replace(/{{nome}}/g, customer.name).replace(/{{gemme}}/g, customer.points);
          const personalizedContent = emailContent.replace(/{{nome}}/g, customer.name).replace(/{{gemme}}/g, customer.points);

          const templateParams = {
            to_name: customer.name,
            to_email: customer.email,
            subject: personalizedSubject,
            message_html: personalizedContent,
            reply_to: 'saporiecolori.b@gmail.com'
          };

          await emailjs.send(EMAIL_CONFIG.serviceId, EMAIL_CONFIG.templateId, templateParams);
          successCount++;
          await new Promise(res => setTimeout(res, 300));
        } catch (error) {
          console.error(`Errore invio email a ${customer.email}:`, error);
        }
      }

      await supabase.from('email_campaigns').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', campaign.id);
      showNotification(`✅ Campagna inviata a ${successCount}/${recipients.length} destinatari!`, 'success');
    } catch (error) {
      console.error('Errore invio campagna:', error);
      showNotification('❌ Errore grave durante l\'invio della campagna: ' + error.message, 'error');
    } finally {
      setIsSending(false);
    }
  }, [showNotification]);

  return { isSending, handleSendCampaign };
};

export default useEmailCampaign;