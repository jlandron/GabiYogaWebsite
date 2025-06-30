/**
 * Auth Register Lambda Function
 * Handles user registration and account creation
 */

const { 
  parseEventBody, 
  createSuccessResponse, 
  createErrorResponse,
  logWithContext,
  dynamoUtils,
  getJWTSecret,
  generateToken,
  hashPassword,
  isValidEmail,
  isValidPassword
} = require('../shared/utils');

const { v4: uuidv4 } = require('uuid');

exports.handler = async (event, context) => {
  // Set up request ID for tracking
  const requestId = context.awsRequestId;
  
  try {
    logWithContext('info', 'Registration request received', { requestId });

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createSuccessResponse({}, 200);
    }

    // Parse request body
    const body = parseEventBody(event);
    if (!body) {
      return createErrorResponse('Invalid request body', 400);
    }

    const { firstName, lastName, email, password } = body;

    // Validate input
    if (!firstName || !lastName || !email || !password) {
      return createErrorResponse('All fields are required', 400);
    }

    if (!isValidEmail(email)) {
      return createErrorResponse('Invalid email format', 400);
    }

    if (!isValidPassword(password)) {
      return createErrorResponse('Password must be at least 8 characters long', 400);
    }

    // Validate name fields
    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      return createErrorResponse('First name and last name must be at least 2 characters', 400);
    }

    logWithContext('info', 'Processing registration', { 
      requestId, 
      email: email.substring(0, 3) + '...' 
    });

    // Check if user already exists
    const existingUsers = await dynamoUtils.queryItems(
      process.env.USERS_TABLE,
      'EmailIndex', // GSI name from our CDK stack
      'email = :email',
      {
        ':email': email
      }
    );

    if (existingUsers && existingUsers.length > 0) {
      logWithContext('warn', 'Registration attempt with existing email', { 
        requestId, 
        email: email.substring(0, 3) + '...' 
      });
      return createErrorResponse('Email is already registered', 400);
    }

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Create new user
    const userId = uuidv4();
    const now = new Date().toISOString();
    
    const newUser = {
      id: userId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase(),
      passwordHash,
      role: 'user', // Default role
      status: 'active',
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
      profilePicture: null,
      // Email verification could be added here
      emailVerified: true, // For now, auto-verify
      phoneNumber: null,
      preferences: {
        notifications: true,
        newsletter: true
      }
    };

    // Save user to database
    await dynamoUtils.putItem(process.env.USERS_TABLE, newUser);

    logWithContext('info', 'User created successfully', { 
      requestId, 
      userId,
      email: email.substring(0, 3) + '...' 
    });

    // Generate JWT token for immediate login
    const jwtSecret = await getJWTSecret();
    const tokenUser = {
      id: userId,
      email: newUser.email,
      role: newUser.role
    };
    
    const token = generateToken(tokenUser, jwtSecret, '24h');

    // Create session record
    const sessionId = uuidv4();
    try {
      await dynamoUtils.putItem(
        process.env.JWT_BLACKLIST_TABLE,
        {
          tokenId: sessionId,
          userId: userId,
          createdAt: now,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          isActive: true
        }
      );
    } catch (sessionError) {
      // Log but don't fail registration for this
      logWithContext('warn', 'Failed to create session record', { 
        requestId, 
        userId,
        error: sessionError.message 
      });
    }

    logWithContext('info', 'Registration successful', { 
      requestId, 
      userId 
    });

    // Return success response with user data and token
    return createSuccessResponse({
      message: 'Registration successful',
      user: {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
        profilePicture: newUser.profilePicture
      },
      token,
      session: {
        id: sessionId,
        authenticated: true,
        expiresIn: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
      }
    }, 201);

  } catch (error) {
    logWithContext('error', 'Registration error', { 
      requestId, 
      error: error.message,
      stack: error.stack 
    });

    // Handle specific DynamoDB errors
    if (error.code === 'ConditionalCheckFailedException') {
      return createErrorResponse('Email is already registered', 400);
    }

    if (error.code === 'ResourceNotFoundException') {
      return createErrorResponse('Service temporarily unavailable', 503);
    }

    if (error.code === 'ProvisionedThroughputExceededException') {
      return createErrorResponse('Service busy, please try again', 503);
    }

    return createErrorResponse('An error occurred during registration', 500);
  }
};
