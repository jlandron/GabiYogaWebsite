const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const { 
    getUserFromToken, 
    isAdmin, 
    createSuccessResponse, 
    createErrorResponse 
} = require('../shared/utils');

const getUsers = async () => {
    const params = {
        TableName: process.env.USERS_TABLE,
        Select: 'COUNT'
    };
    const result = await dynamodb.scan(params).promise();
    return result.Count;
};

const getRecentUsers = async (limit = 5) => {
    const params = {
        TableName: process.env.USERS_TABLE,
        Limit: limit,
        ScanIndexForward: false,
        IndexName: 'CreatedAtIndex',
        KeyConditionExpression: '#type = :type',
        ExpressionAttributeNames: {
            '#type': 'type'
        },
        ExpressionAttributeValues: {
            ':type': 'USER'
        }
    };
    const result = await dynamodb.query(params).promise();
    return result.Items;
};

const getBlogStats = async () => {
    const params = {
        TableName: process.env.BLOG_TABLE,
        Select: 'COUNT'
    };
    const result = await dynamodb.scan(params).promise();
    return {
        total: result.Count,
        published: (await dynamodb.scan({
            ...params,
            FilterExpression: '#status = :status',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: { ':status': 'published' }
        }).promise()).Count
    };
};

const getRecentBookings = async (limit = 5) => {
    const params = {
        TableName: process.env.BOOKINGS_TABLE,
        Limit: limit,
        ScanIndexForward: false,
        IndexName: 'CreatedAtIndex'
    };
    const result = await dynamodb.scan(params).promise();
    return result.Items;
};

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    try {
        // Handle CORS preflight
        if (event.httpMethod === 'OPTIONS') {
            return createSuccessResponse({}, 200);
        }

        // Verify admin role
        const user = await getUserFromToken(event);
        if (!user || !isAdmin(user)) {
            return createErrorResponse('Unauthorized - Admin access required', 403);
        }

        // Fetch all dashboard data in parallel
        const [totalUsers, recentUsers, blogStats, recentBookings] = await Promise.all([
            getUsers(),
            getRecentUsers(),
            getBlogStats(),
            getRecentBookings()
        ]);

        const dashboardData = {
            users: {
                total: totalUsers,
                recent: recentUsers.map(user => ({
                    id: user.id,
                    email: user.email,
                    createdAt: user.createdAt,
                    name: user.name
                }))
            },
            blog: blogStats,
            bookings: {
                recent: recentBookings.map(booking => ({
                    id: booking.id,
                    userId: booking.userId,
                    classId: booking.classId,
                    createdAt: booking.createdAt,
                    status: booking.status
                }))
            },
            system: {
                status: 'healthy',
                lastUpdated: new Date().toISOString()
            }
        };

        return createSuccessResponse(dashboardData);
    } catch (error) {
        console.error('Dashboard Error:', error);
        return createErrorResponse('Error fetching dashboard data', 500);
    }
};
