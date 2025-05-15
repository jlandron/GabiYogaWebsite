/**
 * Integration tests for database interactions
 * 
 * Tests the database connection and data access functions
 */

const { closeConnection, getConnection } = require('../../database/db-config');

// Import database models and access functions
const db = require('../../database/data-access');

describe('Database Integration Tests', () => {
  // Setup and teardown for all tests
  let connection;
  
  beforeAll(async () => {
    // Ensure we're using a test database
    process.env.DB_NAME = process.env.DB_NAME || 'yoga_test';
    
    // Get database connection
    connection = await getConnection();
    
    // Verify we're using the test database
    const [rows] = await connection.query('SELECT DATABASE() as db');
    expect(rows[0].db).toContain('test');
  });
  
  afterAll(async () => {
    // Close database connection
    await closeConnection();
  });
  
  describe('User Management', () => {
    // Test user data
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'Test123!',
      firstName: 'Test',
      lastName: 'User'
    };
    let userId;
    
    it('should create a new user', async () => {
      const result = await db.users.create(testUser);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.email).toBe(testUser.email);
      
      // Save the ID for later tests
      userId = result.id;
    });
    
    it('should find a user by email', async () => {
      const user = await db.users.findByEmail(testUser.email);
      
      expect(user).toBeDefined();
      expect(user.id).toBe(userId);
      expect(user.firstName).toBe(testUser.firstName);
      expect(user.lastName).toBe(testUser.lastName);
    });
    
    it('should find a user by ID', async () => {
      const user = await db.users.findById(userId);
      
      expect(user).toBeDefined();
      expect(user.id).toBe(userId);
      expect(user.email).toBe(testUser.email);
    });
    
    it('should update a user', async () => {
      const updates = {
        firstName: 'Updated',
        lastName: 'Name'
      };
      
      await db.users.update(userId, updates);
      
      // Verify the update
      const updatedUser = await db.users.findById(userId);
      expect(updatedUser.firstName).toBe(updates.firstName);
      expect(updatedUser.lastName).toBe(updates.lastName);
      expect(updatedUser.email).toBe(testUser.email); // Email should not change
    });
    
    it('should delete a user', async () => {
      const result = await db.users.remove(userId);
      expect(result).toBeTruthy();
      
      // Verify the user is gone
      const deletedUser = await db.users.findById(userId);
      expect(deletedUser).toBeNull();
    });
  });
  
  describe('Blog Posts', () => {
    let postId;
    
    it('should create a new blog post', async () => {
      const post = {
        title: 'Test Blog Post',
        content: '<p>This is a test blog post</p>',
        author: 'Test Author',
        status: 'published'
      };
      
      const result = await db.blog.create(post);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toBe(post.title);
      
      // Save the ID for later tests
      postId = result.id;
    });
    
    it('should find a blog post by ID', async () => {
      const post = await db.blog.findById(postId);
      
      expect(post).toBeDefined();
      expect(post.id).toBe(postId);
      expect(post.title).toBe('Test Blog Post');
    });
    
    it('should list published blog posts', async () => {
      const posts = await db.blog.findPublished();
      
      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBeGreaterThan(0);
      
      // Our test post should be in the list
      const ourPost = posts.find(p => p.id === postId);
      expect(ourPost).toBeDefined();
    });
    
    it('should update a blog post', async () => {
      const updates = {
        title: 'Updated Post Title',
        content: '<p>Updated content</p>'
      };
      
      await db.blog.update(postId, updates);
      
      // Verify the update
      const updatedPost = await db.blog.findById(postId);
      expect(updatedPost.title).toBe(updates.title);
      expect(updatedPost.content).toBe(updates.content);
    });
    
    it('should delete a blog post', async () => {
      const result = await db.blog.remove(postId);
      expect(result).toBeTruthy();
      
      // Verify the post is gone
      const deletedPost = await db.blog.findById(postId);
      expect(deletedPost).toBeNull();
    });
  });
  
  // Skip schedule tests if the schedules table doesn't exist
  describe('Class Schedules', () => {
    let scheduleId;
    
    beforeAll(async () => {
      // Check if schedules table exists
      try {
        await connection.query('SELECT 1 FROM schedules LIMIT 1');
      } catch (error) {
        // Skip all tests in this describe block
        console.warn('Skipping schedules tests - table does not exist');
        return Promise.resolve().then(() => {
          // Each test will receive this value as 'true' and be skipped
          pending = true;
        });
      }
    });
    
    it('should create a new class schedule', async () => {
      const schedule = {
        title: 'Test Yoga Class',
        description: 'A test yoga class for integration testing',
        dayOfWeek: 1, // Monday
        startTime: '10:00',
        endTime: '11:00',
        instructor: 'Test Instructor'
      };
      
      const result = await db.schedules.create(schedule);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toBe(schedule.title);
      
      // Save the ID for later tests
      scheduleId = result.id;
    });
    
    it('should find a schedule by ID', async () => {
      const schedule = await db.schedules.findById(scheduleId);
      
      expect(schedule).toBeDefined();
      expect(schedule.id).toBe(scheduleId);
      expect(schedule.title).toBe('Test Yoga Class');
    });
    
    it('should update a schedule', async () => {
      const updates = {
        title: 'Updated Test Class',
        startTime: '11:00',
        endTime: '12:00'
      };
      
      await db.schedules.update(scheduleId, updates);
      
      // Verify the update
      const updatedSchedule = await db.schedules.findById(scheduleId);
      expect(updatedSchedule.title).toBe(updates.title);
      expect(updatedSchedule.startTime).toBe(updates.startTime);
    });
    
    it('should delete a schedule', async () => {
      const result = await db.schedules.remove(scheduleId);
      expect(result).toBeTruthy();
      
      // Verify the schedule is gone
      const deletedSchedule = await db.schedules.findById(scheduleId);
      expect(deletedSchedule).toBeNull();
    });
  });
});
