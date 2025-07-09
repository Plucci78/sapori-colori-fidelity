import React from 'react';
import { templates } from '../../templates';

const EmailTemplateSelector = ({ onTemplateSelect }) => {
  return (
    <div className="template-selector">
      <h2>🎨 Scegli un Template Professionale</h2>
      <div className="templates-grid">
        {templates.map(template => (
          <div 
            key={template.id}
            className="template-card"
            onClick={() => onTemplateSelect(template)}
          >
            <div className="template-icon">
              {template.name.split(' ')[0]}
            </div>
            <h3>{template.name}</h3>
            <p>Design professionale pronto all'uso</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmailTemplateSelector;