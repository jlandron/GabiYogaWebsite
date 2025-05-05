# Automated WorkMail SMTP Integration for Gabi Yoga Website

This document explains the AWS CDK-based solution implemented for resolving email delivery issues on the Gabi Yoga website.

## Problem Solved

The original error was:
```
Error sending email via AWS SES: Email address is not verified. The following identities failed the check in region US-WEST-2: joshlandron+test1@gmail.com
```

AWS SES in sandbox mode requires verification of every recipient email address, which is impractical for features like password reset emails.

## Solution Overview

We've implemented a fully automated CDK solution that:

1. Creates and configures an AWS WorkMail organization
2. Creates a WorkMail email user with generated credentials
3. Stores SMTP credentials securely in AWS Secrets Manager
4. Updates the email delivery service to use WorkMail SMTP instead of SES
5. Fixes the SMTP hostname format to include the correct subdomain

## Implementation Details

### Infrastructure Components (CDK)

1. **EmailStack**
   - Creates WorkMail organization
   - Sets up DNS records (MX, SPF, autodiscover)
   - Establishes IAM roles and policies

2. **WorkMailUserStack**
   - Creates WorkMail user automatically
   - Generates secure password
   - Stores credentials in AWS Secrets Manager
   - Exposes organization ID and credentials via outputs

### Application Components

1. **aws-secrets.js**
   - Retrieves credentials from AWS Secrets Manager
   - Implements caching for efficiency
   - Provides fallback to environment variables

2. **email-service.js**
   - Uses Nodemailer with WorkMail SMTP
   - Implements lazy initialization of the transporter
   - Handles SMTP connection errors gracefully

3. **test-workmail-secrets.js**
   - Tests email delivery via WorkMail SMTP
   - Verifies credentials retrieval from Secrets Manager

## Deployment

The solution is deployed using the provided script:

```bash
./apply-email-fix.sh
```

This script:
1. Deploys the CDK stacks (GabiYogaEmail and GabiYogaWorkMailUser)
2. Retrieves the WorkMail organization ID
3. Retrieves the SMTP Secret ARN
4. Tests email delivery with the new setup

## Key Features

1. **No Manual Setup Required**
   - Everything is automated via AWS CDK
   - No need to manually create users or configure WorkMail

2. **Secure Credential Management**
   - SMTP credentials are stored in AWS Secrets Manager
   - Password is randomly generated with high entropy
   - IAM permissions correctly scoped

3. **Automatic DNS Configuration**
   - MX records for receiving email
   - SPF records for sender validation
   - Autodiscover records for email clients

4. **Correct SMTP Hostname**
   - Uses format `smtp.mail.{region}.awsapps.com`
   - Previous error was due to missing `mail.` in the hostname

5. **Fallback Mechanisms**
   - Falls back to environment variables if Secrets Manager is unavailable
   - Logs email content if SMTP sending fails

## Advantages Over Previous Solution

1. **No Recipient Verification Required**
   - WorkMail allows sending to any email address
   - No need to request production access for SES

2. **Complete Email Solution**
   - Can both send and receive emails
   - Easy to set up additional email users

3. **Managed Service with Better Deliverability**
   - AWS WorkMail handles SPF, DKIM, and DMARC automatically
   - Better email deliverability than raw SES

4. **Improved Error Handling**
   - Better error messages with troubleshooting steps
   - Graceful fallbacks for failure scenarios

## Technical Implementation Notes

1. The WorkMail organization ID is passed between stacks to ensure proper linking
2. CloudFormation Custom Resources are used to create WorkMail users since native CDK constructs don't exist
3. Lambda functions handle the API calls to WorkMail and Secrets Manager
4. The correct SMTP hostname format (`smtp.mail.{region}.awsapps.com`) is crucial for connectivity

## Testing the Solution

After deployment, you can test the solution by:

1. Triggering a password reset for an account
2. The email should be sent via WorkMail SMTP
3. No "email address is not verified" error should occur
4. The email should arrive in the recipient's inbox

To run a standalone test:
```
node test-workmail-secrets.js
```

This solution provides a robust, automated approach to email delivery that doesn't require manual setup or verification of recipient email addresses.
