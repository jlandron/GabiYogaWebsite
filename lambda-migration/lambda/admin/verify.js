const { 
  getUserFromToken, 
  isAdmin, 
  createSuccessResponse, 
  createErrorResponse 
} = require('../shared/utils');

exports.handler = async (event) => {
  try {
    // Get user from token and verify they exist in DB
    const user = await getUserFromToken(event);
    if (!user) {
      return createErrorResponse('Authentication failed', 401);
    }

    // Check if user has admin role
    if (!isAdmin(user)) {
      console.log('Non-admin user attempted access:', user);
      return createErrorResponse('Access denied - Admin role required', 403);
    }

    return createSuccessResponse({
      message: 'Admin access verified',
      isAdmin: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });

  } catch (error) {
    console.error('Error verifying admin access:', error);
    return createErrorResponse('Authentication failed', 401);
  }
};
