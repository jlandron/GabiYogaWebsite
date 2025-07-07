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
        
        // Get the file extension
        const ext = path.extname(filePath);
        
        // Handle CSS files in css/ subdirectory
        if (ext === '.css') {
            if (!filePath.startsWith('css/')) {
                filePath = `css/${filePath}`;
            }
        }
        
        // Handle HTML files in html/ subdirectory
        if (ext === '.html') {
            if (!filePath.startsWith('html/')) {
                filePath = `html/${filePath}`;
            }
        }
        
        // Handle JS files in js/ subdirectory (except for serve-static.js itself)
        if (ext === '.js' && filePath !== 'serve-static.js') {
            if (!filePath.startsWith('js/')) {
                filePath = `js/${filePath}`;
            }
        }
        
        console.log('Adjusted path for subdirectories:', filePath);
        
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
        
        // Get the content type based on extension
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
