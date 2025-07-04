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
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
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
            // Base URL for API and email links - uses custom domain
            BASE_URL: stage === 'prod' ? 'https://gabi.yoga' : `https://dev.gabi.yoga`,
            FROM_EMAIL: 'noreply@gabi.yoga',
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
        const authVerifyToken = this.createLambdaFunction('AuthVerifyToken', 'auth/verify-token.js', commonLambdaProps);
        const authProfile = this.createLambdaFunction('AuthProfile', 'auth/profile.js', commonLambdaProps);
        const authAccount = this.createLambdaFunction('AuthAccount', 'auth/account.js', commonLambdaProps);
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
        const adminMakeAdmin = this.createLambdaFunction('AdminMakeAdmin', 'admin/make-admin.js', commonLambdaProps);
        const adminClasses = this.createLambdaFunction('AdminClasses', 'admin/classes.js', commonLambdaProps);
        // Public Settings Lambda Function (for GET requests)
        const settingsGet = this.createLambdaFunction('SettingsGet', 'settings/get.js', commonLambdaProps);
        // Gallery Lambda Functions
        const galleryList = this.createLambdaFunction('GalleryList', 'gallery/list.js', commonLambdaProps);
        const galleryUpload = this.createLambdaFunction('GalleryUpload', 'gallery/upload.js', commonLambdaProps);
        const gallerySave = this.createLambdaFunction('GallerySave', 'gallery/save.js', commonLambdaProps);
        const galleryUpdate = this.createLambdaFunction('GalleryUpdate', 'gallery/update.js', commonLambdaProps);
        const galleryDelete = this.createLambdaFunction('GalleryDelete', 'gallery/delete.js', commonLambdaProps);
        // Booking Lambda Functions
        const bookingClasses = this.createLambdaFunction('BookingClasses', 'booking/classes.js', commonLambdaProps);
        const bookingBook = this.createLambdaFunction('BookingBook', 'booking/book.js', commonLambdaProps);
        const bookingList = this.createLambdaFunction('BookingList', 'booking/list.js', commonLambdaProps);
        const bookingCancel = this.createLambdaFunction('BookingCancel', 'booking/cancel.js', commonLambdaProps);
        // Payment Lambda Functions
        const paymentIntent = this.createLambdaFunction('PaymentIntent', 'payment/intent.js', commonLambdaProps);
        const paymentWebhook = this.createLambdaFunction('PaymentWebhook', 'payment/webhook.js', commonLambdaProps);
        // Static Website Lambda Functions
        const staticWebsite = this.createLambdaFunction('StaticWebsite', 'static/website.js', {
            ...commonLambdaProps,
            memorySize: 512,
            timeout: cdk.Duration.seconds(10), // Shorter timeout for static content
        });
        const staticFiles = this.createLambdaFunction('StaticFiles', 'static/serve-static.js', {
            ...commonLambdaProps,
            memorySize: 512,
            timeout: cdk.Duration.seconds(10),
        });
        // Dashboard Lambda Functions
        const adminDashboardPage = this.createLambdaFunction('AdminDashboardPage', 'admin/serve-dashboard.js', {
            ...commonLambdaProps,
            memorySize: 512,
            timeout: cdk.Duration.seconds(10),
        });
        const userDashboardPage = this.createLambdaFunction('UserDashboardPage', 'user/serve-dashboard.js', {
            ...commonLambdaProps,
            memorySize: 512,
            timeout: cdk.Duration.seconds(10),
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
        // Grant SES permissions to specific Lambda functions that need to send emails
        this.grantSESPermissions([
            authForgot,
            bookingBook,
            adminClasses // For class cancellation emails
        ]);
        // API Gateway
        this.apiGateway = new apigateway.RestApi(this, 'ApiGateway', {
            restApiName: resourcePrefix,
            description: `Gabi Yoga Lambda API Gateway (${stage})`,
            defaultCorsPreflightOptions: {
                allowOrigins: stage === 'prod' ? ['https://gabi.yoga', 'https://www.gabi.yoga'] : apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token', 'Accept'],
                allowCredentials: true,
            },
            deployOptions: {
                stageName: stage,
                tracingEnabled: true,
                metricsEnabled: true,
                loggingLevel: apigateway.MethodLoggingLevel.INFO,
                dataTraceEnabled: stage !== 'prod', // Enable for non-prod environments
            },
        });
        // API Gateway Resources and Methods
        const authResource = this.apiGateway.root.addResource('auth');
        // Login endpoint
        const loginResource = authResource.addResource('login');
        loginResource.addMethod('POST', new apigateway.LambdaIntegration(authLogin), {
            requestParameters: { 'method.request.header.Content-Type': true },
            authorizationType: apigateway.AuthorizationType.NONE
        });
        // Register endpoint
        const registerResource = authResource.addResource('register');
        registerResource.addMethod('POST', new apigateway.LambdaIntegration(authRegister), {
            authorizationType: apigateway.AuthorizationType.NONE
        });
        // Other auth endpoints
        authResource.addResource('refresh').addMethod('POST', new apigateway.LambdaIntegration(authRefresh));
        authResource.addResource('logout').addMethod('POST', new apigateway.LambdaIntegration(authLogout));
        authResource.addResource('forgot').addMethod('POST', new apigateway.LambdaIntegration(authForgot), {
            authorizationType: apigateway.AuthorizationType.NONE
        });
        authResource.addResource('verify').addMethod('GET', new apigateway.LambdaIntegration(authVerify), {
            authorizationType: apigateway.AuthorizationType.NONE
        });
        authResource.addResource('verify-token').addMethod('GET', new apigateway.LambdaIntegration(authVerifyToken), {
            authorizationType: apigateway.AuthorizationType.NONE
        });
        // User profile management
        const profileResource = authResource.addResource('profile');
        profileResource.addMethod('GET', new apigateway.LambdaIntegration(authProfile));
        profileResource.addMethod('PUT', new apigateway.LambdaIntegration(authProfile));
        // Account management (for deletion)
        const accountResource = authResource.addResource('account');
        accountResource.addMethod('DELETE', new apigateway.LambdaIntegration(authAccount));
        const blogResource = this.apiGateway.root.addResource('blog');
        blogResource.addMethod('GET', new apigateway.LambdaIntegration(blogList), {
            authorizationType: apigateway.AuthorizationType.NONE
        });
        blogResource.addMethod('POST', new apigateway.LambdaIntegration(blogCreate));
        const blogItemResource = blogResource.addResource('{id}');
        blogItemResource.addMethod('GET', new apigateway.LambdaIntegration(blogGet), {
            authorizationType: apigateway.AuthorizationType.NONE
        });
        blogItemResource.addMethod('PUT', new apigateway.LambdaIntegration(blogUpdate));
        blogItemResource.addMethod('DELETE', new apigateway.LambdaIntegration(blogDelete));
        blogItemResource.addResource('publish').addMethod('POST', new apigateway.LambdaIntegration(blogPublish));
        // Admin routes
        const adminResource = this.apiGateway.root.addResource('admin');
        adminResource.addResource('dashboard').addMethod('GET', new apigateway.LambdaIntegration(adminDashboard));
        // Users management
        const adminUsersResource = adminResource.addResource('users');
        adminUsersResource.addMethod('GET', new apigateway.LambdaIntegration(adminUsers));
        const adminUserResource = adminUsersResource.addResource('{userId}');
        adminUserResource.addResource('make-admin').addMethod('PUT', new apigateway.LambdaIntegration(adminMakeAdmin));
        // Settings management
        adminResource.addResource('settings').addMethod('PUT', new apigateway.LambdaIntegration(adminSettings));
        // Classes management
        const adminClassesResource = adminResource.addResource('classes');
        adminClassesResource.addMethod('GET', new apigateway.LambdaIntegration(adminClasses));
        adminClassesResource.addMethod('POST', new apigateway.LambdaIntegration(adminClasses));
        const adminClassResource = adminClassesResource.addResource('{id}');
        adminClassResource.addMethod('GET', new apigateway.LambdaIntegration(adminClasses));
        adminClassResource.addMethod('PUT', new apigateway.LambdaIntegration(adminClasses));
        adminClassResource.addMethod('DELETE', new apigateway.LambdaIntegration(adminClasses));
        const galleryResource = this.apiGateway.root.addResource('gallery');
        galleryResource.addMethod('GET', new apigateway.LambdaIntegration(galleryList));
        galleryResource.addMethod('POST', new apigateway.LambdaIntegration(gallerySave));
        // Gallery upload resource with both POST (auth required) and GET (no auth required)
        const galleryUploadResource = galleryResource.addResource('upload');
        galleryUploadResource.addMethod('POST', new apigateway.LambdaIntegration(galleryUpload));
        galleryUploadResource.addMethod('GET', new apigateway.LambdaIntegration(galleryUpload), {
            authorizationType: apigateway.AuthorizationType.NONE
        });
        // Create gallery item resource with both DELETE and PUT methods
        const galleryItemResource = galleryResource.addResource('{id}');
        galleryItemResource.addMethod('DELETE', new apigateway.LambdaIntegration(galleryDelete));
        galleryItemResource.addMethod('PUT', new apigateway.LambdaIntegration(galleryUpdate));
        const classesResource = this.apiGateway.root.addResource('classes');
        classesResource.addMethod('GET', new apigateway.LambdaIntegration(bookingClasses));
        // Individual class resource - GET method for class details has no auth requirement
        const classIdResource = classesResource.addResource('{id}');
        classIdResource.addMethod('GET', new apigateway.LambdaIntegration(bookingClasses), {
            authorizationType: apigateway.AuthorizationType.NONE
        });
        // Book endpoint still requires authentication
        classIdResource.addResource('book').addMethod('POST', new apigateway.LambdaIntegration(bookingBook));
        const bookingsResource = this.apiGateway.root.addResource('bookings');
        bookingsResource.addMethod('GET', new apigateway.LambdaIntegration(bookingList));
        // Add route for cancelling bookings
        const bookingItemResource = bookingsResource.addResource('{id}');
        bookingItemResource.addMethod('DELETE', new apigateway.LambdaIntegration(bookingCancel));
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
        // Dashboard Routes
        const adminDashboardResource = this.apiGateway.root.addResource('admin.html');
        adminDashboardResource.addMethod('GET', new apigateway.LambdaIntegration(adminDashboardPage), {
            authorizationType: apigateway.AuthorizationType.NONE
        });
        const userDashboardResource = this.apiGateway.root.addResource('user.html');
        userDashboardResource.addMethod('GET', new apigateway.LambdaIntegration(userDashboardPage), {
            authorizationType: apigateway.AuthorizationType.NONE
        });
        // Static files route with proxy integration (no auth required)
        const staticResource = this.apiGateway.root.addResource('static');
        const staticProxy = staticResource.addResource('{proxy+}');
        staticProxy.addMethod('GET', new apigateway.LambdaIntegration(staticFiles, {
            proxy: true,
            requestParameters: {
                'integration.request.path.proxy': 'method.request.path.proxy'
            }
        }), {
            authorizationType: apigateway.AuthorizationType.NONE,
            requestParameters: {
                'method.request.path.proxy': true
            }
        });
        // Blog page routes (no auth required)
        const blogPageResource = this.apiGateway.root.addResource('blog-page');
        blogPageResource.addMethod('GET', new apigateway.LambdaIntegration(staticWebsite), {
            authorizationType: apigateway.AuthorizationType.NONE
        });
        // Individual blog post pages (no auth required)
        const blogPostResource = blogPageResource.addResource('{id}');
        blogPostResource.addMethod('GET', new apigateway.LambdaIntegration(staticWebsite), {
            authorizationType: apigateway.AuthorizationType.NONE
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
    grantSESPermissions(functions) {
        functions.forEach(func => {
            // Create a policy statement for SES permissions
            const sesPolicy = new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'ses:SendEmail',
                    'ses:SendRawEmail',
                    'ses:SendTemplatedEmail',
                    'ses:SendBulkTemplatedEmail',
                    'ses:GetSendQuota',
                    'ses:GetAccountSendingEnabled',
                    'ses:GetIdentityVerificationAttributes',
                    'ses:GetIdentityDkimAttributes',
                    'ses:GetIdentityMailFromDomainAttributes',
                    'ses:ListIdentities'
                ],
                resources: ['*'], // Ideally should be more restrictive in a production environment
            });
            // Add the policy to the function's role
            func.addToRolePolicy(sesPolicy);
        });
    }
    createLambdaFunction(id, handlerPath, commonProps) {
        const func = new lambda.Function(this, id, {
            ...commonProps,
            functionName: `${commonProps.environment.STAGE === 'prod' ? 'GabiYoga-prod' : 'GabiYoga-dev'}-${id}`,
            code: lambda.Code.fromAsset('../lambda', {
                exclude: ['.git', '*.md', 'tests', '__tests__'],
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFtYmRhLWFwaS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImxhbWJkYS1hcGktc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsK0RBQWlEO0FBQ2pELHVFQUF5RDtBQUd6RCx1REFBeUM7QUFDekMseURBQTJDO0FBbUIzQyxNQUFhLGNBQWUsU0FBUSxHQUFHLENBQUMsS0FBSztJQUszQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTBCO1FBQ2xFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBSlYsb0JBQWUsR0FBc0IsRUFBRSxDQUFDO1FBTXRELE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFDeEIsTUFBTSxjQUFjLEdBQUcsWUFBWSxLQUFLLEVBQUUsQ0FBQztRQUUzQyx1QkFBdUI7UUFDdkIsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUN0RCxVQUFVLEVBQUUsYUFBYSxLQUFLLFdBQVcsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUN0RCxnQkFBZ0IsRUFBRSxLQUFLO1lBQ3ZCLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBQ2pELElBQUksRUFBRTtnQkFDSjtvQkFDRSxjQUFjLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQztvQkFDN0UsY0FBYyxFQUFFLEtBQUssS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7b0JBQ3pGLGNBQWMsRUFBRSxD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QUFFLGdCQUFnQixDQUFDLENBQUM7UUFDbkQsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxXQUFXLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFdEMsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0NBQ0Y7QUExWkQsd0NBMFpDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknO1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcbmltcG9ydCAqIGFzIHNlY3JldHNtYW5hZ2VyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zZWNyZXRzbWFuYWdlcic7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTGFtYmRhQXBpU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgc3RhZ2U6IHN0cmluZztcbiAgdXNlcnNUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIGJsb2dQb3N0c1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgY2xhc3Nlc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgYm9va2luZ3NUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIHJldHJlYXRzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICB3b3Jrc2hvcHNUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIGdhbGxlcnlUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIHNldHRpbmdzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICBjb21tdW5pY2F0aW9uc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgand0QmxhY2tsaXN0VGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICBqd3RTZWNyZXQ6IHNlY3JldHNtYW5hZ2VyLlNlY3JldDtcbiAgc3RyaXBlU2VjcmV0OiBzZWNyZXRzbWFuYWdlci5TZWNyZXQ7XG59XG5cbmV4cG9ydCBjbGFzcyBMYW1iZGFBcGlTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBhcGlHYXRld2F5OiBhcGlnYXRld2F5LlJlc3RBcGk7XG4gIHB1YmxpYyByZWFkb25seSBsYW1iZGFGdW5jdGlvbnM6IGxhbWJkYS5GdW5jdGlvbltdID0gW107XG4gIHB1YmxpYyByZWFkb25seSBhc3NldHNCdWNrZXQ6IHMzLkJ1Y2tldDtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogTGFtYmRhQXBpU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgY29uc3QgeyBzdGFnZSB9ID0gcHJvcHM7XG4gICAgY29uc3QgcmVzb3VyY2VQcmVmaXggPSBgR2FiaVlvZ2EtJHtzdGFnZX1gO1xuXG4gICAgLy8gUzMgQnVja2V0IGZvciBhc3NldHNcbiAgICB0aGlzLmFzc2V0c0J1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ0Fzc2V0c0J1Y2tldCcsIHtcbiAgICAgIGJ1Y2tldE5hbWU6IGBnYWJpLXlvZ2EtJHtzdGFnZX0tYXNzZXRzLSR7dGhpcy5yZWdpb259YCxcbiAgICAgIHB1YmxpY1JlYWRBY2Nlc3M6IGZhbHNlLFxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgIGNvcnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBbczMuSHR0cE1ldGhvZHMuR0VULCBzMy5IdHRwTWV0aG9kcy5QT1NULCBzMy5IdHRwTWV0aG9kcy5QVVRdLFxuICAgICAgICAgIGFsbG93ZWRPcmlnaW5zOiBzdGFnZSA9PT0gJ3Byb2QnID8gWydodHRwczovL2dhYmkueW9nYScsICdodHRwczovL3d3dy5nYWJpLnlvZ2EnXSA6IFsnKiddLFxuICAgICAgICAgIGFsbG93ZWRIZWFkZXJzOiBbJyonXSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICBsaWZlY3ljbGVSdWxlczogW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdEZWxldGVJbmNvbXBsZXRlTXVsdGlwYXJ0VXBsb2FkcycsXG4gICAgICAgICAgYWJvcnRJbmNvbXBsZXRlTXVsdGlwYXJ0VXBsb2FkQWZ0ZXI6IGNkay5EdXJhdGlvbi5kYXlzKDEpLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IHN0YWdlID09PSAncHJvZCcgPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgLy8gQ29tbW9uIExhbWJkYSBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAgICBjb25zdCBjb21tb25FbnZpcm9ubWVudCA9IHtcbiAgICAgIFNUQUdFOiBzdGFnZSxcbiAgICAgIFJFR0lPTjogdGhpcy5yZWdpb24sXG4gICAgICBVU0VSU19UQUJMRTogcHJvcHMudXNlcnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBCTE9HX1BPU1RTX1RBQkxFOiBwcm9wcy5ibG9nUG9zdHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBDTEFTU0VTX1RBQkxFOiBwcm9wcy5jbGFzc2VzVGFibGUudGFibGVOYW1lLFxuICAgICAgQk9PS0lOR1NfVEFCTEU6IHByb3BzLmJvb2tpbmdzVGFibGUudGFibGVOYW1lLFxuICAgICAgUkVUUkVBVFNfVEFCTEU6IHByb3BzLnJldHJlYXRzVGFibGUudGFibGVOYW1lLFxuICAgICAgV09SS1NIT1BTX1RBQkxFOiBwcm9wcy53b3Jrc2hvcHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBHQUxMRVJZX1RBQkxFOiBwcm9wcy5nYWxsZXJ5VGFibGUudGFibGVOYW1lLFxuICAgICAgU0VUVElOR1NfVEFCTEU6IHByb3BzLnNldHRpbmdzVGFibGUudGFibGVOYW1lLFxuICAgICAgQ09NTVVOSUNBVElPTlNfVEFCTEU6IHByb3BzLmNvbW11bmljYXRpb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgSldUX0JMQUNLTElTVF9UQUJMRTogcHJvcHMuand0QmxhY2tsaXN0VGFibGUudGFibGVOYW1lLFxuICAgICAgSldUX1NFQ1JFVF9OQU1FOiBwcm9wcy5qd3RTZWNyZXQuc2VjcmV0TmFtZSxcbiAgICAgIFNUUklQRV9TRUNSRVRfTkFNRTogcHJvcHMuc3RyaXBlU2VjcmV0LnNlY3JldE5hbWUsXG4gICAgICBBU1NFVFNfQlVDS0VUOiB0aGlzLmFzc2V0c0J1Y2tldC5idWNrZXROYW1lLFxuICAgICAgQ09SU19PUklHSU46IHN0YWdlID09PSAncHJvZCcgPyAnaHR0cHM6Ly9nYWJpLnlvZ2EsaHR0cHM6Ly93d3cuZ2FiaS55b2dhJyA6ICcqJyxcbiAgICAgIC8vIEJhc2UgVVJMIGZvciBBUEkgYW5kIGVtYWlsIGxpbmtzIC0gdXNlcyBjdXN0b20gZG9tYWluXG4gICAgICBCQVNFX1VSTDogc3RhZ2UgPT09ICdwcm9kJyA/ICdodHRwczovL2dhYmkueW9nYScgOiBgaHR0cHM6Ly9kZXYuZ2FiaS55b2dhYCxcbiAgICAgIEZST01fRU1BSUw6ICdub3JlcGx5QGdhYmkueW9nYScsXG4gICAgfTtcblxuICAgIC8vIENvbW1vbiBMYW1iZGEgcHJvcGVydGllc1xuICAgIGNvbnN0IGNvbW1vbkxhbWJkYVByb3BzID0ge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE2X1gsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXG4gICAgICBlbnZpcm9ubWVudDogY29tbW9uRW52aXJvbm1lbnQsXG4gICAgICB0cmFjaW5nOiBsYW1iZGEuVHJhY2luZy5BQ1RJVkUsXG4gICAgICBhcmNoaXRlY3R1cmU6IGxhbWJkYS5BcmNoaXRlY3R1cmUuQVJNXzY0LCAvLyBCZXR0ZXIgcHJpY2UvcGVyZm9ybWFuY2VcbiAgICB9O1xuXG4gICAgLy8gQXV0aGVudGljYXRpb24gTGFtYmRhIEZ1bmN0aW9uc1xuICAgIGNvbnN0IGF1dGhMb2dpbiA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0F1dGhMb2dpbicsICdhdXRoL2xvZ2luLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGF1dGhSZWdpc3RlciA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0F1dGhSZWdpc3RlcicsICdhdXRoL3JlZ2lzdGVyLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGF1dGhSZWZyZXNoID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignQXV0aFJlZnJlc2gnLCAnYXV0aC9yZWZyZXNoLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGF1dGhMb2dvdXQgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdBdXRoTG9nb3V0JywgJ2F1dGgvbG9nb3V0LmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGF1dGhGb3Jnb3QgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdBdXRoRm9yZ290JywgJ2F1dGgvZm9yZ290LmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGF1dGhWZXJpZnkgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdBdXRoVmVyaWZ5JywgJ2F1dGgvdmVyaWZ5LmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGF1dGhWZXJpZnlUb2tlbiA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0F1dGhWZXJpZnlUb2tlbicsICdhdXRoL3ZlcmlmeS10b2tlbi5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcbiAgICBjb25zdCBhdXRoUHJvZmlsZSA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0F1dGhQcm9maWxlJywgJ2F1dGgvcHJvZmlsZS5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcbiAgICBjb25zdCBhdXRoQWNjb3VudCA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0F1dGhBY2NvdW50JywgJ2F1dGgvYWNjb3VudC5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcblxuICAgIC8vIEJsb2cgTGFtYmRhIEZ1bmN0aW9uc1xuICAgIGNvbnN0IGJsb2dMaXN0ID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignQmxvZ0xpc3QnLCAnYmxvZy9saXN0LmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGJsb2dHZXQgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdCbG9nR2V0JywgJ2Jsb2cvZ2V0LmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGJsb2dDcmVhdGUgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdCbG9nQ3JlYXRlJywgJ2Jsb2cvY3JlYXRlLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGJsb2dVcGRhdGUgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdCbG9nVXBkYXRlJywgJ2Jsb2cvdXBkYXRlLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGJsb2dEZWxldGUgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdCbG9nRGVsZXRlJywgJ2Jsb2cvZGVsZXRlLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGJsb2dQdWJsaXNoID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignQmxvZ1B1Ymxpc2gnLCAnYmxvZy9wdWJsaXNoLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuXG4gICAgLy8gQWRtaW4gTGFtYmRhIEZ1bmN0aW9uc1xuICAgIGNvbnN0IGFkbWluRGFzaGJvYXJkID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignQWRtaW5EYXNoYm9hcmQnLCAnYWRtaW4vZGFzaGJvYXJkLmpzJywge1xuICAgICAgLi4uY29tbW9uTGFtYmRhUHJvcHMsXG4gICAgICBtZW1vcnlTaXplOiA1MTIsIC8vIE1vcmUgbWVtb3J5IGZvciBkYXNoYm9hcmQgYWdncmVnYXRpb25zXG4gICAgfSk7XG4gICAgY29uc3QgYWRtaW5Vc2VycyA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0FkbWluVXNlcnMnLCAnYWRtaW4vdXNlcnMuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG4gICAgY29uc3QgYWRtaW5TZXR0aW5ncyA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0FkbWluU2V0dGluZ3MnLCAnYWRtaW4vc2V0dGluZ3MuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG4gICAgY29uc3QgYWRtaW5NYWtlQWRtaW4gPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdBZG1pbk1ha2VBZG1pbicsICdhZG1pbi9tYWtlLWFkbWluLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGFkbWluQ2xhc3NlcyA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0FkbWluQ2xhc3NlcycsICdhZG1pbi9jbGFzc2VzLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuXG4gICAgLy8gUHVibGljIFNldHRpbmdzIExhbWJkYSBGdW5jdGlvbiAoZm9yIEdFVCByZXF1ZXN0cylcbiAgICBjb25zdCBzZXR0aW5nc0dldCA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ1NldHRpbmdzR2V0JywgJ3NldHRpbmdzL2dldC5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcblxuICAgIC8vIEdhbGxlcnkgTGFtYmRhIEZ1bmN0aW9uc1xuICAgIGNvbnN0IGdhbGxlcnlMaXN0ID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignR2FsbGVyeUxpc3QnLCAnZ2FsbGVyeS9saXN0LmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGdhbGxlcnlVcGxvYWQgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdHYWxsZXJ5VXBsb2FkJywgJ2dhbGxlcnkvdXBsb2FkLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGdhbGxlcnlTYXZlID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignR2FsbGVyeVNhdmUnLCAnZ2FsbGVyeS9zYXZlLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGdhbGxlcnlVcGRhdGUgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdHYWxsZXJ5VXBkYXRlJywgJ2dhbGxlcnkvdXBkYXRlLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGdhbGxlcnlEZWxldGUgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdHYWxsZXJ5RGVsZXRlJywgJ2dhbGxlcnkvZGVsZXRlLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuXG4gICAgLy8gQm9va2luZyBMYW1iZGEgRnVuY3Rpb25zXG4gICAgY29uc3QgYm9va2luZ0NsYXNzZXMgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdCb29raW5nQ2xhc3NlcycsICdib29raW5nL2NsYXNzZXMuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG4gICAgY29uc3QgYm9va2luZ0Jvb2sgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdCb29raW5nQm9vaycsICdib29raW5nL2Jvb2suanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG4gICAgY29uc3QgYm9va2luZ0xpc3QgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdCb29raW5nTGlzdCcsICdib29raW5nL2xpc3QuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG4gICAgY29uc3QgYm9va2luZ0NhbmNlbCA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0Jvb2tpbmdDYW5jZWwnLCAnYm9va2luZy9jYW5jZWwuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG5cbiAgICAvLyBQYXltZW50IExhbWJkYSBGdW5jdGlvbnNcbiAgICBjb25zdCBwYXltZW50SW50ZW50ID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignUGF5bWVudEludGVudCcsICdwYXltZW50L2ludGVudC5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcbiAgICBjb25zdCBwYXltZW50V2ViaG9vayA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ1BheW1lbnRXZWJob29rJywgJ3BheW1lbnQvd2ViaG9vay5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcblxuICAgIC8vIFN0YXRpYyBXZWJzaXRlIExhbWJkYSBGdW5jdGlvbnNcbiAgICBjb25zdCBzdGF0aWNXZWJzaXRlID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignU3RhdGljV2Vic2l0ZScsICdzdGF0aWMvd2Vic2l0ZS5qcycsIHtcbiAgICAgIC4uLmNvbW1vbkxhbWJkYVByb3BzLFxuICAgICAgbWVtb3J5U2l6ZTogNTEyLCAvLyBNb3JlIG1lbW9yeSBmb3IgZmlsZSBzZXJ2aW5nXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygxMCksIC8vIFNob3J0ZXIgdGltZW91dCBmb3Igc3RhdGljIGNvbnRlbnRcbiAgICB9KTtcblxuICAgIGNvbnN0IHN0YXRpY0ZpbGVzID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignU3RhdGljRmlsZXMnLCAnc3RhdGljL3NlcnZlLXN0YXRpYy5qcycsIHtcbiAgICAgIC4uLmNvbW1vbkxhbWJkYVByb3BzLFxuICAgICAgbWVtb3J5U2l6ZTogNTEyLCAvLyBNb3JlIG1lbW9yeSBmb3IgZmlsZSBzZXJ2aW5nXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygxMCksXG4gICAgfSk7XG5cbiAgICAvLyBEYXNoYm9hcmQgTGFtYmRhIEZ1bmN0aW9uc1xuICAgIGNvbnN0IGFkbWluRGFzaGJvYXJkUGFnZSA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0FkbWluRGFzaGJvYXJkUGFnZScsICdhZG1pbi9zZXJ2ZS1kYXNoYm9hcmQuanMnLCB7XG4gICAgICAuLi5jb21tb25MYW1iZGFQcm9wcyxcbiAgICAgIG1lbW9yeVNpemU6IDUxMiwgLy8gTW9yZSBtZW1vcnkgZm9yIGZpbGUgc2VydmluZ1xuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMTApLFxuICAgIH0pO1xuXG4gICAgY29uc3QgdXNlckRhc2hib2FyZFBhZ2UgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdVc2VyRGFzaGJvYXJkUGFnZScsICd1c2VyL3NlcnZlLWRhc2hib2FyZC5qcycsIHtcbiAgICAgIC4uLmNvbW1vbkxhbWJkYVByb3BzLFxuICAgICAgbWVtb3J5U2l6ZTogNTEyLCAvLyBNb3JlIG1lbW9yeSBmb3IgZmlsZSBzZXJ2aW5nXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygxMCksXG4gICAgfSk7XG5cbiAgICAvLyBHcmFudCBwZXJtaXNzaW9ucyB0byBhbGwgTGFtYmRhIGZ1bmN0aW9uc1xuICAgIHRoaXMubGFtYmRhRnVuY3Rpb25zLmZvckVhY2goZnVuYyA9PiB7XG4gICAgICAvLyBHcmFudCBEeW5hbW9EQiBwZXJtaXNzaW9uc1xuICAgICAgcHJvcHMudXNlcnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZnVuYyk7XG4gICAgICBwcm9wcy5ibG9nUG9zdHNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZnVuYyk7XG4gICAgICBwcm9wcy5jbGFzc2VzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGZ1bmMpO1xuICAgICAgcHJvcHMuYm9va2luZ3NUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZnVuYyk7XG4gICAgICBwcm9wcy5yZXRyZWF0c1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShmdW5jKTtcbiAgICAgIHByb3BzLndvcmtzaG9wc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShmdW5jKTtcbiAgICAgIHByb3BzLmdhbGxlcnlUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZnVuYyk7XG4gICAgICBwcm9wcy5zZXR0aW5nc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShmdW5jKTtcbiAgICAgIHByb3BzLmNvbW11bmljYXRpb25zVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGZ1bmMpO1xuICAgICAgcHJvcHMuand0QmxhY2tsaXN0VGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGZ1bmMpO1xuXG4gICAgICAvLyBHcmFudCBTZWNyZXRzIE1hbmFnZXIgcGVybWlzc2lvbnNcbiAgICAgIHByb3BzLmp3dFNlY3JldC5ncmFudFJlYWQoZnVuYyk7XG4gICAgICBwcm9wcy5zdHJpcGVTZWNyZXQuZ3JhbnRSZWFkKGZ1bmMpO1xuXG4gICAgICAvLyBHcmFudCBTMyBwZXJtaXNzaW9uc1xuICAgICAgdGhpcy5hc3NldHNCdWNrZXQuZ3JhbnRSZWFkV3JpdGUoZnVuYyk7XG4gICAgfSk7XG4gICAgXG4gICAgLy8gR3JhbnQgU0VTIHBlcm1pc3Npb25zIHRvIHNwZWNpZmljIExhbWJkYSBmdW5jdGlvbnMgdGhhdCBuZWVkIHRvIHNlbmQgZW1haWxzXG4gICAgdGhpcy5ncmFudFNFU1Blcm1pc3Npb25zKFtcbiAgICAgIGF1dGhGb3Jnb3QsICAgICAgLy8gRm9yIHBhc3N3b3JkIHJlc2V0IGVtYWlsc1xuICAgICAgYm9va2luZ0Jvb2ssICAgICAvLyBGb3IgYm9va2luZyBjb25maXJtYXRpb24gZW1haWxzXG4gICAgICBhZG1pbkNsYXNzZXMgICAgIC8vIEZvciBjbGFzcyBjYW5jZWxsYXRpb24gZW1haWxzXG4gICAgXSk7XG5cbiAgICAvLyBBUEkgR2F0ZXdheVxuICAgIHRoaXMuYXBpR2F0ZXdheSA9IG5ldyBhcGlnYXRld2F5LlJlc3RBcGkodGhpcywgJ0FwaUdhdGV3YXknLCB7XG4gICAgICByZXN0QXBpTmFtZTogcmVzb3VyY2VQcmVmaXgsXG4gICAgICBkZXNjcmlwdGlvbjogYEdhYmkgWW9nYSBMYW1iZGEgQVBJIEdhdGV3YXkgKCR7c3RhZ2V9KWAsXG4gICAgICBkZWZhdWx0Q29yc1ByZWZsaWdodE9wdGlvbnM6IHtcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBzdGFnZSA9PT0gJ3Byb2QnID8gWydodHRwczovL2dhYmkueW9nYScsICdodHRwczovL3d3dy5nYWJpLnlvZ2EnXSA6IGFwaWdhdGV3YXkuQ29ycy5BTExfT1JJR0lOUyxcbiAgICAgICAgYWxsb3dNZXRob2RzOiBhcGlnYXRld2F5LkNvcnMuQUxMX01FVEhPRFMsXG4gICAgICAgIGFsbG93SGVhZGVyczogWydDb250ZW50LVR5cGUnLCAnQXV0aG9yaXphdGlvbicsICdYLUFtei1EYXRlJywgJ1gtQXBpLUtleScsICdYLUFtei1TZWN1cml0eS1Ub2tlbicsICdBY2NlcHQnXSxcbiAgICAgICAgYWxsb3dDcmVkZW50aWFsczogdHJ1ZSxcbiAgICAgIH0sXG4gIGRlcGxveU9wdGlvbnM6IHtcbiAgICBzdGFnZU5hbWU6IHN0YWdlLCAgLy8gS2VlcCB1c2luZyB0aGUgc3RhZ2UgbmFtZSBmb3IgY29tcGF0aWJpbGl0eVxuICAgIHRyYWNpbmdFbmFibGVkOiB0cnVlLFxuICAgIG1ldHJpY3NFbmFibGVkOiB0cnVlLFxuICAgIGxvZ2dpbmdMZXZlbDogYXBpZ2F0ZXdheS5NZXRob2RMb2dnaW5nTGV2ZWwuSU5GTyxcbiAgICBkYXRhVHJhY2VFbmFibGVkOiBzdGFnZSAhPT0gJ3Byb2QnLCAvLyBFbmFibGUgZm9yIG5vbi1wcm9kIGVudmlyb25tZW50c1xuICB9LFxuICAgIH0pO1xuXG4gICAgLy8gQVBJIEdhdGV3YXkgUmVzb3VyY2VzIGFuZCBNZXRob2RzXG4gICAgY29uc3QgYXV0aFJlc291cmNlID0gdGhpcy5hcGlHYXRld2F5LnJvb3QuYWRkUmVzb3VyY2UoJ2F1dGgnKTtcbiAgICBcbiAgICAvLyBMb2dpbiBlbmRwb2ludFxuICAgIGNvbnN0IGxvZ2luUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2xvZ2luJyk7XG4gICAgbG9naW5SZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhdXRoTG9naW4pLCB7IFxuICAgICAgcmVxdWVzdFBhcmFtZXRlcnM6IHsgJ21ldGhvZC5yZXF1ZXN0LmhlYWRlci5Db250ZW50LVR5cGUnOiB0cnVlIH0sXG4gICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ2F0ZXdheS5BdXRob3JpemF0aW9uVHlwZS5OT05FXG4gICAgfSk7XG5cbiAgICAvLyBSZWdpc3RlciBlbmRwb2ludFxuICAgIGNvbnN0IHJlZ2lzdGVyUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3JlZ2lzdGVyJyk7XG4gICAgcmVnaXN0ZXJSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhdXRoUmVnaXN0ZXIpLCB7XG4gICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ2F0ZXdheS5BdXRob3JpemF0aW9uVHlwZS5OT05FXG4gICAgfSk7XG5cbiAgICAvLyBPdGhlciBhdXRoIGVuZHBvaW50c1xuICAgIGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgncmVmcmVzaCcpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGF1dGhSZWZyZXNoKSk7XG4gICAgYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdsb2dvdXQnKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhdXRoTG9nb3V0KSk7XG4gICAgYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdmb3Jnb3QnKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhdXRoRm9yZ290KSwge1xuICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwaWdhdGV3YXkuQXV0aG9yaXphdGlvblR5cGUuTk9ORVxuICAgIH0pO1xuICAgIGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgndmVyaWZ5JykuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhdXRoVmVyaWZ5KSwge1xuICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwaWdhdGV3YXkuQXV0aG9yaXphdGlvblR5cGUuTk9ORVxuICAgIH0pO1xuICAgIGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgndmVyaWZ5LXRva2VuJykuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhdXRoVmVyaWZ5VG9rZW4pLCB7XG4gICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ2F0ZXdheS5BdXRob3JpemF0aW9uVHlwZS5OT05FXG4gICAgfSk7XG4gICAgXG4gICAgLy8gVXNlciBwcm9maWxlIG1hbmFnZW1lbnRcbiAgICBjb25zdCBwcm9maWxlUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3Byb2ZpbGUnKTtcbiAgICBwcm9maWxlUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhdXRoUHJvZmlsZSkpO1xuICAgIHByb2ZpbGVSZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGF1dGhQcm9maWxlKSk7XG4gICAgXG4gICAgLy8gQWNjb3VudCBtYW5hZ2VtZW50IChmb3IgZGVsZXRpb24pXG4gICAgY29uc3QgYWNjb3VudFJlc291cmNlID0gYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdhY2NvdW50Jyk7XG4gICAgYWNjb3VudFJlc291cmNlLmFkZE1ldGhvZCgnREVMRVRFJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYXV0aEFjY291bnQpKTtcblxuICAgIGNvbnN0IGJsb2dSZXNvdXJjZSA9IHRoaXMuYXBpR2F0ZXdheS5yb290LmFkZFJlc291cmNlKCdibG9nJyk7XG4gICAgYmxvZ1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYmxvZ0xpc3QpLCB7XG4gICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ2F0ZXdheS5BdXRob3JpemF0aW9uVHlwZS5OT05FXG4gICAgfSk7XG4gICAgYmxvZ1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGJsb2dDcmVhdGUpKTtcbiAgICBjb25zdCBibG9nSXRlbVJlc291cmNlID0gYmxvZ1Jlc291cmNlLmFkZFJlc291cmNlKCd7aWR9Jyk7XG4gICAgYmxvZ0l0ZW1SZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGJsb2dHZXQpLCB7XG4gICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ2F0ZXdheS5BdXRob3JpemF0aW9uVHlwZS5OT05FXG4gICAgfSk7XG4gICAgYmxvZ0l0ZW1SZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGJsb2dVcGRhdGUpKTtcbiAgICBibG9nSXRlbVJlc291cmNlLmFkZE1ldGhvZCgnREVMRVRFJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYmxvZ0RlbGV0ZSkpO1xuICAgIGJsb2dJdGVtUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3B1Ymxpc2gnKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihibG9nUHVibGlzaCkpO1xuXG4gICAgLy8gQWRtaW4gcm91dGVzXG4gICAgY29uc3QgYWRtaW5SZXNvdXJjZSA9IHRoaXMuYXBpR2F0ZXdheS5yb290LmFkZFJlc291cmNlKCdhZG1pbicpO1xuICAgIGFkbWluUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2Rhc2hib2FyZCcpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYWRtaW5EYXNoYm9hcmQpKTtcbiAgICBcbiAgICAvLyBVc2VycyBtYW5hZ2VtZW50XG4gICAgY29uc3QgYWRtaW5Vc2Vyc1Jlc291cmNlID0gYWRtaW5SZXNvdXJjZS5hZGRSZXNvdXJjZSgndXNlcnMnKTtcbiAgICBhZG1pblVzZXJzUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhZG1pblVzZXJzKSk7XG4gICAgY29uc3QgYWRtaW5Vc2VyUmVzb3VyY2UgPSBhZG1pblVzZXJzUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3t1c2VySWR9Jyk7XG4gICAgYWRtaW5Vc2VyUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ21ha2UtYWRtaW4nKS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGFkbWluTWFrZUFkbWluKSk7XG4gICAgXG4gICAgLy8gU2V0dGluZ3MgbWFuYWdlbWVudFxuICAgIGFkbWluUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3NldHRpbmdzJykuYWRkTWV0aG9kKCdQVVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhZG1pblNldHRpbmdzKSk7XG4gICAgXG4gICAgLy8gQ2xhc3NlcyBtYW5hZ2VtZW50XG4gICAgY29uc3QgYWRtaW5DbGFzc2VzUmVzb3VyY2UgPSBhZG1pblJlc291cmNlLmFkZFJlc291cmNlKCdjbGFzc2VzJyk7XG4gICAgYWRtaW5DbGFzc2VzUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhZG1pbkNsYXNzZXMpKTtcbiAgICBhZG1pbkNsYXNzZXNSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhZG1pbkNsYXNzZXMpKTtcbiAgICBjb25zdCBhZG1pbkNsYXNzUmVzb3VyY2UgPSBhZG1pbkNsYXNzZXNSZXNvdXJjZS5hZGRSZXNvdXJjZSgne2lkfScpO1xuICAgIGFkbWluQ2xhc3NSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGFkbWluQ2xhc3NlcykpO1xuICAgIGFkbWluQ2xhc3NSZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGFkbWluQ2xhc3NlcykpO1xuICAgIGFkbWluQ2xhc3NSZXNvdXJjZS5hZGRNZXRob2QoJ0RFTEVURScsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGFkbWluQ2xhc3NlcykpO1xuXG4gICAgY29uc3QgZ2FsbGVyeVJlc291cmNlID0gdGhpcy5hcGlHYXRld2F5LnJvb3QuYWRkUmVzb3VyY2UoJ2dhbGxlcnknKTtcbiAgICBnYWxsZXJ5UmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihnYWxsZXJ5TGlzdCkpO1xuICAgIGdhbGxlcnlSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihnYWxsZXJ5U2F2ZSkpO1xuICAgIFxuICAgIC8vIEdhbGxlcnkgdXBsb2FkIHJlc291cmNlIHdpdGggYm90aCBQT1NUIChhdXRoIHJlcXVpcmVkKSBhbmQgR0VUIChubyBhdXRoIHJlcXVpcmVkKVxuICAgIGNvbnN0IGdhbGxlcnlVcGxvYWRSZXNvdXJjZSA9IGdhbGxlcnlSZXNvdXJjZS5hZGRSZXNvdXJjZSgndXBsb2FkJyk7XG4gICAgZ2FsbGVyeVVwbG9hZFJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGdhbGxlcnlVcGxvYWQpKTtcbiAgICBnYWxsZXJ5VXBsb2FkUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihnYWxsZXJ5VXBsb2FkKSwge1xuICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwaWdhdGV3YXkuQXV0aG9yaXphdGlvblR5cGUuTk9ORVxuICAgIH0pO1xuICAgIFxuICAgIC8vIENyZWF0ZSBnYWxsZXJ5IGl0ZW0gcmVzb3VyY2Ugd2l0aCBib3RoIERFTEVURSBhbmQgUFVUIG1ldGhvZHNcbiAgICBjb25zdCBnYWxsZXJ5SXRlbVJlc291cmNlID0gZ2FsbGVyeVJlc291cmNlLmFkZFJlc291cmNlKCd7aWR9Jyk7XG4gICAgZ2FsbGVyeUl0ZW1SZXNvdXJjZS5hZGRNZXRob2QoJ0RFTEVURScsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGdhbGxlcnlEZWxldGUpKTtcbiAgICBnYWxsZXJ5SXRlbVJlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ2FsbGVyeVVwZGF0ZSkpO1xuXG4gICAgY29uc3QgY2xhc3Nlc1Jlc291cmNlID0gdGhpcy5hcGlHYXRld2F5LnJvb3QuYWRkUmVzb3VyY2UoJ2NsYXNzZXMnKTtcbiAgICBjbGFzc2VzUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihib29raW5nQ2xhc3NlcykpO1xuICAgIFxuICAgIC8vIEluZGl2aWR1YWwgY2xhc3MgcmVzb3VyY2UgLSBHRVQgbWV0aG9kIGZvciBjbGFzcyBkZXRhaWxzIGhhcyBubyBhdXRoIHJlcXVpcmVtZW50XG4gICAgY29uc3QgY2xhc3NJZFJlc291cmNlID0gY2xhc3Nlc1Jlc291cmNlLmFkZFJlc291cmNlKCd7aWR9Jyk7XG4gICAgY2xhc3NJZFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYm9va2luZ0NsYXNzZXMpLCB7XG4gICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ2F0ZXdheS5BdXRob3JpemF0aW9uVHlwZS5OT05FXG4gICAgfSk7XG4gICAgLy8gQm9vayBlbmRwb2ludCBzdGlsbCByZXF1aXJlcyBhdXRoZW50aWNhdGlvblxuICAgIGNsYXNzSWRSZXNvdXJjZS5hZGRSZXNvdXJjZSgnYm9vaycpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGJvb2tpbmdCb29rKSk7XG5cbiAgICBjb25zdCBib29raW5nc1Jlc291cmNlID0gdGhpcy5hcGlHYXRld2F5LnJvb3QuYWRkUmVzb3VyY2UoJ2Jvb2tpbmdzJyk7XG4gICAgYm9va2luZ3NSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGJvb2tpbmdMaXN0KSk7XG4gICAgXG4gICAgLy8gQWRkIHJvdXRlIGZvciBjYW5jZWxsaW5nIGJvb2tpbmdzXG4gICAgY29uc3QgYm9va2luZ0l0ZW1SZXNvdXJjZSA9IGJvb2tpbmdzUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3tpZH0nKTtcbiAgICBib29raW5nSXRlbVJlc291cmNlLmFkZE1ldGhvZCgnREVMRVRFJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYm9va2luZ0NhbmNlbCkpO1xuXG4gICAgY29uc3QgcGF5bWVudFJlc291cmNlID0gdGhpcy5hcGlHYXRld2F5LnJvb3QuYWRkUmVzb3VyY2UoJ3BheW1lbnQnKTtcbiAgICBwYXltZW50UmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2ludGVudCcpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHBheW1lbnRJbnRlbnQpKTtcbiAgICBwYXltZW50UmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3dlYmhvb2snKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwYXltZW50V2ViaG9vaykpO1xuXG4gICAgLy8gUHVibGljIFNldHRpbmdzIFJlc291cmNlIChmb3IgR0VUIHJlcXVlc3RzKVxuICAgIGNvbnN0IHNldHRpbmdzUmVzb3VyY2UgPSB0aGlzLmFwaUdhdGV3YXkucm9vdC5hZGRSZXNvdXJjZSgnc2V0dGluZ3MnKTtcbiAgICBzZXR0aW5nc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oc2V0dGluZ3NHZXQpKTtcbiAgICAvLyBTdXBwb3J0IGZvciBnZXR0aW5nIHNwZWNpZmljIHNldHRpbmdzIGJ5IGtleVxuICAgIGNvbnN0IHNldHRpbmdzSXRlbVJlc291cmNlID0gc2V0dGluZ3NSZXNvdXJjZS5hZGRSZXNvdXJjZSgne2tleX0nKTtcbiAgICBzZXR0aW5nc0l0ZW1SZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHNldHRpbmdzR2V0KSk7XG5cbiAgICAvLyBTdGF0aWMgV2Vic2l0ZSBSb3V0ZXMgLSBzZXJ2ZSBob21lcGFnZSBhbmQgYXNzZXRzXG4gICAgLy8gUm9vdCBwYXRoIGZvciBob21lcGFnZVxuICAgIHRoaXMuYXBpR2F0ZXdheS5yb290LmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oc3RhdGljV2Vic2l0ZSkpO1xuXG4gICAgLy8gRGFzaGJvYXJkIFJvdXRlc1xuICAgIGNvbnN0IGFkbWluRGFzaGJvYXJkUmVzb3VyY2UgPSB0aGlzLmFwaUdhdGV3YXkucm9vdC5hZGRSZXNvdXJjZSgnYWRtaW4uaHRtbCcpO1xuICAgIGFkbWluRGFzaGJvYXJkUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhZG1pbkRhc2hib2FyZFBhZ2UpLCB7XG4gICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ2F0ZXdheS5BdXRob3JpemF0aW9uVHlwZS5OT05FXG4gICAgfSk7XG5cbiAgICBjb25zdCB1c2VyRGFzaGJvYXJkUmVzb3VyY2UgPSB0aGlzLmFwaUdhdGV3YXkucm9vdC5hZGRSZXNvdXJjZSgndXNlci5odG1sJyk7XG4gICAgdXNlckRhc2hib2FyZFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odXNlckRhc2hib2FyZFBhZ2UpLCB7XG4gICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ2F0ZXdheS5BdXRob3JpemF0aW9uVHlwZS5OT05FXG4gICAgfSk7XG4gICAgXG4gICAgLy8gU3RhdGljIGZpbGVzIHJvdXRlIHdpdGggcHJveHkgaW50ZWdyYXRpb24gKG5vIGF1dGggcmVxdWlyZWQpXG4gICAgY29uc3Qgc3RhdGljUmVzb3VyY2UgPSB0aGlzLmFwaUdhdGV3YXkucm9vdC5hZGRSZXNvdXJjZSgnc3RhdGljJyk7XG4gICAgY29uc3Qgc3RhdGljUHJveHkgPSBzdGF0aWNSZXNvdXJjZS5hZGRSZXNvdXJjZSgne3Byb3h5K30nKTtcbiAgICBzdGF0aWNQcm94eS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHN0YXRpY0ZpbGVzLCB7XG4gICAgICBwcm94eTogdHJ1ZSxcbiAgICAgIHJlcXVlc3RQYXJhbWV0ZXJzOiB7XG4gICAgICAgICdpbnRlZ3JhdGlvbi5yZXF1ZXN0LnBhdGgucHJveHknOiAnbWV0aG9kLnJlcXVlc3QucGF0aC5wcm94eSdcbiAgICAgIH1cbiAgICB9KSwge1xuICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwaWdhdGV3YXkuQXV0aG9yaXphdGlvblR5cGUuTk9ORSxcbiAgICAgIHJlcXVlc3RQYXJhbWV0ZXJzOiB7XG4gICAgICAgICdtZXRob2QucmVxdWVzdC5wYXRoLnByb3h5JzogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gQmxvZyBwYWdlIHJvdXRlcyAobm8gYXV0aCByZXF1aXJlZClcbiAgICBjb25zdCBibG9nUGFnZVJlc291cmNlID0gdGhpcy5hcGlHYXRld2F5LnJvb3QuYWRkUmVzb3VyY2UoJ2Jsb2ctcGFnZScpO1xuICAgIGJsb2dQYWdlUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihzdGF0aWNXZWJzaXRlKSwge1xuICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwaWdhdGV3YXkuQXV0aG9yaXphdGlvblR5cGUuTk9ORVxuICAgIH0pO1xuICAgIFxuICAgIC8vIEluZGl2aWR1YWwgYmxvZyBwb3N0IHBhZ2VzIChubyBhdXRoIHJlcXVpcmVkKVxuICAgIGNvbnN0IGJsb2dQb3N0UmVzb3VyY2UgPSBibG9nUGFnZVJlc291cmNlLmFkZFJlc291cmNlKCd7aWR9Jyk7XG4gICAgYmxvZ1Bvc3RSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHN0YXRpY1dlYnNpdGUpLCB7XG4gICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ2F0ZXdheS5BdXRob3JpemF0aW9uVHlwZS5OT05FXG4gICAgfSk7XG5cbiAgICAvLyBUYWdzXG4gICAgY2RrLlRhZ3Mub2YodGhpcy5hcGlHYXRld2F5KS5hZGQoJ1NlcnZpY2UnLCAnR2FiaVlvZ2FMYW1iZGEnKTtcbiAgICBjZGsuVGFncy5vZih0aGlzLmFwaUdhdGV3YXkpLmFkZCgnRW52aXJvbm1lbnQnLCBzdGFnZSk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcy5hc3NldHNCdWNrZXQpLmFkZCgnU2VydmljZScsICdHYWJpWW9nYUxhbWJkYScpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMuYXNzZXRzQnVja2V0KS5hZGQoJ0Vudmlyb25tZW50Jywgc3RhZ2UpO1xuXG4gICAgLy8gT3V0cHV0c1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBc3NldHNCdWNrZXROYW1lJywge1xuICAgICAgdmFsdWU6IHRoaXMuYXNzZXRzQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0Fzc2V0cyBidWNrZXQgbmFtZScsXG4gICAgICBleHBvcnROYW1lOiBgJHtyZXNvdXJjZVByZWZpeH0tQXNzZXRzQnVja2V0TmFtZWAsXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGdyYW50U0VTUGVybWlzc2lvbnMoZnVuY3Rpb25zOiBsYW1iZGEuRnVuY3Rpb25bXSk6IHZvaWQge1xuICAgIGZ1bmN0aW9ucy5mb3JFYWNoKGZ1bmMgPT4ge1xuICAgICAgLy8gQ3JlYXRlIGEgcG9saWN5IHN0YXRlbWVudCBmb3IgU0VTIHBlcm1pc3Npb25zXG4gICAgICBjb25zdCBzZXNQb2xpY3kgPSBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICdzZXM6U2VuZEVtYWlsJyxcbiAgICAgICAgICAnc2VzOlNlbmRSYXdFbWFpbCcsXG4gICAgICAgICAgJ3NlczpTZW5kVGVtcGxhdGVkRW1haWwnLFxuICAgICAgICAgICdzZXM6U2VuZEJ1bGtUZW1wbGF0ZWRFbWFpbCcsXG4gICAgICAgICAgJ3NlczpHZXRTZW5kUXVvdGEnLFxuICAgICAgICAgICdzZXM6R2V0QWNjb3VudFNlbmRpbmdFbmFibGVkJyxcbiAgICAgICAgICAnc2VzOkdldElkZW50aXR5VmVyaWZpY2F0aW9uQXR0cmlidXRlcycsXG4gICAgICAgICAgJ3NlczpHZXRJZGVudGl0eURraW1BdHRyaWJ1dGVzJyxcbiAgICAgICAgICAnc2VzOkdldElkZW50aXR5TWFpbEZyb21Eb21haW5BdHRyaWJ1dGVzJyxcbiAgICAgICAgICAnc2VzOkxpc3RJZGVudGl0aWVzJ1xuICAgICAgICBdLFxuICAgICAgICByZXNvdXJjZXM6IFsnKiddLCAvLyBJZGVhbGx5IHNob3VsZCBiZSBtb3JlIHJlc3RyaWN0aXZlIGluIGEgcHJvZHVjdGlvbiBlbnZpcm9ubWVudFxuICAgICAgfSk7XG5cbiAgICAgIC8vIEFkZCB0aGUgcG9saWN5IHRvIHRoZSBmdW5jdGlvbidzIHJvbGVcbiAgICAgIGZ1bmMuYWRkVG9Sb2xlUG9saWN5KHNlc1BvbGljeSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxuICAgIGlkOiBzdHJpbmcsIFxuICAgIGhhbmRsZXJQYXRoOiBzdHJpbmcsIFxuICAgIGNvbW1vblByb3BzOiBhbnlcbiAgKTogbGFtYmRhLkZ1bmN0aW9uIHtcbiAgICBjb25zdCBmdW5jID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCBpZCwge1xuICAgICAgLi4uY29tbW9uUHJvcHMsXG4gICAgICBmdW5jdGlvbk5hbWU6IGAke2NvbW1vblByb3BzLmVudmlyb25tZW50LlNUQUdFID09PSAncHJvZCcgPyAnR2FiaVlvZ2EtcHJvZCcgOiAnR2FiaVlvZ2EtZGV2J30tJHtpZH1gLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9sYW1iZGEnLCB7XG4gICAgICAgIGV4Y2x1ZGU6IFsnLmdpdCcsICcqLm1kJywgJ3Rlc3RzJywgJ19fdGVzdHNfXyddLFxuICAgICAgfSksXG4gICAgICBoYW5kbGVyOiBoYW5kbGVyUGF0aC5yZXBsYWNlKCcuanMnLCAnLmhhbmRsZXInKSxcbiAgICB9KTtcblxuICAgIHRoaXMubGFtYmRhRnVuY3Rpb25zLnB1c2goZnVuYyk7XG4gICAgXG4gICAgLy8gQWRkIHRhZ3NcbiAgICBjZGsuVGFncy5vZihmdW5jKS5hZGQoJ1NlcnZpY2UnLCAnR2FiaVlvZ2FMYW1iZGEnKTtcbiAgICBjZGsuVGFncy5vZihmdW5jKS5hZGQoJ0Vudmlyb25tZW50JywgY29tbW9uUHJvcHMuZW52aXJvbm1lbnQuU1RBR0UpO1xuICAgIGNkay5UYWdzLm9mKGZ1bmMpLmFkZCgnRnVuY3Rpb24nLCBpZCk7XG5cbiAgICByZXR1cm4gZnVuYztcbiAgfVxufVxuIl19