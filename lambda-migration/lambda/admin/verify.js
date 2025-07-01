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
    const user = await verifyToken(token, jwtSecret);
    if (!user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ 
          message: 'Invalid token',
          isAdmin: false
        })
      };
    }
    
    if (!isAdmin(user)) {
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
          id: user.sub,
          email: user.email,
          name: user.name
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
