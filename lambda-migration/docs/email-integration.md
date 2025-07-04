# Email Integration Documentation

This document describes the email integration implemented for the Gabi Yoga website using AWS SES.

## Overview

The application uses Amazon SES to send transactional emails to users in the following scenarios:
1. Password reset requests
2. Booking confirmations
3. Class cancellations

## Implementation Details

### Email Service Module

We've created a centralized email service module in `lambda/shared/email-service.js` that handles all email communications. This provides consistent email styling and reduces code duplication.

Key features:
- Standardized email templates with consistent styling
- Text and HTML email versions for maximum compatibility
- Configurable sender address
- Responsive email design

### Email Types

#### 1. Password Reset Emails

Sent when a user requests a password reset through the forgot password feature.
- Contains a secure reset token
- Includes a direct link to the reset password page
- Expires after 1 hour

#### 2. Booking Confirmation Emails

Sent when a user successfully books a yoga class.
- Contains all class details (title, date, time, instructor, etc.)
- Includes preparation information for the class
- Links to the user's booking management page

#### 3. Class Cancellation Emails

Sent to all registered users when an admin cancels a class.
- Notifies users that their class has been cancelled
- Provides information about the cancelled class
- Links to the class schedule to book an alternative class

## Configuration

The email service uses the following environment variables:

- `FROM_EMAIL`: Sender address (defaults to 'noreply@gabi.yoga')
- `BASE_URL`: Base URL for links in emails (defaults to the proper environment URL)
- `STAGE`: Current deployment stage (used to determine default URLs)

## AWS SES Setup Notes

**Important**: SES is currently in sandbox mode, which means:
- You can only send emails to verified email addresses
- There are strict sending limits
- To send to non-verified addresses, request production access

### Steps to verify an email address:
1. Go to AWS SES Console
2. Navigate to "Email Addresses" under "Identity Management"
3. Click "Verify a New Email Address"
4. Enter the email address and click "Verify This Email Address"
5. Check your email and click the verification link

## Testing

A test script is available at `tests/ses-email-test.js` that demonstrates how to use the email service and verifies that all email types work correctly.

To run the test:
```
TEST_EMAIL=your-verified-email@example.com node tests/ses-email-test.js
```

## AWS SES Production Access

When ready for production, request SES production access from AWS to remove the sandbox limitations:

1. Go to AWS SES Console
2. Navigate to "Sending Statistics"
3. Click "Request Production Access"
4. Fill out the form and submit
5. Wait for AWS approval (typically 1-2 business days)
