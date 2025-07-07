/**
 * Unit tests for admin-customer-dashboard.js API routes
 * 
 * These tests verify functionality of the admin customer dashboard endpoints.
 */

// Mock the dependencies
jest.mock('../../database/db-config', () => ({
  query: jest.fn()
}));

jest.mock('../../database/data-access', () => ({
  AuthOperations: {
    getUserById: jest.fn()
  }
}));

// Import the mocked modules
const { query } = require('../../database/db-config');
const { AuthOperations } = require('../../database/data-access');
const express = require('express');
const request = require('supertest');

// Set up the test environment
describe('Admin Customer Dashboard API', () => {
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
    
    // Import the admin-customer-dashboard routes
    const adminCustomerDashboardRouter = require('../../api/admin-customer-dashboard');
    
    // Add the routes to our test app
    app.use('/api/admin', adminCustomerDashboardRouter);
  });
  
  // Test requireAdmin middleware
  describe('requireAdmin middleware', () => {
    it('should allow admin users to access protected routes', async () => {
      // Admin role is set in beforeEach
      
      AuthOperations.getUserById.mockResolvedValue({
        user_id: 1,
        first_name: 'Admin',
        last_name: 'User',
        email: 'admin@example.com',
        role: 'admin'
      });
      
      const response = await request(app).get('/api/admin/profile');
      
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
      
      const adminCustomerDashboardRouter = require('../../api/admin-customer-dashboard');
      app.use('/api/admin/non-admin', adminCustomerDashboardRouter);
      
      const response = await request(app).get('/api/admin/non-admin/profile');
      
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
      
      const adminCustomerDashboardRouter = require('../../api/admin-customer-dashboard');
      app.use('/api/admin/unauth', adminCustomerDashboardRouter);
      
      const response = await request(app).get('/api/admin/unauth/profile');
      
      expect(response.statusCode).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });
  });
  
  // Test GET /profile endpoint
  describe('GET /profile', () => {
    it('should return admin profile information', async () => {
      // Mock the getUserById function to return admin data
      AuthOperations.getUserById.mockResolvedValue({
        user_id: 1,
        first_name: 'Admin',
        last_name: 'User',
        email: 'admin@example.com',
        role: 'admin',
        created_at: '2025-01-01T00:00:00.000Z'
      });
      
      const response = await request(app).get('/api/admin/profile');
      
      expect(response.statusCode).toBe(200);
      expect(AuthOperations.getUserById).toHaveBeenCalledWith(1);
      expect(response.body).toHaveProperty('user_id', 1);
      expect(response.body).toHaveProperty('first_name', 'Admin');
      expect(response.body).toHaveProperty('role', 'admin');
    });
    
    it('should return 404 if admin user not found', async () => {
      // Mock user not found scenario
      AuthOperations.getUserById.mockResolvedValue(null);
      
      const response = await request(app).get('/api/admin/profile');
      
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Admin user not found');
    });
    
    it('should return 500 if database error occurs', async () => {
      // Mock database error
      AuthOperations.getUserById.mockRejectedValue(new Error('Database connection failed'));
      
      const response = await request(app).get('/api/admin/profile');
      
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Failed to fetch admin profile');
    });
  });
  
  // Test GET /customer-dashboard/bookings endpoint
  describe('GET /customer-dashboard/bookings', () => {
    it('should return admin bookings', async () => {
      // Mock bookings data
      const mockBookings = [
        {
          booking_id: 1,
          class_name: 'Yoga Flow',
          date: '2025-05-15',
          start_time: '09:00:00',
          duration: 60,
          instructor: 'Gabi Jyoti',
          status: 'Confirmed'
        },
        {
          booking_id: 2,
          class_name: 'Meditation',
          date: '2025-05-16',
          start_time: '10:00:00',
          duration: 45,
          instructor: 'Gabi Jyoti',
          status: 'Confirmed'
        }
      ];
      
      query.mockResolvedValue(mockBookings);
      
      const response = await request(app).get('/api/admin/customer-dashboard/bookings');
      
      expect(response.statusCode).toBe(200);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining([1]) // user_id from the mock user
      );
      expect(response.body).toEqual(mockBookings);
    });
    
    it('should return empty array if no bookings found', async () => {
      // Mock no bookings
      query.mockResolvedValue([]);
      
      const response = await request(app).get('/api/admin/customer-dashboard/bookings');
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([]);
    });
    
    it('should return 500 if database error occurs', async () => {
      // Mock database error
      query.mockRejectedValue(new Error('Database error'));
      
      const response = await request(app).get('/api/admin/customer-dashboard/bookings');
      
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Failed to fetch admin bookings');
    });
  });
  
  // Test GET /customer-dashboard/memberships endpoint
  describe('GET /customer-dashboard/memberships', () => {
    it('should return admin memberships', async () => {
      // Mock memberships data
      const mockMemberships = [
        {
          membership_id: 1,
          membership_type: 'Monthly Unlimited',
          start_date: '2025-05-01',
          end_date: '2025-05-31',
          classes_remaining: null,
          auto_renew: true,
          status: 'Active',
          price: 149.99
        }
      ];
      
      query.mockResolvedValue(mockMemberships);
      
      const response = await request(app).get('/api/admin/customer-dashboard/memberships');
      
      expect(response.statusCode).toBe(200);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining([1]) // user_id from the mock user
      );
      expect(response.body).toEqual(mockMemberships);
    });
    
    it('should return empty array if no memberships found', async () => {
      // Mock no memberships
      query.mockResolvedValue([]);
      
      const response = await request(app).get('/api/admin/customer-dashboard/memberships');
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([]);
    });
    
    it('should return 500 if database error occurs', async () => {
      // Mock database error
      query.mockRejectedValue(new Error('Database error'));
      
      const response = await request(app).get('/api/admin/customer-dashboard/memberships');
      
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Failed to fetch admin memberships');
    });
  });
  
  // Test GET /customer-dashboard/payments endpoint
  describe('GET /customer-dashboard/payments', () => {
    it('should return admin payments', async () => {
      // Mock payments data
      const mockPayments = [
        {
          payment_id: 1,
          amount: 149.99,
          payment_date: '2025-05-01',
          payment_method: 'Credit Card',
          payment_reference: 'ch_123456',
          payment_type: 'Membership',
          related_id: 1
        }
      ];
      
      query.mockResolvedValue(mockPayments);
      
      const response = await request(app).get('/api/admin/customer-dashboard/payments');
      
      expect(response.statusCode).toBe(200);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining([1]) // user_id from the mock user
      );
      expect(response.body).toEqual(mockPayments);
    });
    
    it('should return empty array if no payments found', async () => {
      // Mock no payments
      query.mockResolvedValue([]);
      
      const response = await request(app).get('/api/admin/customer-dashboard/payments');
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([]);
    });
    
    it('should return 500 if database error occurs', async () => {
      // Mock database error
      query.mockRejectedValue(new Error('Database error'));
      
      const response = await request(app).get('/api/admin/customer-dashboard/payments');
      
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Failed to fetch admin payments');
    });
  });
  
  // Test GET /customer-dashboard/workshops endpoint
  describe('GET /customer-dashboard/workshops', () => {
    it('should return registered and upcoming workshops', async () => {
      // Mock registered workshops
      const mockRegisteredWorkshops = [
        {
          workshop_id: 1,
          title: 'Yoga for Stress Relief',
          description: 'A workshop focused on stress relief techniques',
          date: '2025-06-15',
          start_time: '14:00:00',
          end_time: '16:00:00',
          location: 'Main Studio',
          price: 45.00,
          member_price: 35.00
        }
      ];
      
      // Mock upcoming workshops
      const mockUpcomingWorkshops = [
        {
          workshop_id: 2,
          title: 'Advanced Inversions',
          description: 'Learn advanced inversion techniques',
          date: '2025-06-22',
          start_time: '10:00:00',
          end_time: '12:00:00',
          location: 'Main Studio',
          price: 55.00,
          member_price: 45.00
        }
      ];
      
      // First query returns registered workshops, second returns upcoming workshops
      query.mockResolvedValueOnce(mockRegisteredWorkshops);
      query.mockResolvedValueOnce(mockUpcomingWorkshops);
      
      const response = await request(app).get('/api/admin/customer-dashboard/workshops');
      
      expect(response.statusCode).toBe(200);
      expect(query).toHaveBeenCalledTimes(2);
      expect(response.body).toEqual([...mockRegisteredWorkshops, ...mockUpcomingWorkshops]);
    });
    
    it('should handle case with no workshops', async () => {
      // Mock no workshops found
      query.mockResolvedValueOnce([]);
      query.mockResolvedValueOnce([]);
      
      const response = await request(app).get('/api/admin/customer-dashboard/workshops');
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([]);
    });
    
    it('should return 500 if database error occurs', async () => {
      // Mock database error
      query.mockRejectedValue(new Error('Database error'));
      
      const response = await request(app).get('/api/admin/customer-dashboard/workshops');
      
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Failed to fetch admin workshops');
    });
  });
  
  // Test GET /customer-dashboard/retreats endpoint
  describe('GET /customer-dashboard/retreats', () => {
    it('should return retreats data', async () => {
      // Mock retreats data
      const mockRetreats = [
        {
          retreat_id: 1,
          title: 'Bali Yoga Retreat',
          description: 'A week of yoga and meditation in Bali',
          start_date: '2025-08-15',
          end_date: '2025-08-22',
          location: 'Bali, Indonesia',
          venue_name: 'Peaceful Resort',
          price: 1999.99,
          member_price: 1799.99,
          image_url: '/images/retreats/bali.jpg'
        }
      ];
      
      query.mockResolvedValue(mockRetreats);
      
      const response = await request(app).get('/api/admin/customer-dashboard/retreats');
      
      expect(response.statusCode).toBe(200);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
      expect(response.body).toEqual(mockRetreats);
    });
    
    it('should return empty array if no retreats found', async () => {
      // Mock no retreats
      query.mockResolvedValue([]);
      
      const response = await request(app).get('/api/admin/customer-dashboard/retreats');
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([]);
    });
    
    it('should return 500 if database error occurs', async () => {
      // Mock database error
      query.mockRejectedValue(new Error('Database error'));
      
      const response = await request(app).get('/api/admin/customer-dashboard/retreats');
      
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Failed to fetch admin retreats');
    });
  });
  
  // Test GET /customer-dashboard/sessions endpoint
  describe('GET /customer-dashboard/sessions', () => {
    it('should return admin private sessions', async () => {
      // Mock sessions data
      const mockSessions = [
        {
          session_id: 1,
          date: '2025-05-20',
          start_time: '15:00:00',
          duration: 60,
          focus: 'Flexibility',
          package_type: 'Single Session',
          price: 75.00,
          location: 'Private Studio',
          status: 'Confirmed'
        }
      ];
      
      query.mockResolvedValue(mockSessions);
      
      const response = await request(app).get('/api/admin/customer-dashboard/sessions');
      
      expect(response.statusCode).toBe(200);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining([1]) // user_id from the mock user
      );
      expect(response.body).toEqual(mockSessions);
    });
    
    it('should return empty array if no sessions found', async () => {
      // Mock no sessions
      query.mockResolvedValue([]);
      
      const response = await request(app).get('/api/admin/customer-dashboard/sessions');
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([]);
    });
    
    it('should return 500 if database error occurs', async () => {
      // Mock database error
      query.mockRejectedValue(new Error('Database error'));
      
      const response = await request(app).get('/api/admin/customer-dashboard/sessions');
      
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Failed to fetch admin private sessions');
    });
  });
});
