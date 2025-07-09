import { supabase } from '../supabase';

const emailQuotaService = {
  checkQuota: async () => {
    const { data, error } = await supabase
      .from('email_quota')
      .select('remaining, total')
      .single();

    if (error) {
      throw new Error('Error fetching email quota: ' + error.message);
    }

    return data;
  },

  canSendEmails: async (emailCount) => {
    const quota = await emailQuotaService.checkQuota();
    const remaining = quota.remaining;

    if (remaining >= emailCount) {
      return { allowed: true };
    }

    return {
      allowed: false,
      message: `Quota insufficiente: puoi inviare solo ${remaining} email.`,
      warning: `Sei vicino al limite della tua quota di ${quota.total} email.`,
    };
  },

  updateQuota: async (emailsSent) => {
    const { data, error } = await supabase
      .from('email_quota')
      .update({ remaining: supabase.raw('remaining - ?', emailsSent) })
      .eq('id', 1) // Assuming there's only one quota record
      .select('remaining')
      .single();

    if (error) {
      throw new Error('Error updating email quota: ' + error.message);
    }

    return data.remaining;
  },
};

export default emailQuotaService;