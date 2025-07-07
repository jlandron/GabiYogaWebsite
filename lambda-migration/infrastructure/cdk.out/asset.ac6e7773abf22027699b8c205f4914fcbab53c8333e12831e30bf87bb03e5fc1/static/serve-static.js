const fs = require('fs').promises;
const path = require('path');

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

// Define cache durations (in seconds) for different file types
const cacheDurations = {
    // HTML files: cache for 1 hour
    '.html': 60 * 60,
    // CSS and JS files: cache for 1 week
    '.css': 60 * 60 * 24 * 7,
    '.js': 60 * 60 * 24 * 7,
    // Images and static assets: cache for 1 month
    '.png': 60 * 60 * 24 * 30,
    '.jpg': 60 * 60 * 24 * 30,
    '.jpeg': 60 * 60 * 24 * 30,
    '.gif': 60 * 60 * 24 * 30,
    '.svg': 60 * 60 * 24 * 30,
    '.ico': 60 * 60 * 24 * 30,
    // Default cache duration: 1 day
    'default': 60 * 60 * 24
};

// Helper function to get the appropriate Cache-Control header
function getCacheControl(extension) {
    const maxAge = cacheDurations[extension] || cacheDurations.default;
    return `public, max-age=${maxAge}, stale-while-revalidate=${Math.floor(maxAge/2)}`;
}

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
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=86400' // Cache favicon 404 for 1 day
                },
                body: JSON.stringify({ error: 'Favicon not found' })
            };
        }
        
        // Get the file extension
        const ext = path.extname(filePath);
        const contentType = contentTypes[ext] || 'application/octet-stream';
        
        // Get the full file path
        const fullPath = path.join(__dirname, filePath);
        
        // Get file stats for Last-Modified and ETag headers
        const stats = await fs.stat(fullPath);
        const lastModified = stats.mtime.toUTCString();
        
        // Generate an ETag based on file size and last modified time
        const etag = `W/"${stats.size.toString(16)}-${stats.mtime.getTime().toString(16)}"`;
        
        // Check if file is still fresh based on If-None-Match header (ETag)
        const ifNoneMatch = event.headers?.['if-none-match'] || event.headers?.['If-None-Match'];
        if (ifNoneMatch === etag) {
            console.log('Returning 304 based on ETag match');
            return {
                statusCode: 304, // Not Modified
                headers: {
                    'ETag': etag,
                    'Cache-Control': getCacheControl(ext),
                    'Last-Modified': lastModified
                }
            };
        }
        
        // Check if file is still fresh based on If-Modified-Since header
        const ifModifiedSince = event.headers?.['if-modified-since'] || event.headers?.['If-Modified-Since'];
        if (ifModifiedSince && new Date(ifModifiedSince) >= stats.mtime) {
            console.log('Returning 304 based on If-Modified-Since');
            return {
                statusCode: 304, // Not Modified
                headers: {
                    'ETag': etag,
                    'Cache-Control': getCacheControl(ext),
                    'Last-Modified': lastModified
                }
            };
        }
        
        // Read the file content
        const fileContent = await fs.readFile(fullPath, 'utf8');
        
        // Log the file path and content type for debugging
        console.log('Serving file:', {
            path: filePath,
            contentType,
            size: fileContent.length,
            etag: etag
        });
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': getCacheControl(ext),
                'ETag': etag,
                'Last-Modified': lastModified,
                'Vary': 'Accept-Encoding'
            },
            body: fileContent
        };
    } catch (error) {
        console.error('Error serving static file:', error);
        return {
            statusCode: 404,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=60' // Cache errors for 1 minute
            },
            body: JSON.stringify({ error: 'File not found' })
        };
    }
};
