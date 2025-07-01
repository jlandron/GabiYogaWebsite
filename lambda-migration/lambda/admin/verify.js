const { verifyToken, isAdmin, getJWTSecret } = require('../shared/utils');

exports.handler = async (event) => {
  try {
    // Get token from Authorization header
    const token = event.headers.Authorization?.replace('Bearer ', '');
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ 
          message: 'No authorization token provided',
          isAdmin: false
        })
      };
    }

    // Get JWT secret and verify token
    const jwtSecret = await getJWTSecret();
    const decoded = verifyToken(token, jwtSecret);
    if (!decoded) {
      return {
        statusCode: 401,
        body: JSON.stringify({ 
          message: 'Invalid token',
          isAdmin: false
        })
      };
    }
    
    // Check if user has admin role
    if (!decoded.role || decoded.role !== 'admin') {
      console.log('Non-admin user attempted access:', decoded);
      return {
        statusCode: 403,
        body: JSON.stringify({ 
          message: 'Access denied',
          isAdmin: false
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Admin access verified',
        isAdmin: true,
        user: {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role
        }
      })
    };

  } catch (error) {
    console.error('Error verifying admin access:', error);
    return {
      statusCode: 401,
      body: JSON.stringify({ 
        message: 'Authentication failed',
        isAdmin: false
      })
    };
  }
};
