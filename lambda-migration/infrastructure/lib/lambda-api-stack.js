"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LambdaApiStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
class LambdaApiStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        this.lambdaFunctions = [];
        const { stage } = props;
        const resourcePrefix = `GabiYoga-${stage}`;
        // S3 Bucket for assets
        this.assetsBucket = new s3.Bucket(this, 'AssetsBucket', {
            bucketName: `gabi-yoga-${stage}-assets-${this.region}`,
            publicReadAccess: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            cors: [
                {
                    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT],
                    allowedOrigins: stage === 'prod' ? ['https://gabi.yoga', 'https://www.gabi.yoga'] : ['*'],
                    allowedHeaders: ['*'],
                },
            ],
            lifecycleRules: [
                {
                    id: 'DeleteIncompleteMultipartUploads',
                    abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
                },
            ],
            removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
        });
        // Common Lambda environment variables
        const commonEnvironment = {
            STAGE: stage,
            REGION: this.region,
            USERS_TABLE: props.usersTable.tableName,
            BLOG_POSTS_TABLE: props.blogPostsTable.tableName,
            CLASSES_TABLE: props.classesTable.tableName,
            BOOKINGS_TABLE: props.bookingsTable.tableName,
            RETREATS_TABLE: props.retreatsTable.tableName,
            WORKSHOPS_TABLE: props.workshopsTable.tableName,
            GALLERY_TABLE: props.galleryTable.tableName,
            SETTINGS_TABLE: props.settingsTable.tableName,
            COMMUNICATIONS_TABLE: props.communicationsTable.tableName,
            JWT_BLACKLIST_TABLE: props.jwtBlacklistTable.tableName,
            JWT_SECRET_NAME: props.jwtSecret.secretName,
            STRIPE_SECRET_NAME: props.stripeSecret.secretName,
            ASSETS_BUCKET: this.assetsBucket.bucketName,
            CORS_ORIGIN: stage === 'prod' ? 'https://gabi.yoga,https://www.gabi.yoga' : '*',
        };
        // Common Lambda properties
        const commonLambdaProps = {
            runtime: lambda.Runtime.NODEJS_16_X,
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            environment: commonEnvironment,
            tracing: lambda.Tracing.ACTIVE,
            architecture: lambda.Architecture.ARM_64, // Better price/performance
        };
        // Authentication Lambda Functions
        const authLogin = this.createLambdaFunction('AuthLogin', 'auth/login.js', commonLambdaProps);
        const authRegister = this.createLambdaFunction('AuthRegister', 'auth/register.js', commonLambdaProps);
        const authRefresh = this.createLambdaFunction('AuthRefresh', 'auth/refresh.js', commonLambdaProps);
        const authLogout = this.createLambdaFunction('AuthLogout', 'auth/logout.js', commonLambdaProps);
        const authForgot = this.createLambdaFunction('AuthForgot', 'auth/forgot.js', commonLambdaProps);
        const authVerify = this.createLambdaFunction('AuthVerify', 'auth/verify.js', commonLambdaProps);
        // Blog Lambda Functions
        const blogList = this.createLambdaFunction('BlogList', 'blog/list.js', commonLambdaProps);
        const blogGet = this.createLambdaFunction('BlogGet', 'blog/get.js', commonLambdaProps);
        const blogCreate = this.createLambdaFunction('BlogCreate', 'blog/create.js', commonLambdaProps);
        const blogUpdate = this.createLambdaFunction('BlogUpdate', 'blog/update.js', commonLambdaProps);
        const blogDelete = this.createLambdaFunction('BlogDelete', 'blog/delete.js', commonLambdaProps);
        const blogPublish = this.createLambdaFunction('BlogPublish', 'blog/publish.js', commonLambdaProps);
        // Admin Lambda Functions
        const adminDashboard = this.createLambdaFunction('AdminDashboard', 'admin/dashboard.js', {
            ...commonLambdaProps,
            memorySize: 512, // More memory for dashboard aggregations
        });
        const adminUsers = this.createLambdaFunction('AdminUsers', 'admin/users.js', commonLambdaProps);
        const adminSettings = this.createLambdaFunction('AdminSettings', 'admin/settings.js', commonLambdaProps);
        // Public Settings Lambda Function (for GET requests)
        const settingsGet = this.createLambdaFunction('SettingsGet', 'settings/get.js', commonLambdaProps);
        // Gallery Lambda Functions
        const galleryList = this.createLambdaFunction('GalleryList', 'gallery/list.js', commonLambdaProps);
        const galleryUpload = this.createLambdaFunction('GalleryUpload', 'gallery/upload.js', commonLambdaProps);
        const gallerySave = this.createLambdaFunction('GallerySave', 'gallery/save.js', commonLambdaProps);
        const galleryDelete = this.createLambdaFunction('GalleryDelete', 'gallery/delete.js', commonLambdaProps);
        // Booking Lambda Functions
        const bookingClasses = this.createLambdaFunction('BookingClasses', 'booking/classes.js', commonLambdaProps);
        const bookingBook = this.createLambdaFunction('BookingBook', 'booking/book.js', commonLambdaProps);
        const bookingList = this.createLambdaFunction('BookingList', 'booking/list-bookings.js', commonLambdaProps);
        // Payment Lambda Functions
        const paymentIntent = this.createLambdaFunction('PaymentIntent', 'payment/intent.js', commonLambdaProps);
        const paymentWebhook = this.createLambdaFunction('PaymentWebhook', 'payment/webhook.js', commonLambdaProps);
        // Static Website Lambda Function
        const staticWebsite = this.createLambdaFunction('StaticWebsite', 'static/website.js', {
            ...commonLambdaProps,
            memorySize: 512,
            timeout: cdk.Duration.seconds(10), // Shorter timeout for static content
        });
        // Grant permissions to all Lambda functions
        this.lambdaFunctions.forEach(func => {
            // Grant DynamoDB permissions
            props.usersTable.grantReadWriteData(func);
            props.blogPostsTable.grantReadWriteData(func);
            props.classesTable.grantReadWriteData(func);
            props.bookingsTable.grantReadWriteData(func);
            props.retreatsTable.grantReadWriteData(func);
            props.workshopsTable.grantReadWriteData(func);
            props.galleryTable.grantReadWriteData(func);
            props.settingsTable.grantReadWriteData(func);
            props.communicationsTable.grantReadWriteData(func);
            props.jwtBlacklistTable.grantReadWriteData(func);
            // Grant Secrets Manager permissions
            props.jwtSecret.grantRead(func);
            props.stripeSecret.grantRead(func);
            // Grant S3 permissions
            this.assetsBucket.grantReadWrite(func);
        });
        // API Gateway
        this.apiGateway = new apigateway.RestApi(this, 'ApiGateway', {
            restApiName: resourcePrefix,
            description: `Gabi Yoga Lambda API Gateway (${stage})`,
            defaultCorsPreflightOptions: {
                allowOrigins: stage === 'prod' ? ['https://gabi.yoga', 'https://www.gabi.yoga'] : apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token'],
                allowCredentials: false,
            },
            deployOptions: {
                stageName: stage,
                tracingEnabled: true,
            },
        });
        // API Gateway Resources and Methods
        const authResource = this.apiGateway.root.addResource('auth');
        authResource.addMethod('POST', new apigateway.LambdaIntegration(authLogin), {
            requestParameters: { 'method.request.header.Content-Type': true }
        });
        authResource.addResource('register').addMethod('POST', new apigateway.LambdaIntegration(authRegister));
        authResource.addResource('refresh').addMethod('POST', new apigateway.LambdaIntegration(authRefresh));
        authResource.addResource('logout').addMethod('POST', new apigateway.LambdaIntegration(authLogout));
        authResource.addResource('forgot').addMethod('POST', new apigateway.LambdaIntegration(authForgot));
        authResource.addResource('verify').addMethod('GET', new apigateway.LambdaIntegration(authVerify));
        const blogResource = this.apiGateway.root.addResource('blog');
        blogResource.addMethod('GET', new apigateway.LambdaIntegration(blogList));
        blogResource.addMethod('POST', new apigateway.LambdaIntegration(blogCreate));
        const blogItemResource = blogResource.addResource('{id}');
        blogItemResource.addMethod('GET', new apigateway.LambdaIntegration(blogGet));
        blogItemResource.addMethod('PUT', new apigateway.LambdaIntegration(blogUpdate));
        blogItemResource.addMethod('DELETE', new apigateway.LambdaIntegration(blogDelete));
        blogItemResource.addResource('publish').addMethod('POST', new apigateway.LambdaIntegration(blogPublish));
        const adminResource = this.apiGateway.root.addResource('admin');
        adminResource.addResource('dashboard').addMethod('GET', new apigateway.LambdaIntegration(adminDashboard));
        adminResource.addResource('users').addMethod('GET', new apigateway.LambdaIntegration(adminUsers));
        adminResource.addResource('settings').addMethod('PUT', new apigateway.LambdaIntegration(adminSettings));
        const galleryResource = this.apiGateway.root.addResource('gallery');
        galleryResource.addMethod('GET', new apigateway.LambdaIntegration(galleryList));
        galleryResource.addMethod('POST', new apigateway.LambdaIntegration(gallerySave));
        galleryResource.addResource('upload').addMethod('POST', new apigateway.LambdaIntegration(galleryUpload));
        galleryResource.addResource('{id}').addMethod('DELETE', new apigateway.LambdaIntegration(galleryDelete));
        const classesResource = this.apiGateway.root.addResource('classes');
        classesResource.addMethod('GET', new apigateway.LambdaIntegration(bookingClasses));
        classesResource.addResource('{id}').addResource('book').addMethod('POST', new apigateway.LambdaIntegration(bookingBook));
        const bookingsResource = this.apiGateway.root.addResource('bookings');
        bookingsResource.addMethod('GET', new apigateway.LambdaIntegration(bookingList));
        const paymentResource = this.apiGateway.root.addResource('payment');
        paymentResource.addResource('intent').addMethod('POST', new apigateway.LambdaIntegration(paymentIntent));
        paymentResource.addResource('webhook').addMethod('POST', new apigateway.LambdaIntegration(paymentWebhook));
        // Public Settings Resource (for GET requests)
        const settingsResource = this.apiGateway.root.addResource('settings');
        settingsResource.addMethod('GET', new apigateway.LambdaIntegration(settingsGet));
        // Support for getting specific settings by key
        const settingsItemResource = settingsResource.addResource('{key}');
        settingsItemResource.addMethod('GET', new apigateway.LambdaIntegration(settingsGet));
        // Static Website Routes - serve homepage and assets
        // Root path for homepage
        this.apiGateway.root.addMethod('GET', new apigateway.LambdaIntegration(staticWebsite));
        // Static asset routes with proxy integration
        const assetsProxy = this.apiGateway.root.addResource('{proxy+}');
        assetsProxy.addMethod('GET', new apigateway.LambdaIntegration(staticWebsite, {
            proxy: true,
            requestTemplates: {
                'application/json': JSON.stringify({
                    path: '$context.path',
                    httpMethod: '$context.httpMethod',
                    headers: '$input.params().header',
                    queryStringParameters: '$input.params().querystring',
                    pathParameters: '$input.params().path',
                    body: '$input.body'
                })
            }
        }), {
            requestParameters: {
                'method.request.path.proxy': true
            }
        });
        // Tags
        cdk.Tags.of(this.apiGateway).add('Service', 'GabiYogaLambda');
        cdk.Tags.of(this.apiGateway).add('Environment', stage);
        cdk.Tags.of(this.assetsBucket).add('Service', 'GabiYogaLambda');
        cdk.Tags.of(this.assetsBucket).add('Environment', stage);
        // Outputs
        new cdk.CfnOutput(this, 'AssetsBucketName', {
            value: this.assetsBucket.bucketName,
            description: 'Assets bucket name',
            exportName: `${resourcePrefix}-AssetsBucketName`,
        });
    }
    createLambdaFunction(id, handlerPath, commonProps) {
        const func = new lambda.Function(this, id, {
            ...commonProps,
            functionName: `${commonProps.environment.STAGE === 'prod' ? 'GabiYoga-prod' : 'GabiYoga-dev'}-${id}`,
            code: lambda.Code.fromAsset('../lambda', {
                exclude: ['node_modules', '.git', '*.md', 'tests', '__tests__'],
            }),
            handler: handlerPath.replace('.js', '.handler'),
        });
        this.lambdaFunctions.push(func);
        // Add tags
        cdk.Tags.of(func).add('Service', 'GabiYogaLambda');
        cdk.Tags.of(func).add('Environment', commonProps.environment.STAGE);
        cdk.Tags.of(func).add('Function', id);
        return func;
    }
}
exports.LambdaApiStack = LambdaApiStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFtYmRhLWFwaS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImxhbWJkYS1hcGktc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsK0RBQWlEO0FBQ2pELHVFQUF5RDtBQUd6RCx1REFBeUM7QUFtQnpDLE1BQWEsY0FBZSxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBSzNDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBMEI7UUFDbEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFKVixvQkFBZSxHQUFzQixFQUFFLENBQUM7UUFNdEQsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLEtBQUssQ0FBQztRQUN4QixNQUFNLGNBQWMsR0FBRyxZQUFZLEtBQUssRUFBRSxDQUFDO1FBRTNDLHVCQUF1QjtRQUN2QixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ3RELFVBQVUsRUFBRSxhQUFhLEtBQUssV0FBVyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ3RELGdCQUFnQixFQUFFLEtBQUs7WUFDdkIsaUJBQWlCLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFNBQVM7WUFDakQsSUFBSSxFQUFFO2dCQUNKO29CQUNFLGNBQWMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDO29CQUM3RSxjQUFjLEVBQUUsS0FBSyxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztvQkFDekYsY0FBYyxFQUFFLENBQUMsR0FBRyxDQUFD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T0FBTyxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUM7U0FDaEQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFaEMsV0FBVztRQUNYLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUNuRCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEUsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUV0QyxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7Q0FDRjtBQXBRRCx3Q0FvUUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSc7XG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xuaW1wb3J0ICogYXMgc2VjcmV0c21hbmFnZXIgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyJztcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGludGVyZmFjZSBMYW1iZGFBcGlTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICBzdGFnZTogc3RyaW5nO1xuICB1c2Vyc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgYmxvZ1Bvc3RzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICBjbGFzc2VzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICBib29raW5nc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgcmV0cmVhdHNUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIHdvcmtzaG9wc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgZ2FsbGVyeVRhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgc2V0dGluZ3NUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIGNvbW11bmljYXRpb25zVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICBqd3RCbGFja2xpc3RUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIGp3dFNlY3JldDogc2VjcmV0c21hbmFnZXIuU2VjcmV0O1xuICBzdHJpcGVTZWNyZXQ6IHNlY3JldHNtYW5hZ2VyLlNlY3JldDtcbn1cblxuZXhwb3J0IGNsYXNzIExhbWJkYUFwaVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IGFwaUdhdGV3YXk6IGFwaWdhdGV3YXkuUmVzdEFwaTtcbiAgcHVibGljIHJlYWRvbmx5IGxhbWJkYUZ1bmN0aW9uczogbGFtYmRhLkZ1bmN0aW9uW10gPSBbXTtcbiAgcHVibGljIHJlYWRvbmx5IGFzc2V0c0J1Y2tldDogczMuQnVja2V0O1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBMYW1iZGFBcGlTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCB7IHN0YWdlIH0gPSBwcm9wcztcbiAgICBjb25zdCByZXNvdXJjZVByZWZpeCA9IGBHYWJpWW9nYS0ke3N0YWdlfWA7XG5cbiAgICAvLyBTMyBCdWNrZXQgZm9yIGFzc2V0c1xuICAgIHRoaXMuYXNzZXRzQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnQXNzZXRzQnVja2V0Jywge1xuICAgICAgYnVja2V0TmFtZTogYGdhYmkteW9nYS0ke3N0YWdlfS1hc3NldHMtJHt0aGlzLnJlZ2lvbn1gLFxuICAgICAgcHVibGljUmVhZEFjY2VzczogZmFsc2UsXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgY29yczogW1xuICAgICAgICB7XG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IFtzMy5IdHRwTWV0aG9kcy5HRVQsIHMzLkh0dHBNZXRob2RzLlBPU1QsIHMzLkh0dHBNZXRob2RzLlBVVF0sXG4gICAgICAgICAgYWxsb3dlZE9yaWdpbnM6IHN0YWdlID09PSAncHJvZCcgPyBbJ2h0dHBzOi8vZ2FiaS55b2dhJywgJ2h0dHBzOi8vd3d3LmdhYmkueW9nYSddIDogWycqJ10sXG4gICAgICAgICAgYWxsb3dlZEhlYWRlcnM6IFsnKiddLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIGxpZmVjeWNsZVJ1bGVzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ0RlbGV0ZUluY29tcGxldGVNdWx0aXBhcnRVcGxvYWRzJyxcbiAgICAgICAgICBhYm9ydEluY29tcGxldGVNdWx0aXBhcnRVcGxvYWRBZnRlcjogY2RrLkR1cmF0aW9uLmRheXMoMSksXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgcmVtb3ZhbFBvbGljeTogc3RhZ2UgPT09ICdwcm9kJyA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICAvLyBDb21tb24gTGFtYmRhIGVudmlyb25tZW50IHZhcmlhYmxlc1xuICAgIGNvbnN0IGNvbW1vbkVudmlyb25tZW50ID0ge1xuICAgICAgU1RBR0U6IHN0YWdlLFxuICAgICAgUkVHSU9OOiB0aGlzLnJlZ2lvbixcbiAgICAgIFVTRVJTX1RBQkxFOiBwcm9wcy51c2Vyc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIEJMT0dfUE9TVFNfVEFCTEU6IHByb3BzLmJsb2dQb3N0c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIENMQVNTRVNfVEFCTEU6IHByb3BzLmNsYXNzZXNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBCT09LSU5HU19UQUJMRTogcHJvcHMuYm9va2luZ3NUYWJsZS50YWJsZU5hbWUsXG4gICAgICBSRVRSRUFUU19UQUJMRTogcHJvcHMucmV0cmVhdHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBXT1JLU0hPUFNfVEFCTEU6IHByb3BzLndvcmtzaG9wc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIEdBTExFUllfVEFCTEU6IHByb3BzLmdhbGxlcnlUYWJsZS50YWJsZU5hbWUsXG4gICAgICBTRVRUSU5HU19UQUJMRTogcHJvcHMuc2V0dGluZ3NUYWJsZS50YWJsZU5hbWUsXG4gICAgICBDT01NVU5JQ0FUSU9OU19UQUJMRTogcHJvcHMuY29tbXVuaWNhdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBKV1RfQkxBQ0tMSVNUX1RBQkxFOiBwcm9wcy5qd3RCbGFja2xpc3RUYWJsZS50YWJsZU5hbWUsXG4gICAgICBKV1RfU0VDUkVUX05BTUU6IHByb3BzLmp3dFNlY3JldC5zZWNyZXROYW1lLFxuICAgICAgU1RSSVBFX1NFQ1JFVF9OQU1FOiBwcm9wcy5zdHJpcGVTZWNyZXQuc2VjcmV0TmFtZSxcbiAgICAgIEFTU0VUU19CVUNLRVQ6IHRoaXMuYXNzZXRzQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICBDT1JTX09SSUdJTjogc3RhZ2UgPT09ICdwcm9kJyA/ICdodHRwczovL2dhYmkueW9nYSxodHRwczovL3d3dy5nYWJpLnlvZ2EnIDogJyonLFxuICAgIH07XG5cbiAgICAvLyBDb21tb24gTGFtYmRhIHByb3BlcnRpZXNcbiAgICBjb25zdCBjb21tb25MYW1iZGFQcm9wcyA9IHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xNl9YLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxuICAgICAgZW52aXJvbm1lbnQ6IGNvbW1vbkVudmlyb25tZW50LFxuICAgICAgdHJhY2luZzogbGFtYmRhLlRyYWNpbmcuQUNUSVZFLFxuICAgICAgYXJjaGl0ZWN0dXJlOiBsYW1iZGEuQXJjaGl0ZWN0dXJlLkFSTV82NCwgLy8gQmV0dGVyIHByaWNlL3BlcmZvcm1hbmNlXG4gICAgfTtcblxuICAgIC8vIEF1dGhlbnRpY2F0aW9uIExhbWJkYSBGdW5jdGlvbnNcbiAgICBjb25zdCBhdXRoTG9naW4gPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdBdXRoTG9naW4nLCAnYXV0aC9sb2dpbi5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcbiAgICBjb25zdCBhdXRoUmVnaXN0ZXIgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdBdXRoUmVnaXN0ZXInLCAnYXV0aC9yZWdpc3Rlci5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcbiAgICBjb25zdCBhdXRoUmVmcmVzaCA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0F1dGhSZWZyZXNoJywgJ2F1dGgvcmVmcmVzaC5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcbiAgICBjb25zdCBhdXRoTG9nb3V0ID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignQXV0aExvZ291dCcsICdhdXRoL2xvZ291dC5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcbiAgICBjb25zdCBhdXRoRm9yZ290ID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignQXV0aEZvcmdvdCcsICdhdXRoL2ZvcmdvdC5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcbiAgICBjb25zdCBhdXRoVmVyaWZ5ID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignQXV0aFZlcmlmeScsICdhdXRoL3ZlcmlmeS5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcblxuICAgIC8vIEJsb2cgTGFtYmRhIEZ1bmN0aW9uc1xuICAgIGNvbnN0IGJsb2dMaXN0ID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignQmxvZ0xpc3QnLCAnYmxvZy9saXN0LmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGJsb2dHZXQgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdCbG9nR2V0JywgJ2Jsb2cvZ2V0LmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGJsb2dDcmVhdGUgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdCbG9nQ3JlYXRlJywgJ2Jsb2cvY3JlYXRlLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGJsb2dVcGRhdGUgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdCbG9nVXBkYXRlJywgJ2Jsb2cvdXBkYXRlLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGJsb2dEZWxldGUgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdCbG9nRGVsZXRlJywgJ2Jsb2cvZGVsZXRlLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGJsb2dQdWJsaXNoID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignQmxvZ1B1Ymxpc2gnLCAnYmxvZy9wdWJsaXNoLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuXG4gICAgLy8gQWRtaW4gTGFtYmRhIEZ1bmN0aW9uc1xuICAgIGNvbnN0IGFkbWluRGFzaGJvYXJkID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignQWRtaW5EYXNoYm9hcmQnLCAnYWRtaW4vZGFzaGJvYXJkLmpzJywge1xuICAgICAgLi4uY29tbW9uTGFtYmRhUHJvcHMsXG4gICAgICBtZW1vcnlTaXplOiA1MTIsIC8vIE1vcmUgbWVtb3J5IGZvciBkYXNoYm9hcmQgYWdncmVnYXRpb25zXG4gICAgfSk7XG4gICAgY29uc3QgYWRtaW5Vc2VycyA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0FkbWluVXNlcnMnLCAnYWRtaW4vdXNlcnMuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG4gICAgY29uc3QgYWRtaW5TZXR0aW5ncyA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0FkbWluU2V0dGluZ3MnLCAnYWRtaW4vc2V0dGluZ3MuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG5cbiAgICAvLyBQdWJsaWMgU2V0dGluZ3MgTGFtYmRhIEZ1bmN0aW9uIChmb3IgR0VUIHJlcXVlc3RzKVxuICAgIGNvbnN0IHNldHRpbmdzR2V0ID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignU2V0dGluZ3NHZXQnLCAnc2V0dGluZ3MvZ2V0LmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuXG4gICAgLy8gR2FsbGVyeSBMYW1iZGEgRnVuY3Rpb25zXG4gICAgY29uc3QgZ2FsbGVyeUxpc3QgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdHYWxsZXJ5TGlzdCcsICdnYWxsZXJ5L2xpc3QuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG4gICAgY29uc3QgZ2FsbGVyeVVwbG9hZCA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0dhbGxlcnlVcGxvYWQnLCAnZ2FsbGVyeS91cGxvYWQuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG4gICAgY29uc3QgZ2FsbGVyeVNhdmUgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdHYWxsZXJ5U2F2ZScsICdnYWxsZXJ5L3NhdmUuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG4gICAgY29uc3QgZ2FsbGVyeURlbGV0ZSA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0dhbGxlcnlEZWxldGUnLCAnZ2FsbGVyeS9kZWxldGUuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG5cbiAgICAvLyBCb29raW5nIExhbWJkYSBGdW5jdGlvbnNcbiAgICBjb25zdCBib29raW5nQ2xhc3NlcyA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0Jvb2tpbmdDbGFzc2VzJywgJ2Jvb2tpbmcvY2xhc3Nlcy5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcbiAgICBjb25zdCBib29raW5nQm9vayA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0Jvb2tpbmdCb29rJywgJ2Jvb2tpbmcvYm9vay5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcbiAgICBjb25zdCBib29raW5nTGlzdCA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0Jvb2tpbmdMaXN0JywgJ2Jvb2tpbmcvbGlzdC1ib29raW5ncy5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcblxuICAgIC8vIFBheW1lbnQgTGFtYmRhIEZ1bmN0aW9uc1xuICAgIGNvbnN0IHBheW1lbnRJbnRlbnQgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdQYXltZW50SW50ZW50JywgJ3BheW1lbnQvaW50ZW50LmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IHBheW1lbnRXZWJob29rID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignUGF5bWVudFdlYmhvb2snLCAncGF5bWVudC93ZWJob29rLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuXG4gICAgLy8gU3RhdGljIFdlYnNpdGUgTGFtYmRhIEZ1bmN0aW9uXG4gICAgY29uc3Qgc3RhdGljV2Vic2l0ZSA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ1N0YXRpY1dlYnNpdGUnLCAnc3RhdGljL3dlYnNpdGUuanMnLCB7XG4gICAgICAuLi5jb21tb25MYW1iZGFQcm9wcyxcbiAgICAgIG1lbW9yeVNpemU6IDUxMiwgLy8gTW9yZSBtZW1vcnkgZm9yIGZpbGUgc2VydmluZ1xuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMTApLCAvLyBTaG9ydGVyIHRpbWVvdXQgZm9yIHN0YXRpYyBjb250ZW50XG4gICAgfSk7XG5cbiAgICAvLyBHcmFudCBwZXJtaXNzaW9ucyB0byBhbGwgTGFtYmRhIGZ1bmN0aW9uc1xuICAgIHRoaXMubGFtYmRhRnVuY3Rpb25zLmZvckVhY2goZnVuYyA9PiB7XG4gICAgICAvLyBHcmFudCBEeW5hbW9EQiBwZXJtaXNzaW9uc1xuICAgICAgcHJvcHMudXNlcnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZnVuYyk7XG4gICAgICBwcm9wcy5ibG9nUG9zdHNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZnVuYyk7XG4gICAgICBwcm9wcy5jbGFzc2VzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGZ1bmMpO1xuICAgICAgcHJvcHMuYm9va2luZ3NUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZnVuYyk7XG4gICAgICBwcm9wcy5yZXRyZWF0c1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShmdW5jKTtcbiAgICAgIHByb3BzLndvcmtzaG9wc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShmdW5jKTtcbiAgICAgIHByb3BzLmdhbGxlcnlUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZnVuYyk7XG4gICAgICBwcm9wcy5zZXR0aW5nc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShmdW5jKTtcbiAgICAgIHByb3BzLmNvbW11bmljYXRpb25zVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGZ1bmMpO1xuICAgICAgcHJvcHMuand0QmxhY2tsaXN0VGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGZ1bmMpO1xuXG4gICAgICAvLyBHcmFudCBTZWNyZXRzIE1hbmFnZXIgcGVybWlzc2lvbnNcbiAgICAgIHByb3BzLmp3dFNlY3JldC5ncmFudFJlYWQoZnVuYyk7XG4gICAgICBwcm9wcy5zdHJpcGVTZWNyZXQuZ3JhbnRSZWFkKGZ1bmMpO1xuXG4gICAgICAvLyBHcmFudCBTMyBwZXJtaXNzaW9uc1xuICAgICAgdGhpcy5hc3NldHNCdWNrZXQuZ3JhbnRSZWFkV3JpdGUoZnVuYyk7XG4gICAgfSk7XG5cbiAgICAvLyBBUEkgR2F0ZXdheVxuICAgIHRoaXMuYXBpR2F0ZXdheSA9IG5ldyBhcGlnYXRld2F5LlJlc3RBcGkodGhpcywgJ0FwaUdhdGV3YXknLCB7XG4gICAgICByZXN0QXBpTmFtZTogcmVzb3VyY2VQcmVmaXgsXG4gICAgICBkZXNjcmlwdGlvbjogYEdhYmkgWW9nYSBMYW1iZGEgQVBJIEdhdGV3YXkgKCR7c3RhZ2V9KWAsXG4gICAgICBkZWZhdWx0Q29yc1ByZWZsaWdodE9wdGlvbnM6IHtcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBzdGFnZSA9PT0gJ3Byb2QnID8gWydodHRwczovL2dhYmkueW9nYScsICdodHRwczovL3d3dy5nYWJpLnlvZ2EnXSA6IGFwaWdhdGV3YXkuQ29ycy5BTExfT1JJR0lOUyxcbiAgICAgICAgYWxsb3dNZXRob2RzOiBhcGlnYXRld2F5LkNvcnMuQUxMX01FVEhPRFMsXG4gICAgICAgIGFsbG93SGVhZGVyczogWydDb250ZW50LVR5cGUnLCAnQXV0aG9yaXphdGlvbicsICdYLUFtei1EYXRlJywgJ1gtQXBpLUtleScsICdYLUFtei1TZWN1cml0eS1Ub2tlbiddLFxuICAgICAgICBhbGxvd0NyZWRlbnRpYWxzOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgICBkZXBsb3lPcHRpb25zOiB7XG4gICAgICAgIHN0YWdlTmFtZTogc3RhZ2UsXG4gICAgICAgIHRyYWNpbmdFbmFibGVkOiB0cnVlLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIEFQSSBHYXRld2F5IFJlc291cmNlcyBhbmQgTWV0aG9kc1xuICAgIGNvbnN0IGF1dGhSZXNvdXJjZSA9IHRoaXMuYXBpR2F0ZXdheS5yb290LmFkZFJlc291cmNlKCdhdXRoJyk7XG4gICAgYXV0aFJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGF1dGhMb2dpbiksIHsgXG4gICAgICByZXF1ZXN0UGFyYW1ldGVyczogeyAnbWV0aG9kLnJlcXVlc3QuaGVhZGVyLkNvbnRlbnQtVHlwZSc6IHRydWUgfSBcbiAgICB9KTtcbiAgICBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3JlZ2lzdGVyJykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYXV0aFJlZ2lzdGVyKSk7XG4gICAgYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdyZWZyZXNoJykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYXV0aFJlZnJlc2gpKTtcbiAgICBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2xvZ291dCcpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGF1dGhMb2dvdXQpKTtcbiAgICBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2ZvcmdvdCcpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGF1dGhGb3Jnb3QpKTtcbiAgICBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3ZlcmlmeScpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYXV0aFZlcmlmeSkpO1xuXG4gICAgY29uc3QgYmxvZ1Jlc291cmNlID0gdGhpcy5hcGlHYXRld2F5LnJvb3QuYWRkUmVzb3VyY2UoJ2Jsb2cnKTtcbiAgICBibG9nUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihibG9nTGlzdCkpO1xuICAgIGJsb2dSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihibG9nQ3JlYXRlKSk7XG4gICAgY29uc3QgYmxvZ0l0ZW1SZXNvdXJjZSA9IGJsb2dSZXNvdXJjZS5hZGRSZXNvdXJjZSgne2lkfScpO1xuICAgIGJsb2dJdGVtUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihibG9nR2V0KSk7XG4gICAgYmxvZ0l0ZW1SZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGJsb2dVcGRhdGUpKTtcbiAgICBibG9nSXRlbVJlc291cmNlLmFkZE1ldGhvZCgnREVMRVRFJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYmxvZ0RlbGV0ZSkpO1xuICAgIGJsb2dJdGVtUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3B1Ymxpc2gnKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihibG9nUHVibGlzaCkpO1xuXG4gICAgY29uc3QgYWRtaW5SZXNvdXJjZSA9IHRoaXMuYXBpR2F0ZXdheS5yb290LmFkZFJlc291cmNlKCdhZG1pbicpO1xuICAgIGFkbWluUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2Rhc2hib2FyZCcpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYWRtaW5EYXNoYm9hcmQpKTtcbiAgICBhZG1pblJlc291cmNlLmFkZFJlc291cmNlKCd1c2VycycpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYWRtaW5Vc2VycykpO1xuICAgIGFkbWluUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3NldHRpbmdzJykuYWRkTWV0aG9kKCdQVVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhZG1pblNldHRpbmdzKSk7XG5cbiAgICBjb25zdCBnYWxsZXJ5UmVzb3VyY2UgPSB0aGlzLmFwaUdhdGV3YXkucm9vdC5hZGRSZXNvdXJjZSgnZ2FsbGVyeScpO1xuICAgIGdhbGxlcnlSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGdhbGxlcnlMaXN0KSk7XG4gICAgZ2FsbGVyeVJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGdhbGxlcnlTYXZlKSk7XG4gICAgZ2FsbGVyeVJlc291cmNlLmFkZFJlc291cmNlKCd1cGxvYWQnKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihnYWxsZXJ5VXBsb2FkKSk7XG4gICAgZ2FsbGVyeVJlc291cmNlLmFkZFJlc291cmNlKCd7aWR9JykuYWRkTWV0aG9kKCdERUxFVEUnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihnYWxsZXJ5RGVsZXRlKSk7XG5cbiAgICBjb25zdCBjbGFzc2VzUmVzb3VyY2UgPSB0aGlzLmFwaUdhdGV3YXkucm9vdC5hZGRSZXNvdXJjZSgnY2xhc3NlcycpO1xuICAgIGNsYXNzZXNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGJvb2tpbmdDbGFzc2VzKSk7XG4gICAgY2xhc3Nlc1Jlc291cmNlLmFkZFJlc291cmNlKCd7aWR9JykuYWRkUmVzb3VyY2UoJ2Jvb2snKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihib29raW5nQm9vaykpO1xuXG4gICAgY29uc3QgYm9va2luZ3NSZXNvdXJjZSA9IHRoaXMuYXBpR2F0ZXdheS5yb290LmFkZFJlc291cmNlKCdib29raW5ncycpO1xuICAgIGJvb2tpbmdzUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihib29raW5nTGlzdCkpO1xuXG4gICAgY29uc3QgcGF5bWVudFJlc291cmNlID0gdGhpcy5hcGlHYXRld2F5LnJvb3QuYWRkUmVzb3VyY2UoJ3BheW1lbnQnKTtcbiAgICBwYXltZW50UmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2ludGVudCcpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHBheW1lbnRJbnRlbnQpKTtcbiAgICBwYXltZW50UmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3dlYmhvb2snKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwYXltZW50V2ViaG9vaykpO1xuXG4gICAgLy8gUHVibGljIFNldHRpbmdzIFJlc291cmNlIChmb3IgR0VUIHJlcXVlc3RzKVxuICAgIGNvbnN0IHNldHRpbmdzUmVzb3VyY2UgPSB0aGlzLmFwaUdhdGV3YXkucm9vdC5hZGRSZXNvdXJjZSgnc2V0dGluZ3MnKTtcbiAgICBzZXR0aW5nc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oc2V0dGluZ3NHZXQpKTtcbiAgICAvLyBTdXBwb3J0IGZvciBnZXR0aW5nIHNwZWNpZmljIHNldHRpbmdzIGJ5IGtleVxuICAgIGNvbnN0IHNldHRpbmdzSXRlbVJlc291cmNlID0gc2V0dGluZ3NSZXNvdXJjZS5hZGRSZXNvdXJjZSgne2tleX0nKTtcbiAgICBzZXR0aW5nc0l0ZW1SZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHNldHRpbmdzR2V0KSk7XG5cbiAgICAvLyBTdGF0aWMgV2Vic2l0ZSBSb3V0ZXMgLSBzZXJ2ZSBob21lcGFnZSBhbmQgYXNzZXRzXG4gICAgLy8gUm9vdCBwYXRoIGZvciBob21lcGFnZVxuICAgIHRoaXMuYXBpR2F0ZXdheS5yb290LmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oc3RhdGljV2Vic2l0ZSkpO1xuICAgIFxuICAgIC8vIFN0YXRpYyBhc3NldCByb3V0ZXMgd2l0aCBwcm94eSBpbnRlZ3JhdGlvblxuICAgIGNvbnN0IGFzc2V0c1Byb3h5ID0gdGhpcy5hcGlHYXRld2F5LnJvb3QuYWRkUmVzb3VyY2UoJ3twcm94eSt9Jyk7XG4gICAgYXNzZXRzUHJveHkuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihzdGF0aWNXZWJzaXRlLCB7XG4gICAgICBwcm94eTogdHJ1ZSxcbiAgICAgIHJlcXVlc3RUZW1wbGF0ZXM6IHtcbiAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgcGF0aDogJyRjb250ZXh0LnBhdGgnLFxuICAgICAgICAgIGh0dHBNZXRob2Q6ICckY29udGV4dC5odHRwTWV0aG9kJyxcbiAgICAgICAgICBoZWFkZXJzOiAnJGlucHV0LnBhcmFtcygpLmhlYWRlcicsXG4gICAgICAgICAgcXVlcnlTdHJpbmdQYXJhbWV0ZXJzOiAnJGlucHV0LnBhcmFtcygpLnF1ZXJ5c3RyaW5nJyxcbiAgICAgICAgICBwYXRoUGFyYW1ldGVyczogJyRpbnB1dC5wYXJhbXMoKS5wYXRoJyxcbiAgICAgICAgICBib2R5OiAnJGlucHV0LmJvZHknXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfSksIHtcbiAgICAgIHJlcXVlc3RQYXJhbWV0ZXJzOiB7XG4gICAgICAgICdtZXRob2QucmVxdWVzdC5wYXRoLnByb3h5JzogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuXG5cbiAgICAvLyBUYWdzXG4gICAgY2RrLlRhZ3Mub2YodGhpcy5hcGlHYXRld2F5KS5hZGQoJ1NlcnZpY2UnLCAnR2FiaVlvZ2FMYW1iZGEnKTtcbiAgICBjZGsuVGFncy5vZih0aGlzLmFwaUdhdGV3YXkpLmFkZCgnRW52aXJvbm1lbnQnLCBzdGFnZSk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcy5hc3NldHNCdWNrZXQpLmFkZCgnU2VydmljZScsICdHYWJpWW9nYUxhbWJkYScpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMuYXNzZXRzQnVja2V0KS5hZGQoJ0Vudmlyb25tZW50Jywgc3RhZ2UpO1xuXG4gICAgLy8gT3V0cHV0c1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBc3NldHNCdWNrZXROYW1lJywge1xuICAgICAgdmFsdWU6IHRoaXMuYXNzZXRzQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0Fzc2V0cyBidWNrZXQgbmFtZScsXG4gICAgICBleHBvcnROYW1lOiBgJHtyZXNvdXJjZVByZWZpeH0tQXNzZXRzQnVja2V0TmFtZWAsXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxuICAgIGlkOiBzdHJpbmcsIFxuICAgIGhhbmRsZXJQYXRoOiBzdHJpbmcsIFxuICAgIGNvbW1vblByb3BzOiBhbnlcbiAgKTogbGFtYmRhLkZ1bmN0aW9uIHtcbiAgICBjb25zdCBmdW5jID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCBpZCwge1xuICAgICAgLi4uY29tbW9uUHJvcHMsXG4gICAgICBmdW5jdGlvbk5hbWU6IGAke2NvbW1vblByb3BzLmVudmlyb25tZW50LlNUQUdFID09PSAncHJvZCcgPyAnR2FiaVlvZ2EtcHJvZCcgOiAnR2FiaVlvZ2EtZGV2J30tJHtpZH1gLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9sYW1iZGEnLCB7XG4gICAgICAgIGV4Y2x1ZGU6IFsnbm9kZV9tb2R1bGVzJywgJy5naXQnLCAnKi5tZCcsICd0ZXN0cycsICdfX3Rlc3RzX18nXSxcbiAgICAgIH0pLFxuICAgICAgaGFuZGxlcjogaGFuZGxlclBhdGgucmVwbGFjZSgnLmpzJywgJy5oYW5kbGVyJyksXG4gICAgfSk7XG5cbiAgICB0aGlzLmxhbWJkYUZ1bmN0aW9ucy5wdXNoKGZ1bmMpO1xuICAgIFxuICAgIC8vIEFkZCB0YWdzXG4gICAgY2RrLlRhZ3Mub2YoZnVuYykuYWRkKCdTZXJ2aWNlJywgJ0dhYmlZb2dhTGFtYmRhJyk7XG4gICAgY2RrLlRhZ3Mub2YoZnVuYykuYWRkKCdFbnZpcm9ubWVudCcsIGNvbW1vblByb3BzLmVudmlyb25tZW50LlNUQUdFKTtcbiAgICBjZGsuVGFncy5vZihmdW5jKS5hZGQoJ0Z1bmN0aW9uJywgaWQpO1xuXG4gICAgcmV0dXJuIGZ1bmM7XG4gIH1cbn1cbiJdfQ==