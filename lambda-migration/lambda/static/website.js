/**
 * Static Website Lambda Function
 * Serves the homepage and static assets for the yoga website
 */

const { createResponse } = require('./utils');
const { serveBlogPage } = require('./blog');
const { serveBlogPostPage } = require('./blog-post');
const fs = require('fs').promises;
const path = require('path');
const mime = require('mime-types');

// Base64 encoded green square with "G" favicon
const FAVICON_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAA/0lEQVR4AezBMQEAAADCIPunNsU+YAAAAAAAAAAA4M2bd5Ll2nLlCkJIwhOe8IQnPOEJT3jCE57whCc84QlPeMITnvCEJzzhCU94whOe8IQnPOEJT3jCE57whCc84QlPeMITnvCEJzzhCU94whOe8IQnPOEJT3jCE57whCc84QlPeMITnvCEJzzhCU94whOe8IQnPOEJT3jCE57whCc84QlPeMITnvCEJzzhCU94whOe8IQnPOEJT3jCE57whCc84QlPeMITnvCEJzzhCU94whOe8IQnPOEJT3jCE57whCc84QlPeMITnvCEJzzhCU94whOe8IQnPOEJT3jCE57whCc8sQYW/gAP/yPkUAAAAABJRU5ErkJggg==';

// Map of static files to their content types or generators
const STATIC_FILES = {
  '/images/favicon/apple-touch-icon.png': () => Buffer.from(FAVICON_BASE64, 'base64'),
  '/images/favicon/favicon-32x32.png': () => Buffer.from(FAVICON_BASE64, 'base64'),
  '/images/favicon/favicon-16x16.png': () => Buffer.from(FAVICON_BASE64, 'base64'),
  '/images/favicon/android-chrome-192x192.png': () => Buffer.from(FAVICON_BASE64, 'base64'),
  '/images/favicon/android-chrome-512x512.png': () => Buffer.from(FAVICON_BASE64, 'base64'),
  '/favicon.ico': () => Buffer.from(FAVICON_BASE64, 'base64')
};

/**
 * Serve a static file from the static directory
 */
async function serveStaticFile(filePath) {
  try {
    const fileHandler = STATIC_FILES[filePath];
    if (typeof fileHandler === 'function') {
      const content = fileHandler();
      return createResponse(200, content, {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000'
      });
    }
    
    const contentType = mime.lookup(filePath) || 'application/octet-stream';
    const content = await fs.readFile(path.join(__dirname, filePath));
    return createResponse(200, content, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000'
    });
  } catch (error) {
    console.error('Error serving static file:', error);
    return createResponse(404, 'File not found', {
      'Content-Type': 'text/plain'
    });
  }
}

exports.handler = async (event, context) => {
  const requestId = context.awsRequestId;
  
  try {
    console.log('Static website request:', {
      requestId,
      path: event.path,
      httpMethod: event.httpMethod,
      headers: event.headers
    });

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, '', {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
    }

    // Extract path from event
    const requestPath = event.path || event.pathParameters?.proxy || '/';
    
    // Serve homepage for root path
    if (requestPath === '/' || requestPath === '/index.html') {
      return serveHomepage();
    }
    
    // Serve blog page HTML (separate from blog API)
    if (requestPath === '/blog-page' || requestPath === '/blog.html') {
      return serveBlogPage();
    }
    
    // Serve individual blog post pages
    if (requestPath.startsWith('/blog-page/') && requestPath !== '/blog-page') {
      const slug = requestPath.replace('/blog-page/', '');
      return serveBlogPostPage(slug);
    }
    
    // Serve static files
    if (STATIC_FILES[requestPath]) {
      return serveStaticFile(requestPath);
    }

    // Serve site manifest
    if (requestPath === '/site.webmanifest') {
      return createResponse(200, JSON.stringify({
        "name": "Gabi Yoga",
        "short_name": "Gabi Yoga",
        "icons": [
          {
            "src": "/images/favicon/android-chrome-192x192.png",
            "sizes": "192x192",
            "type": "image/png"
          },
          {
            "src": "/images/favicon/android-chrome-512x512.png",
            "sizes": "512x512",
            "type": "image/png"
          }
        ],
        "theme_color": "#4CAF50",
        "background_color": "#ffffff",
        "display": "standalone"
      }), {
        'Content-Type': 'application/manifest+json'
      });
    }

    // 404 for other paths
    return createResponse(404, 'Page not found', {
      'Content-Type': 'text/plain'
    });

  } catch (error) {
    console.error('Static website error:', {
      requestId,
      error: error.message,
      stack: error.stack
    });

    return createResponse(500, 'Internal server error', {
      'Content-Type': 'text/plain'
    });
  }
};

/**
 * Serve the homepage with the actual yoga website content
 */
async function serveHomepage() {
  try {
    const homepage = await fs.readFile(path.join(__dirname, 'homepage.html'), 'utf8');
    return createResponse(200, homepage, {
      'Content-Type': 'text/html; charset=utf-8'
    });
  } catch (error) {
    console.error('Error serving homepage:', error);
    return createResponse(500, 'Error loading homepage', {
      'Content-Type': 'text/plain'
    });
  }
}
