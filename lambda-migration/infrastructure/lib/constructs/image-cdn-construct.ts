import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface ImageCdnConstructProps {
  stage: string;
  assetsBucket: s3.Bucket;
}

/**
 * A construct that creates a CloudFront distribution for serving images from an S3 bucket
 * with custom domain and HTTPS support.
 */
export class ImageCdnConstruct extends Construct {
  public readonly cloudFrontDistribution: cloudfront.Distribution;
  public readonly imageCdnDomain: string;
  public readonly cloudFrontUrl: string;

  constructor(scope: Construct, id: string, props: ImageCdnConstructProps) {
    super(scope, id);

    const { stage, assetsBucket } = props;
    const resourcePrefix = `GabiYoga-${stage}`;
        
    // Create origin access identity for S3
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'ImageCdnOAI', {
      comment: `OAI for ${resourcePrefix} image assets`,
    });

    // Grant CloudFront access to the bucket - this can be done directly since we're in the same stack
    const bucketPolicyStatement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:GetObject'],
      principals: [new iam.CanonicalUserPrincipal(originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId)],
      resources: [`${assetsBucket.bucketArn}/gallery/*`], // Only allow access to gallery/* objects
    });

    // Add the policy to the bucket - no circular dependency since we're in the same stack
    assetsBucket.addToResourcePolicy(bucketPolicyStatement);

    // Define cache policy for images (immutable assets)
    const imageCachePolicy = new cloudfront.CachePolicy(this, 'ImageCdnCachePolicy', {
      cachePolicyName: `${resourcePrefix}-ImageCache`,
      comment: 'Cache policy for image assets',
      defaultTtl: cdk.Duration.days(365),
      maxTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.days(365),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList('Origin', 'Access-Control-Request-Method', 'Access-Control-Request-Headers'),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
    });

    // Create response headers policy
    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'ImageCdnHeadersPolicy', {
      responseHeadersPolicyName: `${resourcePrefix}-ImageCdnHeaders`,
      comment: 'Response headers policy for image CDN',
      securityHeadersBehavior: {
        contentTypeOptions: {
          override: true,
        },
      },
      corsBehavior: {
        accessControlAllowCredentials: false,
        accessControlAllowHeaders: ['*'],
        accessControlAllowMethods: ['GET', 'HEAD'],
        accessControlAllowOrigins: stage === 'prod'
          ? ['https://gabi.yoga', 'https://www.gabi.yoga']
          : ['https://dev.gabi.yoga', '*'],
        accessControlMaxAge: cdk.Duration.seconds(600),
        originOverride: true,
      },
    });

    // Create logs bucket for CloudFront logs
    const logBucket = new s3.Bucket(this, 'ImageCdnLogsBucket', {
      bucketName: `${resourcePrefix.toLowerCase()}-image-cdn-logs-${cdk.Stack.of(this).region}`,
      removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      encryption: s3.BucketEncryption.S3_MANAGED,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
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
    });

    // Create the CloudFront distribution
    this.cloudFrontDistribution = new cloudfront.Distribution(this, 'ImageCdnDistribution', {
      comment: `${resourcePrefix} image CDN distribution`,
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new origins.S3Origin(assetsBucket, {
          originAccessIdentity,
          originPath: '/gallery', // Only serve files from the gallery folder
        }),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: imageCachePolicy,
        responseHeadersPolicy,
        compress: true,
      },
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: '/404.html',
          ttl: cdk.Duration.minutes(30),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Use only US, Canada, Europe, and Israel edge locations
      enabled: true,
      enableIpv6: true,
      enableLogging: true,
      logBucket,
      logFilePrefix: 'image-cdn-logs/',
      logIncludesCookies: false, // No need to log cookies for image assets
    });    
    
    // Set CloudFront domain and URL
    this.imageCdnDomain = this.cloudFrontDistribution.distributionDomainName;
    this.cloudFrontUrl = `https://${this.cloudFrontDistribution.distributionDomainName}`;
    

    // Outputs
    new cdk.CfnOutput(this, 'ImageCdnDomainName', {
      value: this.cloudFrontDistribution.distributionDomainName,
      description: 'CloudFront Distribution Domain Name for Image CDN',
    });

    new cdk.CfnOutput(this, 'ImageCdnDistributionId', {
      value: this.cloudFrontDistribution.distributionId,
      description: 'CloudFront Distribution ID for Image CDN',
    });

    new cdk.CfnOutput(this, 'ImageCdnDomain', {
      value: `https://${this.imageCdnDomain}`,
      description: 'Image CDN Domain',
    });
  }
}
