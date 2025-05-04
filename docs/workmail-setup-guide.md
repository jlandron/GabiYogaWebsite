# Amazon WorkMail Setup Guide for Gabi Yoga

This guide explains how to set up and use Amazon WorkMail for your Gabi.yoga domain. WorkMail provides professional email, calendaring, and contact management capabilities.

## What is Amazon WorkMail?

Amazon WorkMail is a secure, managed business email and calendar service with support for existing desktop and mobile email clients. With WorkMail you get:

- Professional email with your custom domain (e.g., name@gabi.yoga)
- Web-based interface accessible from anywhere
- Mobile and desktop email client support
- Integrated calendar and contact management
- Advanced security and encryption features
- 50GB of mailbox storage per user
- No need to maintain your own email server

## Deployment and Setup Process

### 1. Deploy the Infrastructure

First, deploy the infrastructure using CDK:

```bash
npm run deploy
```

This creates the Amazon WorkMail organization and configures the necessary DNS records.

### 2. Complete WorkMail Setup

After deployment, follow these steps to complete the setup:

1. Go to the AWS WorkMail Console:
   - The URL will be provided in the deployment outputs
   - It will look like: `https://us-west-2.console.aws.amazon.com/workmail/v2/home?region=us-west-2#/organizations/[org-id]`

2. Complete domain verification if required:
   - In the navigation pane, choose "Domains"
   - Select your domain (gabi.yoga)
   - Follow the steps to verify ownership if needed

3. Create user accounts:
   - In the navigation pane, choose "Users"
   - Click "Create user"
   - Fill in the required fields:
     * Name: e.g., "Admin User"
     * Username: e.g., "admin" (becomes admin@gabi.yoga)
     * Display name: e.g., "Admin - Gabi Yoga"
     * Email address: This will be username@gabi.yoga
     * Password: Set a strong password

4. Create standard accounts like:
   - info@gabi.yoga - For general inquiries
   - admin@gabi.yoga - For administrative purposes
   - noreply@gabi.yoga - For automated emails
   - your-name@gabi.yoga - Personal account

### 3. Access Your New Email

#### Web Access

1. After setting up users, access the WorkMail web application at:
   ```
   https://mail.[region].awsapps.com/mail
   ```

2. Log in with your full email address and password

#### Mobile and Desktop Clients

WorkMail is compatible with:

- Microsoft Outlook
- Apple Mail
- Gmail app
- Any email client that supports IMAP/SMTP

Configuration details (available in the WorkMail console):
- IMAP: imap.[region].awsapps.com (Port 993, SSL)
- SMTP: smtp.[region].awsapps.com (Port 465, SSL)
- Username: your full email address
- Password: your WorkMail password

## Integration with the Gabi Yoga Website

The website has been configured to use Amazon SES for sending emails and WorkMail for receiving emails. This means:

1. System emails (password reset, notifications, etc.) will be sent via SES
2. Emails sent to your domain (e.g., info@gabi.yoga) will be delivered to the appropriate WorkMail mailbox

### Testing Email Functionality

To test that everything is working properly:

1. Send a test email to one of your WorkMail addresses (e.g., info@gabi.yoga)
2. Check that you receive the email in the WorkMail web interface or your configured email client
3. Use the website's password reset feature to verify that system emails are being sent correctly

## Managing Email Accounts

### Adding New Users

1. Go to the WorkMail Console
2. Navigate to "Users" and click "Create user"
3. Follow the on-screen instructions
4. New users will receive an email with login instructions

### Setting Up Email Forwarding

If you want to forward emails to another address:

1. Log in to the WorkMail web interface
2. Click on the gear icon (Settings)
3. Select "Automatic processing"
4. Add a new rule for forwarding

### Email Aliases

To create email aliases (multiple email addresses for the same mailbox):

1. Go to the WorkMail Console
2. Select the user you want to add an alias for
3. Click "Edit"
4. Add the alias in the "Email addresses" section

## Costs and Quotas

- Amazon WorkMail costs $4 per user per month
- Each user gets 50GB of storage
- Maximum attachment size: 25MB
- Up to 100 recipients per message

## Troubleshooting

If emails aren't being received:

1. Verify DNS configuration in Route53
2. Check WorkMail organization status in the AWS console
3. Test sending emails to the address from an external email provider

If the website isn't sending emails:

1. Check SES configuration and verify DKIM setup
2. Review CloudWatch logs for any SES errors
3. Ensure the application is using the correct email sending configuration

## Security Best Practices

1. Enable multi-factor authentication (MFA) for all WorkMail users
2. Regularly rotate passwords
3. Use strong, unique passwords for each user
4. Review access logs periodically
5. Consider setting up email encryption for sensitive communications
