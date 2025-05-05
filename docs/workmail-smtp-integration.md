# AWS WorkMail SMTP Integration with Secrets Manager

This document outlines how the Gabi Yoga website sends emails using AWS WorkMail SMTP with credentials stored in AWS Secrets Manager.

## Overview

The email system has been modified to use AWS WorkMail's SMTP server instead of AWS SES. This change addresses the issue where AWS SES in sandbox mode requires verification of recipient email addresses, which was preventing password reset emails from being delivered to unverified recipients like `joshlandron+test1@gmail.com`.

## How It Works

### Architecture

1. **AWS WorkMail** provides the SMTP server for sending emails.
2. **AWS Secrets Manager** securely stores the SMTP credentials.
3. **Nodemailer** is the library used to send emails through the SMTP server.
4. The application retrieves credentials at runtime from Secrets Manager.

### Infrastructure Components

The infrastructure is defined in AWS CDK and includes:

- **SmtpSecretsStack**: Creates and manages the AWS Secrets Manager secret for WorkMail SMTP credentials
- **EmailStack**: Sets up the WorkMail organization, DNS records, and IAM permissions

### Application Components

- **aws-secrets.js**: Utility for retrieving secrets from AWS Secrets Manager
- **email-service.js**: Email service that uses Nodemailer with the WorkMail SMTP server
- **test-workmail-secrets.js**: Test script for verifying the WorkMail SMTP integration

## Deployment Instructions

### 1. Deploy the Infrastructure

Deploy the infrastructure using AWS CDK:

```bash
cd infrastructure
npm run cdk bootstrap    # Only if you haven't bootstrapped the environment
npm run deploy
```

This will create/update:
- The Secrets Manager secret for SMTP credentials
- Required IAM roles and policies
- WorkMail organization (if not already created)
- DNS records for email delivery

### 2. Set Up WorkMail Users

After deploying the infrastructure:

1. Go to the AWS WorkMail console (URL will be in the stack outputs).
2. Create a user for sending emails (e.g., noreply@gabi.yoga).
3. Set a password for this user.

### 3. Update the SMTP Secret

Update the secret in Secrets Manager with the actual WorkMail password:

```bash
# Get the current secret value to see the format
aws secretsmanager get-secret-value --secret-id gabi-yoga-workmail-smtp-credentials --query SecretString --output text | jq .

# Update with your actual WorkMail password
aws secretsmanager update-secret --secret-id gabi-yoga-workmail-smtp-credentials \
  --secret-string '{"username":"noreply@gabi.yoga","host":"smtp.us-west-2.awsapps.com","port":465,"secure":true,"password":"YOUR_ACTUAL_WORKMAIL_PASSWORD"}'
```

### 4. Test the Email Integration

Run the test script to verify the WorkMail SMTP integration:

```bash
node test-workmail-secrets.js
```

The script will:
1. Attempt to retrieve credentials from Secrets Manager
2. Verify the SMTP connection
3. Send a test email to an address you provide
4. Report success or display troubleshooting information

## Environment Variables

The following environment variables can be set to configure the email service:

| Variable | Description | Default |
|----------|-------------|---------|
| EMAIL_FROM | Email address to send from | noreply@gabi.yoga |
| EMAIL_DEBUG | Enable debug logging for emails | false |
| SMTP_SECRET_NAME | Name of the secret in Secrets Manager | gabi-yoga-workmail-smtp-credentials |
| USE_ENV_CREDENTIALS | Force using environment variables instead of Secrets Manager | false |
| SMTP_HOST | SMTP server hostname (fallback) | smtp.{region}.awsapps.com |
| SMTP_PORT | SMTP server port (fallback) | 465 |
| SMTP_SECURE | Use secure connection (fallback) | true |
| SMTP_USER | SMTP username (fallback) | noreply@gabi.yoga |
| SMTP_PASS | SMTP password (fallback) | (empty) |

## Advantages Over SES

1. **No recipient verification required**: Send to any email address without pre-verification
2. **Simpler setup**: No need to request production access or manage verified identities
3. **Better credentials management**: Secrets are stored securely in AWS Secrets Manager
4. **Full email solution**: WorkMail provides both sending (SMTP) and receiving (IMAP/POP3)
5. **Improved deliverability**: WorkMail has built-in deliverability management

## Troubleshooting

### Common Issues

#### Cannot retrieve secret from Secrets Manager

- Check that the secret exists with the correct name
- Ensure the application has the necessary IAM permissions
- Verify AWS region settings match where the secret is stored
- Try setting `USE_ENV_CREDENTIALS=true` as a temporary workaround

#### Authentication Failed

- Verify the username is the full email address (e.g., noreply@gabi.yoga)
- Check that the password in the secret matches the WorkMail user's password
- Ensure the WorkMail user is set up properly and enabled

#### Connection Issues

- Confirm that the SMTP host is correct for your region
- Check that port 465 (or 587) is not blocked by firewalls
- Verify that the AWS region matches your WorkMail organization

#### Email Not Received

- Check spam/junk folders
- Verify DNS records (MX, SPF) are properly set up
- Ensure the WorkMail organization is properly configured

### Logs to Check

- Server logs for email sending attempts
- CloudWatch Logs for Lambda functions in the infrastructure
- AWS WorkMail console for organization status and message tracking
