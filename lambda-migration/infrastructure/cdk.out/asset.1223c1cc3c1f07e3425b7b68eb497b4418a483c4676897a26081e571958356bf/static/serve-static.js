const fs = require('fs').promises;
const path = require('path');

// Import the dev authentication helper if in dev environment
let devAuth;
try {
  // We use dynamic import to avoid issues in production environment
  devAuth = require('../auth/dev-auth');
} catch (error) {
  // Silently fail if the module doesn't exist (e.g. in prod)
  devAuth = null;
}

// Map file extensions to content types
const contentTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

exports.handler = async (event) => {
    try {
        // Get the file path from the event
        let filePath = event.path || event.pathParameters?.proxy || '';
        const stage = process.env.STAGE || 'dev';
        
        console.log('Static file request path:', filePath);
        
        // Check for authentication in dev environment
        if (stage === 'dev' && devAuth) {
            // Allow access to login page and auth endpoint without authentication
            const isDevLoginPage = filePath === '/dev-login.html' || filePath === 'dev-login.html';
            const isDevAuthEndpoint = filePath === '/dev-auth' || filePath === 'dev-auth';
            
            if (!isDevLoginPage && !isDevAuthEndpoint) {
                // Get cookies from request
                console.log('Checking authentication for dev environment');
                console.log('Request path:', filePath);
                console.log('Headers:', JSON.stringify(event.headers, null, 2));
                
                const cookies = {};
                const cookieHeader = event.headers?.cookie || event.headers?.Cookie;
                
                if (cookieHeader) {
                    console.log('Cookie header found:', cookieHeader);
                    cookieHeader.split(';').forEach(cookie => {
                        const parts = cookie.split('=');
                        const name = parts[0].trim();
                        const value = parts[1]?.trim();
                        if (name && value) {
                            cookies[name] = value;
                            console.log(`Cookie parsed: ${name}=${value ? '[PRESENT]' : '[EMPTY]'}`);
                        }
                    });
                } else {
                    console.log('No cookie header found in request');
                }
                
                // Check for dev access token
                const devCookie = cookies[devAuth.DEV_COOKIE_NAME];
                console.log(`Dev cookie name: ${devAuth.DEV_COOKIE_NAME}, value: ${devCookie ? '[PRESENT]' : '[MISSING]'}`);
                
                // Verify the cookie (verifyCookie is now async)
                const isAuthenticated = devCookie && await devAuth.verifyCookie(devCookie);
                console.log('Authentication result:', isAuthenticated);
                
                // If not authenticated, handle based on content type
                if (!isAuthenticated) {
                    console.log('Unauthenticated access to dev environment');
                    
                    // Get the file extension to determine content type
                    const ext = path.extname(filePath || '').toLowerCase();
                    const isAsset = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico'].includes(ext);
                    
                    if (isAsset) {
                        // For assets (JS, CSS, images), return 401 Unauthorized
                        console.log('Blocking asset access:', filePath);
                        return {
                            statusCode: 401,
                            headers: {
                                'Content-Type': 'application/json',
                                'Cache-Control': 'no-store'
                            },
                            body: JSON.stringify({ error: 'Authentication required' })
                        };
                    } else {
                        // For HTML pages, redirect to login page
                        console.log('Redirecting to login page');
                        
                        // Encode the original URL to redirect back after login
                        let returnUrl = event.path || '/';
                        // Remove any query parameters for cleaner URLs
                        if (returnUrl.includes('?')) {
                            returnUrl = returnUrl.split('?')[0];
                        }
                        returnUrl = encodeURIComponent(returnUrl);
                        
                        return {
                            statusCode: 302,
                            headers: {
                                'Location': `/dev-login.html?returnUrl=${returnUrl}`,
                                'Cache-Control': 'no-store'
                            },
                            body: ''
                        };
                    }
                }
            }
        }
        
        // Handle special HTML pages at the root level
        if (filePath === '/reset-password.html' || filePath === 'reset-password.html') {
            filePath = 'reset-password.html';
        } else if (filePath === '/login.html' || filePath === 'login.html') {
            filePath = 'login.html';
        } else {
            // For other files, remove leading slash and 'static/' if present
            filePath = filePath.replace(/^\//, '').replace(/^static\//, '');
        }

        // Log the cleaned path
        console.log('Cleaned path for static file:', filePath);
        
        // Special handling for favicon.ico
        if (filePath === '/favicon.ico' || filePath === 'favicon.ico') {
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Favicon not found' })
            };
        }
        
        // Get the file extension
        const ext = path.extname(filePath);
        const contentType = contentTypes[ext] || 'application/octet-stream';

        // Read the file from the current directory
        const fileContent = await fs.readFile(path.join(__dirname, filePath), 'utf8');
        
        // Log the file path and content type for debugging
        console.log('Serving file:', {
            path: filePath,
            contentType,
            size: fileContent.length
        });
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
            },
            body: fileContent
        };
    } catch (error) {
        console.error('Error serving static file:', error);
        return {
            statusCode: 404,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'File not found' })
        };
    }
};
