exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        },
        body: JSON.stringify({
            message: 'admin/users - Placeholder function',
            service: 'admin',
            function: 'users',
            todo: 'Implement admin users logic',
            timestamp: new Date().toISOString()
        })
    };
};