/**
 * Unit tests for admin-pricing.js API routes
 * 
 * Tests the API endpoints for managing pricing and offerings
 * including memberships, packages, and private sessions.
 */

// Mock the dependencies
jest.mock('../../database/db-config', () => ({
  query: jest.fn()
}));

// Import the mocked modules
const { query } = require('../../database/db-config');
const express = require('express');
const request = require('supertest');

// Set up the test environment
describe('Admin Pricing API', () => {
  let app;
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Create a fresh express app for each test
    app = express();
    app.use(express.json());
    
    // Add user middleware to simulate authenticated requests
    app.use((req, res, next) => {
      req.user = {
        user_id: 1,
        role: 'admin', // Default to admin role
        first_name: 'Admin',
        last_name: 'User',
        email: 'admin@example.com'
      };
      next();
    });
    
    // Import the admin-pricing routes
    const adminPricingRouter = require('../../api/admin-pricing');
    
    // Add the routes to our test app
    app.use('/api/admin', adminPricingRouter);
    app.use('/api', adminPricingRouter); // For the public pricing endpoint
  });
  
  // Test requireAdmin middleware
  describe('requireAdmin middleware', () => {
    it('should allow admin users to access protected routes', async () => {
      // Admin role is set in beforeEach
      query.mockResolvedValue([]);
      
      const response = await request(app).get('/api/admin/pricing/memberships');
      
      expect(response.statusCode).not.toBe(403);
    });
    
    it('should reject non-admin users with 403 Forbidden', async () => {
      // Override the default admin role
      app.use((req, res, next) => {
        req.user = {
          user_id: 2,
          role: 'user', // Regular user role
          first_name: 'Regular',
          last_name: 'User',
          email: 'user@example.com'
        };
        next();
      });
      
      const adminPricingRouter = require('../../api/admin-pricing');
      app.use('/api/admin/non-admin', adminPricingRouter);
      
      const response = await request(app).get('/api/admin/non-admin/pricing/memberships');
      
      expect(response.statusCode).toBe(403);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Access denied. Admin privileges required.');
    });
    
    it('should reject unauthenticated requests with 403 Forbidden', async () => {
      // Override to remove user object
      app.use((req, res, next) => {
        req.user = null; // No user (unauthenticated)
        next();
      });
      
      const adminPricingRouter = require('../../api/admin-pricing');
      app.use('/api/admin/unauth', adminPricingRouter);
      
      const response = await request(app).get('/api/admin/unauth/pricing/memberships');
      
      expect(response.statusCode).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });
  });
  
  // Test GET /pricing/memberships endpoint
  describe('GET /pricing/memberships', () => {
    it('should return all membership types', async () => {
      // Mock membership data
      const mockMemberships = [
        {
          id: 1,
          type: 'Monthly Unlimited',
          description: 'Unlimited classes for a month',
          price: 149.99,
          duration_days: 30,
          classes: null,
          auto_renew_allowed: 1,
          most_popular: 1,
          status: 'active'
        },
        {
          id: 2,
          type: '10-Class Pack',
          description: '10 classes to use within 90 days',
          price: 170.00,
          duration_days: 90,
          classes: 10,
          auto_renew_allowed: 0,
          most_popular: 0,
          status: 'active'
        }
      ];
      
      query.mockResolvedValue(mockMemberships);
      
      const response = await request(app).get('/api/admin/pricing/memberships');
      
      expect(response.statusCode).toBe(200);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('memberships');
      expect(response.body.memberships).toEqual(mockMemberships);
    });
    
    it('should return 500 if database error occurs', async () => {
      // Mock database error
      query.mockRejectedValue(new Error('Database error'));
      
      const response = await request(app).get('/api/admin/pricing/memberships');
      
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Failed to fetch memberships');
    });
  });
  
  // Test POST /pricing/memberships endpoint
  describe('POST /pricing/memberships', () => {
    it('should create a new membership type', async () => {
      // Mock the query responses for INSERT and SELECT
      const mockLastId = { lastID: 3 };
      
      const mockNewMembership = [{
        id: 3,
        type: 'New Membership',
        description: 'A new membership type',
        price: 99.99,
        duration_days: 60,
        classes: null,
        auto_renew_allowed: 1,
        most_popular: 0,
        status: 'active'
      }];
      
      query.mockImplementation(async (sql, params) => {
        if (sql.includes('INSERT INTO')) {
          return mockLastId;
        } else if (sql.includes('SELECT') && sql.includes('WHERE m.id = ?')) {
          return mockNewMembership;
        }
        return null;
      });
      
      const response = await request(app)
        .post('/api/admin/pricing/memberships')
        .send({
          type: 'New Membership',
          description: 'A new membership type',
          price: 99.99,
          duration_days: 60,
          auto_renew_allowed: true,
          most_popular: false,
          status: 'active'
        });
      
      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Membership type created successfully');
      expect(response.body).toHaveProperty('membership');
      expect(response.body.membership).toEqual(mockNewMembership[0]);
      expect(query).toHaveBeenCalledTimes(2); // INSERT and SELECT (UPDATE was mocked in a different way)
    });
    
    it('should set this membership as most popular and remove from others', async () => {
      // Mock the query responses
      const mockLastId = { lastID: 4 };
      
      const mockNewMembership = [{
        id: 4,
        type: 'Popular Membership',
        price: 129.99,
        most_popular: 1,
        status: 'active'
      }];
      
      query.mockImplementation(async (sql, params) => {
        if (sql.includes('UPDATE membership_types SET most_popular = 0')) {
          return { changes: 3 }; // Updated 3 existing memberships
        } else if (sql.includes('INSERT INTO')) {
          return mockLastId;
        } else if (sql.includes('SELECT') && sql.includes('WHERE m.id = ?')) {
          return mockNewMembership;
        }
        return null;
      });
      
      const response = await request(app)
        .post('/api/admin/pricing/memberships')
        .send({
          type: 'Popular Membership',
          price: 129.99,
          most_popular: true
        });
      
      expect(response.statusCode).toBe(201);
      expect(query).toHaveBeenCalledWith('UPDATE membership_types SET most_popular = 0');
    });
    
    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/admin/pricing/memberships')
        .send({
          description: 'Missing type and price',
        });
      
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Membership type and price are required');
    });
    
    it('should return 500 if database error occurs', async () => {
      // Mock database error
      query.mockRejectedValue(new Error('Database error'));
      
      const response = await request(app)
        .post('/api/admin/pricing/memberships')
        .send({
          type: 'Error Membership',
          price: 99.99
        });
      
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Failed to create membership type');
    });
  });
  
  // Test PUT /pricing/memberships/:id endpoint
  describe('PUT /pricing/memberships/:id', () => {
    it('should update an existing membership type', async () => {
      const membershipId = 1;
      
      // Mock the query responses for checking existence and SELECT after update
      const mockExistingMembership = [{ id: membershipId }];
      
      const mockUpdatedMembership = [{
        id: membershipId,
        type: 'Updated Membership',
        description: 'Updated description',
        price: 159.99,
        duration_days: 30,
        classes: null,
        auto_renew_allowed: 0,
        most_popular: 1,
        status: 'active'
      }];
      
      query.mockImplementation(async (sql, params) => {
        if (sql.includes('SELECT id FROM membership_types')) {
          return mockExistingMembership;
        } else if (sql.includes('UPDATE membership_types SET most_popular')) {
          return { changes: 2 }; // Updated other memberships
        } else if (sql.includes('UPDATE membership_types') && sql.includes('SET type')) {
          return { changes: 1 }; // Updated target membership
        } else if (sql.includes('SELECT') && sql.includes('FROM membership_types m')) {
          return mockUpdatedMembership;
        }
        return null;
      });
      
      const response = await request(app)
        .put(`/api/admin/pricing/memberships/${membershipId}`)
        .send({
          type: 'Updated Membership',
          description: 'Updated description',
          price: 159.99,
          duration_days: 30,
          auto_renew_allowed: false,
          most_popular: true,
          status: 'active'
        });
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Membership type updated successfully');
      expect(response.body).toHaveProperty('membership');
      expect(response.body.membership).toEqual(mockUpdatedMembership[0]);
    });
    
    it('should return 404 if membership type not found', async () => {
      // Mock empty result for membership check
      query.mockResolvedValueOnce([]);
      
      const response = await request(app)
        .put('/api/admin/pricing/memberships/999')
        .send({
          type: 'Non-existent Membership',
          price: 99.99
        });
      
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Membership type not found');
    });
    
    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .put('/api/admin/pricing/memberships/1')
        .send({
          description: 'Missing type and price',
        });
      
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Membership type and price are required');
    });
    
    it('should return 500 if database error occurs', async () => {
      // Mock successful membership check but error on update
      query.mockResolvedValueOnce([{ id: 1 }])
           .mockRejectedValueOnce(new Error('Database error'));
      
      const response = await request(app)
        .put('/api/admin/pricing/memberships/1')
        .send({
          type: 'Error Membership',
          price: 99.99
        });
      
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Failed to update membership type');
    });
  });
  
  // Test DELETE /pricing/memberships/:id endpoint
  describe('DELETE /pricing/memberships/:id', () => {
    it('should delete an existing membership type', async () => {
      const membershipId = 1;
      
      // Mock the query responses
      query.mockResolvedValueOnce([{ id: membershipId }]) // Check existence
           .mockResolvedValueOnce({ changes: 1 }); // Delete operation
      
      const response = await request(app)
        .delete(`/api/admin/pricing/memberships/${membershipId}`);
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Membership type deleted successfully');
    });
    
    it('should return 404 if membership type not found', async () => {
      // Mock empty result for membership check
      query.mockResolvedValueOnce([]);
      
      const response = await request(app)
        .delete('/api/admin/pricing/memberships/999');
      
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Membership type not found');
    });
    
    it('should return 500 if database error occurs', async () => {
      // Mock successful membership check but error on delete
      query.mockResolvedValueOnce([{ id: 1 }])
           .mockRejectedValueOnce(new Error('Database error'));
      
      const response = await request(app)
        .delete('/api/admin/pricing/memberships/1');
      
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Failed to delete membership type');
    });
  });
  
  // Test GET /pricing/session-packages endpoint
  describe('GET /pricing/session-packages', () => {
    it('should return all session packages with parsed focus options', async () => {
      // Mock session packages data
      const mockPackages = [
        {
          id: 1,
          name: 'Single Session',
          description: 'One private session',
          sessions: 1,
          price: 85.00,
          session_duration: 60,
          focus_options: JSON.stringify(['Flexibility', 'Strength', 'Relaxation']),
          status: 'active'
        },
        {
          id: 2,
          name: '5-Session Package',
          description: 'Package of 5 private sessions',
          sessions: 5,
          price: 400.00,
          session_duration: 60,
          focus_options: JSON.stringify(['Flexibility', 'Strength', 'Relaxation']),
          status: 'active'
        }
      ];
      
      query.mockResolvedValue(mockPackages);
      
      const response = await request(app).get('/api/admin/pricing/session-packages');
      
      expect(response.statusCode).toBe(200);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('packages');
      expect(response.body.packages[0].focus_options).toEqual(['Flexibility', 'Strength', 'Relaxation']);
      expect(response.body.packages[1].focus_options).toEqual(['Flexibility', 'Strength', 'Relaxation']);
    });
    
    it('should handle empty focus options correctly', async () => {
      // Mock session packages with empty focus options
      const mockPackages = [
        {
          id: 1,
          name: 'Single Session',
          focus_options: null,
          status: 'active'
        }
      ];
      
      query.mockResolvedValue(mockPackages);
      
      const response = await request(app).get('/api/admin/pricing/session-packages');
      
      expect(response.statusCode).toBe(200);
      expect(response.body.packages[0].focus_options).toEqual([]);
    });
    
    it('should return 500 if database error occurs', async () => {
      // Mock database error
      query.mockRejectedValue(new Error('Database error'));
      
      const response = await request(app).get('/api/admin/pricing/session-packages');
      
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Failed to fetch session packages');
    });
  });
  
  // Test POST /pricing/session-packages endpoint
  describe('POST /pricing/session-packages', () => {
    it('should create a new session package', async () => {
      // Mock the query responses for INSERT and SELECT
      const mockLastId = { lastID: 3 };
      
      const mockNewPackage = [{
        id: 3,
        name: 'New Package',
        description: 'A new session package',
        sessions: 3,
        price: 225.00,
        session_duration: 60,
        focus_options: JSON.stringify(['Flexibility', 'Meditation']),
        status: 'active'
      }];
      
      query.mockImplementation(async (sql, params) => {
        if (sql.includes('INSERT INTO')) {
          return mockLastId;
        } else if (sql.includes('SELECT') && sql.includes('WHERE p.id = ?')) {
          return mockNewPackage;
        }
        return null;
      });
      
      const response = await request(app)
        .post('/api/admin/pricing/session-packages')
        .send({
          name: 'New Package',
          description: 'A new session package',
          sessions: 3,
          price: 225.00,
          session_duration: 60,
          focus_options: ['Flexibility', 'Meditation'],
          status: 'active'
        });
      
      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Session package created successfully');
      expect(response.body).toHaveProperty('package');
      expect(response.body.package.name).toBe('New Package');
      expect(response.body.package.focus_options).toEqual(['Flexibility', 'Meditation']);
    });
    
    it('should use default values for optional fields', async () => {
      // Mock query responses
      const mockLastId = { lastID: 4 };
      
      // Return a package with default values
      const mockNewPackage = [{
        id: 4,
        name: 'Minimal Package',
        description: null,
        sessions: 1,
        price: 85.00,
        session_duration: 60, // Default value
        focus_options: '[]',
        status: 'active'
      }];
      
      query.mockImplementation(async (sql, params) => {
        if (sql.includes('INSERT INTO')) {
          // Verify default values in the insert query
          expect(params[4]).toBe(60); // session_duration default
          expect(params[5]).toBe('[]'); // focus_options default
          expect(params[6]).toBe('active'); // status default
          return mockLastId;
        } else if (sql.includes('SELECT')) {
          return mockNewPackage;
        }
        return null;
      });
      
      const response = await request(app)
        .post('/api/admin/pricing/session-packages')
        .send({
          name: 'Minimal Package',
          sessions: 1,
          price: 85.00
        });
      
      expect(response.statusCode).toBe(201);
      expect(response.body.package.session_duration).toBe(60);
      expect(response.body.package.focus_options).toEqual([]);
      expect(response.body.package.status).toBe('active');
    });
    
    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/admin/pricing/session-packages')
        .send({
          description: 'Missing name, sessions, and price',
        });
      
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Package name, number of sessions, and price are required');
    });
    
    it('should return 500 if database error occurs', async () => {
      // Mock database error
      query.mockRejectedValue(new Error('Database error'));
      
      const response = await request(app)
        .post('/api/admin/pricing/session-packages')
        .send({
          name: 'Error Package',
          sessions: 1,
          price: 85.00
        });
      
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Failed to create session package');
    });
  });
  
  // Test PUT /pricing/session-packages/:id endpoint
  describe('PUT /pricing/session-packages/:id', () => {
    it('should update an existing session package', async () => {
      const packageId = 1;
      
      // Mock the query responses for checking existence and SELECT after update
      const mockExistingPackage = [{ id: packageId }];
      
      const mockUpdatedPackage = [{
        id: packageId,
        name: 'Updated Package',
        description: 'Updated description',
        sessions: 5,
        price: 375.00,
        session_duration: 75,
        focus_options: JSON.stringify(['Flexibility', 'Balance', 'Core']),
        status: 'active'
      }];
      
      query.mockImplementation(async (sql, params) => {
        if (sql.includes('SELECT id FROM session_packages')) {
          return mockExistingPackage;
        } else if (sql.includes('UPDATE session_packages')) {
          return { changes: 1 };
        } else if (sql.includes('SELECT') && sql.includes('FROM session_packages p')) {
          return mockUpdatedPackage;
        }
        return null;
      });
      
      const response = await request(app)
        .put(`/api/admin/pricing/session-packages/${packageId}`)
        .send({
          name: 'Updated Package',
          description: 'Updated description',
          sessions: 5,
          price: 375.00,
          session_duration: 75,
          focus_options: ['Flexibility', 'Balance', 'Core'],
          status: 'active'
        });
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Session package updated successfully');
      expect(response.body).toHaveProperty('package');
      expect(response.body.package.name).toBe('Updated Package');
      expect(response.body.package.focus_options).toEqual(['Flexibility', 'Balance', 'Core']);
    });
    
    it('should return 404 if session package not found', async () => {
      // Mock empty result for package check
      query.mockResolvedValueOnce([]);
      
      const response = await request(app)
        .put('/api/admin/pricing/session-packages/999')
        .send({
          name: 'Non-existent Package',
          sessions: 1,
          price: 85.00
        });
      
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Session package not found');
    });
    
    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .put('/api/admin/pricing/session-packages/1')
        .send({
          description: 'Missing name, sessions, and price',
        });
      
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Package name, number of sessions, and price are required');
    });
    
    it('should return 500 if database error occurs', async () => {
      // Mock successful package check but error on update
      query.mockResolvedValueOnce([{ id: 1 }])
           .mockRejectedValueOnce(new Error('Database error'));
      
      const response = await request(app)
        .put('/api/admin/pricing/session-packages/1')
        .send({
          name: 'Error Package',
          sessions: 1,
          price: 85.00
        });
      
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Failed to update session package');
    });
  });
  
  // Test DELETE /pricing/session-packages/:id endpoint
  describe('DELETE /pricing/session-packages/:id', () => {
    it('should delete an existing session package', async () => {
      const packageId = 1;
      
      // Mock the query responses
      query.mockResolvedValueOnce([{ id: packageId }]) // Check existence
           .mockResolvedValueOnce({ changes: 1 }); // Delete operation
      
      const response = await request(app)
        .delete(`/api/admin/pricing/session-packages/${packageId}`);
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Session package deleted successfully');
    });
    
    it('should return 404 if session package not found', async () => {
      // Mock empty result for package check
      query.mockResolvedValueOnce([]);
      
      const response = await request(app)
        .delete('/api/admin/pricing/session-packages/999');
      
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Session package not found');
    });
    
    it('should return 500 if database error occurs', async () => {
      // Mock successful package check but error on delete
      query.mockResolvedValueOnce([{ id: 1 }])
           .mockRejectedValueOnce(new Error('Database error'));
      
      const response = await request(app)
        .delete('/api/admin/pricing/session-packages/1');
      
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Failed to delete session package');
    });
  });
  
  // Test GET /pricing endpoint (public)
  describe('GET /pricing', () => {
    it('should return public pricing data with memberships and session packages', async () => {
      // Mock memberships data
      const mockMemberships = [
        {
          type: 'Monthly Unlimited',
          description: 'Unlimited classes for a month',
          price: 149.99,
          duration_days: 30,
          classes: null,
          auto_renew_allowed: 1,
          most_popular: 1,
          status: 'active'
        }
      ];
      
      // Mock session packages data
      const mockPackages = [
        {
          name: 'Single Session',
          description: 'One private session',
          sessions: 1,
          price: 85.00,
          session_duration: 60,
          focus_options: JSON.stringify(['Flexibility', 'Strength'])
        }
      ];
      
      // Mock the query implementation to return different data based on the query
      query.mockImplementation(async (sql) => {
        if (sql.includes('FROM membership_types')) {
          return mockMemberships;
        } else if (sql.includes('FROM session_packages')) {
          return mockPackages;
        }
        return null;
      });
      
      const response = await request(app).get('/api/pricing');
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('pricing');
      expect(response.body.pricing).toHaveProperty('memberships');
      expect(response.body.pricing).toHaveProperty('sessionPackages');
      expect(response.body.pricing.memberships).toEqual(mockMemberships);
      expect(response.body.pricing.sessionPackages[0].focus_options).toEqual(['Flexibility', 'Strength']);
    });
    
    it('should handle empty memberships and packages', async () => {
      // Mock empty responses for both queries
      query.mockImplementation(async (sql) => {
        return [];
      });
      
      const response = await request(app).get('/api/pricing');
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.pricing.memberships).toEqual([]);
      expect(response.body.pricing.sessionPackages).toEqual([]);
    });
    
    it('should return 500 if database error occurs', async () => {
      // Mock database error
      query.mockRejectedValue(new Error('Database error'));
      
      const response = await request(app).get('/api/pricing');
      
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Failed to fetch pricing data');
    });
  });
});
