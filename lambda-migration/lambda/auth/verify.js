/**
 * Auth Verify Lambda Function
 * Handles password reset token verification and password updating
 */

const { 
  parseEventBody,
  createSuccessResponse, 
  createErrorResponse,
  logWithContext,
  dynamoUtils,
  hashPassword,
  isValidPassword
} = require('../shared/utils');

exports.handler = async (event, context) => {
  // Set up request ID for tracking
  const requestId = context.awsRequestId;
  
  try {
    logWithContext('info', 'Password reset verification request received', { requestId });

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createSuccessResponse({}, 200);
    }

    // Handle both GET (token verification) and POST (password reset)
    if (event.httpMethod === 'GET') {
      return handleTokenVerification(event, requestId);
    } else if (event.httpMethod === 'POST') {
      return handlePasswordReset(event, requestId);
    } else {
      return createErrorResponse('Method not allowed', 405);
    }

  } catch (error) {
    logWithContext('error', 'Verify function error', { 
      requestId, 
      error: error.message,
      stack: error.stack 
    });

    return createErrorResponse('An error occurred while processing your request', 500);
  }
};

/**
 * Handle token verification (GET request)
 */
async function handleTokenVerification(event, requestId) {
  try {
    const { token, email } = event.queryStringParameters || {};

    if (!token || !email) {
      return createErrorResponse('Token and email are required', 400);
    }

    // Fix encoding issue: replace spaces with plus signs if needed
    let cleanEmail = email;
    if (email.includes(' ')) {
      cleanEmail = email.replace(/ /g, '+');
      logWithContext('info', 'Fixed email encoding', { 
        requestId, 
        original: email.substring(0, 3) + '...',
        fixed: cleanEmail.substring(0, 3) + '...'
      });
    }

    logWithContext('info', 'Verifying reset token', { 
      requestId, 
      email: cleanEmail.substring(0, 3) + '...' 
    });

    // Find user by email
    const users = await dynamoUtils.queryItems(
      process.env.USERS_TABLE,
      'EmailIndex',
      'email = :email',
      {
        ':email': cleanEmail.toLowerCase()
      }
    );

    if (!users || users.length === 0) {
      logWithContext('warn', 'Token verification for non-existent email', { 
        requestId, 
        email: cleanEmail.substring(0, 3) + '...' 
      });
      return createErrorResponse('Invalid or expired reset token', 400);
    }

    const user = users[0];

    // Check if token matches and is not expired
    if (!user.resetToken || user.resetToken !== token) {
      logWithContext('warn', 'Invalid reset token', { 
        requestId, 
        userId: user.id 
      });
      return createErrorResponse('Invalid or expired reset token', 400);
    }

    if (!user.resetTokenExpiry || new Date(user.resetTokenExpiry) < new Date()) {
      logWithContext('warn', 'Expired reset token', { 
        requestId, 
        userId: user.id 
      });
      return createErrorResponse('Invalid or expired reset token', 400);
    }

    logWithContext('info', 'Token verification successful', { 
      requestId, 
      userId: user.id 
    });

    return createSuccessResponse({
      message: 'Token is valid',
      user: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });

  } catch (error) {
    logWithContext('error', 'Token verification error', { 
      requestId, 
      error: error.message 
    });
    return createErrorResponse('An error occurred while verifying the token', 500);
  }
}

/**
 * Handle password reset (POST request)
 */
async function handlePasswordReset(event, requestId) {
  try {
    // Parse request body
    const body = parseEventBody(event);
    if (!body) {
      return createErrorResponse('Invalid request body', 400);
    }

    let { token, email, password } = body;

    // Validate input
    if (!token || !email || !password) {
      return createErrorResponse('Token, email, and password are required', 400);
    }

    if (!isValidPassword(password)) {
      return createErrorResponse('Password must be at least 8 characters long', 400);
    }

    // Fix encoding issue: replace spaces with plus signs if needed
    if (email.includes(' ')) {
      const originalEmail = email;
      email = email.replace(/ /g, '+');
      logWithContext('info', 'Fixed email encoding in password reset', { 
        requestId, 
        original: originalEmail.substring(0, 3) + '...',
        fixed: email.substring(0, 3) + '...'
      });
    }

    logWithContext('info', 'Processing password reset', { 
      requestId, 
      email: email.substring(0, 3) + '...' 
    });

    // Find user by email
    const users = await dynamoUtils.queryItems(
      process.env.USERS_TABLE,
      'EmailIndex',
      'email = :email',
      {
        ':email': email.toLowerCase()
      }
    );

    if (!users || users.length === 0) {
      logWithContext('warn', 'Password reset for non-existent email', { 
        requestId, 
        email: email.substring(0, 3) + '...' 
      });
      return createErrorResponse('Invalid or expired reset token', 400);
    }

    const user = users[0];

    // Verify token
    if (!user.resetToken || user.resetToken !== token) {
      logWithContext('warn', 'Invalid reset token in password reset', { 
        requestId, 
        userId: user.id 
      });
      return createErrorResponse('Invalid or expired reset token', 400);
    }

    if (!user.resetTokenExpiry || new Date(user.resetTokenExpiry) < new Date()) {
      logWithContext('warn', 'Expired reset token in password reset', { 
        requestId, 
        userId: user.id 
      });
      return createErrorResponse('Invalid or expired reset token', 400);
    }

    // Hash new password
    const newPasswordHash = await hashPassword(password);

    // Update user with new password and clear reset token
    await dynamoUtils.updateItem(
      process.env.USERS_TABLE,
      { id: user.id },
      'SET passwordHash = :passwordHash, updatedAt = :updatedAt REMOVE resetToken, resetTokenExpiry',
      {
        ':passwordHash': newPasswordHash,
        ':updatedAt': new Date().toISOString()
      }
    );

    logWithContext('info', 'Password reset successful', { 
      requestId, 
      userId: user.id 
    });

    return createSuccessResponse({
      message: 'Your password has been reset successfully. You can now log in with your new password.'
    });

  } catch (error) {
    logWithContext('error', 'Password reset error', { 
      requestId, 
      error: error.message 
    });

    return createErrorResponse('An error occurred while resetting your password', 500);
  }
}
