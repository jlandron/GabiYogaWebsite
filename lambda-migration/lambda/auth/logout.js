/**
 * Auth Logout Lambda Function
 * Handles user logout and token invalidation
 */

const { 
  createSuccessResponse, 
  createErrorResponse,
  logWithContext,
  dynamoUtils,
  extractAuthToken,
  getJWTSecret,
  verifyToken
} = require('../shared/utils');

exports.handler = async (event, context) => {
  // Set up request ID for tracking
  const requestId = context.awsRequestId;
  
  try {
    logWithContext('info', 'Logout request received', { requestId });

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createSuccessResponse({}, 200);
    }

    // Extract token from Authorization header
    const token = extractAuthToken(event);
    
    if (!token) {
      // If no token provided, still return success (already logged out)
      return createSuccessResponse({
        message: 'Logged out successfully'
      });
    }

    try {
      // Verify token to get user information
      const jwtSecret = await getJWTSecret();
      const decoded = verifyToken(token, jwtSecret);
      
      if (decoded) {
        logWithContext('info', 'Processing logout for user', { 
          requestId, 
          userId: decoded.id 
        });

        // Add token to blacklist to prevent future use
        // We'll store a hash of the token for security
        const crypto = require('crypto');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        
        const blacklistEntry = {
          tokenId: tokenHash,
          userId: decoded.id,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(decoded.exp * 1000).toISOString(), // Use token's original expiry
          isActive: false, // Mark as logged out
          reason: 'user_logout'
        };

        // Add to blacklist table
        await dynamoUtils.putItem(process.env.JWT_BLACKLIST_TABLE, blacklistEntry);

        // Optional: Update user's last logout timestamp
        try {
          await dynamoUtils.updateItem(
            process.env.USERS_TABLE,
            { id: decoded.id },
            'SET lastLogoutAt = :timestamp',
            {
              ':timestamp': new Date().toISOString()
            }
          );
        } catch (updateError) {
          // Log but don't fail logout for this
          logWithContext('warn', 'Failed to update last logout timestamp', { 
            requestId, 
            userId: decoded.id,
            error: updateError.message 
          });
        }

        logWithContext('info', 'User logged out successfully', { 
          requestId, 
          userId: decoded.id 
        });
      } else {
        // Token is already invalid/expired
        logWithContext('info', 'Logout with invalid token', { requestId });
      }
    } catch (tokenError) {
      // Token verification failed, but that's okay for logout
      logWithContext('info', 'Logout with unverifiable token', { 
        requestId, 
        error: tokenError.message 
      });
    }

    // Always return success for logout
    return createSuccessResponse({
      message: 'Logged out successfully'
    });

  } catch (error) {
    logWithContext('error', 'Logout error', { 
      requestId, 
      error: error.message,
      stack: error.stack 
    });

    // Even if there's an error, we should still indicate successful logout
    // to prevent client-side issues
    return createSuccessResponse({
      message: 'Logged out successfully'
    });
  }
};
