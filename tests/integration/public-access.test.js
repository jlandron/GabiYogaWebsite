/**
 * Integration tests for public page access
 * 
 * Tests that all publicly accessible pages load successfully
 */

const request = require('supertest');
const app = require('../../server');
const fs = require('fs');
const path = require('path');

describe('Public Page Access', () => {
  // List of public pages to test
  const publicPages = [
    { path: '/', name: 'Home Page' },
    { path: '/blog.html', name: 'Blog Page' },
    { path: '/login.html', name: 'Login Page' },
    { path: '/forgot-password.html', name: 'Forgot Password Page' },
    { path: '/reset-password.html', name: 'Reset Password Page' }
  ];
  
  // Test each page individually
  test.each(publicPages)('$name should load successfully', async ({ path }) => {
    const response = await request(app).get(path);
    expect(response.status).toBe(200);
    expect(response.type).toMatch(/html/);
    expect(response.text).toMatch(/<html/i); // Verify the response contains HTML
  });
  
  it('should return 404 for non-existent pages', async () => {
    const response = await request(app).get('/page-does-not-exist');
    expect(response.status).toBe(404);
  });
  
  it('should serve static files (CSS, JS, images)', async () => {
    // Test CSS file
    const cssResponse = await request(app).get('/css/public-unified.css');
    expect(cssResponse.status).toBe(200);
    expect(cssResponse.type).toContain('css');
    
    // Test JS file
    const jsResponse = await request(app).get('/js/script.js');
    expect(jsResponse.status).toBe(200);
    expect(jsResponse.type).toContain('javascript');
    
    // Test image file (finding an actual image in the project)
    const images = fs.readdirSync(path.join(process.cwd(), 'images'))
      .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
    
    if (images.length > 0) {
      const imagePath = `/images/${images[0]}`;
      const imageResponse = await request(app).get(imagePath);
      expect(imageResponse.status).toBe(200);
      expect(imageResponse.type).toMatch(/image\//);
    }
  });
  
  it('should redirect to login for protected admin pages', async () => {
    const response = await request(app)
      .get('/admin-dashboard.html')
      .set('Accept', 'text/html');
      
    // Either we get redirected to login or receive a 401/403
    expect([301, 302, 401, 403]).toContain(response.status);
  });
});
