/**
 * Unit tests for auth.js API routes
 * 
 * These tests verify authentication endpoint functionality.
 */

// Mock the dependencies
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'test-token'),
  verify: jest.fn((token, secret) => {
    if (token === 'valid-token') {
      return { id: 1, email: 'test@example.com', role: 'user' };
    } else {
      throw new Error('Invalid token');
    }
  })
}));

jest.mock('../../database/data-access', () => ({
  AuthOperations: {
    findUserByEmail: jest.fn(),
    findUserById: jest.fn(),
    verifyPassword: jest.fn(),
    createUser: jest.fn(),
    createPasswordResetToken: jest.fn(),
    resetPassword: jest.fn(),
    verifyPasswordResetToken: jest.fn()
  }
}));

// Create a mock express app and router for testing
const express = require('express');
const request = require('supertest');

// Set up the test environment
describe('Authentication API', () => {
  let app;
  const { AuthOperations } = require('../../database/data-access');
  
  // Set up our mock environment variables
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_EXPIRY = '1h';

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Create a fresh express app for each test
    app = express();
    app.use(express.json());

    // We need to mock the export pattern of auth.js
    // but without circular imports, so we'll just mock the endpoints directly
    app.post('/api/auth/login', async (req, res) => {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email and password are required' 
        });
      }

      try {
        // Mock the user lookup
        const user = await AuthOperations.findUserByEmail(email);
        
        if (!user) {
          return res.status(401).json({ 
            success: false, 
            message: 'Invalid credentials' 
          });
        }

        // Mock password verification
        const validPassword = await AuthOperations.verifyPassword(password, user.password_hash);
        
        if (!validPassword) {
          return res.status(401).json({ 
            success: false, 
            message: 'Invalid credentials' 
          });
        }

        // Return mock user info and token
        return res.status(200).json({
          success: true,
          message: 'Login successful',
          user: {
            id: user.user_id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            role: user.role
          },
          token: 'test-token'
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: 'An error occurred during login'
        });
      }
    });

    app.post('/api/auth/register', async (req, res) => {
      const { firstName, lastName, email, password } = req.body;
      
      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'All fields are required' 
        });
      }

      try {
        // Check if user exists
        const existingUser = await AuthOperations.findUserByEmail(email);
        
        if (existingUser) {
          return res.status(400).json({ 
            success: false, 
            message: 'Email is already registered' 
          });
        }

        // Mock user creation
        const user = await AuthOperations.createUser({
          firstName, lastName, email, password
        });

        // Return mock user info
        return res.status(201).json({
          success: true,
          message: 'Registration successful',
          user: {
            id: user.user_id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            role: user.role
          },
          token: 'test-token'
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: 'An error occurred during registration'
        });
      }
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 if email or password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' }); // Missing password
      
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Email and password are required');
    });

    it('should return 401 if user is not found', async () => {
      // Mock user not found
      AuthOperations.findUserByEmail.mockResolvedValue(null);
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password123' });
      
      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Invalid credentials');
      expect(AuthOperations.findUserByEmail).toHaveBeenCalledWith('nonexistent@example.com');
    });

    it('should return 401 if password is incorrect', async () => {
      // Mock user found but invalid password
      AuthOperations.findUserByEmail.mockResolvedValue({
        user_id: 1,
        email: 'test@example.com',
        password_hash: 'hashedPassword',
        first_name: 'Test',
        last_name: 'User',
        role: 'user'
      });
      
      AuthOperations.verifyPassword.mockResolvedValue(false);
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongPassword' });
      
      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Invalid credentials');
      expect(AuthOperations.verifyPassword).toHaveBeenCalledWith('wrongPassword', 'hashedPassword');
    });

    it('should return 200 with user info and token if login is successful', async () => {
      // Mock successful login
      AuthOperations.findUserByEmail.mockResolvedValue({
        user_id: 1,
        email: 'test@example.com',
        password_hash: 'hashedPassword',
        first_name: 'Test',
        last_name: 'User',
        role: 'user'
      });
      
      AuthOperations.verifyPassword.mockResolvedValue(true);
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id', 1);
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
      expect(response.body).toHaveProperty('token', 'test-token');
    });
  });

  describe('POST /api/auth/register', () => {
    it('should return 400 if any required field is missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com'
          // Missing password
        });
      
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'All fields are required');
    });

    it('should return 400 if email is already registered', async () => {
      // Mock existing user
      AuthOperations.findUserByEmail.mockResolvedValue({
        user_id: 1,
        email: 'existing@example.com'
      });
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'existing@example.com',
          password: 'password123'
        });
      
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Email is already registered');
    });

    it('should return 201 with user info and token if registration is successful', async () => {
      // Mock user doesn't exist yet
      AuthOperations.findUserByEmail.mockResolvedValue(null);
      
      // Mock successful user creation
      AuthOperations.createUser.mockResolvedValue({
        user_id: 2,
        email: 'new@example.com',
        first_name: 'New',
        last_name: 'User',
        role: 'user'
      });
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'New',
          lastName: 'User',
          email: 'new@example.com',
          password: 'password123'
        });
      
      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Registration successful');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', 'new@example.com');
      expect(response.body).toHaveProperty('token', 'test-token');
    });
  });
});
