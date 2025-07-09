import React from 'react';

const EmailRecipients = ({ segments, selectedSegments, toggleSegment }) => {
  return (
    <div className="recipients-fixed">
      <h3>👥 Destinatari</h3>
      <div className="segments-fixed">
        {segments.map(segment => (
          <label key={segment.id} className="segment-fixed">
            <input 
              type="checkbox"
              checked={selectedSegments.includes(segment.id)}
              onChange={() => toggleSegment(segment.id)}
            />
            <span>{segment.name} ({segment.count})</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default EmailRecipients;