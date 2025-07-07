/**
* Auth Reset Password Lambda Function
* Handles password reset with token verification
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
    logWithContext('info', 'Reset password request received', { requestId });

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createSuccessResponse({}, 200);
    }

    // Parse request body
    const body = parseEventBody(event);
    if (!body) {
      return createErrorResponse('Invalid request body', 400);
    }

    const { token, email, password } = body;

    // Validate input
    if (!token) {
      return createErrorResponse('Reset token is required', 400);
    }

    if (!password) {
      return createErrorResponse('Password is required', 400);
    }

    if (!isValidPassword(password)) {
      return createErrorResponse('Password must be at least 8 characters long', 400);
    }

    logWithContext('info', 'Processing password reset request', {
      requestId,
      token: token.substring(0, 5) + '...'
    });

    // Find user by reset token using the GSI we created
    const users = await dynamoUtils.queryItems(
      process.env.USERS_TABLE,
      'ResetTokenIndex',
      'resetToken = :token',
      {
        ':token': token
      }
    );

    if (!users || users.length === 0) {
      return createErrorResponse('Invalid or expired reset token', 400);
    }

    const user = users[0];

    // Token verification already done by query, but double check to be safe
    if (!user.resetToken || user.resetToken === "EXPIRED_TOKEN") {
      logWithContext('warn', 'Invalid or expired reset token provided', {
        requestId,
        userId: user.id
      });
      return createErrorResponse('Invalid or expired reset token', 400);
    }

    // Check if token has expired
    const tokenExpiry = new Date(user.resetTokenExpiry);
    if (tokenExpiry < new Date()) {
      logWithContext('warn', 'Expired reset token used', {
        requestId,
        userId: user.id,
        tokenExpiry: user.resetTokenExpiry
      });
      return createErrorResponse('Reset token has expired. Please request a new password reset.', 400);
    }

    // Hash the new password
    const hashedPassword = await hashPassword(password);

    // Update user record with new password and clear reset token
    // Use a placeholder value instead of null for resetToken to satisfy GSI requirements
    const updatedUser = {
      ...user,
      password: hashedPassword,
      resetToken: "EXPIRED_TOKEN",  // Use placeholder value instead of null/empty to work with GSI
      resetTokenExpiry: new Date(0).toISOString(),  // Set to epoch time to clearly indicate expiration
      updatedAt: new Date().toISOString()
    };

    await dynamoUtils.putItem(process.env.USERS_TABLE, updatedUser);

    logWithContext('info', 'Password reset successful', {
      requestId,
      userId: user.id
    });

    return createSuccessResponse({
      message: 'Password reset successfully'
    });

  } catch (error) {
    logWithContext('error', 'Reset password error', {
      requestId,
      error: error.message,
      stack: error.stack
    });

    return createErrorResponse('An error occurred while processing your request', 500);
  }
};
