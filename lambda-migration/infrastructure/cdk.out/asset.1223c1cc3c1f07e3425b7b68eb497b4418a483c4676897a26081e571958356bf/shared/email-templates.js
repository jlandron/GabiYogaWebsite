/**
 * Email Templates for Gabi Yoga
 * Contains template functions for all transactional emails
 */

/**
 * Get the current year for copyright notice
 */
const currentYear = new Date().getFullYear();

/**
 * Base email wrapper with consistent styling
 */
function wrapEmailContent(content, title, subtitle = null) {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: 'Georgia', serif; line-height: 1.6; color: #3b3b35; background-color: #fcfcf9; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #a1b082 0%, #82946c 100%); color: white; padding: 30px; text-align: center; border-radius: 0.75rem 0.75rem 0 0; }
        .content { background: #fcfcf9; padding: 30px; border-radius: 0 0 0.75rem 0.75rem; box-shadow: 0 4px 15px rgba(92, 92, 85, 0.15); }
        .button { display: inline-block; background: linear-gradient(135deg, #a1b082, #82946c); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: 600; box-shadow: 0 4px 15px rgba(92, 92, 85, 0.15); transition: all 0.3s ease; }
        .button:hover { background: #82946c; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(92, 92, 85, 0.2); }
        .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #8f8f87; }
        h1, h2, h3, h4 { font-family: 'Georgia', serif; font-weight: 600; color: #3b3b35; }
        p { color: #5c5c55; }
        .highlight { color: #a1b082; font-weight: 600; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Gabi Yoga</h1>
            ${subtitle ? `<p>${subtitle}</p>` : ''}
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>© ${currentYear} Gabi Yoga. All rights reserved.</p>
            <p>This email was sent to {{email}}</p>
        </div>
    </div>
</body>
</html>
`;
}

/**
 * Password Reset Template
 * Used for sending password reset links
 */
exports.passwordResetTemplate = {
  subject: 'Reset Your Gabi Yoga Password',
  htmlContent: (firstName, resetUrl) => wrapEmailContent(`
    <h2>Hi ${firstName || 'there'},</h2>
    <p>We received a request to reset your password for your Gabi Yoga account.</p>
    <p>Click the button below to reset your password:</p>
    <p style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
    </p>
    <p><strong>This link will expire in 15 minutes.</strong></p>
    <p>If you didn't request this password reset, you can safely ignore this email. Your password will not be changed.</p>
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e8e8e3;">
    <p><small>If the button doesn't work, copy and paste this link into your browser:</small></p>
    <p><small>${resetUrl}</small></p>
  `, 'Reset Your Gabi Yoga Password', 'Password Reset Request'),
  
  textContent: (firstName, resetUrl) => `
Reset Your Gabi Yoga Password

Hi ${firstName || 'there'},

We received a request to reset your password for your Gabi Yoga account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 15 minutes.

If you didn't request this password reset, you can safely ignore this email. Your password will not be changed.

© ${currentYear} Gabi Yoga. All rights reserved.
`
};

/**
 * Booking Confirmation Template
 * Used for sending booking confirmations
 */
exports.bookingConfirmationTemplate = {
  subject: 'Booking Confirmation - Gabi Yoga',
  htmlContent: (firstName, booking, classDate) => wrapEmailContent(`
    <h2>Hi ${firstName || 'there'},</h2>
    <p>Thank you for booking a class with Gabi Yoga! Your spot has been confirmed.</p>
    <div style="background-color: #e8e9e4; padding: 15px; border-radius: 0.75rem; margin: 20px 0; box-shadow: 0 4px 15px rgba(92, 92, 85, 0.05);">
      <h3 style="margin-top: 0; color: #82946c;">Class Details</h3>
      <p><strong>Class:</strong> ${booking.className}</p>
      <p><strong>Date & Time:</strong> ${classDate}</p>
      <p><strong>Instructor:</strong> ${booking.instructor}</p>
      <p><strong>Location:</strong> ${booking.location}</p>
      <p><strong>Level:</strong> ${booking.level}</p>
    </div>
    <h3>Preparing for your class:</h3>
    <ul>
      <li>Please arrive 10-15 minutes before the class starts</li>
      <li>Bring your own mat if you have one (we have extras if needed)</li>
      <li>Wear comfortable clothing</li>
      <li>Bring a water bottle and towel</li>
    </ul>
    <p>If you need to cancel your booking, please do so at least 2 hours before the class starts.</p>
    <p style="text-align: center;">
      <a href="{{baseUrl}}/user.html#/bookings" class="button">Manage Your Bookings</a>
    </p>
    <p>We look forward to seeing you in class!</p>
  `, 'Booking Confirmation - Gabi Yoga', 'Your Class is Confirmed'),
  
  textContent: (firstName, booking, classDate, baseUrl) => `
Booking Confirmation - Gabi Yoga

Hi ${firstName || 'there'},

Thank you for booking a class with Gabi Yoga! Your spot has been confirmed.

Class Details:
Class: ${booking.className}
Date & Time: ${classDate}
Instructor: ${booking.instructor}
Location: ${booking.location}
Level: ${booking.level}

Preparing for your class:
- Please arrive 10-15 minutes before the class starts
- Bring your own mat if you have one (we have extras if needed)
- Wear comfortable clothing
- Bring a water bottle and towel

If you need to cancel your booking, please do so at least 2 hours before the class starts.

Manage your bookings here: ${baseUrl}/user.html#/bookings

We look forward to seeing you in class!

© ${currentYear} Gabi Yoga. All rights reserved.
`
};

/**
 * Class Cancellation Template
 * Used for notifying users when a class is cancelled
 */
exports.classCancellationTemplate = {
  subject: 'Class Cancellation - Gabi Yoga',
  htmlContent: (firstName, classInfo, classDate) => wrapEmailContent(`
    <h2>Hi ${firstName || 'there'},</h2>
    <p>We're sorry to inform you that the following class has been cancelled:</p>
    <div style="background-color: #fbebf0; padding: 15px; border-radius: 0.75rem; margin: 20px 0; box-shadow: 0 4px 15px rgba(92, 92, 85, 0.05);">
      <h3 style="margin-top: 0; color: #e07a96;">Cancelled Class</h3>
      <p><strong>Class:</strong> ${classInfo.title}</p>
      <p><strong>Date & Time:</strong> ${classDate}</p>
      <p><strong>Instructor:</strong> ${classInfo.instructor || 'Gabi'}</p>
    </div>
    <p>This cancellation could be due to unforeseen circumstances. We apologize for any inconvenience.</p>
    <p>Please check our schedule for other available classes:</p>
    <p style="text-align: center;">
      <a href="{{baseUrl}}/user.html#/classes" class="button">View Available Classes</a>
    </p>
    <p>If you have any questions, please don't hesitate to contact us.</p>
  `, 'Class Cancellation - Gabi Yoga', 'Class Cancellation Notice'),
  
  textContent: (firstName, classInfo, classDate, baseUrl) => `
Class Cancellation Notice - Gabi Yoga

Hi ${firstName || 'there'},

We're sorry to inform you that the following class has been cancelled:

Cancelled Class:
Class: ${classInfo.title}
Date & Time: ${classDate}
Instructor: ${classInfo.instructor || 'Gabi'}

This cancellation could be due to unforeseen circumstances. We apologize for any inconvenience.

Please check our schedule for other available classes: ${baseUrl}

If you have any questions, please don't hesitate to contact us.

© ${currentYear} Gabi Yoga. All rights reserved.
`
};
