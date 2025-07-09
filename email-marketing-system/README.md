# Email Marketing System

## Overview
The Email Marketing System is a professional tool designed for creating, managing, and sending email campaigns. It allows users to select from various customizable templates, manage recipient segments, and track email quotas, providing a comprehensive solution for email marketing needs.

## Features
- **Template Selection**: Choose from a variety of pre-designed email templates.
- **Email Editor**: A rich text editor powered by GrapesJS for drag-and-drop email composition.
- **Recipient Management**: Easily select customer segments to target specific audiences.
- **Email Quota Management**: Monitor your email sending limits and receive notifications.
- **Notifications**: Get real-time feedback on actions taken within the application.

## Project Structure
```
email-marketing-system
├── src
│   ├── components
│   │   ├── Email
│   │   │   ├── EmailView.jsx
│   │   │   ├── EmailQuotaWidget.jsx
│   │   │   ├── EmailTemplateSelector.jsx
│   │   │   ├── EmailEditor.jsx
│   │   │   ├── EmailRecipients.jsx
│   │   │   └── EmailSendButton.jsx
│   │   └── shared
│   │       ├── Notification.jsx
│   │       └── LoadingSpinner.jsx
│   ├── templates
│   │   ├── WelcomeTemplate.jsx
│   │   ├── PromoTemplate.jsx
│   │   ├── MilestoneTemplate.jsx
│   │   └── index.js
│   ├── services
│   │   ├── emailService.js
│   │   ├── emailQuotaService.js
│   │   └── segmentService.js
│   ├── utils
│   │   ├── templateHelpers.js
│   │   └── emailParser.js
│   ├── hooks
│   │   ├── useEmailEditor.js
│   │   └── useEmailCampaign.js
│   ├── supabase.js
│   └── App.js
├── public
│   └── index.html
├── package.json
└── README.md
```

## Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd email-marketing-system
   ```
3. Install the dependencies:
   ```
   npm install
   ```

## Usage
1. Start the development server:
   ```
   npm start
   ```
2. Open your browser and navigate to `http://localhost:3000` to access the application.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.