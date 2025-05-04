# Gabi Yoga Email Architecture

This document explains the hybrid email architecture implemented for the Gabi Yoga website. We use a combination of AWS services to provide both interactive email accounts and automated system emails.

## Architecture Overview

The Gabi Yoga email system has two main components:

1. **AWS WorkMail** - For receiving and managing emails with interactive accounts
2. **AWS SES (Simple Email Service)** - For sending automated system emails

This hybrid approach provides the best of both worlds:
- Professional mailboxes with a web interface and mobile access
- Programmatic email sending for automated website functions

## Email Flow Diagram

```
┌─────────────┐         ┌───────────────┐
│  External   │         │  Gabi Yoga    │
│   Sender    │────────▶│   WorkMail    │───────────┐
└─────────────┘         └───────────────┘           │
                                                   ▼
                                            ┌─────────────┐
                                            │  Staff      │
                                            │  Mailboxes  │
                                            └─────────────┘
                               
┌─────────────┐         ┌───────────────┐    ┌─────────────┐
│  Gabi Yoga  │         │     AWS       │    │  External   │
│  Website    │────────▶│     SES       │───▶│  Recipient  │
└─────────────┘         └───────────────┘    └─────────────┘
  (Automated)
```

## 1. Amazon WorkMail

### Purpose
- Provides staff email accounts (e.g., info@gabi.yoga, admin@gabi.yoga)
- Handles incoming email
- Offers calendar and contact management
- Provides webmail access and email client support

### Key Features
- Professional email addresses with your domain
- 50GB storage per mailbox
- Web interface at https://mail.[region].awsapps.com/mail
- IMAP/SMTP support for email clients
- Calendar and contact sharing
- Mobile device support
- Anti-malware and spam protection

### Configured Email Addresses
- info@gabi.yoga - For general inquiries
- admin@gabi.yoga - For administrative purposes
- noreply@gabi.yoga - For automated emails (shared with SES)
- Additional user mailboxes as needed

## 2. Amazon SES (Simple Email Service)

### Purpose
- Sends automated emails from the website
- Handles transactional emails (password resets, booking confirmations, etc.)
- Offers high deliverability and scalability

### Email Types Implemented
1. **Password Reset Emails**
   - Triggered when a user requests a password reset
   - Contains a secure link to reset their password

2. **Welcome Emails**
   - Sent when a new user creates an account
   - Provides login information and next steps

3. **Booking Confirmation Emails**
   - Sent when a user books a class or session
   - Contains booking details and options to cancel/reschedule

4. **General Purpose Emails**
   - Framework available for sending any type of customized email
   - Uses the same underlying sending mechanism

### Implementation Details
- Email templates include both HTML and plain text versions
- Robust error handling with graceful degradation
- Development environment logging for easy debugging
- All emails use a consistent design and branding

## DNS Configuration

The following DNS records have been configured to support this hybrid email architecture:

1. **MX Records**
   - Domain MX record pointing to Amazon SES/WorkMail
   - mail.gabi.yoga subdomain MX record for SES sending

2. **SPF Records**
   - Combined SPF record that includes both SES and WorkMail
   - Prevents email spoofing and improves deliverability

3. **DKIM Records**
   - DKIM signing enabled for authentication
   - Enhances deliverability by confirming email authenticity

4. **Autodiscover Record**
   - Allows email clients to auto-configure WorkMail settings

## Usage in Code

### Sending Emails

The website uses the `utils/email-service.js` module to send emails:

```javascript
const emailService = require('./utils/email-service');

// Send a welcome email
await emailService.sendWelcomeEmail({
  to: 'customer@example.com',
  firstName: 'Jane',
  loginUrl: 'https://www.gabi.yoga/login'
});

// Send a booking confirmation
await emailService.sendBookingConfirmationEmail({
  to: 'customer@example.com',
  firstName: 'Jane',
  booking: {
    className: 'Vinyasa Flow',
    date: '2025-05-10',
    time: '10:00 AM',
    location: 'Main Studio',
    teacher: 'Gabi'
  },
  bookingUrl: 'https://www.gabi.yoga/booking/123'
});

// Send a custom email
await emailService.sendEmail({
  to: 'customer@example.com',
  subject: 'Important Announcement',
  htmlBody: '<p>HTML content here</p>',
  textBody: 'Plain text content here'
});
```

## Troubleshooting

### Email Sending Issues
1. Check the server logs for SES errors
2. Verify SES domain identity status in AWS console
3. Ensure the DKIM records are properly configured
4. Check sending quota and statistics in SES console

### Email Receiving Issues
1. Verify WorkMail organization status
2. Check DNS propagation for MX and autodiscover records
3. Confirm WorkMail domain verification status
4. Test email deliverability with external email clients

## Monitoring and Management

### AWS Console Access
- WorkMail Console: https://console.aws.amazon.com/workmail/
- SES Console: https://console.aws.amazon.com/ses/

### Email Statistics
- Monitor sending quotas and bounces in SES dashboard
- Track WorkMail usage and health in WorkMail admin panel

## Future Enhancements

Potential improvements to consider:

1. **Email Templates** - Create a database-driven template system
2. **Open/Click Tracking** - Add analytics to track email engagement
3. **Automated Campaigns** - Implement newsletter or marketing emails
4. **Advanced Scheduling** - Add calendar integration for class reminders
