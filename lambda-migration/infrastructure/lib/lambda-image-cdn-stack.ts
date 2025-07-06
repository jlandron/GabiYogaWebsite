import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface LambdaImageCdnStackProps extends cdk.StackProps {
  stage: string;
  domainName: string;
  assetsBucketName: string; // Using string name instead of bucket reference to avoid circular dependencies
}

export class LambdaImageCdnStack extends cdk.Stack {
  public readonly cloudFrontDistribution: cloudfront.Distribution;
  public readonly imageCdnDomain: string;

  constructor(scope: Construct, id: string, props: LambdaImageCdnStackProps) {
    super(scope, id, props);

    const { stage, domainName, assetsBucketName } = props;
    const resourcePrefix = `GabiYoga-${stage}`;

    // Define the image CDN domain name
    this.imageCdnDomain = stage === 'prod'
      ? `images.${domainName}`
      : `images-${stage}.${domainName}`;

    // Create a public hosted zone for the CDN domain
    const cdnHostedZone = new route53.PublicHostedZone(this, 'ImageCdnHostedZone', {
      zoneName: this.imageCdnDomain,
    });

    // Create a certificate in us-east-1 for CloudFront
    // Note: CloudFront requires certificates to be in us-east-1
    const certificate = new acm.DnsValidatedCertificate(this, 'ImageCdnCertificate', {
      domainName: this.imageCdnDomain,
      hostedZone: cdnHostedZone,
      region: 'us-east-1', // CloudFront requires certificates in us-east-1
    });

    // Create origin access identity for S3
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'ImageCdnOAI', {
      comment: `OAI for ${resourcePrefix} image assets`,
    });

    // Create a bucket policy for CloudFront access using bucket name directly
    // This avoids creating a reference to the bucket resource
    const bucketPolicyStatement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:GetObject'],
      principals: [new iam.CanonicalUserPrincipal(originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId)],
      resources: [`arn:aws:s3:::${assetsBucketName}/gallery/*`], // Only allow access to gallery/* objects
    });

    // Create a policy document for output
    const bucketPolicyDocument = new iam.PolicyDocument({
      statements: [bucketPolicyStatement]
    });

    // Output the policy JSON to be manually applied
    new cdk.CfnOutput(this, 'BucketPolicyForCloudFront', {
      value: JSON.stringify(bucketPolicyDocument.toJSON(), null, 2),
      description: 'Bucket policy to manually apply to the S3 bucket for CloudFront access',
    });

    // Note: We're not directly applying the policy to avoid circular dependencies
    // assetsBucket.addToResourcePolicy(bucketPolicyStatement);

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
          ? [`https://${domainName}`, `https://www.${domainName}`]
          : [`https://${stage}.${domainName}`, '*'],
        accessControlMaxAge: cdk.Duration.seconds(600),
        originOverride: true,
      },
    });

    // Create the CloudFront distribution
    this.cloudFrontDistribution = new cloudfront.Distribution(this, 'ImageCdnDistribution', {
      comment: `${resourcePrefix} image CDN distribution`,
      defaultRootObject: 'index.html',
      domainNames: [this.imageCdnDomain],
      certificate,
      defaultBehavior: {
        origin: new origins.S3Origin(assetsBucketName, {
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
      logBucket: new s3.Bucket(this, 'ImageCdnLogsBucket', {
        bucketName: `${resourcePrefix.toLowerCase()}-image-cdn-logs-${this.region}`,
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
      }),
      logFilePrefix: 'image-cdn-logs/',
      logIncludesCookies: false, // No need to log cookies for image assets
    });

    // Create Route53 record for the CloudFront distribution
    new route53.ARecord(this, 'ImageCdnRecord', {
      zone: cdnHostedZone,
      recordName: '@',
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.cloudFrontDistribution)),
      ttl: cdk.Duration.minutes(5),
    });

    // Also create AAAA record for IPv6 support
    new route53.AaaaRecord(this, 'ImageCdnAaaaRecord', {
      zone: cdnHostedZone,
      recordName: '@',
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.cloudFrontDistribution)),
      ttl: cdk.Duration.minutes(5),
    });

    // Output the name servers for the hosted zone - these need to be added as NS records in the main domain
    new cdk.CfnOutput(this, 'ImageCdnNameServers', {
      value: cdk.Fn.join(', ', cdnHostedZone.hostedZoneNameServers || []),
      description: 'Name servers for the image CDN domain. Add these as NS records in the main domain.',
      exportName: `${resourcePrefix}-ImageCdnNameServers`,
    });

    // Outputs
    new cdk.CfnOutput(this, 'ImageCdnDomainName', {
      value: this.cloudFrontDistribution.distributionDomainName,
      description: 'CloudFront Distribution Domain Name for Image CDN',
      exportName: `${resourcePrefix}-ImageCdnDomainName`,
    });

    new cdk.CfnOutput(this, 'ImageCdnDistributionId', {
      value: this.cloudFrontDistribution.distributionId,
      description: 'CloudFront Distribution ID for Image CDN',
      exportName: `${resourcePrefix}-ImageCdnDistributionId`,
    });

    new cdk.CfnOutput(this, 'ImageCdnDomain', {
      value: `https://${this.imageCdnDomain}`,
      description: 'Image CDN Domain',
      exportName: `${resourcePrefix}-ImageCdnDomain`,
    });
  }
}
