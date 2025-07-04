import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface LambdaApiStackProps extends cdk.StackProps {
  stage: string;
  usersTable: dynamodb.Table;
  blogPostsTable: dynamodb.Table;
  classesTable: dynamodb.Table;
  bookingsTable: dynamodb.Table;
  retreatsTable: dynamodb.Table;
  workshopsTable: dynamodb.Table;
  galleryTable: dynamodb.Table;
  settingsTable: dynamodb.Table;
  communicationsTable: dynamodb.Table;
  jwtBlacklistTable: dynamodb.Table;
  jwtSecret: secretsmanager.Secret;
  stripeSecret: secretsmanager.Secret;
}

export class LambdaApiStack extends cdk.Stack {
  public readonly apiGateway: apigateway.RestApi;
  public readonly lambdaFunctions: lambda.Function[] = [];
  public readonly assetsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: LambdaApiStackProps) {
    super(scope, id, props);

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
      memorySize: 512, // More memory for file serving
      timeout: cdk.Duration.seconds(10), // Shorter timeout for static content
    });

    const staticFiles = this.createLambdaFunction('StaticFiles', 'static/serve-static.js', {
      ...commonLambdaProps,
      memorySize: 512, // More memory for file serving
      timeout: cdk.Duration.seconds(10),
    });

    // Dashboard Lambda Functions
    const adminDashboardPage = this.createLambdaFunction('AdminDashboardPage', 'admin/serve-dashboard.js', {
      ...commonLambdaProps,
      memorySize: 512, // More memory for file serving
      timeout: cdk.Duration.seconds(10),
    });

    const userDashboardPage = this.createLambdaFunction('UserDashboardPage', 'user/serve-dashboard.js', {
      ...commonLambdaProps,
      memorySize: 512, // More memory for file serving
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
        allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token', 'Accept'],
        allowCredentials: true,
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

  private createLambdaFunction(
    id: string, 
    handlerPath: string, 
    commonProps: any
  ): lambda.Function {
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
