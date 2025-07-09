import { parse } from 'html-react-parser';

export const parseEmailContent = (htmlContent) => {
  const parsedContent = parse(htmlContent);
  return parsedContent;
};

export const prepareEmailForSending = (emailContent, recipientData) => {
  let personalizedContent = emailContent;

  // Replace placeholders with recipient data
  Object.keys(recipientData).forEach(key => {
    const placeholder = `{{${key}}}`;
    personalizedContent = personalizedContent.replace(new RegExp(placeholder, 'g'), recipientData[key]);
  });

  return personalizedContent;
};