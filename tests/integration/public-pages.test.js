/**
 * Integration tests for public pages
 * 
 * These tests verify that all public pages are accessible
 * and load correctly with the expected content.
 */

const puppeteer = require('puppeteer');

// Base URL for testing - using localhost:5001 as specified
const BASE_URL = 'http://localhost:5001';

// List of public pages to test
const PUBLIC_PAGES = [
  { path: '/', title: 'Gabi Yoga', elements: ['.hero', '.nav-links', '.footer'] },
  { path: '/blog.html', title: 'Blog', elements: ['.blog-container', '.nav-links'] },
  { path: '/login.html', title: 'Login', elements: ['.login-form', '.nav-links'] },
  { path: '/forgot-password.html', title: 'Forgot Password', elements: ['.password-reset-form'] },
];

describe('Public Pages Accessibility Tests', () => {
  let browser;
  let page;
  
  // Set a longer timeout for browser tests
  jest.setTimeout(30000);

  beforeAll(async () => {
    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  afterAll(async () => {
    // Close browser after all tests
    await browser.close();
  });

  beforeEach(async () => {
    // Create a new page for each test
    page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({
      width: 1280,
      height: 800
    });
    
    // Enable console logging for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`Page Error: ${msg.text()}`);
      }
    });
  });

  afterEach(async () => {
    // Close the page after each test
    await page.close();
  });

  describe('Server health check', () => {
    // First test to verify API is available
    it('should have a healthy API endpoint', async () => {
      try {
        const response = await page.goto(`${BASE_URL}/api/health`);
        expect(response.status()).toBe(200);
        
        // Parse response body as JSON
        const responseText = await page.evaluate(() => document.body.textContent);
        const data = JSON.parse(responseText);
        
        expect(data).toHaveProperty('status', 'ok');
      } catch (error) {
        console.error('Server health check failed:', error);
        throw new Error('Server may not be running. Start with npm run dev before running tests.');
      }
    });
  });

  describe('Public pages accessibility', () => {
    // Test each public page
    PUBLIC_PAGES.forEach(({ path, title, elements }) => {
      it(`should load ${path} successfully`, async () => {
        // Skip test if server is not reachable
        try {
          // Navigate to page
          const response = await page.goto(`${BASE_URL}${path}`, {
            waitUntil: 'networkidle0',
            timeout: 10000
          });
          
          // Check status code
          expect(response.status()).toBe(200);
          
          // Check page title
          const pageTitle = await page.title();
          expect(pageTitle).toContain(title);
          
          // Test for important elements
          if (elements && elements.length) {
            for (const selector of elements) {
              const element = await page.$(selector);
              expect(element).not.toBeNull();
            }
          }
          
          // Check for error messages in console
          const consoleLogs = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('body'))
              .map(el => el.innerText)
              .find(text => text.includes('Error') || text.includes('error') || text.includes('not found'));
          });
          
          expect(consoleLogs).toBeUndefined();
          
        } catch (error) {
          console.warn(`Test for ${path} skipped: ${error.message}`);
          // Mark test as skipped rather than failed if server isn't running
          if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
            pending(`Server not running on ${BASE_URL}`);
          } else {
            throw error;
          }
        }
      });
    });
  });

  describe('Protected page redirects', () => {
    const PROTECTED_PAGES = [
      '/admin-dashboard.html',
      '/admin-members.html',
      '/admin-schedule.html',
    ];
    
    // Test that protected pages redirect without auth
    PROTECTED_PAGES.forEach(path => {
      it(`should redirect from ${path} to login when not authenticated`, async () => {
        try {
          // Try to navigate to protected page
          const response = await page.goto(`${BASE_URL}${path}`, {
            waitUntil: 'networkidle0',
            timeout: 5000
          });
          
          // Check final URL - should redirect to login
          const finalUrl = page.url();
          expect(finalUrl).toContain('login.html');
          
          // Check for login form
          const loginForm = await page.$('.login-form');
          expect(loginForm).not.toBeNull();
        } catch (error) {
          console.warn(`Test for ${path} skipped: ${error.message}`);
          
          // Mark test as skipped rather than failed if server isn't running
          if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
            pending(`Server not running on ${BASE_URL}`);
          } else {
            throw error;
          }
        }
      });
    });
  });
});
