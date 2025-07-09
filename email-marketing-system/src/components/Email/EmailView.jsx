import { memo, useState, useEffect, useRef, useCallback } from 'react';
import EmailQuotaWidget from './EmailQuotaWidget';
import EmailTemplateSelector from './EmailTemplateSelector';
import EmailEditor from './EmailEditor';
import EmailRecipients from './EmailRecipients';
import EmailSendButton from './EmailSendButton';
import { showNotification } from '../shared/Notification';
import { useEmailCampaign } from '../../hooks/useEmailCampaign';

const EmailView = memo(() => {
  const [emailContent, setEmailContent] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [selectedSegments, setSelectedSegments] = useState([]);
  const { sendCampaign } = useEmailCampaign();

  const handleContentChange = (content) => {
    setEmailContent(content);
  };

  const handleSubjectChange = (subject) => {
    setEmailSubject(subject);
  };

  const handleSegmentChange = (segments) => {
    setSelectedSegments(segments);
  };

  const handleSendCampaign = async () => {
    if (!emailSubject || !emailContent || selectedSegments.length === 0) {
      showNotification('Please fill in all fields and select recipients.', 'error');
      return;
    }
    await sendCampaign(emailSubject, emailContent, selectedSegments);
  };

  return (
    <div className="email-marketing-container">
      <h1>📧 Email Marketing System</h1>
      <EmailQuotaWidget />
      <EmailTemplateSelector onTemplateSelect={handleContentChange} />
      <EmailEditor content={emailContent} onContentChange={handleContentChange} />
      <EmailRecipients onSegmentChange={handleSegmentChange} />
      <EmailSendButton onSend={handleSendCampaign} />
    </div>
  );
});

EmailView.displayName = 'EmailView';

export default EmailView;