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
        
        // Remove leading slash and 'static/' if present
        const cleanPath = filePath.replace(/^\//, '').replace(/^static\//, '');
        
        // Special handling for login.html
        if (filePath === '/login.html') {
            filePath = 'login.html';
        }

        // Special handling for favicon.ico
        if (filePath === '/favicon.ico') {
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
        const ext = path.extname(cleanPath);
        const contentType = contentTypes[ext] || 'application/octet-stream';

        // Read the file from the current directory
        const fileContent = await fs.readFile(path.join(__dirname, cleanPath), 'utf8');
        
        // Log the file path and content type for debugging
        console.log('Serving file:', {
            path: cleanPath,
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
