/**
 * Auth Token Verification Lambda Function
 * Verifies JWT token and returns user info if valid
 */

const { 
  createSuccessResponse, 
  createErrorResponse,
  logWithContext,
  getUserFromToken
} = require('../shared/utils');

exports.handler = async (event, context) => {
  const requestId = context.awsRequestId;
  
  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createSuccessResponse({}, 200);
    }

    // Get user from token
    const user = await getUserFromToken(event);
    if (!user) {
      return createErrorResponse('Invalid or expired token', 401);
    }

    // Return user info without sensitive data
    return createSuccessResponse({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });

  } catch (error) {
    logWithContext('error', 'Token verification error', { 
      requestId, 
      error: error.message 
    });
    return createErrorResponse('An error occurred while verifying the token', 500);
  }
};
