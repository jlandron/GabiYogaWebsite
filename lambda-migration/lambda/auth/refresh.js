/**
 * Auth Refresh Lambda Function
 * Handles JWT token refresh for authenticated users
 */

const { 
  createSuccessResponse, 
  createErrorResponse,
  logWithContext,
  dynamoUtils,
  extractAuthToken,
  getJWTSecret,
  verifyToken,
  generateToken
} = require('../shared/utils');

exports.handler = async (event, context) => {
  // Set up request ID for tracking
  const requestId = context.awsRequestId;
  
  try {
    logWithContext('info', 'Token refresh request received', { requestId });

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createSuccessResponse({}, 200);
    }

    // Extract token from Authorization header
    const token = extractAuthToken(event);
    
    if (!token) {
      return createErrorResponse('Authorization token required', 401);
    }

    // Verify current token
    const jwtSecret = await getJWTSecret();
    const decoded = verifyToken(token, jwtSecret);
    
    if (!decoded) {
      return createErrorResponse('Invalid or expired token', 401);
    }

    logWithContext('info', 'Processing token refresh', { 
      requestId, 
      userId: decoded.id 
    });

    // Check token blacklist
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const blacklistedToken = await dynamoUtils.getItem(
      process.env.JWT_BLACKLIST_TABLE, 
      { tokenId: tokenHash }
    );

    if (blacklistedToken && !blacklistedToken.isActive) {
      logWithContext('warn', 'Refresh attempt with blacklisted token', { 
        requestId, 
        userId: decoded.id 
      });
      return createErrorResponse('Token has been revoked', 401);
    }

    // Get user from database to ensure they still exist and are active
    const user = await dynamoUtils.getItem(
      process.env.USERS_TABLE, 
      { id: decoded.id }
    );

    if (!user) {
      logWithContext('warn', 'Refresh attempt for non-existent user', { 
        requestId, 
        userId: decoded.id 
      });
      return createErrorResponse('User not found', 404);
    }

    if (user.status !== 'active') {
      logWithContext('warn', 'Refresh attempt for inactive user', { 
        requestId, 
        userId: decoded.id,
        status: user.status 
      });
      return createErrorResponse('Account is not active', 401);
    }

    // Generate new token with current user data
    const tokenUser = {
      id: user.id,
      email: user.email,
      role: user.role || 'user'
    };
    
    const newToken = generateToken(tokenUser, jwtSecret, '24h');

    // Optionally blacklist the old token
    if (!blacklistedToken) {
      try {
        await dynamoUtils.putItem(process.env.JWT_BLACKLIST_TABLE, {
          tokenId: tokenHash,
          userId: decoded.id,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(decoded.exp * 1000).toISOString(),
          isActive: false,
          reason: 'token_refresh'
        });
      } catch (blacklistError) {
        // Log but don't fail refresh for this
        logWithContext('warn', 'Failed to blacklist old token', { 
          requestId, 
          userId: decoded.id,
          error: blacklistError.message 
        });
      }
    }

    logWithContext('info', 'Token refresh successful', { 
      requestId, 
      userId: decoded.id 
    });

    // Return new token with user data
    return createSuccessResponse({
      message: 'Token refreshed successfully',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role || 'user',
        profilePicture: user.profilePicture || null
      },
      token: newToken
    });

  } catch (error) {
    logWithContext('error', 'Token refresh error', { 
      requestId, 
      error: error.message,
      stack: error.stack 
    });

    // Handle specific DynamoDB errors
    if (error.code === 'ResourceNotFoundException') {
      return createErrorResponse('Service temporarily unavailable', 503);
    }

    return createErrorResponse('An error occurred during token refresh', 500);
  }
};
