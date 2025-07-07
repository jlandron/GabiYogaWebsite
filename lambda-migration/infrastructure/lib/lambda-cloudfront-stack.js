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
exports.LambdaCloudfrontStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const cloudfront = __importStar(require("aws-cdk-lib/aws-cloudfront"));
const origins = __importStar(require("aws-cdk-lib/aws-cloudfront-origins"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const acm = __importStar(require("aws-cdk-lib/aws-certificatemanager"));
const route53 = __importStar(require("aws-cdk-lib/aws-route53"));
const targets = __importStar(require("aws-cdk-lib/aws-route53-targets"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
class LambdaCloudfrontStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { stage, apiGateway, domainName } = props;
        const resourcePrefix = `GabiYoga-${stage}`;
        // Define the static assets domain name
        this.staticAssetsDomain = stage === 'prod'
            ? `static.${domainName}`
            : `static-${stage}.${domainName}`;
        // Create a public hosted zone for the static assets domain
        // This will only be used for the subdomain (static.gabi.yoga)
        const cdnHostedZone = new route53.PublicHostedZone(this, 'StaticAssetsHostedZone', {
            zoneName: this.staticAssetsDomain,
        });
        // Create a certificate in us-east-1 for CloudFront
        // Note: CloudFront requires certificates to be in us-east-1
        const certificate = new acm.DnsValidatedCertificate(this, 'CloudFrontCertificate', {
            domainName: this.staticAssetsDomain,
            hostedZone: cdnHostedZone,
            region: 'us-east-1', // CloudFront requires certificates in us-east-1
        });
        // Create our own S3 bucket for static assets to avoid circular dependencies
        this.staticAssetsBucket = new s3.Bucket(this, 'StaticAssetsBucket', {
            bucketName: `gabi-yoga-${stage}-cdn-assets-${this.region}`,
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
        // Create origin access identity for S3
        const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
            comment: `OAI for ${resourcePrefix} static assets`,
        });
        // Grant CloudFront access to the bucket
        const bucketPolicyStatement = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['s3:GetObject'],
            principals: [new iam.CanonicalUserPrincipal(originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId)],
            resources: [`${this.staticAssetsBucket.bucketArn}/*`],
        });
        // Add the policy to the bucket
        this.staticAssetsBucket.addToResourcePolicy(bucketPolicyStatement);
        // Define cache policies for different file types
        const immutableCachePolicy = new cloudfront.CachePolicy(this, 'ImmutableCachePolicy', {
            cachePolicyName: `${resourcePrefix}-ImmutableCache`,
            comment: 'Cache policy for immutable assets (images, fonts, etc.)',
            defaultTtl: cdk.Duration.days(365),
            maxTtl: cdk.Duration.days(365),
            minTtl: cdk.Duration.days(365),
            enableAcceptEncodingBrotli: true,
            enableAcceptEncodingGzip: true,
            cookieBehavior: cloudfront.CacheCookieBehavior.none(),
            headerBehavior: cloudfront.CacheHeaderBehavior.allowList('Origin', 'Access-Control-Request-Method', 'Access-Control-Request-Headers'),
            queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
        });
        const staticAssetsCachePolicy = new cloudfront.CachePolicy(this, 'StaticAssetsCachePolicy', {
            cachePolicyName: `${resourcePrefix}-StaticAssetsCache`,
            comment: 'Cache policy for static assets (CSS, JS)',
            defaultTtl: cdk.Duration.days(7),
            maxTtl: cdk.Duration.days(30),
            minTtl: cdk.Duration.days(1),
            enableAcceptEncodingBrotli: true,
            enableAcceptEncodingGzip: true,
            cookieBehavior: cloudfront.CacheCookieBehavior.none(),
            headerBehavior: cloudfront.CacheHeaderBehavior.allowList('Origin', 'Access-Control-Request-Method', 'Access-Control-Request-Headers'),
            queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
        });
        const dynamicContentCachePolicy = new cloudfront.CachePolicy(this, 'DynamicContentCachePolicy', {
            cachePolicyName: `${resourcePrefix}-DynamicContentCache`,
            comment: 'Cache policy for dynamic content (HTML)',
            defaultTtl: cdk.Duration.hours(1),
            maxTtl: cdk.Duration.days(1),
            minTtl: cdk.Duration.minutes(5),
            enableAcceptEncodingBrotli: true,
            enableAcceptEncodingGzip: true,
            cookieBehavior: cloudfront.CacheCookieBehavior.all(),
            headerBehavior: cloudfront.CacheHeaderBehavior.allowList('Origin', 'Access-Control-Request-Method', 'Access-Control-Request-Headers'),
            queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
        });
        // Create a CloudFront response headers policy
        const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeadersPolicy', {
            responseHeadersPolicyName: `${resourcePrefix}-SecurityHeaders`,
            comment: 'Security headers policy for static assets',
            securityHeadersBehavior: {
                contentSecurityPolicy: {
                    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;",
                    override: true,
                },
                strictTransportSecurity: {
                    accessControlMaxAge: cdk.Duration.days(365),
                    includeSubdomains: true,
                    preload: true,
                    override: true,
                },
                contentTypeOptions: {
                    override: true,
                },
                frameOptions: {
                    frameOption: cloudfront.HeadersFrameOption.DENY,
                    override: true,
                },
                xssProtection: {
                    protection: true,
                    modeBlock: true,
                    override: true,
                },
                referrerPolicy: {
                    referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
                    override: true,
                },
            },
            corsBehavior: {
                accessControlAllowCredentials: false,
                accessControlAllowHeaders: ['*'],
                accessControlAllowMethods: ['GET', 'HEAD'],
                accessControlAllowOrigins: stage === 'prod'
                    ? [`https://${domainName}`, `https://www.${domainName}`]
                    : [`https://${stage}.${domainName}`, '*'],
                accessControlMaxAge: cdk.Duration.seconds(600),
                originOverride: true,
            },
        });
        // Create the CloudFront distribution
        this.cloudfrontDistribution = new cloudfront.Distribution(this, 'StaticAssetsDistribution', {
            comment: `${resourcePrefix} static assets distribution`,
            defaultRootObject: 'index.html',
            domainNames: [this.staticAssetsDomain],
            certificate,
            defaultBehavior: {
                origin: new origins.S3Origin(this.staticAssetsBucket, {
                    originAccessIdentity,
                }),
                allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cachePolicy: dynamicContentCachePolicy,
                responseHeadersPolicy,
                compress: true,
            },
            additionalBehaviors: {
                // Immutable assets (images, fonts, etc.)
                '*.png': {
                    origin: new origins.S3Origin(this.staticAssetsBucket, { originAccessIdentity }),
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cachePolicy: immutableCachePolicy,
                    responseHeadersPolicy,
                },
                '*.jpg': {
                    origin: new origins.S3Origin(this.staticAssetsBucket, { originAccessIdentity }),
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cachePolicy: immutableCachePolicy,
                    responseHeadersPolicy,
                },
                '*.svg': {
                    origin: new origins.S3Origin(this.staticAssetsBucket, { originAccessIdentity }),
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cachePolicy: immutableCachePolicy,
                    responseHeadersPolicy,
                },
                '*.gif': {
                    origin: new origins.S3Origin(this.staticAssetsBucket, { originAccessIdentity }),
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cachePolicy: immutableCachePolicy,
                    responseHeadersPolicy,
                },
                '*.webp': {
                    origin: new origins.S3Origin(this.staticAssetsBucket, { originAccessIdentity }),
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cachePolicy: immutableCachePolicy,
                    responseHeadersPolicy,
                },
                '*.ico': {
                    origin: new origins.S3Origin(this.staticAssetsBucket, { originAccessIdentity }),
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cachePolicy: immutableCachePolicy,
                    responseHeadersPolicy,
                },
                '*.woff': {
                    origin: new origins.S3Origin(this.staticAssetsBucket, { originAccessIdentity }),
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cachePolicy: immutableCachePolicy,
                    responseHeadersPolicy,
                },
                '*.woff2': {
                    origin: new origins.S3Origin(this.staticAssetsBucket, { originAccessIdentity }),
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cachePolicy: immutableCachePolicy,
                    responseHeadersPolicy,
                },
                '*.ttf': {
                    origin: new origins.S3Origin(this.staticAssetsBucket, { originAccessIdentity }),
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cachePolicy: immutableCachePolicy,
                    responseHeadersPolicy,
                },
                '*.eot': {
                    origin: new origins.S3Origin(this.staticAssetsBucket, { originAccessIdentity }),
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cachePolicy: immutableCachePolicy,
                    responseHeadersPolicy,
                },
                // Static assets (CSS, JS)
                '*.css': {
                    origin: new origins.S3Origin(this.staticAssetsBucket, { originAccessIdentity }),
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cachePolicy: staticAssetsCachePolicy,
                    responseHeadersPolicy,
                },
                '*.js': {
                    origin: new origins.S3Origin(this.staticAssetsBucket, { originAccessIdentity }),
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cachePolicy: staticAssetsCachePolicy,
                    responseHeadersPolicy,
                },
                // Dynamic content (HTML)
                '*.html': {
                    origin: new origins.S3Origin(this.staticAssetsBucket, { originAccessIdentity }),
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cachePolicy: dynamicContentCachePolicy,
                    responseHeadersPolicy,
                },
                // API Gateway for dynamic content
                'api/*': {
                    origin: new origins.RestApiOrigin(apiGateway),
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
                    allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                    cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
                },
            },
            errorResponses: [
                {
                    httpStatus: 404,
                    responseHttpStatus: 404,
                    responsePagePath: '/404.html',
                    ttl: cdk.Duration.minutes(30),
                },
                {
                    httpStatus: 403,
                    responseHttpStatus: 403,
                    responsePagePath: '/403.html',
                    ttl: cdk.Duration.minutes(30),
                },
            ],
            priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
            enabled: true,
            enableIpv6: true,
            enableLogging: true,
            logBucket: new s3.Bucket(this, 'CloudFrontLogsBucket', {
                bucketName: `${resourcePrefix.toLowerCase()}-cloudfront-logs-${this.region}`,
                removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
                encryption: s3.BucketEncryption.S3_MANAGED,
                // Enable object ownership controls for CloudFront logging
                objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
                // Allow CloudFront to write logs
                blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
                lifecycleRules: [
                    {
                        expiration: cdk.Duration.days(365),
                        transitions: [
                            {
                                storageClass: s3.StorageClass.INTELLIGENT_TIERING,
                                transitionAfter: cdk.Duration.days(30),
                            },
                        ],
                    },
                ],
            }),
            logFilePrefix: 'cloudfront-logs/',
            logIncludesCookies: true,
        });
        // Create Route53 record for the CloudFront distribution
        new route53.ARecord(this, 'StaticAssetsRecord', {
            zone: cdnHostedZone,
            recordName: '@',
            target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.cloudfrontDistribution)),
            ttl: cdk.Duration.minutes(5),
        });
        // Also create AAAA record for IPv6 support
        new route53.AaaaRecord(this, 'StaticAssetsAaaaRecord', {
            zone: cdnHostedZone,
            recordName: '@',
            target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.cloudfrontDistribution)),
            ttl: cdk.Duration.minutes(5),
        });
        // Output the name servers for the hosted zone - these need to be added as NS records in the main domain
        new cdk.CfnOutput(this, 'StaticAssetsNameServers', {
            value: cdk.Fn.join(', ', cdnHostedZone.hostedZoneNameServers || []),
            description: 'Name servers for the static assets domain. Add these as NS records in the main domain.',
            exportName: `${resourcePrefix}-StaticAssetsNameServers`,
        });
        // Outputs
        new cdk.CfnOutput(this, 'CloudFrontDomainName', {
            value: this.cloudfrontDistribution.distributionDomainName,
            description: 'CloudFront Distribution Domain Name',
            exportName: `${resourcePrefix}-CloudFrontDomainName`,
        });
        new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
            value: this.cloudfrontDistribution.distributionId,
            description: 'CloudFront Distribution ID',
            exportName: `${resourcePrefix}-CloudFrontDistributionId`,
        });
        new cdk.CfnOutput(this, 'StaticAssetsDomain', {
            value: `https://${this.staticAssetsDomain}`,
            description: 'Static Assets Domain',
            exportName: `${resourcePrefix}-StaticAssetsDomain`,
        });
    }
}
exports.LambdaCloudfrontStack = LambdaCloudfrontStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFtYmRhLWNsb3VkZnJvbnQtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsYW1iZGEtY2xvdWRmcm9udC1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQyx1RUFBeUQ7QUFDekQsNEVBQThEO0FBQzlELHVEQUF5QztBQUN6Qyx3RUFBMEQ7QUFDMUQsaUVBQW1EO0FBQ25ELHlFQUEyRDtBQUUzRCx5REFBMkM7QUFTM0MsTUFBYSxxQkFBc0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQUtsRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQWlDO1FBQ3pFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxHQUFHLEtBQUssQ0FBQztRQUNoRCxNQUFNLGNBQWMsR0FBRyxZQUFZLEtBQUssRUFBRSxDQUFDO1FBRTNDLHVDQUF1QztRQUN2QyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxLQUFLLE1BQU07WUFDeEMsQ0FBQyxDQUFDLFVBQVUsVUFBVSxFQUFFO1lBQ3hCLENBQUMsQ0FBQyxVQUFVLEtBQUssSUFBSSxVQUFVLEVBQUUsQ0FBQztRQUVwQywyREFBMkQ7UUFDM0QsOERBQThEO1FBQzlELE1BQU0sYUFBYSxHQUFHLElBQUksT0FBTyxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSx3QkFBd0IsRUFBRTtZQUNqRixRQUFRLEVBQUUsSUFBSSxDQUFDLGtCQUFrQjtTQUNsQyxDQUFDLENBQUM7UUFFSCxtREFBbUQ7UUFDbkQsNERBQTREO1FBQzVELE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxDQUFDLHVCQUF1QixDQUFDLElBQUksRUFBRSx1QkFBdUIsRUFBRTtZQUNqRixVQUFVLEVBQUUsSUFBSSxDQUFDLGtCQUFrQjtZQUNuQyxV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QUU7WUFDakQsS0FBSyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMscUJBQXFCLElBQUksRUFBRSxDQUFDO1lBQ25FLFdBQVcsRUFBRSx3RkFBd0Y7WUFDckcsVUFBVSxFQUFFLEdBQUcsY0FBYywwQkFBMEI7U0FDeEQsQ0FBQyxDQUFDO1FBRUgsVUFBVTtRQUNWLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLEVBQUU7WUFDOUMsS0FBSyxFQUFFLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxzQkFBc0I7WUFDekQsV0FBVyxFQUFFLHFDQUFxQztZQUNsRCxVQUFVLEVBQUUsR0FBRyxjQUFjLHVCQUF1QjtTQUNyRCxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLDBCQUEwQixFQUFFO1lBQ2xELEtBQUssRUFBRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsY0FBYztZQUNqRCxXQUFXLEVBQUUsNEJBQTRCO1lBQ3pDLFVBQVUsRUFBRSxHQUFHLGNBQWMsMkJBQTJCO1NBQ3pELENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDNUMsS0FBSyxFQUFFLFdBQVcsSUFBSSxDQUFDLGtCQUFrQixFQUFFO1lBQzNDLFdBQVcsRUFBRSxzQkFBc0I7WUFDbkMsVUFBVSxFQUFFLEdBQUcsY0FBYyxxQkFBcUI7U0FDbkQsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBdFZELHNEQXNWQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBjbG91ZGZyb250IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250JztcbmltcG9ydCAqIGFzIG9yaWdpbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQtb3JpZ2lucyc7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0ICogYXMgYWNtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jZXJ0aWZpY2F0ZW1hbmFnZXInO1xuaW1wb3J0ICogYXMgcm91dGU1MyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtcm91dGU1Myc7XG5pbXBvcnQgKiBhcyB0YXJnZXRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1yb3V0ZTUzLXRhcmdldHMnO1xuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSc7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGludGVyZmFjZSBMYW1iZGFDbG91ZGZyb250U3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgc3RhZ2U6IHN0cmluZztcbiAgYXBpR2F0ZXdheTogYXBpZ2F0ZXdheS5SZXN0QXBpO1xuICBkb21haW5OYW1lOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBMYW1iZGFDbG91ZGZyb250U3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBwdWJsaWMgcmVhZG9ubHkgY2xvdWRmcm9udERpc3RyaWJ1dGlvbjogY2xvdWRmcm9udC5EaXN0cmlidXRpb247XG4gIHB1YmxpYyByZWFkb25seSBzdGF0aWNBc3NldHNEb21haW46IHN0cmluZztcbiAgcHVibGljIHJlYWRvbmx5IHN0YXRpY0Fzc2V0c0J1Y2tldDogczMuQnVja2V0O1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBMYW1iZGFDbG91ZGZyb250U3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgY29uc3QgeyBzdGFnZSwgYXBpR2F0ZXdheSwgZG9tYWluTmFtZSB9ID0gcHJvcHM7XG4gICAgY29uc3QgcmVzb3VyY2VQcmVmaXggPSBgR2FiaVlvZ2EtJHtzdGFnZX1gO1xuXG4gICAgLy8gRGVmaW5lIHRoZSBzdGF0aWMgYXNzZXRzIGRvbWFpbiBuYW1lXG4gICAgdGhpcy5zdGF0aWNBc3NldHNEb21haW4gPSBzdGFnZSA9PT0gJ3Byb2QnIFxuICAgICAgPyBgc3RhdGljLiR7ZG9tYWluTmFtZX1gIFxuICAgICAgOiBgc3RhdGljLSR7c3RhZ2V9LiR7ZG9tYWluTmFtZX1gO1xuICAgIFxuICAgIC8vIENyZWF0ZSBhIHB1YmxpYyBob3N0ZWQgem9uZSBmb3IgdGhlIHN0YXRpYyBhc3NldHMgZG9tYWluXG4gICAgLy8gVGhpcyB3aWxsIG9ubHkgYmUgdXNlZCBmb3IgdGhlIHN1YmRvbWFpbiAoc3RhdGljLmdhYmkueW9nYSlcbiAgICBjb25zdCBjZG5Ib3N0ZWRab25lID0gbmV3IHJvdXRlNTMuUHVibGljSG9zdGVkWm9uZSh0aGlzLCAnU3RhdGljQXNzZXRzSG9zdGVkWm9uZScsIHtcbiAgICAgIHpvbmVOYW1lOiB0aGlzLnN0YXRpY0Fzc2V0c0RvbWFpbixcbiAgICB9KTtcbiAgICAgIFxuICAgIC8vIENyZWF0ZSBhIGNlcnRpZmljYXRlIGluIHVzLWVhc3QtMSBmb3IgQ2xvdWRGcm9udFxuICAgIC8vIE5vdGU6IENsb3VkRnJvbnQgcmVxdWlyZXMgY2VydGlmaWNhdGVzIHRvIGJlIGluIHVzLWVhc3QtMVxuICAgIGNvbnN0IGNlcnRpZmljYXRlID0gbmV3IGFjbS5EbnNWYWxpZGF0ZWRDZXJ0aWZpY2F0ZSh0aGlzLCAnQ2xvdWRGcm9udENlcnRpZmljYXRlJywge1xuICAgICAgZG9tYWluTmFtZTogdGhpcy5zdGF0aWNBc3NldHNEb21haW4sXG4gICAgICBob3N0ZWRab25lOiBjZG5Ib3N0ZWRab25lLFxuICAgICAgcmVnaW9uOiAndXMtZWFzdC0xJywgLy8gQ2xvdWRGcm9udCByZXF1aXJlcyBjZXJ0aWZpY2F0ZXMgaW4gdXMtZWFzdC0xXG4gICAgfSk7XG4gICAgICBcbiAgICAvLyBDcmVhdGUgb3VyIG93biBTMyBidWNrZXQgZm9yIHN0YXRpYyBhc3NldHMgdG8gYXZvaWQgY2lyY3VsYXIgZGVwZW5kZW5jaWVzXG4gICAgdGhpcy5zdGF0aWNBc3NldHNCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdTdGF0aWNBc3NldHNCdWNrZXQnLCB7XG4gICAgICBidWNrZXROYW1lOiBgZ2FiaS15b2dhLSR7c3RhZ2V9LWNkbi1hc3NldHMtJHt0aGlzLnJlZ2lvbn1gLFxuICAgICAgcHVibGljUmVhZEFjY2VzczogZmFsc2UsXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgY29yczogW1xuICAgICAgICB7XG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IFtzMy5IdHRwTWV0aG9kcy5HRVQsIHMzLkh0dHBNZXRob2RzLlBPU1QsIHMzLkh0dHBNZXRob2RzLlBVVF0sXG4gICAgICAgICAgYWxsb3dlZE9yaWdpbnM6IHN0YWdlID09PSAncHJvZCcgPyBbJ2h0dHBzOi8vZ2FiaS55b2dhJywgJ2h0dHBzOi8vd3d3LmdhYmkueW9nYSddIDogWycqJ10sXG4gICAgICAgICAgYWxsb3dlZEhlYWRlcnM6IFsnKiddLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIGxpZmVjeWNsZVJ1bGVzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ0RlbGV0ZUluY29tcGxldGVNdWx0aXBhcnRVcGxvYWRzJyxcbiAgICAgICAgICBhYm9ydEluY29tcGxldGVNdWx0aXBhcnRVcGxvYWRBZnRlcjogY2RrLkR1cmF0aW9uLmRheXMoMSksXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgcmVtb3ZhbFBvbGljeTogc3RhZ2UgPT09ICdwcm9kJyA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgb3JpZ2luIGFjY2VzcyBpZGVudGl0eSBmb3IgUzNcbiAgICBjb25zdCBvcmlnaW5BY2Nlc3NJZGVudGl0eSA9IG5ldyBjbG91ZGZyb250Lk9yaWdpbkFjY2Vzc0lkZW50aXR5KHRoaXMsICdPQUknLCB7XG4gICAgICBjb21tZW50OiBgT0FJIGZvciAke3Jlc291cmNlUHJlZml4fSBzdGF0aWMgYXNzZXRzYCxcbiAgICB9KTtcblxuICAgIC8vIEdyYW50IENsb3VkRnJvbnQgYWNjZXNzIHRvIHRoZSBidWNrZXRcbiAgICBjb25zdCBidWNrZXRQb2xpY3lTdGF0ZW1lbnQgPSBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbJ3MzOkdldE9iamVjdCddLFxuICAgICAgcHJpbmNpcGFsczogW25ldyBpYW0uQ2Fub25pY2FsVXNlclByaW5jaXBhbChvcmlnaW5BY2Nlc3NJZGVudGl0eS5jbG91ZEZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHlTM0Nhbm9uaWNhbFVzZXJJZCldLFxuICAgICAgcmVzb3VyY2VzOiBbYCR7dGhpcy5zdGF0aWNBc3NldHNCdWNrZXQuYnVja2V0QXJufS8qYF0sXG4gICAgfSk7XG4gICAgXG4gICAgLy8gQWRkIHRoZSBwb2xpY3kgdG8gdGhlIGJ1Y2tldFxuICAgIHRoaXMuc3RhdGljQXNzZXRzQnVja2V0LmFkZFRvUmVzb3VyY2VQb2xpY3koYnVja2V0UG9saWN5U3RhdGVtZW50KTtcblxuICAgIC8vIERlZmluZSBjYWNoZSBwb2xpY2llcyBmb3IgZGlmZmVyZW50IGZpbGUgdHlwZXNcbiAgICBjb25zdCBpbW11dGFibGVDYWNoZVBvbGljeSA9IG5ldyBjbG91ZGZyb250LkNhY2hlUG9saWN5KHRoaXMsICdJbW11dGFibGVDYWNoZVBvbGljeScsIHtcbiAgICAgIGNhY2hlUG9saWN5TmFtZTogYCR7cmVzb3VyY2VQcmVmaXh9LUltbXV0YWJsZUNhY2hlYCxcbiAgICAgIGNvbW1lbnQ6ICdDYWNoZSBwb2xpY3kgZm9yIGltbXV0YWJsZSBhc3NldHMgKGltYWdlcywgZm9udHMsIGV0Yy4pJyxcbiAgICAgIGRlZmF1bHRUdGw6IGNkay5EdXJhdGlvbi5kYXlzKDM2NSksXG4gICAgICBtYXhUdGw6IGNkay5EdXJhdGlvbi5kYXlzKDM2NSksXG4gICAgICBtaW5UdGw6IGNkay5EdXJhdGlvbi5kYXlzKDM2NSksXG4gICAgICBlbmFibGVBY2NlcHRFbmNvZGluZ0Jyb3RsaTogdHJ1ZSxcbiAgICAgIGVuYWJsZUFjY2VwdEVuY29kaW5nR3ppcDogdHJ1ZSxcbiAgICAgIGNvb2tpZUJlaGF2aW9yOiBjbG91ZGZyb250LkNhY2hlQ29va2llQmVoYXZpb3Iubm9uZSgpLFxuICAgICAgaGVhZGVyQmVoYXZpb3I6IGNsb3VkZnJvbnQuQ2FjaGVIZWFkZXJCZWhhdmlvci5hbGxvd0xpc3QoJ09yaWdpbicsICdBY2Nlc3MtQ29udHJvbC1SZXF1ZXN0LU1ldGhvZCcsICdBY2Nlc3MtQ29udHJvbC1SZXF1ZXN0LUhlYWRlcnMnKSxcbiAgICAgIHF1ZXJ5U3RyaW5nQmVoYXZpb3I6IGNsb3VkZnJvbnQuQ2FjaGVRdWVyeVN0cmluZ0JlaGF2aW9yLm5vbmUoKSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHN0YXRpY0Fzc2V0c0NhY2hlUG9saWN5ID0gbmV3IGNsb3VkZnJvbnQuQ2FjaGVQb2xpY3kodGhpcywgJ1N0YXRpY0Fzc2V0c0NhY2hlUG9saWN5Jywge1xuICAgICAgY2FjaGVQb2xpY3lOYW1lOiBgJHtyZXNvdXJjZVByZWZpeH0tU3RhdGljQXNzZXRzQ2FjaGVgLFxuICAgICAgY29tbWVudDogJ0NhY2hlIHBvbGljeSBmb3Igc3RhdGljIGFzc2V0cyAoQ1NTLCBKUyknLFxuICAgICAgZGVmYXVsdFR0bDogY2RrLkR1cmF0aW9uLmRheXMoNyksXG4gICAgICBtYXhUdGw6IGNkay5EdXJhdGlvbi5kYXlzKDMwKSxcbiAgICAgIG1pblR0bDogY2RrLkR1cmF0aW9uLmRheXMoMSksXG4gICAgICBlbmFibGVBY2NlcHRFbmNvZGluZ0Jyb3RsaTogdHJ1ZSxcbiAgICAgIGVuYWJsZUFjY2VwdEVuY29kaW5nR3ppcDogdHJ1ZSxcbiAgICAgIGNvb2tpZUJlaGF2aW9yOiBjbG91ZGZyb250LkNhY2hlQ29va2llQmVoYXZpb3Iubm9uZSgpLFxuICAgICAgaGVhZGVyQmVoYXZpb3I6IGNsb3VkZnJvbnQuQ2FjaGVIZWFkZXJCZWhhdmlvci5hbGxvd0xpc3QoJ09yaWdpbicsICdBY2Nlc3MtQ29udHJvbC1SZXF1ZXN0LU1ldGhvZCcsICdBY2Nlc3MtQ29udHJvbC1SZXF1ZXN0LUhlYWRlcnMnKSxcbiAgICAgIHF1ZXJ5U3RyaW5nQmVoYXZpb3I6IGNsb3VkZnJvbnQuQ2FjaGVRdWVyeVN0cmluZ0JlaGF2aW9yLm5vbmUoKSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGR5bmFtaWNDb250ZW50Q2FjaGVQb2xpY3kgPSBuZXcgY2xvdWRmcm9udC5DYWNoZVBvbGljeSh0aGlzLCAnRHluYW1pY0NvbnRlbnRDYWNoZVBvbGljeScsIHtcbiAgICAgIGNhY2hlUG9saWN5TmFtZTogYCR7cmVzb3VyY2VQcmVmaXh9LUR5bmFtaWNDb250ZW50Q2FjaGVgLFxuICAgICAgY29tbWVudDogJ0NhY2hlIHBvbGljeSBmb3IgZHluYW1pYyBjb250ZW50IChIVE1MKScsXG4gICAgICBkZWZhdWx0VHRsOiBjZGsuRHVyYXRpb24uaG91cnMoMSksXG4gICAgICBtYXhUdGw6IGNkay5EdXJhdGlvbi5kYXlzKDEpLFxuICAgICAgbWluVHRsOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICAgIGVuYWJsZUFjY2VwdEVuY29kaW5nQnJvdGxpOiB0cnVlLFxuICAgICAgZW5hYmxlQWNjZXB0RW5jb2RpbmdHemlwOiB0cnVlLFxuICAgICAgY29va2llQmVoYXZpb3I6IGNsb3VkZnJvbnQuQ2FjaGVDb29raWVCZWhhdmlvci5hbGwoKSxcbiAgICAgIGhlYWRlckJlaGF2aW9yOiBjbG91ZGZyb250LkNhY2hlSGVhZGVyQmVoYXZpb3IuYWxsb3dMaXN0KCdPcmlnaW4nLCAnQWNjZXNzLUNvbnRyb2wtUmVxdWVzdC1NZXRob2QnLCAnQWNjZXNzLUNvbnRyb2wtUmVxdWVzdC1IZWFkZXJzJyksXG4gICAgICBxdWVyeVN0cmluZ0JlaGF2aW9yOiBjbG91ZGZyb250LkNhY2hlUXVlcnlTdHJpbmdCZWhhdmlvci5hbGwoKSxcbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSBhIENsb3VkRnJvbnQgcmVzcG9uc2UgaGVhZGVycyBwb2xpY3lcbiAgICBjb25zdCByZXNwb25zZUhlYWRlcnNQb2xpY3kgPSBuZXcgY2xvdWRmcm9udC5SZXNwb25zZUhlYWRlcnNQb2xpY3kodGhpcywgJ1NlY3VyaXR5SGVhZGVyc1BvbGljeScsIHtcbiAgICAgIHJlc3BvbnNlSGVhZGVyc1BvbGljeU5hbWU6IGAke3Jlc291cmNlUHJlZml4fS1TZWN1cml0eUhlYWRlcnNgLFxuICAgICAgY29tbWVudDogJ1NlY3VyaXR5IGhlYWRlcnMgcG9saWN5IGZvciBzdGF0aWMgYXNzZXRzJyxcbiAgICAgIHNlY3VyaXR5SGVhZGVyc0JlaGF2aW9yOiB7XG4gICAgICAgIGNvbnRlbnRTZWN1cml0eVBvbGljeToge1xuICAgICAgICAgIGNvbnRlbnRTZWN1cml0eVBvbGljeTogXCJkZWZhdWx0LXNyYyAnc2VsZic7IHNjcmlwdC1zcmMgJ3NlbGYnICd1bnNhZmUtaW5saW5lJzsgc3R5bGUtc3JjICdzZWxmJyAndW5zYWZlLWlubGluZSc7IGltZy1zcmMgJ3NlbGYnIGRhdGE6OyBmb250LXNyYyAnc2VsZicgZGF0YTo7XCIsXG4gICAgICAgICAgb3ZlcnJpZGU6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICAgIHN0cmljdFRyYW5zcG9ydFNlY3VyaXR5OiB7XG4gICAgICAgICAgYWNjZXNzQ29udHJvbE1heEFnZTogY2RrLkR1cmF0aW9uLmRheXMoMzY1KSxcbiAgICAgICAgICBpbmNsdWRlU3ViZG9tYWluczogdHJ1ZSxcbiAgICAgICAgICBwcmVsb2FkOiB0cnVlLFxuICAgICAgICAgIG92ZXJyaWRlOiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgICBjb250ZW50VHlwZU9wdGlvbnM6IHtcbiAgICAgICAgICBvdmVycmlkZTogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgICAgZnJhbWVPcHRpb25zOiB7XG4gICAgICAgICAgZnJhbWVPcHRpb246IGNsb3VkZnJvbnQuSGVhZGVyc0ZyYW1lT3B0aW9uLkRFTlksXG4gICAgICAgICAgb3ZlcnJpZGU6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICAgIHhzc1Byb3RlY3Rpb246IHtcbiAgICAgICAgICBwcm90ZWN0aW9uOiB0cnVlLFxuICAgICAgICAgIG1vZGVCbG9jazogdHJ1ZSxcbiAgICAgICAgICBvdmVycmlkZTogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgICAgcmVmZXJyZXJQb2xpY3k6IHtcbiAgICAgICAgICByZWZlcnJlclBvbGljeTogY2xvdWRmcm9udC5IZWFkZXJzUmVmZXJyZXJQb2xpY3kuU1RSSUNUX09SSUdJTl9XSEVOX0NST1NTX09SSUdJTixcbiAgICAgICAgICBvdmVycmlkZTogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBjb3JzQmVoYXZpb3I6IHtcbiAgICAgICAgYWNjZXNzQ29udHJvbEFsbG93Q3JlZGVudGlhbHM6IGZhbHNlLFxuICAgICAgICBhY2Nlc3NDb250cm9sQWxsb3dIZWFkZXJzOiBbJyonXSxcbiAgICAgICAgYWNjZXNzQ29udHJvbEFsbG93TWV0aG9kczogWydHRVQnLCAnSEVBRCddLFxuICAgICAgICBhY2Nlc3NDb250cm9sQWxsb3dPcmlnaW5zOiBzdGFnZSA9PT0gJ3Byb2QnIFxuICAgICAgICAgID8gW2BodHRwczovLyR7ZG9tYWluTmFtZX1gLCBgaHR0cHM6Ly93d3cuJHtkb21haW5OYW1lfWBdIFxuICAgICAgICAgIDogW2BodHRwczovLyR7c3RhZ2V9LiR7ZG9tYWluTmFtZX1gLCAnKiddLFxuICAgICAgICBhY2Nlc3NDb250cm9sTWF4QWdlOiBjZGsuRHVyYXRpb24uc2Vjb25kcyg2MDApLFxuICAgICAgICBvcmlnaW5PdmVycmlkZTogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgdGhlIENsb3VkRnJvbnQgZGlzdHJpYnV0aW9uXG4gICAgdGhpcy5jbG91ZGZyb250RGlzdHJpYnV0aW9uID0gbmV3IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uKHRoaXMsICdTdGF0aWNBc3NldHNEaXN0cmlidXRpb24nLCB7XG4gICAgICBjb21tZW50OiBgJHtyZXNvdXJjZVByZWZpeH0gc3RhdGljIGFzc2V0cyBkaXN0cmlidXRpb25gLFxuICAgICAgZGVmYXVsdFJvb3RPYmplY3Q6ICdpbmRleC5odG1sJyxcbiAgICAgIGRvbWFpbk5hbWVzOiBbdGhpcy5zdGF0aWNBc3NldHNEb21haW5dLFxuICAgICAgY2VydGlmaWNhdGUsXG4gICAgICBkZWZhdWx0QmVoYXZpb3I6IHtcbiAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5TM09yaWdpbih0aGlzLnN0YXRpY0Fzc2V0c0J1Y2tldCwge1xuICAgICAgICAgIG9yaWdpbkFjY2Vzc0lkZW50aXR5LFxuICAgICAgICB9KSxcbiAgICAgICAgYWxsb3dlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQWxsb3dlZE1ldGhvZHMuQUxMT1dfR0VUX0hFQURfT1BUSU9OUyxcbiAgICAgICAgY2FjaGVkTWV0aG9kczogY2xvdWRmcm9udC5DYWNoZWRNZXRob2RzLkNBQ0hFX0dFVF9IRUFEX09QVElPTlMsXG4gICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxuICAgICAgICBjYWNoZVBvbGljeTogZHluYW1pY0NvbnRlbnRDYWNoZVBvbGljeSxcbiAgICAgICAgcmVzcG9uc2VIZWFkZXJzUG9saWN5LFxuICAgICAgICBjb21wcmVzczogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBhZGRpdGlvbmFsQmVoYXZpb3JzOiB7XG4gICAgICAgIC8vIEltbXV0YWJsZSBhc3NldHMgKGltYWdlcywgZm9udHMsIGV0Yy4pXG4gICAgICAgICcqLnBuZyc6IHtcbiAgICAgICAgICBvcmlnaW46IG5ldyBvcmlnaW5zLlMzT3JpZ2luKHRoaXMuc3RhdGljQXNzZXRzQnVja2V0LCB7IG9yaWdpbkFjY2Vzc0lkZW50aXR5IH0pLFxuICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxuICAgICAgICAgIGNhY2hlUG9saWN5OiBpbW11dGFibGVDYWNoZVBvbGljeSxcbiAgICAgICAgICByZXNwb25zZUhlYWRlcnNQb2xpY3ksXG4gICAgICAgIH0sXG4gICAgICAgICcqLmpwZyc6IHtcbiAgICAgICAgICBvcmlnaW46IG5ldyBvcmlnaW5zLlMzT3JpZ2luKHRoaXMuc3RhdGljQXNzZXRzQnVja2V0LCB7IG9yaWdpbkFjY2Vzc0lkZW50aXR5IH0pLFxuICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxuICAgICAgICAgIGNhY2hlUG9saWN5OiBpbW11dGFibGVDYWNoZVBvbGljeSxcbiAgICAgICAgICByZXNwb25zZUhlYWRlcnNQb2xpY3ksXG4gICAgICAgIH0sXG4gICAgICAgICcqLnN2Zyc6IHtcbiAgICAgICAgICBvcmlnaW46IG5ldyBvcmlnaW5zLlMzT3JpZ2luKHRoaXMuc3RhdGljQXNzZXRzQnVja2V0LCB7IG9yaWdpbkFjY2Vzc0lkZW50aXR5IH0pLFxuICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxuICAgICAgICAgIGNhY2hlUG9saWN5OiBpbW11dGFibGVDYWNoZVBvbGljeSxcbiAgICAgICAgICByZXNwb25zZUhlYWRlcnNQb2xpY3ksXG4gICAgICAgIH0sXG4gICAgICAgICcqLmdpZic6IHtcbiAgICAgICAgICBvcmlnaW46IG5ldyBvcmlnaW5zLlMzT3JpZ2luKHRoaXMuc3RhdGljQXNzZXRzQnVja2V0LCB7IG9yaWdpbkFjY2Vzc0lkZW50aXR5IH0pLFxuICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxuICAgICAgICAgIGNhY2hlUG9saWN5OiBpbW11dGFibGVDYWNoZVBvbGljeSxcbiAgICAgICAgICByZXNwb25zZUhlYWRlcnNQb2xpY3ksXG4gICAgICAgIH0sXG4gICAgICAgICcqLndlYnAnOiB7XG4gICAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5TM09yaWdpbih0aGlzLnN0YXRpY0Fzc2V0c0J1Y2tldCwgeyBvcmlnaW5BY2Nlc3NJZGVudGl0eSB9KSxcbiAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgICBjYWNoZVBvbGljeTogaW1tdXRhYmxlQ2FjaGVQb2xpY3ksXG4gICAgICAgICAgcmVzcG9uc2VIZWFkZXJzUG9saWN5LFxuICAgICAgICB9LFxuICAgICAgICAnKi5pY28nOiB7XG4gICAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5TM09yaWdpbih0aGlzLnN0YXRpY0Fzc2V0c0J1Y2tldCwgeyBvcmlnaW5BY2Nlc3NJZGVudGl0eSB9KSxcbiAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgICBjYWNoZVBvbGljeTogaW1tdXRhYmxlQ2FjaGVQb2xpY3ksXG4gICAgICAgICAgcmVzcG9uc2VIZWFkZXJzUG9saWN5LFxuICAgICAgICB9LFxuICAgICAgICAnKi53b2ZmJzoge1xuICAgICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuUzNPcmlnaW4odGhpcy5zdGF0aWNBc3NldHNCdWNrZXQsIHsgb3JpZ2luQWNjZXNzSWRlbnRpdHkgfSksXG4gICAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXG4gICAgICAgICAgY2FjaGVQb2xpY3k6IGltbXV0YWJsZUNhY2hlUG9saWN5LFxuICAgICAgICAgIHJlc3BvbnNlSGVhZGVyc1BvbGljeSxcbiAgICAgICAgfSxcbiAgICAgICAgJyoud29mZjInOiB7XG4gICAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5TM09yaWdpbih0aGlzLnN0YXRpY0Fzc2V0c0J1Y2tldCwgeyBvcmlnaW5BY2Nlc3NJZGVudGl0eSB9KSxcbiAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgICBjYWNoZVBvbGljeTogaW1tdXRhYmxlQ2FjaGVQb2xpY3ksXG4gICAgICAgICAgcmVzcG9uc2VIZWFkZXJzUG9saWN5LFxuICAgICAgICB9LFxuICAgICAgICAnKi50dGYnOiB7XG4gICAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5TM09yaWdpbih0aGlzLnN0YXRpY0Fzc2V0c0J1Y2tldCwgeyBvcmlnaW5BY2Nlc3NJZGVudGl0eSB9KSxcbiAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgICBjYWNoZVBvbGljeTogaW1tdXRhYmxlQ2FjaGVQb2xpY3ksXG4gICAgICAgICAgcmVzcG9uc2VIZWFkZXJzUG9saWN5LFxuICAgICAgICB9LFxuICAgICAgICAnKi5lb3QnOiB7XG4gICAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5TM09yaWdpbih0aGlzLnN0YXRpY0Fzc2V0c0J1Y2tldCwgeyBvcmlnaW5BY2Nlc3NJZGVudGl0eSB9KSxcbiAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgICBjYWNoZVBvbGljeTogaW1tdXRhYmxlQ2FjaGVQb2xpY3ksXG4gICAgICAgICAgcmVzcG9uc2VIZWFkZXJzUG9saWN5LFxuICAgICAgICB9LFxuICAgICAgICAvLyBTdGF0aWMgYXNzZXRzIChDU1MsIEpTKVxuICAgICAgICAnKi5jc3MnOiB7XG4gICAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5TM09yaWdpbih0aGlzLnN0YXRpY0Fzc2V0c0J1Y2tldCwgeyBvcmlnaW5BY2Nlc3NJZGVudGl0eSB9KSxcbiAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgICBjYWNoZVBvbGljeTogc3RhdGljQXNzZXRzQ2FjaGVQb2xpY3ksXG4gICAgICAgICAgcmVzcG9uc2VIZWFkZXJzUG9saWN5LFxuICAgICAgICB9LFxuICAgICAgICAnKi5qcyc6IHtcbiAgICAgICAgICBvcmlnaW46IG5ldyBvcmlnaW5zLlMzT3JpZ2luKHRoaXMuc3RhdGljQXNzZXRzQnVja2V0LCB7IG9yaWdpbkFjY2Vzc0lkZW50aXR5IH0pLFxuICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxuICAgICAgICAgIGNhY2hlUG9saWN5OiBzdGF0aWNBc3NldHNDYWNoZVBvbGljeSxcbiAgICAgICAgICByZXNwb25zZUhlYWRlcnNQb2xpY3ksXG4gICAgICAgIH0sXG4gICAgICAgIC8vIER5bmFtaWMgY29udGVudCAoSFRNTClcbiAgICAgICAgJyouaHRtbCc6IHtcbiAgICAgICAgICBvcmlnaW46IG5ldyBvcmlnaW5zLlMzT3JpZ2luKHRoaXMuc3RhdGljQXNzZXRzQnVja2V0LCB7IG9yaWdpbkFjY2Vzc0lkZW50aXR5IH0pLFxuICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxuICAgICAgICAgIGNhY2hlUG9saWN5OiBkeW5hbWljQ29udGVudENhY2hlUG9saWN5LFxuICAgICAgICAgIHJlc3BvbnNlSGVhZGVyc1BvbGljeSxcbiAgICAgICAgfSxcbiAgICAgICAgLy8gQVBJIEdhdGV3YXkgZm9yIGR5bmFtaWMgY29udGVudFxuICAgICAgICAnYXBpLyonOiB7XG4gICAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5SZXN0QXBpT3JpZ2luKGFwaUdhdGV3YXkpLFxuICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LkhUVFBTX09OTFksXG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQWxsb3dlZE1ldGhvZHMuQUxMT1dfQUxMLFxuICAgICAgICAgIGNhY2hlUG9saWN5OiBjbG91ZGZyb250LkNhY2hlUG9saWN5LkNBQ0hJTkdfRElTQUJMRUQsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgZXJyb3JSZXNwb25zZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGh0dHBTdGF0dXM6IDQwNCxcbiAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDQwNCxcbiAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnLzQwNC5odG1sJyxcbiAgICAgICAgICB0dGw6IGNkay5EdXJhdGlvbi5taW51dGVzKDMwKSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGh0dHBTdGF0dXM6IDQwMyxcbiAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDQwMyxcbiAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnLzQwMy5odG1sJyxcbiAgICAgICAgICB0dGw6IGNkay5EdXJhdGlvbi5taW51dGVzKDMwKSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICBwcmljZUNsYXNzOiBjbG91ZGZyb250LlByaWNlQ2xhc3MuUFJJQ0VfQ0xBU1NfMTAwLCAvLyBVc2Ugb25seSBVUywgQ2FuYWRhLCBFdXJvcGUsIGFuZCBJc3JhZWwgZWRnZSBsb2NhdGlvbnNcbiAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICBlbmFibGVJcHY2OiB0cnVlLFxuICAgICAgZW5hYmxlTG9nZ2luZzogdHJ1ZSxcbiAgICAgIGxvZ0J1Y2tldDogbmV3IHMzLkJ1Y2tldCh0aGlzLCAnQ2xvdWRGcm9udExvZ3NCdWNrZXQnLCB7XG4gICAgICAgIGJ1Y2tldE5hbWU6IGAke3Jlc291cmNlUHJlZml4LnRvTG93ZXJDYXNlKCl9LWNsb3VkZnJvbnQtbG9ncy0ke3RoaXMucmVnaW9ufWAsXG4gICAgICAgIHJlbW92YWxQb2xpY3k6IHN0YWdlID09PSAncHJvZCcgPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgICBlbmNyeXB0aW9uOiBzMy5CdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXG4gICAgICAgIC8vIEVuYWJsZSBvYmplY3Qgb3duZXJzaGlwIGNvbnRyb2xzIGZvciBDbG91ZEZyb250IGxvZ2dpbmdcbiAgICAgICAgb2JqZWN0T3duZXJzaGlwOiBzMy5PYmplY3RPd25lcnNoaXAuQlVDS0VUX09XTkVSX1BSRUZFUlJFRCxcbiAgICAgICAgLy8gQWxsb3cgQ2xvdWRGcm9udCB0byB3cml0ZSBsb2dzXG4gICAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgICAgIGxpZmVjeWNsZVJ1bGVzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZXhwaXJhdGlvbjogY2RrLkR1cmF0aW9uLmRheXMoMzY1KSxcbiAgICAgICAgICAgIHRyYW5zaXRpb25zOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzdG9yYWdlQ2xhc3M6IHMzLlN0b3JhZ2VDbGFzcy5JTlRFTExJR0VOVF9USUVSSU5HLFxuICAgICAgICAgICAgICAgIHRyYW5zaXRpb25BZnRlcjogY2RrLkR1cmF0aW9uLmRheXMoMzApLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSksXG4gICAgICBsb2dGaWxlUHJlZml4OiAnY2xvdWRmcm9udC1sb2dzLycsXG4gICAgICBsb2dJbmNsdWRlc0Nvb2tpZXM6IHRydWUsXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgUm91dGU1MyByZWNvcmQgZm9yIHRoZSBDbG91ZEZyb250IGRpc3RyaWJ1dGlvblxuICAgIG5ldyByb3V0ZTUzLkFSZWNvcmQodGhpcywgJ1N0YXRpY0Fzc2V0c1JlY29yZCcsIHtcbiAgICAgIHpvbmU6IGNkbkhvc3RlZFpvbmUsXG4gICAgICByZWNvcmROYW1lOiAnQCcsIC8vIFJvb3Qgb2YgdGhlIHpvbmUgKHdoaWNoIGlzIGFscmVhZHkgdGhlIHN0YXRpYyBzdWJkb21haW4pXG4gICAgICB0YXJnZXQ6IHJvdXRlNTMuUmVjb3JkVGFyZ2V0LmZyb21BbGlhcyhuZXcgdGFyZ2V0cy5DbG91ZEZyb250VGFyZ2V0KHRoaXMuY2xvdWRmcm9udERpc3RyaWJ1dGlvbikpLFxuICAgICAgdHRsOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICB9KTtcbiAgICBcbiAgICAvLyBBbHNvIGNyZWF0ZSBBQUFBIHJlY29yZCBmb3IgSVB2NiBzdXBwb3J0XG4gICAgbmV3IHJvdXRlNTMuQWFhYVJlY29yZCh0aGlzLCAnU3RhdGljQXNzZXRzQWFhYVJlY29yZCcsIHtcbiAgICAgIHpvbmU6IGNkbkhvc3RlZFpvbmUsXG4gICAgICByZWNvcmROYW1lOiAnQCcsIC8vIFJvb3Qgb2YgdGhlIHpvbmVcbiAgICAgIHRhcmdldDogcm91dGU1My5SZWNvcmRUYXJnZXQuZnJvbUFsaWFzKG5ldyB0YXJnZXRzLkNsb3VkRnJvbnRUYXJnZXQodGhpcy5jbG91ZGZyb250RGlzdHJpYnV0aW9uKSksXG4gICAgICB0dGw6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxuICAgIH0pO1xuXG4gICAgLy8gT3V0cHV0IHRoZSBuYW1lIHNlcnZlcnMgZm9yIHRoZSBob3N0ZWQgem9uZSAtIHRoZXNlIG5lZWQgdG8gYmUgYWRkZWQgYXMgTlMgcmVjb3JkcyBpbiB0aGUgbWFpbiBkb21haW5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnU3RhdGljQXNzZXRzTmFtZVNlcnZlcnMnLCB7XG4gICAgICB2YWx1ZTogY2RrLkZuLmpvaW4oJywgJywgY2RuSG9zdGVkWm9uZS5ob3N0ZWRab25lTmFtZVNlcnZlcnMgfHwgW10pLFxuICAgICAgZGVzY3JpcHRpb246ICdOYW1lIHNlcnZlcnMgZm9yIHRoZSBzdGF0aWMgYXNzZXRzIGRvbWFpbi4gQWRkIHRoZXNlIGFzIE5TIHJlY29yZHMgaW4gdGhlIG1haW4gZG9tYWluLicsXG4gICAgICBleHBvcnROYW1lOiBgJHtyZXNvdXJjZVByZWZpeH0tU3RhdGljQXNzZXRzTmFtZVNlcnZlcnNgLFxuICAgIH0pO1xuXG4gICAgLy8gT3V0cHV0c1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDbG91ZEZyb250RG9tYWluTmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmNsb3VkZnJvbnREaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uRG9tYWluTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2xvdWRGcm9udCBEaXN0cmlidXRpb24gRG9tYWluIE5hbWUnLFxuICAgICAgZXhwb3J0TmFtZTogYCR7cmVzb3VyY2VQcmVmaXh9LUNsb3VkRnJvbnREb21haW5OYW1lYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDbG91ZEZyb250RGlzdHJpYnV0aW9uSWQnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5jbG91ZGZyb250RGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbklkLFxuICAgICAgZGVzY3JpcHRpb246ICdDbG91ZEZyb250IERpc3RyaWJ1dGlvbiBJRCcsXG4gICAgICBleHBvcnROYW1lOiBgJHtyZXNvdXJjZVByZWZpeH0tQ2xvdWRGcm9udERpc3RyaWJ1dGlvbklkYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTdGF0aWNBc3NldHNEb21haW4nLCB7XG4gICAgICB2YWx1ZTogYGh0dHBzOi8vJHt0aGlzLnN0YXRpY0Fzc2V0c0RvbWFpbn1gLFxuICAgICAgZGVzY3JpcHRpb246ICdTdGF0aWMgQXNzZXRzIERvbWFpbicsXG4gICAgICBleHBvcnROYW1lOiBgJHtyZXNvdXJjZVByZWZpeH0tU3RhdGljQXNzZXRzRG9tYWluYCxcbiAgICB9KTtcbiAgfVxufVxuIl19