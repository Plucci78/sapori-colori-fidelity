import { supabase } from '../supabase';
import emailjs from '@emailjs/browser';

const EMAIL_CONFIG = {
  serviceId: 'your_service_id',
  templateId: 'your_template_id',
};

export const emailService = {
  sendEmail: async (recipient, subject, content) => {
    try {
      const templateParams = {
        to_name: recipient.name,
        to_email: recipient.email,
        subject: subject,
        message_html: content,
        reply_to: 'your_reply_to_email@example.com',
      };

      const response = await emailjs.send(EMAIL_CONFIG.serviceId, EMAIL_CONFIG.templateId, templateParams);
      return response;
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }
  },

  logEmailCampaign: async (subject, content, recipientsCount) => {
    try {
      const { data, error } = await supabase
        .from('email_campaigns')
        .insert({
          subject: subject,
          content_html: content,
          recipients_count: recipientsCount,
          status: 'sent',
          sent_at: new Date().toISOString(),
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error logging email campaign:', error);
      throw new Error('Failed to log email campaign');
    }
  },
};