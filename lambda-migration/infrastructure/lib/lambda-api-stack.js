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
        const authVerifyToken = this.createLambdaFunction('AuthVerifyToken', 'auth/verify-token.js', commonLambdaProps);
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
        authResource.addResource('forgot').addMethod('POST', new apigateway.LambdaIntegration(authForgot));
        authResource.addResource('verify').addMethod('GET', new apigateway.LambdaIntegration(authVerify));
        authResource.addResource('verify-token').addMethod('GET', new apigateway.LambdaIntegration(authVerifyToken));
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
        // Dashboard Routes
        const adminDashboardResource = this.apiGateway.root.addResource('admin.html');
        adminDashboardResource.addMethod('GET', new apigateway.LambdaIntegration(adminDashboardPage), {
            authorizationType: apigateway.AuthorizationType.NONE
        });
        const userDashboardResource = this.apiGateway.root.addResource('user.html');
        userDashboardResource.addMethod('GET', new apigateway.LambdaIntegration(userDashboardPage), {
            authorizationType: apigateway.AuthorizationType.NONE
        });
        // Static files route with proxy integration
        const staticResource = this.apiGateway.root.addResource('static');
        const staticProxy = staticResource.addResource('{proxy+}');
        staticProxy.addMethod('GET', new apigateway.LambdaIntegration(staticFiles, {
            proxy: true,
            requestParameters: {
                'integration.request.path.proxy': 'method.request.path.proxy'
            },
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
                'method.request.path.proxy': true,
                'method.request.header.Accept': true,
                'method.request.header.Content-Type': true
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFtYmRhLWFwaS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImxhbWJkYS1hcGktc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsK0RBQWlEO0FBQ2pELHVFQUF5RDtBQUd6RCx1REFBeUM7QUFtQnpDLE1BQWEsY0FBZSxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBSzNDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBMEI7UUFDbEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFKVixvQkFBZSxHQUFzQixFQUFFLENBQUM7UUFNdEQsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLEtBQUssQ0FBQztRQUN4QixNQUFNLGNBQWMsR0FBRyxZQUFZLEtBQUssRUFBRSxDQUFDO1FBRTNDLHVCQUF1QjtRQUN2QixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ3RELFVBQVUsRUFBRSxhQUFhLEtBQUssV0FBVyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ3RELGdCQUFnQixFQUFFLEtBQUs7WUFDdkIsaUJBQWlCLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFNBQVM7WUFDakQsSUFBSSxFQUFFO2dCQUNKO29CQUNFLGNBQWMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDO29CQUM3RSxjQUFjLEVBQUUsS0FBSyxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztvQkFDekYsY0FBYyxFQUFFLENBQUMsR0FBRyxDQUFDO2lCQUN0QjthQUNGO1lBQ0QsY0FBYyxFQUFFO2dCQUNkO29CQUNFLEVBQUUsRUFBRSxrQ0FBa0M7b0JBQ3RDLG1DQUFtQyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztpQkFDMUQ7YUFDRjtZQUNELGFBQWEsRUFBRSxLQUFLLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1NBQ3ZGLENBQUMsQ0FBQztRQUVILHNDQUFzQztRQUN0QyxNQUFNLGlCQUFpQixHQUFHO1lBQ3hCLEtBQUssRUFBRSxLQUFLO1lBQ1osTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO1lBQ25CLFdBQVcsRUFBRSxLQUFLLENBQUMsVUFBVSxDQUFDLFNBQVM7WUFDdkMsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLGNBQWMsQ0FBQyxTQUFTO1lBQ2hELGFBQWEsRUFBRSxLQUFLLENBQUMsWUFBWSxDQUFDLFNBQVM7WUFDM0MsY0FBYyxFQUFFLEtBQUssQ0FBQyxhQUFhLENBQUMsU0FBUztZQUM3QyxjQUFjLEVBQUUsS0FBSyxDQUFDLGFBQWEsQ0FBQyxTQUFTO1lBQzdDLGVBQWUsRUFBRSxLQUFLLENBQUMsY0FBYyxDQUFDLFNBQVM7WUFDL0MsYUFBYSxFQUFFLEtBQUssQ0FBQyxZQUFZLENBQUMsU0FBUztZQUMzQyxjQUFjLEVBQUUsS0FBSyxDQUFDLGFBQWEsQ0FBQyxTQUFTO1lBQzdDLG9CQUFvQixFQUFFLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTO1lBQ3pELG1CQUFtQixFQUFFLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBQ3RELGVBQWUsRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLFVBQVU7WUFDM0Msa0JBQWtCLEVBQUUsS0FBSyxDQUFDLFlBQVksQ0FBQyxVQUFVO1lBQ2pELGFBQWEsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVU7WUFDM0MsV0FBVyxFQUFFLEtBQUssS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLHlDQUF5QyxDQUFDLENBQUMsQ0FBQyxHQUFHO1NBQ2hGLENBQUM7UUFFRiwyQkFBMkI7UUFDM0IsTUFBTSxpQkFBaUIsR0FBRztZQUN4QixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsVUFBVSxFQUFFLEdBQUc7WUFDZixXQUFXLEVBQUUsaUJBQWlCO1lBQzlCLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU07WUFDOUIsWUFBWSxFQUFFLE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLDJCQUEyQjtTQUN0RSxDQUFDO1FBRUYsa0NBQWtDO1FBQ2xDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDN0YsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3RHLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxhQUFhLEVBQUUsaUJBQWlCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUNuRyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsWUFBWSxFQUFFLGdCQUFnQixFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDaEcsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFlBQVksRUFBRSxnQkFBZ0IsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQ2hHLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxZQUFZLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUNoRyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsaUJBQWlCLEVBQUUsc0JBQXNCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUVoSCx3QkFBd0I7UUFDeEIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFVBQVUsRUFBRSxjQUFjLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUMxRixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsU0FBUyxFQUFFLGFBQWEsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3ZGLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxZQUFZLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUNoRyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsWUFBWSxFQUFFLGdCQUFnQixFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDaEcsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFlBQVksRUFBRSxnQkFBZ0IsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQ2hHLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxhQUFhLEVBQUUsaUJBQWlCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUVuRyx5QkFBeUI7UUFDekIsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGdCQUFnQixFQUFFLG9CQUFvQixFQUFFO1lBQ3ZGLEdBQUcsaUJBQWlCO1lBQ3BCLFVBQVUsRUFBRSxHQUFHLEVBQUUseUNBQXlDO1NBQzNELENBQUMsQ0FBQztRQUNILE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxZQUFZLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUNoRyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsZUFBZSxFQUFFLG1CQUFtQixFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFFekcscURBQXFEO1FBQ3JELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxhQUFhLEVBQUUsaUJBQWlCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUVuRywyQkFBMkI7UUFDM0IsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGFBQWEsRUFBRSxpQkFBaUIsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQ25HLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxlQUFlLEVBQUUsbUJBQW1CLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUN6RyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsYUFBYSxFQUFFLGlCQUFpQixFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDbkcsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGVBQWUsRUFBRSxtQkFBbUIsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBRXpHLDJCQUEyQjtRQUMzQixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsZ0JBQWdCLEVBQUUsb0JBQW9CLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUM1RyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsYUFBYSxFQUFFLGlCQUFpQixFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDbkcsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGFBQWEsRUFBRSwwQkFBMEIsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBRTVHLDJCQUEyQjtRQUMzQixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsZUFBZSxFQUFFLG1CQUFtQixFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDekcsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGdCQUFnQixFQUFFLG9CQUFvQixFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFFNUcsa0NBQWtDO1FBQ2xDLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxlQUFlLEVBQUUsbUJBQW1CLEVBQUU7WUFDcEYsR0FBRyxpQkFBaUI7WUFDcEIsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUscUNBQXFDO1NBQ3pFLENBQUMsQ0FBQztRQUVILE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxhQUFhLEVBQUUsd0JBQXdCLEVBQUU7WUFDckYsR0FBRyxpQkFBaUI7WUFDcEIsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1NBQ2xDLENBQUMsQ0FBQztRQUVILDZCQUE2QjtRQUM3QixNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxvQkFBb0IsRUFBRSwwQkFBMEIsRUFBRTtZQUNyRyxHQUFHLGlCQUFpQjtZQUNwQixVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7U0FDbEMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsbUJBQW1CLEVBQUUseUJBQXlCLEVBQUU7WUFDbEcsR0FBRyxpQkFBaUI7WUFDcEIsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1NBQ2xDLENBQUMsQ0FBQztRQUVILDRDQUE0QztRQUM1QyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNsQyw2QkFBNkI7WUFDN0IsS0FBSyxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMxQyxLQUFLLENBQUMsY0FBYyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzlDLEtBQUssQ0FBQyxZQUFZLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDNUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM3QyxLQUFLLENBQUMsYUFBYSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzdDLEtBQUssQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDOUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM1QyxLQUFLLENBQUMsYUFBYSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzdDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNuRCxLQUFLLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFakQsb0NBQW9DO1lBQ3BDLEtBQUssQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2hDLEtBQUssQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRW5DLHVCQUF1QjtZQUN2QixJQUFJLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6QyxDQUFDLENBQUMsQ0FBQztRQUVILGNBQWM7UUFDZCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQzNELFdBQVcsRUFBRSxjQUFjO1lBQzNCLFdBQVcsRUFBRSxpQ0FBaUMsS0FBSyxHQUFHO1lBQ3RELDJCQUEyQixFQUFFO2dCQUMzQixZQUFZLEVBQUUsS0FBSyxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFdBQVc7Z0JBQzdHLFlBQVksRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLFdBQVc7Z0JBQ3pDLFlBQVksRUFBRSxDQUFDLGNBQWMsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLFdBQVcsRUFBRSxzQkFBc0IsQ0FBQztnQkFDbEcsZ0JBQWdCLEVBQUUsS0FBSzthQUN4QjtZQUNELGFBQWEsRUFBRTtnQkFDYixTQUFTLEVBQUUsS0FBSztnQkFDaEIsY0FBYyxFQUFFLElBQUk7YUFDckI7U0FDRixDQUFDLENBQUM7UUFFSCxvQ0FBb0M7UUFDcEMsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRTlELGlCQUFpQjtRQUNqQixNQUFNLGFBQWEsR0FBRyxZQUFZLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3hELGFBQWEsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQzNFLGlCQUFpQixFQUFFLEVBQUUsb0NBQW9DLEVBQUUsSUFBSSxFQUFFO1lBQ2pFLGlCQUFpQixFQUFFLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJO1NBQ3JELENBQUMsQ0FBQztRQUVILG9CQUFvQjtRQUNwQixNQUFNLGdCQUFnQixHQUFHLFlBQVksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDOUQsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxJQUFJLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsRUFBRTtZQUNqRixpQkFBaUIsRUFBRSxVQUFVLENBQUMsaUJBQWlCLENBQUMsSUFBSTtTQUNyRCxDQUFDLENBQUM7UUFFSCx1QkFBdUI7UUFDdkIsWUFBWSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDckcsWUFBWSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDbkcsWUFBWSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDbkcsWUFBWSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDbEcsWUFBWSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7UUFFN0csTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzlELFlBQVksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDMUUsWUFBWSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxVQUFVLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUM3RSxNQUFNLGdCQUFnQixHQUFHLFlBQVksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDMUQsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxJQUFJLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQzdFLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxVQUFVLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUNoRixnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDbkYsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxVQUFVLENBQUMsaUJBQWlCLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUV6RyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDaEUsYUFBYSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7UUFDMUcsYUFBYSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDbEcsYUFBYSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7UUFFeEcsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3BFLGVBQWUsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDaEYsZUFBZSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxVQUFVLENBQUMsaUJBQWlCLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUNqRixlQUFlLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxVQUFVLENBQUMsaUJBQWlCLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUN6RyxlQUFlLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxVQUFVLENBQUMsaUJBQWlCLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUV6RyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDcEUsZUFBZSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxVQUFVLENBQUMsaUJBQWlCLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztRQUNuRixlQUFlLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFFekgsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDdEUsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxJQUFJLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBRWpGLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNwRSxlQUFlLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxVQUFVLENBQUMsaUJBQWlCLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUN6RyxlQUFlLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxVQUFVLENBQUMsaUJBQWlCLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztRQUUzRyw4Q0FBOEM7UUFDOUMsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDdEUsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxJQUFJLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQ2pGLCtDQUErQztRQUMvQyxNQUFNLG9CQUFvQixHQUFHLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNuRSxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFFckYsb0RBQW9EO1FBQ3BELHlCQUF5QjtRQUN6QixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7UUFFdkYsbUJBQW1CO1FBQ25CLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzlFLHNCQUFzQixDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxVQUFVLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLENBQUMsRUFBRTtZQUM1RixpQkFBaUIsRUFBRSxVQUFVLENBQUMsaUJBQWlCLENBQUMsSUFBSTtTQUNyRCxDQUFDLENBQUM7UUFFSCxNQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM1RSxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLGlCQUFpQixDQUFDLEVBQUU7WUFDMUYsaUJBQWlCLEVBQUUsVUFBVSxDQUFDLGlCQUFpQixDQUFDLElBQUk7U0FDckQsQ0FBQyxDQUFDO1FBRUgsNENBQTRDO1FBQzVDLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNsRSxNQUFNLFdBQVcsR0FBRyxjQUFjLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzNELFdBQVcsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsRUFBRTtZQUN6RSxLQUFLLEVBQUUsSUFBSTtZQUNYLGlCQUFpQixFQUFFO2dCQUNqQixnQ0FBZ0MsRUFBRSwyQkFBMkI7YUFDOUQ7WUFDRCxnQkFBZ0IsRUFBRTtnQkFDaEIsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDakMsSUFBSSxFQUFFLGVBQWU7b0JBQ3JCLFVBQVUsRUFBRSxxQkFBcUI7b0JBQ2pDLE9BQU8sRUFBRSx3QkFBd0I7b0JBQ2pDLHFCQUFxQixFQUFFLDZCQUE2QjtvQkFDcEQsY0FBYyxFQUFFLHNCQUFzQjtvQkFDdEMsSUFBSSxFQUFFLGFBQWE7aUJBQ3BCLENBQUM7YUFDSDtTQUNGLENBQUMsRUFBRTtZQUNGLGlCQUFpQixFQUFFO2dCQUNqQiwyQkFBMkIsRUFBRSxJQUFJO2dCQUNqQyw4QkFBOEIsRUFBRSxJQUFJO2dCQUNwQyxvQ0FBb0MsRUFBRSxJQUFJO2FBQzNDO1NBQ0YsQ0FBQyxDQUFDO1FBR0gsT0FBTztRQUNQLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDOUQsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdkQsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUNoRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV6RCxVQUFVO1FBQ1YsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUMxQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVO1lBQ25DLFdBQVcsRUFBRSxvQkFBb0I7WUFDakMsVUFBVSxFQUFFLEdBQUcsY0FBYyxtQkFBbUI7U0FDakQsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLG9CQUFvQixDQUMxQixFQUFVLEVBQ1YsV0FBbUIsRUFDbkIsV0FBZ0I7UUFFaEIsTUFBTSxJQUFJLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUU7WUFDekMsR0FBRyxXQUFXO1lBQ2QsWUFBWSxFQUFFLEdBQUcsV0FBVyxDQUFDLFdBQVcsQ0FBQyxLQUFLLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGNBQWMsSUFBSSxFQUFFLEVBQUU7WUFDcEcsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRTtnQkFDdkMsT0FBTyxFQUFFLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsV0FBVyxDQUFDO2FBQ2hELENBQUM7WUFDRixPQUFPLEVBQUUsV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDO1NBQ2hELENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRWhDLFdBQVc7UUFDWCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDbkQsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxXQUFXLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFdEMsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0NBQ0Y7QUFyVEQsd0NBcVRDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknO1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcbmltcG9ydCAqIGFzIHNlY3JldHNtYW5hZ2VyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zZWNyZXRzbWFuYWdlcic7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTGFtYmRhQXBpU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgc3RhZ2U6IHN0cmluZztcbiAgdXNlcnNUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIGJsb2dQb3N0c1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgY2xhc3Nlc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgYm9va2luZ3NUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIHJldHJlYXRzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICB3b3Jrc2hvcHNUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIGdhbGxlcnlUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIHNldHRpbmdzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICBjb21tdW5pY2F0aW9uc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgand0QmxhY2tsaXN0VGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICBqd3RTZWNyZXQ6IHNlY3JldHNtYW5hZ2VyLlNlY3JldDtcbiAgc3RyaXBlU2VjcmV0OiBzZWNyZXRzbWFuYWdlci5TZWNyZXQ7XG59XG5cbmV4cG9ydCBjbGFzcyBMYW1iZGFBcGlTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBhcGlHYXRld2F5OiBhcGlnYXRld2F5LlJlc3RBcGk7XG4gIHB1YmxpYyByZWFkb25seSBsYW1iZGFGdW5jdGlvbnM6IGxhbWJkYS5GdW5jdGlvbltdID0gW107XG4gIHB1YmxpYyByZWFkb25seSBhc3NldHNCdWNrZXQ6IHMzLkJ1Y2tldDtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogTGFtYmRhQXBpU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgY29uc3QgeyBzdGFnZSB9ID0gcHJvcHM7XG4gICAgY29uc3QgcmVzb3VyY2VQcmVmaXggPSBgR2FiaVlvZ2EtJHtzdGFnZX1gO1xuXG4gICAgLy8gUzMgQnVja2V0IGZvciBhc3NldHNcbiAgICB0aGlzLmFzc2V0c0J1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ0Fzc2V0c0J1Y2tldCcsIHtcbiAgICAgIGJ1Y2tldE5hbWU6IGBnYWJpLXlvZ2EtJHtzdGFnZX0tYXNzZXRzLSR7dGhpcy5yZWdpb259YCxcbiAgICAgIHB1YmxpY1JlYWRBY2Nlc3M6IGZhbHNlLFxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgIGNvcnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBbczMuSHR0cE1ldGhvZHMuR0VULCBzMy5IdHRwTWV0aG9kcy5QT1NULCBzMy5IdHRwTWV0aG9kcy5QVVRdLFxuICAgICAgICAgIGFsbG93ZWRPcmlnaW5zOiBzdGFnZSA9PT0gJ3Byb2QnID8gWydodHRwczovL2dhYmkueW9nYScsICdodHRwczovL3d3dy5nYWJpLnlvZ2EnXSA6IFsnKiddLFxuICAgICAgICAgIGFsbG93ZWRIZWFkZXJzOiBbJyonXSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICBsaWZlY3ljbGVSdWxlczogW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdEZWxldGVJbmNvbXBsZXRlTXVsdGlwYXJ0VXBsb2FkcycsXG4gICAgICAgICAgYWJvcnRJbmNvbXBsZXRlTXVsdGlwYXJ0VXBsb2FkQWZ0ZXI6IGNkay5EdXJhdGlvbi5kYXlzKDEpLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IHN0YWdlID09PSAncHJvZCcgPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgLy8gQ29tbW9uIExhbWJkYSBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAgICBjb25zdCBjb21tb25FbnZpcm9ubWVudCA9IHtcbiAgICAgIFNUQUdFOiBzdGFnZSxcbiAgICAgIFJFR0lPTjogdGhpcy5yZWdpb24sXG4gICAgICBVU0VSU19UQUJMRTogcHJvcHMudXNlcnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBCTE9HX1BPU1RTX1RBQkxFOiBwcm9wcy5ibG9nUG9zdHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBDTEFTU0VTX1RBQkxFOiBwcm9wcy5jbGFzc2VzVGFibGUudGFibGVOYW1lLFxuICAgICAgQk9PS0lOR1NfVEFCTEU6IHByb3BzLmJvb2tpbmdzVGFibGUudGFibGVOYW1lLFxuICAgICAgUkVUUkVBVFNfVEFCTEU6IHByb3BzLnJldHJlYXRzVGFibGUudGFibGVOYW1lLFxuICAgICAgV09SS1NIT1BTX1RBQkxFOiBwcm9wcy53b3Jrc2hvcHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBHQUxMRVJZX1RBQkxFOiBwcm9wcy5nYWxsZXJ5VGFibGUudGFibGVOYW1lLFxuICAgICAgU0VUVElOR1NfVEFCTEU6IHByb3BzLnNldHRpbmdzVGFibGUudGFibGVOYW1lLFxuICAgICAgQ09NTVVOSUNBVElPTlNfVEFCTEU6IHByb3BzLmNvbW11bmljYXRpb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgSldUX0JMQUNLTElTVF9UQUJMRTogcHJvcHMuand0QmxhY2tsaXN0VGFibGUudGFibGVOYW1lLFxuICAgICAgSldUX1NFQ1JFVF9OQU1FOiBwcm9wcy5qd3RTZWNyZXQuc2VjcmV0TmFtZSxcbiAgICAgIFNUUklQRV9TRUNSRVRfTkFNRTogcHJvcHMuc3RyaXBlU2VjcmV0LnNlY3JldE5hbWUsXG4gICAgICBBU1NFVFNfQlVDS0VUOiB0aGlzLmFzc2V0c0J1Y2tldC5idWNrZXROYW1lLFxuICAgICAgQ09SU19PUklHSU46IHN0YWdlID09PSAncHJvZCcgPyAnaHR0cHM6Ly9nYWJpLnlvZ2EsaHR0cHM6Ly93d3cuZ2FiaS55b2dhJyA6ICcqJyxcbiAgICB9O1xuXG4gICAgLy8gQ29tbW9uIExhbWJkYSBwcm9wZXJ0aWVzXG4gICAgY29uc3QgY29tbW9uTGFtYmRhUHJvcHMgPSB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTZfWCxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcbiAgICAgIGVudmlyb25tZW50OiBjb21tb25FbnZpcm9ubWVudCxcbiAgICAgIHRyYWNpbmc6IGxhbWJkYS5UcmFjaW5nLkFDVElWRSxcbiAgICAgIGFyY2hpdGVjdHVyZTogbGFtYmRhLkFyY2hpdGVjdHVyZS5BUk1fNjQsIC8vIEJldHRlciBwcmljZS9wZXJmb3JtYW5jZVxuICAgIH07XG5cbiAgICAvLyBBdXRoZW50aWNhdGlvbiBMYW1iZGEgRnVuY3Rpb25zXG4gICAgY29uc3QgYXV0aExvZ2luID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignQXV0aExvZ2luJywgJ2F1dGgvbG9naW4uanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG4gICAgY29uc3QgYXV0aFJlZ2lzdGVyID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignQXV0aFJlZ2lzdGVyJywgJ2F1dGgvcmVnaXN0ZXIuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG4gICAgY29uc3QgYXV0aFJlZnJlc2ggPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdBdXRoUmVmcmVzaCcsICdhdXRoL3JlZnJlc2guanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG4gICAgY29uc3QgYXV0aExvZ291dCA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0F1dGhMb2dvdXQnLCAnYXV0aC9sb2dvdXQuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG4gICAgY29uc3QgYXV0aEZvcmdvdCA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0F1dGhGb3Jnb3QnLCAnYXV0aC9mb3Jnb3QuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG4gICAgY29uc3QgYXV0aFZlcmlmeSA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0F1dGhWZXJpZnknLCAnYXV0aC92ZXJpZnkuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG4gICAgY29uc3QgYXV0aFZlcmlmeVRva2VuID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignQXV0aFZlcmlmeVRva2VuJywgJ2F1dGgvdmVyaWZ5LXRva2VuLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuXG4gICAgLy8gQmxvZyBMYW1iZGEgRnVuY3Rpb25zXG4gICAgY29uc3QgYmxvZ0xpc3QgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdCbG9nTGlzdCcsICdibG9nL2xpc3QuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG4gICAgY29uc3QgYmxvZ0dldCA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0Jsb2dHZXQnLCAnYmxvZy9nZXQuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG4gICAgY29uc3QgYmxvZ0NyZWF0ZSA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0Jsb2dDcmVhdGUnLCAnYmxvZy9jcmVhdGUuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG4gICAgY29uc3QgYmxvZ1VwZGF0ZSA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0Jsb2dVcGRhdGUnLCAnYmxvZy91cGRhdGUuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG4gICAgY29uc3QgYmxvZ0RlbGV0ZSA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0Jsb2dEZWxldGUnLCAnYmxvZy9kZWxldGUuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG4gICAgY29uc3QgYmxvZ1B1Ymxpc2ggPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdCbG9nUHVibGlzaCcsICdibG9nL3B1Ymxpc2guanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG5cbiAgICAvLyBBZG1pbiBMYW1iZGEgRnVuY3Rpb25zXG4gICAgY29uc3QgYWRtaW5EYXNoYm9hcmQgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdBZG1pbkRhc2hib2FyZCcsICdhZG1pbi9kYXNoYm9hcmQuanMnLCB7XG4gICAgICAuLi5jb21tb25MYW1iZGFQcm9wcyxcbiAgICAgIG1lbW9yeVNpemU6IDUxMiwgLy8gTW9yZSBtZW1vcnkgZm9yIGRhc2hib2FyZCBhZ2dyZWdhdGlvbnNcbiAgICB9KTtcbiAgICBjb25zdCBhZG1pblVzZXJzID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignQWRtaW5Vc2VycycsICdhZG1pbi91c2Vycy5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcbiAgICBjb25zdCBhZG1pblNldHRpbmdzID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignQWRtaW5TZXR0aW5ncycsICdhZG1pbi9zZXR0aW5ncy5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcblxuICAgIC8vIFB1YmxpYyBTZXR0aW5ncyBMYW1iZGEgRnVuY3Rpb24gKGZvciBHRVQgcmVxdWVzdHMpXG4gICAgY29uc3Qgc2V0dGluZ3NHZXQgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdTZXR0aW5nc0dldCcsICdzZXR0aW5ncy9nZXQuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG5cbiAgICAvLyBHYWxsZXJ5IExhbWJkYSBGdW5jdGlvbnNcbiAgICBjb25zdCBnYWxsZXJ5TGlzdCA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0dhbGxlcnlMaXN0JywgJ2dhbGxlcnkvbGlzdC5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcbiAgICBjb25zdCBnYWxsZXJ5VXBsb2FkID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignR2FsbGVyeVVwbG9hZCcsICdnYWxsZXJ5L3VwbG9hZC5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcbiAgICBjb25zdCBnYWxsZXJ5U2F2ZSA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0dhbGxlcnlTYXZlJywgJ2dhbGxlcnkvc2F2ZS5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcbiAgICBjb25zdCBnYWxsZXJ5RGVsZXRlID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignR2FsbGVyeURlbGV0ZScsICdnYWxsZXJ5L2RlbGV0ZS5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcblxuICAgIC8vIEJvb2tpbmcgTGFtYmRhIEZ1bmN0aW9uc1xuICAgIGNvbnN0IGJvb2tpbmdDbGFzc2VzID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignQm9va2luZ0NsYXNzZXMnLCAnYm9va2luZy9jbGFzc2VzLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGJvb2tpbmdCb29rID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignQm9va2luZ0Jvb2snLCAnYm9va2luZy9ib29rLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGJvb2tpbmdMaXN0ID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignQm9va2luZ0xpc3QnLCAnYm9va2luZy9saXN0LWJvb2tpbmdzLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuXG4gICAgLy8gUGF5bWVudCBMYW1iZGEgRnVuY3Rpb25zXG4gICAgY29uc3QgcGF5bWVudEludGVudCA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ1BheW1lbnRJbnRlbnQnLCAncGF5bWVudC9pbnRlbnQuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG4gICAgY29uc3QgcGF5bWVudFdlYmhvb2sgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdQYXltZW50V2ViaG9vaycsICdwYXltZW50L3dlYmhvb2suanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG5cbiAgICAvLyBTdGF0aWMgV2Vic2l0ZSBMYW1iZGEgRnVuY3Rpb25zXG4gICAgY29uc3Qgc3RhdGljV2Vic2l0ZSA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ1N0YXRpY1dlYnNpdGUnLCAnc3RhdGljL3dlYnNpdGUuanMnLCB7XG4gICAgICAuLi5jb21tb25MYW1iZGFQcm9wcyxcbiAgICAgIG1lbW9yeVNpemU6IDUxMiwgLy8gTW9yZSBtZW1vcnkgZm9yIGZpbGUgc2VydmluZ1xuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMTApLCAvLyBTaG9ydGVyIHRpbWVvdXQgZm9yIHN0YXRpYyBjb250ZW50XG4gICAgfSk7XG5cbiAgICBjb25zdCBzdGF0aWNGaWxlcyA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ1N0YXRpY0ZpbGVzJywgJ3N0YXRpYy9zZXJ2ZS1zdGF0aWMuanMnLCB7XG4gICAgICAuLi5jb21tb25MYW1iZGFQcm9wcyxcbiAgICAgIG1lbW9yeVNpemU6IDUxMiwgLy8gTW9yZSBtZW1vcnkgZm9yIGZpbGUgc2VydmluZ1xuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMTApLFxuICAgIH0pO1xuXG4gICAgLy8gRGFzaGJvYXJkIExhbWJkYSBGdW5jdGlvbnNcbiAgICBjb25zdCBhZG1pbkRhc2hib2FyZFBhZ2UgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdBZG1pbkRhc2hib2FyZFBhZ2UnLCAnYWRtaW4vc2VydmUtZGFzaGJvYXJkLmpzJywge1xuICAgICAgLi4uY29tbW9uTGFtYmRhUHJvcHMsXG4gICAgICBtZW1vcnlTaXplOiA1MTIsIC8vIE1vcmUgbWVtb3J5IGZvciBmaWxlIHNlcnZpbmdcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHVzZXJEYXNoYm9hcmRQYWdlID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignVXNlckRhc2hib2FyZFBhZ2UnLCAndXNlci9zZXJ2ZS1kYXNoYm9hcmQuanMnLCB7XG4gICAgICAuLi5jb21tb25MYW1iZGFQcm9wcyxcbiAgICAgIG1lbW9yeVNpemU6IDUxMiwgLy8gTW9yZSBtZW1vcnkgZm9yIGZpbGUgc2VydmluZ1xuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMTApLFxuICAgIH0pO1xuXG4gICAgLy8gR3JhbnQgcGVybWlzc2lvbnMgdG8gYWxsIExhbWJkYSBmdW5jdGlvbnNcbiAgICB0aGlzLmxhbWJkYUZ1bmN0aW9ucy5mb3JFYWNoKGZ1bmMgPT4ge1xuICAgICAgLy8gR3JhbnQgRHluYW1vREIgcGVybWlzc2lvbnNcbiAgICAgIHByb3BzLnVzZXJzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGZ1bmMpO1xuICAgICAgcHJvcHMuYmxvZ1Bvc3RzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGZ1bmMpO1xuICAgICAgcHJvcHMuY2xhc3Nlc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShmdW5jKTtcbiAgICAgIHByb3BzLmJvb2tpbmdzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGZ1bmMpO1xuICAgICAgcHJvcHMucmV0cmVhdHNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZnVuYyk7XG4gICAgICBwcm9wcy53b3Jrc2hvcHNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZnVuYyk7XG4gICAgICBwcm9wcy5nYWxsZXJ5VGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGZ1bmMpO1xuICAgICAgcHJvcHMuc2V0dGluZ3NUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZnVuYyk7XG4gICAgICBwcm9wcy5jb21tdW5pY2F0aW9uc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShmdW5jKTtcbiAgICAgIHByb3BzLmp3dEJsYWNrbGlzdFRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShmdW5jKTtcblxuICAgICAgLy8gR3JhbnQgU2VjcmV0cyBNYW5hZ2VyIHBlcm1pc3Npb25zXG4gICAgICBwcm9wcy5qd3RTZWNyZXQuZ3JhbnRSZWFkKGZ1bmMpO1xuICAgICAgcHJvcHMuc3RyaXBlU2VjcmV0LmdyYW50UmVhZChmdW5jKTtcblxuICAgICAgLy8gR3JhbnQgUzMgcGVybWlzc2lvbnNcbiAgICAgIHRoaXMuYXNzZXRzQnVja2V0LmdyYW50UmVhZFdyaXRlKGZ1bmMpO1xuICAgIH0pO1xuXG4gICAgLy8gQVBJIEdhdGV3YXlcbiAgICB0aGlzLmFwaUdhdGV3YXkgPSBuZXcgYXBpZ2F0ZXdheS5SZXN0QXBpKHRoaXMsICdBcGlHYXRld2F5Jywge1xuICAgICAgcmVzdEFwaU5hbWU6IHJlc291cmNlUHJlZml4LFxuICAgICAgZGVzY3JpcHRpb246IGBHYWJpIFlvZ2EgTGFtYmRhIEFQSSBHYXRld2F5ICgke3N0YWdlfSlgLFxuICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XG4gICAgICAgIGFsbG93T3JpZ2luczogc3RhZ2UgPT09ICdwcm9kJyA/IFsnaHR0cHM6Ly9nYWJpLnlvZ2EnLCAnaHR0cHM6Ly93d3cuZ2FiaS55b2dhJ10gOiBhcGlnYXRld2F5LkNvcnMuQUxMX09SSUdJTlMsXG4gICAgICAgIGFsbG93TWV0aG9kczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9NRVRIT0RTLFxuICAgICAgICBhbGxvd0hlYWRlcnM6IFsnQ29udGVudC1UeXBlJywgJ0F1dGhvcml6YXRpb24nLCAnWC1BbXotRGF0ZScsICdYLUFwaS1LZXknLCAnWC1BbXotU2VjdXJpdHktVG9rZW4nXSxcbiAgICAgICAgYWxsb3dDcmVkZW50aWFsczogZmFsc2UsXG4gICAgICB9LFxuICAgICAgZGVwbG95T3B0aW9uczoge1xuICAgICAgICBzdGFnZU5hbWU6IHN0YWdlLFxuICAgICAgICB0cmFjaW5nRW5hYmxlZDogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBBUEkgR2F0ZXdheSBSZXNvdXJjZXMgYW5kIE1ldGhvZHNcbiAgICBjb25zdCBhdXRoUmVzb3VyY2UgPSB0aGlzLmFwaUdhdGV3YXkucm9vdC5hZGRSZXNvdXJjZSgnYXV0aCcpO1xuICAgIFxuICAgIC8vIExvZ2luIGVuZHBvaW50XG4gICAgY29uc3QgbG9naW5SZXNvdXJjZSA9IGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgnbG9naW4nKTtcbiAgICBsb2dpblJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGF1dGhMb2dpbiksIHsgXG4gICAgICByZXF1ZXN0UGFyYW1ldGVyczogeyAnbWV0aG9kLnJlcXVlc3QuaGVhZGVyLkNvbnRlbnQtVHlwZSc6IHRydWUgfSxcbiAgICAgIGF1dGhvcml6YXRpb25UeXBlOiBhcGlnYXRld2F5LkF1dGhvcml6YXRpb25UeXBlLk5PTkVcbiAgICB9KTtcblxuICAgIC8vIFJlZ2lzdGVyIGVuZHBvaW50XG4gICAgY29uc3QgcmVnaXN0ZXJSZXNvdXJjZSA9IGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgncmVnaXN0ZXInKTtcbiAgICByZWdpc3RlclJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGF1dGhSZWdpc3RlciksIHtcbiAgICAgIGF1dGhvcml6YXRpb25UeXBlOiBhcGlnYXRld2F5LkF1dGhvcml6YXRpb25UeXBlLk5PTkVcbiAgICB9KTtcblxuICAgIC8vIE90aGVyIGF1dGggZW5kcG9pbnRzXG4gICAgYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdyZWZyZXNoJykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYXV0aFJlZnJlc2gpKTtcbiAgICBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2xvZ291dCcpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGF1dGhMb2dvdXQpKTtcbiAgICBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2ZvcmdvdCcpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGF1dGhGb3Jnb3QpKTtcbiAgICBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3ZlcmlmeScpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYXV0aFZlcmlmeSkpO1xuICAgIGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgndmVyaWZ5LXRva2VuJykuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhdXRoVmVyaWZ5VG9rZW4pKTtcblxuICAgIGNvbnN0IGJsb2dSZXNvdXJjZSA9IHRoaXMuYXBpR2F0ZXdheS5yb290LmFkZFJlc291cmNlKCdibG9nJyk7XG4gICAgYmxvZ1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYmxvZ0xpc3QpKTtcbiAgICBibG9nUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYmxvZ0NyZWF0ZSkpO1xuICAgIGNvbnN0IGJsb2dJdGVtUmVzb3VyY2UgPSBibG9nUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3tpZH0nKTtcbiAgICBibG9nSXRlbVJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYmxvZ0dldCkpO1xuICAgIGJsb2dJdGVtUmVzb3VyY2UuYWRkTWV0aG9kKCdQVVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihibG9nVXBkYXRlKSk7XG4gICAgYmxvZ0l0ZW1SZXNvdXJjZS5hZGRNZXRob2QoJ0RFTEVURScsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGJsb2dEZWxldGUpKTtcbiAgICBibG9nSXRlbVJlc291cmNlLmFkZFJlc291cmNlKCdwdWJsaXNoJykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYmxvZ1B1Ymxpc2gpKTtcblxuICAgIGNvbnN0IGFkbWluUmVzb3VyY2UgPSB0aGlzLmFwaUdhdGV3YXkucm9vdC5hZGRSZXNvdXJjZSgnYWRtaW4nKTtcbiAgICBhZG1pblJlc291cmNlLmFkZFJlc291cmNlKCdkYXNoYm9hcmQnKS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGFkbWluRGFzaGJvYXJkKSk7XG4gICAgYWRtaW5SZXNvdXJjZS5hZGRSZXNvdXJjZSgndXNlcnMnKS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGFkbWluVXNlcnMpKTtcbiAgICBhZG1pblJlc291cmNlLmFkZFJlc291cmNlKCdzZXR0aW5ncycpLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYWRtaW5TZXR0aW5ncykpO1xuXG4gICAgY29uc3QgZ2FsbGVyeVJlc291cmNlID0gdGhpcy5hcGlHYXRld2F5LnJvb3QuYWRkUmVzb3VyY2UoJ2dhbGxlcnknKTtcbiAgICBnYWxsZXJ5UmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihnYWxsZXJ5TGlzdCkpO1xuICAgIGdhbGxlcnlSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihnYWxsZXJ5U2F2ZSkpO1xuICAgIGdhbGxlcnlSZXNvdXJjZS5hZGRSZXNvdXJjZSgndXBsb2FkJykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ2FsbGVyeVVwbG9hZCkpO1xuICAgIGdhbGxlcnlSZXNvdXJjZS5hZGRSZXNvdXJjZSgne2lkfScpLmFkZE1ldGhvZCgnREVMRVRFJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ2FsbGVyeURlbGV0ZSkpO1xuXG4gICAgY29uc3QgY2xhc3Nlc1Jlc291cmNlID0gdGhpcy5hcGlHYXRld2F5LnJvb3QuYWRkUmVzb3VyY2UoJ2NsYXNzZXMnKTtcbiAgICBjbGFzc2VzUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihib29raW5nQ2xhc3NlcykpO1xuICAgIGNsYXNzZXNSZXNvdXJjZS5hZGRSZXNvdXJjZSgne2lkfScpLmFkZFJlc291cmNlKCdib29rJykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYm9va2luZ0Jvb2spKTtcblxuICAgIGNvbnN0IGJvb2tpbmdzUmVzb3VyY2UgPSB0aGlzLmFwaUdhdGV3YXkucm9vdC5hZGRSZXNvdXJjZSgnYm9va2luZ3MnKTtcbiAgICBib29raW5nc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYm9va2luZ0xpc3QpKTtcblxuICAgIGNvbnN0IHBheW1lbnRSZXNvdXJjZSA9IHRoaXMuYXBpR2F0ZXdheS5yb290LmFkZFJlc291cmNlKCdwYXltZW50Jyk7XG4gICAgcGF5bWVudFJlc291cmNlLmFkZFJlc291cmNlKCdpbnRlbnQnKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwYXltZW50SW50ZW50KSk7XG4gICAgcGF5bWVudFJlc291cmNlLmFkZFJlc291cmNlKCd3ZWJob29rJykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocGF5bWVudFdlYmhvb2spKTtcblxuICAgIC8vIFB1YmxpYyBTZXR0aW5ncyBSZXNvdXJjZSAoZm9yIEdFVCByZXF1ZXN0cylcbiAgICBjb25zdCBzZXR0aW5nc1Jlc291cmNlID0gdGhpcy5hcGlHYXRld2F5LnJvb3QuYWRkUmVzb3VyY2UoJ3NldHRpbmdzJyk7XG4gICAgc2V0dGluZ3NSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHNldHRpbmdzR2V0KSk7XG4gICAgLy8gU3VwcG9ydCBmb3IgZ2V0dGluZyBzcGVjaWZpYyBzZXR0aW5ncyBieSBrZXlcbiAgICBjb25zdCBzZXR0aW5nc0l0ZW1SZXNvdXJjZSA9IHNldHRpbmdzUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3trZXl9Jyk7XG4gICAgc2V0dGluZ3NJdGVtUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihzZXR0aW5nc0dldCkpO1xuXG4gICAgLy8gU3RhdGljIFdlYnNpdGUgUm91dGVzIC0gc2VydmUgaG9tZXBhZ2UgYW5kIGFzc2V0c1xuICAgIC8vIFJvb3QgcGF0aCBmb3IgaG9tZXBhZ2VcbiAgICB0aGlzLmFwaUdhdGV3YXkucm9vdC5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHN0YXRpY1dlYnNpdGUpKTtcblxuICAgIC8vIERhc2hib2FyZCBSb3V0ZXNcbiAgICBjb25zdCBhZG1pbkRhc2hib2FyZFJlc291cmNlID0gdGhpcy5hcGlHYXRld2F5LnJvb3QuYWRkUmVzb3VyY2UoJ2FkbWluLmh0bWwnKTtcbiAgICBhZG1pbkRhc2hib2FyZFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYWRtaW5EYXNoYm9hcmRQYWdlKSwge1xuICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwaWdhdGV3YXkuQXV0aG9yaXphdGlvblR5cGUuTk9ORVxuICAgIH0pO1xuXG4gICAgY29uc3QgdXNlckRhc2hib2FyZFJlc291cmNlID0gdGhpcy5hcGlHYXRld2F5LnJvb3QuYWRkUmVzb3VyY2UoJ3VzZXIuaHRtbCcpO1xuICAgIHVzZXJEYXNoYm9hcmRSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHVzZXJEYXNoYm9hcmRQYWdlKSwge1xuICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwaWdhdGV3YXkuQXV0aG9yaXphdGlvblR5cGUuTk9ORVxuICAgIH0pO1xuICAgIFxuICAgIC8vIFN0YXRpYyBmaWxlcyByb3V0ZSB3aXRoIHByb3h5IGludGVncmF0aW9uXG4gICAgY29uc3Qgc3RhdGljUmVzb3VyY2UgPSB0aGlzLmFwaUdhdGV3YXkucm9vdC5hZGRSZXNvdXJjZSgnc3RhdGljJyk7XG4gICAgY29uc3Qgc3RhdGljUHJveHkgPSBzdGF0aWNSZXNvdXJjZS5hZGRSZXNvdXJjZSgne3Byb3h5K30nKTtcbiAgICBzdGF0aWNQcm94eS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHN0YXRpY0ZpbGVzLCB7XG4gICAgICBwcm94eTogdHJ1ZSxcbiAgICAgIHJlcXVlc3RQYXJhbWV0ZXJzOiB7XG4gICAgICAgICdpbnRlZ3JhdGlvbi5yZXF1ZXN0LnBhdGgucHJveHknOiAnbWV0aG9kLnJlcXVlc3QucGF0aC5wcm94eSdcbiAgICAgIH0sXG4gICAgICByZXF1ZXN0VGVtcGxhdGVzOiB7XG4gICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIHBhdGg6ICckY29udGV4dC5wYXRoJyxcbiAgICAgICAgICBodHRwTWV0aG9kOiAnJGNvbnRleHQuaHR0cE1ldGhvZCcsXG4gICAgICAgICAgaGVhZGVyczogJyRpbnB1dC5wYXJhbXMoKS5oZWFkZXInLFxuICAgICAgICAgIHF1ZXJ5U3RyaW5nUGFyYW1ldGVyczogJyRpbnB1dC5wYXJhbXMoKS5xdWVyeXN0cmluZycsXG4gICAgICAgICAgcGF0aFBhcmFtZXRlcnM6ICckaW5wdXQucGFyYW1zKCkucGF0aCcsXG4gICAgICAgICAgYm9keTogJyRpbnB1dC5ib2R5J1xuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0pLCB7XG4gICAgICByZXF1ZXN0UGFyYW1ldGVyczoge1xuICAgICAgICAnbWV0aG9kLnJlcXVlc3QucGF0aC5wcm94eSc6IHRydWUsXG4gICAgICAgICdtZXRob2QucmVxdWVzdC5oZWFkZXIuQWNjZXB0JzogdHJ1ZSxcbiAgICAgICAgJ21ldGhvZC5yZXF1ZXN0LmhlYWRlci5Db250ZW50LVR5cGUnOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG5cblxuICAgIC8vIFRhZ3NcbiAgICBjZGsuVGFncy5vZih0aGlzLmFwaUdhdGV3YXkpLmFkZCgnU2VydmljZScsICdHYWJpWW9nYUxhbWJkYScpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMuYXBpR2F0ZXdheSkuYWRkKCdFbnZpcm9ubWVudCcsIHN0YWdlKTtcbiAgICBjZGsuVGFncy5vZih0aGlzLmFzc2V0c0J1Y2tldCkuYWRkKCdTZXJ2aWNlJywgJ0dhYmlZb2dhTGFtYmRhJyk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcy5hc3NldHNCdWNrZXQpLmFkZCgnRW52aXJvbm1lbnQnLCBzdGFnZSk7XG5cbiAgICAvLyBPdXRwdXRzXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Fzc2V0c0J1Y2tldE5hbWUnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5hc3NldHNCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQXNzZXRzIGJ1Y2tldCBuYW1lJyxcbiAgICAgIGV4cG9ydE5hbWU6IGAke3Jlc291cmNlUHJlZml4fS1Bc3NldHNCdWNrZXROYW1lYCxcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlTGFtYmRhRnVuY3Rpb24oXG4gICAgaWQ6IHN0cmluZywgXG4gICAgaGFuZGxlclBhdGg6IHN0cmluZywgXG4gICAgY29tbW9uUHJvcHM6IGFueVxuICApOiBsYW1iZGEuRnVuY3Rpb24ge1xuICAgIGNvbnN0IGZ1bmMgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsIGlkLCB7XG4gICAgICAuLi5jb21tb25Qcm9wcyxcbiAgICAgIGZ1bmN0aW9uTmFtZTogYCR7Y29tbW9uUHJvcHMuZW52aXJvbm1lbnQuU1RBR0UgPT09ICdwcm9kJyA/ICdHYWJpWW9nYS1wcm9kJyA6ICdHYWJpWW9nYS1kZXYnfS0ke2lkfWAsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2xhbWJkYScsIHtcbiAgICAgICAgZXhjbHVkZTogWycuZ2l0JywgJyoubWQnLCAndGVzdHMnLCAnX190ZXN0c19fJ10sXG4gICAgICB9KSxcbiAgICAgIGhhbmRsZXI6IGhhbmRsZXJQYXRoLnJlcGxhY2UoJy5qcycsICcuaGFuZGxlcicpLFxuICAgIH0pO1xuXG4gICAgdGhpcy5sYW1iZGFGdW5jdGlvbnMucHVzaChmdW5jKTtcbiAgICBcbiAgICAvLyBBZGQgdGFnc1xuICAgIGNkay5UYWdzLm9mKGZ1bmMpLmFkZCgnU2VydmljZScsICdHYWJpWW9nYUxhbWJkYScpO1xuICAgIGNkay5UYWdzLm9mKGZ1bmMpLmFkZCgnRW52aXJvbm1lbnQnLCBjb21tb25Qcm9wcy5lbnZpcm9ubWVudC5TVEFHRSk7XG4gICAgY2RrLlRhZ3Mub2YoZnVuYykuYWRkKCdGdW5jdGlvbicsIGlkKTtcblxuICAgIHJldHVybiBmdW5jO1xuICB9XG59XG4iXX0=