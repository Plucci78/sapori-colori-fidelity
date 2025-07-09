import { memo } from 'react';
import { Mail } from 'lucide-react'; // Importa l'icona
import EmailQuotaWidget from './EmailQuotaWidget';

const EmailHeader = memo(({ emailStats, showNotification }) => {
  return (
    <header className="email-header">
      <div className="email-header-info">
        <Mail size={24} className="text-slate-500" /> {/* Icona professionale */}
        <div>
          <h1 className="email-header-title">Email Marketing</h1>
          <p className="email-header-subtitle">Crea e gestisci le tue campagne</p>
        </div>
      </div>
      <div className="email-header-widget">
        <EmailQuotaWidget showNotification={showNotification} compact={true} />
      </div>
    </header>
  );
});

EmailHeader.displayName = 'EmailHeader';
export default EmailHeader;