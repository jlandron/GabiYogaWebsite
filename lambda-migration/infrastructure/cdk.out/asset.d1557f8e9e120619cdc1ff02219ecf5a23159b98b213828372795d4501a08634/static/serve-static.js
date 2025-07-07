const fs = require('fs').promises;
const path = require('path');
const cdnUtils = require('../shared/cdn-utils');

// Function to determine if a file should be served from CloudFront
function shouldServeFromCdn(ext, filePath) {
    // Always serve these static asset types from CDN
    const cdnExtensions = [
        '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', 
        '.svg', '.ico', '.webp', '.woff', '.woff2', 
        '.ttf', '.eot', '.pdf', '.mp4', '.mp3'
    ];
    
    // Don't serve HTML files from CDN as they may contain dynamic content
    if (ext === '.html') {
        return false;
    }
    
    // Check if extension is in the list of CDN-servable extensions
    return cdnExtensions.includes(ext);
}

// Function to determine cache control headers based on file type
function getCacheControlHeader(ext) {
    // Images, fonts, and other static assets that rarely change
    if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.woff', '.woff2', '.ttf', '.eot'].includes(ext)) {
        // Cache for 1 year (31536000 seconds)
        return 'public, max-age=31536000, immutable';
    }
    
    // CSS and JS files - cache for 1 week but allow revalidation
    else if (['.css', '.js'].includes(ext)) {
        // Cache for 1 week (604800 seconds)
        return 'public, max-age=604800, must-revalidate';
    }
    
    // HTML files - cache for 1 hour but check for updates
    else if (ext === '.html') {
        // Cache for 1 hour (3600 seconds)
        return 'public, max-age=3600, must-revalidate';
    }
    
    // JSON and other data files - cache for 1 day
    else if (['.json'].includes(ext)) {
        // Cache for 1 day (86400 seconds)
        return 'public, max-age=86400, must-revalidate';
    }
    
    // Default for other file types - cache for 5 minutes
    else {
        return 'public, max-age=300';
    }
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
        
        console.log('Static file request path:', filePath);
        
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
        
        // Set CloudFront URL for the asset if it's a static asset type that should be served from CDN
        // but allow for local development without CloudFront
        let cdnRedirect = false;
        
        if (process.env.USE_CLOUDFRONT === 'true' && shouldServeFromCdn(ext, filePath)) {
            const cdnUrl = cdnUtils.getAssetUrl(filePath);
            console.log(`Redirecting to CloudFront: ${cdnUrl}`);
            
            return {
                statusCode: 302, // Temporary redirect
                headers: {
                    'Location': cdnUrl,
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-cache'
                }
            };
        }
        
        // If not using CloudFront or it's a file that should be served directly
        return {
            statusCode: 200,
            headers: {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': getCacheControlHeader(ext)
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
