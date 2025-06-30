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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFtYmRhLWFwaS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImxhbWJkYS1hcGktc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsK0RBQWlEO0FBQ2pELHVFQUF5RDtBQUd6RCx1REFBeUM7QUFtQnpDLE1BQWEsY0FBZSxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBSzNDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBMEI7UUFDbEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFKVixvQkFBZSxHQUFzQixFQUFFLENBQUM7UUFNdEQsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLEtBQUssQ0FBQztRQUN4QixNQUFNLGNBQWMsR0FBRyxZQUFZLEtBQUssRUFBRSxDQUFDO1FBRTNDLHVCQUF1QjtRQUN2QixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ3RELFVBQVUsRUFBRSxhQUFhLEtBQUssV0FBVyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ3RELGdCQUFnQixFQUFFLEtBQUs7WUFDdkIsaUJBQWlCLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFNBQVM7WUFDakQsSUFBSSxFQUFFO2dCQUNKO29CQUNFLGNBQWMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDO29CQUM3RSxjQUFjLEVBQUUsS0FBSyxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztvQkFDekYsY0FBYyxFQUFFLENBQUMsR0FBRyxDQUFD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Q0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRXRDLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztDQUNGO0FBMU5ELHdDQTBOQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBhcGlnYXRld2F5IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5JztcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XG5pbXBvcnQgKiBhcyBzZWNyZXRzbWFuYWdlciBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc2VjcmV0c21hbmFnZXInO1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIExhbWJkYUFwaVN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIHN0YWdlOiBzdHJpbmc7XG4gIHVzZXJzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICBibG9nUG9zdHNUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIGNsYXNzZXNUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIGJvb2tpbmdzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICByZXRyZWF0c1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgd29ya3Nob3BzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICBnYWxsZXJ5VGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICBzZXR0aW5nc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgY29tbXVuaWNhdGlvbnNUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIGp3dEJsYWNrbGlzdFRhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgand0U2VjcmV0OiBzZWNyZXRzbWFuYWdlci5TZWNyZXQ7XG4gIHN0cmlwZVNlY3JldDogc2VjcmV0c21hbmFnZXIuU2VjcmV0O1xufVxuXG5leHBvcnQgY2xhc3MgTGFtYmRhQXBpU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBwdWJsaWMgcmVhZG9ubHkgYXBpR2F0ZXdheTogYXBpZ2F0ZXdheS5SZXN0QXBpO1xuICBwdWJsaWMgcmVhZG9ubHkgbGFtYmRhRnVuY3Rpb25zOiBsYW1iZGEuRnVuY3Rpb25bXSA9IFtdO1xuICBwdWJsaWMgcmVhZG9ubHkgYXNzZXRzQnVja2V0OiBzMy5CdWNrZXQ7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IExhbWJkYUFwaVN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IHsgc3RhZ2UgfSA9IHByb3BzO1xuICAgIGNvbnN0IHJlc291cmNlUHJlZml4ID0gYEdhYmlZb2dhLSR7c3RhZ2V9YDtcblxuICAgIC8vIFMzIEJ1Y2tldCBmb3IgYXNzZXRzXG4gICAgdGhpcy5hc3NldHNCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdBc3NldHNCdWNrZXQnLCB7XG4gICAgICBidWNrZXROYW1lOiBgZ2FiaS15b2dhLSR7c3RhZ2V9LWFzc2V0cy0ke3RoaXMucmVnaW9ufWAsXG4gICAgICBwdWJsaWNSZWFkQWNjZXNzOiBmYWxzZSxcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgICBjb3JzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBhbGxvd2VkTWV0aG9kczogW3MzLkh0dHBNZXRob2RzLkdFVCwgczMuSHR0cE1ldGhvZHMuUE9TVCwgczMuSHR0cE1ldGhvZHMuUFVUXSxcbiAgICAgICAgICBhbGxvd2VkT3JpZ2luczogc3RhZ2UgPT09ICdwcm9kJyA/IFsnaHR0cHM6Ly9nYWJpLnlvZ2EnLCAnaHR0cHM6Ly93d3cuZ2FiaS55b2dhJ10gOiBbJyonXSxcbiAgICAgICAgICBhbGxvd2VkSGVhZGVyczogWycqJ10sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgbGlmZWN5Y2xlUnVsZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAnRGVsZXRlSW5jb21wbGV0ZU11bHRpcGFydFVwbG9hZHMnLFxuICAgICAgICAgIGFib3J0SW5jb21wbGV0ZU11bHRpcGFydFVwbG9hZEFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cygxKSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICByZW1vdmFsUG9saWN5OiBzdGFnZSA9PT0gJ3Byb2QnID8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOIDogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIC8vIENvbW1vbiBMYW1iZGEgZW52aXJvbm1lbnQgdmFyaWFibGVzXG4gICAgY29uc3QgY29tbW9uRW52aXJvbm1lbnQgPSB7XG4gICAgICBTVEFHRTogc3RhZ2UsXG4gICAgICBSRUdJT046IHRoaXMucmVnaW9uLFxuICAgICAgVVNFUlNfVEFCTEU6IHByb3BzLnVzZXJzVGFibGUudGFibGVOYW1lLFxuICAgICAgQkxPR19QT1NUU19UQUJMRTogcHJvcHMuYmxvZ1Bvc3RzVGFibGUudGFibGVOYW1lLFxuICAgICAgQ0xBU1NFU19UQUJMRTogcHJvcHMuY2xhc3Nlc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIEJPT0tJTkdTX1RBQkxFOiBwcm9wcy5ib29raW5nc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIFJFVFJFQVRTX1RBQkxFOiBwcm9wcy5yZXRyZWF0c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIFdPUktTSE9QU19UQUJMRTogcHJvcHMud29ya3Nob3BzVGFibGUudGFibGVOYW1lLFxuICAgICAgR0FMTEVSWV9UQUJMRTogcHJvcHMuZ2FsbGVyeVRhYmxlLnRhYmxlTmFtZSxcbiAgICAgIFNFVFRJTkdTX1RBQkxFOiBwcm9wcy5zZXR0aW5nc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIENPTU1VTklDQVRJT05TX1RBQkxFOiBwcm9wcy5jb21tdW5pY2F0aW9uc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIEpXVF9CTEFDS0xJU1RfVEFCTEU6IHByb3BzLmp3dEJsYWNrbGlzdFRhYmxlLnRhYmxlTmFtZSxcbiAgICAgIEpXVF9TRUNSRVRfTkFNRTogcHJvcHMuand0U2VjcmV0LnNlY3JldE5hbWUsXG4gICAgICBTVFJJUEVfU0VDUkVUX05BTUU6IHByb3BzLnN0cmlwZVNlY3JldC5zZWNyZXROYW1lLFxuICAgICAgQVNTRVRTX0JVQ0tFVDogdGhpcy5hc3NldHNCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgIENPUlNfT1JJR0lOOiBzdGFnZSA9PT0gJ3Byb2QnID8gJ2h0dHBzOi8vZ2FiaS55b2dhLGh0dHBzOi8vd3d3LmdhYmkueW9nYScgOiAnKicsXG4gICAgfTtcblxuICAgIC8vIENvbW1vbiBMYW1iZGEgcHJvcGVydGllc1xuICAgIGNvbnN0IGNvbW1vbkxhbWJkYVByb3BzID0ge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE2X1gsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXG4gICAgICBlbnZpcm9ubWVudDogY29tbW9uRW52aXJvbm1lbnQsXG4gICAgICB0cmFjaW5nOiBsYW1iZGEuVHJhY2luZy5BQ1RJVkUsXG4gICAgICBhcmNoaXRlY3R1cmU6IGxhbWJkYS5BcmNoaXRlY3R1cmUuQVJNXzY0LCAvLyBCZXR0ZXIgcHJpY2UvcGVyZm9ybWFuY2VcbiAgICB9O1xuXG4gICAgLy8gQXV0aGVudGljYXRpb24gTGFtYmRhIEZ1bmN0aW9uc1xuICAgIGNvbnN0IGF1dGhMb2dpbiA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0F1dGhMb2dpbicsICdhdXRoL2xvZ2luLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGF1dGhSZWdpc3RlciA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0F1dGhSZWdpc3RlcicsICdhdXRoL3JlZ2lzdGVyLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGF1dGhSZWZyZXNoID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignQXV0aFJlZnJlc2gnLCAnYXV0aC9yZWZyZXNoLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGF1dGhMb2dvdXQgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdBdXRoTG9nb3V0JywgJ2F1dGgvbG9nb3V0LmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGF1dGhGb3Jnb3QgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdBdXRoRm9yZ290JywgJ2F1dGgvZm9yZ290LmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGF1dGhWZXJpZnkgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdBdXRoVmVyaWZ5JywgJ2F1dGgvdmVyaWZ5LmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuXG4gICAgLy8gQmxvZyBMYW1iZGEgRnVuY3Rpb25zXG4gICAgY29uc3QgYmxvZ0xpc3QgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdCbG9nTGlzdCcsICdibG9nL2xpc3QuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG4gICAgY29uc3QgYmxvZ0dldCA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0Jsb2dHZXQnLCAnYmxvZy9nZXQuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG4gICAgY29uc3QgYmxvZ0NyZWF0ZSA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0Jsb2dDcmVhdGUnLCAnYmxvZy9jcmVhdGUuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG4gICAgY29uc3QgYmxvZ1VwZGF0ZSA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0Jsb2dVcGRhdGUnLCAnYmxvZy91cGRhdGUuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG4gICAgY29uc3QgYmxvZ0RlbGV0ZSA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ0Jsb2dEZWxldGUnLCAnYmxvZy9kZWxldGUuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG4gICAgY29uc3QgYmxvZ1B1Ymxpc2ggPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdCbG9nUHVibGlzaCcsICdibG9nL3B1Ymxpc2guanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG5cbiAgICAvLyBBZG1pbiBMYW1iZGEgRnVuY3Rpb25zXG4gICAgY29uc3QgYWRtaW5EYXNoYm9hcmQgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdBZG1pbkRhc2hib2FyZCcsICdhZG1pbi9kYXNoYm9hcmQuanMnLCB7XG4gICAgICAuLi5jb21tb25MYW1iZGFQcm9wcyxcbiAgICAgIG1lbW9yeVNpemU6IDUxMiwgLy8gTW9yZSBtZW1vcnkgZm9yIGRhc2hib2FyZCBhZ2dyZWdhdGlvbnNcbiAgICB9KTtcbiAgICBjb25zdCBhZG1pblVzZXJzID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignQWRtaW5Vc2VycycsICdhZG1pbi91c2Vycy5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcbiAgICBjb25zdCBhZG1pblNldHRpbmdzID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignQWRtaW5TZXR0aW5ncycsICdhZG1pbi9zZXR0aW5ncy5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcblxuICAgIC8vIEdhbGxlcnkgTGFtYmRhIEZ1bmN0aW9uc1xuICAgIGNvbnN0IGdhbGxlcnlMaXN0ID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignR2FsbGVyeUxpc3QnLCAnZ2FsbGVyeS9saXN0LmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGdhbGxlcnlVcGxvYWQgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdHYWxsZXJ5VXBsb2FkJywgJ2dhbGxlcnkvdXBsb2FkLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGdhbGxlcnlTYXZlID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignR2FsbGVyeVNhdmUnLCAnZ2FsbGVyeS9zYXZlLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuICAgIGNvbnN0IGdhbGxlcnlEZWxldGUgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdHYWxsZXJ5RGVsZXRlJywgJ2dhbGxlcnkvZGVsZXRlLmpzJywgY29tbW9uTGFtYmRhUHJvcHMpO1xuXG4gICAgLy8gQm9va2luZyBMYW1iZGEgRnVuY3Rpb25zXG4gICAgY29uc3QgYm9va2luZ0NsYXNzZXMgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdCb29raW5nQ2xhc3NlcycsICdib29raW5nL2NsYXNzZXMuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG4gICAgY29uc3QgYm9va2luZ0Jvb2sgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdCb29raW5nQm9vaycsICdib29raW5nL2Jvb2suanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG4gICAgY29uc3QgYm9va2luZ0xpc3QgPSB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9uKCdCb29raW5nTGlzdCcsICdib29raW5nL2xpc3QtYm9va2luZ3MuanMnLCBjb21tb25MYW1iZGFQcm9wcyk7XG5cbiAgICAvLyBQYXltZW50IExhbWJkYSBGdW5jdGlvbnNcbiAgICBjb25zdCBwYXltZW50SW50ZW50ID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbignUGF5bWVudEludGVudCcsICdwYXltZW50L2ludGVudC5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcbiAgICBjb25zdCBwYXltZW50V2ViaG9vayA9IHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb24oJ1BheW1lbnRXZWJob29rJywgJ3BheW1lbnQvd2ViaG9vay5qcycsIGNvbW1vbkxhbWJkYVByb3BzKTtcblxuICAgIC8vIEdyYW50IHBlcm1pc3Npb25zIHRvIGFsbCBMYW1iZGEgZnVuY3Rpb25zXG4gICAgdGhpcy5sYW1iZGFGdW5jdGlvbnMuZm9yRWFjaChmdW5jID0+IHtcbiAgICAgIC8vIEdyYW50IER5bmFtb0RCIHBlcm1pc3Npb25zXG4gICAgICBwcm9wcy51c2Vyc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShmdW5jKTtcbiAgICAgIHByb3BzLmJsb2dQb3N0c1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShmdW5jKTtcbiAgICAgIHByb3BzLmNsYXNzZXNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZnVuYyk7XG4gICAgICBwcm9wcy5ib29raW5nc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShmdW5jKTtcbiAgICAgIHByb3BzLnJldHJlYXRzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGZ1bmMpO1xuICAgICAgcHJvcHMud29ya3Nob3BzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGZ1bmMpO1xuICAgICAgcHJvcHMuZ2FsbGVyeVRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShmdW5jKTtcbiAgICAgIHByb3BzLnNldHRpbmdzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGZ1bmMpO1xuICAgICAgcHJvcHMuY29tbXVuaWNhdGlvbnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZnVuYyk7XG4gICAgICBwcm9wcy5qd3RCbGFja2xpc3RUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZnVuYyk7XG5cbiAgICAgIC8vIEdyYW50IFNlY3JldHMgTWFuYWdlciBwZXJtaXNzaW9uc1xuICAgICAgcHJvcHMuand0U2VjcmV0LmdyYW50UmVhZChmdW5jKTtcbiAgICAgIHByb3BzLnN0cmlwZVNlY3JldC5ncmFudFJlYWQoZnVuYyk7XG5cbiAgICAgIC8vIEdyYW50IFMzIHBlcm1pc3Npb25zXG4gICAgICB0aGlzLmFzc2V0c0J1Y2tldC5ncmFudFJlYWRXcml0ZShmdW5jKTtcbiAgICB9KTtcblxuICAgIC8vIEFQSSBHYXRld2F5XG4gICAgdGhpcy5hcGlHYXRld2F5ID0gbmV3IGFwaWdhdGV3YXkuUmVzdEFwaSh0aGlzLCAnQXBpR2F0ZXdheScsIHtcbiAgICAgIHJlc3RBcGlOYW1lOiByZXNvdXJjZVByZWZpeCxcbiAgICAgIGRlc2NyaXB0aW9uOiBgR2FiaSBZb2dhIExhbWJkYSBBUEkgR2F0ZXdheSAoJHtzdGFnZX0pYCxcbiAgICAgIGRlZmF1bHRDb3JzUHJlZmxpZ2h0T3B0aW9uczoge1xuICAgICAgICBhbGxvd09yaWdpbnM6IHN0YWdlID09PSAncHJvZCcgPyBbJ2h0dHBzOi8vZ2FiaS55b2dhJywgJ2h0dHBzOi8vd3d3LmdhYmkueW9nYSddIDogYXBpZ2F0ZXdheS5Db3JzLkFMTF9PUklHSU5TLFxuICAgICAgICBhbGxvd01ldGhvZHM6IGFwaWdhdGV3YXkuQ29ycy5BTExfTUVUSE9EUyxcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbJ0NvbnRlbnQtVHlwZScsICdBdXRob3JpemF0aW9uJywgJ1gtQW16LURhdGUnLCAnWC1BcGktS2V5JywgJ1gtQW16LVNlY3VyaXR5LVRva2VuJ10sXG4gICAgICAgIGFsbG93Q3JlZGVudGlhbHM6IGZhbHNlLFxuICAgICAgfSxcbiAgICAgIGRlcGxveU9wdGlvbnM6IHtcbiAgICAgICAgc3RhZ2VOYW1lOiBzdGFnZSxcbiAgICAgICAgdHJhY2luZ0VuYWJsZWQ6IHRydWUsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gQVBJIEdhdGV3YXkgUmVzb3VyY2VzIGFuZCBNZXRob2RzXG4gICAgY29uc3QgYXV0aFJlc291cmNlID0gdGhpcy5hcGlHYXRld2F5LnJvb3QuYWRkUmVzb3VyY2UoJ2F1dGgnKTtcbiAgICBhdXRoUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYXV0aExvZ2luKSwgeyBcbiAgICAgIHJlcXVlc3RQYXJhbWV0ZXJzOiB7ICdtZXRob2QucmVxdWVzdC5oZWFkZXIuQ29udGVudC1UeXBlJzogdHJ1ZSB9IFxuICAgIH0pO1xuICAgIGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgncmVnaXN0ZXInKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhdXRoUmVnaXN0ZXIpKTtcbiAgICBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3JlZnJlc2gnKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhdXRoUmVmcmVzaCkpO1xuICAgIGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgnbG9nb3V0JykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYXV0aExvZ291dCkpO1xuICAgIGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgnZm9yZ290JykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYXV0aEZvcmdvdCkpO1xuICAgIGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgndmVyaWZ5JykuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhdXRoVmVyaWZ5KSk7XG5cbiAgICBjb25zdCBibG9nUmVzb3VyY2UgPSB0aGlzLmFwaUdhdGV3YXkucm9vdC5hZGRSZXNvdXJjZSgnYmxvZycpO1xuICAgIGJsb2dSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGJsb2dMaXN0KSk7XG4gICAgYmxvZ1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGJsb2dDcmVhdGUpKTtcbiAgICBjb25zdCBibG9nSXRlbVJlc291cmNlID0gYmxvZ1Jlc291cmNlLmFkZFJlc291cmNlKCd7aWR9Jyk7XG4gICAgYmxvZ0l0ZW1SZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGJsb2dHZXQpKTtcbiAgICBibG9nSXRlbVJlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYmxvZ1VwZGF0ZSkpO1xuICAgIGJsb2dJdGVtUmVzb3VyY2UuYWRkTWV0aG9kKCdERUxFVEUnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihibG9nRGVsZXRlKSk7XG4gICAgYmxvZ0l0ZW1SZXNvdXJjZS5hZGRSZXNvdXJjZSgncHVibGlzaCcpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGJsb2dQdWJsaXNoKSk7XG5cbiAgICBjb25zdCBhZG1pblJlc291cmNlID0gdGhpcy5hcGlHYXRld2F5LnJvb3QuYWRkUmVzb3VyY2UoJ2FkbWluJyk7XG4gICAgYWRtaW5SZXNvdXJjZS5hZGRSZXNvdXJjZSgnZGFzaGJvYXJkJykuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhZG1pbkRhc2hib2FyZCkpO1xuICAgIGFkbWluUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3VzZXJzJykuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhZG1pblVzZXJzKSk7XG4gICAgYWRtaW5SZXNvdXJjZS5hZGRSZXNvdXJjZSgnc2V0dGluZ3MnKS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGFkbWluU2V0dGluZ3MpKTtcblxuICAgIGNvbnN0IGdhbGxlcnlSZXNvdXJjZSA9IHRoaXMuYXBpR2F0ZXdheS5yb290LmFkZFJlc291cmNlKCdnYWxsZXJ5Jyk7XG4gICAgZ2FsbGVyeVJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ2FsbGVyeUxpc3QpKTtcbiAgICBnYWxsZXJ5UmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ2FsbGVyeVNhdmUpKTtcbiAgICBnYWxsZXJ5UmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3VwbG9hZCcpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGdhbGxlcnlVcGxvYWQpKTtcbiAgICBnYWxsZXJ5UmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3tpZH0nKS5hZGRNZXRob2QoJ0RFTEVURScsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGdhbGxlcnlEZWxldGUpKTtcblxuICAgIGNvbnN0IGNsYXNzZXNSZXNvdXJjZSA9IHRoaXMuYXBpR2F0ZXdheS5yb290LmFkZFJlc291cmNlKCdjbGFzc2VzJyk7XG4gICAgY2xhc3Nlc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYm9va2luZ0NsYXNzZXMpKTtcbiAgICBjbGFzc2VzUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3tpZH0nKS5hZGRSZXNvdXJjZSgnYm9vaycpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGJvb2tpbmdCb29rKSk7XG5cbiAgICBjb25zdCBib29raW5nc1Jlc291cmNlID0gdGhpcy5hcGlHYXRld2F5LnJvb3QuYWRkUmVzb3VyY2UoJ2Jvb2tpbmdzJyk7XG4gICAgYm9va2luZ3NSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGJvb2tpbmdMaXN0KSk7XG5cbiAgICBjb25zdCBwYXltZW50UmVzb3VyY2UgPSB0aGlzLmFwaUdhdGV3YXkucm9vdC5hZGRSZXNvdXJjZSgncGF5bWVudCcpO1xuICAgIHBheW1lbnRSZXNvdXJjZS5hZGRSZXNvdXJjZSgnaW50ZW50JykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocGF5bWVudEludGVudCkpO1xuICAgIHBheW1lbnRSZXNvdXJjZS5hZGRSZXNvdXJjZSgnd2ViaG9vaycpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHBheW1lbnRXZWJob29rKSk7XG5cbiAgICAvLyBUYWdzXG4gICAgY2RrLlRhZ3Mub2YodGhpcy5hcGlHYXRld2F5KS5hZGQoJ1NlcnZpY2UnLCAnR2FiaVlvZ2FMYW1iZGEnKTtcbiAgICBjZGsuVGFncy5vZih0aGlzLmFwaUdhdGV3YXkpLmFkZCgnRW52aXJvbm1lbnQnLCBzdGFnZSk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcy5hc3NldHNCdWNrZXQpLmFkZCgnU2VydmljZScsICdHYWJpWW9nYUxhbWJkYScpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMuYXNzZXRzQnVja2V0KS5hZGQoJ0Vudmlyb25tZW50Jywgc3RhZ2UpO1xuXG4gICAgLy8gT3V0cHV0c1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBc3NldHNCdWNrZXROYW1lJywge1xuICAgICAgdmFsdWU6IHRoaXMuYXNzZXRzQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0Fzc2V0cyBidWNrZXQgbmFtZScsXG4gICAgICBleHBvcnROYW1lOiBgJHtyZXNvdXJjZVByZWZpeH0tQXNzZXRzQnVja2V0TmFtZWAsXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxuICAgIGlkOiBzdHJpbmcsIFxuICAgIGhhbmRsZXJQYXRoOiBzdHJpbmcsIFxuICAgIGNvbW1vblByb3BzOiBhbnlcbiAgKTogbGFtYmRhLkZ1bmN0aW9uIHtcbiAgICBjb25zdCBmdW5jID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCBpZCwge1xuICAgICAgLi4uY29tbW9uUHJvcHMsXG4gICAgICBmdW5jdGlvbk5hbWU6IGAke2NvbW1vblByb3BzLmVudmlyb25tZW50LlNUQUdFID09PSAncHJvZCcgPyAnR2FiaVlvZ2EtcHJvZCcgOiAnR2FiaVlvZ2EtZGV2J30tJHtpZH1gLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9sYW1iZGEnLCB7XG4gICAgICAgIGV4Y2x1ZGU6IFsnbm9kZV9tb2R1bGVzJywgJy5naXQnLCAnKi5tZCcsICd0ZXN0cycsICdfX3Rlc3RzX18nXSxcbiAgICAgIH0pLFxuICAgICAgaGFuZGxlcjogaGFuZGxlclBhdGgucmVwbGFjZSgnLmpzJywgJy5oYW5kbGVyJyksXG4gICAgfSk7XG5cbiAgICB0aGlzLmxhbWJkYUZ1bmN0aW9ucy5wdXNoKGZ1bmMpO1xuICAgIFxuICAgIC8vIEFkZCB0YWdzXG4gICAgY2RrLlRhZ3Mub2YoZnVuYykuYWRkKCdTZXJ2aWNlJywgJ0dhYmlZb2dhTGFtYmRhJyk7XG4gICAgY2RrLlRhZ3Mub2YoZnVuYykuYWRkKCdFbnZpcm9ubWVudCcsIGNvbW1vblByb3BzLmVudmlyb25tZW50LlNUQUdFKTtcbiAgICBjZGsuVGFncy5vZihmdW5jKS5hZGQoJ0Z1bmN0aW9uJywgaWQpO1xuXG4gICAgcmV0dXJuIGZ1bmM7XG4gIH1cbn1cbiJdfQ==