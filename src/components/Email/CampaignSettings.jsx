import { memo } from 'react';
import { Mail, Users, Send } from 'lucide-react'; // Importa icone

const CampaignSettings = memo(({
  subject,
  onSubjectChange,
  segments,
  selectedSegments,
  onSegmentToggle,
  onSend,
  isSending,
  isReadyToSend
}) => {
  const handleSegmentClick = (segmentId) => {
    const newSelection = selectedSegments.includes(segmentId)
      ? selectedSegments.filter(id => id !== segmentId)
      : [...selectedSegments, segmentId];
    onSegmentToggle(newSelection);
  };

  return (
    <div className="campaign-settings">
      {/* Sezione Oggetto */}
      <div className="settings-section">
        <label htmlFor="email-subject" className="settings-label">
          <Mail size={16} />
          <span>Oggetto della Campagna</span>
        </label>
        <input
          id="email-subject"
          type="text"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          placeholder="Es: Una sorpresa ti attende!"
          className="settings-input"
        />
      </div>

      {/* Sezione Destinatari */}
      <div className="settings-section">
        <h3 className="settings-label">
          <Users size={16} />
          <span>Destinatari</span>
        </h3>
        <div className="segments-container">
          {segments.map(segment => (
            <div 
              key={segment.id} 
              className={`segment-label ${selectedSegments.includes(segment.id) ? 'checked' : ''}`}
              onClick={() => handleSegmentClick(segment.id)}
            >
              <input 
                type="checkbox"
                readOnly
                checked={selectedSegments.includes(segment.id)}
                className="segment-checkbox"
              />
              <span className="segment-name">{segment.name}</span>
              <span className="segment-count">{segment.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sezione di Invio (in fondo) */}
      <div className="send-section">
        <button 
          className="send-button"
          onClick={onSend}
          disabled={isSending || !isReadyToSend}
        >
          <Send size={18} />
          <span>{isSending ? 'Invio in corso...' : 'Invia Campagna'}</span>
        </button>
        {!isReadyToSend && (
          <p className="send-tooltip">
            Completa oggetto e destinatari per inviare.
          </p>
        )}
      </div>
    </div>
  );
});

CampaignSettings.displayName = 'CampaignSettings';
export default CampaignSettings;