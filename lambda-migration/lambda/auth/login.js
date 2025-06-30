/**
 * Auth Login Lambda Function
 * Handles user authentication and JWT token generation
 */

const { 
  parseEventBody, 
  createSuccessResponse, 
  createErrorResponse,
  logWithContext,
  dynamoUtils,
  getJWTSecret,
  generateToken,
  comparePassword,
  isValidEmail
} = require('../shared/utils');

const { v4: uuidv4 } = require('uuid');

exports.handler = async (event, context) => {
  // Set up request ID for tracking
  const requestId = context.awsRequestId;
  
  try {
    logWithContext('info', 'Login request received', { requestId });

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createSuccessResponse({}, 200);
    }

    // Parse request body
    const body = parseEventBody(event);
    if (!body) {
      return createErrorResponse('Invalid request body', 400);
    }

    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return createErrorResponse('Email and password are required', 400);
    }

    if (!isValidEmail(email)) {
      return createErrorResponse('Invalid email format', 400);
    }

    logWithContext('info', 'Attempting login', { 
      requestId, 
      email: email.substring(0, 3) + '...' 
    });

    // Find user by email using GSI
    const users = await dynamoUtils.queryItems(
      process.env.USERS_TABLE,
      'EmailIndex', // GSI name from our CDK stack
      'email = :email',
      {
        ':email': email
      }
    );

    if (!users || users.length === 0) {
      logWithContext('warn', 'Login attempt with non-existent email', { 
        requestId, 
        email: email.substring(0, 3) + '...' 
      });
      return createErrorResponse('Invalid email or password', 401);
    }

    const user = users[0];

    // Check if user account is active
    if (user.status && user.status !== 'active') {
      logWithContext('warn', 'Login attempt with inactive account', { 
        requestId, 
        userId: user.id,
        status: user.status
      });
      return createErrorResponse('Account is not active', 401);
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      logWithContext('warn', 'Login attempt with invalid password', { 
        requestId, 
        userId: user.id 
      });
      return createErrorResponse('Invalid email or password', 401);
    }

    // Update last login timestamp
    try {
      await dynamoUtils.updateItem(
        process.env.USERS_TABLE,
        { id: user.id },
        'SET lastLoginAt = :timestamp',
        {
          ':timestamp': new Date().toISOString()
        }
      );
    } catch (updateError) {
      // Log but don't fail login for this
      logWithContext('warn', 'Failed to update last login timestamp', { 
        requestId, 
        userId: user.id,
        error: updateError.message 
      });
    }

    // Generate JWT token
    const jwtSecret = await getJWTSecret();
    const tokenUser = {
      id: user.id,
      email: user.email,
      role: user.role || 'user'
    };
    
    const token = generateToken(tokenUser, jwtSecret, '24h');

    // Create session record in JWT blacklist table (for potential logout tracking)
    const sessionId = uuidv4();
    try {
      await dynamoUtils.putItem(
        process.env.JWT_BLACKLIST_TABLE,
        {
          tokenId: sessionId,
          userId: user.id,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          isActive: true
        }
      );
    } catch (sessionError) {
      // Log but don't fail login for this
      logWithContext('warn', 'Failed to create session record', { 
        requestId, 
        userId: user.id,
        error: sessionError.message 
      });
    }

    logWithContext('info', 'Login successful', { 
      requestId, 
      userId: user.id,
      role: user.role 
    });

    // Return success response with user data and token
    return createSuccessResponse({
      message: 'Login successful',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role || 'user',
        profilePicture: user.profilePicture || null
      },
      token,
      session: {
        id: sessionId,
        authenticated: true,
        expiresIn: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
      }
    });

  } catch (error) {
    logWithContext('error', 'Login error', { 
      requestId, 
      error: error.message,
      stack: error.stack 
    });

    // Handle specific DynamoDB errors
    if (error.code === 'ResourceNotFoundException') {
      return createErrorResponse('Service temporarily unavailable', 503);
    }

    if (error.code === 'ProvisionedThroughputExceededException') {
      return createErrorResponse('Service busy, please try again', 503);
    }

    return createErrorResponse('An error occurred during login', 500);
  }
};
