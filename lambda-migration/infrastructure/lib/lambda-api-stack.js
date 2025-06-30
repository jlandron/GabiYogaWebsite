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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFtYmRhLWFwaS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImxhbWJkYS1hcGktc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsK0RBQWlEO0FBQ2pELHVFQUF5RDtBQUd6RCx1REFBeUM7QUFtQnpDLE1BQWEsY0FBZSxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBSzNDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBMEI7UUFDbEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFKVixvQkFBZSxHQUFzQixFQUFFLENBQUM7UUFNdEQsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLEtBQUssQ0FBQztRQUN4QixNQUFNLGNBQWMsR0FBRyxZQUFZLEtBQUssRUFBRSxDQUFDO1FBRTNDLHVCQUF1QjtRQUN2QixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ3RELFVBQVUsRUFBRSxhQUFhLEtBQUssV0FBVyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ3RELGdCQUFnQixFQUFFLEtBQUs7WUFDdkIsaUJBQWlCLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFNBQVM7WUFDakQsSUFBSSxFQUFFO2dCQUNKO29CQUNFLGNBQWMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDO29CQUM3RSxjQUFjLEVBQUUsS0FBSyxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztvQkFDekYsY0FBYyxFQUFFLENBQUMsR0FBRyxDQUFD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Q0EwUEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSc7XG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xuaW1wb3J0ICogYXMgc2VjcmV0c21hbmFnZXIgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyJztcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGludGVyZmFjZSBMYW1iZGFBcGlTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICBzdGFnZTogc3RyaW5nO1xuICB1c2Vyc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgYmxvZ1Bvc3RzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICBjbGFzc2VzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICBib29raW5nc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgcmV0cmVhdHNUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIHdvcmtzaG9wc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgZ2FsbGVyeVRhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgc2V0dGluZ3NUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIGNvbW11bmljYXRpb25zVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICBqd3RCbGFja2xpc3RUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIGp3dFNlY3JldDogc2VjcmV0c21hbmFnZXIuU2VjcmV0O1xuICBzdHJpcGVTZWNyZXQ6IHNlY3JldHNtYW5hZ2VyLlNlY3JldDtcbn1cblxuZXhwb3J0IGNsYXNzIExhbWJkYUFwaVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IGFwaUdhdGV3YXk6IGFwaWdhdGV3YXkuUmVzdEFwaTtcbiAgcHVibGljIHJlYWRvbmx5IGxhbWJkYUZ1bmN0aW9uczogbGFtYmRhLkZ1bmN0aW9uW10gPSBbXTtcbiAgcHVibGljIHJlYWRvbmx5IGFzc2V0c0J1Y2tldDogczMuQnVja2V0O1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBMYW1iZGFBcGlTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCB7IHN0YWdlIH0gPSBwcm9wcztcbiAgICBjb25zdCByZXNvdXJjZVByZWZpeCA9IGBHYWJpWW9nYS0ke3N0YWdlfWA7XG5cbiAgICAvLyBTMyBCdWNrZXQgZm9yIGFzc2V0c1xuICAgIHRoaXMuYXNzZXRzQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnQXNzZXRzQnVja2V0Jywge1xuICAgICAgYnVja2V0TmFtZTogYGdhYmkteW9nYS0ke3N0YWdlfS1hc3NldHMtJHt0aGlzLnJlZ2lvbn1gLFxuICAgICAgcHVibGljUmVhZEFjY2VzczogZmFsc2UsXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgY29yczogW1xuICAgICAgICB7XG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IFtzMy5IdHRwTWV0aG9kcy5HRVQsIHMzLkh0dHBNZXRob2RzLlBPU1QsIHMzLkh0dHBNZXRob2RzLlBVVF0sXG4gICAgICAgICAgYWxsb3dlZE9yaWdpbnM6IHN0YWdlID09PSAncHJvZCcgPyBbJ2h0dHBzOi8vZ2FiaS55b2dhJywgJ2h0dHBzOi8vd3d3LmdhYmkueW9nYSddIDogWycqJ10sXG4gICAgICAgICAgYWxsb3dlZEhlYWRlcnM6IFsnKiddLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIGxpZmVjeWNsZVJ1bGVzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ0RlbGV0ZUluY29tcGxldGVNdWx0aXBhcnRVcGxvYWRzJyxcbiAgICAgICAgICBhYm9ydEluY29tcGxldGVNdWx0aXBhcnRVcGxvYWRBZnRlcjogY2RrLkR1cmF0aW9uLmRheXMoMSksXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgcmVtb3ZhbFBvbGljeTogc3RhZ2UgPT09ICdwcm9kJyA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICAvLyBDb21tb24gTGFtYmRhIGVudmlyb25tZW50IHZhcmlhYmxlc1xuICAgIGNvbnN0IGNvbW1vbkVudmlyb25tZW50ID0ge1xuICAgICAgU1RBR0U6IHN0YWdlLFxuICAgICAgUkVHSU9OOiB0aGlzLnJlZ2lvbixcbiAgICAgIFVTRVJTX1RBQkxFOiBwcm9wcy51c2Vyc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIEJMT0dfUE9TVFNfVEFCTEU6IHByb3BzLmJsb2dQb3N0c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIENMQVNTRVNfVEFCTEU6IHByb3BzLmNsYXNzZXNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBCT09LSU5HU19UQUJMRTogcHJvcHMuYm9va2luZ3NUYWJsZS50YWJsZU5hbWUsXG4gICAgICBSRVRSRUFUU19UQUJMRTogcHJvcHMucmV0cmVhdHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBXT1JLU0hPUFNfVEFCTEU6IHByb3BzLndvcmtzaG9wc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIEdBTExFUllfVEFCTEU6IHByb3BzLmdhbGxlcnlUYWJsZS50YWJsZU5hbWUsXG4gICAgICBTRVRUSU5HU19UQUJMRTogcHJvcHMuc2V0dGluZ3NUYWJsZS50YWJsZU5hbWUsXG4gICAgICBDT01NVU5JQ0FUSU9OU19UQUJMRTogcHJvcHMuY29tbXVuaWNhdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBKV1RfQkxBQ0tMSVNUX1RBQkxFOiBwcm9wcy5qd3RCbGFja2xpc3RUYWJsZS50YWJsZU5hbWUsXG4gICAgICBKV1RfU0VDUkVUX05BTUU6IHByb3BzLmp3dFNlY3JldC5zZWNyZXROYW1lLFxuICAgICAgU1RSSVBFX1NFQ1JFVF9OQU1FOiBwcm9wcy5zdHJpcGVTZWNyZXQuc2VjcmV0TmFtZSxcbiAgICAgIEFTU0VUU19CVUNLRVQ6IHRoaXMuYXNzZXRzQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICBDT1JTX09SSUdJTjogc3RhZ2UgPT09ICdwcm9kJyA/ICdodHRwczovL2dhYmkueW9nYSxodHRwczovL3d3dy5nYWJpLnlvZ2EnIDogJyonLFxuICAgIH07XG5cbiAgICAvLyBDb21tb24gTGFtYmRhIHByb3BlcnRpZXNcbiAgICBjb25zdCBjb21tb25MYW1iZGFQcm9wcyA9IHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xNl9YLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxuICAgICAgZW52aXJvbm1lbnQ6IGNvbW1vbkVudmlyb25tZW50LFxuICAgICAgdHJhY2luZzogbGFtYmRhLlRyYWNpbmcuQUNUSVZFLFxuICAgICAgYXJjaGl0ZWN0dXJlOiBsYW1iZGEuQXJjaGl0ZWN0dXJlLkFSTV82NCwgLy8gQmV0dGVyIHByaWNlL3BlcmZvcm1hbmNlXG4gICAgfTtcblxuICAgIC8vIEF1dGhlbnRpY2F0aW9uIExhbWJkYSBGdW5jdGlvbnNcbiAgICBjb25zdCBhdXRoTG9naW4gPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdBdXRoTG9naW4nLCAnYXV0aC9sb2dpbi5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcbiAgICBjb25zdCBhdXRoUmVnaXN0ZXIgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdBdXRoUmVnaXN0ZXInLCAnYXV0aC9yZWdpc3Rlci5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcbiAgICBjb25zdCBhdXRoUmVmcmVzaCA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0F1dGhSZWZyZXNoJywgJ2F1dGgvcmVmcmVzaC5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcbiAgICBjb25zdCBhdXRoTG9nb3V0ID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignQXV0aExvZ291dCcsICdhdXRoL2xvZ291dC5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcbiAgICBjb25zdCBhdXRoRm9yZ290ID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignQXV0aEZvcmdvdCcsICdhdXRoL2ZvcmdvdC5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcbiAgICBjb25zdCBhdXRoVmVyaWZ5ID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignQXV0aFZlcmlmeScsICdhdXRoL3ZlcmlmeS5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcblxuICAgIC8vIEJsb2cgTGFtYmRhIEZ1bmN0aW9uc1xuICAgIGNvbnN0IGJsb2dMaXN0ID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignQmxvZ0xpc3QnLCAnYmxvZy9saXN0LmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGJsb2dHZXQgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdCbG9nR2V0JywgJ2Jsb2cvZ2V0LmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGJsb2dDcmVhdGUgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdCbG9nQ3JlYXRlJywgJ2Jsb2cvY3JlYXRlLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGJsb2dVcGRhdGUgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdCbG9nVXBkYXRlJywgJ2Jsb2cvdXBkYXRlLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGJsb2dEZWxldGUgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdCbG9nRGVsZXRlJywgJ2Jsb2cvZGVsZXRlLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGJsb2dQdWJsaXNoID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignQmxvZ1B1Ymxpc2gnLCAnYmxvZy9wdWJsaXNoLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuXG4gICAgLy8gQWRtaW4gTGFtYmRhIEZ1bmN0aW9uc1xuICAgIGNvbnN0IGFkbWluRGFzaGJvYXJkID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignQWRtaW5EYXNoYm9hcmQnLCAnYWRtaW4vZGFzaGJvYXJkLmpzJywge1xuICAgICAgLi4uY29tbW9uTGFtYmRhUHJvcHMsXG4gICAgICBtZW1vcnlTaXplOiA1MTIsIC8vIE1vcmUgbWVtb3J5IGZvciBkYXNoYm9hcmQgYWdncmVnYXRpb25zXG4gICAgfSk7XG4gICAgY29uc3QgYWRtaW5Vc2VycyA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0FkbWluVXNlcnMnLCAnYWRtaW4vdXNlcnMuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG4gICAgY29uc3QgYWRtaW5TZXR0aW5ncyA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0FkbWluU2V0dGluZ3MnLCAnYWRtaW4vc2V0dGluZ3MuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG5cbiAgICAvLyBHYWxsZXJ5IExhbWJkYSBGdW5jdGlvbnNcbiAgICBjb25zdCBnYWxsZXJ5TGlzdCA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0dhbGxlcnlMaXN0JywgJ2dhbGxlcnkvbGlzdC5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcbiAgICBjb25zdCBnYWxsZXJ5VXBsb2FkID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignR2FsbGVyeVVwbG9hZCcsICdnYWxsZXJ5L3VwbG9hZC5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcbiAgICBjb25zdCBnYWxsZXJ5U2F2ZSA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0dhbGxlcnlTYXZlJywgJ2dhbGxlcnkvc2F2ZS5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcbiAgICBjb25zdCBnYWxsZXJ5RGVsZXRlID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignR2FsbGVyeURlbGV0ZScsICdnYWxsZXJ5L2RlbGV0ZS5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcblxuICAgIC8vIEJvb2tpbmcgTGFtYmRhIEZ1bmN0aW9uc1xuICAgIGNvbnN0IGJvb2tpbmdDbGFzc2VzID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignQm9va2luZ0NsYXNzZXMnLCAnYm9va2luZy9jbGFzc2VzLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGJvb2tpbmdCb29rID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignQm9va2luZ0Jvb2snLCAnYm9va2luZy9ib29rLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGJvb2tpbmdMaXN0ID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignQm9va2luZ0xpc3QnLCAnYm9va2luZy9saXN0LWJvb2tpbmdzLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuXG4gICAgLy8gUGF5bWVudCBMYW1iZGEgRnVuY3Rpb25zXG4gICAgY29uc3QgcGF5bWVudEludGVudCA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ1BheW1lbnRJbnRlbnQnLCAncGF5bWVudC9pbnRlbnQuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG4gICAgY29uc3QgcGF5bWVudFdlYmhvb2sgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdQYXltZW50V2ViaG9vaycsICdwYXltZW50L3dlYmhvb2suanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG5cbiAgICAvLyBTdGF0aWMgV2Vic2l0ZSBMYW1iZGEgRnVuY3Rpb25cbiAgICBjb25zdCBzdGF0aWNXZWJzaXRlID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignU3RhdGljV2Vic2l0ZScsICdzdGF0aWMvd2Vic2l0ZS5qcycsIHtcbiAgICAgIC4uLmNvbW1vbkxhbWJkYVByb3BzLFxuICAgICAgbWVtb3J5U2l6ZTogNTEyLCAvLyBNb3JlIG1lbW9yeSBmb3IgZmlsZSBzZXJ2aW5nXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygxMCksIC8vIFNob3J0ZXIgdGltZW91dCBmb3Igc3RhdGljIGNvbnRlbnRcbiAgICB9KTtcblxuICAgIC8vIEdyYW50IHBlcm1pc3Npb25zIHRvIGFsbCBMYW1iZGEgZnVuY3Rpb25zXG4gICAgdGhpcy5sYW1iZGFGdW5jdGlvbnMuZm9yRWFjaChmdW5jID0+IHtcbiAgICAgIC8vIEdyYW50IER5bmFtb0RCIHBlcm1pc3Npb25zXG4gICAgICBwcm9wcy51c2Vyc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShmdW5jKTtcbiAgICAgIHByb3BzLmJsb2dQb3N0c1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShmdW5jKTtcbiAgICAgIHByb3BzLmNsYXNzZXNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZnVuYyk7XG4gICAgICBwcm9wcy5ib29raW5nc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShmdW5jKTtcbiAgICAgIHByb3BzLnJldHJlYXRzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGZ1bmMpO1xuICAgICAgcHJvcHMud29ya3Nob3BzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGZ1bmMpO1xuICAgICAgcHJvcHMuZ2FsbGVyeVRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShmdW5jKTtcbiAgICAgIHByb3BzLnNldHRpbmdzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGZ1bmMpO1xuICAgICAgcHJvcHMuY29tbXVuaWNhdGlvbnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZnVuYyk7XG4gICAgICBwcm9wcy5qd3RCbGFja2xpc3RUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZnVuYyk7XG5cbiAgICAgIC8vIEdyYW50IFNlY3JldHMgTWFuYWdlciBwZXJtaXNzaW9uc1xuICAgICAgcHJvcHMuand0U2VjcmV0LmdyYW50UmVhZChmdW5jKTtcbiAgICAgIHByb3BzLnN0cmlwZVNlY3JldC5ncmFudFJlYWQoZnVuYyk7XG5cbiAgICAgIC8vIEdyYW50IFMzIHBlcm1pc3Npb25zXG4gICAgICB0aGlzLmFzc2V0c0J1Y2tldC5ncmFudFJlYWRXcml0ZShmdW5jKTtcbiAgICB9KTtcblxuICAgIC8vIEFQSSBHYXRld2F5XG4gICAgdGhpcy5hcGlHYXRld2F5ID0gbmV3IGFwaWdhdGV3YXkuUmVzdEFwaSh0aGlzLCAnQXBpR2F0ZXdheScsIHtcbiAgICAgIHJlc3RBcGlOYW1lOiByZXNvdXJjZVByZWZpeCxcbiAgICAgIGRlc2NyaXB0aW9uOiBgR2FiaSBZb2dhIExhbWJkYSBBUEkgR2F0ZXdheSAoJHtzdGFnZX0pYCxcbiAgICAgIGRlZmF1bHRDb3JzUHJlZmxpZ2h0T3B0aW9uczoge1xuICAgICAgICBhbGxvd09yaWdpbnM6IHN0YWdlID09PSAncHJvZCcgPyBbJ2h0dHBzOi8vZ2FiaS55b2dhJywgJ2h0dHBzOi8vd3d3LmdhYmkueW9nYSddIDogYXBpZ2F0ZXdheS5Db3JzLkFMTF9PUklHSU5TLFxuICAgICAgICBhbGxvd01ldGhvZHM6IGFwaWdhdGV3YXkuQ29ycy5BTExfTUVUSE9EUyxcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbJ0NvbnRlbnQtVHlwZScsICdBdXRob3JpemF0aW9uJywgJ1gtQW16LURhdGUnLCAnWC1BcGktS2V5JywgJ1gtQW16LVNlY3VyaXR5LVRva2VuJ10sXG4gICAgICAgIGFsbG93Q3JlZGVudGlhbHM6IGZhbHNlLFxuICAgICAgfSxcbiAgICAgIGRlcGxveU9wdGlvbnM6IHtcbiAgICAgICAgc3RhZ2VOYW1lOiBzdGFnZSxcbiAgICAgICAgdHJhY2luZ0VuYWJsZWQ6IHRydWUsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gQVBJIEdhdGV3YXkgUmVzb3VyY2VzIGFuZCBNZXRob2RzXG4gICAgY29uc3QgYXV0aFJlc291cmNlID0gdGhpcy5hcGlHYXRld2F5LnJvb3QuYWRkUmVzb3VyY2UoJ2F1dGgnKTtcbiAgICBhdXRoUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYXV0aExvZ2luKSwgeyBcbiAgICAgIHJlcXVlc3RQYXJhbWV0ZXJzOiB7ICdtZXRob2QucmVxdWVzdC5oZWFkZXIuQ29udGVudC1UeXBlJzogdHJ1ZSB9IFxuICAgIH0pO1xuICAgIGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgncmVnaXN0ZXInKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhdXRoUmVnaXN0ZXIpKTtcbiAgICBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3JlZnJlc2gnKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhdXRoUmVmcmVzaCkpO1xuICAgIGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgnbG9nb3V0JykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYXV0aExvZ291dCkpO1xuICAgIGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgnZm9yZ290JykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYXV0aEZvcmdvdCkpO1xuICAgIGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgndmVyaWZ5JykuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhdXRoVmVyaWZ5KSk7XG5cbiAgICBjb25zdCBibG9nUmVzb3VyY2UgPSB0aGlzLmFwaUdhdGV3YXkucm9vdC5hZGRSZXNvdXJjZSgnYmxvZycpO1xuICAgIGJsb2dSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGJsb2dMaXN0KSk7XG4gICAgYmxvZ1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGJsb2dDcmVhdGUpKTtcbiAgICBjb25zdCBibG9nSXRlbVJlc291cmNlID0gYmxvZ1Jlc291cmNlLmFkZFJlc291cmNlKCd7aWR9Jyk7XG4gICAgYmxvZ0l0ZW1SZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGJsb2dHZXQpKTtcbiAgICBibG9nSXRlbVJlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYmxvZ1VwZGF0ZSkpO1xuICAgIGJsb2dJdGVtUmVzb3VyY2UuYWRkTWV0aG9kKCdERUxFVEUnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihibG9nRGVsZXRlKSk7XG4gICAgYmxvZ0l0ZW1SZXNvdXJjZS5hZGRSZXNvdXJjZSgncHVibGlzaCcpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGJsb2dQdWJsaXNoKSk7XG5cbiAgICBjb25zdCBhZG1pblJlc291cmNlID0gdGhpcy5hcGlHYXRld2F5LnJvb3QuYWRkUmVzb3VyY2UoJ2FkbWluJyk7XG4gICAgYWRtaW5SZXNvdXJjZS5hZGRSZXNvdXJjZSgnZGFzaGJvYXJkJykuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhZG1pbkRhc2hib2FyZCkpO1xuICAgIGFkbWluUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3VzZXJzJykuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhZG1pblVzZXJzKSk7XG4gICAgYWRtaW5SZXNvdXJjZS5hZGRSZXNvdXJjZSgnc2V0dGluZ3MnKS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGFkbWluU2V0dGluZ3MpKTtcblxuICAgIGNvbnN0IGdhbGxlcnlSZXNvdXJjZSA9IHRoaXMuYXBpR2F0ZXdheS5yb290LmFkZFJlc291cmNlKCdnYWxsZXJ5Jyk7XG4gICAgZ2FsbGVyeVJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ2FsbGVyeUxpc3QpKTtcbiAgICBnYWxsZXJ5UmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ2FsbGVyeVNhdmUpKTtcbiAgICBnYWxsZXJ5UmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3VwbG9hZCcpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGdhbGxlcnlVcGxvYWQpKTtcbiAgICBnYWxsZXJ5UmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3tpZH0nKS5hZGRNZXRob2QoJ0RFTEVURScsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGdhbGxlcnlEZWxldGUpKTtcblxuICAgIGNvbnN0IGNsYXNzZXNSZXNvdXJjZSA9IHRoaXMuYXBpR2F0ZXdheS5yb290LmFkZFJlc291cmNlKCdjbGFzc2VzJyk7XG4gICAgY2xhc3Nlc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYm9va2luZ0NsYXNzZXMpKTtcbiAgICBjbGFzc2VzUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3tpZH0nKS5hZGRSZXNvdXJjZSgnYm9vaycpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGJvb2tpbmdCb29rKSk7XG5cbiAgICBjb25zdCBib29raW5nc1Jlc291cmNlID0gdGhpcy5hcGlHYXRld2F5LnJvb3QuYWRkUmVzb3VyY2UoJ2Jvb2tpbmdzJyk7XG4gICAgYm9va2luZ3NSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGJvb2tpbmdMaXN0KSk7XG5cbiAgICBjb25zdCBwYXltZW50UmVzb3VyY2UgPSB0aGlzLmFwaUdhdGV3YXkucm9vdC5hZGRSZXNvdXJjZSgncGF5bWVudCcpO1xuICAgIHBheW1lbnRSZXNvdXJjZS5hZGRSZXNvdXJjZSgnaW50ZW50JykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocGF5bWVudEludGVudCkpO1xuICAgIHBheW1lbnRSZXNvdXJjZS5hZGRSZXNvdXJjZSgnd2ViaG9vaycpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHBheW1lbnRXZWJob29rKSk7XG5cbiAgICAvLyBTdGF0aWMgV2Vic2l0ZSBSb3V0ZXMgLSBzZXJ2ZSBob21lcGFnZSBhbmQgYXNzZXRzXG4gICAgLy8gUm9vdCBwYXRoIGZvciBob21lcGFnZVxuICAgIHRoaXMuYXBpR2F0ZXdheS5yb290LmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oc3RhdGljV2Vic2l0ZSkpO1xuICAgIFxuICAgIC8vIFN0YXRpYyBhc3NldCByb3V0ZXMgd2l0aCBwcm94eSBpbnRlZ3JhdGlvblxuICAgIGNvbnN0IGFzc2V0c1Byb3h5ID0gdGhpcy5hcGlHYXRld2F5LnJvb3QuYWRkUmVzb3VyY2UoJ3twcm94eSt9Jyk7XG4gICAgYXNzZXRzUHJveHkuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihzdGF0aWNXZWJzaXRlLCB7XG4gICAgICBwcm94eTogdHJ1ZSxcbiAgICAgIHJlcXVlc3RUZW1wbGF0ZXM6IHtcbiAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgcGF0aDogJyRjb250ZXh0LnBhdGgnLFxuICAgICAgICAgIGh0dHBNZXRob2Q6ICckY29udGV4dC5odHRwTWV0aG9kJyxcbiAgICAgICAgICBoZWFkZXJzOiAnJGlucHV0LnBhcmFtcygpLmhlYWRlcicsXG4gICAgICAgICAgcXVlcnlTdHJpbmdQYXJhbWV0ZXJzOiAnJGlucHV0LnBhcmFtcygpLnF1ZXJ5c3RyaW5nJyxcbiAgICAgICAgICBwYXRoUGFyYW1ldGVyczogJyRpbnB1dC5wYXJhbXMoKS5wYXRoJyxcbiAgICAgICAgICBib2R5OiAnJGlucHV0LmJvZHknXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfSksIHtcbiAgICAgIHJlcXVlc3RQYXJhbWV0ZXJzOiB7XG4gICAgICAgICdtZXRob2QucmVxdWVzdC5wYXRoLnByb3h5JzogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuXG5cbiAgICAvLyBUYWdzXG4gICAgY2RrLlRhZ3Mub2YodGhpcy5hcGlHYXRld2F5KS5hZGQoJ1NlcnZpY2UnLCAnR2FiaVlvZ2FMYW1iZGEnKTtcbiAgICBjZGsuVGFncy5vZih0aGlzLmFwaUdhdGV3YXkpLmFkZCgnRW52aXJvbm1lbnQnLCBzdGFnZSk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcy5hc3NldHNCdWNrZXQpLmFkZCgnU2VydmljZScsICdHYWJpWW9nYUxhbWJkYScpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMuYXNzZXRzQnVja2V0KS5hZGQoJ0Vudmlyb25tZW50Jywgc3RhZ2UpO1xuXG4gICAgLy8gT3V0cHV0c1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBc3NldHNCdWNrZXROYW1lJywge1xuICAgICAgdmFsdWU6IHRoaXMuYXNzZXRzQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0Fzc2V0cyBidWNrZXQgbmFtZScsXG4gICAgICBleHBvcnROYW1lOiBgJHtyZXNvdXJjZVByZWZpeH0tQXNzZXRzQnVja2V0TmFtZWAsXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxuICAgIGlkOiBzdHJpbmcsIFxuICAgIGhhbmRsZXJQYXRoOiBzdHJpbmcsIFxuICAgIGNvbW1vblByb3BzOiBhbnlcbiAgKTogbGFtYmRhLkZ1bmN0aW9uIHtcbiAgICBjb25zdCBmdW5jID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCBpZCwge1xuICAgICAgLi4uY29tbW9uUHJvcHMsXG4gICAgICBmdW5jdGlvbk5hbWU6IGAke2NvbW1vblByb3BzLmVudmlyb25tZW50LlNUQUdFID09PSAncHJvZCcgPyAnR2FiaVlvZ2EtcHJvZCcgOiAnR2FiaVlvZ2EtZGV2J30tJHtpZH1gLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9sYW1iZGEnLCB7XG4gICAgICAgIGV4Y2x1ZGU6IFsnbm9kZV9tb2R1bGVzJywgJy5naXQnLCAnKi5tZCcsICd0ZXN0cycsICdfX3Rlc3RzX18nXSxcbiAgICAgIH0pLFxuICAgICAgaGFuZGxlcjogaGFuZGxlclBhdGgucmVwbGFjZSgnLmpzJywgJy5oYW5kbGVyJyksXG4gICAgfSk7XG5cbiAgICB0aGlzLmxhbWJkYUZ1bmN0aW9ucy5wdXNoKGZ1bmMpO1xuICAgIFxuICAgIC8vIEFkZCB0YWdzXG4gICAgY2RrLlRhZ3Mub2YoZnVuYykuYWRkKCdTZXJ2aWNlJywgJ0dhYmlZb2dhTGFtYmRhJyk7XG4gICAgY2RrLlRhZ3Mub2YoZnVuYykuYWRkKCdFbnZpcm9ubWVudCcsIGNvbW1vblByb3BzLmVudmlyb25tZW50LlNUQUdFKTtcbiAgICBjZGsuVGFncy5vZihmdW5jKS5hZGQoJ0Z1bmN0aW9uJywgaWQpO1xuXG4gICAgcmV0dXJuIGZ1bmM7XG4gIH1cbn1cbiJdfQ==