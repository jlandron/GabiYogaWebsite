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
            message: 'booking/list-bookings - Placeholder function',
            service: 'booking',
            function: 'list-bookings',
            todo: 'Implement booking list-bookings logic',
            timestamp: new Date().toISOString()
        })
    };
};