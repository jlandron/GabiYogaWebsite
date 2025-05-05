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
