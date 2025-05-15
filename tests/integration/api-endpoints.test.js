/**
 * Integration tests for API endpoints
 * 
 * Tests the API endpoints to ensure they're responding correctly
 */

const request = require('supertest');
const app = require('../../server');
const jwt = require('jsonwebtoken');

// Mock data for tests
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'user'
};

// Helper function to generate a valid token for testing
const generateTestToken = (user = mockUser) => {
  const secret = process.env.JWT_SECRET || 'test-secret';
  return jwt.sign(user, secret, { expiresIn: '1h' });
};

describe('API Endpoints', () => {
  describe('API Health Check', () => {
    it('should return 200 OK for API health endpoint', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
    });
  });

  describe('Auth API', () => {
    it('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
    
    it('should reject registration with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          // Missing other required fields
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });
  
  describe('Protected API Endpoints', () => {
    it('should reject requests without authorization', async () => {
      const response = await request(app).get('/api/dashboard');
      
      expect([401, 403]).toContain(response.status);
      expect(response.body).toHaveProperty('success', false);
    });
    
    it('should accept requests with valid authorization', async () => {
      // Skip if JWT_SECRET is not set in the environment for testing
      if (!process.env.JWT_SECRET) {
        console.warn('JWT_SECRET not set, skipping authenticated API test');
        return;
      }
      
      const token = generateTestToken();
      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${token}`);
      
      // Should be either 200 (success) or 404 (endpoint exists but no data found)
      // Both indicate the auth mechanism is working
      expect([200, 404]).toContain(response.status);
    });
  });
  
  // Testing error handling for API endpoints
  describe('API Error Handling', () => {
    it('should return 404 for non-existent API endpoints', async () => {
      const response = await request(app).get('/api/endpoint-does-not-exist');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
    });
    
    it('should handle server errors gracefully', async () => {
      // Causing an error by sending malformed JSON
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"email": "test@example.com", "password": malformed}');
      
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });
});
