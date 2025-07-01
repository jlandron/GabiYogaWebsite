const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event) => {
    try {
        // Read the HTML file
        const htmlContent = await fs.readFile(path.join(__dirname, '../static/admin-dashboard.html'), 'utf8');
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/html',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            body: htmlContent
        };
    } catch (error) {
        console.error('Error serving admin dashboard:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Error serving admin dashboard' })
        };
    }
};
