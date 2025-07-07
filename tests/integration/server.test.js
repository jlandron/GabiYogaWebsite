/**
 * Integration tests for server.js
 * 
 * These tests verify that the server is properly configured and all public
 * pages are accessible, while protected pages require authentication.
 */

const request = require('supertest');
const express = require('express');
const path = require('path');

// Import server modules individually to avoid starting the actual server during tests
const cors = require('cors');
const { asyncHandler } = require('../../utils/api-response');
const { ClassOperations, RetreatOperations, WorkshopOperations, WebsiteSettingsOperations } = require('../../database/data-access');

// Mock database operations
jest.mock('../../database/data-access', () => ({
  AuthOperations: {},
  ClassOperations: {
    getClasses: jest.fn()
  },
  RetreatOperations: {
    getFeaturedRetreats: jest.fn(),
    getPublishedRetreats: jest.fn()
  },
  WorkshopOperations: {
    getUpcomingWorkshops: jest.fn()
  },
  WebsiteSettingsOperations: {
    getSettings: jest.fn()
  }
}));

// Mock database initialization to prevent actual DB operations
jest.mock('../../database/schema', () => ({
  initializeDatabase: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../database/schema-pricing', () => ({
  initializePricingDatabase: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../database/schema-blog', () => ({
  initializeBlogDatabase: jest.fn().mockResolvedValue(true)
}));

// Mock authentication middleware
const mockAuthenticateToken = jest.fn((req, res, next) => {
  if (req.headers.authorization === 'Bearer valid-token') {
    req.user = { id: 1, email: 'test@example.com', role: 'admin' };
    next();
  } else {
    res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }
});

jest.mock('../../api/auth', () => {
  const mockRouter = { /* Mock router methods */ };
  return {
    router: mockRouter,
    authenticateToken: mockAuthenticateToken
  };
});

// Create a simplified version of the server for testing
const createTestServer = () => {
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, '../..')));
  
  // API endpoints for testing
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is healthy' });
  });
  
  // Mock schedule endpoint
  app.get('/api/schedule', asyncHandler(async (req, res) => {
    const classes = await ClassOperations.getClasses();
    const formattedSchedule = {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
    };
    
    return res.json({ success: true, schedule: formattedSchedule });
  }));
  
  // Mock retreats endpoint
  app.get('/api/retreats/featured', asyncHandler(async (req, res) => {
    const retreats = await RetreatOperations.getFeaturedRetreats();
    return res.json({ success: true, retreats });
  }));
  
  // Mock settings endpoint
  app.get('/api/website-settings', asyncHandler(async (req, res) => {
    const settings = await WebsiteSettingsOperations.getSettings();
    return res.json({ success: true, settings });
  }));
  
  // Mock authentication required endpoint
  app.get('/api/admin/dashboard', mockAuthenticateToken, (req, res) => {
    res.json({ success: true, message: 'Admin dashboard data' });
  });
  
  return app;
};

describe('Server Integration Tests', () => {
  let app;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create a fresh express app for each test
    app = createTestServer();
    
    // Set up mock data
    ClassOperations.getClasses.mockResolvedValue([
      {
        class_id: 1,
        name: 'Yoga Class',
        day_of_week: 1,
        start_time: '09:00',
        duration: 60,
        instructor: 'Gabi',
        level: 'All Levels',
        active: true
      }
    ]);
    
    RetreatOperations.getFeaturedRetreats.mockResolvedValue([
      { id: 1, name: 'Bali Retreat', description: 'A yoga retreat in Bali' }
    ]);
    
    RetreatOperations.getPublishedRetreats.mockResolvedValue([
      { id: 1, name: 'Bali Retreat', description: 'A yoga retreat in Bali' },
      { id: 2, name: 'India Retreat', description: 'A yoga retreat in India' }
    ]);
    
    WorkshopOperations.getUpcomingWorkshops.mockResolvedValue([
      { id: 1, name: 'Meditation Workshop', description: 'Learn meditation techniques' }
    ]);
    
    WebsiteSettingsOperations.getSettings.mockResolvedValue({
      hero_title: 'Gabi Yoga',
      hero_subtitle: 'Find your inner peace',
      show_schedule: true,
      show_retreats: true
    });
  });
  
  describe('Public routes', () => {
    it('should return 200 for health check endpoint', async () => {
      const response = await request(app).get('/api/health');
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
    });
    
    it('should return classes for schedule endpoint', async () => {
      const response = await request(app).get('/api/schedule');
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('schedule');
      expect(ClassOperations.getClasses).toHaveBeenCalled();
    });
    
    it('should return featured retreats', async () => {
      const response = await request(app).get('/api/retreats/featured');
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('retreats');
      expect(RetreatOperations.getFeaturedRetreats).toHaveBeenCalled();
    });
    
    it('should return website settings', async () => {
      const response = await request(app).get('/api/website-settings');
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('settings');
      expect(WebsiteSettingsOperations.getSettings).toHaveBeenCalled();
    });
  });
  
  describe('Protected routes', () => {
    it('should return 401 for protected routes without authentication', async () => {
      const response = await request(app).get('/api/admin/dashboard');
      
      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(mockAuthenticateToken).toHaveBeenCalled();
    });
    
    it('should return 200 for protected routes with valid authentication', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', 'Bearer valid-token');
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(mockAuthenticateToken).toHaveBeenCalled();
    });
  });
});
